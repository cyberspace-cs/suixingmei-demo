"use client";

import { Check } from "lucide-react";
import { PartGlyph } from "@/components/common/part-glyph";
import type { PartPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PartStepper({
  parts,
  current,
  done,
  onJump,
}: {
  parts: PartPlan[];
  current: number;
  done: string[];
  onJump: (i: number) => void;
}) {
  return (
    <nav className="glass scrollbar-none flex items-center gap-1 overflow-x-auto rounded-full p-1.5" aria-label="跟妆部位">
      {parts.map((p, i) => {
        const doneCount = p.steps.filter((s) => done.includes(s.id)).length;
        const complete = doneCount === p.steps.length;
        const active = i === current;
        return (
          <div key={p.key} className="flex shrink-0 items-center gap-1 lg:flex-1">
            <button
              onClick={() => onJump(i)}
              className={cn(
                "group flex h-10 w-full items-center justify-center gap-2 rounded-full px-3.5 text-sm transition",
                active ? "bg-ink text-white shadow-[0_8px_20px_-10px_rgba(38,35,95,0.8)]" : "text-ink/70 hover:bg-white/80",
              )}
              aria-current={active ? "step" : undefined}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full",
                  active ? "bg-white/15" : complete ? "bg-success text-white" : "bg-ink/[0.06]",
                )}
              >
                {complete && !active ? <Check className="size-3.5" /> : <PartGlyph part={p.key} className="size-4" />}
              </span>
              <span className="whitespace-nowrap font-medium">{p.label}</span>
              <span className={cn("font-mono text-[11px]", active ? "text-white/70" : "text-ink/40")}>
                {doneCount}/{p.steps.length}
              </span>
            </button>
            {i < parts.length - 1 && <span className="hidden h-px w-4 shrink-0 bg-ink/15 xl:block" />}
          </div>
        );
      })}
    </nav>
  );
}
