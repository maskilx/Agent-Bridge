import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAgentForUser, listIncoming } from "@/lib/core";
import { listIntros, waitingOn } from "@/lib/intros";
import { listMissions, missionNeedsOwner } from "@/lib/missions";
import NavLink from "@/components/NavLink";
import {
  BrandTile,
  BridgeGlyph,
  IconAgent,
  IconContacts,
  IconHome,
  IconInbox,
  IconIntro,
  IconMatches,
  IconMission,
  IconSearch,
  IconSessions,
  IconSettings,
} from "@/components/icons";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">
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
    <div className="app-shell flex min-h-screen w-full bg-background text-foreground">
      {/* ---- rail ---- */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col bg-[#11201c] px-3 pb-3 pt-5 md:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(130%_100%_at_50%_0%,rgba(127,209,176,0.13),transparent_70%)]"
        />

        <Link href="/dashboard" className="relative flex items-center gap-2.5 px-2.5">
          <BrandTile size={30} />
          <span className="font-display text-[16.5px] font-medium tracking-tight text-white">
            AgentBridge
          </span>
          <span className="ml-auto rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/40">
            Alpha
          </span>
        </Link>

        <Link
          href="/ask"
          className="relative mt-5 flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.06] px-3.5 py-2.5 text-[13.5px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-white/[0.16] hover:bg-white/[0.1]"
        >
          <BridgeGlyph size={17} className="text-[#bfe6d6]" />
          Ask your agent
          <span className="ml-auto text-[10px] text-white/30">⏎</span>
        </Link>

        <nav className="app-scroll relative flex-1 overflow-y-auto pb-3">
          <SectionLabel>Workspace</SectionLabel>
          <div className="space-y-px">
            <NavLink href="/dashboard" icon={<IconHome />} label="Home" />
            <NavLink href="/missions" icon={<IconMission />} label="Missions" badge={missionCount} />
            <NavLink href="/intros" icon={<IconIntro />} label="Introductions" badge={introCount} />
            <NavLink href="/inbox" icon={<IconInbox />} label="Inbox" badge={pendingCount} />
          </div>

          <SectionLabel>Network</SectionLabel>
          <div className="space-y-px">
            <NavLink href="/matches" icon={<IconMatches />} label="Discover" />
            <NavLink href="/groups" icon={<IconContacts />} label="Groups" />
            <NavLink href="/contacts" icon={<IconContacts />} label="Contacts" />
            <NavLink href="/search" icon={<IconSearch />} label="Search agents" />
          </div>
        </nav>

        {/* ---- bottom cluster ---- */}
        <div className="relative space-y-px border-t border-white/[0.07] pt-2.5">
          <NavLink href="/agent" icon={<IconAgent />} label="My agent" />
          <NavLink href="/sessions" icon={<IconSessions />} label="Conversations" />
          <NavLink href="/settings" icon={<IconSettings />} label="Settings" />
          <Link
            href="/settings"
            className="mt-2 flex items-center gap-2.5 rounded-xl px-3 py-2 transition hover:bg-white/[0.05]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#3a8a6f] text-[11px] font-semibold text-white">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium text-white">{user.name}</span>
              <span className="block truncate text-[10.5px] text-white/35">{agent.display_name}</span>
            </span>
          </Link>
        </div>
      </aside>

      {/* ---- main canvas ---- */}
      <div className="flex min-h-screen w-full flex-1 flex-col md:pl-[248px]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/70 bg-background/85 px-5 py-3 backdrop-blur md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BrandTile size={26} />
            <span className="font-display text-[15px] font-medium tracking-tight text-slate-900">
              AgentBridge
            </span>
          </Link>
          <nav className="flex gap-4 text-[13px] font-medium text-slate-600">
            <Link href="/ask" className="hover:text-teal-700">Ask</Link>
            <Link href="/missions" className="hover:text-teal-700">Missions</Link>
            <Link href="/intros" className="hover:text-teal-700">Intros</Link>
            <Link href="/settings" className="hover:text-teal-700">Settings</Link>
          </nav>
        </header>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
