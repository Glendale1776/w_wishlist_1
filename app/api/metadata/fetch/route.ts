import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";

type MetadataResponse = {
  ok: boolean;
  code?: "VALIDATION" | "INTERNAL";
  message?: string;
  data?: {
    title: string;
    imageUrl: string | null;
    priceCents: number | null;
    sourceUrl: string;
  };
};

function json(body: MetadataResponse, status = 200) {
  return NextResponse.json(body, { status });
}

function timeoutMs() {
  const raw = Number.parseInt(process.env.METADATA_TIMEOUT_MS || "4000", 10);
  if (Number.isNaN(raw)) return 4000;
  return Math.min(5000, Math.max(3000, raw));
}

function isPrivateIpv4(ip: string) {
  const parts = ip.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((value) => Number.isNaN(value))) {
    return false;
  }

  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 0) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

function isPrivateIpv6(ip: string) {
  const lower = ip.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

async function assertPublicHost(url: URL) {
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) {
    throw new Error("Blocked host.");
  }

  const ipType = isIP(host);
  if (ipType === 4 && isPrivateIpv4(host)) {
    throw new Error("Blocked private network address.");
  }
  if (ipType === 6 && isPrivateIpv6(host)) {
    throw new Error("Blocked private network address.");
  }

  const resolved = await lookup(host, { all: true });
  if (!resolved.length) {
    throw new Error("Unable to resolve host.");
  }

  for (const record of resolved) {
    if ((record.family === 4 && isPrivateIpv4(record.address)) || (record.family === 6 && isPrivateIpv6(record.address))) {
      throw new Error("Blocked private network address.");
    }
  }
}

function pickMeta(content: string, regex: RegExp) {
  const match = content.match(regex);
  if (!match) return null;
  return match[1]?.trim() || null;
}

function parsePriceCents(content: string) {
  const raw =
    pickMeta(content, /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    pickMeta(content, /<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["'][^>]*>/i);

  if (!raw) return null;
  const value = Number(raw.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

function parseMetadata(content: string, source: URL) {
  const title =
    pickMeta(content, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    pickMeta(content, /<title>([^<]+)<\/title>/i) ||
    "Untitled item";

  const rawImage = pickMeta(content, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  let imageUrl: string | null = null;

  if (rawImage) {
    try {
      imageUrl = new URL(rawImage, source).toString();
    } catch {
      imageUrl = null;
    }
  }

  return {
    title,
    imageUrl,
    priceCents: parsePriceCents(content),
    sourceUrl: source.toString()
  };
}

async function fetchHtmlSafely(sourceUrl: URL) {
  let current = sourceUrl;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await assertPublicHost(current);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs());

    try {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": "wishlist-metadata-bot/1.0"
        }
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          throw new Error("Redirect missing location.");
        }

        current = new URL(location, current);
        continue;
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("text/html")) {
        throw new Error("URL did not return HTML content.");
      }

      const html = await response.text();
      return { html, url: current };
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Too many redirects.");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const rawUrl = typeof body.url === "string" ? body.url.trim() : "";

    if (!rawUrl) {
      return json({ ok: false, code: "VALIDATION", message: "url is required." }, 400);
    }

    let sourceUrl: URL;
    try {
      sourceUrl = new URL(rawUrl);
    } catch {
      return json({ ok: false, code: "VALIDATION", message: "Invalid URL format." }, 400);
    }

    if (!["http:", "https:"].includes(sourceUrl.protocol)) {
      return json({ ok: false, code: "VALIDATION", message: "Only HTTP(S) URLs are allowed." }, 400);
    }

    const { html, url } = await fetchHtmlSafely(sourceUrl);
    const parsed = parseMetadata(html, url);

    return json({
      ok: true,
      data: {
        title: parsed.title,
        imageUrl: parsed.imageUrl,
        priceCents: parsed.priceCents,
        sourceUrl: parsed.sourceUrl
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Metadata fetch failed.";
    const lower = message.toLowerCase();

    if (lower.includes("blocked") || lower.includes("invalid") || lower.includes("html") || lower.includes("redirect")) {
      return json({ ok: false, code: "VALIDATION", message }, 400);
    }

    if (lower.includes("abort")) {
      return json({ ok: false, code: "INTERNAL", message: "Metadata fetch timed out." }, 504);
    }

    return json({ ok: false, code: "INTERNAL", message }, 500);
  }
}
