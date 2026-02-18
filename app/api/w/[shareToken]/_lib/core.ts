import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCorrelationId, logOpsEvent } from "../../../../lib/ops/observability";

export type MutationAction = "reserve" | "release" | "purchase" | "contribute";

type ErrorCode = "VALIDATION" | "AUTH" | "CONFLICT" | "RATE_LIMIT" | "INTERNAL";

type Availability = "Available" | "Reserved" | "Purchased";

type ShareItemState = {
  id: string;
  targetCents: number;
  fundedCents: number;
  reservedBy: string | null;
  purchasedBy: string | null;
};

type ShareState = {
  listId: string;
  tokenHashHex: string;
  items: Record<string, ShareItemState>;
};

type ResponseBody = {
  ok: boolean;
  correlationId: string;
  idempotencyKey?: string;
  action?: MutationAction;
  message?: string;
  code?: ErrorCode;
  data?: {
    itemId: string;
    availability: Availability;
    funded_cents: number;
    target_cents: number;
  };
};

type IdempotencyRecord = {
  status: number;
  body: ResponseBody;
};

type Store = {
  shares: ShareState[];
  idempotency: Map<string, IdempotencyRecord>;
  queues: Map<string, Promise<void>>;
};

declare global {
  // eslint-disable-next-line no-var
  var __wishlistApiStore: Store | undefined;
}

class ApiError extends Error {
  code: ErrorCode;
  status: number;

  constructor(code: ErrorCode, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function hashTokenHex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function bootstrapStore(): Store {
  const shareToken = "abc123";
  return {
    shares: [
      {
        listId: "wl-first",
        tokenHashHex: hashTokenHex(shareToken),
        items: {
          "i-1": {
            id: "i-1",
            targetCents: 24999,
            fundedCents: 8300,
            reservedBy: "gifter-seed",
            purchasedBy: null
          },
          "i-2": {
            id: "i-2",
            targetCents: 7900,
            fundedCents: 0,
            reservedBy: null,
            purchasedBy: null
          },
          "i-3": {
            id: "i-3",
            targetCents: 2200,
            fundedCents: 0,
            reservedBy: null,
            purchasedBy: null
          }
        }
      }
    ],
    idempotency: new Map(),
    queues: new Map()
  };
}

function getStore(): Store {
  if (!globalThis.__wishlistApiStore) {
    globalThis.__wishlistApiStore = bootstrapStore();
  }
  return globalThis.__wishlistApiStore;
}

function findShareByToken(shareToken: string): ShareState | null {
  const incoming = Buffer.from(hashTokenHex(shareToken), "hex");
  let match: ShareState | null = null;

  for (const share of getStore().shares) {
    const candidate = Buffer.from(share.tokenHashHex, "hex");
    if (candidate.length !== incoming.length) {
      continue;
    }

    if (timingSafeEqual(candidate, incoming)) {
      match = share;
    }
  }

  return match;
}

function computeAvailability(item: ShareItemState): Availability {
  if (item.purchasedBy || item.fundedCents >= item.targetCents) {
    return "Purchased";
  }
  if (item.reservedBy || item.fundedCents > 0) {
    return "Reserved";
  }
  return "Available";
}

function safeJson(response: ResponseBody, status = 200) {
  return NextResponse.json(response, { status });
}

async function withItemLock<T>(lockKey: string, task: () => Promise<T>): Promise<T> {
  const store = getStore();
  const prior = store.queues.get(lockKey) ?? Promise.resolve();

  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  store.queues.set(lockKey, prior.then(() => current));
  await prior;

  try {
    return await task();
  } finally {
    release();
    if (store.queues.get(lockKey) === current) {
      store.queues.delete(lockKey);
    }
  }
}

async function parseBody(request: NextRequest) {
  try {
    const raw = (await request.json()) as Record<string, unknown>;
    return raw;
  } catch {
    return {};
  }
}

function assertAuthUser(request: NextRequest) {
  const userId = request.headers.get("x-user-id")?.trim();
  if (!userId) {
    throw new ApiError("AUTH", 401, "Authentication is required for this action.");
  }
  return userId;
}

function assertIdempotencyKey(request: NextRequest) {
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key) {
    throw new ApiError("VALIDATION", 400, "idempotency-key header is required.");
  }
  return key;
}

function assertItemId(body: Record<string, unknown>) {
  const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
  if (!itemId) {
    throw new ApiError("VALIDATION", 400, "itemId is required.");
  }
  return itemId;
}

function assertContributionAmount(body: Record<string, unknown>) {
  const parsed = Number(body.amountCents);
  if (!Number.isInteger(parsed) || parsed < 100) {
    throw new ApiError("VALIDATION", 400, "amountCents must be an integer of at least 100.");
  }
  return parsed;
}

function assertShare(shareToken: string) {
  const share = findShareByToken(shareToken);
  if (!share) {
    throw new ApiError("AUTH", 401, "Invalid share token.");
  }
  return share;
}

function mutateReserve(item: ShareItemState, userId: string) {
  if (item.purchasedBy && item.purchasedBy !== userId) {
    throw new ApiError("CONFLICT", 409, "Item is already purchased.");
  }
  if (item.reservedBy && item.reservedBy !== userId) {
    throw new ApiError("CONFLICT", 409, "Item is already reserved by another user.");
  }

  item.reservedBy = userId;
}

function mutateRelease(item: ShareItemState, userId: string) {
  if (!item.reservedBy) {
    throw new ApiError("CONFLICT", 409, "Item is not reserved.");
  }
  if (item.reservedBy !== userId) {
    throw new ApiError("CONFLICT", 409, "Only the reserver can release this item.");
  }

  item.reservedBy = null;
}

function mutatePurchase(item: ShareItemState, userId: string) {
  if (item.purchasedBy && item.purchasedBy !== userId) {
    throw new ApiError("CONFLICT", 409, "Item is already purchased by another user.");
  }
  if (item.reservedBy && item.reservedBy !== userId) {
    throw new ApiError("CONFLICT", 409, "Item is reserved by another user.");
  }

  item.reservedBy = null;
  item.purchasedBy = userId;
}

function mutateContribute(item: ShareItemState, amountCents: number) {
  item.fundedCents += amountCents;
}

function buildSuccess(
  correlationId: string,
  idempotencyKey: string,
  action: MutationAction,
  item: ShareItemState
): ResponseBody {
  return {
    ok: true,
    correlationId,
    idempotencyKey,
    action,
    data: {
      itemId: item.id,
      availability: computeAvailability(item),
      funded_cents: item.fundedCents,
      target_cents: item.targetCents
    }
  };
}

function buildError(correlationId: string, error: ApiError): ResponseBody {
  return {
    ok: false,
    correlationId,
    code: error.code,
    message: error.message
  };
}

export async function handleMutation(
  request: NextRequest,
  params: { shareToken: string },
  action: MutationAction
) {
  const correlationId = getCorrelationId(request.headers);

  try {
    const userId = assertAuthUser(request);
    const idempotencyKey = assertIdempotencyKey(request);
    const share = assertShare(params.shareToken);
    const body = await parseBody(request);
    const itemId = assertItemId(body);
    const item = share.items[itemId];

    if (!item) {
      throw new ApiError("VALIDATION", 400, "Unknown itemId for this share link.");
    }

    const lockKey = `${share.listId}:${itemId}`;
    const idempotencyCacheKey = `${action}:${share.listId}:${userId}:${idempotencyKey}`;

    return await withItemLock(lockKey, async () => {
      const existing = getStore().idempotency.get(idempotencyCacheKey);
      if (existing) {
        logOpsEvent("api.w.mutation", {
          correlationId,
          action,
          actorUserId: userId,
          itemId,
          result: "idempotent_replay",
          code: existing.body.code ?? "OK"
        });
        return safeJson(existing.body, existing.status);
      }

      try {
        if (action === "reserve") {
          mutateReserve(item, userId);
        } else if (action === "release") {
          mutateRelease(item, userId);
        } else if (action === "purchase") {
          mutatePurchase(item, userId);
        } else {
          const amountCents = assertContributionAmount(body);
          mutateContribute(item, amountCents);
        }

        const payload = buildSuccess(correlationId, idempotencyKey, action, item);
        const record: IdempotencyRecord = { status: 200, body: payload };
        getStore().idempotency.set(idempotencyCacheKey, record);

        logOpsEvent("api.w.mutation", {
          correlationId,
          action,
          actorUserId: userId,
          itemId,
          result: "success",
          code: "OK",
          availability: payload.data?.availability,
          fundedCents: payload.data?.funded_cents
        });

        return safeJson(payload, 200);
      } catch (error) {
        const apiError =
          error instanceof ApiError ? error : new ApiError("INTERNAL", 500, "Unexpected mutation failure.");
        const payload = buildError(correlationId, apiError);
        const record: IdempotencyRecord = { status: apiError.status, body: payload };
        getStore().idempotency.set(idempotencyCacheKey, record);

        logOpsEvent("api.w.mutation", {
          correlationId,
          action,
          actorUserId: userId,
          itemId,
          result: "error",
          code: apiError.code,
          message: apiError.message
        });

        return safeJson(payload, apiError.status);
      }
    });
  } catch (error) {
    const apiError = error instanceof ApiError ? error : new ApiError("INTERNAL", 500, "Unexpected request failure.");

    logOpsEvent("api.w.mutation", {
      correlationId,
      action,
      result: "error",
      code: apiError.code,
      message: apiError.message
    });

    return safeJson(buildError(correlationId, apiError), apiError.status);
  }
}
