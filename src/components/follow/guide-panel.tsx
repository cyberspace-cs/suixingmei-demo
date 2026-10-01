"use client";

import { ArrowRight, Camera, Check, CheckCircle2, Clock, Pause, Play, RotateCcw, SkipBack, Sparkles, Wrench } from "lucide-react";
import { PartGlyph } from "@/components/common/part-glyph";
import type { CheckRecord, PartPlan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/common/check-view";

export function GuidePanel(props: {
  part: PartPlan;
  partIndex: number;
  partsCount: number;
  stepIndex: number;
  done: string[];
  nextPart?: PartPlan;
  referenceImage: string;
  faceShapeLabel: string;
  speaking: boolean;
  paused: boolean;
  partChecks: CheckRecord[];
  onPrev: () => void;
  onReplay: () => void;
  onTogglePause: () => void;
  onJumpStep: (j: number) => void;
  onCheck: () => void;
  onNext: () => void;
}) {
  const { part, stepIndex } = props;
  const complete = stepIndex >= part.steps.length;
  const step = complete ? null : part.steps[stepIndex];

  if (complete) {
    const lastCheck = props.partChecks[0];
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 text-center">
          <div className="grid size-16 place-items-center rounded-full bg-success/12 text-success">
            <CheckCircle2 className="size-8" />
          </div>
          <div className="label-mono mt-4">{part.enLabel} · Done</div>
          <h3 className="mt-1 font-serif text-[26px] font-bold text-ink">{part.label}完成</h3>
          <p className="mt-1 text-sm text-ink/60">
            {part.steps.length}/{part.steps.length} 小步 · 第 {props.partIndex + 1} / {props.partsCount} 个部位
          </p>

          {lastCheck ? (
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-2.5 text-[13px] text-ink/75">
              <StatusPill status={lastCheck.status} fallback={lastCheck.fallback} /> 最近一次检查：{lastCheck.summary}
            </div>
          ) : (
            <p className="mt-5 max-w-xs text-[13px] leading-relaxed text-ink/65">
              想确认效果的话，拍一张让 AI 看看；觉得满意也可以直接继续。
            </p>
          )}

          <div className="mt-5 flex w-full max-w-sm flex-col gap-2 sm:flex-row">
            <button onClick={props.onCheck} className="inline-flex h-11 sm:flex-1 items-center justify-center gap-2 rounded-full border border-ink/20 bg-white/70 text-sm text-ink hover:bg-white">
              <Camera className="size-4" /> 帮我看看
            </button>
            <button onClick={props.onNext} className="btn-ink inline-flex h-11 sm:flex-1 items-center justify-center gap-2 rounded-full text-sm">
              {props.nextPart ? `继续：${props.nextPart.label}` : "完成，去拍妆后照"} <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
        {props.nextPart && (
          <div className="mt-auto flex items-center gap-3 rounded-2xl bg-white/55 p-3">
            <span className="grid size-10 place-items-center rounded-xl bg-ink/[0.06] text-ink">
              <PartGlyph part={props.nextPart.key} />
            </span>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-xs text-ink/50">下一个部位</div>
              <div className="text-sm font-medium text-ink">
                {props.nextPart.label} · {props.nextPart.steps.length} 小步 · {props.nextPart.tool}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="label-mono">
            {part.enLabel} · 第 {stepIndex + 1} / {part.steps.length} 小步
          </div>
          <h3 className="mt-1 font-serif text-[26px] font-bold leading-tight text-ink md:text-[28px]">{step!.title}</h3>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={props.referenceImage} alt="参考妆" className="size-14 rounded-xl object-cover object-[50%_35%] shadow-sm" />
          <span className="text-[10px] text-ink/45">参考妆</span>
        </div>
      </div>

      <ol className="mt-3 flex items-center gap-1.5" aria-label={`${part.label}的小步`}>
        {part.steps.map((s, j) => {
          const isDone = props.done.includes(s.id);
          const active = j === stepIndex;
          return (
            <li key={s.id} className="flex min-w-0 flex-1 items-center gap-1.5">
              <button
                onClick={() => props.onJumpStep(j)}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-2 py-1 text-left text-[11px] transition",
                  active ? "bg-ink/[0.07] font-medium text-ink" : "text-ink/50 hover:text-ink",
                )}
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full text-[9px]",
                    isDone ? "bg-success text-white" : active ? "bg-ink text-white" : "border border-ink/25",
                  )}
                >
                  {isDone ? <Check className="size-2.5" /> : j + 1}
                </span>
                <span className="truncate">{s.title}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-[15px] leading-[1.8] text-ink/85">{step!.instruction}</p>

      {step!.adapted && (
        <div className="mt-4 rounded-2xl border border-peach/50 bg-gradient-to-br from-peach/25 to-white/60 p-3.5">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#a4513f]">
            <Sparkles className="size-4" /> 为你调整 · {props.faceShapeLabel}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink/80">{step!.adapted}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-ink/75">
          <Wrench className="size-3.5" /> {part.tool}
          {part.shade ? ` · ${part.shade}` : ""}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-ink/75">
          <Clock className="size-3.5" /> 约 {step!.durationS} 秒
        </span>
      </div>

      <div className="mt-auto pt-5">
        <div className="mb-2.5 flex items-center gap-2.5 rounded-2xl border border-dashed border-ink/12 px-3 py-2.5 text-xs text-ink/60">
          <span className="label-mono shrink-0 text-[10px]">Next</span>
          {part.steps[stepIndex + 1] ? (
            <span className="truncate">
              下一小步：<b className="font-medium text-ink/80">{part.steps[stepIndex + 1].title}</b> · 约 {part.steps[stepIndex + 1].durationS} 秒
            </span>
          ) : props.nextPart ? (
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              这是{part.label}的最后一步，完成后进入
              <PartGlyph part={props.nextPart.key} className="size-3.5 shrink-0" />
              <b className="font-medium text-ink/80">{props.nextPart.label}</b>
            </span>
          ) : (
            <span className="truncate">最后一步了，完成后拍一张妆后照看整体效果</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-ink/[0.04] p-1.5">
          <button
            onClick={props.onPrev}
            disabled={props.partIndex === 0 && stepIndex === 0}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13px] text-ink/75 transition hover:bg-white disabled:opacity-40"
          >
            <SkipBack className="size-4" /> 上一步
          </button>
          <button onClick={props.onReplay} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13px] text-ink/75 transition hover:bg-white">
            <RotateCcw className={cn("size-4", props.speaking && "text-rose")} /> 再讲一遍
          </button>
          <button onClick={props.onTogglePause} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13px] text-ink/75 transition hover:bg-white">
            {props.paused ? <Play className="size-4" /> : <Pause className="size-4" />} {props.paused ? "继续" : "暂停"}
          </button>
        </div>
      </div>
    </div>
  );
}
