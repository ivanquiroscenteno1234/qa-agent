import { NextResponse } from "next/server";
import { z } from "zod";

import { parseStepsWithLlm } from "@/lib/qa/step-parser";

const requestSchema = z.object({
  stepsText: z.string().min(1),
  context: z.string().optional()
});

export async function POST(request: Request) {
  const payload = requestSchema.parse(await request.json());
  return NextResponse.json(await parseStepsWithLlm(payload.stepsText, payload.context));
}