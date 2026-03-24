import type { Metadata } from "next";

import { LibraryManagementScreen } from "@/components/library/library-management-screen";
import { getQaStoreBackendKind } from "@/lib/qa/storage/backend";

export const metadata: Metadata = {
  title: "Scenario Library | QA Command Center",
  description: "Browse saved scenario libraries, inspect risk posture, and review reusable QA mission templates."
};

export default function LibraryPage() {
  return <LibraryManagementScreen storeBackendLabel={getQaStoreBackendKind()} />;
}