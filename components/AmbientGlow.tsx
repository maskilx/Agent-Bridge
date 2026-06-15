"use client";

import { usePathname } from "next/navigation";

/**
 * App-wide ambient atmosphere: large, soft, slowly drifting emerald/mint/green
 * orbs behind all content. Stronger on the home and ask surfaces, subtle
 * everywhere else. Pure CSS, low opacity (readability untouched), and disabled
 * under prefers-reduced-motion via globals.css.
 */
export function AmbientGlow() {
  const path = usePathname();
  const strong = path === "/dashboard" || path === "/ask" || path.startsWith("/ask/");
  return (
    <div className={`ab-ambient${strong ? " ab-ambient-strong" : ""}`} aria-hidden>
      <span className="ab-orb ab-orb-1" />
      <span className="ab-orb ab-orb-2" />
      <span className="ab-orb ab-orb-3" />
    </div>
  );
}
