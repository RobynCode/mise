"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/recipes", label: "Recipes", icon: "📖" },
  { href: "/plan", label: "Plan", icon: "🗓️" },
  { href: "/groceries", label: "Groceries", icon: "🧺" },
  { href: "/household", label: "Household", icon: "👥" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function AppHeader({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="brand">
            Mise<span className="brand-dot">.</span>
          </Link>
          <nav className="main-nav" aria-label="Primary">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} aria-current={isActive(pathname, l.href) ? "page" : undefined}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <ThemeToggle />
            <Link href="/settings" className="btn btn-ghost btn-icon" aria-label="Settings" title={`Settings — signed in as ${userName}`}>
              <span aria-hidden="true" style={{ fontSize: "1.1rem" }}>⚙️</span>
            </Link>
          </div>
        </div>
      </header>

      <nav className="mobile-nav" aria-label="Primary mobile">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={isActive(pathname, l.href) ? "page" : undefined}>
            <span aria-hidden="true" style={{ fontSize: "1.15rem" }}>{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
