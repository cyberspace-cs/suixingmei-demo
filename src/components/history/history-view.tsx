"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, Clock, History, Play, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CheckRecordDialog } from "@/components/common/check-record-dialog";
import { CheckPhoto } from "@/components/common/check-view";
import { EmptyState, PageSkeleton } from "@/components/common/empty-state";
import { PartGlyph } from "@/components/common/part-glyph";
import { ScoreRing } from "@/components/common/score-card";
import { AppFooter } from "@/components/shell/app-footer";
import { AppHeader } from "@/components/shell/app-header";
import { MobileNav } from "@/components/shell/mobile-nav";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatClock, formatDay, formatDuration } from "@/lib/format";
import { useApp } from "@/lib/store";
import type { CheckRecord, Session } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "open" | "done";

export function openSession(s: Session, to: "/follow" | "/complete" | "/plan") {
  const st = useApp.getState();
  st.setReference({ src: s.referenceImage, sample: !!s.referenceSample, sampleLook: s.referenceSample, name: s.lookName });
  st.setSelfie({ src: s.selfieImage, sample: s.selfieSample, quality: s.face?.quality });
  st.setCurrent(s.id);
  return to;
}

function SessionCard({ s, onView }: { s: Session; onView: (r: CheckRecord) => void }) {
  const router = useRouter();
  const removeSession = useApp((st) => st.removeSession);
  const parts = s.plan.filter((p) => p.included);
  const steps = parts.flatMap((p) => p.steps);
  const stepsDone = steps.filter((st) => s.progress.done.includes(st.id)).length;
  const completed = s.status === "completed";
  const notStarted = stepsDone === 0 && !completed;

  const status = completed
    ? { label: "已完成", cls: "bg-success/10 text-success" }
    : notStarted
      ? { label: "待开始", cls: "bg-ink/[0.06] text-ink/60" }
      : { label: `跟妆中 · ${stepsDone}/${steps.length}`, cls: "bg-peach/30 text-[#a4513f]" };

  return (
    <article className="glass flex flex-col gap-4 rounded-[24px] p-4 md:flex-row md:items-center md:gap-5 md:p-5">
      <div className="relative h-[112px] w-[150px] shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.referenceImage} alt={`${s.lookName}参考图`} className="absolute left-0 top-0 h-[104px] w-[82px] rounded-2xl object-cover object-[50%_30%] shadow-sm" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s.afterImage ?? s.selfieImage}
          alt={s.afterImage ? "妆后照" : "素颜照"}
          className="absolute bottom-0 left-[62px] h-[96px] w-[76px] rounded-2xl border-[3px] border-white object-cover object-[50%_35%] shadow-md"
        />
        <span className="absolute bottom-1 left-[68px] rounded-full bg-ink/75 px-1.5 py-px text-[9px] text-white">{s.afterImage ? "妆后" : "素颜"}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-serif text-lg font-semibold text-ink">{s.lookName}</h3>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", status.cls)}>{status.label}</span>
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink/55">
          <span>{formatClock(s.createdAt)}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" /> 用时 {formatDuration(s.elapsedS)}
          </span>
          <span>·</span>
          <span>{s.face?.faceShapeLabel} 适配</span>
        </p>
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {parts.map((p) => {
            const ok = p.steps.every((st) => s.progress.done.includes(st.id));
            return (
              <li
                key={p.key}
                className={cn("inline-flex items-center gap-1 rounded-full py-0.5 pl-1 pr-2 text-[11px]", ok ? "bg-white/85 text-ink" : "bg-white/40 text-ink/40")}
              >
                <span className={cn("grid size-4 place-items-center rounded-full", ok ? "bg-success text-white" : "bg-ink/[0.06]")}>
                  {ok ? <Check className="size-2.5" /> : <PartGlyph part={p.key} className="size-2.5" />}
                </span>
                {p.label}
              </li>
            );
          })}
        </ul>
        {s.checks.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="shrink-0 text-[11px] text-ink/45">帮我看看</span>
            <ul className="scrollbar-none flex gap-1.5 overflow-x-auto">
              {s.checks.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <button onClick={() => onView(r)} className="group relative block overflow-hidden rounded-lg" aria-label={`查看评价：${r.summary}`} title="查看评价">
                    <CheckPhoto image={r.image} part={r.part} landmarkSet={r.landmarkSet} className="size-11" />
                    <span className={cn("absolute right-1 top-1 size-2 rounded-full ring-1 ring-white", r.status === "good" ? "bg-success" : "bg-[#e07a5f]")} />
                    <span className="absolute inset-0 grid place-items-center bg-ink/50 text-[9px] text-white opacity-0 transition group-hover:opacity-100">查看</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-3">
        {s.score ? (
          <ScoreRing value={s.score.total} size={68} />
        ) : (
          <div className="grid size-[68px] place-items-center rounded-full border-[5px] border-ink/[0.07] text-center">
            <div>
              <div className="font-mono text-sm font-semibold text-ink">{Math.round((stepsDone / Math.max(1, steps.length)) * 100)}%</div>
              <div className="text-[9px] text-ink/45">进度</div>
            </div>
          </div>
        )}
        <div className="flex flex-1 items-center justify-end gap-1.5 md:flex-none">
          <button
            onClick={() => {
              removeSession(s.id);
              toast("已删除这条记录");
            }}
            className="grid size-9 place-items-center rounded-full text-ink/40 transition hover:bg-white hover:text-destructive"
            aria-label="删除记录"
            title="删除记录"
          >
            <Trash2 className="size-4" />
          </button>
          {completed ? (
            <button
              onClick={() => router.push(openSession(s, "/complete"))}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/15 bg-white/80 px-4 text-[13px] text-ink hover:bg-white"
            >
              查看结果 <ArrowRight className="size-3.5" />
            </button>
          ) : (
            <button onClick={() => router.push(openSession(s, "/follow"))} className="btn-ink inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px]">
              <Play className="size-3.5" /> {notStarted ? "开始跟妆" : "继续跟妆"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function HistoryView() {
  const hydrated = useApp((s) => s.hydrated);
  const sessions = useApp((s) => s.sessions);
  const clearHistory = useApp((s) => s.clearHistory);
  const [filter, setFilter] = useState<Filter>("all");
  const [viewing, setViewing] = useState<CheckRecord | null>(null);
  const [confirm, setConfirm] = useState(false);

  const list = [...sessions].filter((s) => s.analysis).sort((a, b) => b.createdAt - a.createdAt);
  const open = list.filter((s) => s.status !== "completed");
  const done = list.filter((s) => s.status === "completed");
  const shown = filter === "open" ? open : filter === "done" ? done : list;
  const groups = shown.reduce<{ day: string; items: Session[] }[]>((acc, s) => {
    const day = formatDay(s.createdAt);
    const g = acc.find((x) => x.day === day);
    if (g) g.items.push(s);
    else acc.push({ day, items: [s] });
    return acc;
  }, []);
  const totalMin = Math.round(list.reduce((a, s) => a + s.elapsedS, 0) / 60);
  const best = Math.max(0, ...list.map((s) => s.score?.total ?? 0));

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="flex-1 px-4 pb-28 md:px-8 md:pb-10">
        <div className="mx-auto max-w-[980px]">
          <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
            <div>
              <div className="label-mono">History</div>
              <h1 className="mt-1 font-serif text-[28px] font-bold text-ink md:text-[34px]">历史妆容</h1>
              <p className="mt-1 text-[13px] text-ink/60">每次跟妆的进度、检查照片和评分都自动保存在这台设备上，中断了也能接着画。</p>
            </div>
            {list.length > 0 && (
              <button onClick={() => setConfirm(true)} className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm text-ink/55 transition hover:bg-white/70 hover:text-destructive">
                <Trash2 className="size-4" /> 清除全部记录
              </button>
            )}
          </div>

          {!hydrated ? (
            <PageSkeleton />
          ) : list.length === 0 ? (
            <EmptyState
              className="mt-8"
              icon={<History className="size-7" />}
              title="还没有跟妆记录"
              description="跟着 AI 画完一套妆，或者中途暂停，记录都会出现在这里。"
              action={
                <Link href="/" className="btn-ink inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm">
                  <Sparkles className="size-4" /> 开始第一次跟妆
                </Link>
              }
            />
          ) : (
            <>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="glass inline-flex rounded-full p-1" role="tablist" aria-label="筛选记录">
                  {(
                    [
                      ["all", "全部", list.length],
                      ["open", "未完成", open.length],
                      ["done", "已完成", done.length],
                    ] as const
                  ).map(([key, label, n]) => (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={filter === key}
                      onClick={() => setFilter(key)}
                      className={cn("h-9 rounded-full px-4 text-sm transition", filter === key ? "bg-ink text-white" : "text-ink/65 hover:text-ink")}
                    >
                      {label}
                      <span className={cn("ml-1.5 font-mono text-[11px]", filter === key ? "text-white/70" : "text-ink/40")}>{n}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-ink/55">
                  共跟妆 {list.length} 次 · 累计 {totalMin} 分钟{best ? ` · 最高 ${best} 分` : ""}
                </p>
              </div>

              {shown.length === 0 ? (
                <p className="glass mt-6 rounded-[24px] px-5 py-10 text-center text-sm text-ink/55">
                  {filter === "open" ? "没有未完成的跟妆，都画完啦。" : "还没有完成的妆容，画完后会出现在这里。"}
                </p>
              ) : (
                <div className="mt-6 space-y-7">
                  {groups.map((g) => (
                    <section key={g.day}>
                      <h2 className="mb-2.5 flex items-center gap-2 text-sm font-medium text-ink/70">
                        <span className="size-1.5 rounded-full bg-rose" /> {g.day}
                      </h2>
                      <div className="space-y-3">
                        {g.items.map((s) => (
                          <SessionCard key={s.id} s={s} onView={setViewing} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <AppFooter />
      <MobileNav />
      <CheckRecordDialog record={viewing} onOpenChange={(o) => !o && setViewing(null)} />
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="glass-strong rounded-[22px] p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-lg text-ink">清除全部跟妆记录？</AlertDialogTitle>
            <AlertDialogDescription>进度、检查照片和评分都会从这台设备删除，无法恢复。「我的妆容」里的收藏会保留。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="-mx-6 -mb-6 rounded-b-[22px] bg-white/40 px-6 py-4">
            <AlertDialogCancel>再想想</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                clearHistory();
                setConfirm(false);
                toast("记录已清除");
              }}
            >
              清除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
