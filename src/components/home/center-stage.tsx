"use client";

import { useState } from "react";
import { FaceCanvas } from "@/components/common/face-canvas";
import { LANDMARKS } from "@/lib/face-geometry";
import type { DraftImage } from "@/lib/store";
import type { Session } from "@/lib/types";
import { asset, cn } from "@/lib/utils";

function Clover({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5 text-ink", className)} aria-hidden>
      <g fill="currentColor">
        <ellipse cx="12" cy="6.6" rx="3.6" ry="4.6" />
        <ellipse cx="12" cy="17.4" rx="3.6" ry="4.6" />
        <ellipse cx="6.6" cy="12" rx="4.6" ry="3.6" />
        <ellipse cx="17.4" cy="12" rx="4.6" ry="3.6" />
      </g>
      <circle cx="12" cy="12" r="1.6" fill="#f6f3fb" />
    </svg>
  );
}

function Placeholder() {
  return (
    <svg viewBox="0 0 300 360" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="ph" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#efeaf9" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <ellipse cx="150" cy="160" rx="92" ry="118" fill="url(#ph)" stroke="#2f2b66" strokeOpacity="0.18" strokeWidth="1.5" strokeDasharray="5 6" />
      <path d="M100 138c12-8 28-9 40-3M160 135c12-6 28-5 40 3" stroke="#2f2b66" strokeOpacity="0.28" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M110 162c8-5 18-5 26 0M164 162c8-5 18-5 26 0" stroke="#2f2b66" strokeOpacity="0.25" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M150 175v28c0 4-4 6-8 6" stroke="#2f2b66" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M128 232c12 7 32 7 44 0" stroke="#c47684" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="108" cy="200" rx="18" ry="10" fill="#f1b5a6" opacity="0.35" />
      <ellipse cx="192" cy="200" rx="18" ry="10" fill="#f1b5a6" opacity="0.35" />
      <path d="M70 330c10-40 40-52 80-52s70 12 80 52" stroke="#2f2b66" strokeOpacity="0.14" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

type Phase = "empty" | "ready" | "analyzing" | "done";

export function CenterStage({
  phase,
  selfie,
  session,
}: {
  phase: Phase;
  selfie?: DraftImage;
  session?: Session;
}) {
  const [view, setView] = useState<"before" | "after">("after");
  const sample = phase === "done" ? session?.selfieSample : selfie?.sample;
  const landmarks = LANDMARKS[sample ? "user" : "generic"];
  const src = phase === "done" ? session!.selfieImage : selfie?.src;
  const included = session?.plan.filter((p) => p.included).map((p) => p.key) ?? [];

  return (
    <div className="relative mx-auto flex w-full max-w-[460px] flex-col items-center">
      <div className="pointer-events-none absolute left-1/2 top-[44%] -z-0 aspect-[1.45] w-[160%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-white/90 shadow-[0_0_0_1px_rgba(47,43,102,0.04)]" />
      <Clover className="absolute right-[-14%] top-[17%] hidden lg:block" />
      <Clover className="absolute bottom-[34%] left-[-16%] hidden size-4 lg:block" />

      <div className="relative z-10 mt-1 rounded-full border border-white bg-white/75 px-4 py-1 text-xs text-ink/70 shadow-sm backdrop-blur">
        {phase === "empty" && "上传两张照片，生成你的专属预览"}
        {phase === "ready" && "识别后生成上妆效果预览"}
        {phase === "analyzing" && "正在识别脸部关键点…"}
        {phase === "done" && (session?.selfieSample ? "上妆效果预览" : "上妆位置示意预览")}
      </div>

      <div className="relative z-0 -mt-3 aspect-[3/4] w-[78%] sm:w-[72%] lg:w-[clamp(270px,calc((100dvh-430px)*0.75),430px)]">
        {phase === "empty" || !src ? (
          <div className="h-full w-full p-6">
            <Placeholder />
          </div>
        ) : (
          <div className="portrait-fade h-full w-full">
            <FaceCanvas
              src={src}
              after={phase === "done" && session?.selfieSample ? asset("/images/user-after.jpg") : undefined}
              afterOpacity={phase === "done" && view === "after" ? 1 : 0}
              landmarks={landmarks}
              shape={session?.face?.faceShape ?? "round"}
              scan={phase === "analyzing"}
              zones={
                phase === "done" && !session?.selfieSample && view === "after"
                  ? included.map((part) => ({ part, variant: "adapted" as const, look: "solid" as const }))
                  : []
              }
            />
          </div>
        )}
      </div>

      <div className="relative z-10 -mt-10 flex flex-col items-center sm:-mt-14">
        <h2 className="font-serif text-2xl font-bold tracking-wide text-ink md:text-[28px]">
          {phase === "done" ? session?.lookName : phase === "analyzing" ? "专属妆容生成中" : "你的专属妆容"}
        </h2>
        <div className="mt-2.5 flex rounded-full border border-white bg-white/70 p-1 text-[13px] shadow-sm backdrop-blur" role="tablist" aria-label="妆前妆后">
          {(["before", "after"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              disabled={phase !== "done"}
              onClick={() => setView(v)}
              className={cn(
                "rounded-full px-5 py-1 transition",
                view === v && phase === "done" ? "bg-ink text-white shadow" : "text-ink/60",
                phase !== "done" && "cursor-not-allowed opacity-60",
              )}
            >
              {v === "before" ? "妆前" : "妆后"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
