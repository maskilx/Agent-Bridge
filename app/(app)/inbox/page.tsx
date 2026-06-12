import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { respondToRequest } from "@/lib/actions";
import { listIncoming, type RequestView } from "@/lib/core";
import {
  Avatar,
  Card,
  EmptyState,
  IntentBadge,
  PageHeader,
  ProviderBadge,
  RequestRow,
  StatusBadge,
  formatTime,
} from "@/components/ui";

function PendingCard({ request }: { request: RequestView }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-l-4 border-amber-400 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name={request.from_user_name} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">
              {request.from_agent_name} is asking:
            </p>
            <p className="text-xs text-slate-400">
              on behalf of {request.from_user_name} · {formatTime(request.created_at)}
            </p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-[15px] leading-relaxed text-slate-800">
          “{request.message}”
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <IntentBadge intent={request.intent} />
          <ProviderBadge provider={request.from_agent_provider} />
          {request.requires_approval === 1 && (
            <span className="text-xs text-slate-400">· requires your approval</span>
          )}
          <Link
            href={`/requests/${request.id}`}
            className="ml-auto text-xs font-medium text-teal-700 hover:text-teal-900"
          >
            View audit trail →
          </Link>
        </div>

        <form action={respondToRequest} className="mt-5">
          <input type="hidden" name="requestId" value={request.id} />
          <textarea
            name="replyText"
            rows={2}
            placeholder="Write your reply… e.g. “I'm free after 19:00.”"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
          <div className="mt-3 flex flex-wrap gap-2.5">
            <button
              type="submit"
              name="approvalStatus"
              value="approved"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
            >
              Approve &amp; send
            </button>
            <button
              type="submit"
              name="approvalStatus"
              value="edited"
              className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              Send as edited
            </button>
            <button
              type="submit"
              name="approvalStatus"
              value="rejected"
              className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              Reject
            </button>
          </div>
        </form>
      </div>
    </Card>
  );
}

export default async function InboxPage() {
  const user = await requireUser();
  const incoming = listIncoming(user.id);
  const pending = incoming.filter((r) => r.status === "waiting_for_recipient");
  const handled = incoming.filter((r) => r.status !== "waiting_for_recipient");

  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle="Requests other agents sent to your agent. Nothing goes out without you."
      />

      {pending.length === 0 && handled.length === 0 ? (
        <EmptyState
          title="Your inbox is clear"
          hint="When another agent sends your agent a request, it will appear here for your approval."
        />
      ) : (
        <>
          {pending.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                Waiting for your approval · {pending.length}
              </h2>
              {pending.map((r) => (
                <PendingCard key={r.id} request={r} />
              ))}
            </section>
          )}

          {handled.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Handled
              </h2>
              <Card className="mt-3 px-2 py-2">
                {handled.map((r) => (
                  <RequestRow
                    key={r.id}
                    href={`/requests/${r.id}`}
                    title={r.message}
                    counterparty={r.from_user_name}
                    provider={r.from_agent_provider}
                    intent={r.intent}
                    status={r.status}
                    timestamp={r.created_at}
                  />
                ))}
              </Card>
            </section>
          )}
        </>
      )}
    </>
  );
}
