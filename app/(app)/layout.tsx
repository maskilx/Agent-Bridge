import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { getAgentForUser, listIncoming } from "@/lib/core";
import { listIntros, waitingOn } from "@/lib/intros";
import { listMissions, missionNeedsOwner } from "@/lib/missions";
import NavLink from "@/components/NavLink";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 mt-6 px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-emerald-50/30">
      {children}
    </p>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const agent = getAgentForUser(user.id);
  const pendingCount = listIncoming(user.id, true).length;
  const introCount = listIntros(user.id).filter((i) => waitingOn(i, user.id)).length;
  const missionCount = listMissions(user.id).filter(
    (m) => missionNeedsOwner(m) && m.status !== "waiting_for_user"
  ).length;

  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen w-full">
      {/* ---- rail ---- */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[252px] flex-col bg-[#142420] px-3.5 py-5 md:flex">
        {/* soft top glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(93,167,141,0.14),transparent_70%)]"
        />

        <Link href="/dashboard" className="relative flex items-center gap-2.5 px-2 pt-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-teal-500 to-emerald-600 text-[15px] text-white shadow-[0_2px_10px_rgba(58,138,111,0.45)]">
            ✦
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[17px] font-medium tracking-tight text-white">
              AgentBridge
            </span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-50/35">
              Private alpha
            </span>
          </span>
        </Link>

        <Link
          href="/ask"
          className="relative mt-6 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5 text-[13.5px] font-medium text-white transition hover:border-white/20 hover:bg-white/[0.11]"
        >
          <span className="text-emerald-300">✳</span> Ask my agent
        </Link>

        <nav className="app-scroll relative mt-1 flex-1 overflow-y-auto pb-4">
          <SectionLabel>Workspace</SectionLabel>
          <div className="space-y-0.5">
            <NavLink href="/dashboard" icon="▦" label="Home" />
            <NavLink href="/missions" icon="◎" label="Missions" badge={missionCount} />
            <NavLink href="/intros" icon="⇄" label="Introductions" badge={introCount} />
            <NavLink href="/inbox" icon="✉" label="Inbox" badge={pendingCount} />
          </div>

          <SectionLabel>Network</SectionLabel>
          <div className="space-y-0.5">
            <NavLink href="/matches" icon="⌖" label="Matches" />
            <NavLink href="/contacts" icon="☷" label="Contacts" />
            <NavLink href="/search" icon="⌕" label="Search agents" />
          </div>

          <SectionLabel>Agent</SectionLabel>
          <div className="space-y-0.5">
            <NavLink href="/agent" icon="✦" label="My agent" />
            <NavLink href="/sessions" icon="◉" label="Conversations" />
          </div>
        </nav>

        {/* ---- user ---- */}
        <div className="relative rounded-xl border border-white/[0.07] bg-white/[0.04] p-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-xs font-semibold text-white">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-white">{user.name}</p>
              <p className="truncate text-[11px] text-emerald-50/40">{agent.display_name}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                title="Sign out"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-50/35 transition hover:bg-white/10 hover:text-white"
              >
                ⏻
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ---- main canvas ---- */}
      <div className="flex min-h-screen w-full flex-1 flex-col md:pl-[252px]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/70 bg-[#f6f4ef]/85 px-5 py-3 backdrop-blur md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-emerald-600 text-sm text-white">
              ✦
            </span>
            <span className="font-display text-[16px] font-medium tracking-tight text-slate-900">
              AgentBridge
            </span>
          </Link>
          <nav className="flex gap-4 text-[13px] font-medium text-slate-600">
            <Link href="/ask" className="hover:text-teal-800">Ask</Link>
            <Link href="/missions" className="hover:text-teal-800">Missions</Link>
            <Link href="/intros" className="hover:text-teal-800">Intros</Link>
            <Link href="/agent" className="hover:text-teal-800">Agent</Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
