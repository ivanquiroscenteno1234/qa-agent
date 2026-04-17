import { NextResponse } from "next/server";
import { z } from "zod";

import { formatZodError } from "@/lib/qa/plan-validation";
import { getQaStoreBackend } from "@/lib/qa/storage/backend";

const credentialLibraryInputSchema = z.object({
  label: z.string().trim().min(1),
  username: z.string().trim().min(1),
  password: z.string().optional(),
  secretMode: z.enum(["stored-secret", "reference-only"]),
  reference: z.string().trim().optional(),
  status: z.enum(["active", "revoked"]),
  notes: z.string()
});

interface RouteContext {
  params: Promise<{ credentialLibraryId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { credentialLibraryId } = await context.params;
  const existing = await getQaStoreBackend().getStoredCredentialLibrary(credentialLibraryId);

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "The selected credential profile was not found." } },
      { status: 404 }
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = credentialLibraryInputSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  if (parsed.data.secretMode === "stored-secret" && !parsed.data.password?.trim() && !existing.password?.trim()) {
    return NextResponse.json(
      { error: { code: "PASSWORD_REQUIRED", message: "Stored-secret credentials require a password value." } },
      { status: 400 }
    );
  }

  if (parsed.data.secretMode === "reference-only" && !parsed.data.reference?.trim()) {
    return NextResponse.json(
      { error: { code: "REFERENCE_REQUIRED", message: "Reference-only credentials require a reference handle." } },
      { status: 400 }
    );
  }

  return NextResponse.json({ credentialLibrary: await getQaStoreBackend().upsertCredentialLibrary(parsed.data, credentialLibraryId) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { credentialLibraryId } = await context.params;
  const existing = await getQaStoreBackend().getStoredCredentialLibrary(credentialLibraryId);

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "The selected credential profile was not found." } },
      { status: 404 }
    );
  }

  try {
    await getQaStoreBackend().deleteCredentialLibrary(credentialLibraryId);
  } catch (error) {
    if (error instanceof Error && error.message === "CREDENTIAL_IN_USE") {
      return NextResponse.json(
        { error: { code: "CREDENTIAL_IN_USE", message: "This credential profile is referenced by a run that is currently queued or running." } },
        { status: 409 }
      );
    }
    throw error;
  }

  return new NextResponse(null, { status: 204 });
}