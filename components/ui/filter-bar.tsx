import type { ReactNode } from "react";

interface FilterBarProps {
  label: string;
  children: ReactNode;
}

export function FilterBar({ label, children }: FilterBarProps) {
  return (
    <div className="filter-bar">
      <span className="filter-bar-label">{label}</span>
      <div className="filter-bar-controls">{children}</div>
    </div>
  );
}