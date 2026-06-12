"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Rail navigation item. The rail is permanently dark (evergreen ink), so all
 * colors here are literal — immune to the app light/dark token remapping.
 */
export default function NavLink({
  href,
  icon,
  label,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13.5px] transition-colors duration-150 ${
        active
          ? "bg-white/[0.09] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          : "text-white/55 hover:bg-white/[0.05] hover:text-white/90"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center ${
          active ? "text-[#9adfc3]" : "text-white/35 group-hover:text-white/60"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ecc36c] px-1 text-[10.5px] font-bold text-[#1d1b17]">
          {badge}
        </span>
      )}
    </Link>
  );
}
