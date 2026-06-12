"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun, IconSystem } from "@/components/icons";

type Pref = "light" | "dark" | "system";

function apply(pref: Pref) {
  const resolved =
    pref === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : pref;
  document.documentElement.dataset.appTheme = resolved;
}

export default function ThemeSelector() {
  const [pref, setPref] = useState<Pref>("system");

  useEffect(() => {
    setPref((localStorage.getItem("ab-app-theme") as Pref) || "system");
  }, []);

  useEffect(() => {
    apply(pref);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => pref === "system" && apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const choose = (p: Pref) => {
    setPref(p);
    localStorage.setItem("ab-app-theme", p);
  };

  const OPTIONS: { value: Pref; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <IconSun size={15} /> },
    { value: "dark", label: "Dark", icon: <IconMoon size={15} /> },
    { value: "system", label: "System", icon: <IconSystem size={15} /> },
  ];

  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => choose(o.value)}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition ${
            pref === o.value
              ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(29,27,23,0.1)]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
