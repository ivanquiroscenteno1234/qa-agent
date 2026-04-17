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

export async function GET() {
  return NextResponse.json({ credentialLibraries: await getQaStoreBackend().listCredentialLibraries() });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = credentialLibraryInputSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  if (parsed.data.secretMode === "stored-secret" && !parsed.data.password?.trim()) {
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

  return NextResponse.json({ credentialLibrary: await getQaStoreBackend().upsertCredentialLibrary(parsed.data) }, { status: 201 });
}