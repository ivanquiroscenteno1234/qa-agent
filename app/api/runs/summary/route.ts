import { NextResponse } from "next/server";

import { listRunSummaries } from "@/lib/qa/store";

export async function GET() {
  return NextResponse.json({ runs: await listRunSummaries() });
}