import { NextResponse } from "next/server";
import { z } from "zod";

import { parsePlainTextSteps } from "@/lib/qa/step-parser";

const requestSchema = z.object({
  stepsText: z.string().min(1)
});

export async function POST(request: Request) {
  const payload = requestSchema.parse(await request.json());
  return NextResponse.json(await parsePlainTextSteps(payload.stepsText));
}