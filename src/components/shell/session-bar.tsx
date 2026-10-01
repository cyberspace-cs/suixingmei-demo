import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function SessionBar({
  backHref,
  backLabel,
  title,
  subtitle,
  actions,
  className,
}: {
  backHref: string;
  backLabel: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-[13px] text-ink/60 transition hover:text-ink">
          <ArrowLeft className="size-4" /> {backLabel}
        </Link>
        <h1 className="mt-1 truncate font-serif text-2xl font-bold tracking-wide text-ink md:text-[30px]">{title}</h1>
        {subtitle && <div className="mt-0.5 text-[13px] text-ink/60 md:text-sm">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
