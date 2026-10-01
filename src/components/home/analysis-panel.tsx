"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronRight,
  CloudOff,
  Loader2,
  Lock,
  Palette,
  PencilLine,
  RefreshCw,
  ScanFace,
} from "lucide-react";
import { STAGES, type Stage } from "@/hooks/use-analysis";
import { useApp } from "@/lib/store";
import type { Session } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ToolsDialog } from "./tools-dialog";
import { FaceDetailDialog } from "./face-detail-dialog";

type Phase = "empty" | "ready" | "analyzing" | "done";

function FaceIcon() {
  return (
    <svg viewBox="0 0 32 32" className="size-8 text-ink" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M16 4.5c-5.2 0-8.5 4-8.5 9.5 0 6.2 4 13.5 8.5 13.5s8.5-7.3 8.5-13.5c0-5.5-3.3-9.5-8.5-9.5z" />
      <path d="M12 14.5h1.5M18.5 14.5H20M14 21c1.2.8 2.8.8 4 0M7.6 12c3-1 6-3.4 7.4-6.4 1.6 3 5 5.4 9.4 6.4" strokeLinecap="round" />
    </svg>
  );
}

export function AnalysisPanel({
  phase,
  session,
  stage,
  doneStages,
  onRetry,
}: {
  phase: Phase;
  session?: Session;
  stage: Stage | null;
  doneStages: Stage[];
  onRetry: () => void;
}) {
  const tools = useApp((s) => s.tools);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [faceOpen, setFaceOpen] = useState(false);

  if (phase !== "done" || !session?.analysis || !session.face) {
    const progress = phase === "analyzing" ? Math.round(((doneStages.length + 0.5) / STAGES.length) * 100) : 0;
    return (
      <section className="glass rounded-[26px] p-5" aria-live="polite">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-ink md:text-xl">专属妆容分析</h2>
          {phase === "analyzing" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs text-ink/70">
              <Loader2 className="size-3.5 animate-spin" /> 分析中 {progress}%
            </span>
          ) : (
            <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-ink/50">{phase === "ready" ? "待识别" : "待上传"}</span>
          )}
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink/60">
          {phase === "empty" && "上传参考妆和自拍后，AI 会按下面 4 步为你生成专属方案。"}
          {phase === "ready" && "照片已就绪，点击「开始识别」，大约需要 5 秒。"}
          {phase === "analyzing" && "正在把参考妆转成适合你脸型的步骤，请稍候。"}
        </p>
        {phase === "analyzing" && (
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-ink/[0.07]">
            <div className="h-full rounded-full bg-gradient-to-r from-peach via-rose to-ink transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        )}
        <ol className="mt-4 space-y-1">
          {STAGES.map((s, i) => {
            const isDone = doneStages.includes(s.key);
            const isActive = stage === s.key;
            return (
              <li
                key={s.key}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition",
                  isActive && "bg-white/80 shadow-sm",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-medium",
                    isDone ? "border-success bg-success text-white" : isActive ? "border-ink bg-ink text-white" : "border-ink/15 text-ink/50",
                  )}
                >
                  {isDone ? <Check className="size-3.5" /> : isActive ? <Loader2 className="size-3.5 animate-spin" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm", isDone || isActive ? "font-medium text-ink" : "text-ink/70")}>{s.label}</span>
                  <span className="block text-[11px] text-ink/45">{s.detail}</span>
                </span>
                <span className="hidden shrink-0 text-[10px] text-ink/40 xl:block">{s.where}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-ink/[0.04] px-3 py-2 text-[11px] text-ink/55">
          <Lock className="size-3.5 shrink-0" /> 自拍只在本机分析，不会上传到云端。
        </p>
      </section>
    );
  }

  const { analysis, face } = session;
  const adjustCount = session.adapt?.adjustments.filter((a) => session.plan.find((p) => p.key === a.part)?.included).length ?? 0;

  return (
    <section className="glass rounded-[26px] p-5" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-serif text-lg font-semibold text-ink md:text-xl">专属妆容分析</h2>
        {analysis.fallback ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs text-warning">
            <CloudOff className="size-3.5" /> 本机识别
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs text-ink/70">
            <CheckCircle2 className="size-4 fill-success text-white" /> 分析完成
          </span>
        )}
      </div>

      {analysis.fallback && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-warning/10 p-3 text-xs leading-relaxed text-[#8a5a1c]">
          <span className="flex-1">云端解析超时，已切换为本机识别，妆型与配色仅供参考。</span>
          <button onClick={onRetry} className="inline-flex shrink-0 items-center gap-1 font-medium text-ink">
            <RefreshCw className="size-3" /> 重试
          </button>
        </div>
      )}

      <button
        onClick={() => setFaceOpen(true)}
        className="mt-3 flex w-full items-center gap-3 border-b border-ink/[0.08] py-3 text-left"
        aria-label="查看脸型分析详情"
      >
        <FaceIcon />
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-ink/60">脸型分析</span>
          <span className="block font-serif text-2xl font-bold text-ink">{face.faceShapeLabel}</span>
          <span className="block text-xs text-ink/55">{face.summary}</span>
        </span>
        <ChevronRight className="size-5 text-ink/60" />
      </button>

      <div className="border-b border-ink/[0.08] py-3.5">
        <div className="flex items-center gap-2 text-[13px] text-ink/70">
          <Palette className="size-4" /> 妆容配色
          <span className="ml-auto text-[11px] text-ink/45">{analysis.styleLabel}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {analysis.palette.map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-1.5">
              <span className="size-12 rounded-full shadow-[inset_0_-4px_8px_rgba(0,0,0,0.08),0_6px_14px_-8px_rgba(0,0,0,0.3)]" style={{ background: s.hex }} />
              <span className="text-[11px] text-ink/70">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="py-3.5">
        <div className="flex items-center gap-2 text-[13px] text-ink/70">
          <Briefcase className="size-4" /> 手边工具
          <button onClick={() => setToolsOpen(true)} className="ml-auto inline-flex items-center gap-1 text-xs text-ink hover:underline">
            <PencilLine className="size-3.5" /> 编辑
          </button>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {tools.slice(0, 3).map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full border border-white bg-white/70 px-2.5 py-1 text-xs text-ink">
              <CheckCircle2 className="size-3.5 fill-ink text-white" /> {t}
            </span>
          ))}
          {tools.length > 3 && (
            <button onClick={() => setToolsOpen(true)} className="rounded-full bg-ink/[0.05] px-2.5 py-1 text-xs text-ink/60">
              +{tools.length - 3}
            </button>
          )}
        </div>
      </div>

      <Link
        href="/plan"
        className="flex h-12 items-center justify-between rounded-full border border-ink/25 bg-white/60 px-4 text-sm text-ink transition hover:bg-white"
      >
        <span className="flex items-center gap-2">
          <ScanFace className="size-4" /> 脸型与期待妆容对比分析
        </span>
        <span className="flex items-center gap-1 text-xs text-ink/50">
          {adjustCount > 0 && `${adjustCount} 处调整`} <ArrowRight className="size-4 text-ink" />
        </span>
      </Link>

      <ToolsDialog open={toolsOpen} onOpenChange={setToolsOpen} />
      <FaceDetailDialog open={faceOpen} onOpenChange={setFaceOpen} session={session} />
    </section>
  );
}
