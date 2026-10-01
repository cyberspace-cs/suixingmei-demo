"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Camera, CameraOff, Eye, EyeOff, Loader2, Lock, Maximize2, Minimize2, Pause, Play, Sparkles, Volume2 } from "lucide-react";
import { FaceCanvas } from "@/components/common/face-canvas";
import { Popover } from "./popover";
import type { CameraStatus } from "@/hooks/use-camera";
import { faceFrame, focusBox, type Landmarks, type Pt } from "@/lib/face-geometry";
import type { FaceShape, PartKey } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface Subtitle {
  text: string;
  from: "narration" | "ai" | "user";
  at: number;
}

function useAspect(ref: RefObject<HTMLDivElement | null>) {
  const [aspect, setAspect] = useState(4 / 3);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width && height) setAspect(width / height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return aspect;
}

export function Mirror({
  videoRef,
  ...props
}: {
  mode: "demo" | "camera";
  cameraStatus: CameraStatus;
  videoRef: RefObject<HTMLVideoElement | null>;
  mirrored: boolean;
  selfie: string;
  after?: string;
  reveal: PartKey[];
  landmarks: Landmarks;
  shape: FaceShape;
  part: PartKey | null;
  focus: Pt | null;
  showOverlay: boolean;
  zoom: boolean;
  subtitle: Subtitle | null;
  speaking: boolean;
  countdown: number | null;
  flash: boolean;
  paused: boolean;
  stepLabel: string;
  checking: boolean;
  onToggleOverlay: () => void;
  onToggleZoom: () => void;
  onCheck: () => void;
  onResume: () => void;
  onRequestCamera: () => void;
  onUseDemo: () => void;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const aspect = useAspect(boxRef);
  const { mode, cameraStatus, part, landmarks } = props;
  const viewBox = mode === "camera" ? undefined : props.zoom && part ? focusBox(part, landmarks, aspect) : faceFrame(landmarks, aspect);
  const zones = props.showOverlay && part ? [{ part, variant: "adapted" as const, look: "solid" as const }] : [];

  return (
    <section className={cn("glass relative flex min-h-0 flex-col rounded-[26px] p-2.5", props.className)} aria-label="我的镜面">
      <div ref={boxRef} className="relative min-h-0 flex-1 overflow-hidden rounded-[20px] bg-[#e9e5ef]">
        {mode === "camera" ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: props.mirrored ? "scaleX(-1)" : undefined }}
            />
            <div className="absolute inset-0">
              <FaceCanvas landmarks={landmarks} shape={props.shape} zones={zones} focus={props.showOverlay ? props.focus : null} viewBox={viewBox} />
            </div>
          </>
        ) : (
          <FaceCanvas
            src={props.selfie}
            after={props.after}
            reveal={props.reveal}
            landmarks={landmarks}
            shape={props.shape}
            zones={zones}
            focus={props.showOverlay ? props.focus : null}
            viewBox={viewBox}
            className="transition-all duration-500"
          />
        )}

        <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
          {mode === "camera" && cameraStatus === "live" ? (
            <span className="glass-strong inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs text-ink">
              <span className="size-2 rounded-full bg-success shadow-[0_0_0_3px_rgba(63,155,110,0.2)]" />
              摄像头已开启
              <span className="hidden text-ink/40 sm:inline">·</span>
              <Lock className="hidden size-3 text-ink/50 sm:inline" /> <span className="hidden text-ink/60 sm:inline">本机画面，不上传</span>
            </span>
          ) : cameraStatus === "denied" || cameraStatus === "unavailable" ? (
            <Popover
              trigger={
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-warning/90 px-3 py-1.5 text-xs text-white shadow">
                  <CameraOff className="size-3.5" />
                  {cameraStatus === "denied" ? "摄像头未授权" : "未检测到摄像头"}
                  <span className="hidden sm:inline">· 演示画面</span>
                </span>
              }
            >
              <p className="font-medium text-ink">{cameraStatus === "denied" ? "如何开启摄像头" : "没有找到可用的摄像头"}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink/60">
                {cameraStatus === "denied"
                  ? "点击浏览器地址栏左侧的摄像头图标，选择「允许」，然后点下面的重试。画面只在本机显示，不会上传。"
                  : "请确认电脑连接了摄像头，或换用手机打开。没有摄像头也可以继续：用演示画面跟做，帮我看看会检查演示画面。"}
              </p>
              <button onClick={props.onRequestCamera} className="mt-2.5 rounded-full bg-ink px-3 py-1 text-xs text-white">
                重试开启
              </button>
            </Popover>
          ) : (
            <span className="glass-strong inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs text-ink/70">
              <Sparkles className="size-3.5" /> <span className="hidden sm:inline">演示画面</span>
              {cameraStatus === "requesting" ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <button onClick={props.onRequestCamera} className="ml-1 font-medium text-ink underline underline-offset-2">
                  <span className="sm:hidden">开摄像头</span>
                  <span className="hidden sm:inline">开启摄像头</span>
                </button>
              )}
            </span>
          )}

          <div className="flex gap-1.5">
            {mode === "camera" && (
              <button onClick={props.onUseDemo} className="glass-strong grid size-9 place-items-center rounded-full text-ink" aria-label="切换为演示画面" title="切换为演示画面">
                <CameraOff className="size-4" />
              </button>
            )}
            <button
              onClick={props.onToggleOverlay}
              className={cn("glass-strong inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs sm:px-3", props.showOverlay ? "text-ink" : "text-ink/50")}
              aria-pressed={props.showOverlay}
              aria-label="涂抹示意"
            >
              {props.showOverlay ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              <span className="hidden sm:inline">涂抹示意</span>
            </button>
            {mode === "demo" && (
              <button
                onClick={props.onToggleZoom}
                className="glass-strong inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs text-ink sm:px-3"
                aria-pressed={props.zoom}
                aria-label={props.zoom ? "看整脸" : "放大局部"}
              >
                {props.zoom ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                <span className="hidden sm:inline">{props.zoom ? "看整脸" : "放大局部"}</span>
              </button>
            )}
          </div>
        </div>

        {props.subtitle && (
          <div
            key={props.subtitle.at}
            className="pointer-events-none absolute inset-x-0 bottom-[68px] flex justify-center px-4 animate-in fade-in slide-in-from-bottom-2 duration-300 md:px-16"
            aria-live="polite"
          >
            <p className="max-w-xl rounded-2xl bg-[#1f1c45]/72 px-4 py-2.5 text-center text-[13px] leading-relaxed text-white shadow-lg backdrop-blur-md md:text-[14px]">
              {props.subtitle.from !== "narration" && (
                <span className="mr-1.5 font-semibold text-peach">{props.subtitle.from === "ai" ? "AI 跟妆师" : "你"}</span>
              )}
              {props.subtitle.from === "narration" && props.speaking && <Volume2 className="mr-1.5 inline size-3.5 -translate-y-px text-peach" />}
              {props.subtitle.text}
            </p>
          </div>
        )}

        <span className="glass-strong absolute bottom-3 left-3 hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-ink md:inline-flex">
          <Camera className="size-3.5" /> {props.stepLabel}
        </span>

        <button
          onClick={props.onCheck}
          disabled={props.checking || props.paused}
          className="absolute bottom-3 right-3 inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-ink shadow-[0_10px_24px_-12px_rgba(38,35,95,0.6)] transition hover:scale-[1.02] disabled:opacity-60"
        >
          <Camera className="size-4" /> 帮我看看
        </button>

        {props.countdown !== null && (
          <div className="absolute inset-0 grid place-items-center bg-black/10">
            <div className="text-center text-white drop-shadow-lg">
              <div key={props.countdown} className="font-serif text-[96px] font-bold leading-none animate-in zoom-in-50 fade-in duration-300">
                {props.countdown}
              </div>
              <div className="mt-2 text-sm">保持姿势，正对镜头</div>
            </div>
          </div>
        )}
        {props.flash && <div className="pointer-events-none absolute inset-0 bg-white animate-out fade-out duration-500" />}

        {props.paused && (
          <div className="absolute inset-0 grid place-items-center bg-[#f6f3fb]/55 backdrop-blur-[6px]">
            <div className="text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-white text-ink shadow">
                <Pause className="size-6" />
              </div>
              <p className="mt-3 font-serif text-xl font-semibold text-ink">已暂停 · 进度已保存</p>
              <p className="mt-1 text-xs text-ink/60">说「继续」或点下面的按钮回来</p>
              <button onClick={props.onResume} className="btn-ink mt-4 inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm">
                <Play className="size-4" /> 继续跟妆
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
