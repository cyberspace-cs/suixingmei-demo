import { Info, Sparkles, TrendingUp } from "lucide-react";
import type { ScoreResult } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ScoreRing({ value, size = 120, className }: { value: number; size?: number; className?: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#f1b5a6" />
            <stop offset="0.55" stopColor="#c47684" />
            <stop offset="1" stopColor="#2f2b66" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(47,43,102,0.08)" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="text-center">
        <div className="font-serif text-[34px] font-bold leading-none text-ink" style={{ fontSize: size * 0.3 }}>
          {value}
        </div>
        <div className="mt-1 text-[11px] text-ink/50">参考分</div>
      </div>
    </div>
  );
}

export function ScoreCard({ score, compact = false }: { score: ScoreResult; compact?: boolean }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-5">
        <ScoreRing value={score.total} size={compact ? 104 : 124} />
        <div className="min-w-0 flex-1">
          <div className="label-mono">Reference score</div>
          <div className="mt-1 font-serif text-xl font-semibold text-ink">
            {score.total >= 85 ? "完成度很高" : score.total >= 78 ? "完成得不错" : "已经有模有样"}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink/60">综合 5 个维度给出的妆面完成度参考，不评价长相。</p>
          {score.fallback && (
            <p className="mt-1.5 text-xs text-warning">云端评分暂不可用，当前为本机规则估算</p>
          )}
        </div>
      </div>

      <ul className="space-y-3">
        {score.dimensions.map((d) => (
          <li key={d.key}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-ink">{d.label}</span>
              <span className="font-mono text-[13px] text-ink/70">{d.score}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-peach via-rose to-ink/80"
                style={{ width: `${d.score}%`, transition: "width 1s ease" }}
              />
            </div>
            {!compact && <p className="mt-1 text-xs text-ink/55">{d.note}</p>}
          </li>
        ))}
      </ul>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-success/[0.07] p-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-success">
            <Sparkles className="size-4" /> 亮点
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink/75">{score.highlight}</p>
        </div>
        <div className="rounded-2xl bg-peach/20 p-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-[#b5604d]">
            <TrendingUp className="size-4" /> 下次可以这样改
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink/75">{score.improve}</p>
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-ink/45">
        <Info className="mt-px size-3.5 shrink-0" />
        参考评分只评价妆面完成度（对称、边缘、均匀、饱满、协调），不评价长相与颜值，也不代表专业化妆师意见。
      </p>
    </div>
  );
}
