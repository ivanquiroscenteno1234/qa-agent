import type { Metadata } from "next";

import { StateTransitionFixture } from "@/components/benchmark/state-transition-fixture";

export const metadata: Metadata = {
  title: "State Transition Fixture | QA Command Center",
  description: "Local Tier B benchmark fixture for visible multi-step workflow state transitions."
};

export default function Page() {
  return <StateTransitionFixture />;
}