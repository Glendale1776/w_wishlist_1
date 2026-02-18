import { NextRequest, NextResponse } from "next/server";
import { getCorrelationId } from "../../../../../lib/ops/observability";
import { assertAdmin, overrideClaim, toErrorPayload } from "../../../_lib/moderation";

type OverrideBody = {
  reason?: string;
};

async function parseBody(request: NextRequest): Promise<OverrideBody> {
  try {
    return (await request.json()) as OverrideBody;
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest, context: { params: { claimId: string } }) {
  const correlationId = getCorrelationId(request.headers);

  try {
    const actorUserId = assertAdmin(request.headers);
    const body = await parseBody(request);

    const data = overrideClaim({
      claimId: context.params.claimId,
      actorUserId,
      reason: body.reason
    });

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
