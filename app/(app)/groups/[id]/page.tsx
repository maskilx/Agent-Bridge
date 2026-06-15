import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { askGroupAction, postGroupMessageAction, summarizeGroupAction } from "@/lib/actions";
import { getGroupView, type GroupMessage } from "@/lib/groups";
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
