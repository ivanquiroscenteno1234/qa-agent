import { NextResponse } from "next/server";

import { getQaStoreBackend } from "@/lib/qa/storage/backend";

export async function POST(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  const run = await getQaStoreBackend().getRun(runId);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const updated = await getQaStoreBackend().requestRunCancellation(runId);
  return NextResponse.json({ run: updated });
}