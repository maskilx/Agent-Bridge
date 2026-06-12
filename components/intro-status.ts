import type { IntroView } from "@/lib/intros";

export const INTRO_STATUS: Record<IntroView["status"], { label: string; cls: string }> = {
  not_relevant: { label: "Filtered out by their agent", cls: "bg-slate-100 text-slate-500" },
  awaiting_initiator_approval: { label: "Waiting for initiator approval", cls: "bg-amber-100 text-amber-700" },
  awaiting_target_approval: { label: "Waiting for their approval", cls: "bg-amber-100 text-amber-700" },
  connected: { label: "Connected", cls: "bg-emerald-100 text-emerald-700" },
  declined_by_initiator: { label: "Declined by initiator", cls: "bg-rose-100 text-rose-600" },
  declined_by_target: { label: "Declined by them", cls: "bg-rose-100 text-rose-600" },
};
