import type { ReactNode } from "react";

interface StatusBadgeProps {
  tone?: "default" | "running" | "warning" | "success" | "danger" | "muted";
  children: ReactNode;
}

export function StatusBadge({ tone = "default", children }: StatusBadgeProps) {
  return <span className={`status-badge status-badge-${tone}`}>{children}</span>;
}