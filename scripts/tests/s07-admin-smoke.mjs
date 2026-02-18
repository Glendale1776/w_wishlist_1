#!/usr/bin/env node

const baseUrl = (process.env.APP_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function jsonRequest(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function run() {
  console.log("[s07] smoke start", { baseUrl });

  const noRole = await jsonRequest("/api/admin/reports");
  assert(noRole.response.status === 401, "Expected 401 without admin role.");
  assert(noRole.payload.code === "AUTH", "Expected AUTH code without admin role.");

  const adminHeaders = {
    "x-role": "admin",
    "x-user-id": "admin-smoke"
  };

  const queue = await jsonRequest("/api/admin/reports?status=all", { headers: adminHeaders });
  assert(queue.response.ok, "Admin queue request should succeed.");
  assert(Array.isArray(queue.payload.data?.staleClaims), "Queue payload missing staleClaims array.");

  const staleClaim = queue.payload.data.staleClaims.find((claim) => claim.state === "reserved");
  assert(staleClaim, "Expected at least one stale reserved claim.");

  const missingReason = await jsonRequest(`/api/admin/claims/${staleClaim.id}/override`, {
    method: "POST",
    headers: {
      ...adminHeaders,
      "content-type": "application/json"
    },
    body: JSON.stringify({ reason: "" })
  });
  assert(missingReason.response.status === 400, "Expected 400 when reason is empty.");
  assert(missingReason.payload.code === "VALIDATION", "Expected VALIDATION for missing reason.");

  const override = await jsonRequest(`/api/admin/claims/${staleClaim.id}/override`, {
    method: "POST",
    headers: {
      ...adminHeaders,
      "content-type": "application/json"
    },
    body: JSON.stringify({ reason: "Clearing stale hold after timeout" })
  });
  assert(override.response.ok, "Claim override should succeed.");
  assert(override.payload.data?.claim?.state === "cancelled", "Override should cancel stale claim.");

  const afterOverride = await jsonRequest("/api/admin/reports?status=all", { headers: adminHeaders });
  assert(afterOverride.response.ok, "Queue refresh should succeed.");

  const claimAudit = (afterOverride.payload.data?.audit || []).find(
    (entry) => entry.action === "claim.override_stale" && entry.targetId === staleClaim.id
  );
  assert(claimAudit, "Expected claim override audit entry.");

  const firstReport = afterOverride.payload.data?.reports?.[0];
  assert(firstReport, "Expected at least one moderation report.");

  const action = firstReport.status === "hidden" ? "unhide" : "hide";
  const reportAction = await jsonRequest(`/api/admin/reports/${firstReport.id}/action`, {
    method: "POST",
    headers: {
      ...adminHeaders,
      "content-type": "application/json"
    },
    body: JSON.stringify({ action, reason: "Smoke check action logging" })
  });
  assert(reportAction.response.ok, "Report action should succeed.");

  const afterReport = await jsonRequest("/api/admin/reports?status=all", { headers: adminHeaders });
  const reportAudit = (afterReport.payload.data?.audit || []).find((entry) =>
    entry.action === (action === "hide" ? "report.hide" : "report.unhide")
  );
  assert(reportAudit, "Expected report action audit entry.");

  console.log("[s07] smoke passed");
}

run().catch((error) => {
  console.error("[s07] smoke failed", error.message);
  process.exit(1);
});
