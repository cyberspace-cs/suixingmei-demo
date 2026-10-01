"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AlertTriangle, Bookmark, BookmarkCheck, Camera, ImagePlus, Lock, RefreshCw, Sparkles, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { BeforeAfter } from "@/components/common/before-after";
import { PageSkeleton } from "@/components/common/empty-state";
import { ScoreCard } from "@/components/common/score-card";
import { AppHeader } from "@/components/shell/app-header";
import { MobileNav } from "@/components/shell/mobile-nav";
import { SessionBar } from "@/components/shell/session-bar";
import { createSession, scoreLook } from "@/lib/api";
import { MAX_UPLOAD_MB, normalizePortrait, readFile } from "@/lib/local/image";
import { LOOKS } from "@/lib/looks";
import { useApp } from "@/lib/store";
import type { ImageQuality, LookId, ScoreResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AfterCapture } from "./after-capture";
import { ScoringProgress } from "./scoring-progress";

export function DirectScoreView() {
  const hydrated = useApp((s) => s.hydrated);
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      {hydrated ? <DirectScore /> : <PageSkeleton />}
      <MobileNav />
    </div>
  );
}

function DirectScore() {
  const scenario = useApp((s) => s.settings.scenario);
  const saveLook = useApp((s) => s.saveLook);
  const [beforeCandidate] = useState(() => {
    const st = useApp.getState();
    return st.selfie?.src ?? st.sessions[0]?.selfieImage ?? "/images/user-bare.jpg";
  });
  const [after, setAfter] = useState<{ src: string; quality: ImageQuality; accepted?: boolean } | null>(null);
  const [before, setBefore] = useState<string | null>(beforeCandidate);
  const [lookId, setLookId] = useState<LookId | null>("peach");
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qualityWarn = after && !after.quality.ok && !after.accepted;

  const run = async () => {
    if (!after) return;
    setScoring(true);
    const id = await createSession();
    const [res] = await Promise.all([
      scoreLook(id, {
        before: before ?? "",
        after: after.src,
        stepsDone: 1,
        stepsTotal: 1,
        checksGood: 0,
        checksTotal: 0,
        lookId: lookId ?? "peach",
        scenario,
      }),
      new Promise((r) => setTimeout(r, 2600)),
    ]);
    setResult(before ? res : { ...res, improve: `${res.improve} 补一张素颜照，色彩和饱满度的对比会更准。` });
    setScoring(false);
    if (res.fallback) toast.warning("云端评分超时，已用本机规则估算", { description: "分数仅供参考" });
  };

  const reset = () => {
    setAfter(null);
    setResult(null);
    setSavedId(null);
  };

  const save = () => {
    if (!result || !after) return;
    const look = LOOKS[lookId ?? "peach"];
    const id = `look_direct_${Date.now().toString(36)}`;
    saveLook({
      id,
      lookId: look.id,
      lookName: lookId ? look.name : "我的日常妆",
      styleLabel: lookId ? look.styleLabel : "直接打分",
      referenceImage: lookId ? look.referenceImage : after.src,
      afterImage: after.src,
      score: result.total,
      savedAt: Date.now(),
    });
    setSavedId(id);
    toast.success("已保存到我的妆容");
  };

  const uploadBefore = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast.error("请选择 15MB 以内的图片");
      return;
    }
    setBefore(await normalizePortrait(await readFile(file)));
  };

  return (
    <main className="flex-1 px-4 pb-28 md:px-8 md:pb-12">
      <div className="mx-auto max-w-[1180px]">
        <SessionBar
          backHref="/looks"
          backLabel="我的妆容"
          title="直接打分"
          subtitle="已经化好妆了？拍一张妆后照，AI 从 5 个维度给出完成度参考分"
          actions={
            result &&
            (savedId ? (
              <Link href="/looks" className="inline-flex h-11 items-center gap-2 rounded-full border border-success/30 bg-success/10 px-5 text-sm text-success">
                <BookmarkCheck className="size-4" /> 已保存 · 去我的妆容
              </Link>
            ) : (
              <button onClick={save} className="btn-ink inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm">
                <Bookmark className="size-4" /> 保存到我的妆容
              </button>
            ))
          }
        />

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className="glass rounded-[26px] p-3 md:p-4">
            {result && after ? (
              before ? (
                <>
                  <BeforeAfter before={before} after={after.src} className="aspect-[3/4] max-h-[72dvh] w-full" />
                  <p className="mt-2.5 text-center text-xs text-ink/50">左右拖动，对比妆前妆后</p>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={after.src} alt="妆后照" className="aspect-[3/4] max-h-[72dvh] w-full rounded-[22px] object-cover" />
              )
            ) : after ? (
              <div className="space-y-3">
                <div className="relative aspect-[3/4] max-h-[60dvh] w-full overflow-hidden rounded-[22px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={after.src} alt="妆后照" className="h-full w-full object-cover" />
                  <span className="glass-strong absolute left-3 top-3 rounded-full px-3 py-1.5 text-xs text-ink">妆后照 · 待评分</span>
                </div>
                <button
                  onClick={() => setAfter(null)}
                  disabled={scoring}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-ink/15 bg-white/80 text-sm text-ink hover:bg-white disabled:opacity-50"
                >
                  <RefreshCw className="size-4" /> 重拍
                </button>
              </div>
            ) : (
              <AfterCapture demoSrc="/images/user-after.jpg" onCapture={(src, quality) => setAfter({ src, quality })} />
            )}
          </section>

          <section className="glass rounded-[26px] p-5 md:p-6">
            {scoring ? (
              <ScoringProgress />
            ) : result ? (
              <div>
                <ScoreCard score={result} />
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <button onClick={reset} className="inline-flex h-11 sm:flex-1 items-center justify-center gap-2 rounded-full border border-ink/15 bg-white/80 text-sm text-ink hover:bg-white">
                    <Camera className="size-4" /> 再测一次
                  </button>
                  <Link href="/" className="inline-flex h-11 sm:flex-1 items-center justify-center gap-2 rounded-full border border-ink/15 bg-white/80 text-sm text-ink hover:bg-white">
                    <Sparkles className="size-4" /> 跟着 AI 画一套
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div>
                  <div className="label-mono">Direct score</div>
                  <h2 className="mt-1 font-serif text-2xl font-bold text-ink">不跟妆，也能打分</h2>
                  <p className="mt-1 text-[13px] text-ink/60">适合出门前快速确认：对称、边缘、均匀、饱满、协调，哪里还能再补一下。</p>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-sm font-medium text-ink">妆前素颜照</h3>
                    <span className="text-[11px] text-ink/45">可选 · 有它对比更准</span>
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      void uploadBefore(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white/65 p-2.5">
                    {before ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={before} alt="妆前照" className="size-16 rounded-xl object-cover object-[50%_35%]" />
                    ) : (
                      <span className="grid size-16 place-items-center rounded-xl border border-dashed border-ink/20 text-ink/35">
                        <ImagePlus className="size-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1 text-xs text-ink/60">
                      {before ? (before === beforeCandidate ? "已使用工作台里的素颜照" : "已上传新的素颜照") : "不用素颜照，只看妆后效果"}
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button onClick={() => inputRef.current?.click()} className="rounded-full border border-ink/15 bg-white px-3 py-1.5 text-xs text-ink">
                        {before ? "更换" : "上传"}
                      </button>
                      {before && (
                        <button onClick={() => setBefore(null)} className="grid size-7 place-items-center rounded-full text-ink/50 hover:bg-white" aria-label="不使用妆前照">
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-ink">这次画的是？</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(Object.keys(LOOKS) as LookId[]).map((id) => (
                      <button
                        key={id}
                        onClick={() => setLookId(id)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs transition",
                          lookId === id ? "border-ink bg-ink text-white" : "border-ink/12 bg-white/70 text-ink/75 hover:border-ink/30",
                        )}
                      >
                        {LOOKS[id].name}
                      </button>
                    ))}
                    <button
                      onClick={() => setLookId(null)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition",
                        lookId === null ? "border-ink bg-ink text-white" : "border-ink/12 bg-white/70 text-ink/75 hover:border-ink/30",
                      )}
                    >
                      说不上来
                    </button>
                  </div>
                </div>

                {qualityWarn && (
                  <div className="rounded-2xl bg-warning/10 p-3 text-xs text-[#8a5a1c]">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="size-3.5" /> 这张照片可能影响评分
                    </p>
                    <p className="mt-1">{after!.quality.issues.join("；")}</p>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => setAfter(null)} className="rounded-full bg-white px-3 py-1 font-medium text-ink shadow-sm">
                        重拍
                      </button>
                      <button onClick={() => setAfter({ ...after!, accepted: true })} className="rounded-full px-3 py-1 text-ink/70 hover:bg-white/60">
                        仍然使用
                      </button>
                    </div>
                  </div>
                )}

                <p className="flex gap-1.5 rounded-2xl bg-white/55 p-3.5 text-xs leading-relaxed text-ink/65">
                  <Lock className="mt-px size-3.5 shrink-0" />
                  点「上传并打分」会把{before ? "妆前、妆后两张照片" : "妆后照"}上传给 AI 分析，分析完不保存原图。分数只评价妆面完成度，不评价长相。
                </p>

                <button
                  onClick={run}
                  disabled={!after || !!qualityWarn}
                  className={cn(
                    "inline-flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-medium",
                    after && !qualityWarn ? "btn-ink" : "cursor-not-allowed bg-ink/12 text-ink/45",
                  )}
                >
                  <Wand2 className="size-4" /> {after ? "上传并打分" : "先拍或上传一张妆后照"}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
