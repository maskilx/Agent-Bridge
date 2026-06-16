import type { MissionStatus } from "@/lib/missions";

export const MISSION_STATUS: Record<MissionStatus, { label: string; cls: string }> = {
  draft: { label: "Draft prepared", cls: "bg-slate-100 text-slate-500" },
  awaiting_user_approval: { label: "Ready to approve", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", cls: "bg-teal-50 text-teal-700" },
  running: { label: "Your agent is working", cls: "bg-teal-50 text-teal-700" },
  waiting_for_external_agent: { label: "Waiting for them", cls: "bg-sky-100 text-sky-700" },
  waiting_for_user: { label: "Waiting for you", cls: "bg-amber-100 text-amber-700" },
  completed: { label: "Done", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", cls: "bg-slate-100 text-slate-500" },
  rejected: { label: "Not approved", cls: "bg-slate-100 text-slate-500" },
};
