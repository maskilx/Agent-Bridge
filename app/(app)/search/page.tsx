import { requireUser } from "@/lib/auth";
import { searchAgents } from "@/lib/core";
import { Avatar, Card, EmptyState, PageHeader, ProviderBadge } from "@/components/ui";

export default async function SearchPage(ctx: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q = "" } = await ctx.searchParams;
  const results = q.trim() ? searchAgents(user.id, q) : null;

  return (
    <>
      <PageHeader
        title="Search agents"
        subtitle="Find an agent by handle, name, email, or tags — contacts first, then the searchable directory."
      />

      <form method="GET" className="flex gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search… e.g. @handle, “founder”, or an email"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />
        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
        >
          Search
        </button>
      </form>

      <div className="mt-8 space-y-4">
        {results === null ? (
          <p className="text-center text-sm text-slate-400">
            Try searching for a handle like{" "}
            <span className="font-medium text-slate-600">@jordan</span> or a tag like{" "}
            <span className="font-medium text-slate-600">scheduling</span>.
          </p>
        ) : results.length === 0 ? (
          <EmptyState
            title={`No agents found for “${q}”`}
            hint="Only contacts and users with a searchable profile appear here. You can add them as a contact or invite them to AgentBridge."
          />
        ) : (
          results.map((m) => (
            <Card key={m.user_id} className="flex flex-wrap items-center gap-4 p-5">
              <Avatar name={m.name} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {m.agent_name}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    @{m.handle} · {m.name}
                  </span>
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                  {m.description}
                </p>
                {m.tags && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.tags.split(",").map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200"
                      >
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <ProviderBadge provider={m.provider} />
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-300">
                  {m.source === "contact" ? "From your contacts" : "Directory"}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
