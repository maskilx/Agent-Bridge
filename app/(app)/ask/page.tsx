import { requireUser } from "@/lib/auth";
import { getAgentForUser } from "@/lib/core";
import { getGroupView } from "@/lib/groups";
import AgentChat from "@/components/AgentChat";

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; group?: string }>;
}) {
  const user = await requireUser();
  const agent = getAgentForUser(user.id);
  const { q, group } = await searchParams;

  // Explicit handoff from a group thread — membership-checked.
  let groupCtx: { id: string; title: string } | undefined;
  if (group) {
    const gv = getGroupView(user.id, group);
    if (gv) groupCtx = { id: gv.id, title: gv.title };
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <AgentChat agentName={agent.display_name} initialQuery={q} group={groupCtx} />
    </div>
  );
}
