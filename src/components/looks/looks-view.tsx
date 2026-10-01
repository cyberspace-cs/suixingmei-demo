"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Camera, ChevronRight, Heart, Pencil, RotateCcw, ScanFace, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageSkeleton } from "@/components/common/empty-state";
import { openSession } from "@/components/history/history-view";
import { FaceDetailDialog } from "@/components/home/face-detail-dialog";
import { ToolsDialog } from "@/components/home/tools-dialog";
import { AppFooter } from "@/components/shell/app-footer";
import { AppHeader } from "@/components/shell/app-header";
import { MobileNav } from "@/components/shell/mobile-nav";
import { analyzeQuality } from "@/lib/local/image";
import { formatDay } from "@/lib/format";
import { LOOKS } from "@/lib/looks";
import { useApp } from "@/lib/store";
import type { SavedLook } from "@/lib/types";
import { asset } from "@/lib/utils";

function LookCard({ look }: { look: SavedLook }) {
  const router = useRouter();
  const removeLook = useApp((s) => s.removeLook);
  const session = useApp((s) => (look.sessionId ? s.sessions.find((x) => x.id === look.sessionId) : undefined));
  const preset = LOOKS[look.lookId];

  const followAgain = async () => {
    const st = useApp.getState();
    st.setReference({ src: preset.referenceImage, sample: true, sampleLook: look.lookId, name: look.lookName });
    if (!st.selfie) {
      const src = st.sessions[0]?.selfieImage ?? asset("/images/user-bare.jpg");
      st.setSelfie({ src, sample: src === asset("/images/user-bare.jpg"), quality: await analyzeQuality(src) });
    }
    router.push("/?auto=1");
  };

  return (
    <article className="glass group flex flex-col overflow-hidden rounded-[24px] p-2.5">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[18px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={look.referenceImage} alt={look.lookName} className="h-full w-full object-cover object-[50%_30%] transition duration-500 group-hover:scale-[1.03]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1f1c45]/55 to-transparent" />
        {look.afterImage && (
          <div className="absolute bottom-3 right-3 flex flex-col items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={look.afterImage} alt="我画的效果" className="size-14 rounded-full border-[3px] border-white object-cover object-[50%_35%] shadow-md" />
            <span className="text-[10px] text-white/90">我画的</span>
          </div>
        )}
        {typeof look.score === "number" && (
          <span className="glass-strong absolute left-3 top-3 rounded-full px-2.5 py-1 font-mono text-xs font-semibold text-ink">{look.score} 分</span>
        )}
        <button
          onClick={() => {
            removeLook(look.id);
            toast("已取消收藏", { description: look.lookName });
          }}
          className="glass-strong absolute right-3 top-3 grid size-8 place-items-center rounded-full text-ink/60 opacity-0 transition hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="取消收藏"
        >
          <Trash2 className="size-3.5" />
        </button>
        <div className="absolute bottom-3 left-3 text-white">
          <div className="font-serif text-lg font-semibold drop-shadow">{look.lookName}</div>
          <div className="text-[11px] text-white/80">{look.styleLabel}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 px-1.5 pb-1 pt-2.5">
        <span className="flex-1 text-[11px] text-ink/45">收藏于 {formatDay(look.savedAt)}</span>
        {session?.score && (
          <button onClick={() => router.push(openSession(session, "/complete"))} className="rounded-full px-2.5 py-1.5 text-xs text-ink/65 hover:bg-white/70 hover:text-ink">
            看结果
          </button>
        )}
        <button onClick={followAgain} className="btn-ink inline-flex h-8 items-center gap-1 rounded-full px-3.5 text-xs">
          <RotateCcw className="size-3" /> 再跟一次
        </button>
      </div>
    </article>
  );
}

export function LooksView() {
  const hydrated = useApp((s) => s.hydrated);
  const looks = useApp((s) => s.looks);
  const tools = useApp((s) => s.tools);
  const profile = useApp((s) => s.sessions.find((x) => x.face && x.selfieImage));
  const [toolsOpen, setToolsOpen] = useState(false);
  const [faceOpen, setFaceOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="flex-1 px-4 pb-28 md:px-8 md:pb-10">
        <div className="mx-auto max-w-[1240px]">
          <div className="pt-2">
            <div className="label-mono">My looks</div>
            <h1 className="mt-1 font-serif text-[28px] font-bold text-ink md:text-[34px]">我的妆容</h1>
            <p className="mt-1 text-[13px] text-ink/60">收藏的妆容、你的脸型档案和手边工具都在这里，下次一键再跟一次。</p>
          </div>

          {!hydrated ? (
            <PageSkeleton />
          ) : (
            <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <section>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="flex items-center gap-1.5 font-serif text-lg font-semibold text-ink">
                    <Heart className="size-4 text-rose" /> 收藏的妆容
                    <span className="ml-1 font-mono text-xs font-normal text-ink/45">{looks.length}</span>
                  </h2>
                  <Link href="/" className="text-xs text-ink/60 hover:text-ink">
                    + 用新的参考图
                  </Link>
                </div>
                {looks.length === 0 ? (
                  <EmptyState
                    icon={<Heart className="size-7" />}
                    title="还没有收藏的妆容"
                    description="跟妆完成、打完分后点「保存到我的妆容」，喜欢的妆就能随时再跟一次。"
                    action={
                      <Link href="/" className="btn-ink inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm">
                        <Sparkles className="size-4" /> 去妆容工作台
                      </Link>
                    }
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                    {looks.map((l) => (
                      <LookCard key={l.id} look={l} />
                    ))}
                  </div>
                )}
              </section>

              <aside className="space-y-4">
                <Link
                  href="/score"
                  className="group relative block overflow-hidden rounded-[24px] bg-gradient-to-br from-[#3d3880] via-[#2a2660] to-[#221f4f] p-5 text-white shadow-[0_20px_44px_-24px_rgba(38,35,95,0.9)]"
                >
                  <div className="absolute -right-8 -top-10 size-36 rounded-full bg-peach/25 blur-2xl" />
                  <div className="label-mono text-white/55">Direct score</div>
                  <div className="mt-1 font-serif text-xl font-semibold">已经化好妆了？</div>
                  <p className="mt-1 text-[13px] text-white/70">拍一张妆后照，30 秒拿到完成度参考分和改进建议。</p>
                  <span className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-ink transition group-hover:gap-3">
                    <Camera className="size-4" /> 直接打分 <ArrowRight className="size-4" />
                  </span>
                </Link>

                <section className="glass rounded-[24px] p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      <ScanFace className="size-4" /> 脸型档案
                    </h2>
                    <span className="text-[11px] text-ink/45">本机分析 · 不上传</span>
                  </div>
                  {profile?.face ? (
                    <button onClick={() => setFaceOpen(true)} className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-white/65 p-2.5 text-left transition hover:bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={profile.selfieImage} alt="我的素颜照" className="size-16 rounded-xl object-cover object-[50%_35%]" />
                      <div className="min-w-0 flex-1">
                        <div className="font-serif text-lg font-semibold text-ink">{profile.face.faceShapeLabel}</div>
                        <p className="text-xs leading-relaxed text-ink/60">{profile.face.summary}</p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-ink/40" />
                    </button>
                  ) : (
                    <div className="mt-3 rounded-2xl bg-white/45 p-4 text-center">
                      <p className="text-xs text-ink/55">上传一张素颜自拍，AI 会分析你的脸型，并按脸型调整每一套妆。</p>
                      <Link href="/" className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-ink underline underline-offset-4">
                        <Wand2 className="size-3.5" /> 去上传自拍
                      </Link>
                    </div>
                  )}
                </section>

                <section className="glass rounded-[24px] p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-ink">手边工具</h2>
                    <button onClick={() => setToolsOpen(true)} className="inline-flex items-center gap-1 text-xs text-ink/60 hover:text-ink">
                      <Pencil className="size-3" /> 编辑
                    </button>
                  </div>
                  {tools.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tools.map((t) => (
                        <span key={t} className="rounded-full bg-white/80 px-2.5 py-1 text-xs text-ink/75">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-ink/55">还没有添加工具。没有刷子也没关系，AI 会给出用指腹完成的做法。</p>
                  )}
                  <p className="mt-3 text-[11px] leading-relaxed text-ink/45">跟妆步骤会按这里的工具调整做法，比如没有眼影刷时改用指腹点涂。</p>
                </section>
              </aside>
            </div>
          )}
        </div>
      </main>
      <AppFooter />
      <MobileNav />
      <ToolsDialog open={toolsOpen} onOpenChange={setToolsOpen} />
      {profile?.face && <FaceDetailDialog open={faceOpen} onOpenChange={setFaceOpen} session={profile} />}
    </div>
  );
}
