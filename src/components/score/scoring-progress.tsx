"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["对齐妆前妆后的五官位置", "检查左右对称与边缘", "评估色彩均匀与妆感", "生成参考分与改进建议"];

export function ScoringProgress() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((x) => Math.min(x + 1, STEPS.length - 1)), 650);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center py-8 text-center">
      <div className="relative grid size-28 place-items-center">
        <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-ink/10 border-t-rose [animation-duration:1.4s]" />
        <span className="absolute inset-3 animate-spin rounded-full border-[3px] border-transparent border-b-peach [animation-direction:reverse] [animation-duration:2.2s]" />
        <span className="font-serif text-lg font-semibold text-ink">评分中</span>
      </div>
      <p className="mt-5 font-serif text-xl font-semibold text-ink">AI 正在对比妆前和妆后</p>
      <p className="mt-1 text-xs text-ink/55">只评价妆面完成度，不评价长相</p>
      <ol className="mt-6 w-full max-w-xs space-y-2 text-left">
        {STEPS.map((s, k) => (
          <li key={s} className={cn("flex items-center gap-2.5 text-sm transition", k <= i ? "text-ink" : "text-ink/35")}>
            <span className={cn("grid size-5 place-items-center rounded-full", k < i ? "bg-success text-white" : k === i ? "bg-ink text-white" : "border border-ink/20")}>
              {k < i ? <Check className="size-3" /> : k === i ? <Loader2 className="size-3 animate-spin" /> : null}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
