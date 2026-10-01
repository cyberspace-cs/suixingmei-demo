"use client";

import { useState } from "react";
import { AlertTriangle, ArrowLeft, Camera, Check, CloudUpload, Loader2, Lock, RefreshCw, Trash2 } from "lucide-react";
import { CheckItems, CheckPhoto, StatusPill } from "@/components/common/check-view";
import { CheckRecordDialog, formatTime } from "@/components/common/check-record-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { PARTS } from "@/lib/looks";
import type { CheckRecord, ImageQuality, PartKey } from "@/lib/types";
import { cn } from "@/lib/utils";

export type CheckFlow =
  | { phase: "idle" }
  | { phase: "countdown"; n: number }
  | { phase: "captured"; image: string; quality: ImageQuality; part: PartKey }
  | { phase: "analyzing"; image: string; part: PartKey }
  | { phase: "result"; record: CheckRecord }
  | { phase: "error"; message: string; image?: string; part?: PartKey };

export function CheckPanel(props: {
  flow: CheckFlow;
  records: CheckRecord[];
  partLabel: string;
  stepTitle: string;
  landmarkSet: CheckRecord["landmarkSet"];
  onStart: () => void;
  onAnalyze: (remember: boolean) => void;
  onClear: () => void;
  onBack: () => void;
}) {
  const { flow } = props;
  const [remember, setRemember] = useState(false);
  const [viewing, setViewing] = useState<CheckRecord | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div>
        <div className="label-mono">Photo review</div>
        <h3 className="mt-1 font-serif text-xl font-bold text-ink">帮我看看 · {props.partLabel}</h3>
        <p className="mt-0.5 text-xs text-ink/55">拍一张，AI 指出哪里做得好、哪里还可以改。不检查也可以直接继续。</p>
      </div>

      <div className="mt-3">
        {flow.phase === "idle" && (
          <button
            onClick={props.onStart}
            className="flex aspect-[2/1] w-full flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-ink/20 bg-white/45 text-ink transition hover:bg-white/70"
          >
            <span className="grid size-12 place-items-center rounded-full bg-ink text-white">
              <Camera className="size-5" />
            </span>
            <span className="text-sm font-medium">点击拍摄 · 3 秒倒计时</span>
            <span className="text-xs text-ink/50">双手不用放下工具，也可以直接说「帮我看看」</span>
          </button>
        )}

        {flow.phase === "countdown" && (
          <div className="flex aspect-[2/1] w-full flex-col items-center justify-center rounded-2xl bg-white/50">
            <span className="font-serif text-6xl font-bold text-ink">{flow.n}</span>
            <span className="mt-1 text-xs text-ink/55">看向镜头，保持姿势</span>
          </div>
        )}

        {flow.phase === "captured" && (
          <div className="space-y-2.5">
            <div className="relative overflow-hidden rounded-2xl">
              <CheckPhoto image={flow.image} part={flow.part} landmarkSet={props.landmarkSet} className="aspect-[2/1]" />
              <div className="absolute inset-x-2 bottom-2 flex flex-wrap items-center gap-1 text-[11px]">
                {["光线充足", "画面清晰", "人脸居中"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-2 py-0.5 text-success shadow-sm">
                    <Check className="size-3" /> {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white/65 px-3 py-2.5 text-xs leading-relaxed text-ink/70">
              <p className="flex items-start gap-1.5">
                <Lock className="mt-px size-3.5 shrink-0" />
                上传这一帧给 AI 分析，分析完不保存原图；镜面画面始终只在本机。
              </p>
              <label className="mt-1.5 flex items-center gap-2 text-ink/80">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} />
                本次跟妆不再询问，拍完自动分析
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={props.onClear} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-ink/15 bg-white/70 text-sm text-ink/80 hover:bg-white">
                <Trash2 className="size-4" /> 清除图片
              </button>
              <button onClick={() => props.onAnalyze(remember)} className="btn-ink inline-flex h-10 flex-[1.4] items-center justify-center gap-1.5 rounded-full text-sm">
                <CloudUpload className="size-4" /> 开始分析
              </button>
            </div>
          </div>
        )}

        {flow.phase === "analyzing" && (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl">
              <CheckPhoto image={flow.image} part={flow.part} landmarkSet={props.landmarkSet} className="aspect-[2/1]" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-transparent [animation:scan-sweep_1.6s_ease-in-out_infinite]" />
              <style>{`@keyframes scan-sweep{0%{transform:translateY(-100%)}100%{transform:translateY(100%)}}`}</style>
            </div>
            <p className="flex items-center gap-2 text-sm text-ink/70">
              <Loader2 className="size-4 animate-spin" /> AI 正在看你的{props.partLabel}…
            </p>
          </div>
        )}

        {flow.phase === "result" && (
          <div className="space-y-3">
            <CheckPhoto image={flow.record.image} part={flow.record.part} landmarkSet={flow.record.landmarkSet} result={flow.record} className="aspect-[2/1] rounded-2xl" />
            <div className="rounded-2xl bg-white/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-ink">{flow.record.summary}</p>
                <StatusPill status={flow.record.status} fallback={flow.record.fallback} />
              </div>
              <div className="mt-2.5">
                <CheckItems result={flow.record} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={props.onStart} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-ink/15 bg-white/70 text-sm text-ink/80 hover:bg-white">
                <RefreshCw className="size-4" /> 改好了，再拍一张
              </button>
              <button onClick={props.onBack} className="btn-ink inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-sm">
                <ArrowLeft className="size-4" /> 回到步骤
              </button>
            </div>
          </div>
        )}

        {flow.phase === "error" && (
          <div className="space-y-3">
            {flow.image && flow.part && (
              <CheckPhoto image={flow.image} part={flow.part} landmarkSet={props.landmarkSet} className="aspect-[2/1] rounded-2xl opacity-70" />
            )}
            <div className="flex items-start gap-2 rounded-2xl bg-warning/10 p-3 text-[13px] text-[#8a5a1c]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{flow.message}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={props.onClear} className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-ink/15 bg-white/70 text-sm text-ink/80">
                取消
              </button>
              <button onClick={props.onStart} className="btn-ink inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-sm">
                <RefreshCw className="size-4" /> 重拍
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={cn("mt-auto pt-4", (flow.phase === "captured" || flow.phase === "analyzing") && "hidden")}>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-ink">本次检查记录</span>
          <span className="text-xs text-ink/45">{props.records.length} 张</span>
        </div>
        {props.records.length === 0 ? (
          <p className="mt-2 rounded-xl bg-white/45 px-3 py-3 text-xs text-ink/50">还没有检查过。每次「帮我看看」的照片和评价都会留在这里。</p>
        ) : (
          <ul className="scrollbar-none mt-2 flex gap-2.5 overflow-x-auto pb-1">
            {props.records.map((r) => (
              <li key={r.id} className="w-[104px] shrink-0">
                <button onClick={() => setViewing(r)} className="group block w-full text-left">
                  <div className="relative overflow-hidden rounded-xl">
                    <CheckPhoto image={r.image} part={r.part} landmarkSet={r.landmarkSet} className="aspect-square" />
                    <span className={cn("absolute right-1.5 top-1.5 size-2.5 rounded-full ring-2 ring-white", r.status === "good" ? "bg-success" : "bg-[#e07a5f]")} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-ink/55">
                    <span>{PARTS[r.part].label}</span>
                    <span>{formatTime(r.createdAt)}</span>
                  </div>
                  <span className="mt-0.5 block rounded-md border border-ink/15 py-0.5 text-center text-[11px] text-ink/75 group-hover:bg-white">查看评价</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <CheckRecordDialog record={viewing} onOpenChange={(o) => !o && setViewing(null)} />
    </div>
  );
}
