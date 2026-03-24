import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <section className="page-header">
      <div>
        <p className="page-header-eyebrow">{eyebrow}</p>
        <h1 className="page-header-title">{title}</h1>
        <p className="page-header-description">{description}</p>
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </section>
  );
}