import { NextResponse } from "next/server";

import { deleteRun, getRun } from "@/lib/qa/store";

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  const run = await getRun(runId);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json({ run });
}

export async function DELETE(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  const run = await getRun(runId);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (run.status === "queued" || run.status === "running") {
    return NextResponse.json(
      { error: { code: "RUN_ACTIVE", message: "Cannot delete a run that is currently queued or running. Cancel it first." } },
      { status: 409 }
    );
  }

  await deleteRun(runId);
  return new NextResponse(null, { status: 204 });
}