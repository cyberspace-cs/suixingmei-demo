"use client";

import { useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Check, ImagePlus, Loader2, ShieldCheck, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { MAX_UPLOAD_MB, analyzeQuality, normalizePortrait, readFile } from "@/lib/local/image";
import { useApp, type DraftImage } from "@/lib/store";
import { asset, cn } from "@/lib/utils";

interface Props {
  kind: "reference" | "selfie";
  value?: DraftImage;
  onChange: (img?: DraftImage) => void;
  disabled?: boolean;
  className?: string;
}

const COPY = {
  reference: {
    index: "01 / Inspiration",
    title: "参考妆容",
    filledTitle: "上传喜欢的妆容照片",
    filledDesc: "如明星妆容、博主妆容或你收藏的图片",
    emptyTitle: "上传一张喜欢的妆容",
    emptyDesc: "小红书截图、杂志或视频截图都可以，正脸更准",
    button: "上传 / 更换参考图",
    sample: asset("/images/ref-peach.jpg"),
  },
  selfie: {
    index: "02 / Your face",
    title: "我的照片",
    filledTitle: "自然光 · 清晰正面照",
    filledDesc: "上传清晰的正面自拍，让 AI 更准确地为你定制",
    emptyTitle: "拍一张素颜正面照",
    emptyDesc: "自然光、不开美颜、露出完整五官。只在本机分析",
    button: "上传 / 更换自拍",
    sample: asset("/images/user-bare.jpg"),
  },
};

export function UploadCard({ kind, value, onChange, disabled, className }: Props) {
  const c = COPY[kind];
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const finish = async (src: string, extra: Partial<DraftImage>) => {
    if (kind === "selfie") {
      let quality = await analyzeQuality(src);
      if (useApp.getState().settings.scenario === "selfie-bad") {
        quality = {
          ...quality,
          ok: false,
          issues: ["光线偏暗，靠近窗边或打开台灯再拍", "皮肤纹理过于平滑，可能开启了美颜，会影响脸型判断"],
        };
      }
      onChange({ src, ...extra, quality });
    } else {
      onChange({ src, ...extra });
    }
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("只支持图片文件（JPG、PNG、HEIC 转存后的图片）");
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`图片超过 ${MAX_UPLOAD_MB}MB，换一张小一点的吧`);
      return;
    }
    setBusy(true);
    try {
      const raw = await readFile(file);
      const src = await normalizePortrait(raw);
      await finish(src, { name: file.name, sample: false, sampleLook: undefined });
    } catch {
      setError("图片读取失败，请换一张再试");
      toast.error("图片读取失败");
    } finally {
      setBusy(false);
    }
  };

  const useSample = async () => {
    setError(null);
    setBusy(true);
    await new Promise((r) => setTimeout(r, 350));
    await finish(c.sample, kind === "reference" ? { sample: true, sampleLook: "peach", name: "示例参考妆" } : { sample: true, name: "示例自拍" });
    setBusy(false);
  };

  const quality = kind === "selfie" ? value?.quality : undefined;
  const hasIssues = quality && !quality.ok && !value?.acceptedIssues;

  return (
    <section
      className={cn(
        "glass relative rounded-[26px] p-4 transition md:p-5",
        dragOver && "ring-2 ring-ink/30",
        hasIssues && "ring-1 ring-warning/40",
        className,
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
      aria-label={c.title}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={kind === "selfie" ? "user" : undefined}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="label-mono">{c.index}</div>
      <h2 className="mt-1 font-serif text-lg font-semibold text-ink md:text-xl">{c.title}</h2>

      <div className="mt-3 flex items-center gap-3 md:gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy}
          className={cn(
            "relative aspect-square w-[42%] shrink-0 overflow-hidden rounded-2xl md:w-[112px]",
            value ? "bg-white/50 shadow-sm" : "border-[1.5px] border-dashed border-ink/20 bg-white/40 hover:bg-white/70",
          )}
          aria-label={value ? `更换${c.title}` : `上传${c.title}`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.src} alt={c.title} className="h-full w-full object-cover object-[50%_35%]" />
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-1.5 text-ink/45">
              <ImagePlus className="size-6" />
              <span className="text-[11px]">点击或拖入</span>
            </span>
          )}
          {busy && (
            <span className="absolute inset-0 grid place-items-center bg-white/60 backdrop-blur-sm">
              <Loader2 className="size-5 animate-spin text-ink" />
            </span>
          )}
        </button>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-snug text-ink md:text-[15px]">{value ? c.filledTitle : c.emptyTitle}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink/55 md:text-xs">{value ? c.filledDesc : c.emptyDesc}</p>
          {quality && quality.ok && (
            <div className="mt-2 hidden flex-wrap gap-1.5 md:flex">
              {["光线", "清晰度"].map((t) => (
                <span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] text-success">
                  <Check className="size-3" /> {t}
                </span>
              ))}
              <span className="inline-flex items-center gap-0.5 rounded-full bg-ink/5 px-2 py-0.5 text-[10px] text-ink/60">
                <ShieldCheck className="size-3" /> 本机检查
              </span>
            </div>
          )}
          {!value && !busy && (
            <button type="button" onClick={useSample} className="mt-2 text-xs font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
              用示例照片体验
            </button>
          )}
        </div>
      </div>

      {hasIssues && (
        <div className="mt-3 rounded-2xl bg-warning/10 p-3 text-xs text-[#8a5a1c]">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="size-3.5" /> 这张自拍可能影响分析准确度
          </div>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
            {quality!.issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          <div className="mt-2.5 flex gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="rounded-full bg-white px-3 py-1 font-medium text-ink shadow-sm">
              重新上传
            </button>
            <button type="button" onClick={() => onChange({ ...value!, acceptedIssues: true })} className="rounded-full px-3 py-1 text-ink/70 hover:bg-white/60">
              仍然使用
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="关闭提示">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
        className="mt-4 flex h-11 w-full items-center justify-between rounded-full border border-white bg-white/80 px-4 text-[13px] text-ink shadow-[0_6px_18px_-10px_rgba(47,43,102,0.35)] transition hover:bg-white disabled:opacity-50 md:h-12 md:px-5 md:text-sm"
      >
        <span className="flex items-center gap-3">
          <Upload className="size-4" />
          {value ? c.button : kind === "reference" ? "上传参考图" : "上传自拍"}
        </span>
        <ArrowRight className="size-4" />
      </button>
    </section>
  );
}
