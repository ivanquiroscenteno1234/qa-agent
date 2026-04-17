import { NextResponse } from "next/server";

import { getQaStoreBackend } from "@/lib/qa/storage/backend";
import { sanitizeRunRecord } from "@/lib/qa/storage/shared";

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  const run = await getQaStoreBackend().getRun(runId);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json({ run: sanitizeRunRecord(run) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  const run = await getQaStoreBackend().getRun(runId);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (run.status === "queued" || run.status === "running") {
    return NextResponse.json(
      { error: { code: "RUN_ACTIVE", message: "Cannot delete a run that is currently queued or running. Cancel it first." } },
      { status: 409 }
    );
  }

  await getQaStoreBackend().deleteRun(runId);
  return new NextResponse(null, { status: 204 });
}