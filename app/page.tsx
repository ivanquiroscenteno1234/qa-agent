import type { Metadata } from "next";
import { Suspense } from "react";

import { QaCommandCenter } from "@/components/qa-command-center";
import { getQaStoreBackendKind } from "@/lib/qa/storage/backend";

export const metadata: Metadata = {
  title: "QA Command Center",
  description: "Draft QA missions, generate scenario coverage, and prepare runs for execution."
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <QaCommandCenter initialWorkflowView="draft" storeBackendLabel={getQaStoreBackendKind()} />
    </Suspense>
  );
}