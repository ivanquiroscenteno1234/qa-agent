import { FilterBar } from "@/components/ui/filter-bar";

interface ScenarioLibraryFilterBarProps {
  featureArea: string;
  riskProfile: string;
  author: string;
  featureAreaOptions: string[];
  riskOptions: string[];
  onFeatureAreaChange: (value: string) => void;
  onRiskProfileChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
}

export function ScenarioLibraryFilterBar({
  featureArea,
  riskProfile,
  author,
  featureAreaOptions,
  riskOptions,
  onFeatureAreaChange,
  onRiskProfileChange,
  onAuthorChange
}: ScenarioLibraryFilterBarProps) {
  return (
    <FilterBar label="Filter Evidence">
      <label>
        <span className="filter-select-label">Feature Area</span>
        <select value={featureArea} onChange={(event) => onFeatureAreaChange(event.target.value)}>
          <option value="all">All feature areas</option>
          {featureAreaOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="filter-select-label">Risk Profile</span>
        <select value={riskProfile} onChange={(event) => onRiskProfileChange(event.target.value)}>
          <option value="all">All risk levels</option>
          {riskOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="filter-select-label">Author</span>
        <select value={author} onChange={(event) => onAuthorChange(event.target.value)} disabled>
          <option value="future">Author metadata pending</option>
        </select>
      </label>
    </FilterBar>
  );
}