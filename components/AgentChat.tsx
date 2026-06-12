"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrandTile, IconArrowUp } from "@/components/icons";

/* ------------------------------------------------------------------ types */

type Candidate = {
  user_id: string;
  name: string;
  handle: string;
  score: number;
  named: boolean;
  recommended: boolean;
  fit: string;
};

type DraftMission = {
  id: string;
  title: string;
  goal: string;
  target_criteria: string;
  allowed_to_share: string;
  must_not_share: string;
  approval_policy: string;
  expected_output: string;
  outreach_message: string;
  candidates: Candidate[];
};

type Report = {
  summary: string;
  match_reasons: string[];
  risks: string[];
  missing_info: string[];
  recommendation: string;
  proposed_next_step: string;
};

type ResultData = {
  intro_id: string;
  target_name: string;
  status: string;
  match_score: number;
  waiting_on_you: boolean;
  report: Report;
};

type Msg =
  | { id: number; type: "user"; text: string }
  | { id: number; type: "agent"; text: string }
  | { id: number; type: "typing" }
  | { id: number; type: "draft"; mission: DraftMission; state: "pending" | "approved" | "cancelled" }
  | { id: number; type: "activity"; steps: string[]; current: number; done: boolean }
  | { id: number; type: "result"; result: ResultData; decided?: "approved" | "rejected" };

let nextId = 1;
const mid = () => nextId++;

/* ------------------------------------------------------------- primitives */

/** Agent turns read like a considered reply — open text beside the mark, no box. */
function AgentTurn({ children }: { children: React.ReactNode }) {
  return (
    <div className="msg-in flex items-start gap-3.5">
      <span className="mt-0.5">
        <BrandTile size={28} radius={9} />
      </span>
      <div className="min-w-0 max-w-[88%] pt-0.5 text-[15px] leading-7 text-slate-700">{children}</div>
    </div>
  );
}

/** Cards hang from the agent's column, aligned under its replies. */
function AgentCard({
  children,
  accent = "border-slate-200/70",
  className = "",
}: {
  children: React.ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <div className="msg-in flex items-start gap-3.5">
      <span className="w-7 shrink-0" />
      <div
        className={`w-full max-w-[88%] overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(29,27,23,0.04),0_16px_40px_-20px_rgba(29,27,23,0.14)] ${accent} ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

function Eyebrow({ children, tone = "text-teal-700" }: { children: React.ReactNode; tone?: string }) {
  return (
    <p className={`text-[10.5px] font-bold uppercase tracking-[0.16em] ${tone}`}>{children}</p>
  );
}

function Typing() {
  return (
    <AgentTurn>
      <span className="flex items-center gap-1.5 py-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-[7px] w-[7px] animate-bounce rounded-full bg-slate-300"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    </AgentTurn>
  );
}

/* ------------------------------------------------------------ draft card */

function DraftCard({
  msg,
  onApprove,
  onCancel,
}: {
  msg: Extract<Msg, { type: "draft" }>;
  onApprove: (targets: string[], message: string) => void;
  onCancel: () => void;
}) {
  const m = msg.mission;
  const defaults = new Set(m.candidates.filter((c) => c.named || c.recommended).map((c) => c.user_id));
  if (defaults.size === 0) {
    for (const c of m.candidates) {
      if (defaults.size >= 1) break;
      if (c.score >= 25) defaults.add(c.user_id);
    }
  }
  const [selected, setSelected] = useState<Set<string>>(defaults);
  const [message, setMessage] = useState(m.outreach_message);
  const [editing, setEditing] = useState(false);
  const locked = msg.state !== "pending";

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      return next;
    });

  return (
    <AgentCard accent={msg.state === "cancelled" ? "border-slate-200/70 opacity-70" : "border-teal-700/15"}>
      {/* header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-b from-teal-50/40 to-transparent px-6 pb-4 pt-5">
        <div>
          <Eyebrow>Mission · ready for review</Eyebrow>
          <h3 className="mt-1 font-display text-[19px] font-medium leading-snug tracking-tight text-slate-900">
            {m.title}
          </h3>
        </div>
        {msg.state === "approved" && (
          <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            Approved ✓
          </span>
        )}
        {msg.state === "cancelled" && (
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            Discarded
          </span>
        )}
      </div>

      <div className="space-y-5 px-6 py-5">
        <p className="text-[14px] leading-relaxed text-slate-600">{m.goal}</p>

        {/* boundaries */}
        <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200/70 bg-slate-200/70 sm:grid-cols-2">
          <div className="bg-white px-4 py-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              <span className="text-[8px]">●</span> Will share
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{m.allowed_to_share}</p>
          </div>
          <div className="bg-white px-4 py-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              <span className="text-[8px]">○</span> Stays private
              <span className="font-medium normal-case tracking-normal text-slate-400">· only you see this</span>
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{m.must_not_share}</p>
          </div>
        </div>

        {/* the message */}
        <div>
          <div className="flex items-center justify-between">
            <Eyebrow tone="text-slate-400">The exact message the other agent receives</Eyebrow>
            {!locked && (
              <button
                onClick={() => setEditing((e) => !e)}
                className="text-xs font-semibold text-teal-700 transition hover:text-teal-900"
              >
                {editing ? "Done editing" : "Edit"}
              </button>
            )}
          </div>
          {editing && !locked ? (
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-teal-600/40 px-4 py-3 text-[14px] leading-relaxed text-slate-800 focus:outline-none focus:ring-4 focus:ring-teal-600/10"
            />
          ) : (
            <blockquote className="mt-2 border-l-2 border-teal-600/70 py-0.5 pl-4 font-display text-[15px] italic leading-relaxed text-slate-700">
              “{message}”
            </blockquote>
          )}
          <p className="mt-2 text-[12px] text-slate-400">
            Your boundaries and notes are never sent — only this message.
          </p>
        </div>

        {/* targets */}
        {m.candidates.length > 0 && (
          <div>
            <Eyebrow tone="text-slate-400">Send to</Eyebrow>
            <div className="mt-2 flex flex-wrap gap-2">
              {m.candidates.map((c) => {
                const on = selected.has(c.user_id);
                return (
                  <button
                    key={c.user_id}
                    disabled={locked}
                    onClick={() => toggle(c.user_id)}
                    title={c.fit}
                    className={`flex items-center gap-2 rounded-full border px-3.5 py-[7px] text-[13.5px] font-medium transition-all duration-150 disabled:opacity-60 ${
                      on
                        ? "border-teal-700/60 bg-teal-700 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {c.name}
                    {c.named && (
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${on ? "text-teal-200" : "text-teal-700"}`}>
                        named
                      </span>
                    )}
                    <span className={`font-mono text-[11px] ${on ? "text-teal-100" : "text-slate-400"}`}>{c.score}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* footer */}
      {!locked && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <button
            onClick={() => onApprove([...selected], message)}
            disabled={selected.size === 0}
            className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,92,77,0.35)] transition-all duration-150 hover:bg-teal-800 hover:shadow-[0_3px_12px_rgba(34,92,77,0.4)] disabled:opacity-40 disabled:shadow-none"
          >
            Approve &amp; send
          </button>
          <Link
            href={`/missions/${m.id}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            Edit details
          </Link>
          <button onClick={onCancel} className="px-1 text-sm font-medium text-slate-400 transition hover:text-rose-600">
            Cancel
          </button>
          <span className="ml-auto hidden text-[12px] text-slate-400 sm:block">
            {selected.size === 0 && m.candidates.length > 0
              ? "Pick at least one person"
              : "Nothing is sent until you approve"}
          </span>
        </div>
      )}
    </AgentCard>
  );
}

/* ---------------------------------------------------------- activity card */

function ActivityCard({ msg }: { msg: Extract<Msg, { type: "activity" }> }) {
  return (
    <AgentCard>
      <div className="px-6 py-5">
        <Eyebrow tone="text-slate-400">Your agent is working</Eyebrow>
        <ol className="relative mt-3.5 space-y-3.5 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-slate-200">
          {msg.steps.map((step, i) => {
            const state = i < msg.current || msg.done ? "done" : i === msg.current ? "active" : "pending";
            return (
              <li key={i} className="relative flex items-center gap-3 pl-0 text-[14px]">
                {state === "done" ? (
                  <span className="z-10 flex h-[19px] w-[19px] items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">
                    ✓
                  </span>
                ) : state === "active" ? (
                  <span className="z-10 flex h-[19px] w-[19px] items-center justify-center rounded-full bg-white">
                    <span className="spin-slow h-[15px] w-[15px] rounded-full border-2 border-teal-600 border-t-transparent" />
                  </span>
                ) : (
                  <span className="z-10 flex h-[19px] w-[19px] items-center justify-center rounded-full bg-white">
                    <span className="h-2 w-2 rounded-full bg-slate-200" />
                  </span>
                )}
                <span
                  className={
                    state === "pending"
                      ? "text-slate-300"
                      : state === "active"
                        ? "font-medium text-slate-800"
                        : "text-slate-500"
                  }
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </AgentCard>
  );
}

/* ------------------------------------------------------------ result card */

const RESULT_HEAD: Record<string, { title: string; accent: string; eyebrow: string }> = {
  awaiting_initiator_approval: { title: "Here's what I found", accent: "border-l-emerald-600", eyebrow: "text-emerald-700" },
  awaiting_target_approval: { title: "Waiting on the other side", accent: "border-l-amber-500", eyebrow: "text-amber-600" },
  connected: { title: "You're connected", accent: "border-l-emerald-600", eyebrow: "text-emerald-700" },
  not_relevant: { title: "Filtered out — not a fit", accent: "border-l-slate-300", eyebrow: "text-slate-400" },
  declined_by_initiator: { title: "Declined", accent: "border-l-slate-300", eyebrow: "text-slate-400" },
  declined_by_target: { title: "They passed politely", accent: "border-l-slate-300", eyebrow: "text-slate-400" },
};

function ResultCard({
  msg,
  onDecide,
}: {
  msg: Extract<Msg, { type: "result" }>;
  onDecide: (decision: "approved" | "rejected") => void;
}) {
  const r = msg.result;
  const head = RESULT_HEAD[r.status] ?? RESULT_HEAD.not_relevant;
  const showActions = r.waiting_on_you && !msg.decided;

  return (
    <AgentCard className={`border-l-[3px] ${head.accent}`}>
      <div className="px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow tone={head.eyebrow}>{head.title}</Eyebrow>
            <h3 className="mt-1 font-display text-[18px] font-medium tracking-tight text-slate-900">{r.target_name}</h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-[22px] font-medium leading-none text-slate-800">{r.match_score}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">match</p>
          </div>
        </div>

        <p className="mt-3 text-[14px] leading-relaxed text-slate-600">{r.report.summary}</p>

        {(r.report.match_reasons.length > 0 || r.report.risks.length > 0) && (
          <ul className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-3.5">
            {r.report.match_reasons.slice(0, 2).map((reason, i) => (
              <li key={`m${i}`} className="flex gap-2.5 text-[13px] leading-relaxed text-slate-600">
                <span className="mt-px text-emerald-600">✓</span> {reason}
              </li>
            ))}
            {[...r.report.risks.slice(0, 2), ...r.report.missing_info.slice(0, 1)].map((item, i) => (
              <li key={`r${i}`} className="flex gap-2.5 text-[13px] leading-relaxed text-slate-500">
                <span className="mt-px text-amber-500">!</span> {item}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-[14px] font-medium leading-relaxed text-slate-800">
          {r.report.recommendation}
        </p>

        {msg.decided === "approved" && r.status === "awaiting_target_approval" && (
          <p className="mt-3 text-[13.5px] leading-relaxed text-slate-600">
            ✓ Sent. <span className="font-semibold text-slate-800">Waiting for {r.target_name}&apos;s approval</span> —
            contact details stay locked until both sides agree.
          </p>
        )}
        {msg.decided === "rejected" && (
          <p className="mt-3 text-[13.5px] text-slate-600">Declined politely. Nothing was shared.</p>
        )}
        {r.status === "connected" && (
          <p className="mt-3 text-[13.5px] font-medium text-emerald-700">
            Both sides approved — contact details exchanged. Check your contacts.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
        {showActions && (
          <>
            <button
              onClick={() => onDecide("approved")}
              className="rounded-xl bg-teal-700 px-4.5 py-2 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,92,77,0.35)] transition hover:bg-teal-800"
            >
              Approve intro
            </button>
            <button
              onClick={() => onDecide("rejected")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
            >
              Reject politely
            </button>
            <span className="text-[12px] text-slate-400">Nothing sensitive has been shared yet</span>
          </>
        )}
        <Link
          href={`/intros/${r.intro_id}`}
          className="ml-auto text-[12px] font-semibold text-slate-400 transition hover:text-teal-700"
        >
          Full report →
        </Link>
      </div>
    </AgentCard>
  );
}

/* ------------------------------------------------------------------ chat */

const SUGGESTIONS = [
  "Find me a GTM cofounder",
  "Ask Noa if she's open to a short intro — keep product details private",
  "Find someone for feedback on pricing",
  "Find early users for my product",
];

export default function AgentChat({
  agentName,
  initialQuery,
}: {
  agentName: string;
  initialQuery?: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const historyRef = useRef<{ question: string; answer: string }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const bootedRef = useRef(false);

  const push = (...msgs: Omit<Msg, "id">[]) =>
    setMessages((prev) => [...prev, ...msgs.map((m) => ({ ...m, id: mid() }) as Msg)]);
  const dropTyping = () => setMessages((prev) => prev.filter((m) => m.type !== "typing"));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    setBusy(true);

    const history = [...historyRef.current];
    if (pendingQuestion) {
      historyRef.current = [...history, { question: pendingQuestion, answer: trimmed }];
      setPendingQuestion(null);
    }

    push({ type: "user", text: trimmed } as Omit<Msg, "id">, { type: "typing" } as Omit<Msg, "id">);
    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: historyRef.current }),
      });
      const data = await res.json();
      dropTyping();
      if (!res.ok) {
        push({ type: "agent", text: data.error ?? "Something went wrong — try rephrasing that." } as Omit<Msg, "id">);
        return;
      }
      if (data.kind === "clarify") {
        setPendingQuestion(data.question);
        push({ type: "agent", text: `${data.reply} ${data.question}` } as Omit<Msg, "id">);
      } else {
        historyRef.current = [];
        push(
          { type: "agent", text: data.reply } as Omit<Msg, "id">,
          { type: "draft", mission: data.mission, state: "pending" } as Omit<Msg, "id">
        );
      }
    } catch {
      dropTyping();
      push({ type: "agent", text: "I couldn't reach the server — please try again." } as Omit<Msg, "id">);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (initialQuery && !bootedRef.current) {
      bootedRef.current = true;
      void send(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function approve(draftId: number, mission: DraftMission, targets: string[], message: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === draftId && m.type === "draft" ? { ...m, state: "approved" } : m))
    );
    const names = mission.candidates.filter((c) => targets.includes(c.user_id)).map((c) => c.name);
    const steps = [
      "Checking sharing boundaries",
      "Preparing safe outreach",
      `Contacting ${names.join(" and ")}'s agent${names.length > 1 ? "s" : ""}`,
      "Reviewing the response",
      "Writing your summary",
    ];
    const activityId = mid();
    setMessages((prev) => [...prev, { id: activityId, type: "activity", steps, current: 0, done: false }]);

    const stepTimer = setInterval(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === activityId && m.type === "activity" && m.current < steps.length - 1
            ? { ...m, current: m.current + 1 }
            : m
        )
      );
    }, 800);

    try {
      const res = await fetch(`/api/agent/missions/${mission.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets, outreach_message: message }),
      });
      const data = await res.json();
      await new Promise((r) => setTimeout(r, Math.max(0, steps.length * 800 - 400)));
      clearInterval(stepTimer);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === activityId && m.type === "activity" ? { ...m, current: steps.length, done: true } : m
        )
      );
      if (!res.ok) {
        push({ type: "agent", text: data.error ?? "The outreach failed — check the mission page." } as Omit<Msg, "id">);
        return;
      }
      const results: ResultData[] = data.results ?? [];
      const failed = (data.launched ?? []).filter((l: { ok: boolean }) => !l.ok);
      if (results.length) {
        push(
          {
            type: "agent",
            text:
              results.length === 1
                ? `Done — here's my report on ${results[0].target_name}.`
                : `Done — here's what I found for each of the ${results.length} people.`,
          } as Omit<Msg, "id">,
          ...results.map((r) => ({ type: "result", result: r }) as Omit<Msg, "id">)
        );
      }
      for (const f of failed) {
        push({ type: "agent", text: `I couldn't reach ${f.name}: ${f.note}` } as Omit<Msg, "id">);
      }
    } catch {
      clearInterval(stepTimer);
      push({
        type: "agent",
        text: "Something went wrong mid-outreach — check the mission page for the current state.",
      } as Omit<Msg, "id">);
    }
  }

  async function cancelDraft(draftId: number, missionId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === draftId && m.type === "draft" ? { ...m, state: "cancelled" } : m))
    );
    await fetch(`/api/agent/missions/${missionId}/cancel`, { method: "POST" }).catch(() => {});
    push({ type: "agent", text: "No problem — I discarded that mission. Nothing was sent." } as Omit<Msg, "id">);
  }

  async function decide(resultId: number, introId: string, decision: "approved" | "rejected") {
    try {
      const res = await fetch(`/api/agent/intros/${introId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) {
        push({ type: "agent", text: data.error ?? "That decision didn't go through — try the intro page." } as Omit<Msg, "id">);
        return;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === resultId && m.type === "result"
            ? { ...m, decided: decision, result: { ...m.result, status: data.status, waiting_on_you: data.waiting_on_you } }
            : m
        )
      );
    } catch {
      push({ type: "agent", text: "That decision didn't go through — try again." } as Omit<Msg, "id">);
    }
  }

  const empty = messages.length === 0;

  const composer = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void send(input);
      }}
      className="flex w-full items-end gap-2 rounded-[22px] border border-slate-200/90 bg-white p-2 shadow-[0_2px_6px_rgba(29,27,23,0.05),0_18px_50px_-20px_rgba(29,27,23,0.18)] transition focus-within:border-teal-600/50 focus-within:shadow-[0_2px_6px_rgba(29,27,23,0.05),0_18px_50px_-18px_rgba(34,92,77,0.25)]"
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void send(input);
          }
        }}
        rows={1}
        autoFocus
        placeholder={pendingQuestion ? "Answer your agent…" : "Message your agent…"}
        className="max-h-40 min-h-[48px] flex-1 resize-none bg-transparent px-3.5 py-3 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy || !input.trim()}
        className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[15px] bg-slate-900 text-white shadow-sm transition-all duration-150 hover:bg-slate-800 disabled:opacity-25"
        aria-label="Send"
      >
        <IconArrowUp size={17} />
      </button>
    </form>
  );

  /* ---- first-run: calm, centered — like opening a conversation ---- */
  if (empty) {
    return (
      <div className="relative flex flex-1 flex-col items-center justify-center pb-16 text-center">
        <div className="aura" aria-hidden />
        <div className="rise relative">
          <span className="halo absolute -inset-4 rounded-[28px] bg-teal-300/25 blur-2xl" aria-hidden />
          <BrandTile size={56} radius={18} />
        </div>
        <h2 className="rise rise-1 mt-7 max-w-xl font-display text-[36px] font-medium leading-tight tracking-tight text-slate-900">
          What should your agent take&nbsp;care&nbsp;of?
        </h2>
        <p className="rise rise-2 mt-3 max-w-md text-[14.5px] leading-relaxed text-slate-500">
          {agentName} prepares a mission for anything you ask, shows you the exact message it will
          send, and shares nothing without your approval.
        </p>
        <div className="rise rise-3 mt-9 w-full max-w-2xl">{composer}</div>
        <div className="rise rise-4 mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => void send(s)}
              className="rounded-full border border-slate-200/80 bg-white px-4 py-2 text-[13px] text-slate-600 shadow-[0_1px_3px_rgba(29,27,23,0.05)] transition-all duration-150 hover:-translate-y-px hover:border-teal-600/30 hover:text-teal-800 hover:shadow-[0_3px_10px_rgba(29,27,23,0.08)]"
            >
              {s}
            </button>
          ))}
        </div>
        <p className="rise rise-4 mt-8 text-[11.5px] text-slate-400">
          Your agent never contacts anyone or shares anything without your approval.
        </p>
      </div>
    );
  }

  /* ---- active conversation: messages flow, composer docks ---- */
  return (
    <div className="flex h-full min-h-[68vh] flex-col">
      <div className="flex-1 space-y-6 pb-8">
        {messages.map((m) => {
          switch (m.type) {
            case "user":
              return (
                <div key={m.id} className="msg-in flex justify-end">
                  <div className="max-w-[78%] rounded-2xl rounded-br-md bg-slate-900 px-4.5 py-3 text-[15px] leading-relaxed text-slate-50 shadow-[0_2px_10px_rgba(29,27,23,0.18)]">
                    {m.text}
                  </div>
                </div>
              );
            case "agent":
              return (
                <AgentTurn key={m.id}>{m.text}</AgentTurn>
              );
            case "typing":
              return <Typing key={m.id} />;
            case "draft":
              return (
                <DraftCard
                  key={m.id}
                  msg={m}
                  onApprove={(targets, message) => void approve(m.id, m.mission, targets, message)}
                  onCancel={() => void cancelDraft(m.id, m.mission.id)}
                />
              );
            case "activity":
              return <ActivityCard key={m.id} msg={m} />;
            case "result":
              return <ResultCard key={m.id} msg={m} onDecide={(d) => void decide(m.id, m.result.intro_id, d)} />;
          }
        })}
        <div ref={bottomRef} />
      </div>

      {/* docked composer */}
      <div className="sticky bottom-0 -mx-2 bg-gradient-to-t from-background via-background to-transparent px-2 pb-5 pt-8">
        {composer}
        <p className="mt-2.5 text-center text-[11.5px] text-slate-400">
          Your agent never contacts anyone or shares anything without your approval.
        </p>
      </div>
    </div>
  );
}
