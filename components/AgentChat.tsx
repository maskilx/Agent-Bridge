"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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

function AgentAvatar() {
  return (
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-emerald-500 text-sm font-semibold text-white shadow-sm">
      ✦
    </span>
  );
}

function AgentBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <AgentAvatar />
      <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-slate-200/80 bg-white px-4 py-3 text-[15px] leading-relaxed text-slate-700 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function CardShell({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "warm" | "good" | "muted" }) {
  const toneCls =
    tone === "warm"
      ? "border-amber-200 bg-amber-50/30"
      : tone === "good"
        ? "border-emerald-200 bg-emerald-50/30"
        : tone === "muted"
          ? "border-slate-200 bg-slate-50/60"
          : "border-slate-200 bg-white";
  return (
    <div className="flex items-start gap-3">
      <span className="w-8 shrink-0" />
      <div className={`w-full max-w-[85%] rounded-2xl border p-5 shadow-sm ${toneCls}`}>{children}</div>
    </div>
  );
}

function Typing() {
  return (
    <AgentBubble>
      <span className="flex items-center gap-1.5 py-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-slate-300"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    </AgentBubble>
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
  const defaults = new Set(
    m.candidates.filter((c) => c.named || c.recommended).map((c) => c.user_id)
  );
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
    <CardShell tone={msg.state === "cancelled" ? "muted" : "default"}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Mission draft</p>
        {msg.state === "approved" && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Approved ✓</span>
        )}
        {msg.state === "cancelled" && (
          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-500">Discarded</span>
        )}
      </div>
      <h3 className="mt-1.5 text-base font-semibold text-slate-900">{m.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{m.goal}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-emerald-50/70 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Will share</p>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{m.allowed_to_share}</p>
        </div>
        <div className="rounded-xl bg-rose-50/60 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-rose-600">
            Stays private <span className="font-normal normal-case text-rose-400">· only you see this</span>
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{m.must_not_share}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            The exact message the other agent receives — nothing else
          </p>
          {!locked && (
            <button
              onClick={() => setEditing((e) => !e)}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900"
            >
              {editing ? "Done" : "Edit message"}
            </button>
          )}
        </div>
        {editing && !locked ? (
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="mt-1.5 w-full rounded-xl border border-teal-300 px-3.5 py-2.5 text-sm leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        ) : (
          <blockquote className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm italic leading-relaxed text-slate-700">
            “{message}”
          </blockquote>
        )}
      </div>

      {m.candidates.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Send to</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {m.candidates.map((c) => {
              const on = selected.has(c.user_id);
              return (
                <button
                  key={c.user_id}
                  disabled={locked}
                  onClick={() => toggle(c.user_id)}
                  title={c.fit}
                  className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
                    on
                      ? "border-teal-500 bg-teal-50 text-teal-800"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <span className={`text-xs ${on ? "text-teal-600" : "text-slate-300"}`}>{on ? "✓" : "+"}</span>
                  {c.name}
                  {c.named && <span className="text-[10px] text-teal-600">(named)</span>}
                  <span className="text-xs text-slate-400">{c.score}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!locked && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={() => onApprove([...selected], message)}
            disabled={selected.size === 0}
            className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
          >
            Approve &amp; send
          </button>
          <Link
            href={`/missions/${m.id}`}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-800"
          >
            Edit details
          </Link>
          <button
            onClick={onCancel}
            className="text-sm font-semibold text-slate-400 transition hover:text-rose-600"
          >
            Cancel
          </button>
          {selected.size === 0 && m.candidates.length > 0 && (
            <span className="text-xs text-slate-400">Pick at least one person to contact</span>
          )}
        </div>
      )}
      {!locked && (
        <p className="mt-3 text-xs text-slate-400">
          Nothing is sent until you approve. Contact details stay locked until both sides agree.
        </p>
      )}
    </CardShell>
  );
}

/* ---------------------------------------------------------- activity card */

function ActivityCard({ msg }: { msg: Extract<Msg, { type: "activity" }> }) {
  return (
    <CardShell tone="muted">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Your agent at work</p>
      <ol className="mt-2.5 space-y-2">
        {msg.steps.map((step, i) => {
          const state = i < msg.current ? "done" : i === msg.current && !msg.done ? "active" : i === msg.current ? "done" : "pending";
          return (
            <li key={i} className="flex items-center gap-2.5 text-sm">
              {state === "done" ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-600">✓</span>
              ) : state === "active" ? (
                <span className="relative flex h-5 w-5 items-center justify-center">
                  <span className="absolute h-4 w-4 animate-ping rounded-full bg-teal-200 opacity-75" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-teal-500" />
                </span>
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100" />
              )}
              <span className={state === "pending" ? "text-slate-300" : state === "active" ? "font-medium text-slate-700" : "text-slate-500"}>
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </CardShell>
  );
}

/* ------------------------------------------------------------ result card */

const RESULT_HEAD: Record<string, { title: string; tone: "good" | "warm" | "muted" }> = {
  awaiting_initiator_approval: { title: "Here's what I found", tone: "good" },
  awaiting_target_approval: { title: "Waiting on the other side", tone: "warm" },
  connected: { title: "You're connected", tone: "good" },
  not_relevant: { title: "Filtered out — not a fit", tone: "muted" },
  declined_by_initiator: { title: "Declined", tone: "muted" },
  declined_by_target: { title: "They passed politely", tone: "muted" },
};

function ResultCard({
  msg,
  onDecide,
}: {
  msg: Extract<Msg, { type: "result" }>;
  onDecide: (decision: "approved" | "rejected") => void;
}) {
  const r = msg.result;
  const head = RESULT_HEAD[r.status] ?? { title: "Update", tone: "muted" as const };
  const showActions = r.waiting_on_you && !msg.decided;

  return (
    <CardShell tone={head.tone}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {head.title} · {r.target_name}
        </p>
        <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
          match {r.match_score}/100
        </span>
      </div>

      <p className="mt-2.5 text-sm leading-relaxed text-slate-700">{r.report.summary}</p>

      {r.report.match_reasons.length > 0 && (
        <ul className="mt-3 space-y-1">
          {r.report.match_reasons.slice(0, 2).map((reason, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-slate-600">
              <span className="text-emerald-500">✓</span> {reason}
            </li>
          ))}
        </ul>
      )}
      {(r.report.risks.length > 0 || r.report.missing_info.length > 0) && (
        <ul className="mt-2 space-y-1">
          {[...r.report.risks.slice(0, 2), ...r.report.missing_info.slice(0, 1)].map((item, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-slate-500">
              <span className="text-amber-500">!</span> {item}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 rounded-xl bg-white/70 px-3.5 py-2.5 text-sm font-medium text-slate-800 ring-1 ring-slate-200">
        {r.report.recommendation}
      </p>

      {msg.decided === "approved" && r.status === "awaiting_target_approval" && (
        <p className="mt-3 text-sm text-slate-600">
          ✓ Sent. <span className="font-semibold">Waiting for {r.target_name}&apos;s approval</span> — contact
          details stay locked until both sides agree. I&apos;ll surface it on your dashboard when they respond.
        </p>
      )}
      {msg.decided === "rejected" && (
        <p className="mt-3 text-sm text-slate-600">Declined politely. Nothing was shared.</p>
      )}
      {r.status === "connected" && (
        <p className="mt-3 text-sm font-medium text-emerald-700">
          🎉 Both sides approved — contact details exchanged. Check your contacts.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {showActions && (
          <>
            <button
              onClick={() => onDecide("approved")}
              className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Approve intro
            </button>
            <button
              onClick={() => onDecide("rejected")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600"
            >
              Reject politely
            </button>
          </>
        )}
        <Link href={`/intros/${r.intro_id}`} className="text-xs font-semibold text-slate-400 hover:text-teal-700">
          Full report &amp; technical details →
        </Link>
      </div>
      {showActions && (
        <p className="mt-2.5 text-xs text-slate-400">Nothing sensitive has been shared yet.</p>
      )}
    </CardShell>
  );
}

/* ------------------------------------------------------------------ chat */

const SUGGESTIONS = [
  "Find me a GTM cofounder",
  "Ask Noa if she's open to a short intro, but don't share product details",
  "Find someone who can give feedback on pricing",
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

    // Animate steps while the server runs the real outreach.
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
      // Let the animation reach the end gracefully.
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
      push({ type: "agent", text: "Something went wrong mid-outreach — check the mission page for the current state." } as Omit<Msg, "id">);
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

  return (
    <div className="flex h-full min-h-[60vh] flex-col">
      <div className="flex-1 space-y-5 pb-6">
        {empty && (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-500 text-2xl text-white shadow-lg shadow-teal-200/60">
              ✦
            </span>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
              What do you want your agent to do?
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              {agentName} drafts a mission for anything you ask, shows you exactly what it will say,
              and never shares anything without your approval.
            </p>
          </div>
        )}

        {messages.map((m) => {
          switch (m.type) {
            case "user":
              return (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3 text-[15px] leading-relaxed text-white shadow-sm">
                    {m.text}
                  </div>
                </div>
              );
            case "agent":
              return <AgentBubble key={m.id}>{m.text}</AgentBubble>;
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
              return (
                <ResultCard key={m.id} msg={m} onDecide={(d) => void decide(m.id, m.result.intro_id, d)} />
              );
          }
        })}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 -mx-2 bg-gradient-to-t from-[#f7f8fc] via-[#f7f8fc] to-transparent px-2 pb-4 pt-6">
        {empty && (
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => void send(s)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm transition hover:border-teal-300 hover:bg-teal-50/40"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/50 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100"
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
            placeholder={pendingQuestion ? "Answer your agent…" : "Message your agent…"}
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white shadow-sm transition hover:opacity-90 disabled:opacity-30"
            aria-label="Send"
          >
            ↑
          </button>
        </form>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Your agent never contacts anyone or shares anything without your approval.
        </p>
      </div>
    </div>
  );
}
