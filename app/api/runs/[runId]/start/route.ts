import { NextResponse } from "next/server";

import { enqueueRun } from "@/lib/qa/run-queue";

export async function POST(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;

  const queued = await enqueueRun(runId);

  if (!queued.ok && queued.reason === "not-found") {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (!queued.ok && queued.reason === "already-active") {
    return NextResponse.json({ error: "Run is already queued or executing.", run: queued.run }, { status: 409 });
  }

  if (!queued.ok) {
    return NextResponse.json({ error: "Run is not startable in its current state.", run: queued.run }, { status: 409 });
  }

  return NextResponse.json({ run: queued.run }, { status: 202 });
}