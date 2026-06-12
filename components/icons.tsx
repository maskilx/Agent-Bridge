/**
 * AgentBridge iconography.
 *
 * Brand mark: the "bridge relay" — two parties joined by an arc, with the
 * agent as the accent node at the apex. Used as a tile (BrandTile) across the
 * product. Everything else is a consistent 1.6px-stroke icon set so the UI
 * reads as one drawn system rather than mixed glyphs.
 */

export function BridgeGlyph({
  size = 18,
  className = "",
  accent = "#7fd1b0",
}: {
  size?: number;
  className?: string;
  accent?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <path
        d="M5 23.5 C 10 12, 22 12, 27 23.5"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="5" cy="23.5" r="2.9" fill="currentColor" fillOpacity="0.85" />
      <circle cx="27" cy="23.5" r="2.9" fill="currentColor" fillOpacity="0.85" />
      <circle cx="16" cy="13.6" r="4.9" fill={accent} />
      <circle cx="16" cy="13.6" r="1.8" fill="#10201c" />
    </svg>
  );
}

/** The product mark: evergreen tile carrying the bridge relay. */
export function BrandTile({ size = 32, radius }: { size?: number; radius?: number }) {
  const r = radius ?? Math.round(size * 0.3);
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, borderRadius: r }}
      className="relative inline-flex shrink-0 items-center justify-center bg-[#16312a] text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_8px_rgba(20,40,34,0.35)]"
    >
      <span
        aria-hidden
        style={{ borderRadius: r }}
        className="absolute inset-0 bg-[radial-gradient(120%_120%_at_30%_15%,rgba(127,209,176,0.22),transparent_55%)]"
      />
      <BridgeGlyph size={Math.round(size * 0.66)} className="relative" />
    </span>
  );
}

/* ---------------- stroke icon set (1.6px, 24 grid) ---------------- */

type IconProps = { size?: number; className?: string };

function I({ children, size = 16, className = "" }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: IconProps) => (
  <I {...p}>
    <path d="M4 11.5 12 4.5l8 7" />
    <path d="M6.5 10v8.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V10" />
  </I>
);

export const IconMission = (p: IconProps) => (
  <I {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3.4" />
    <path d="M12 1.8v3.4M12 18.8v3.4M1.8 12h3.4M18.8 12h3.4" strokeWidth="0" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
  </I>
);

export const IconIntro = (p: IconProps) => (
  <I {...p}>
    <circle cx="5.5" cy="17" r="2.4" />
    <circle cx="18.5" cy="17" r="2.4" />
    <path d="M6.5 13.5C8 9 16 9 17.5 13.5" />
    <circle cx="12" cy="8.4" r="1.6" fill="currentColor" stroke="none" />
  </I>
);

export const IconInbox = (p: IconProps) => (
  <I {...p}>
    <path d="M4 13.5 6 6a1.4 1.4 0 0 1 1.35-1h9.3A1.4 1.4 0 0 1 18 6l2 7.5V18a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 18Z" />
    <path d="M4 13.5h4.6l1.1 2.1h4.6l1.1-2.1H20" />
  </I>
);

export const IconMatches = (p: IconProps) => (
  <I {...p}>
    <circle cx="9" cy="9.4" r="3.1" />
    <path d="M3.8 19.2c.7-3 2.9-4.6 5.2-4.6s4.5 1.6 5.2 4.6" />
    <circle cx="16.8" cy="8.2" r="2.3" />
    <path d="M16.4 13.3c2 .2 3.5 1.6 4 4" />
  </I>
);

export const IconContacts = (p: IconProps) => (
  <I {...p}>
    <rect x="5" y="3.8" width="14" height="16.4" rx="2" />
    <path d="M9 3.8v16.4" />
    <path d="M13.8 9.4h2.6M13.8 12.6h2.6" />
  </I>
);

export const IconSearch = (p: IconProps) => (
  <I {...p}>
    <circle cx="11" cy="11" r="6.2" />
    <path d="m19.6 19.6-3.3-3.3" />
  </I>
);

export const IconAgent = (p: IconProps) => (
  <I {...p}>
    <path d="M5.5 18.5C7.5 11.5 16.5 11.5 18.5 18.5" />
    <circle cx="5.5" cy="18.5" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="18.5" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="8.2" r="3" />
    <circle cx="12" cy="8.2" r="0.9" fill="currentColor" stroke="none" />
  </I>
);

export const IconSessions = (p: IconProps) => (
  <I {...p}>
    <path d="M4.5 6.8A2.3 2.3 0 0 1 6.8 4.5h10.4a2.3 2.3 0 0 1 2.3 2.3v7a2.3 2.3 0 0 1-2.3 2.3H9.6L5.8 19.4a.8.8 0 0 1-1.3-.6Z" />
    <path d="M8.5 9h7M8.5 12h4.4" />
  </I>
);

export const IconSettings = (p: IconProps) => (
  <I {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.2v2.2M12 18.6v2.2M3.2 12h2.2M18.6 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6" />
  </I>
);

export const IconSun = (p: IconProps) => (
  <I {...p}>
    <circle cx="12" cy="12" r="3.6" />
    <path d="M12 3.4v2M12 18.6v2M3.4 12h2M18.6 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
  </I>
);

export const IconMoon = (p: IconProps) => (
  <I {...p}>
    <path d="M19.5 14.2A7.6 7.6 0 0 1 9.8 4.5a7.6 7.6 0 1 0 9.7 9.7Z" />
  </I>
);

export const IconSystem = (p: IconProps) => (
  <I {...p}>
    <rect x="3.6" y="4.6" width="16.8" height="11.4" rx="1.8" />
    <path d="M9.4 19.4h5.2M12 16v3.4" />
  </I>
);

export const IconLogOut = (p: IconProps) => (
  <I {...p}>
    <path d="M14 4.5H6.8A1.8 1.8 0 0 0 5 6.3v11.4a1.8 1.8 0 0 0 1.8 1.8H14" />
    <path d="M16.5 8.5 20 12l-3.5 3.5M20 12H9.5" />
  </I>
);

export const IconArrowUp = (p: IconProps) => (
  <I {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </I>
);
