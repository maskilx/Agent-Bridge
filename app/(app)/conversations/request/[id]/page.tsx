import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { respondInChatAction } from "@/lib/actions";
import { getRequestView } from "@/lib/core";
import { Bubble, ChatHeader, SystemNote } from "@/components/chat";

export default async function RequestChatPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const r = getRequestView(id);
  if (!r || r.to_user_id !== user.id) notFound();

  const pending = r.status === "waiting_for_recipient";

  return (
    <div className="flex h-full flex-col">
      <ChatHeader title={r.from_user_name} subtitle={`Request · via ${r.from_agent_name}`} avatars={[r.from_user_name]} />

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5">
        <SystemNote>{r.from_user_name}&apos;s agent reached out on their behalf. Nothing is shared back without you.</SystemNote>
        <Bubble sender={`${r.from_user_name}'s Agent`} agent time={r.created_at}>
          {r.message}
        </Bubble>
        {r.response && (
          <Bubble me time={r.response.created_at}>
            {r.response.response_text || "(declined)"}
          </Bubble>
        )}
      </div>

      {pending ? (
        <div className="border-t border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur-sm">
          <form action={respondInChatAction}>
            <input type="hidden" name="requestId" value={r.id} />
            <div className="composer-glow rounded-[20px] p-1">
              <textarea
                name="replyText"
                rows={2}
                placeholder="Write your reply — e.g. “Happy to chat, I’m free after 6pm”"
                className="max-h-32 min-h-[44px] w-full resize-none bg-transparent px-3 py-2 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2.5">
              <button
                name="approvalStatus"
                value="approved"
                className="rounded-xl bg-teal-700 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-teal-800"
              >
                Approve &amp; send
              </button>
              <button
                name="approvalStatus"
                value="rejected"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600"
              >
                Decline
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="border-t border-slate-200/70 bg-white/60 px-4 py-3 text-center text-[12px] text-slate-400 backdrop-blur-sm">
          You&apos;ve already responded to this request.
        </div>
      )}
    </div>
  );
}
