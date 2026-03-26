import { NextResponse } from "next/server";
import { z } from "zod";

import { formatZodError, isValidTargetUrl } from "@/lib/qa/plan-validation";
import { listEnvironmentLibraries, upsertEnvironmentLibrary } from "@/lib/qa/store";

const environmentLibraryInputSchema = z.object({
  name: z.string().trim().min(1),
  targetUrl: z.string().trim().min(1).refine(isValidTargetUrl, {
    message: "Target URL must be a valid http:// or https:// address."
  }),
  environment: z.string(),
  role: z.string(),
  browser: z.string(),
  device: z.string(),
  safeMode: z.boolean(),
  riskLevel: z.enum(["low", "moderate", "high"]),
  defaultCredentialId: z.string().trim().optional(),
  notes: z.string()
});

export async function GET() {
  return NextResponse.json({ environmentLibraries: await listEnvironmentLibraries() });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = environmentLibraryInputSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  return NextResponse.json({ environmentLibrary: await upsertEnvironmentLibrary(parsed.data) }, { status: 201 });
}