import type { Metadata } from "next";

import { ModalWorkflowFixture } from "@/components/benchmark/modal-workflow-fixture";

export const metadata: Metadata = {
  title: "Modal Workflow Fixture | QA Command Center",
  description: "Local Tier B benchmark fixture for modal-driven confirmation workflows."
};

export default function Page() {
  return <ModalWorkflowFixture />;
}