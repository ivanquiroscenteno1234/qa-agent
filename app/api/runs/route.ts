import { NextResponse } from "next/server";

import { formatZodError, runPlanSchema, validateRunPlanForMode } from "@/lib/qa/plan-validation";
import { createRun, listRuns } from "@/lib/qa/store";

export async function GET() {
  return NextResponse.json({ runs: await listRuns() });
}

export async function POST(request: Request) {
  const rawPayload = await request.json();
  const parsed = runPlanSchema.safeParse(rawPayload);

  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const validationError = validateRunPlanForMode(parsed.data);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  return NextResponse.json({ run: await createRun(parsed.data) }, { status: 201 });
}