"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ItemStatus = "Available" | "Reserved" | "Purchased";

type OwnerItem = {
  id: string;
  title: string;
  priceCents: number;
  groupFunded: boolean;
  targetCents: number;
  fundedCents: number;
  status: ItemStatus;
  hasHistory: boolean;
  archived: boolean;
  imageUrl?: string | null;
  storagePath?: string | null;
  sourceUrl?: string | null;
};

type Wishlist = {
  id: string;
  title: string;
  occasionName: string;
  itemCount: number;
  claimedCount: number;
  shareLink: string;
};

const starterWishlist: Wishlist = {
  id: "wl-first",
  title: "Birthday 2026",
  occasionName: "Birthday",
  itemCount: 3,
  claimedCount: 1,
  shareLink: "https://wishlist.example/w/abc123"
};

const starterItems: OwnerItem[] = [
  {
    id: "i-1",
    title: "Noise-canceling headphones",
    priceCents: 24999,
    groupFunded: true,
    targetCents: 24999,
    fundedCents: 8300,
    status: "Reserved",
    hasHistory: true,
    archived: false,
    imageUrl: null,
    storagePath: null,
    sourceUrl: "https://store.example/headphones"
  },
  {
    id: "i-2",
    title: "Pour-over coffee set",
    priceCents: 7900,
    groupFunded: false,
    targetCents: 7900,
    fundedCents: 0,
    status: "Available",
    hasHistory: false,
    archived: false,
    imageUrl: null,
    storagePath: null,
    sourceUrl: "https://store.example/coffee-set"
  }
];

const sampleCatalog: Omit<OwnerItem, "id" | "hasHistory" | "archived">[] = [
  {
    title: "Weekend travel backpack",
    priceCents: 9900,
    groupFunded: false,
    targetCents: 9900,
    fundedCents: 0,
    status: "Available"
  },
  {
    title: "Concert tickets",
    priceCents: 18000,
    groupFunded: true,
    targetCents: 18000,
    fundedCents: 2400,
    status: "Reserved"
  },
  {
    title: "Cooking class voucher",
    priceCents: 12000,
    groupFunded: true,
    targetCents: 12000,
    fundedCents: 0,
    status: "Available"
  }
];

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const MAX_UPLOAD_MB = 10;
const DEMO_USER_ID = "owner-demo";

function money(cents: number) {
  return currency.format(cents / 100);
}

function progressPercent(funded: number, target: number) {
  if (target <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((funded / target) * 100));
}

type UploadApiResponse = {
  ok: boolean;
  message?: string;
  data?: {
    path: string;
    signedUrl: string;
    maxMb: number;
  };
};

type MetadataApiResponse = {
  ok: boolean;
  message?: string;
  data?: {
    title: string;
    imageUrl: string | null;
    priceCents: number | null;
    sourceUrl: string;
  };
};

function routeFromSegments(segments: string[] | undefined) {
  if (!segments || segments.length === 0) {
    return { kind: "home" as const };
  }

  if (segments[0] === "lists" && segments.length === 1) {
    return { kind: "lists" as const };
  }

  if (segments[0] === "lists" && segments[1] === "new") {
    return { kind: "new" as const };
  }

  if (segments[0] === "lists" && segments.length === 2) {
    return { kind: "detail" as const, wishlistId: segments[1] };
  }

  return { kind: "unknown" as const };
}

export default function AppRoutePage({ params }: { params: { slug?: string[] } }) {
  const route = useMemo(() => routeFromSegments(params.slug), [params.slug]);

  if (route.kind === "home") {
    return <OwnerHome />;
  }

  if (route.kind === "lists") {
    return <OwnerListsIndex />;
  }

  if (route.kind === "new") {
    return <CreateWishlist />;
  }

  if (route.kind === "detail") {
    return <OwnerWishlistEditor wishlistId={route.wishlistId} />;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-10">
      <section className="rounded-2xl border border-line bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">Route not in active slice</h1>
        <p className="mt-2 text-sm text-ink/75">This build currently focuses on owner onboarding and wishlist editor.</p>
        <Link href="/app" className="mt-4 inline-flex items-center rounded-xl bg-accent px-4 py-2 font-semibold text-white">
          Back to owner home
        </Link>
      </section>
    </main>
  );
}

function OwnerHome() {
  const [samplesInserted, setSamplesInserted] = useState(false);
  const [samples, setSamples] = useState(sampleCatalog);

  const insertSamples = () => {
    setSamplesInserted(true);
    setSamples(sampleCatalog);
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="rounded-2xl border border-line bg-card p-6">
        <h1 className="text-2xl font-semibold">Create your first wishlist</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink/75">
          Start with your occasion, then add your first item. Friends will coordinate from one share link.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/app/lists/new" className="inline-flex items-center rounded-xl bg-accent px-4 py-2 font-semibold text-white">
            Create your first wishlist
          </Link>
          <button
            type="button"
            onClick={insertSamples}
            className="inline-flex items-center rounded-xl border border-line bg-soft px-4 py-2 font-semibold text-ink"
          >
            Try with sample items
          </button>
        </div>
      </header>

      {samplesInserted && (
        <section className="mt-6 rounded-2xl border border-line bg-card p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Sample items (removable)</h2>
            <button
              type="button"
              onClick={() => {
                setSamples([]);
                setSamplesInserted(false);
              }}
              className="rounded-lg border border-line px-3 py-2 text-sm font-medium"
            >
              Remove all
            </button>
          </div>

          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {samples.map((sample, idx) => (
              <li key={sample.title} className="rounded-xl border border-line bg-soft p-3">
                <p className="font-medium">{sample.title}</p>
                <p className="mt-1 text-sm text-ink/70">{money(sample.priceCents)}</p>
                <button
                  type="button"
                  onClick={() => setSamples((current) => current.filter((_, currentIdx) => currentIdx !== idx))}
                  className="mt-3 rounded-lg border border-line px-3 py-2 text-sm"
                >
                  Remove sample
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function OwnerListsIndex() {
  const [copied, setCopied] = useState<"idle" | "done">("idle");

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(starterWishlist.shareLink);
      setCopied("done");
      window.setTimeout(() => setCopied("idle"), 1800);
    } catch {
      setCopied("idle");
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">My wishlists</h1>
        <Link href="/app/lists/new" className="inline-flex items-center rounded-xl bg-accent px-4 py-2 font-semibold text-white">
          Create wishlist
        </Link>
      </header>

      <section className="mt-5 rounded-2xl border border-line bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{starterWishlist.title}</h2>
            <p className="mt-1 text-sm text-ink/75">
              {starterWishlist.occasionName} • {starterWishlist.itemCount} items • {starterWishlist.claimedCount} claimed
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/app/lists/${starterWishlist.id}`}
              className="inline-flex items-center rounded-lg border border-line px-3 py-2 text-sm font-medium"
            >
              Open editor
            </Link>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center rounded-lg bg-soft px-3 py-2 text-sm font-medium"
            >
              Copy share link
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-ink/70">Status-only view for owner. Buyer identity is never shown.</p>
      </section>

      {copied === "done" && (
        <p className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          Share link copied.
        </p>
      )}
    </main>
  );
}

function CreateWishlist() {
  const [title, setTitle] = useState("");
  const [occasion, setOccasion] = useState("Birthday");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      setSaved(false);
      return;
    }
    setError("");
    setSaved(true);
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Create wishlist</h1>
      <p className="mt-2 text-sm text-ink/75">Start simple: name the occasion, then open the editor to add items.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-line bg-card p-6">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2"
            placeholder="Birthday 2026"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Occasion</span>
          <select
            value={occasion}
            onChange={(event) => setOccasion(event.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2"
          >
            <option>Birthday</option>
            <option>New Year</option>
            <option>Wedding</option>
            <option>Other</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="h-24 w-full rounded-xl border border-line px-3 py-2"
            placeholder="Optional message for gifters"
          />
        </label>

        {error && <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        {saved && (
          <p className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
            Wishlist saved. Continue in editor.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="rounded-xl bg-accent px-4 py-2 font-semibold text-white">
            Save wishlist
          </button>
          <Link href="/app/lists/wl-first" className="rounded-xl border border-line px-4 py-2 font-semibold">
            Open editor
          </Link>
        </div>
      </form>
    </main>
  );
}

function OwnerWishlistEditor({ wishlistId }: { wishlistId: string }) {
  const [items, setItems] = useState<OwnerItem[]>(starterItems);
  const [mode, setMode] = useState<"url" | "manual">("url");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("0");
  const [groupFunded, setGroupFunded] = useState(false);
  const [target, setTarget] = useState("100");
  const [formError, setFormError] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadedStoragePath, setUploadedStoragePath] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done">("idle");
  const [uploadError, setUploadError] = useState("");
  const [metaStatus, setMetaStatus] = useState<"idle" | "fetching" | "fetched" | "failed">("idle");
  const [metaError, setMetaError] = useState("");

  const onUploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setUploadStatus("idle");

    if (!file.type.startsWith("image/")) {
      setUploadError("Only image files are allowed.");
      return;
    }

    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setUploadError(`File exceeds ${MAX_UPLOAD_MB}MB limit.`);
      return;
    }

    const tempPreview = URL.createObjectURL(file);
    setImagePreviewUrl(tempPreview);

    try {
      setUploadStatus("uploading");
      const formData = new FormData();
      formData.set("kind", "item");
      formData.set("file", file);

      const response = await fetch("/api/uploads", {
        method: "POST",
        headers: {
          "x-user-id": DEMO_USER_ID
        },
        body: formData
      });

      const payload = (await response.json()) as UploadApiResponse;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.message || "Upload failed.");
      }

      setUploadedStoragePath(payload.data.path);
      setImagePreviewUrl(payload.data.signedUrl);
      setUploadStatus("done");
    } catch (error) {
      setUploadStatus("idle");
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    }
  };

  const onFetchMetadata = async () => {
    if (!url.trim()) {
      setMetaStatus("failed");
      setMetaError("Enter a URL first.");
      return;
    }

    setMetaError("");
    setMetaStatus("fetching");

    try {
      const response = await fetch("/api/metadata/fetch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url })
      });
      const payload = (await response.json()) as MetadataApiResponse;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.message || "Could not fetch metadata.");
      }

      if (payload.data.title) {
        setTitle(payload.data.title);
      }
      if (payload.data.priceCents !== null) {
        setPrice(String(payload.data.priceCents));
      }
      if (payload.data.imageUrl) {
        setImagePreviewUrl(payload.data.imageUrl);
        setUploadedStoragePath(null);
      }

      setMetaStatus("fetched");
    } catch (error) {
      setMetaStatus("failed");
      setMetaError(error instanceof Error ? error.message : "Metadata fetch failed.");
    }
  };

  const onSaveItem = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const priceCents = Number.parseInt(price, 10);
    const targetCents = Number.parseInt(target, 10);

    if (!title.trim()) {
      setFormError("Item title is required.");
      return;
    }

    if (Number.isNaN(priceCents) || priceCents < 0) {
      setFormError("Price must be a positive number of cents.");
      return;
    }

    if (groupFunded && (Number.isNaN(targetCents) || targetCents < 100)) {
      setFormError("Group target must be at least 100 cents.");
      return;
    }

    setFormError("");

    setItems((current) => [
      {
        id: `i-${current.length + 1}`,
        title: title.trim(),
        priceCents,
        groupFunded,
        targetCents: groupFunded ? targetCents : priceCents,
        fundedCents: 0,
        status: "Available",
        hasHistory: false,
        archived: false,
        imageUrl: imagePreviewUrl,
        storagePath: uploadedStoragePath,
        sourceUrl: mode === "url" ? url.trim() || null : null
      },
      ...current
    ]);

    setTitle("");
    setUrl("");
    setPrice("0");
    setGroupFunded(false);
    setTarget("100");
    setImagePreviewUrl(null);
    setUploadedStoragePath(null);
    setUploadStatus("idle");
    setUploadError("");
    setMetaStatus("idle");
    setMetaError("");
  };

  const archiveItem = (itemId: string) => {
    setItems((current) => current.map((item) => (item.id === itemId ? { ...item, archived: true } : item)));
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Wishlist editor</h1>
          <p className="mt-1 text-sm text-ink/75">Wishlist ID: {wishlistId}</p>
        </div>
        <Link href="/app/lists" className="rounded-xl border border-line px-4 py-2 text-sm font-semibold">
          Back to lists
        </Link>
      </header>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {items.map((item) => {
            const percent = progressPercent(item.fundedCents, item.targetCents);
            return (
              <article key={item.id} className="rounded-2xl border border-line bg-card p-4">
                {item.imageUrl && (
                  <div className="mb-3 overflow-hidden rounded-xl border border-line bg-soft">
                    <img src={item.imageUrl} alt={item.title} className="h-40 w-full object-cover" />
                  </div>
                )}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{item.title}</h2>
                    <p className="mt-1 text-sm text-ink/75">Price {money(item.priceCents)}</p>
                    <p className="mt-1 text-sm text-ink/75">Status {item.archived ? "Archived" : item.status}</p>
                    {item.sourceUrl && <p className="mt-1 text-xs text-ink/65">Source: {item.sourceUrl}</p>}
                  </div>
                  <div className="text-right text-sm">
                    <p>
                      Funded {money(item.fundedCents)} of {money(item.targetCents)}
                    </p>
                    <div className="mt-2 h-2 w-44 overflow-hidden rounded-full bg-soft">
                      <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => archiveItem(item.id)}
                    className="rounded-lg border border-line px-3 py-2 text-sm font-medium"
                  >
                    Archive item
                  </button>
                  <button
                    type="button"
                    disabled={item.hasHistory}
                    className="rounded-lg border border-line px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                    title={item.hasHistory ? "Cannot hard-delete item with claim/contribution history" : "Delete item"}
                  >
                    Delete item
                  </button>
                </div>
                {item.hasHistory && (
                  <p className="mt-2 text-xs text-ink/65">Hard delete blocked due to reservation/contribution history.</p>
                )}
              </article>
            );
          })}
        </div>

        <aside className="rounded-2xl border border-line bg-card p-5">
          <h2 className="text-lg font-semibold">Add or edit item</h2>
          <p className="mt-1 text-sm text-ink/70">Drawer-style editor. Choose URL or manual mode, then save.</p>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("url")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                mode === "url" ? "bg-accent text-white" : "border border-line"
              }`}
            >
              URL mode
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                mode === "manual" ? "bg-accent text-white" : "border border-line"
              }`}
            >
              Manual mode
            </button>
          </div>

          <form onSubmit={onSaveItem} className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-xl border border-line px-3 py-2"
                placeholder="Item title"
                required
              />
            </label>

            {mode === "url" && (
              <div className="space-y-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">URL</span>
                  <input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2"
                    placeholder="https://store.example/item"
                  />
                </label>
                <button
                  type="button"
                  onClick={onFetchMetadata}
                  className="rounded-lg border border-line bg-soft px-3 py-2 text-sm font-medium"
                  disabled={metaStatus === "fetching"}
                >
                  {metaStatus === "fetching" ? "Fetching details..." : "Fetch details"}
                </button>
                {metaStatus === "fetched" && <p className="text-xs text-accent">Details fetched. You can still edit fields manually.</p>}
                {metaError && <p className="text-xs text-danger">{metaError} Continue with manual entry.</p>}
              </div>
            )}

            <div className="space-y-2 rounded-xl border border-line bg-soft/40 p-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Item image</span>
                <input type="file" accept="image/*" onChange={onUploadImage} className="w-full text-sm" />
              </label>
              <p className="text-xs text-ink/70">Accepted: JPG, PNG, WEBP, GIF. Max {MAX_UPLOAD_MB}MB.</p>
              {uploadStatus === "uploading" && <p className="text-xs text-ink/70">Uploading image...</p>}
              {uploadStatus === "done" && <p className="text-xs text-accent">Image uploaded with signed preview access.</p>}
              {uploadError && <p className="text-xs text-danger">{uploadError}</p>}
              {imagePreviewUrl && (
                <div className="overflow-hidden rounded-lg border border-line bg-card">
                  <img src={imagePreviewUrl} alt="Item preview" className="h-36 w-full object-cover" />
                </div>
              )}
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">Price (cents)</span>
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="w-full rounded-xl border border-line px-3 py-2"
                inputMode="numeric"
              />
            </label>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={groupFunded}
                onChange={(event) => setGroupFunded(event.target.checked)}
              />
              Group funded
            </label>

            {groupFunded && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Target (cents)</span>
                <input
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                  className="w-full rounded-xl border border-line px-3 py-2"
                  inputMode="numeric"
                />
              </label>
            )}

            {formError && <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>}

            <button type="submit" className="w-full rounded-xl bg-accent px-4 py-2 font-semibold text-white">
              Save item
            </button>
          </form>
        </aside>
      </section>
    </main>
  );
}
