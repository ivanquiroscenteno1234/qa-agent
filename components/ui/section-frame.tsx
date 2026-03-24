import type { ReactNode } from "react";

interface SectionFrameProps {
  eyebrow: string;
  title: string;
  reference?: string;
  children: ReactNode;
}

export function SectionFrame({ eyebrow, title, reference, children }: SectionFrameProps) {
  return (
    <section className="section-frame">
      <div className="section-frame-header">
        <div>
          <p className="section-frame-eyebrow">{eyebrow}</p>
          <h2 className="section-frame-title">{title}</h2>
        </div>
        {reference ? <span className="section-frame-reference">{reference}</span> : null}
      </div>
      <div className="section-frame-body">{children}</div>
    </section>
  );
}