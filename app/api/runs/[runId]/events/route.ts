import { NextResponse } from "next/server";

import { getQaStoreBackend } from "@/lib/qa/storage/backend";

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  const run = await getQaStoreBackend().getRun(runId);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json({
    runId,
    currentPhase: run.currentPhase,
    status: run.status,
    events: await getQaStoreBackend().listRunEvents(runId),
    warnings: run.warnings
  });
}