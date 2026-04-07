import { type NextRequest, NextResponse } from "next/server";

import { listRunSummaries } from "@/lib/qa/store";
import type { ListRunSummariesOptions } from "@/lib/qa/storage/types";
import type { RunStatus } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const options: ListRunSummariesOptions = {};

  const limitParam = searchParams.get("limit");
  if (limitParam != null) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0) options.limit = parsed;
  }

  const cursor = searchParams.get("cursor");
  if (cursor) options.cursor = cursor;

  const status = searchParams.get("status") as RunStatus | null;
  if (status) options.statusFilter = status;

  return NextResponse.json({ runs: await listRunSummaries(options) });
}