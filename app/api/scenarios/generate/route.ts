import { NextResponse } from "next/server";

import { formatZodError, runPlanSchema, validateRunPlanForMode } from "@/lib/qa/plan-validation";
import { generateScenarios } from "@/lib/qa/scenario-generator";

export async function POST(request: Request) {
  const rawPayload = await request.json();
  const parsed = runPlanSchema.safeParse(rawPayload);

  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const validationError = validateRunPlanForMode(parsed.data);
  if (validationError && parsed.data.mode !== "exploratory-session") {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  return NextResponse.json(generateScenarios(parsed.data));
}