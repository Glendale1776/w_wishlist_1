import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

type UploadKind = "avatar" | "cover" | "item";

type StoredFile = {
  path: string;
  ownerId: string;
  contentType: string;
  bytes: Buffer;
  createdAt: number;
};

type UploadResult = {
  path: string;
  signedUrl: string;
  size: number;
  contentType: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __wishlistUploadStore: Map<string, StoredFile> | undefined;
}

const allowedKinds: UploadKind[] = ["avatar", "cover", "item"];
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function store() {
  if (!globalThis.__wishlistUploadStore) {
    globalThis.__wishlistUploadStore = new Map<string, StoredFile>();
  }
  return globalThis.__wishlistUploadStore;
}

function uploadMaxBytes() {
  const raw = Number.parseInt(process.env.UPLOAD_MAX_MB || "10", 10);
  const safeMb = Number.isNaN(raw) ? 10 : Math.min(20, Math.max(1, raw));
  return safeMb * 1024 * 1024;
}

function signingKey() {
  return process.env.UPLOAD_SIGNING_KEY || "dev-upload-signing-key";
}

function extFromMime(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "jpg";
}

function sign(payload: string) {
  return createHmac("sha256", signingKey()).update(payload).digest("hex");
}

export function assertUploadKind(value: unknown): UploadKind {
  if (typeof value !== "string") {
    throw new Error("Upload kind is required.");
  }

  if (!allowedKinds.includes(value as UploadKind)) {
    throw new Error("Upload kind must be avatar, cover, or item.");
  }

  return value as UploadKind;
}

export function assertUploadFile(file: File) {
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("Unsupported file type. Use JPEG, PNG, WEBP, or GIF.");
  }

  if (file.size <= 0) {
    throw new Error("Uploaded file is empty.");
  }

  if (file.size > uploadMaxBytes()) {
    throw new Error(`File exceeds ${Math.floor(uploadMaxBytes() / 1024 / 1024)}MB limit.`);
  }
}

function storagePath(kind: UploadKind, ownerId: string, contentType: string) {
  const safeOwner = ownerId.replace(/[^a-zA-Z0-9_-]/g, "");
  const ext = extFromMime(contentType);
  return `${kind}s/${safeOwner}/${randomUUID()}.${ext}`;
}

function buildSignedUrl(path: string, ttlSeconds = 900) {
  const exp = Date.now() + ttlSeconds * 1000;
  const payload = `${path}:${exp}`;
  const sig = sign(payload);
  const params = new URLSearchParams({ path, exp: String(exp), sig });
  return `/api/uploads/file?${params.toString()}`;
}

export async function saveUpload(kind: UploadKind, ownerId: string, file: File): Promise<UploadResult> {
  assertUploadFile(file);

  const bytes = Buffer.from(await file.arrayBuffer());
  const path = storagePath(kind, ownerId, file.type);

  store().set(path, {
    path,
    ownerId,
    contentType: file.type,
    bytes,
    createdAt: Date.now()
  });

  return {
    path,
    signedUrl: buildSignedUrl(path),
    size: file.size,
    contentType: file.type
  };
}

export function getSignedFile(path: string, exp: string, sig: string) {
  if (!path || !exp || !sig) {
    throw new Error("Missing signed file parameters.");
  }

  const expMs = Number(exp);
  if (!Number.isFinite(expMs) || expMs < Date.now()) {
    throw new Error("Signed URL has expired.");
  }

  const payload = `${path}:${exp}`;
  const expected = sign(payload);

  const providedBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new Error("Invalid signed URL signature.");
  }

  const file = store().get(path);
  if (!file) {
    throw new Error("File not found.");
  }

  return file;
}

export function uploadLimitMb() {
  return Math.floor(uploadMaxBytes() / 1024 / 1024);
}
