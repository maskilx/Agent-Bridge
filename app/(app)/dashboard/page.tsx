import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAgentForUser, listIncoming } from "@/lib/core";
import { listIntros, waitingOn } from "@/lib/intros";
import { listMissions, missionNeedsOwner } from "@/lib/missions";
import { MISSION_STATUS } from "@/components/mission-status";
import { INTRO_STATUS } from "@/components/intro-status";
import { Avatar, formatTime } from "@/components/ui";

function WaitRow({
  href,
  icon,
  avatar,
  text,
  cta,
}: {
  href: string;
  icon?: string;
  avatar?: string;
  text: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/50 px-4 py-3 transition hover:border-amber-300 hover:bg-amber-50/80"
    >
      {avatar ? (
        <Avatar name={avatar} className="h-7 w-7 text-xs" />
      ) : (
        <span className="text-base">{icon}</span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{text}</span>
      <span className="shrink-0 rounded-full bg-teal-700 px-3 py-1 text-xs font-semibold text-white">{cta} →</span>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user.onboarded) redirect("/agent?setup=1");
  const agent = getAgentForUser(user.id);
  const missions = listMissions(user.id);
  const intros = listIntros(user.id);

  const missionsNeedingMe = missions.filter((m) => missionNeedsOwner(m) && m.status !== "waiting_for_user");
  const introsNeedingMe = intros.filter((i) => waitingOn(i, user.id));
  const pendingRequests = listIncoming(user.id, true);
  const waitingCount = missionsNeedingMe.length + introsNeedingMe.length + pendingRequests.length;
  const profileReady = Boolean(agent.looking_for.trim() || agent.goals.trim());
  const firstName = user.name.split(" ")[0];

  // One calm, merged activity feed instead of two parallel lists.
  const recent = [
    ...missions.map((m) => ({
      key: `m-${m.id}`,
      href: `/missions/${m.id}`,
      title: m.title,
      label: MISSION_STATUS[m.status].label,
      cls: MISSION_STATUS[m.status].cls,
      when: m.updated_at,
      avatar: undefined as string | undefined,
    })),
    ...intros.map((i) => {
      const other = i.initiator_user_id === user.id ? i.target_name : i.initiator_name;
      return {
        key: `i-${i.id}`,
        href: `/intros/${i.id}`,
        title: `Introduction with ${other}`,
        label: INTRO_STATUS[i.status].label,
        cls: INTRO_STATUS[i.status].cls,
        when: i.updated_at,
        avatar: other as string | undefined,
      };
    }),
  ]
    .sort((a, b) => b.when.localeCompare(a.when))
    .slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Greeting + composer */}
      <h1 className="font-display text-[27px] font-medium leading-tight tracking-tight text-slate-900">
        What can your agent do for you, {firstName}?
      </h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">
        It drafts the plan and shows you the exact message — nothing is sent until you approve.
      </p>

      <form
        action="/ask"
        method="GET"
        className="composer-glow mt-5 rounded-[22px] bg-white p-1.5 shadow-[0_2px_8px_rgba(29,27,23,0.05),0_20px_50px_-24px_rgba(29,27,23,0.18)]"
      >
        <textarea
          name="q"
          rows={2}
          required
          placeholder="Find me a technical cofounder · Screen 5 design partners · Compare a few vendors — don't share my numbers"
          className="max-h-44 min-h-[60px] w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        <div className="flex items-center justify-between gap-3 px-3 pb-1.5">
          <span className="text-[11.5px] text-slate-400">Your agent replies in chat with a draft to approve.</span>
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-teal-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
          >
            Ask my agent →
          </button>
        </div>
      </form>

      {!profileReady && (
        <Link
          href="/agent"
          className="mt-3 flex items-center gap-2.5 rounded-2xl border border-slate-200/70 bg-white/60 px-4 py-2.5 text-[13px] text-slate-600 backdrop-blur-sm transition hover:border-teal-200 hover:text-slate-800"
        >
          <span>✦</span>
          <span className="flex-1">Tell your agent what you&apos;re looking for so it knows what to pursue.</span>
          <span className="text-xs font-medium text-teal-700">Set up →</span>
        </Link>
      )}

      {/* Waiting for you */}
      {waitingCount > 0 && (
        <section className="mt-9">
          <h2 className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
            Waiting for you · {waitingCount}
          </h2>
          <div className="space-y-2">
            {missionsNeedingMe.map((m) => (
              <WaitRow key={m.id} href={`/missions/${m.id}`} icon="🎯" text={`Mission draft — ${m.title}`} cta="Review" />
            ))}
            {introsNeedingMe.map((i) => {
              const other = i.initiator_user_id === user.id ? i.target_name : i.initiator_name;
              return <WaitRow key={i.id} href={`/intros/${i.id}`} avatar={other} text={`Introduction with ${other}`} cta="Decide" />;
            })}
            {pendingRequests.slice(0, 3).map((r) => (
              <WaitRow key={r.id} href={`/requests/${r.id}`} icon="✉️" text={`${r.from_user_name}: ${r.message}`} cta="Reply" />
            ))}
          </div>
        </section>
      )}

      {/* Recent */}
      <section className="mt-9">
        <div className="mb-2.5 flex items-center justify-between px-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Recent activity</h2>
          {recent.length > 0 && (
            <Link href="/missions" className="text-xs font-medium text-teal-700 hover:text-teal-900">
              All →
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="rounded-2xl border border-slate-200/70 bg-white/60 px-4 py-7 text-center text-sm text-slate-400 backdrop-blur-sm">
            No activity yet — ask your agent something above.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-sm">
            {recent.map((r) => (
              <Link
                key={r.key}
                href={r.href}
                className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 transition last:border-0 hover:bg-slate-50/70"
              >
                {r.avatar ? (
                  <Avatar name={r.avatar} className="h-7 w-7 text-xs" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-sm">🎯</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">{r.title}</span>
                  <span className="text-[11px] text-slate-400">{formatTime(r.when)}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${r.cls}`}>{r.label}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Agent — quiet status line, not a dashboard card */}
      <div className="mt-9 flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/60 px-4 py-3 backdrop-blur-sm">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3a8a6f] text-xs font-semibold text-white">
          {agent.display_name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-800">{agent.display_name}</span>
          <span className="text-[11.5px] text-slate-400">Represents you · shares only what you allow</span>
        </span>
        <Link href="/agent" className="shrink-0 text-xs font-medium text-teal-700 hover:text-teal-900">
          Configure →
        </Link>
      </div>
    </div>
  );
}
