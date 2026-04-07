import { NextResponse } from "next/server";

import { formatZodError, runPlanSchema, validateScenarioGenerationPlan } from "@/lib/qa/plan-validation";
import { generateScenariosWithLlm } from "@/lib/qa/scenario-generator";

export async function POST(request: Request) {
  const rawPayload = await request.json();
  const parsed = runPlanSchema.safeParse(rawPayload);

  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const validationError = validateScenarioGenerationPlan(parsed.data);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  return NextResponse.json(await generateScenariosWithLlm(parsed.data));
}