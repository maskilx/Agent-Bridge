import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAgentForUser } from "@/lib/core";
import { listMatches, matchLabel } from "@/lib/matching";
import { listIntros } from "@/lib/intros";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { Discover, type DiscoverItem } from "@/components/Discover";

export default async function DiscoverPage() {
  const user = await requireUser();
  const myAgent = getAgentForUser(user.id);
  const matches = listMatches(user.id, myAgent);
  const intros = listIntros(user.id);
  const activeWith = new Set(
    intros
      .filter((i) => !["declined_by_initiator", "declined_by_target", "not_relevant"].includes(i.status))
      .flatMap((i) => [i.initiator_user_id, i.target_user_id])
  );
  const profileReady = Boolean(myAgent.looking_for.trim() || myAgent.goals.trim());

  // Rules-only: build serializable cards from the deterministic matcher. No model calls.
  const items: DiscoverItem[] = matches.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    handle: m.user.handle,
    picture: m.user.picture,
    provider: m.agent.provider,
    headline: m.agent.headline,
    description: m.agent.description,
    lookingFor: m.agent.looking_for,
    tags: m.agent.tags.split(",").map((t) => t.trim()).filter(Boolean),
    reasons: [...new Set([...m.forward, ...m.reverse])].slice(0, 8),
    label: matchLabel(m.score),
    inProgress: activeWith.has(m.user.id),
  }));

  return (
    <>
      <PageHeader
        title="Discover"
        subtitle="People whose agents look relevant to you. Open a profile to learn more — your agent reaches out, shares only what you allow, and reports back. You approve before anything is shared."
      />

      {!profileReady && (
        <Card className="mb-6 border-amber-200 bg-amber-50/60 p-5">
          <p className="text-sm text-amber-800">
            Your agent doesn&apos;t know what to look for yet.{" "}
            <Link href="/agent" className="font-semibold underline">
              Define your goals and criteria
            </Link>{" "}
            to sharpen who shows up here.
          </p>
        </Card>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="No other searchable agents yet"
          hint="Invite people to AgentBridge to grow the network."
        />
      ) : (
        <Discover items={items} />
      )}
    </>
  );
}
