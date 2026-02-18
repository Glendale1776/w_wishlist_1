"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ErrorCode = "VALIDATION" | "AUTH" | "CONFLICT" | "INTERNAL";
type ReportStatus = "open" | "hidden";

type ModerationReport = {
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

type StaleClaim = {
  id: string;
  itemId: string;
  state: "reserved" | "purchased" | "cancelled";
  isStale: boolean;
  updatedAt: string;
  aggregate: {
    availability: "Available" | "Reserved" | "Purchased";
    funded_cents: number;
    target_cents: number;
  } | null;
};

type AuditEntry = {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  createdAt: string;
};

type SnapshotPayload = {
  reports: ModerationReport[];
  staleClaims: StaleClaim[];
  audit: AuditEntry[];
};

type ApiErrorBody = {
  ok: false;
  code: ErrorCode;
  message: string;
};

type SnapshotSuccessBody = {
  ok: true;
  data: SnapshotPayload;
};

type MutationSuccessBody = {
  ok: true;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function ModerationPage() {
  const searchParams = useSearchParams();
  const simulatedRole = (searchParams.get("role") || "viewer").toLowerCase();
  const actorUserId = searchParams.get("as") || (simulatedRole === "admin" ? "admin-demo" : "viewer-demo");
  const isAdmin = simulatedRole === "admin";

  const [statusFilter, setStatusFilter] = useState<"all" | ReportStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [busyAction, setBusyAction] = useState(false);
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotPayload>({ reports: [], staleClaims: [], audit: [] });
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const selectedReport = useMemo(
    () => snapshot.reports.find((report) => report.id === selectedReportId) ?? null,
    [snapshot.reports, selectedReportId]
  );

  const fetchSnapshot = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/reports?status=${statusFilter}`, {
        headers: {
          "x-role": simulatedRole,
          "x-user-id": actorUserId
        },
        cache: "no-store"
      });

      const payload = (await response.json()) as SnapshotSuccessBody | ApiErrorBody;
      if (!response.ok || payload.ok !== true) {
        const message = payload.ok === false ? payload.message : "Could not load moderation queue.";
        throw new Error(message);
      }

      setSnapshot(payload.data);
      setSelectedReportId((current) => {
        if (current && payload.data.reports.some((report) => report.id === current)) {
          return current;
        }
        return payload.data.reports[0]?.id ?? null;
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load moderation queue.");
    } finally {
      setLoading(false);
    }
  }, [actorUserId, isAdmin, simulatedRole, statusFilter]);

  useEffect(() => {
    void fetchSnapshot();
  }, [fetchSnapshot]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const onReportAction = async (action: "hide" | "unhide") => {
    if (!selectedReport || !reason.trim()) {
      return;
    }

    try {
      setBusyAction(true);
      const response = await fetch(`/api/admin/reports/${selectedReport.id}/action`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-role": simulatedRole,
          "x-user-id": actorUserId
        },
        body: JSON.stringify({ action, reason: reason.trim() })
      });

      const payload = (await response.json()) as MutationSuccessBody | ApiErrorBody;
      if (!response.ok || payload.ok !== true) {
        const message = payload.ok === false ? payload.message : "Moderation action failed.";
        throw new Error(message);
      }

      setToast(action === "hide" ? "Target hidden and logged." : "Target unhidden and logged.");
      setReason("");
      await fetchSnapshot();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Moderation action failed.");
    } finally {
      setBusyAction(false);
    }
  };

  const onOverrideClaim = async (claimId: string) => {
    if (!reason.trim()) {
      return;
    }

    try {
      setBusyAction(true);
      const response = await fetch(`/api/admin/claims/${claimId}/override`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-role": simulatedRole,
          "x-user-id": actorUserId
        },
        body: JSON.stringify({ reason: reason.trim() })
      });

      const payload = (await response.json()) as MutationSuccessBody | ApiErrorBody;
      if (!response.ok || payload.ok !== true) {
        const message = payload.ok === false ? payload.message : "Claim override failed.";
        throw new Error(message);
      }

      setToast("Stale reservation cleared and aggregate refreshed.");
      setReason("");
      await fetchSnapshot();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Claim override failed.");
    } finally {
      setBusyAction(false);
    }
  };

  if (!isAdmin) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-10">
        <section className="w-full rounded-2xl border border-danger/30 bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-danger">Admin only</p>
          <h1 className="mt-1 text-2xl font-semibold">Moderation access denied</h1>
          <p className="mt-2 text-sm text-ink/75">
            Non-admin users cannot open this route. Use an admin session to review reports and overrides.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/app" className="rounded-lg border border-line px-4 py-2 text-sm font-medium">
              Back to app
            </Link>
            <Link href="/app/admin/moderation?role=admin" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
              Open as admin (demo)
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Admin moderation</h1>
          <p className="mt-1 text-sm text-ink/75">Abuse queue and stale claim overrides with immutable audit trail.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-line bg-soft px-3 py-2 text-xs font-semibold uppercase">Role: admin</span>
          <Link href="/app" className="rounded-lg border border-line px-3 py-2 text-sm font-medium">
            Back to app
          </Link>
        </div>
      </header>

      <section className="mt-5 rounded-2xl border border-line bg-card p-4">
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink/70">Queue filter</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | ReportStatus)}
              className="mt-1 w-full rounded-xl border border-line px-3 py-2"
            >
              <option value="all">All reports</option>
              <option value="open">Open only</option>
              <option value="hidden">Hidden only</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink/70">Required reason</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1 h-24 w-full rounded-xl border border-line px-3 py-2"
              placeholder="Explain why this action is required."
            />
          </label>
        </div>
      </section>

      {error && <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-line bg-card p-4">
          <h2 className="text-lg font-semibold">Abuse queue</h2>
          {loading ? (
            <ul className="mt-3 space-y-2" aria-label="Loading moderation queue">
              {[0, 1, 2].map((idx) => (
                <li key={idx} className="h-16 animate-pulse rounded-xl border border-line bg-soft" />
              ))}
            </ul>
          ) : snapshot.reports.length === 0 ? (
            <p className="mt-3 text-sm text-ink/70">No reports in this filter.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {snapshot.reports.map((report) => {
                const active = report.id === selectedReportId;
                return (
                  <li key={report.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedReportId(report.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left ${
                        active ? "border-accent bg-accent/10" : "border-line bg-soft/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{report.label}</p>
                        <span className="rounded border border-line bg-card px-2 py-0.5 text-xs uppercase">{report.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-ink/70">
                        {report.targetType}:{report.targetId} • Reporter {report.reporter}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <h2 className="text-lg font-semibold">Report detail</h2>
          {!selectedReport ? (
            <p className="mt-3 text-sm text-ink/70">Choose a report from the queue.</p>
          ) : (
            <>
              <p className="mt-3 text-sm font-medium">{selectedReport.label}</p>
              <p className="mt-1 text-sm text-ink/75">{selectedReport.reason}</p>
              <p className="mt-2 text-xs text-ink/70">
                Target {selectedReport.targetType}:{selectedReport.targetId}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyAction || !reason.trim() || selectedReport.status === "hidden"}
                  onClick={() => void onReportAction("hide")}
                  className="rounded-lg border border-line bg-soft px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hide
                </button>
                <button
                  type="button"
                  disabled={busyAction || !reason.trim() || selectedReport.status === "open"}
                  onClick={() => void onReportAction("unhide")}
                  className="rounded-lg border border-line bg-soft px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Unhide
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-semibold">Stale claims</h2>
        {loading ? (
          <div className="mt-3 h-16 animate-pulse rounded-xl border border-line bg-soft" />
        ) : snapshot.staleClaims.length === 0 ? (
          <p className="mt-3 text-sm text-ink/70">No stale claims pending override.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {snapshot.staleClaims.map((claim) => (
              <li key={claim.id} className="rounded-xl border border-line bg-soft/50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">Claim {claim.id}</p>
                    <p className="mt-1 text-xs text-ink/70">
                      Item {claim.itemId} • Current state {claim.state} • Aggregate {claim.aggregate?.availability ?? "unknown"}
                    </p>
                    {claim.aggregate && (
                      <p className="mt-1 text-xs text-ink/70">
                        Funded {money(claim.aggregate.funded_cents)} of {money(claim.aggregate.target_cents)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={busyAction || !reason.trim()}
                    onClick={() => void onOverrideClaim(claim.id)}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear stale reservation
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-semibold">Audit trail</h2>
        {snapshot.audit.length === 0 ? (
          <p className="mt-3 text-sm text-ink/70">No moderation actions recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {snapshot.audit.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-line bg-soft/50 p-3 text-sm">
                <p className="font-medium">
                  {entry.action} • {entry.targetType}:{entry.targetId}
                </p>
                <p className="mt-1 text-xs text-ink/70">
                  Actor {entry.actorUserId} • {new Date(entry.createdAt).toLocaleString()} • Reason: {entry.reason}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toast && <p className="fixed bottom-4 right-4 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent">{toast}</p>}
    </main>
  );
}
