import { NextResponse } from "next/server";
import { z } from "zod";

import { listScenarioLibraries, upsertScenarioLibraryFromRun } from "@/lib/qa/store";
import { formatZodError, runPlanSchema } from "@/lib/qa/plan-validation";

const scenarioLibraryMutationSchema = z.object({
  action: z.enum(["create", "update"]),
  plan: runPlanSchema,
  generated: z.object({
    scenarios: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        priority: z.enum(["P0", "P1", "P2"]),
        type: z.enum(["happy-path", "negative", "boundary", "permissions", "state-transition", "regression", "exploratory"]),
        prerequisites: z.array(z.string()),
        steps: z.array(z.string()),
        expectedResult: z.string(),
        riskRationale: z.string(),
        approvedForAutomation: z.boolean()
      })
    ),
    coverageGaps: z.array(z.string()),
    riskSummary: z.array(z.string())
  }),
  sourceRunId: z.string().optional(),
  scenarioLibraryId: z.string().optional(),
  name: z.string().optional()
});

export async function GET() {
  return NextResponse.json({ scenarioLibraries: await listScenarioLibraries() });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = scenarioLibraryMutationSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const { action, plan, generated, sourceRunId, scenarioLibraryId, name } = parsed.data;

  if (!generated.scenarios.length) {
    return NextResponse.json(
      {
        error: {
          code: "SCENARIOS_REQUIRED",
          message: "At least one scenario is required to save a scenario library.",
          details: ["Generate scenarios or select an existing scenario set before saving a library."]
        }
      },
      { status: 400 }
    );
  }

  if (action === "update" && !(scenarioLibraryId ?? "").trim()) {
    return NextResponse.json(
      {
        error: {
          code: "SCENARIO_LIBRARY_ID_REQUIRED",
          message: "Update requires a target scenario library.",
          details: ["Select a saved scenario library before attempting an update."]
        }
      },
      { status: 400 }
    );
  }

  const scenarioLibrary = await upsertScenarioLibraryFromRun(
    plan,
    generated,
    sourceRunId,
    action === "update" ? scenarioLibraryId : undefined,
    name
  );

  return NextResponse.json({ scenarioLibrary });
}