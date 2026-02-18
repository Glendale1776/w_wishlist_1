#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const defaultStorePath = join(tmpdir(), "wishlist-one-time-reveal.json");

function usage() {
  console.log("Usage:");
  console.log("  node scripts/ops/one-time-reveal.mjs issue <label> <secret> <actor> [ttlSeconds]");
  console.log("  node scripts/ops/one-time-reveal.mjs consume <revealToken> <actor>");
  console.log("  node scripts/ops/one-time-reveal.mjs self-test");
}

function nowMs() {
  return Date.now();
}

function hashToken(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function loadStore() {
  try {
    const raw = await readFile(defaultStorePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.records)) {
      return { records: [] };
    }
    return parsed;
  } catch {
    return { records: [] };
  }
}

async function saveStore(store) {
  await writeFile(defaultStorePath, JSON.stringify(store, null, 2));
}

function issueRecord(store, label, secret, actor, ttlSeconds) {
  const revealToken = randomBytes(24).toString("hex");
  const record = {
    id: randomBytes(8).toString("hex"),
    label,
    secret,
    tokenHash: hashToken(revealToken),
    issuedBy: actor,
    issuedAt: nowMs(),
    expiresAt: nowMs() + ttlSeconds * 1000,
    consumedAt: null,
    consumedBy: null
  };
  store.records.push(record);
  return { record, revealToken };
}

function consumeRecord(store, revealToken, actor) {
  const tokenHash = hashToken(revealToken);
  const record = store.records.find((item) => item.tokenHash === tokenHash);

  if (!record) {
    throw new Error("Reveal token not found.");
  }
  if (record.consumedAt) {
    throw new Error("Reveal token already consumed.");
  }
  if (record.expiresAt < nowMs()) {
    throw new Error("Reveal token expired.");
  }

  record.consumedAt = nowMs();
  record.consumedBy = actor;

  return record;
}

function printIssue(record, revealToken) {
  console.log(JSON.stringify({
    ok: true,
    action: "issue",
    recordId: record.id,
    label: record.label,
    revealToken,
    expiresAt: new Date(record.expiresAt).toISOString(),
    issuedBy: record.issuedBy
  }, null, 2));
}

function printConsume(record) {
  console.log(JSON.stringify({
    ok: true,
    action: "consume",
    recordId: record.id,
    label: record.label,
    secret: record.secret,
    consumedAt: new Date(record.consumedAt).toISOString(),
    consumedBy: record.consumedBy
  }, null, 2));
}

async function selfTest() {
  await rm(defaultStorePath, { force: true });

  const store = await loadStore();
  const { revealToken } = issueRecord(store, "SUPABASE_SERVICE_ROLE_KEY", "demo_redacted_secret", "ops-self-test", 300);
  await saveStore(store);

  const loaded = await loadStore();
  const consumed = consumeRecord(loaded, revealToken, "ops-self-test");
  await saveStore(loaded);

  let secondConsumeBlocked = false;
  try {
    consumeRecord(loaded, revealToken, "ops-self-test");
  } catch {
    secondConsumeBlocked = true;
  }

  console.log(JSON.stringify({
    ok: true,
    action: "self-test",
    onceOnly: secondConsumeBlocked,
    consumedLabel: consumed.label,
    consumedBy: consumed.consumedBy,
    consumedAt: new Date(consumed.consumedAt).toISOString()
  }, null, 2));
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    usage();
    process.exitCode = 1;
    return;
  }

  if (command === "self-test") {
    await selfTest();
    return;
  }

  const store = await loadStore();

  if (command === "issue") {
    const [label, secret, actor, ttlRaw] = args;
    const ttlSeconds = Number.parseInt(ttlRaw || "900", 10);

    if (!label || !secret || !actor || Number.isNaN(ttlSeconds) || ttlSeconds <= 0) {
      usage();
      process.exitCode = 1;
      return;
    }

    const { record, revealToken } = issueRecord(store, label, secret, actor, ttlSeconds);
    await saveStore(store);
    printIssue(record, revealToken);
    return;
  }

  if (command === "consume") {
    const [token, actor] = args;
    if (!token || !actor) {
      usage();
      process.exitCode = 1;
      return;
    }

    const record = consumeRecord(store, token, actor);
    await saveStore(store);
    printConsume(record);
    return;
  }

  usage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
