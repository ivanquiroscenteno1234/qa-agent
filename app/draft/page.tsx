import type { Metadata } from "next";
import { Suspense } from "react";

import { QaCommandCenter } from "@/components/qa-command-center";

export const metadata: Metadata = {
  title: "Draft | QA Command Center",
  description: "Configure mission parameters, parse steps, and generate QA scenario coverage."
};

export default function DraftPage() {
  return (
    <Suspense fallback={null}>
      <QaCommandCenter initialWorkflowView="draft" />
    </Suspense>
  );
}