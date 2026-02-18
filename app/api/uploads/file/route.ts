import { NextRequest, NextResponse } from "next/server";
import { getSignedFile } from "../_lib/storage";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const file = getSignedFile(searchParams.get("path") || "", searchParams.get("exp") || "", searchParams.get("sig") || "");

    return new NextResponse(file.bytes, {
      status: 200,
      headers: {
        "content-type": file.contentType,
        "cache-control": "private, max-age=300"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid file request.";
    const status = message.toLowerCase().includes("not found") ? 404 : 403;
    return NextResponse.json({ ok: false, code: "AUTH", message }, { status });
  }
}
