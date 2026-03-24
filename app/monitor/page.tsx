import type { Metadata } from "next";

import { QaCommandCenter } from "@/components/qa-command-center";
import { getQaStoreBackendKind } from "@/lib/qa/storage/backend";

export const metadata: Metadata = {
  title: "Monitor | QA Command Center",
  description: "Track live QA mission execution, queue state, and runtime console events."
};

export default function MonitorPage() {
  return <QaCommandCenter initialWorkflowView="monitor" storeBackendLabel={getQaStoreBackendKind()} />;
}