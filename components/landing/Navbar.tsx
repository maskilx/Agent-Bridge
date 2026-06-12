import Link from "next/link";
import { Logo } from "@/components/ui";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "#discovery", label: "Discovery" },
  { href: "#workspaces", label: "Workspaces" },
  { href: "#trust", label: "Trust" },
  { href: "#example", label: "Example" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="text-[var(--text)]">
          <Logo />
        </Link>
        <nav className="flex items-center gap-7">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="hidden font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-2)] transition hover:text-[var(--text)] md:block"
            >
              {l.label}
            </a>
          ))}
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-full bg-[var(--text)] px-5 py-2 text-sm font-semibold text-[var(--bg)] transition hover:opacity-85"
          >
            Open demo
          </Link>
        </nav>
      </div>
    </header>
  );
}
