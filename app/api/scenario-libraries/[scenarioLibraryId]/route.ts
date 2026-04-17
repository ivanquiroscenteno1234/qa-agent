import { NextResponse } from "next/server";
import { z } from "zod";

import { getQaStoreBackend } from "@/lib/qa/storage/backend";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rename"), name: z.string().min(1).max(200) }),
  z.object({ action: z.literal("archive") }),
  z.object({ action: z.literal("duplicate"), name: z.string().min(1).max(200) })
]);

interface RouteContext {
  params: Promise<{ scenarioLibraryId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { scenarioLibraryId } = await context.params;
  const library = await getQaStoreBackend().getScenarioLibrary(scenarioLibraryId);

  if (!library) {
    return NextResponse.json({ error: "Scenario library not found" }, { status: 404 });
  }

  return NextResponse.json({ scenarioLibrary: library });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { scenarioLibraryId } = await context.params;
  const library = await getQaStoreBackend().getScenarioLibrary(scenarioLibraryId);

  if (!library) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "The selected scenario library was not found." } }, { status: 404 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Request body must be { action: \"rename\", name: string }, { action: \"archive\" }, or { action: \"duplicate\", name: string }." } },
      { status: 400 }
    );
  }

  if (parsed.data.action === "rename") {
    const updated = await getQaStoreBackend().renameScenarioLibrary(scenarioLibraryId, parsed.data.name);
    return NextResponse.json({ scenarioLibrary: updated });
  }

  if (parsed.data.action === "duplicate") {
    const duplicate = await getQaStoreBackend().duplicateScenarioLibrary(scenarioLibraryId, parsed.data.name);
    return NextResponse.json({ scenarioLibrary: duplicate }, { status: 201 });
  }

  const updated = await getQaStoreBackend().archiveScenarioLibrary(scenarioLibraryId);
  return NextResponse.json({ scenarioLibrary: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { scenarioLibraryId } = await context.params;
  const library = await getQaStoreBackend().getScenarioLibrary(scenarioLibraryId);

  if (!library) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "The selected scenario library was not found." } },
      { status: 404 }
    );
  }

  try {
    await getQaStoreBackend().deleteScenarioLibrary(scenarioLibraryId);
  } catch (error) {
    if (error instanceof Error && error.message === "SCENARIO_LIBRARY_IN_USE") {
      return NextResponse.json(
        { error: { code: "SCENARIO_LIBRARY_IN_USE", message: "This scenario library is referenced by a run that is currently queued or running." } },
        { status: 409 }
      );
    }
    throw error;
  }

  return new NextResponse(null, { status: 204 });
}
