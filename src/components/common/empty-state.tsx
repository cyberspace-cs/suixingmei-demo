import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass flex flex-col items-center rounded-[28px] px-6 py-14 text-center", className)}>
      <div className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-lavender/70 to-peach/50 text-ink">{icon}</div>
      <h3 className="mt-5 font-serif text-xl font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/60">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-10 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="glass h-72 animate-pulse rounded-[28px]" />
      ))}
    </div>
  );
}
