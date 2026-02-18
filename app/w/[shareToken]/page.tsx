import { createHash, timingSafeEqual } from "node:crypto";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShareClient, type PublicSharePayload } from "./public-share-client";

type PageProps = {
  params: { shareToken: string };
  searchParams?: {
    item?: string;
    auth?: string;
    error?: string;
    intent?: string;
  };
};

type PublicFixture = PublicSharePayload & { token: string };

const fixtures: PublicFixture[] = [
  {
    token: "abc123",
    listId: "wl-first",
    listTitle: "Birthday 2026",
    ownerName: "Alex",
    occasion: "Birthday",
    description: "Thanks for helping keep this a surprise.",
    items: [
      {
        id: "i-1",
        title: "Noise-canceling headphones",
        merchant: "SoundHub",
        priceCents: 24999,
        availability: "Reserved",
        fundedCents: 8300,
        targetCents: 24999,
        groupFunded: true
      },
      {
        id: "i-2",
        title: "Pour-over coffee set",
        merchant: "BrewWorks",
        priceCents: 7900,
        availability: "Available",
        fundedCents: 0,
        targetCents: 7900,
        groupFunded: false
      },
      {
        id: "i-3",
        title: "Travel journal",
        merchant: "Paper Loft",
        priceCents: 2200,
        availability: "Available",
        fundedCents: 0,
        targetCents: 2200,
        groupFunded: false
      }
    ]
  }
];

function sha256(value: string) {
  return createHash("sha256").update(value).digest();
}

function findPublicShareByToken(shareToken: string): PublicFixture | null {
  const incomingHash = sha256(shareToken);
  let match: PublicFixture | null = null;

  for (const fixture of fixtures) {
    const fixtureHash = sha256(fixture.token);
    const isMatch = timingSafeEqual(incomingHash, fixtureHash);
    if (isMatch) {
      match = fixture;
    }
  }

  return match;
}

function appBaseUrl() {
  return process.env.APP_BASE_URL?.replace(/\/$/, "") || "https://wishlist.vercel.app";
}

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const share = findPublicShareByToken(params.shareToken);
  const canonical = `${appBaseUrl()}/w/${params.shareToken}`;

  if (!share) {
    return {
      title: "Wishlist not found",
      description: "This share link is not available.",
      alternates: { canonical },
      robots: { index: false, follow: false }
    };
  }

  const description = `${share.ownerName}'s ${share.occasion} wishlist`;

  return {
    title: `${share.listTitle} | Wish List`,
    description,
    alternates: { canonical },
    robots: { index: false, follow: false },
    openGraph: {
      title: share.listTitle,
      description,
      url: canonical,
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: share.listTitle,
      description
    }
  };
}

export default function PublicSharePage({ params, searchParams }: PageProps) {
  const share = findPublicShareByToken(params.shareToken);

  if (!share) {
    notFound();
  }

  const activeItemId = typeof searchParams?.item === "string" ? searchParams.item : null;
  const isAuthed = searchParams?.auth === "1";
  const startInError = searchParams?.error === "1";
  const intent = searchParams?.intent === "contribute" ? "contribute" : "reserve";

  return (
    <PublicShareClient
      shareToken={params.shareToken}
      payload={share}
      initialItemId={activeItemId}
      initialIntent={intent}
      isAuthed={isAuthed}
      startInError={startInError}
    />
  );
}
