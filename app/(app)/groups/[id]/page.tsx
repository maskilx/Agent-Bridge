import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  askGroupAction,
  decideGroupProposalAction,
  postGroupMessageAction,
  proposeGroupActionAction,
  summarizeGroupAction,
} from "@/lib/actions";
import { getGroupView, type GroupMessage, type GroupProposalView } from "@/lib/groups";
import { Avatar, Card, formatTime } from "@/components/ui";

function MessageRow({ m, viewerId }: { m: GroupMessage; viewerId: string }) {
  if (m.kind === "system") {
    return <p className="px-1 py-1 text-center text-[12px] italic text-slate-400">{m.content}</p>;
  }
  if (m.kind === "summary") {
    return (
      <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700">Your agent · summary</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-700">{m.content}</p>
      </div>
    );
  }
  const isAgent = m.kind === "agent";
  const mine = m.author_user_id === viewerId;
  return (
    <div className="flex items-start gap-3">
      <Avatar name={m.author_label.replace(/'s Agent$/, "")} className="h-8 w-8 text-xs" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-slate-400">
          <span className={`font-semibold ${isAgent ? "text-teal-700" : "text-slate-700"}`}>{m.author_label}</span>
          {mine && " · you"} · {formatTime(m.created_at)}
        </p>
        <p className="mt-0.5 text-[14px] leading-relaxed text-slate-700">{m.content}</p>
      </div>
    </div>
  );
}

const STATUS = {
  pending: { label: "Awaiting approvals", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved by all", cls: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Declined", cls: "bg-rose-100 text-rose-700" },
} as const;

function ProposalCard({ p, viewerId, groupId }: { p: GroupProposalView; viewerId: string; groupId: string }) {
  const s = STATUS[p.status];
  const mine = p.decisions.find((d) => d.userId === viewerId);
  const canDecide = p.status === "pending" && mine?.decision === "pending";
  return (
    <Card className="border-amber-200/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Group decision</p>
          <p className="mt-1 text-[14px] font-medium text-slate-800">{p.action}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
      </div>
      {p.shares && (
        <p className="mt-2 text-[13px] text-slate-600">
          <span className="font-semibold text-slate-400">Will share: </span>
          {p.shares}
        </p>
      )}
      <p className="mt-1 text-[12px] text-slate-400">
        Proposed by {p.proposerName} · everyone in the group must approve · visible to all members.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.decisions.map((d) => (
          <span
            key={d.userId}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] ${
              d.decision === "approved"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : d.decision === "rejected"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-slate-200 bg-white text-slate-400"
            }`}
          >
            {d.decision === "approved" ? "✓" : d.decision === "rejected" ? "✕" : "•"} {d.name}
            {d.userId === viewerId && " (you)"}
          </span>
        ))}
      </div>
      {canDecide && (
        <div className="mt-4 flex gap-2.5">
          <form action={decideGroupProposalAction}>
            <input type="hidden" name="proposalId" value={p.id} />
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="decision" value="approved" />
            <button className="rounded-xl bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-emerald-500">
              Approve
            </button>
          </form>
          <form action={decideGroupProposalAction}>
            <input type="hidden" name="proposalId" value={p.id} />
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="decision" value="rejected" />
            <button className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50">
              Reject
            </button>
          </form>
        </div>
      )}
      {!canDecide && p.status === "pending" && mine && (
        <p className="mt-3 text-[12px] text-slate-400">
          You {mine.decision === "approved" ? "approved" : "rejected"} — waiting on the others.
        </p>
      )}
    </Card>
  );
}

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const g = getGroupView(user.id, id);
  if (!g) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-5">
        <Link href="/groups" className="text-xs font-medium text-slate-400 transition hover:text-teal-700">
          ← All groups
        </Link>
      </div>

      <Card className="p-6">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{g.title}</h1>
        {g.goal && <p className="mt-1 text-[14px] leading-relaxed text-slate-600">{g.goal}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {g.members.map((mem) => (
            <Link
              key={mem.userId}
              href={`/p/${mem.handle}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
            >
              {mem.name}
              {mem.userId === user.id && <span className="text-[10px] text-slate-400">you</span>}
            </Link>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <form action={askGroupAction}>
            <input type="hidden" name="groupId" value={g.id} />
            <button className="rounded-xl bg-teal-700 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-teal-800">
              Ask the group&apos;s agents
            </button>
          </form>
          <form action={summarizeGroupAction}>
            <input type="hidden" name="groupId" value={g.id} />
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:border-teal-300 hover:text-teal-700">
              Summarize where the group stands
            </button>
          </form>
        </div>
      </Card>

      {g.proposals.length > 0 && (
        <div className="mt-5 space-y-3">
          {g.proposals.map((p) => (
            <ProposalCard key={p.id} p={p} viewerId={user.id} groupId={g.id} />
          ))}
        </div>
      )}

      <Card className="mt-5 p-5">
        <p className="text-sm font-semibold text-slate-900">Propose a group action</p>
        <p className="mt-0.5 text-[12.5px] text-slate-400">
          Anything sensitive — sharing contact details, scheduling, a commitment — needs every member to approve first.
        </p>
        <form action={proposeGroupActionAction} className="mt-3 space-y-2.5">
          <input type="hidden" name="groupId" value={g.id} />
          <input
            name="action"
            required
            placeholder="e.g. Exchange contact details so we can meet directly"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
          <input
            name="shares"
            placeholder="What this would share (optional) — e.g. everyone's email address"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
          <button className="rounded-xl bg-teal-700 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-teal-800">
            Propose to the group
          </button>
        </form>
      </Card>

      <div className="mt-5 space-y-4">
        {g.messages.map((m) => (
          <MessageRow key={m.id} m={m} viewerId={user.id} />
        ))}
      </div>

      <Card className="mt-5 p-3">
        <form action={postGroupMessageAction} className="flex items-end gap-2">
          <input type="hidden" name="groupId" value={g.id} />
          <textarea
            name="content"
            rows={1}
            required
            placeholder="Message the group…"
            className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-slate-700">
            Send
          </button>
        </form>
      </Card>

      <p className="mt-3 text-center text-[11px] text-slate-400">
        Agents share only public profile info here. Introductions, contact details, and commitments still need each
        owner&apos;s approval.
      </p>
    </div>
  );
}
