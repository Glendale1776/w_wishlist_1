import { NextRequest, NextResponse } from "next/server";
import { assertUploadKind, saveUpload, uploadLimitMb } from "./_lib/storage";

type UploadResponse = {
  ok: boolean;
  code?: "VALIDATION" | "AUTH" | "INTERNAL";
  message?: string;
  data?: {
    path: string;
    signedUrl: string;
    contentType: string;
    size: number;
    maxMb: number;
  };
};

function json(body: UploadResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id")?.trim();
  if (!userId) {
    return json({ ok: false, code: "AUTH", message: "Authentication required." }, 401);
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const kind = assertUploadKind(form.get("kind"));

    if (!(file instanceof File)) {
      return json({ ok: false, code: "VALIDATION", message: "file is required." }, 400);
    }

    const saved = await saveUpload(kind, userId, file);
    return json({
      ok: true,
      data: {
        ...saved,
        maxMb: uploadLimitMb()
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    const lower = message.toLowerCase();
    const status =
      lower.includes("limit") ||
      lower.includes("unsupported") ||
      lower.includes("required") ||
      lower.includes("must be") ||
      lower.includes("empty")
        ? 400
        : 500;
    return json({ ok: false, code: status === 400 ? "VALIDATION" : "INTERNAL", message }, status);
  }
}
