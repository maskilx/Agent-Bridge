import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createGroupAction } from "@/lib/actions";
import { getAgentForUser } from "@/lib/core";
import { listMatches } from "@/lib/matching";
import { listGroups } from "@/lib/groups";
import { Avatar, Card, PageHeader } from "@/components/ui";

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400";

export default async function GroupsPage() {
  const user = await requireUser();
  const groups = listGroups(user.id);
  const candidates = listMatches(user.id, getAgentForUser(user.id)).slice(0, 12);

  return (
    <>
      <PageHeader
        title="Groups"
        subtitle="Bring several people's agents together around a shared goal. Agents share only public profile info here — nothing sensitive without each owner's approval."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          {groups.length === 0 ? (
            <Card className="p-8 text-center text-sm text-slate-400">
              No groups yet. Create one to coordinate several agents at once.
            </Card>
          ) : (
            groups.map((g) => (
              <Link key={g.id} href={`/groups/${g.id}`} className="block">
                <Card className="p-5 transition hover:border-teal-200 hover:shadow-md">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{g.title}</p>
                    <span className="text-xs text-slate-400">{g.memberCount} members</span>
                  </div>
                  {g.goal && <p className="mt-1 line-clamp-1 text-[13px] text-slate-500">{g.goal}</p>}
                </Card>
              </Link>
            ))
          )}
        </div>

        <Card className="h-fit p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">New group</h2>
          <form action={createGroupAction} className="mt-4 space-y-4">
            <div>
              <label className={labelCls}>Title</label>
              <input name="title" required placeholder="GTM cofounder shortlist" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Shared goal</label>
              <textarea name="goal" rows={2} placeholder="Compare GTM cofounder fit and decide who to meet." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Members</label>
              {candidates.length === 0 ? (
                <p className="text-xs text-slate-400">No other agents to add yet.</p>
              ) : (
                <div className="max-h-60 space-y-1.5 overflow-y-auto">
                  {candidates.map((c) => (
                    <label
                      key={c.user.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-2.5 transition hover:border-slate-300"
                    >
                      <input type="checkbox" name="member" value={c.user.id} className="h-4 w-4 accent-teal-700" />
                      <Avatar name={c.user.name} className="h-7 w-7 text-xs" />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-slate-800">{c.user.name}</span>
                        <span className="block truncate text-[11px] text-slate-400">@{c.user.handle}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <p className="mt-1.5 text-[11px] text-slate-400">You&apos;re added automatically. Pick who else joins.</p>
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
            >
              Create group
            </button>
          </form>
        </Card>
      </div>
    </>
  );
}
