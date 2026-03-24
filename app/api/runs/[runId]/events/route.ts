import { NextResponse } from "next/server";

import { getRun, listRunEvents } from "@/lib/qa/store";

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  const run = await getRun(runId);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json({
    runId,
    currentPhase: run.currentPhase,
    status: run.status,
    events: await listRunEvents(runId),
    warnings: run.warnings
  });
}