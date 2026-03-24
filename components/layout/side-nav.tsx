import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

export interface SideNavItem {
  id: string;
  label: string;
  eyebrow?: string;
  active?: boolean;
  disabled?: boolean;
  href?: Route;
  onClick?: () => void;
}

interface SideNavProps {
  brand: string;
  subBrand: string;
  items: SideNavItem[];
  utilityItems?: SideNavItem[];
  primaryAction?: {
    label: string;
    href?: Route;
    onClick?: () => void;
  };
  profile?: ReactNode;
}

function renderItem(item: SideNavItem) {
  const className = `side-nav-item ${item.active ? "side-nav-item-active" : ""} ${item.disabled ? "side-nav-item-disabled" : ""}`.trim();

  if (item.href && !item.disabled) {
    return (
      <Link key={item.id} className={className} href={item.href} aria-current={item.active ? "page" : undefined}>
        <span className="side-nav-item-label">{item.label}</span>
        {item.eyebrow ? <span className="side-nav-item-eyebrow">{item.eyebrow}</span> : null}
      </Link>
    );
  }

  return (
    <button
      key={item.id}
      type="button"
      className={className}
      onClick={item.onClick}
      disabled={item.disabled}
      aria-current={item.active ? "page" : undefined}
    >
      <span className="side-nav-item-label">{item.label}</span>
      {item.eyebrow ? <span className="side-nav-item-eyebrow">{item.eyebrow}</span> : null}
    </button>
  );
}

export function SideNav({ brand, subBrand, items, utilityItems = [], primaryAction, profile }: SideNavProps) {
  return (
    <aside className="app-side-nav">
      <div className="side-nav-brand-block">
        <h1 className="side-nav-brand">{brand}</h1>
        <p className="side-nav-sub-brand">{subBrand}</p>
      </div>

      <nav className="side-nav-section" aria-label="Primary navigation">
        {items.map(renderItem)}
      </nav>

      <div className="side-nav-footer">
        {primaryAction ? (
          primaryAction.href ? (
            <Link className="side-nav-primary-action" href={primaryAction.href}>
              {primaryAction.label}
            </Link>
          ) : (
            <button type="button" className="side-nav-primary-action" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </button>
          )
        ) : null}

        {!!utilityItems.length && (
          <nav className="side-nav-section side-nav-utility-section" aria-label="Utility navigation">
            {utilityItems.map(renderItem)}
          </nav>
        )}

        {profile ? <div className="side-nav-profile">{profile}</div> : null}
      </div>
    </aside>
  );
}