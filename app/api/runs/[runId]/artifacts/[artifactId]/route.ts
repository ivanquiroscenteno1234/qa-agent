import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getQaStoreBackend } from "@/lib/qa/storage/backend";

function sanitizeFilename(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "artifact";
}

export async function GET(_request: Request, context: { params: Promise<{ runId: string; artifactId: string }> }) {
  const { runId, artifactId } = await context.params;
  const requestUrl = new URL(_request.url);
  const shouldDownload = requestUrl.searchParams.get("download") === "1";
  const run = await getQaStoreBackend().getRun(runId);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const artifact = await getQaStoreBackend().getRunArtifact(runId, artifactId);

  if (!artifact) {
    return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
  }

  if (artifact.type === "crawl") {
    return new NextResponse(artifact.content, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="${sanitizeFilename(artifact.label)}.json"`
      }
    });
  }

  if (artifact.type === "report") {
    const extension = artifact.label === "Manual Test Plan" ? "md" : "txt";
    const contentType = artifact.label === "Manual Test Plan" ? "text/markdown; charset=utf-8" : "text/plain; charset=utf-8";

    return new NextResponse(artifact.content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="${sanitizeFilename(artifact.label)}.${extension}"`
      }
    });
  }

  const artifactDirectory = path.join(process.cwd(), ".data", "artifacts");
  const absolutePath = path.resolve(artifact.content);

  // 🛡️ Sentinel: Prevent Path Traversal attacks by verifying the resolved
  // absolute path falls strictly within the designated artifact directory.
  // Using path.sep prevents prefix bypasses (e.g. `.data/artifacts_secret`).
  if (!absolutePath.startsWith(artifactDirectory + path.sep)) {
    return NextResponse.json({ error: "Forbidden: Invalid artifact path" }, { status: 403 });
  }

  const fileBuffer = await readFile(absolutePath);
  const extension = path.extname(absolutePath).toLowerCase();
  const contentType =
    extension === ".png"
      ? "image/png"
      : extension === ".zip"
        ? "application/zip"
        : "application/octet-stream";

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="${path.basename(artifact.content)}"`
    }
  });
}