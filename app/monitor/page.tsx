import type { Metadata } from "next";
import { Suspense } from "react";

import { QaCommandCenter } from "@/components/qa-command-center";
import { getQaStoreBackendKind } from "@/lib/qa/storage/backend";

export const metadata: Metadata = {
  title: "Monitor | QA Command Center",
  description: "Track live QA mission execution, queue state, and runtime console events."
};

export default function MonitorPage() {
  return (
    <Suspense fallback={null}>
      <QaCommandCenter initialWorkflowView="monitor" storeBackendLabel={getQaStoreBackendKind()} />
    </Suspense>
  );
}