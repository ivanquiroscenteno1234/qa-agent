import type { Route } from "next";
import type { ReactNode } from "react";

import { SideNav, type SideNavItem } from "@/components/layout/side-nav";
import { TopBar } from "@/components/layout/top-bar";

interface AppShellProps {
  navItems: SideNavItem[];
  utilityNavItems?: SideNavItem[];
  primaryAction?: {
    label: string;
    href?: Route;
    onClick?: () => void;
  };
  profile?: ReactNode;
  topBarTitle: string;
  topBarBadge?: string;
  topBarUtilities?: ReactNode;
  searchPlaceholder?: string;
  children: ReactNode;
}

export function AppShell({
  navItems,
  utilityNavItems,
  primaryAction,
  profile,
  topBarTitle,
  topBarBadge,
  topBarUtilities,
  searchPlaceholder,
  children
}: AppShellProps) {
  return (
    <div className="app-shell">
      <SideNav
        brand="Forensic Ledger"
        subBrand="QA Command Center"
        items={navItems}
        utilityItems={utilityNavItems}
        primaryAction={primaryAction}
        profile={profile}
      />
      <div className="app-main">
        <TopBar
          title={topBarTitle}
          badge={topBarBadge}
          searchPlaceholder={searchPlaceholder}
          utilities={topBarUtilities}
        />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}