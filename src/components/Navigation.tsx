"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/session", label: "AI Session" },
  { href: "/progress", label: "Progress" },
  { href: "/exercises", label: "Exercises" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 glass border-b border-card-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:shadow-md transition-shadow">
              RL
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="text-primary">Rehab</span>
              <span className="text-foreground">Lens</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted hover:text-foreground hover:bg-foreground/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/session"
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse-soft" />
              Start AI Session
            </Link>

            {/* Mobile menu */}
            <div className="md:hidden flex items-center gap-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`p-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {item.label === "Home"
                      ? "🏠"
                      : item.label === "AI Session"
                        ? "🎥"
                        : item.label === "Progress"
                          ? "📊"
                          : "📚"}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
