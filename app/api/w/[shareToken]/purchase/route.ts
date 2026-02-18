import { NextRequest } from "next/server";
import { handleMutation } from "../_lib/core";

export async function POST(request: NextRequest, context: { params: { shareToken: string } }) {
  return handleMutation(request, context.params, "purchase");
}
