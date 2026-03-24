import type { AnalysisEvidenceReference } from "@/lib/types";

interface EvidenceTagListProps {
  evidence: AnalysisEvidenceReference[];
}

export function EvidenceTagList({ evidence }: EvidenceTagListProps) {
  if (!evidence.length) {
    return null;
  }

  return (
    <div className="comparison-tags evidence-tags">
      {evidence.map((reference) => (
        <span key={`${reference.type}-${reference.label}`}>
          {reference.type}: {reference.label}
        </span>
      ))}
    </div>
  );
}