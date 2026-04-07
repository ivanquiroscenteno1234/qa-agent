import { NextResponse } from "next/server";
import { z } from "zod";

import { formatZodError, isValidTargetUrl } from "@/lib/qa/plan-validation";
import { deleteEnvironmentLibrary, getEnvironmentLibrary, upsertEnvironmentLibrary } from "@/lib/qa/store";

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

export async function DELETE(_request: Request, context: RouteContext) {
  const { environmentLibraryId } = await context.params;
  const existing = await getEnvironmentLibrary(environmentLibraryId);

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "The selected environment profile was not found." } },
      { status: 404 }
    );
  }

  try {
    await deleteEnvironmentLibrary(environmentLibraryId);
  } catch (error) {
    if (error instanceof Error && error.message === "ENVIRONMENT_IN_USE") {
      return NextResponse.json(
        { error: { code: "ENVIRONMENT_IN_USE", message: "This environment profile is referenced by a run that is currently queued or running." } },
        { status: 409 }
      );
    }
    throw error;
  }

  return new NextResponse(null, { status: 204 });
}