import { NextResponse } from "next/server";

import { formatZodError, runPlanSchema, validateRunPlanForMode } from "@/lib/qa/plan-validation";
import { getQaStoreBackend } from "@/lib/qa/storage/backend";
import { protectCredentialSecret } from "@/lib/qa/credential-secret";
import { sanitizeRunRecord } from "@/lib/qa/storage/shared";

export async function GET() {
  const runs = await getQaStoreBackend().listRuns();
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
  // Security: strip inline credentials from the persisted plan when a saved
  // credential profile is selected — the library record holds the secret.
  // Otherwise, ensure the inline password is encrypted before storage.
  const persistedPlan = plan.credentialLibraryId
    ? { ...plan, loginEmail: "", loginPassword: "" }
    : { ...plan, loginPassword: protectCredentialSecret(plan.loginPassword) ?? "" };

  const run = await getQaStoreBackend().createRun(persistedPlan);
  return NextResponse.json({ run: sanitizeRunRecord(run) }, { status: 201 });
}