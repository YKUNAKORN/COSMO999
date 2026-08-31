"use client";

// Primary navigation. One component, two shapes: a fixed bottom tab bar on
// phones and a sticky left sidebar from the md breakpoint up. The active route
// is derived from usePathname and marked with the gold accent.
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartColumnBig,
  History,
  Spade,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "เล่น", icon: Spade },
  { href: "/leaderboard", label: "อันดับ", icon: Trophy },
  { href: "/history", label: "ประวัติ", icon: History },
  { href: "/groups", label: "ขาประจำ", icon: Users },
  { href: "/stats", label: "สถิติ", icon: ChartColumnBig },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:sticky md:inset-x-auto md:bottom-auto md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-t-0 md:border-r md:bg-surface/40 md:backdrop-blur-none"
    >
      <ul className="flex items-stretch justify-around px-1 py-1 [padding-bottom:max(0.25rem,env(safe-area-inset-bottom))] md:h-full md:flex-col md:justify-start md:gap-1 md:px-3 md:py-6">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="md:w-full">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex flex-col items-center gap-1 rounded-md px-2 py-2 text-xs font-medium transition-colors md:flex-row md:gap-3 md:border-l-2 md:px-3 md:py-2.5 md:text-sm ${
                  active
                    ? "text-accent md:border-accent md:bg-surface-raised"
                    : "text-text-muted hover:text-text md:border-transparent md:hover:bg-surface-raised/60"
                } ${
                  active
                    ? "after:absolute after:inset-x-3 after:top-0 after:h-0.5 after:rounded-full after:bg-accent md:after:hidden"
                    : ""
                }`}
              >
                <Icon className="size-5 transition-transform group-active:scale-90" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
