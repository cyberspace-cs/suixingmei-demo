"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock3, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "工作台", icon: Sparkles },
  { href: "/looks", label: "我的妆容", icon: UserRound },
  { href: "/history", label: "历史", icon: Clock3 },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="glass-strong fixed inset-x-3 bottom-3 z-40 flex h-16 items-center justify-around rounded-2xl md:hidden" aria-label="底部导航">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn("flex flex-col items-center gap-1 px-4 text-[11px]", active ? "text-ink" : "text-ink/45")}
          >
            <Icon className={cn("size-5", active && "stroke-[2.4]")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
