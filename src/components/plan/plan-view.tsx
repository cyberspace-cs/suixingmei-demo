"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, Clock, ImageOff, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageSkeleton } from "@/components/common/empty-state";
import { FaceCanvas, type ZoneSpec } from "@/components/common/face-canvas";
import { PartGlyph } from "@/components/common/part-glyph";
import { AppHeader } from "@/components/shell/app-header";
import { SessionBar } from "@/components/shell/session-bar";
import { Switch } from "@/components/ui/switch";
import { LANDMARKS } from "@/lib/face-geometry";
import { FACE_SHAPE_LABEL, minutesOf } from "@/lib/looks";
import { landmarkSetOf, useApp, useCurrentSession } from "@/lib/store";
import type { PartKey } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PlanView() {
  const router = useRouter();
  const hydrated = useApp((s) => s.hydrated);
  const session = useCurrentSession();
  const updateSession = useApp((s) => s.updateSession);
  const [selected, setSelected] = useState<PartKey | null>(null);
  const [compare, setCompare] = useState(true);

  if (!hydrated)
    return (
      <div className="min-h-dvh">
        <AppHeader />
        <PageSkeleton />
      </div>
    );

  if (!session?.analysis || !session.face) {
    return (
      <div className="min-h-dvh">
        <AppHeader />
        <main className="mx-auto max-w-xl px-5 py-16">
          <EmptyState
            icon={<Wand2 className="size-7" />}
            title="还没有妆容方案"
            description="先在妆容工作台上传一张参考妆和一张素颜自拍，AI 会按你的脸型生成专属方案。"
            action={
              <Link href="/" className="btn-ink inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm">
                去妆容工作台 <ArrowRight className="size-4" />
              </Link>
            }
          />
        </main>
      </div>
    );
  }

  const face = session.face;
  const userL = LANDMARKS[landmarkSetOf(session)];
  const refKnown = session.referenceSample === "peach";
  const included = session.plan.filter((p) => p.included);
  const adjusted = new Map(session.adapt?.adjustments.map((a) => [a.part, a]) ?? []);
  const active = selected ?? null;
  const modelShape = session.analysis.modelFaceShape;
  const adjustCount = included.filter((p) => adjusted.has(p.key)).length;
  const locked = session.status === "following" && session.progress.done.length > 0;

  const togglePart = (key: PartKey) => {
    const on = session.plan.find((p) => p.key === key)?.included;
    if (on && included.length <= 1) {
      toast("至少保留一个部位");
      return;
    }
    updateSession(session.id, (s) => ({
      ...s,
      plan: s.plan.map((p) => (p.key === key ? { ...p, included: !p.included } : p)),
      progress: locked ? s.progress : { partIndex: 0, stepIndex: 0, done: [] },
    }));
  };

  const userZones: ZoneSpec[] = included.map((p) => ({
    part: p.key,
    variant: "adapted",
    look: "solid",
    dim: !!active && active !== p.key,
  }));
  if (compare) {
    const ghostParts = active ? [active] : included.map((p) => p.key).filter((k) => adjusted.has(k));
    ghostParts.forEach((part) => userZones.push({ part, variant: "reference", look: "ghost" }));
  }
  const refZones: ZoneSpec[] = included.map((p) => ({
    part: p.key,
    variant: "reference",
    look: "solid",
    dim: !!active && active !== p.key,
  }));

  const stepsCount = included.reduce((a, p) => a + p.steps.length, 0);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="flex-1 px-4 pb-28 md:px-8 md:pb-8">
        <div className="mx-auto max-w-[1360px]">
          <SessionBar
            backHref="/"
            backLabel="返回妆容工作台"
            title={`${session.lookName} · 专属方案`}
            subtitle={
              <>
                按你的{face.faceShapeLabel}调整了 <b className="font-semibold text-ink">{adjustCount}</b> 处画法 · {included.length} 个部位 · 约 {minutesOf(session.plan)} 分钟
              </>
            }
            actions={
              <button
                onClick={() => router.push("/follow")}
                className="btn-ink hidden h-12 items-center gap-3 rounded-full px-6 text-[15px] font-medium md:inline-flex"
              >
                <Sparkles className="size-4" /> {locked ? "继续跟妆" : "开始跟妆"} <ArrowRight className="size-4" />
              </button>
            }
          />

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_minmax(360px,420px)_1fr]">
            <section className="glass order-1 rounded-[26px] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="label-mono">Reference</div>
                  <h2 className="font-serif text-lg font-semibold text-ink">参考妆</h2>
                </div>
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-ink/70">模特 · {FACE_SHAPE_LABEL[modelShape]}</span>
              </div>
              <div className="relative mt-3 aspect-[3/4] overflow-hidden rounded-2xl bg-white/50">
                {refKnown ? (
                  <FaceCanvas src={session.referenceImage} landmarks={LANDMARKS["ref-peach"]} shape={modelShape} zones={refZones} />
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={session.referenceImage} alt="参考妆" className="h-full w-full object-cover" />
                    <span className="glass-strong absolute bottom-3 left-3 right-3 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] text-ink/70">
                      <ImageOff className="size-3.5" /> 参考图的妆面区域需接入 face-parsing 后标注
                    </span>
                  </>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] text-white">{session.analysis.styleLabel}</span>
                {session.analysis.techniques.map((t) => (
                  <span key={t} className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] text-ink/70">
                    {t}
                  </span>
                ))}
              </div>
            </section>

            <section className="glass order-3 flex flex-col rounded-[26px] p-4 lg:order-2">
              <div className="flex items-center justify-between px-1">
                <div>
                  <div className="label-mono">Steps</div>
                  <h2 className="font-serif text-lg font-semibold text-ink">跟妆部位</h2>
                </div>
                <span className="text-xs text-ink/50">点选查看调整 · 开关决定是否跟做</span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {session.plan.map((p) => {
                  const adj = adjusted.get(p.key);
                  const isActive = active === p.key;
                  const partDone = p.steps.every((st) => session.progress.done.includes(st.id));
                  return (
                    <li key={p.key}>
                      <div
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition",
                          isActive ? "border-ink/20 bg-white shadow-sm" : "border-transparent hover:bg-white/60",
                          !p.included && "opacity-55",
                        )}
                      >
                        <button
                          onClick={() => setSelected(isActive ? null : p.key)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          aria-expanded={isActive}
                        >
                          <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", p.included ? "bg-ink/[0.06] text-ink" : "bg-ink/[0.03] text-ink/50")}>
                            <PartGlyph part={p.key} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                              {p.label}
                              {adj && p.included && (
                                <span className="rounded-full bg-peach/30 px-1.5 py-px text-[10px] font-medium text-[#a4513f]">为你调整</span>
                              )}
                              {partDone && locked && <Check className="size-3.5 text-success" />}
                            </span>
                            <span className="block truncate text-[11px] text-ink/50">
                              {p.steps.length} 小步 · {p.tool}
                              {p.shade ? ` · ${p.shade}` : ""}
                            </span>
                          </span>
                        </button>
                        <Switch checked={p.included} onCheckedChange={() => togglePart(p.key)} aria-label={`${p.included ? "跳过" : "加入"}${p.label}`} />
                      </div>
                      {isActive && (
                        <div className="mx-2 mb-1 mt-1.5 rounded-xl bg-white/70 p-3 text-xs leading-relaxed">
                          {adj ? (
                            <div className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1.5">
                              <span className="text-ink/45">参考妆</span>
                              <span className="text-ink/70">{adj.reference}</span>
                              <span className="font-medium text-[#a4513f]">为你</span>
                              <span className="font-medium text-ink">{adj.forYou}</span>
                            </div>
                          ) : (
                            <p className="text-ink/60">这一部位直接按参考妆画即可。</p>
                          )}
                          <ol className="mt-2.5 space-y-1 border-t border-ink/[0.06] pt-2 text-ink/65">
                            {p.steps.map((st, i) => (
                              <li key={st.id}>
                                {i + 1}. {st.title}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-auto flex items-center justify-between gap-2 px-1 pt-4 text-xs text-ink/60">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" /> 已选 {included.length} 个部位 · {stepsCount} 小步 · 约 {minutesOf(session.plan)} 分钟
                </span>
                {locked && <span className="text-ink/45">已开始的进度会保留</span>}
              </div>
            </section>

            <section className="glass order-2 rounded-[26px] p-4 lg:order-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="label-mono">For you</div>
                  <h2 className="font-serif text-lg font-semibold text-ink">你的版本</h2>
                </div>
                <span className="rounded-full bg-ink px-3 py-1 text-xs text-white">你 · {face.faceShapeLabel}</span>
              </div>
              <div className="relative mt-3 aspect-[3/4] overflow-hidden rounded-2xl bg-white/50">
                <FaceCanvas src={session.selfieImage} landmarks={userL} shape={face.faceShape} zones={userZones} />
                {active && adjusted.get(active) && (
                  <div className="glass-strong absolute inset-x-3 bottom-3 rounded-xl px-3 py-2 text-[12px] leading-relaxed text-ink">
                    <span className="font-semibold">{session.plan.find((p) => p.key === active)?.label}：</span>
                    {adjusted.get(active)!.forYou}
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-ink/60">
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-4 rounded-sm bg-[#EE8F98]/70" /> 为你调整
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-4 rounded-sm border border-dashed border-ink/50" /> 照搬参考妆
                  </span>
                </span>
                <label className="flex items-center gap-1.5">
                  对比原位置 <Switch checked={compare} onCheckedChange={setCompare} />
                </label>
              </div>
            </section>
          </div>
        </div>
      </main>

      <div className="glass-strong fixed inset-x-3 bottom-3 z-40 flex items-center gap-3 rounded-2xl p-2.5 md:hidden">
        <div className="min-w-0 flex-1 pl-2 text-xs text-ink/60">
          {included.length} 个部位 · 约 {minutesOf(session.plan)} 分钟
        </div>
        <button onClick={() => router.push("/follow")} className="btn-ink inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm">
          {locked ? "继续跟妆" : "开始跟妆"} <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

