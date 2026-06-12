import { Logo } from "@/components/ui";

export function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--bg-soft)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row">
        <span className="text-[var(--text)]">
          <Logo size="sm" />
        </span>
        <nav className="flex gap-7 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-3)]">
          <a href="#discovery" className="transition hover:text-[var(--text)]">
            Discovery
          </a>
          <a href="#workspaces" className="transition hover:text-[var(--text)]">
            Workspaces
          </a>
          <a href="#trust" className="transition hover:text-[var(--text)]">
            Trust
          </a>
          <a href="#example" className="transition hover:text-[var(--text)]">
            Example
          </a>
        </nav>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-3)]">
            Any agent · Any provider · One trusted layer
          </p>
          <p className="mt-1 text-xs text-[var(--text-3)]">Private MVP demo</p>
        </div>
      </div>
    </footer>
  );
}
