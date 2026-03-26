import { NextResponse } from "next/server";
import { z } from "zod";

import { formatZodError, isValidTargetUrl } from "@/lib/qa/plan-validation";
import { getEnvironmentLibrary, upsertEnvironmentLibrary } from "@/lib/qa/store";

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

interface RouteContext {
  params: Promise<{ environmentLibraryId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { environmentLibraryId } = await context.params;
  const existing = await getEnvironmentLibrary(environmentLibraryId);

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "The selected environment profile was not found." } },
      { status: 404 }
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = environmentLibraryInputSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  return NextResponse.json({ environmentLibrary: await upsertEnvironmentLibrary(parsed.data, environmentLibraryId) });
}