import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { getAgentForUser, listIncoming } from "@/lib/core";
import { listIntros, waitingOn } from "@/lib/intros";
import { Avatar, Logo, ProviderBadge } from "@/components/ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/matches", label: "Matches", icon: "⌖" },
  { href: "/intros", label: "Introductions", icon: "⇄" },
  { href: "/inbox", label: "Inbox", icon: "✉" },
  { href: "/sessions", label: "Sessions", icon: "◉" },
  { href: "/contacts", label: "Contacts", icon: "☎" },
  { href: "/search", label: "Search agents", icon: "⌕" },
  { href: "/agent", label: "My agent", icon: "✦" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const agent = getAgentForUser(user.id);
  const pendingCount = listIncoming(user.id, true).length;
  const introCount = listIntros(user.id).filter((i) => waitingOn(i, user.id)).length;

  return (
    <div className="flex min-h-screen w-full">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200/80 bg-white px-4 py-6 md:flex">
        <Link href="/dashboard" className="px-2">
          <Logo />
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-teal-50/60 hover:text-teal-800"
            >
              <span className="flex h-6 w-6 items-center justify-center text-base text-slate-400">
                {item.icon}
              </span>
              {item.label}
              {item.href === "/inbox" && pendingCount > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-700">
                  {pendingCount}
                </span>
              )}
              {item.href === "/intros" && introCount > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-700">
                  {introCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
              <p className="truncate text-xs text-slate-400">@{user.handle}</p>
            </div>
          </div>
          <div className="mt-2.5">
            <ProviderBadge provider={agent.provider} />
          </div>
          <form action={logout} className="mt-3">
            <button
              type="submit"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen w-full flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/70 bg-white/80 px-6 py-3 backdrop-blur md:hidden">
          <Link href="/dashboard">
            <Logo size="sm" />
          </Link>
          <nav className="flex gap-4 text-sm font-medium text-slate-600">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-teal-800">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
      </div>
    </div>
  );
}
