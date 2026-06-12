import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  approveMissionAction,
  cancelMissionAction,
  completeMissionAction,
  requestIntroAction,
  updateMissionDraftAction,
} from "@/lib/actions";
import { getMissionView, missionMatches, namedUsers, type MissionView } from "@/lib/missions";
import { RELEVANCE_THRESHOLD } from "@/lib/matching";
import { MISSION_STATUS } from "@/components/mission-status";
import { INTRO_STATUS } from "@/components/intro-status";
import { Avatar, Card, PageHeader, formatTime } from "@/components/ui";

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400";

const SOURCE_LABEL: Record<MissionView["draft_source"], string> = {
  rules: "drafted by built-in rules",
  anthropic: "drafted with Claude",
  openai: "drafted with OpenAI",
};

function ShareRules({ mission }: { mission: MissionView }) {
  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-slate-900">Boundaries for this mission</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">May share</p>
          <p className="mt-0.5 text-slate-600">{mission.allowed_to_share || "Nothing beyond the public profile."}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Must not share</p>
          <p className="mt-0.5 text-slate-600">{mission.must_not_share || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Needs your approval</p>
          <p className="mt-0.5 text-slate-600">{mission.approval_policy}</p>
        </div>
      </div>
    </Card>
  );
}

export default async function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  let mission: MissionView;
  try {
    mission = getMissionView(user.id, id);
  } catch {
    notFound();
  }

  const status = MISSION_STATUS[mission.status];
  const isDraft = ["draft", "awaiting_user_approval"].includes(mission.status);
  const isActive = ["approved", "running", "waiting_for_external_agent", "waiting_for_user"].includes(
    mission.status
  );
  const named = namedUsers(mission.target_agent_ids);
  const namedIds = new Set(named.map((u) => u.id));
  const recommendedIds = new Set(namedUsers(mission.recommended_agent_ids).map((u) => u.id));
  const matches = isDraft || isActive ? missionMatches(user.id, mission.id) : [];
  const contacted = new Set(mission.intros.map((i) => i.target_user_id));

  // Pre-check named targets, drafter recommendations, then top scorers (max 3 pre-checked).
  const precheck = new Set<string>();
  for (const m of matches) {
    if (m.named || recommendedIds.has(m.user.id)) precheck.add(m.user.id);
  }
  for (const m of matches) {
    if (precheck.size >= 3) break;
    if (m.score >= RELEVANCE_THRESHOLD) precheck.add(m.user.id);
  }

  return (
    <>
      <PageHeader
        title={mission.title}
        subtitle={`“${mission.user_request}” · ${SOURCE_LABEL[mission.draft_source]}`}
        action={
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.cls}`}>{status.label}</span>
        }
      />

      {isDraft && (
        <Card className="mb-6 border-amber-300 bg-amber-50/40 p-5">
          <p className="text-sm leading-relaxed text-slate-700">
            <span className="font-semibold">This is a mission draft — nothing has happened yet.</span>{" "}
            Review what your agent plans to pursue, what it may share, and who it may contact. It only
            acts after you approve.
          </p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {isDraft ? (
            <>
              {/* Editable draft */}
              <Card className="p-6">
                <h2 className="text-sm font-semibold text-slate-900">The mission, as your agent understood it</h2>
                <p className="mt-1 text-xs text-slate-400">Edit anything before approving — these are the agent&apos;s marching orders.</p>
                <form action={updateMissionDraftAction} className="mt-4 space-y-4">
                  <input type="hidden" name="missionId" value={mission.id} />
                  <div>
                    <label className={labelCls}>Title</label>
                    <input name="title" defaultValue={mission.title} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Goal</label>
                    <textarea name="goal" rows={2} defaultValue={mission.goal} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Context the agent may give</label>
                    <textarea name="context" rows={2} defaultValue={mission.context} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Who to look for / contact</label>
                    <textarea name="target_criteria" rows={2} defaultValue={mission.target_criteria} className={inputCls} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>May share (this mission)</label>
                      <textarea name="allowed_to_share" rows={3} defaultValue={mission.allowed_to_share} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Must not share (this mission)</label>
                      <textarea name="must_not_share" rows={3} defaultValue={mission.must_not_share} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>When to ask your approval</label>
                    <textarea name="approval_policy" rows={2} defaultValue={mission.approval_policy} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>What the agent should bring back</label>
                    <textarea name="expected_output" rows={2} defaultValue={mission.expected_output} className={inputCls} />
                  </div>
                  <button
                    type="submit"
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-800"
                  >
                    Save edits
                  </button>
                </form>
              </Card>

              {/* Approval: pick targets and launch */}
              <Card className="border-teal-200 p-6 shadow-md shadow-teal-100/50">
                <h2 className="text-sm font-semibold text-slate-900">Who may your agent contact?</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Approving launches outreach to the checked people only (max 5). Each one still goes
                  through relevance checks, reports, and your approval before anything sensitive is shared.
                </p>
                <form action={approveMissionAction} className="mt-4">
                  <input type="hidden" name="missionId" value={mission.id} />
                  <div className="space-y-2">
                    {matches.length === 0 && (
                      <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        No reachable agents yet — you can still approve; your agent will wait for matches.
                      </p>
                    )}
                    {matches.map((m) => (
                      <label
                        key={m.user.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-teal-300"
                      >
                        <input
                          type="checkbox"
                          name="targets"
                          value={m.user.id}
                          defaultChecked={precheck.has(m.user.id)}
                          className="h-4 w-4 accent-teal-600"
                        />
                        <Avatar name={m.user.name} className="h-8 w-8 text-xs" />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800">{m.user.name}</span>
                            {m.named && (
                              <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                named in your request
                              </span>
                            )}
                            <span className="ml-auto text-xs font-semibold text-slate-400">{m.score}/100</span>
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">{m.fit}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                    >
                      Approve mission &amp; send my agent
                    </button>
                  </div>
                </form>
                <form action={cancelMissionAction} className="mt-3">
                  <input type="hidden" name="missionId" value={mission.id} />
                  <button
                    type="submit"
                    className="text-sm font-semibold text-slate-400 underline-offset-2 transition hover:text-rose-600 hover:underline"
                  >
                    Discard this mission
                  </button>
                </form>
              </Card>
            </>
          ) : (
            <>
              {/* Active / closed mission */}
              <Card className="p-6">
                <h2 className="text-sm font-semibold text-slate-900">Mission brief</h2>
                <dl className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Goal</dt>
                    <dd>{mission.goal}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Looking for</dt>
                    <dd>{mission.target_criteria}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Expected result</dt>
                    <dd>{mission.expected_output || "A structured report with a recommendation."}</dd>
                  </div>
                  {mission.result_summary && (
                    <div className="rounded-xl bg-slate-50 p-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-teal-700">Result so far</dt>
                      <dd className="mt-0.5">{mission.result_summary}</dd>
                    </div>
                  )}
                </dl>
              </Card>

              <Card className="p-6">
                <h2 className="text-sm font-semibold text-slate-900">Outreach on this mission</h2>
                {mission.intros.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">No outreach launched yet — pick targets below.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {mission.intros.map((i) => (
                      <Link key={i.id} href={`/intros/${i.id}`} className="block">
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-teal-300 hover:shadow-sm">
                          <Avatar name={i.target_name} className="h-8 w-8 text-xs" />
                          <span className="flex-1 text-sm font-semibold text-slate-800">{i.target_name}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${INTRO_STATUS[i.status].cls}`}>
                            {INTRO_STATUS[i.status].label}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {isActive && matches.filter((m) => !contacted.has(m.user.id)).length > 0 && (
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">More candidates for this mission</h3>
                    <div className="mt-2 space-y-2">
                      {matches
                        .filter((m) => !contacted.has(m.user.id))
                        .slice(0, 5)
                        .map((m) => (
                          <div key={m.user.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                            <Avatar name={m.user.name} className="h-8 w-8 text-xs" />
                            <span className="min-w-0 flex-1">
                              <span className="text-sm font-semibold text-slate-800">{m.user.name}</span>
                              <span className="ml-2 text-xs text-slate-400">{m.score}/100</span>
                              <span className="block text-xs text-slate-500">{m.fit}</span>
                            </span>
                            <form action={requestIntroAction}>
                              <input type="hidden" name="targetUserId" value={m.user.id} />
                              <input type="hidden" name="missionId" value={mission.id} />
                              <button
                                type="submit"
                                className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
                              >
                                Reach out
                              </button>
                            </form>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </Card>

              {isActive && (
                <Card className="p-6">
                  <h2 className="text-sm font-semibold text-slate-900">Wrap up</h2>
                  <form action={completeMissionAction} className="mt-3">
                    <input type="hidden" name="missionId" value={mission.id} />
                    <textarea
                      name="result_summary"
                      rows={2}
                      placeholder="What came out of this mission? (optional — your agent keeps its own notes)"
                      className={inputCls}
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <button
                        type="submit"
                        className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                      >
                        Mark completed
                      </button>
                    </div>
                  </form>
                  <form action={cancelMissionAction} className="mt-3">
                    <input type="hidden" name="missionId" value={mission.id} />
                    <button
                      type="submit"
                      className="text-sm font-semibold text-slate-400 underline-offset-2 transition hover:text-rose-600 hover:underline"
                    >
                      Cancel mission
                    </button>
                  </form>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ShareRules mission={mission} />
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-900">How missions work</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-slate-500">
              <li>You tell your agent what you want right now.</li>
              <li>It drafts the mission — goal, boundaries, targets.</li>
              <li>Nothing happens until you approve.</li>
              <li>Outreach runs through reports and approval checkpoints.</li>
              <li>You get results, not raw conversations.</li>
            </ol>
            <p className="mt-4 text-xs text-slate-400">
              {named.length > 0 && (
                <>Named targets: {named.map((u) => `${u.name} (@${u.handle})`).join(", ")} · </>
              )}
              Updated {formatTime(mission.updated_at)} · {mission.id}
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
