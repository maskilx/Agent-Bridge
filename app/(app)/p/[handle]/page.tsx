import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { requestIntroAction } from "@/lib/actions";
import { getOwnerProfile } from "@/lib/core";

function Avatar({ name, picture, size = 88 }: { name: string; picture: string; size?: number }) {
  if (picture) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={picture}
        alt={name}
        className="shrink-0 rounded-full object-cover ring-4 ring-white shadow-sm"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-emerald-500 font-semibold text-white ring-4 ring-white shadow-sm"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials}
    </span>
  );
}

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-100 px-6 py-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</p>
      <div className="mt-2 text-[14px] leading-relaxed text-slate-700">{children}</div>
    </div>
  );
}

export default async function OwnerProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const user = await requireUser();
  const { handle } = await params;
  const p = getOwnerProfile(user.id, handle);
  if (!p) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-5">
        <Link href="/matches" className="text-xs font-medium text-slate-400 transition hover:text-teal-700">
          ← Back to Discover
        </Link>
      </div>

      {!p.viewable ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
          <Avatar name={p.name} picture="" size={72} />
          <h1 className="mt-4 text-lg font-semibold text-slate-900">{p.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            This profile is private. {p.name}&apos;s agent isn&apos;t open to discovery right now.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {/* header */}
          <div className="relative h-24 bg-[radial-gradient(120%_120%_at_30%_0%,rgba(13,148,136,0.16),transparent)]" />
          <div className="px-6 pb-2">
            <div className="-mt-12 flex items-end justify-between gap-4">
              <Avatar name={p.name} picture={p.picture} />
              {!p.isSelf ? (
                <form action={requestIntroAction} className="mb-1">
                  <input type="hidden" name="targetUserId" value={p.userId} />
                  <button
                    type="submit"
                    className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
                  >
                    Have my agent reach out
                  </button>
                </form>
              ) : (
                <Link
                  href="/agent"
                  className="mb-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
                >
                  Edit profile
                </Link>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{p.name}</h1>
            {p.headline && <p className="mt-0.5 text-[15px] text-slate-600">{p.headline}</p>}
            <p className="mt-1 font-mono text-[12px] text-slate-400">
              @{p.handle} · agent via {p.provider}
              {p.isSelf && " · this is your public profile"}
            </p>
            {p.interests.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 pb-1">
                {p.interests.map((t) => (
                  <span key={t} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] text-slate-600">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {p.bio && <Field title="About">{p.bio}</Field>}
          {p.openTo && <Field title="Open to / looking for">{p.openTo}</Field>}
          {p.helpsWith && <Field title="What their agent can help with">{p.helpsWith}</Field>}

          {!p.isSelf && (
            <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4 text-[12px] leading-relaxed text-slate-500">
              When you reach out, your agent shares only what you&apos;ve allowed — and nothing is sent until you approve.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
