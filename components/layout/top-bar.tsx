import type { ReactNode } from "react";

interface TopBarProps {
  title: string;
  badge?: string;
  searchPlaceholder?: string;
  utilities?: ReactNode;
}

export function TopBar({ title, badge, searchPlaceholder = "Search ledgers...", utilities }: TopBarProps) {
  return (
    <header className="app-top-bar">
      <div className="top-bar-title-group">
        <h2 className="top-bar-title">{title}</h2>
        {badge ? <span className="top-bar-badge">{badge}</span> : null}
      </div>

      <div className="top-bar-tools">
        <label className="top-bar-search" aria-label="Global search">
          <span className="top-bar-search-label">Search</span>
          <input type="search" placeholder={searchPlaceholder} />
        </label>
        {utilities ? <div className="top-bar-utilities">{utilities}</div> : null}
      </div>
    </header>
  );
}