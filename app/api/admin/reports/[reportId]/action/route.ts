import { NextRequest, NextResponse } from "next/server";
import { getCorrelationId } from "../../../../../lib/ops/observability";
import { assertAdmin, moderateReport, toErrorPayload } from "../../../_lib/moderation";

type ActionBody = {
  action?: "hide" | "unhide";
  reason?: string;
};

async function parseBody(request: NextRequest): Promise<ActionBody> {
  try {
    return (await request.json()) as ActionBody;
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest, context: { params: { reportId: string } }) {
  const correlationId = getCorrelationId(request.headers);

  try {
    const actorUserId = assertAdmin(request.headers);
    const body = await parseBody(request);

    if (body.action !== "hide" && body.action !== "unhide") {
      return NextResponse.json(
        {
          ok: false,
          correlationId,
          code: "VALIDATION",
          message: "action must be hide or unhide."
        },
        { status: 400 }
      );
    }

    const result = moderateReport({
      reportId: context.params.reportId,
      action: body.action,
      actorUserId,
      reason: body.reason
    });

    return NextResponse.json({
      ok: true,
      correlationId,
      data: result
    });
  } catch (error) {
    const payload = toErrorPayload(correlationId, error);
    return NextResponse.json(payload.body, { status: payload.status });
  }
}
