import { requireUser } from "@/lib/auth";
import { listConversations } from "@/lib/conversations";
import { ConversationList } from "@/components/ConversationList";

export default async function ConversationsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const items = listConversations(user.id);

  return (
    // Full-bleed: escape the centered page padding and fill the canvas, like a
    // messaging app. Sits right of the rail (desktop) / below the header (mobile).
    <div className="fixed inset-x-0 bottom-0 top-[53px] flex md:left-[248px] md:top-0">
      <ConversationList
        items={items}
        className="hidden w-[340px] shrink-0 border-r border-slate-200/70 bg-white/60 backdrop-blur-sm md:flex"
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
