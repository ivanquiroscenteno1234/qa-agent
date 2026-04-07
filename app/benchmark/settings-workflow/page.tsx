import type { Metadata } from "next";

import { SettingsWorkflowFixture } from "@/components/benchmark/settings-workflow-fixture";

export const metadata: Metadata = {
  title: "Settings Workflow Fixture | QA Command Center",
  description: "Local Tier A benchmark fixture for mixed navigation and editable settings workflows."
};

export default function Page() {
  return <SettingsWorkflowFixture />;
}