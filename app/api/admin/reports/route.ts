import { NextRequest, NextResponse } from "next/server";
import { getCorrelationId } from "../../../lib/ops/observability";
import { assertAdmin, getModerationSnapshot, toErrorPayload } from "../_lib/moderation";

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request.headers);

  try {
    assertAdmin(request.headers);
    const status = request.nextUrl.searchParams.get("status");
    const data = getModerationSnapshot(status);

    return NextResponse.json({
      ok: true,
      correlationId,
      data
    });
  } catch (error) {
    const payload = toErrorPayload(correlationId, error);
    return NextResponse.json(payload.body, { status: payload.status });
  }
}
