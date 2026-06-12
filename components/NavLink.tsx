"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/")) || pathname === href;

  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13.5px] transition-colors duration-150 ${
        active
          ? "bg-white/[0.09] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          : "text-emerald-50/55 hover:bg-white/[0.05] hover:text-emerald-50/90"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center text-[13px] ${
          active ? "text-emerald-200" : "text-emerald-50/35 group-hover:text-emerald-50/60"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-300/90 px-1 text-[10.5px] font-bold text-stone-900">
          {badge}
        </span>
      )}
    </Link>
  );
}
