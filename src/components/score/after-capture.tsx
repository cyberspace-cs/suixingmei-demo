"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, CameraOff, ImagePlus, Loader2, Sparkles, Upload } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { MAX_UPLOAD_MB, analyzeQuality, captureFrame, normalizePortrait, readFile } from "@/lib/local/image";
import { useApp } from "@/lib/store";
import type { ImageQuality } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AfterCapture({
  demoSrc,
  onCapture,
  className,
}: {
  demoSrc?: string;
  onCapture: (src: string, quality: ImageQuality) => void;
  className?: string;
}) {
  const scenario = useApp((s) => s.settings.scenario);
  const mirrored = useApp((s) => s.settings.mirrored);
  const { videoRef, status: camStatus, start: startCamera, stop: stopCamera } = useCamera({ simulateDenied: scenario === "camera-denied" });
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = camStatus === "live";

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  const accept = async (src: string) => {
    const quality = await analyzeQuality(src);
    setBusy(false);
    onCapture(src, quality);
  };

  const grab = async () => {
    setBusy(true);
    const src = await captureFrame({ video: videoRef.current, mirrored });
    stopCamera();
    await accept(src);
  };

  const shoot = () => {
    let k = 3;
    setCount(k);
    const tick = () => {
      k -= 1;
      if (k > 0) {
        setCount(k);
        timers.current.push(window.setTimeout(tick, 800));
      } else {
        setCount(null);
        void grab();
      }
    };
    timers.current.push(window.setTimeout(tick, 800));
  };

  const upload = async (file?: File | null) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("只支持图片文件，换一张 JPG 或 PNG 试试");
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return setError(`图片超过 ${MAX_UPLOAD_MB}MB，换一张小一点的吧`);
    setBusy(true);
    try {
      const src = await normalizePortrait(await readFile(file));
      await accept(src);
    } catch {
      setBusy(false);
      setError("图片读取失败，请换一张再试");
    }
  };

  const useDemo = async () => {
    if (!demoSrc) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    await accept(demoSrc);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="relative aspect-[3/4] max-h-[60dvh] w-full overflow-hidden rounded-[22px] bg-[#ebe7f1]">
        {live ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
            style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
          />
        ) : demoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={demoSrc} alt="演示妆后画面" className="absolute inset-0 h-full w-full object-cover opacity-90" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-ink/35">
            <ImagePlus className="size-10" />
          </div>
        )}
        <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <ellipse cx="150" cy="185" rx="92" ry="122" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="6 6" opacity="0.85" />
        </svg>
        <span className="glass-strong absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-ink/75">
          {live ? (
            <>
              <span className="size-2 rounded-full bg-success" /> 摄像头 · 本机画面
            </>
          ) : camStatus === "denied" || camStatus === "unavailable" ? (
            <>
              <CameraOff className="size-3.5 text-warning" /> {camStatus === "denied" ? "摄像头未授权" : "未检测到摄像头"}
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" /> {demoSrc ? "演示画面 · 化好妆的你" : "把脸放进虚线框"}
            </>
          )}
        </span>
        {count !== null && (
          <div className="absolute inset-0 grid place-items-center bg-black/10 text-center text-white drop-shadow-lg">
            <div>
              <div key={count} className="font-serif text-[88px] font-bold leading-none animate-in zoom-in-50 fade-in duration-300">
                {count}
              </div>
              <div className="mt-1 text-sm">正对镜头，自然光下更准</div>
            </div>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-white/50 backdrop-blur-sm">
            <Loader2 className="size-6 animate-spin text-ink" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {live ? (
          <button onClick={shoot} disabled={count !== null || busy} className="btn-ink inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm disabled:opacity-60">
            <Camera className="size-4" /> 拍照（3 秒）
          </button>
        ) : (
          <button
            onClick={startCamera}
            disabled={camStatus === "requesting"}
            className="btn-ink inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm disabled:opacity-60"
          >
            {camStatus === "requesting" ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            {camStatus === "denied" || camStatus === "unavailable" ? "重试摄像头" : "开启摄像头"}
          </button>
        )}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ink/15 bg-white/80 text-sm text-ink hover:bg-white"
        >
          <Upload className="size-4" /> 上传妆后照
        </button>
      </div>
      {demoSrc && !live && (
        <button onClick={useDemo} disabled={busy} className="text-center text-xs font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
          没有摄像头？用演示妆后照体验
        </button>
      )}
      {error && (
        <p className="flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
          <AlertTriangle className="size-3.5" /> {error}
        </p>
      )}
    </div>
  );
}
