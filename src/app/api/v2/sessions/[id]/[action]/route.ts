import { NextResponse, type NextRequest } from "next/server";
import { HttpError, handlers } from "@/lib/server/handlers";
import type { DemoScenario } from "@/lib/types";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/v2/sessions/[id]/[action]">) {
  const { id, action } = await ctx.params;
  const handler = handlers[action];
  if (!handler) return NextResponse.json({ error: "unknown_action" }, { status: 404 });

  const scenario = (req.headers.get("x-demo-scenario") ?? "normal") as DemoScenario;
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const data = await handler(body, scenario);
    return NextResponse.json({ session_id: id, request_id: body.request_id ?? null, ...(data as object) });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.code }, { status: err.status });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
