import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listConversations } from "@/lib/conversations";
import { ConversationList } from "@/components/ConversationList";
import { BridgeGlyph } from "@/components/icons";

export default async function ConversationsIndex() {
  const user = await requireUser();
  const items = listConversations(user.id);

  return (
    <>
      {/* Mobile: the list is the page. Desktop: list lives in the rail, so show a prompt. */}
      <ConversationList items={items} className="flex h-full md:hidden" />
      <div className="hidden h-full flex-col items-center justify-center gap-4 px-8 text-center md:flex">
        <span className="opacity-25">
          <BridgeGlyph size={44} />
        </span>
        <div>
          <p className="text-[15px] font-medium text-slate-600">Your conversations live here</p>
          <p className="mt-1 text-[13px] text-slate-400">
            Pick one on the left — or ask your agent to start something new.
          </p>
        </div>
        <Link
          href="/ask"
          className="rounded-full bg-teal-700 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-teal-800"
        >
          Ask your agent →
        </Link>
      </div>
    </>
  );
}
