import { randomUUID } from "node:crypto";
import { logOpsEvent } from "../../../lib/ops/observability";

export type ErrorCode = "VALIDATION" | "AUTH" | "CONFLICT" | "INTERNAL";
export type Availability = "Available" | "Reserved" | "Purchased";
export type ReportStatus = "open" | "hidden";

export type ModerationReport = {
  id: string;
  targetType: "wishlist" | "item";
  targetId: string;
  label: string;
  reason: string;
  reporter: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
};

export type ModerationItemAggregate = {
  itemId: string;
  availability: Availability;
  fundedCents: number;
  targetCents: number;
  reservedByClaimId: string | null;
  purchasedByClaimId: string | null;
  updatedAt: string;
};

export type ModerationClaim = {
  id: string;
  itemId: string;
  claimerUserId: string;
  state: "reserved" | "purchased" | "cancelled";
  isStale: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ModerationAuditEntry = {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  createdAt: string;
  meta: Record<string, unknown>;
};

type ModerationStore = {
  reports: Record<string, ModerationReport>;
  items: Record<string, ModerationItemAggregate>;
  claims: Record<string, ModerationClaim>;
  audit: ModerationAuditEntry[];
};

type ReportAction = "hide" | "unhide";

declare global {
  // eslint-disable-next-line no-var
  var __moderationStore: ModerationStore | undefined;
}

export class ModerationError extends Error {
  code: ErrorCode;
  status: number;

  constructor(code: ErrorCode, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function computeAvailability(item: ModerationItemAggregate): Availability {
  if (item.purchasedByClaimId || item.fundedCents >= item.targetCents) {
    return "Purchased";
  }

  if (item.reservedByClaimId || item.fundedCents > 0) {
    return "Reserved";
  }

  return "Available";
}

function normalizeStatus(raw: string | null | undefined): ReportStatus | "all" {
  if (!raw) {
    return "all";
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === "open" || normalized === "hidden") {
    return normalized;
  }

  if (normalized === "all") {
    return "all";
  }

  throw new ModerationError("VALIDATION", 400, "status must be all, open, or hidden.");
}

function bootstrapStore(): ModerationStore {
  const timestamp = nowIso();

  const items: Record<string, ModerationItemAggregate> = {
    "i-1": {
      itemId: "i-1",
      availability: "Purchased",
      fundedCents: 24999,
      targetCents: 24999,
      reservedByClaimId: null,
      purchasedByClaimId: "cl-900",
      updatedAt: timestamp
    },
    "i-2": {
      itemId: "i-2",
      availability: "Reserved",
      fundedCents: 0,
      targetCents: 7900,
      reservedByClaimId: "cl-200",
      purchasedByClaimId: null,
      updatedAt: timestamp
    },
    "i-3": {
      itemId: "i-3",
      availability: "Available",
      fundedCents: 0,
      targetCents: 2200,
      reservedByClaimId: null,
      purchasedByClaimId: null,
      updatedAt: timestamp
    }
  };

  const claims: Record<string, ModerationClaim> = {
    "cl-200": {
      id: "cl-200",
      itemId: "i-2",
      claimerUserId: "gifter-stale",
      state: "reserved",
      isStale: true,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    "cl-900": {
      id: "cl-900",
      itemId: "i-1",
      claimerUserId: "gifter-purchased",
      state: "purchased",
      isStale: false,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  };

  const reports: Record<string, ModerationReport> = {
    "rp-100": {
      id: "rp-100",
      targetType: "item",
      targetId: "i-2",
      label: "Suspicious external link",
      reason: "Listed source redirects to an unrelated promo page.",
      reporter: "guest:mailhash:22f",
      status: "open",
      createdAt: timestamp,
      updatedAt: timestamp
    },
    "rp-101": {
      id: "rp-101",
      targetType: "wishlist",
      targetId: "wl-first",
      label: "Inappropriate wishlist title",
      reason: "Contains offensive terms.",
      reporter: "user:u_91",
      status: "hidden",
      createdAt: timestamp,
      updatedAt: timestamp
    }
  };

  return {
    reports,
    items,
    claims,
    audit: []
  };
}

function getStore() {
  if (!globalThis.__moderationStore) {
    globalThis.__moderationStore = bootstrapStore();
  }

  return globalThis.__moderationStore;
}

function normalizeReason(raw: unknown) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) {
    throw new ModerationError("VALIDATION", 400, "reason is required for moderation actions.");
  }

  return value;
}

function toSnapshotClaim(claim: ModerationClaim, item: ModerationItemAggregate | undefined) {
  return {
    id: claim.id,
    itemId: claim.itemId,
    state: claim.state,
    isStale: claim.isStale,
    updatedAt: claim.updatedAt,
    aggregate: item
      ? {
          availability: item.availability,
          funded_cents: item.fundedCents,
          target_cents: item.targetCents
        }
      : null
  };
}

function appendAudit(args: {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  meta: Record<string, unknown>;
}) {
  const entry: ModerationAuditEntry = {
    id: `audit-${randomUUID().slice(0, 8)}`,
    actorUserId: args.actorUserId,
    action: args.action,
    targetType: args.targetType,
    targetId: args.targetId,
    reason: args.reason,
    createdAt: nowIso(),
    meta: args.meta
  };

  const store = getStore();
  store.audit.unshift(entry);

  logOpsEvent("api.admin.moderation", {
    actorUserId: args.actorUserId,
    action: args.action,
    targetType: args.targetType,
    targetId: args.targetId,
    reason: args.reason,
    timestamp: entry.createdAt,
    meta: args.meta
  });

  return entry;
}

function toPublicReport(report: ModerationReport) {
  return {
    ...report
  };
}

export function assertAdmin(headers: Headers) {
  const role = headers.get("x-role")?.trim().toLowerCase();
  if (role !== "admin") {
    throw new ModerationError("AUTH", 401, "Admin role is required.");
  }

  return headers.get("x-user-id")?.trim() || "admin-demo";
}

export function getModerationSnapshot(statusFilter: string | null | undefined) {
  const normalizedStatus = normalizeStatus(statusFilter);
  const store = getStore();

  const reports = Object.values(store.reports)
    .filter((report) => normalizedStatus === "all" || report.status === normalizedStatus)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(toPublicReport);

  const staleClaims = Object.values(store.claims)
    .filter((claim) => claim.state === "reserved" && claim.isStale)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((claim) => toSnapshotClaim(claim, store.items[claim.itemId]));

  const audit = store.audit.slice(0, 20);

  return {
    reports,
    staleClaims,
    audit
  };
}

export function moderateReport(input: {
  reportId: string;
  action: ReportAction;
  actorUserId: string;
  reason: unknown;
}) {
  const store = getStore();
  const report = store.reports[input.reportId];

  if (!report) {
    throw new ModerationError("VALIDATION", 404, "Unknown reportId.");
  }

  const reason = normalizeReason(input.reason);

  if (input.action === "hide") {
    if (report.status === "hidden") {
      throw new ModerationError("CONFLICT", 409, "Report target is already hidden.");
    }

    report.status = "hidden";
  } else {
    if (report.status === "open") {
      throw new ModerationError("CONFLICT", 409, "Report target is already visible.");
    }

    report.status = "open";
  }

  report.updatedAt = nowIso();

  const audit = appendAudit({
    actorUserId: input.actorUserId,
    action: input.action === "hide" ? "report.hide" : "report.unhide",
    targetType: report.targetType,
    targetId: report.targetId,
    reason,
    meta: {
      reportId: report.id,
      label: report.label,
      newStatus: report.status
    }
  });

  return {
    report: toPublicReport(report),
    audit
  };
}

export function overrideClaim(input: {
  claimId: string;
  actorUserId: string;
  reason: unknown;
}) {
  const store = getStore();
  const claim = store.claims[input.claimId];

  if (!claim) {
    throw new ModerationError("VALIDATION", 404, "Unknown claimId.");
  }

  if (claim.state !== "reserved") {
    throw new ModerationError("CONFLICT", 409, "Only reserved claims can be overridden.");
  }

  const item = store.items[claim.itemId];
  if (!item) {
    throw new ModerationError("INTERNAL", 500, "Claim aggregate record is missing.");
  }

  const reason = normalizeReason(input.reason);
  const previousAvailability = item.availability;

  claim.state = "cancelled";
  claim.isStale = false;
  claim.updatedAt = nowIso();

  if (item.reservedByClaimId === claim.id) {
    item.reservedByClaimId = null;
  }

  item.availability = computeAvailability(item);
  item.updatedAt = nowIso();

  const audit = appendAudit({
    actorUserId: input.actorUserId,
    action: "claim.override_stale",
    targetType: "claim",
    targetId: claim.id,
    reason,
    meta: {
      itemId: claim.itemId,
      previousState: "reserved",
      nextState: claim.state,
      previousAvailability,
      nextAvailability: item.availability
    }
  });

  return {
    claim: {
      id: claim.id,
      itemId: claim.itemId,
      state: claim.state,
      isStale: claim.isStale,
      updatedAt: claim.updatedAt
    },
    item: {
      itemId: item.itemId,
      availability: item.availability,
      funded_cents: item.fundedCents,
      target_cents: item.targetCents,
      updatedAt: item.updatedAt
    },
    audit
  };
}

export function toErrorPayload(correlationId: string, error: unknown) {
  if (error instanceof ModerationError) {
    return {
      status: error.status,
      body: {
        ok: false,
        correlationId,
        code: error.code,
        message: error.message
      }
    };
  }

  return {
    status: 500,
    body: {
      ok: false,
      correlationId,
      code: "INTERNAL" as const,
      message: "Unexpected moderation failure."
    }
  };
}
