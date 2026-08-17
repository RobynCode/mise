"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, BookOpen, CalendarDays, ShoppingBasket, Users, Settings } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/recipes", label: "Recipes", Icon: BookOpen },
  { href: "/plan", label: "Plan", Icon: CalendarDays },
  { href: "/groceries", label: "Groceries", Icon: ShoppingBasket },
  { href: "/household", label: "Household", Icon: Users },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function AppHeader({ userName }: { userName: string }) {
  const pathname = usePathname();
  const isGuest = userName === "Guest";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className="site-header" data-scrolled={scrolled}>
        <div className="site-header-inner">
          <Link href="/" className="brand">
            Mise<span className="brand-dot">.</span>
            {isGuest && <span className="badge" style={{ marginLeft: 8, fontSize: "0.7rem" }}>Demo</span>}
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
              <Settings size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <nav className="mobile-nav" aria-label="Primary mobile">
        {LINKS.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
              <span className="nav-icon-chip">
                <l.Icon size={20} strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
              </span>
              {l.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

