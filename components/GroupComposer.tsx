"use client";

import { useRef, useState } from "react";
import { askGroupAction, groupSendAction, summarizeGroupAction } from "@/lib/actions";

type Member = { userId: string; name: string };

export function GroupComposer({ groupId, members }: { groupId: string; members: Member[] }) {
  const [text, setText] = useState("");
  const [directed, setDirected] = useState<Member | null>(null);
  const [open, setOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // A leading "/name" addresses one member's agent (everyone still sees it).
  const slash = text.match(/^\/([^\s]*)$/);
  const query = slash ? slash[1].toLowerCase() : "";
  const matches = members.filter((m) => m.name.toLowerCase().includes(query));

  function onChange(v: string) {
    setText(v);
    setOpen(/^\/[^\s]*$/.test(v));
    if (!v.startsWith("/") || (directed && !v.startsWith(`/${directed.name.split(" ")[0]}`))) {
      setDirected(null);
    }
  }

  function pick(m: Member) {
    setDirected(m);
    setText(`/${m.name.split(" ")[0]} `);
    setOpen(false);
    taRef.current?.focus();
  }

  return (
    <div className="border-t border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur-sm">
      {/* quick actions */}
      <div className="mb-2 flex flex-wrap gap-2">
        <form action={askGroupAction}>
          <input type="hidden" name="groupId" value={groupId} />
          <button className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-medium text-slate-600 transition hover:border-teal-300 hover:text-teal-700">
            Ask the group&apos;s agents
          </button>
        </form>
        <form action={summarizeGroupAction}>
          <input type="hidden" name="groupId" value={groupId} />
          <button className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-medium text-slate-600 transition hover:border-teal-300 hover:text-teal-700">
            Summarize where the group stands
          </button>
        </form>
      </div>

      {directed && (
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-[12px] font-medium text-teal-700 ring-1 ring-teal-200">
          → directed to {directed.name}&apos;s agent
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

      <div className={`composer-glow relative rounded-[20px] p-1`} data-thinking={directed ? "true" : undefined}>
        {open && matches.length > 0 && (
          <div className="absolute bottom-full left-0 z-10 mb-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <p className="border-b border-slate-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Address one agent
            </p>
            {matches.map((m) => (
              <button
                key={m.userId}
                type="button"
                onClick={() => pick(m)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 transition hover:bg-teal-50"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3a8a6f] text-[10px] font-semibold text-white">
                  {m.name.slice(0, 1).toUpperCase()}
                </span>
                {m.name}&apos;s agent
              </button>
            ))}
          </div>
        )}
        <form action={groupSendAction} className="flex items-end gap-2">
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="directedTo" value={directed?.userId ?? ""} />
          <textarea
            ref={taRef}
            name="content"
            value={text}
            onChange={(e) => onChange(e.target.value)}
            rows={1}
            required
            placeholder="Message the group… or type / to address one agent"
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
        Everyone sees group messages. Type <span className="font-mono text-slate-500">/name</span> to ask one agent —
        sensitive actions still need each owner&apos;s approval.
      </p>
    </div>
  );
}
