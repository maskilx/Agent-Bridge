import { requireUser } from "@/lib/auth";
import { getAgentForUser } from "@/lib/core";
import AgentChat from "@/components/AgentChat";

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const agent = getAgentForUser(user.id);
  const { q } = await searchParams;

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <AgentChat agentName={agent.display_name} initialQuery={q} />
    </div>
  );
}
