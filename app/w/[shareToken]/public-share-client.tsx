"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type ShareItem = {
  id: string;
  title: string;
  merchant: string;
  priceCents: number;
  availability: "Available" | "Reserved" | "Purchased";
  fundedCents: number;
  targetCents: number;
  groupFunded: boolean;
};

export type PublicSharePayload = {
  listId: string;
  listTitle: string;
  ownerName: string;
  occasion: string;
  description: string;
  items: ShareItem[];
};

type Props = {
  shareToken: string;
  payload: PublicSharePayload;
  initialItemId: string | null;
  initialIntent: "reserve" | "contribute";
  isAuthed: boolean;
  startInError: boolean;
};

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function money(cents: number) {
  return usd.format(cents / 100);
}

function toPercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((value / total) * 100));
}

function queryString(query: Record<string, string | null>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value);
    }
  }
  return params.toString();
}

export function PublicShareClient({
  shareToken,
  payload,
  initialItemId,
  initialIntent,
  isAuthed,
  startInError
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(startInError);
  const [items, setItems] = useState(payload.items);
  const [toast, setToast] = useState<string | null>(null);

  const activeItem = useMemo(() => items.find((item) => item.id === initialItemId) || null, [items, initialItemId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    const channel = window.setInterval(() => {
      setItems((current) =>
        current.map((item, index) => {
          if (index !== 0 || !item.groupFunded) {
            return item;
          }

          const nextFunded = Math.min(item.targetCents, item.fundedCents + 100);
          const nextAvailability = nextFunded >= item.targetCents ? "Purchased" : "Reserved";

          return {
            ...item,
            fundedCents: nextFunded,
            availability: nextAvailability
          };
        })
      );
    }, 6000);

    return () => window.clearInterval(channel);
  }, [loading]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const onRetry = () => {
    setError(false);
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setToast("Reconnected.");
    }, 500);
  };

  const closeHref = `/w/${shareToken}${isAuthed ? "?auth=1" : ""}`;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <header className="rounded-2xl border border-line bg-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/70">Public wishlist</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">{payload.listTitle}</h1>
            <p className="mt-2 text-sm text-ink/75">
              {payload.ownerName} • {payload.occasion}
            </p>
          </div>

          <button
            type="button"
            className="rounded-lg border border-line bg-soft px-3 py-2 text-sm font-medium"
            onClick={async () => {
              await navigator.clipboard.writeText(`${window.location.origin}/w/${shareToken}`);
              setToast("Share link copied.");
            }}
          >
            Copy link
          </button>
        </div>

        <p className="mt-3 text-sm text-ink/75">{payload.description}</p>
        <div className="mt-3 rounded-lg border border-line bg-soft px-3 py-2 text-xs text-ink/80">
          How this works: reserve or contribute to avoid duplicate gifts. Owner never sees who took what.
        </div>
      </header>

      {error && (
        <section className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-4">
          <p className="text-sm font-medium text-danger">Live updates are temporarily unavailable.</p>
          <p className="mt-1 text-sm text-danger/90">You can still browse loaded items. Retry to reconnect updates.</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg border border-danger/40 bg-white px-3 py-2 text-sm font-medium text-danger"
          >
            Retry
          </button>
        </section>
      )}

      <section className="mt-5 space-y-3">
        {loading && (
          <ul className="space-y-3" aria-label="Loading items">
            {[0, 1, 2].map((idx) => (
              <li key={idx} className="animate-pulse rounded-2xl border border-line bg-card p-4">
                <div className="h-4 w-2/3 rounded bg-soft" />
                <div className="mt-2 h-3 w-1/3 rounded bg-soft" />
                <div className="mt-4 h-10 rounded bg-soft" />
              </li>
            ))}
          </ul>
        )}

        {!loading &&
          items.map((item) => {
            const itemHref = `/w/${shareToken}?${queryString({
              item: item.id,
              auth: isAuthed ? "1" : null,
              intent: "reserve"
            })}`;
            const reserveReturn = `/w/${shareToken}?${queryString({ item: item.id, auth: "1", intent: "reserve" })}`;
            const contributeReturn = `/w/${shareToken}?${queryString({ item: item.id, auth: "1", intent: "contribute" })}`;
            const reserveAuthHref = `/auth?returnTo=${encodeURIComponent(reserveReturn)}`;
            const contributeAuthHref = `/auth?returnTo=${encodeURIComponent(contributeReturn)}`;

            return (
              <article key={item.id} className="rounded-2xl border border-line bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{item.title}</h2>
                    <p className="mt-1 text-sm text-ink/75">
                      {item.merchant} • {money(item.priceCents)}
                    </p>
                    <p className="mt-1 text-sm font-medium text-ink">Status: {item.availability}</p>
                  </div>

                  <div className="w-full max-w-xs text-sm">
                    <p>
                      Funded {money(item.fundedCents)} of {money(item.targetCents)}
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-soft">
                      <div className="h-full bg-accent" style={{ width: `${toPercent(item.fundedCents, item.targetCents)}%` }} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {isAuthed ? (
                    <Link href={itemHref} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white">
                      Reserve
                    </Link>
                  ) : (
                    <Link href={reserveAuthHref} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white">
                      Sign in to reserve
                    </Link>
                  )}

                  {isAuthed ? (
                    <Link
                      href={`/w/${shareToken}?${queryString({ item: item.id, auth: "1", intent: "contribute" })}`}
                      className="rounded-lg border border-line px-3 py-2 text-sm font-semibold"
                    >
                      Contribute
                    </Link>
                  ) : (
                    <Link href={contributeAuthHref} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold">
                      Sign in to contribute
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
      </section>

      {activeItem && (
        <section className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{activeItem.title}</h3>
                <p className="mt-1 text-sm text-ink/75">{initialIntent === "contribute" ? "Contribute" : "Reserve"} this gift</p>
              </div>
              <Link href={closeHref} className="rounded-lg border border-line px-3 py-2 text-sm">
                Close
              </Link>
            </div>

            {!isAuthed && (
              <div className="mt-4 rounded-lg border border-line bg-soft p-3 text-sm text-ink/80">
                Sign in required. You will return to this item after authentication.
              </div>
            )}

            {isAuthed && (
              <div className="mt-4 space-y-3">
                {initialIntent === "contribute" ? (
                  <>
                    <label className="block text-sm font-medium">
                      Amount (cents)
                      <input className="mt-1 w-full rounded-xl border border-line px-3 py-2" defaultValue="100" inputMode="numeric" />
                    </label>
                    <button
                      type="button"
                      onClick={() => setToast("Contribution recorded.")}
                      className="w-full rounded-xl bg-accent px-4 py-2 font-semibold text-white"
                    >
                      Confirm contribution
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setToast("Item reserved.")}
                    className="w-full rounded-xl bg-accent px-4 py-2 font-semibold text-white"
                  >
                    Confirm reserve
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent">
          {toast}
        </div>
      )}
    </main>
  );
}
