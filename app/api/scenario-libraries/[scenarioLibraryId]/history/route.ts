import { NextResponse } from "next/server";

import { getQaStoreBackend } from "@/lib/qa/storage/backend";

interface RouteContext {
  params: Promise<{ scenarioLibraryId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { scenarioLibraryId } = await context.params;
  const library = await getQaStoreBackend().getScenarioLibrary(scenarioLibraryId);

  if (!library) {
    return NextResponse.json({ error: "Scenario library not found" }, { status: 404 });
  }

  const history = [...library.versions].reverse().map((v) => ({
    version: v.version,
    createdAt: v.createdAt,
    sourceRunId: v.sourceRunId,
    scenarioCount: v.scenarioCount,
    summary: v.summary,
    changeSummary: v.changeSummary
  }));

  return NextResponse.json({ libraryId: library.id, libraryName: library.name, history });
}
