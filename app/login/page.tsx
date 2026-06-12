import Link from "next/link";
import { redirect } from "next/navigation";
import { devLogin, loginAs } from "@/lib/actions";
import { currentUser } from "@/lib/auth";
import { googleConfigured } from "@/lib/google";
import { sampleFoundersEnabled } from "@/lib/access";
import { listUsers, getAgentForUser } from "@/lib/core";
import { Avatar, Logo, ProviderBadge } from "@/components/ui";

const ERRORS: Record<string, string> = {
  google_not_configured: "Google sign-in is not configured on this server yet.",
  google_failed: "Google sign-in failed — please try again.",
  oauth_state: "Sign-in session expired — please try again.",
  bad_email: "Please enter a valid email address.",
  not_invited:
    "This account doesn't have access to the alpha yet. If you believe it should, contact the AgentBridge team.",
};

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await currentUser()) redirect("/dashboard");
  const { error } = await searchParams;
  const hasGoogle = googleConfigured();
  const showAlphaEmailForm = !hasGoogle || process.env.ALLOW_DEV_LOGIN === "1";
  const sampleUsers = sampleFoundersEnabled()
    ? listUsers().filter((u) => u.email.endsWith("@agentbridge.demo"))
    : [];

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,#eef2ff_0%,#f7f8fc_60%)] px-6 py-12">
      <Link href="/" className="mb-10">
        <Logo size="lg" />
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-teal-100/50">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Sign in</h1>
          <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
            Private alpha
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          AgentBridge is in private alpha — access is by invitation. Sign in to meet the agent that
          represents you.
        </p>

        {error && ERRORS[error] && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {ERRORS[error]}
          </p>
        )}

        {hasGoogle && (
          <a
            href="/api/auth/google"
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50/40"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Continue with Google
          </a>
        )}

        {showAlphaEmailForm && (
          <form action={devLogin} className={`${hasGoogle ? "mt-4" : "mt-6"} space-y-3`}>
            {hasGoogle && (
              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            )}
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Private alpha access
            </p>
            <input name="name" placeholder="Your name" className={inputCls} />
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className={inputCls}
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Enter the alpha
            </button>
            <p className="text-center text-xs text-slate-400">
              Access is limited to invited email addresses.
            </p>
          </form>
        )}

        {sampleUsers.length > 0 && (
          <>
            <div className="mt-8 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Local sample founders
              </span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="mt-4 space-y-2.5">
              {sampleUsers.map((u) => {
                const agent = getAgentForUser(u.id);
                return (
                  <form key={u.id} action={loginAs}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button
                      type="submit"
                      className="flex w-full items-center gap-4 rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-teal-300 hover:bg-teal-50/40 hover:shadow-sm"
                    >
                      <Avatar name={u.name} />
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-slate-900">{u.name}</span>
                        <span className="block text-xs text-slate-400">
                          @{u.handle} · {agent.tags.split(",")[0]}
                        </span>
                      </span>
                      <ProviderBadge provider={agent.provider} />
                    </button>
                  </form>
                );
              })}
            </div>
          </>
        )}
      </div>
      <p className="mt-6 text-xs text-slate-400">
        Your agent only acts with your approval — that includes who gets in here.
      </p>
    </div>
  );
}
