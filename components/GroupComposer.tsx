"use client";

import { useRef, useState } from "react";
import { askGroupAction, groupSendAction, summarizeGroupAction } from "@/lib/actions";

type Member = { userId: string; name: string };
type Directed = { userId: string; kind: "owner" | "agent"; name: string };

export function GroupComposer({ groupId, members }: { groupId: string; members: Member[] }) {
  const [text, setText] = useState("");
  const [directed, setDirected] = useState<Directed | null>(null);
  const [open, setOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // @-mention: the token currently being typed (last word starting with @).
  const token = text.match(/@([^\s@]*)$/);
  const query = token ? token[1].toLowerCase() : "";
  const matches = token ? members.filter((m) => m.name.toLowerCase().includes(query)) : [];

  function onChange(v: string) {
    setText(v);
    setOpen(/@[^\s@]*$/.test(v));
    // drop the directed target if its mention text is no longer present
    if (directed) {
      const tag = directed.kind === "agent" ? `@${directed.name}'s agent` : `@${directed.name}`;
      if (!v.includes(tag)) setDirected(null);
    }
  }

  function pick(m: Member, kind: "owner" | "agent") {
    const tag = kind === "agent" ? `@${m.name}'s agent` : `@${m.name}`;
    setText(text.replace(/@[^\s@]*$/, tag + " "));
    setDirected({ userId: m.userId, kind, name: m.name });
    setOpen(false);
    taRef.current?.focus();
  }

  return (
    <div className="border-t border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur-sm">
      <div className="mb-2 flex flex-wrap gap-2">
        <form action={askGroupAction}>
          <input type="hidden" name="groupId" value={groupId} />
          <button className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-medium text-slate-600 transition hover:border-teal-300 hover:text-teal-700">
            Ask everyone&apos;s agents
          </button>
        </form>
        <form action={summarizeGroupAction}>
          <input type="hidden" name="groupId" value={groupId} />
          <button className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-medium text-slate-600 transition hover:border-teal-300 hover:text-teal-700">
            Summarize where things stand
          </button>
        </form>
      </div>

      {directed && (
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-[12px] font-medium text-teal-700 ring-1 ring-teal-200">
          → to {directed.name}
          {directed.kind === "agent" ? "’s agent" : " (they’ll see it)"}
          <button
            type="button"
            onClick={() => {
              setDirected(null);
              setText("");
              taRef.current?.focus();
            }}
            className="text-teal-500 hover:text-teal-800"
          >
            ✕
          </button>
        </div>
      )}

      <div className="composer-glow relative rounded-[20px] p-1" data-thinking={directed ? "true" : undefined}>
        {open && matches.length > 0 && (
          <div className="absolute bottom-full left-0 z-10 mb-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <p className="border-b border-slate-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Mention a person or their agent
            </p>
            {matches.map((m) => (
              <div key={m.userId} className="border-b border-slate-50 last:border-0">
                <button
                  type="button"
                  onClick={() => pick(m, "owner")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 transition hover:bg-teal-50"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3a8a6f] text-[10px] font-semibold text-white">
                    {m.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="flex-1">{m.name}</span>
                  <span className="text-[10px] text-slate-400">person</span>
                </button>
                <button
                  type="button"
                  onClick={() => pick(m, "agent")}
                  className="flex w-full items-center gap-2 px-3 py-2 pl-11 text-left text-[12.5px] text-slate-600 transition hover:bg-teal-50"
                >
                  {m.name}&apos;s agent
                  <span className="ml-auto text-[10px] text-teal-600">replies</span>
                </button>
              </div>
            ))}
          </div>
        )}
        <form action={groupSendAction} className="flex items-end gap-2">
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="directedTo" value={directed?.userId ?? ""} />
          <input type="hidden" name="directedKind" value={directed?.kind ?? ""} />
          <textarea
            ref={taRef}
            name="content"
            value={text}
            onChange={(e) => onChange(e.target.value)}
            rows={1}
            required
            placeholder="Message the group… type @ to mention a person or their agent"
            className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-teal-700 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-teal-800"
          >
            Send
          </button>
        </form>
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-slate-400">
        Everyone sees group messages. <span className="font-mono text-slate-500">@</span> a person to flag them, or their
        agent to get a reply — sensitive actions still need each owner&apos;s approval.
      </p>
    </div>
  );
}
