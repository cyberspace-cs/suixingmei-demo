"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AppFooter } from "@/components/shell/app-footer";
import { AppHeader } from "@/components/shell/app-header";
import { MobileNav } from "@/components/shell/mobile-nav";
import { PageSkeleton } from "@/components/common/empty-state";
import { useAnalysis } from "@/hooks/use-analysis";
import { analyzeQuality } from "@/lib/local/image";
import { useApp, useCurrentSession } from "@/lib/store";
import { asset, cn } from "@/lib/utils";
import { AnalysisPanel } from "./analysis-panel";
import { CenterStage } from "./center-stage";
import { UploadCard } from "./upload-card";

export function HomeWorkbench() {
  const router = useRouter();
  const hydrated = useApp((s) => s.hydrated);
  const reference = useApp((s) => s.reference);
  const selfie = useApp((s) => s.selfie);
  const setReference = useApp((s) => s.setReference);
  const setSelfie = useApp((s) => s.setSelfie);
  const session = useCurrentSession();
  const { run, stage, done, running } = useAnalysis();
  const autoRan = useRef(false);

  const matches = !!session && !!reference && !!selfie && session.referenceImage === reference.src && session.selfieImage === selfie.src;
  const phase = running ? "analyzing" : !reference || !selfie ? "empty" : matches ? "done" : "ready";
  const selfieBlocked = !!selfie?.quality && !selfie.quality.ok && !selfie.acceptedIssues;

  const start = async () => {
    const s = await run();
    if (!s) return;
    if (s.analysis?.fallback) toast.warning("云端解析超时，已切换本机识别", { description: "结果仅供参考，可稍后重试" });
    else toast.success(`识别完成：${s.lookName}`, { description: `${s.face?.faceShapeLabel} · 已生成专属步骤` });
  };

  useEffect(() => {
    if (!hydrated || autoRan.current) return;
    if (new URLSearchParams(window.location.search).get("auto") === "1" && reference && selfie && !matches) {
      autoRan.current = true;
      window.history.replaceState(null, "", window.location.pathname);
      start();
    }
  });

  const fillSamples = async () => {
    setReference({ src: asset("/images/ref-peach.jpg"), sample: true, sampleLook: "peach", name: "示例参考妆" });
    const quality = await analyzeQuality(asset("/images/user-bare.jpg"));
    setSelfie({ src: asset("/images/user-bare.jpg"), sample: true, name: "示例自拍", quality });
  };

  const goFollow = () => {
    if (!session) return;
    if (session.status === "completed") {
      useApp.getState().updateSession(session.id, (s) => ({
        ...s,
        status: "ready",
        progress: { partIndex: 0, stepIndex: 0, done: [] },
        checks: [],
        chat: [],
        score: undefined,
        afterImage: undefined,
        elapsedS: 0,
      }));
    }
    router.push("/follow");
  };

  const included = session?.plan.filter((p) => p.included) ?? [];
  const doneParts = included.filter((p) => p.steps.every((st) => session?.progress.done.includes(st.id))).length;
  const resuming = phase === "done" && session?.status === "following" && session.progress.done.length > 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="flex-1 px-4 pb-28 md:px-8 md:pb-4">
        <div className="mx-auto max-w-[1360px]">
          <div className="pt-2 text-center md:pt-1">
            <h1 className="font-serif text-[30px] font-bold leading-[1.25] tracking-[0.04em] text-ink sm:text-[40px] lg:text-[46px]">
              让喜欢的妆容
              <br />
              成为你的独特之美
            </h1>
            <p className="mt-2 text-sm tracking-[0.12em] text-ink/60 md:text-base">从一张灵感照片，到适合你的专属妆容</p>
          </div>

          {!hydrated ? (
            <PageSkeleton />
          ) : (
            <div className="mt-6 grid items-start gap-5 lg:mt-0 lg:grid-cols-[minmax(270px,310px)_1fr_minmax(290px,330px)] lg:gap-8">
              <div className="order-1 grid grid-cols-2 gap-3 lg:mt-2 lg:grid-cols-1 lg:gap-5">
                <UploadCard kind="reference" value={reference} onChange={setReference} disabled={running} />
                <UploadCard kind="selfie" value={selfie} onChange={setSelfie} disabled={running} />
              </div>

              <div className="order-2 flex flex-col items-center lg:mt-3">
                <CenterStage phase={phase} selfie={selfie} session={session} />
                <div className="relative z-10 mt-5 flex w-full max-w-[300px] flex-col items-center">
                  {phase === "done" ? (
                    <button onClick={goFollow} className="btn-ink flex h-[58px] w-full items-center justify-between rounded-full px-7 text-lg font-medium tracking-wider transition">
                      <Sparkles className="size-5" />
                      <span>{resuming ? `继续跟妆 · ${doneParts}/${included.length}` : session?.status === "completed" ? "再跟一次" : "开始跟妆"}</span>
                      <ArrowRight className="size-5" />
                    </button>
                  ) : (
                    <button
                      onClick={start}
                      disabled={phase !== "ready" || selfieBlocked}
                      className={cn(
                        "flex h-[58px] w-full items-center justify-center gap-3 rounded-full text-lg font-medium tracking-wider transition",
                        phase === "ready" && !selfieBlocked ? "btn-ink" : "cursor-not-allowed bg-ink/15 text-ink/45",
                      )}
                    >
                      {phase === "analyzing" ? <Loader2 className="size-5 animate-spin" /> : <Wand2 className="size-5" />}
                      {phase === "analyzing" ? "识别中…" : phase === "ready" ? (selfieBlocked ? "先处理自拍提示" : "开始识别") : "先上传两张照片"}
                    </button>
                  )}
                  <p className="mt-2.5 text-center text-xs tracking-wide text-ink/55">
                    {phase === "done" ? "根据你的脸型与工具，逐步引导" : phase === "empty" ? (
                      <button onClick={fillSamples} className="font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
                        没有合适的照片？用示例照片体验
                      </button>
                    ) : "识别参考妆与脸型，生成专属步骤"}
                  </p>
                </div>
              </div>

              <div className="order-3 lg:mt-2">
                <AnalysisPanel phase={phase} session={session} stage={stage} doneStages={done} onRetry={start} />
              </div>
            </div>
          )}
        </div>
      </main>
      <AppFooter />
      <MobileNav />
    </div>
  );
}
