import type { Metadata } from "next";

import { EnterpriseGridFixture } from "@/components/benchmark/enterprise-grid-fixture";

export const metadata: Metadata = {
  title: "Enterprise Grid Fixture | QA Command Center",
  description: "Local Tier B benchmark fixture with dense tables, filters, and visible row actions."
};

export default function Page() {
  return <EnterpriseGridFixture />;
}