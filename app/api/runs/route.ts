import { NextResponse } from "next/server";

import { formatZodError, runPlanSchema, validateRunPlanForMode } from "@/lib/qa/plan-validation";
import { createRun, listRuns } from "@/lib/qa/store";
import { sanitizeRunRecord } from "@/lib/qa/storage/shared";

export async function GET() {
  const runs = await listRuns();
  return NextResponse.json({ runs: runs.map(sanitizeRunRecord) });
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

  const plan = parsed.data;
  // Security: always strip inline credentials from the persisted plan.
  // When a saved credential profile is selected, the library record holds the secret.
  // For local exploratory checks without a profile, we must not persist the raw password.
  const persistedPlan = { ...plan, loginEmail: "", loginPassword: "" };

  const run = await createRun(persistedPlan);
  return NextResponse.json({ run: sanitizeRunRecord(run) }, { status: 201 });
}