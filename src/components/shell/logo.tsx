import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <path
        d="M24.5 8.2A11 11 0 1 0 27 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M11.5 15.5c1.6 2.4 7.4 2.4 9 0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="26.2" cy="11.6" r="1.7" fill="currentColor" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-ink" aria-label="随行美 首页">
      <LogoMark />
      <span className="font-serif text-[22px] font-bold tracking-[0.08em]">随行美</span>
      {!compact && <span className="label-mono hidden pl-2 pt-1 text-[10px] lg:inline">AI Makeup Studio</span>}
    </Link>
  );
}
