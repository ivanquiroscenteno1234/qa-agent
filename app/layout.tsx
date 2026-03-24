import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

import "@/app/globals.css";

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap"
});

const headlineFont = Archivo({
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap"
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: "QA Command Center",
  description: "A bounded QA agent dashboard for step execution, scenario generation, and evidence review."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${headlineFont.variable} ${monoFont.variable}`}>{children}</body>
    </html>
  );
}