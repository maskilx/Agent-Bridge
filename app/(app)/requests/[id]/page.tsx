import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getEventsForRequest, getRequestView } from "@/lib/core";
import {
  Card,
  IntentBadge,
  PageHeader,
  ProviderBadge,
  StatusBadge,
  formatTime,
} from "@/components/ui";

const EVENT_ICONS: Record<string, string> = {
  request_created: "✉",
  routed: "⇄",
  approval_required: "✋",
  auto_replied: "⚡",
  approved: "✓",
  edited: "✎",
  rejected: "✕",
  policy_blocked: "⛔",
  reply_delivered: "📬",
};

export default async function RequestDetailPage(ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await ctx.params;
  const request = getRequestView(id);
  if (!request || (request.from_user_id !== user.id && request.to_user_id !== user.id)) {
    notFound();
  }
  const events = getEventsForRequest(request.id);
  const payload = JSON.parse(request.payload || "{}");

  return (
    <>
      <div className="mb-6">
        <Link href="/inbox" className="text-xs font-medium text-slate-400 hover:text-teal-700">
          ← Back to inbox
        </Link>
      </div>
      <PageHeader
        title="Request detail"
        subtitle={`Request ${request.id}`}
        action={<StatusBadge status={request.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <IntentBadge intent={request.intent} />
              {request.requires_approval === 1 && (
                <span className="text-xs text-slate-400">requires recipient approval</span>
              )}
            </div>
            <p className="mt-4 text-lg leading-relaxed text-slate-900">“{request.message}”</p>
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">From</p>
                <p className="mt-1 font-semibold text-slate-800">{request.from_agent_name}</p>
                <p className="text-xs text-slate-400">{request.from_user_name}</p>
                <div className="mt-1.5">
                  <ProviderBadge provider={request.from_agent_provider} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">To</p>
                <p className="mt-1 font-semibold text-slate-800">{request.to_agent_name}</p>
                <p className="text-xs text-slate-400">{request.to_user_name}</p>
                <div className="mt-1.5">
                  <ProviderBadge provider={request.to_agent_provider} />
                </div>
              </div>
            </div>
          </Card>

          {request.response ? (
            <Card className="overflow-hidden">
              <div
                className={`border-l-4 p-6 ${
                  request.response.approval_status === "rejected"
                    ? "border-rose-400"
                    : "border-emerald-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Response</h2>
                  <StatusBadge status={request.response.approval_status} />
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-800">
                  {request.response.response_text || <em className="text-slate-400">No reply text</em>}
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  {request.response.auto === 1
                    ? "Replied automatically by agent policy"
                    : `Approved by ${request.to_user_name}`}{" "}
                  · {formatTime(request.response.created_at)}
                </p>
              </div>
            </Card>
          ) : (
            <Card className="p-6 text-sm text-slate-400">
              No response yet — waiting on {request.to_user_name}.
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-900">Structured payload</h2>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-900">Audit trail</h2>
            <ol className="relative mt-5 space-y-6 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-slate-200">
              {events.map((e) => (
                <li key={e.id} className="relative flex gap-4">
                  <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs">
                    {EVENT_ICONS[e.type] ?? "•"}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-medium text-slate-800">
                      {e.actor_label}{" "}
                      <span className="font-normal text-slate-500">
                        · {e.type.replaceAll("_", " ")}
                      </span>
                    </p>
                    {e.detail && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{e.detail}</p>}
                    <p className="mt-0.5 text-[11px] text-slate-300">{formatTime(e.created_at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
