import type { IntroView } from "@/lib/intros";

export const INTRO_STATUS: Record<IntroView["status"], { label: string; cls: string }> = {
  not_relevant: { label: "Not a fit right now", cls: "bg-slate-100 text-slate-500" },
  awaiting_target_consent: { label: "Waiting for them to accept", cls: "bg-amber-100 text-amber-700" },
  awaiting_initiator_approval: { label: "Ready to approve", cls: "bg-amber-100 text-amber-700" },
  awaiting_target_approval: { label: "Waiting for them", cls: "bg-amber-100 text-amber-700" },
  connected: { label: "Connected", cls: "bg-emerald-100 text-emerald-700" },
  declined_by_initiator: { label: "Declined", cls: "bg-rose-100 text-rose-600" },
  declined_by_target: { label: "They passed", cls: "bg-rose-100 text-rose-600" },
};
