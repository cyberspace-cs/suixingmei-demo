"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, ArrowRight, Bookmark, BookmarkCheck, Camera, Check, CircleDashed, Clock, Home, Lock, RefreshCw, ScanFace, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { BeforeAfter } from "@/components/common/before-after";
import { CheckRecordDialog, formatTime } from "@/components/common/check-record-dialog";
import { CheckPhoto } from "@/components/common/check-view";
import { EmptyState, PageSkeleton } from "@/components/common/empty-state";
import { PartGlyph } from "@/components/common/part-glyph";
import { ScoreCard } from "@/components/common/score-card";
import { AfterCapture } from "@/components/score/after-capture";
import { ScoringProgress } from "@/components/score/scoring-progress";
import { AppHeader } from "@/components/shell/app-header";
import { SessionBar } from "@/components/shell/session-bar";
import { scoreLook } from "@/lib/api";
import { formatElapsed } from "@/lib/format";
import { PARTS } from "@/lib/looks";
import { useApp, useCurrentSession } from "@/lib/store";
import type { CheckRecord, ImageQuality, Session } from "@/lib/types";
import { asset, cn } from "@/lib/utils";

export function CompleteView() {
  const hydrated = useApp((s) => s.hydrated);
  const session = useCurrentSession();

  if (!hydrated)
    return (
      <div className="min-h-dvh">
        <AppHeader />
        <PageSkeleton />
      </div>
    );

  if (!session?.face) {
    return (
      <div className="min-h-dvh">
        <AppHeader />
        <main className="mx-auto max-w-xl px-5 py-16">
          <EmptyState
            icon={<ScanFace className="size-7" />}
            title="还没有可以打分的妆容"
            description="跟着 AI 画完一套妆后会来到这里；已经化好妆的话，也可以直接拍一张打分。"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/score" className="btn-ink inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm">
                  直接打分 <ArrowRight className="size-4" />
                </Link>
                <Link href="/" className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 bg-white/70 px-5 text-sm text-ink">
                  去妆容工作台
                </Link>
              </div>
            }
          />
        </main>
      </div>
    );
  }

  return <CompleteSession key={session.id} session={session} />;
}

function CompleteSession({ session }: { session: Session }) {
  const router = useRouter();
  const scenario = useApp((s) => s.settings.scenario);
  const updateSession = useApp((s) => s.updateSession);
  const saveLook = useApp((s) => s.saveLook);
  const saved = useApp((s) => s.looks.some((l) => l.sessionId === session.id));
  const [draft, setDraft] = useState<{ src: string; quality: ImageQuality; accepted?: boolean } | null>(null);
  const [scoring, setScoring] = useState(false);
  const [viewing, setViewing] = useState<CheckRecord | null>(null);

  const parts = session.plan.filter((p) => p.included);
  const allSteps = parts.flatMap((p) => p.steps);
  const done = session.progress.done;
  const stepsDone = allSteps.filter((s) => done.includes(s.id)).length;
  const partsLeft = parts.filter((p) => !p.steps.every((s) => done.includes(s.id)));
  const checksGood = session.checks.filter((c) => c.status === "good").length;
  const scored = !!session.score && !!session.afterImage;
  const demoSrc = session.selfieSample ? asset("/images/user-after.jpg") : undefined;
  const qualityWarn = draft && !draft.quality.ok && !draft.accepted;

  const runScore = async () => {
    if (!draft) return;
    setScoring(true);
    const [res] = await Promise.all([
      scoreLook(session.id, {
        before: session.selfieImage,
        after: draft.src,
        stepsDone,
        stepsTotal: allSteps.length,
        checksGood,
        checksTotal: session.checks.length,
        lookId: session.lookId,
        scenario,
      }),
      new Promise((r) => setTimeout(r, 2600)),
    ]);
    updateSession(session.id, (s) => ({ ...s, afterImage: draft.src, score: res, status: "completed", completedAt: Date.now() }));
    setScoring(false);
    setDraft(null);
    if (res.fallback) toast.warning("云端评分超时，已用本机规则估算", { description: "分数仅供参考" });
  };

  const save = () => {
    saveLook({
      id: `look_${session.id}`,
      sessionId: session.id,
      lookId: session.lookId,
      lookName: session.lookName,
      styleLabel: session.analysis?.styleLabel ?? "",
      referenceImage: session.referenceImage,
      afterImage: session.afterImage,
      score: session.score?.total,
      savedAt: Date.now(),
    });
    toast.success("已保存到我的妆容", { description: "下次可以一键再跟一次" });
  };

  const retake = () => {
    updateSession(session.id, (s) => ({ ...s, score: undefined, afterImage: undefined }));
    setDraft(null);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="flex-1 px-4 pb-16 md:px-8">
        <div className="mx-auto max-w-[1180px]">
          <SessionBar
            backHref={scored ? "/history" : "/follow"}
            backLabel={scored ? "历史妆容" : "返回跟妆"}
            title={scored ? `${session.lookName} · 完成` : partsLeft.length ? "先到这里，拍张妆后照" : "画完啦，拍张妆后照"}
            subtitle={
              <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" /> 用时 {formatElapsed(session.elapsedS)}
                </span>
                <span>
                  完成 {stepsDone}/{allSteps.length} 小步
                </span>
                <span>帮我看看 {session.checks.length} 次</span>
              </span>
            }
            actions={
              scored &&
              (saved ? (
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
              {scored ? (
                <>
                  <BeforeAfter before={session.selfieImage} after={session.afterImage!} className="aspect-[3/4] max-h-[72dvh] w-full" />
                  <p className="mt-2.5 text-center text-xs text-ink/50">左右拖动，对比妆前妆后</p>
                </>
              ) : draft ? (
                <div className="space-y-3">
                  <div className="relative aspect-[3/4] max-h-[60dvh] w-full overflow-hidden rounded-[22px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={draft.src} alt="妆后照" className="h-full w-full object-cover" />
                    <span className="glass-strong absolute left-3 top-3 rounded-full px-3 py-1.5 text-xs text-ink">妆后照 · 待评分</span>
                  </div>
                  <button
                    onClick={() => setDraft(null)}
                    disabled={scoring}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-ink/15 bg-white/80 text-sm text-ink hover:bg-white disabled:opacity-50"
                  >
                    <RefreshCw className="size-4" /> 重拍
                  </button>
                </div>
              ) : (
                <AfterCapture demoSrc={demoSrc} onCapture={(src, quality) => setDraft({ src, quality })} />
              )}
            </section>

            <section className="glass rounded-[26px] p-5 md:p-6">
              {scoring ? (
                <ScoringProgress />
              ) : scored ? (
                <div>
                  <ScoreCard score={session.score!} />
                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <button onClick={retake} className="inline-flex h-11 sm:flex-1 items-center justify-center gap-2 rounded-full border border-ink/15 bg-white/80 text-sm text-ink hover:bg-white">
                      <Camera className="size-4" /> 再拍一张
                    </button>
                    <button
                      onClick={() => router.push("/")}
                      className="inline-flex h-11 sm:flex-1 items-center justify-center gap-2 rounded-full border border-ink/15 bg-white/80 text-sm text-ink hover:bg-white"
                    >
                      <Home className="size-4" /> 回妆容工作台
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div>
                    <div className="label-mono">Session summary</div>
                    <h2 className="mt-1 font-serif text-2xl font-bold text-ink">{session.lookName}</h2>
                    <p className="mt-1 text-[13px] text-ink/60">
                      {partsLeft.length
                        ? `还有 ${partsLeft.map((p) => p.label).join("、")}没画，未完成的部位不计入评分。`
                        : `已按你的${session.face?.faceShapeLabel ?? "脸型"}完成全部 ${parts.length} 个部位。`}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { k: "用时", v: formatElapsed(session.elapsedS) },
                      { k: "完成小步", v: `${stepsDone}/${allSteps.length}` },
                      { k: "帮我看看", v: session.checks.length ? `${checksGood}/${session.checks.length} 通过` : "没用到" },
                    ].map((s) => (
                      <div key={s.k} className="rounded-2xl bg-white/70 px-3 py-3">
                        <div className="text-[11px] text-ink/50">{s.k}</div>
                        <div className="mt-0.5 font-mono text-lg font-semibold text-ink">{s.v}</div>
                      </div>
                    ))}
                  </div>

                  <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {parts.map((p) => {
                      const ok = p.steps.every((s) => done.includes(s.id));
                      return (
                        <li key={p.key} className={cn("flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px]", ok ? "bg-white/70 text-ink" : "bg-white/35 text-ink/45")}>
                          <PartGlyph part={p.key} className="size-4" />
                          <span className="flex-1">{p.label}</span>
                          {ok ? <Check className="size-3.5 text-success" /> : <CircleDashed className="size-3.5" />}
                        </li>
                      );
                    })}
                  </ul>

                  {qualityWarn && (
                    <div className="rounded-2xl bg-warning/10 p-3 text-xs text-[#8a5a1c]">
                      <p className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="size-3.5" /> 这张照片可能影响评分
                      </p>
                      <p className="mt-1">{draft!.quality.issues.join("；")}</p>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => setDraft(null)} className="rounded-full bg-white px-3 py-1 font-medium text-ink shadow-sm">
                          重拍
                        </button>
                        <button onClick={() => setDraft({ ...draft!, accepted: true })} className="rounded-full px-3 py-1 text-ink/70 hover:bg-white/60">
                          仍然使用
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl bg-white/55 p-3.5 text-xs leading-relaxed text-ink/65">
                    <p className="flex gap-1.5">
                      <Lock className="mt-px size-3.5 shrink-0" />
                      评分会把妆前、妆后两张照片上传给 AI 对比，分析完不保存原图。拍照时尽量保持和素颜照一样的光线和角度。
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={runScore}
                      disabled={!draft || !!qualityWarn}
                      className={cn(
                        "inline-flex h-12 sm:flex-[1.4] items-center justify-center gap-2 rounded-full text-[15px] font-medium",
                        draft && !qualityWarn ? "btn-ink" : "cursor-not-allowed bg-ink/12 text-ink/45",
                      )}
                    >
                      <Wand2 className="size-4" /> {draft ? "上传并打分" : "先拍一张妆后照"}
                    </button>
                    <button
                      onClick={() => router.push(partsLeft.length ? "/follow" : "/history")}
                      className="inline-flex h-12 items-center justify-center rounded-full border border-ink/15 bg-white/70 text-sm text-ink hover:bg-white sm:flex-1"
                    >
                      {partsLeft.length ? "回去接着画" : "稍后再打分"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>

          {session.checks.length > 0 && (
            <section className="glass mt-5 rounded-[26px] p-4 md:p-5">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="label-mono">Photo reviews</div>
                  <h2 className="font-serif text-lg font-semibold text-ink">这次的「帮我看看」</h2>
                </div>
                <span className="text-xs text-ink/50">点开可查看当时的评价</span>
              </div>
              <ul className="scrollbar-none mt-3 flex gap-3 overflow-x-auto pb-1">
                {session.checks.map((r) => (
                  <li key={r.id} className="w-[150px] shrink-0">
                    <button onClick={() => setViewing(r)} className="group block w-full text-left">
                      <div className="relative overflow-hidden rounded-2xl">
                        <CheckPhoto image={r.image} part={r.part} landmarkSet={r.landmarkSet} result={r} className="aspect-[4/3]" />
                        <span className={cn("absolute right-2 top-2 size-2.5 rounded-full ring-2 ring-white", r.status === "good" ? "bg-success" : "bg-[#e07a5f]")} />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-xs text-ink/60">
                        <span className="font-medium text-ink">{PARTS[r.part].label}</span>
                        <span>{formatTime(r.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-ink/50 group-hover:text-ink/75">{r.summary}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
      <CheckRecordDialog record={viewing} onOpenChange={(o) => !o && setViewing(null)} />
    </div>
  );
}
