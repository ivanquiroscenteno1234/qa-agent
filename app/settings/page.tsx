import type { Metadata } from "next";

import { SettingsScreen } from "@/components/settings/settings-screen";
import { getQaStoreBackendKind } from "@/lib/qa/storage/backend";

export const metadata: Metadata = {
  title: "Settings | QA Command Center",
  description: "Inspect local-file storage posture, inferred environments, and credential handling constraints."
};

export default async function SettingsPage() {
  return <SettingsScreen storeBackendLabel={getQaStoreBackendKind()} />;
}