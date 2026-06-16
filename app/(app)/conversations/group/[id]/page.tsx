import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { decideGroupProposalAction } from "@/lib/actions";
import { getGroupView } from "@/lib/groups";
import { GroupComposer } from "@/components/GroupComposer";
import { Bubble, ChatHeader, PinnedCard, SystemNote } from "@/components/chat";

const PROP_STATUS = {
  pending: { label: "Awaiting approvals", tone: "amber" as const },
  approved: { label: "Approved by all", tone: "emerald" as const },
  rejected: { label: "Declined", tone: "slate" as const },
};

/** Highlight @mentions (a person or "@Name's agent") inside a message. */
function renderContent(content: string) {
  const parts = content.split(/(@[A-Za-z][A-Za-z0-9]*(?:'s agent)?)/g);
  return parts.map((p, i) =>
    /^@/.test(p) ? (
      <span key={i} className="font-semibold text-teal-700">
        {p}
      </span>
    ) : (
      p
    )
  );
}

export default async function GroupChatPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const g = getGroupView(user.id, id);
  if (!g) notFound();

  const members = g.members.filter((m) => m.userId !== user.id).map((m) => ({ userId: m.userId, name: m.name }));
  const subtitle = g.members.map((m) => (m.userId === user.id ? "You" : m.name)).join(", ");

  return (
    <div className="flex h-full flex-col">
      <ChatHeader title={g.title} subtitle={g.goal || subtitle} avatars={members.map((m) => m.name)} />

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {g.goal && (
          <SystemNote>
            Group goal: {g.goal}. Agents share only public profile info here — sensitive actions need each owner&apos;s
            approval.
          </SystemNote>
        )}

        {g.messages.map((msg) => {
          if (msg.kind === "system") return <SystemNote key={msg.id}>{msg.content}</SystemNote>;
          if (msg.kind === "summary") {
            return (
              <PinnedCard key={msg.id} tone="emerald">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Your agent · summary</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-slate-700">{msg.content}</p>
              </PinnedCard>
            );
          }
          const me = msg.author_user_id === user.id;
          return (
            <Bubble key={msg.id} me={me} sender={me ? undefined : msg.author_label} agent={msg.kind === "agent"} time={msg.created_at}>
              {renderContent(msg.content)}
            </Bubble>
          );
        })}

        {/* Pending decisions as pinned approval cards */}
        {g.proposals
          .filter((p) => p.status === "pending")
          .map((p) => {
            const mine = p.decisions.find((d) => d.userId === user.id);
            const canDecide = mine?.decision === "pending";
            return (
              <PinnedCard key={p.id} tone="amber">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Group decision</p>
                    <p className="mt-1 text-[14px] font-medium text-slate-800">{p.action}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    {PROP_STATUS[p.status].label}
                  </span>
                </div>
                {p.shares && (
                  <p className="mt-2 text-[13px] text-slate-600">
                    <span className="font-semibold text-slate-400">Will share: </span>
                    {p.shares}
                  </p>
                )}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {p.decisions.map((d) => (
                    <span
                      key={d.userId}
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${
                        d.decision === "approved"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : d.decision === "rejected"
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {d.decision === "approved" ? "✓" : d.decision === "rejected" ? "✕" : "•"} {d.name}
                      {d.userId === user.id && " (you)"}
                    </span>
                  ))}
                </div>
                {canDecide && (
                  <div className="mt-3 flex gap-2.5">
                    <form action={decideGroupProposalAction}>
                      <input type="hidden" name="proposalId" value={p.id} />
                      <input type="hidden" name="groupId" value={g.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <button className="rounded-xl bg-emerald-600 px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-emerald-500">
                        Approve
                      </button>
                    </form>
                    <form action={decideGroupProposalAction}>
                      <input type="hidden" name="proposalId" value={p.id} />
                      <input type="hidden" name="groupId" value={g.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <button className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600">
                        Reject
                      </button>
                    </form>
                  </div>
                )}
              </PinnedCard>
            );
          })}
      </div>

      <GroupComposer groupId={g.id} members={members} />
    </div>
  );
}
