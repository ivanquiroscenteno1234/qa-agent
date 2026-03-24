import type { Metadata } from "next";

import { QaCommandCenter } from "@/components/qa-command-center";
import { getQaStoreBackendKind } from "@/lib/qa/storage/backend";

export const metadata: Metadata = {
  title: "Review | QA Command Center",
  description: "Inspect completed QA runs, evidence, artifacts, and baseline comparisons."
};

export default function ReviewPage() {
  return <QaCommandCenter initialWorkflowView="review" storeBackendLabel={getQaStoreBackendKind()} />;
}