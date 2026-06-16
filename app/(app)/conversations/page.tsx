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
      <div className="hidden h-full flex-col items-center justify-center gap-3 text-center md:flex">
        <span className="opacity-30">
          <BridgeGlyph size={40} />
        </span>
        <p className="text-sm text-slate-400">Pick a conversation, or start one from Home.</p>
      </div>
    </>
  );
}
