"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Camera, CheckCircle2, Loader2, Lock, Mic, Sun, TriangleAlert, Volume2 } from "lucide-react";
import { PartGlyph } from "@/components/common/part-glyph";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { CameraStatus } from "@/hooks/use-camera";
import type { PartPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

function Row({ icon, title, desc, action }: { icon: ReactNode; title: string; desc: ReactNode; action: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/70 px-3.5 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink/[0.06] text-ink">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink">{title}</div>
        <div className="text-xs leading-relaxed text-ink/55">{desc}</div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

export function PrepDialog(props: {
  open: boolean;
  lookName: string;
  faceShapeLabel: string;
  parts: PartPlan[];
  minutes: number;
  cameraStatus: CameraStatus;
  onCamera: () => void;
  narration: boolean;
  voiceInput: boolean;
  onNarration: (v: boolean) => void;
  onVoiceInput: (v: boolean) => void;
  onStart: () => void;
}) {
  const cam = props.cameraStatus;
  const camAction =
    cam === "live" ? (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <CheckCircle2 className="size-4" /> 已开启
      </span>
    ) : cam === "requesting" ? (
      <span className="inline-flex items-center gap-1 text-xs text-ink/60">
        <Loader2 className="size-3.5 animate-spin" /> 等待授权
      </span>
    ) : (
      <button onClick={props.onCamera} className="rounded-full border border-ink/20 bg-white px-3 py-1.5 text-xs font-medium text-ink hover:border-ink/40">
        {cam === "idle" ? "开启" : "重试"}
      </button>
    );
  const camDesc =
    cam === "live" ? (
      "画面只在本机显示，不会上传"
    ) : cam === "denied" ? (
      <span className="text-[#a8671f]">
        <TriangleAlert className="mr-1 inline size-3 -translate-y-px" />
        未获得授权，可以先用演示画面跟做
      </span>
    ) : cam === "unavailable" ? (
      <span className="text-[#a8671f]">
        <TriangleAlert className="mr-1 inline size-3 -translate-y-px" />
        没有检测到摄像头，将使用演示画面
      </span>
    ) : (
      "像照镜子一样边看边画；不开也能用演示画面体验"
    );

  return (
    <Dialog open={props.open}>
      <DialogContent showCloseButton={false} className="glass-strong max-h-[92dvh] overflow-y-auto rounded-[26px] p-6 sm:max-w-[480px]">
        <DialogHeader>
          <div className="label-mono">Before you start</div>
          <DialogTitle className="font-serif text-2xl font-bold text-ink">开始前，准备 30 秒</DialogTitle>
          <DialogDescription className="text-[13px] text-ink/60">
            {props.lookName} · 已按你的{props.faceShapeLabel}调整 · {props.parts.length} 个部位 · 约 {props.minutes} 分钟
          </DialogDescription>
        </DialogHeader>

        <ol className="flex flex-wrap items-center gap-1.5">
          {props.parts.map((p, i) => (
            <li key={p.key} className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 py-1 pl-1 pr-2.5 text-xs text-ink/80">
                <span className="grid size-5 place-items-center rounded-full bg-ink/[0.07]">
                  <PartGlyph part={p.key} className="size-3.5" />
                </span>
                {p.label}
              </span>
              {i < props.parts.length - 1 && <span className="h-px w-2 bg-ink/20" />}
            </li>
          ))}
        </ol>

        <div className="space-y-2">
          <Row icon={<Camera className="size-[18px]" />} title="打开镜面（摄像头）" desc={camDesc} action={camAction} />
          <Row
            icon={<Volume2 className="size-[18px]" />}
            title="语音讲解"
            desc="每一步自动朗读要点，眼睛可以一直看镜子"
            action={<Switch checked={props.narration} onCheckedChange={props.onNarration} aria-label="语音讲解" />}
          />
          <Row
            icon={<Mic className="size-[18px]" />}
            title="语音指令"
            desc="说「下一步」「帮我看看」「暂停」，不用放下刷子"
            action={<Switch checked={props.voiceInput} onCheckedChange={props.onVoiceInput} aria-label="语音指令" />}
          />
        </div>

        <div className="grid gap-2 text-xs leading-relaxed text-ink/60 sm:grid-cols-2">
          <p className="flex gap-1.5 rounded-xl bg-white/45 p-2.5">
            <Sun className="mt-px size-3.5 shrink-0" /> 设备放稳在眼前，光线从正面照过来，AI 看得更准。
          </p>
          <p className="flex gap-1.5 rounded-xl bg-white/45 p-2.5">
            <Lock className="mt-px size-3.5 shrink-0" /> 只有你点「帮我看看」并确认后，才会上传那一帧做分析。
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
          <Link href="/plan" className="inline-flex h-12 items-center justify-center rounded-full px-5 text-sm text-ink/70 hover:text-ink">
            再看看方案
          </Link>
          <button onClick={props.onStart} className={cn("btn-ink inline-flex h-12 sm:flex-1 items-center justify-center gap-2 rounded-full text-[15px] font-medium")}>
            准备好了，开始跟妆 <ArrowRight className="size-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
