"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Clock, History, ListChecks, MessageCircle, ScanFace, Square } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageSkeleton } from "@/components/common/empty-state";
import { AppHeader } from "@/components/shell/app-header";
import { SessionBar } from "@/components/shell/session-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCamera } from "@/hooks/use-camera";
import { useRecognition, useSpeaker } from "@/hooks/use-voice";
import { askAI, checkFrame } from "@/lib/api";
import { parseCommand } from "@/lib/commands";
import { LANDMARKS } from "@/lib/face-geometry";
import { analyzeQuality, captureFrame } from "@/lib/local/image";
import { minutesOfSteps, stepFocus } from "@/lib/looks";
import { landmarkSetOf, useApp, useCurrentSession } from "@/lib/store";
import type { ChatMessage, CheckRecord, ImageQuality, PartKey, PartPlan, Session } from "@/lib/types";
import { AssistantDock, type DockPrimary } from "./assistant-dock";
import { ChatPanel } from "./chat-panel";
import { CheckPanel, type CheckFlow } from "./check-panel";
import { EndDialog } from "./end-dialog";
import { GuidePanel } from "./guide-panel";
import { Mirror, type Subtitle } from "./mirror";
import { PartStepper } from "./part-stepper";
import { PrepDialog } from "./prep-dialog";

type Tab = "guide" | "check" | "chat";

const uid = () => Math.random().toString(36).slice(2, 10);

export function formatElapsed(s: number) {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function firstOpenStep(p: PartPlan, done: string[]) {
  const i = p.steps.findIndex((s) => !done.includes(s.id));
  return i === -1 ? p.steps.length : i;
}

export function FollowView() {
  const hydrated = useApp((s) => s.hydrated);
  const session = useCurrentSession();

  if (!hydrated)
    return (
      <div className="min-h-dvh">
        <AppHeader />
        <PageSkeleton />
      </div>
    );

  const parts = session?.plan.filter((p) => p.included) ?? [];
  if (!session?.face || parts.length === 0) {
    return (
      <div className="min-h-dvh">
        <AppHeader />
        <main className="mx-auto max-w-xl px-5 py-16">
          <EmptyState
            icon={<ScanFace className="size-7" />}
            title="还没有进行中的跟妆"
            description="先在妆容工作台上传参考妆和素颜自拍，生成专属方案后就能开始一步步跟着画。"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/" className="btn-ink inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm">
                  去妆容工作台 <ArrowRight className="size-4" />
                </Link>
                <Link href="/history" className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 bg-white/70 px-5 text-sm text-ink">
                  <History className="size-4" /> 继续之前的妆容
                </Link>
              </div>
            }
          />
        </main>
      </div>
    );
  }

  if (session.status === "completed") {
    return (
      <div className="min-h-dvh">
        <AppHeader />
        <main className="mx-auto max-w-xl px-5 py-16">
          <EmptyState
            icon={<CheckCircle2 className="size-7" />}
            title={`「${session.lookName}」已经完成`}
            description="这次跟妆已经打过分了。可以去看看结果，或者回工作台再跟一次。"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/complete" className="btn-ink inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm">
                  查看结果 <ArrowRight className="size-4" />
                </Link>
                <Link href="/" className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 bg-white/70 px-5 text-sm text-ink">
                  回妆容工作台
                </Link>
              </div>
            }
          />
        </main>
      </div>
    );
  }

  return <FollowSession key={session.id} session={session} parts={parts} />;
}

function FollowSession({ session, parts }: { session: Session; parts: PartPlan[] }) {
  const router = useRouter();
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);
  const updateSession = useApp((s) => s.updateSession);
  const rememberConsent = useApp((s) => s.rememberConsent);

  const face = session.face!;
  const done = session.progress.done;
  const partIndex = Math.min(session.progress.partIndex, parts.length - 1);
  const part = parts[partIndex];
  const stepIndex = Math.min(session.progress.stepIndex, part.steps.length);
  const step = part.steps[stepIndex];
  const nextPart = parts[partIndex + 1];
  const allSteps = parts.flatMap((p) => p.steps);
  const stepsDone = allSteps.filter((s) => done.includes(s.id)).length;
  const remainingMin = minutesOfSteps(allSteps.filter((s) => !done.includes(s.id)));
  const landmarkSet = landmarkSetOf(session);
  const L = LANDMARKS[landmarkSet];
  const afterSrc = session.selfieSample ? "/images/user-after.jpg" : undefined;
  const startedParts = useMemo(() => parts.filter((p) => p.steps.some((s) => done.includes(s.id))).map((p) => p.key), [parts, done]);
  const prepOpen = session.status !== "following";

  const [tab, setTab] = useState<Tab>("guide");
  const [paused, setPaused] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [flow, setFlow] = useState<CheckFlow>({ phase: "idle" });
  const [flash, setFlash] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [subtitle, setSubtitle] = useState<Subtitle | null>(() =>
    step ? { text: step.instruction, from: "narration", at: 0 } : null,
  );
  const [elapsed, setElapsed] = useState(session.elapsedS);
  const elapsedRef = useRef(session.elapsedS);
  const timers = useRef<number[]>([]);
  const checkTarget = useRef<{ part: PartKey; stepId: string; stepTitle: string } | null>(null);

  const camera = useCamera({ simulateDenied: settings.scenario === "camera-denied" });
  const mode = camera.status === "live" ? "camera" : "demo";
  const speaker = useSpeaker(settings.narration);

  const running = !prepOpen && !paused;
  useEffect(() => {
    if (!running) return;
    const id = session.id;
    const flush = () => useApp.getState().updateSession(id, (s) => ({ ...s, elapsedS: elapsedRef.current }));
    const t = window.setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current % 10 === 0) flush();
    }, 1000);
    return () => {
      window.clearInterval(t);
      flush();
    };
  }, [running, session.id]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  const describe = (pi: number, si: number) => {
    const p = parts[pi];
    const st = p.steps[si];
    const np = parts[pi + 1];
    if (st) return { speech: `${st.title}。${st.instruction}${st.adapted ? `为你调整：${st.adapted}` : ""}`, text: st.instruction };
    const t = np
      ? `${p.label}完成！想确认效果就说「帮我看看」，满意的话说「下一步」开始${np.label}。`
      : `${p.label}完成，全部步骤都做完了！拍一张妆后照，看看整体效果。`;
    return { speech: t, text: t };
  };

  const announce = (pi: number, si: number) => {
    const d = describe(pi, si);
    setSubtitle({ text: d.text, from: "narration", at: Date.now() });
    speaker.speak(d.speech);
  };

  const setProgress = (pi: number, si: number, markDone?: string) => {
    updateSession(session.id, (s) => ({
      ...s,
      progress: {
        partIndex: pi,
        stepIndex: si,
        done: markDone && !s.progress.done.includes(markDone) ? [...s.progress.done, markDone] : s.progress.done,
      },
    }));
    if (pi !== partIndex) {
      setFlow({ phase: "idle" });
      setTab("guide");
    }
    announce(pi, si);
  };

  const finish = () => {
    speaker.cancel();
    router.push("/complete");
  };

  const next = () => {
    if (step) {
      const ni = stepIndex + 1;
      setProgress(partIndex, ni, step.id);
      if (ni >= part.steps.length) {
        toast.success(`${part.label}完成`, { description: nextPart ? `下一个部位：${nextPart.label}` : "全部部位都完成了" });
        setTab("guide");
      }
      return;
    }
    if (nextPart) setProgress(partIndex + 1, firstOpenStep(nextPart, done));
    else finish();
  };

  const prev = () => {
    if (stepIndex > 0) setProgress(partIndex, Math.min(stepIndex, part.steps.length) - 1);
    else if (partIndex > 0) setProgress(partIndex - 1, parts[partIndex - 1].steps.length - 1);
  };

  const pause = () => {
    setPaused(true);
    speaker.cancel();
    setSubtitle(null);
  };

  const resume = () => {
    setPaused(false);
    announce(partIndex, stepIndex);
  };

  const ask = async (text: string, via: ChatMessage["via"]) => {
    const userMsg: ChatMessage = { id: uid(), role: "user", text, via, createdAt: Date.now() };
    updateSession(session.id, (s) => ({ ...s, chat: [...s.chat, userMsg] }));
    setSubtitle({ text, from: "user", at: Date.now() });
    setThinking(true);
    speaker.cancel();
    const reply = await askAI(session.id, {
      text,
      part: part.key,
      stepTitle: step?.title,
      instruction: step?.instruction,
      adapted: step?.adapted,
      faceShapeLabel: face.faceShapeLabel,
      remainingMin,
      scenario: settings.scenario,
    });
    const aiMsg: ChatMessage = { id: uid(), role: "ai", text: reply, via: "text", createdAt: Date.now() };
    updateSession(session.id, (s) => ({ ...s, chat: [...s.chat, aiMsg] }));
    setThinking(false);
    setSubtitle({ text: reply, from: "ai", at: Date.now() });
    speaker.speak(reply);
  };

  const analyze = async (image: string, quality: ImageQuality) => {
    const target = checkTarget.current;
    if (!target) return;
    setFlow({ phase: "analyzing", image, part: target.part });
    const set = mode === "camera" ? "generic" : landmarkSet;
    const attempt = (useApp.getState().sessions.find((s) => s.id === session.id)?.checks ?? []).filter((c) => c.part === target.part).length;
    const res = await checkFrame(session.id, { image, part: target.part, stepId: target.stepId, attempt, landmarkSet: set, quality, scenario: settings.scenario });
    const record: CheckRecord = { ...res, id: uid(), landmarkSet: set, part: target.part, stepId: target.stepId, stepTitle: target.stepTitle, image, createdAt: Date.now() };
    updateSession(session.id, (s) => ({ ...s, checks: [record, ...s.checks] }));
    setFlow({ phase: "result", record });
    if (res.fallback) toast.warning("云端分析超时，已用本机规则检查", { description: "结果仅供参考，网络恢复后可以再拍一次" });
    const tip = res.items.find((i) => i.type === "improve")?.text;
    const text = `${res.summary}${tip ? `。${tip}` : ""}`;
    setSubtitle({ text, from: "ai", at: Date.now() });
    speaker.speak(text);
  };

  const capture = async () => {
    setFlash(true);
    timers.current.push(window.setTimeout(() => setFlash(false), 450));
    const image = await captureFrame({
      video: mode === "camera" ? camera.videoRef.current : null,
      bare: session.selfieImage,
      after: afterSrc,
      reveal: afterSrc ? { parts: Array.from(new Set([...startedParts, part.key])), landmarks: L, shape: face.faceShape } : undefined,
      mirrored: settings.mirrored,
    });
    const quality = await analyzeQuality(image);
    checkTarget.current = {
      part: part.key,
      stepId: step?.id ?? part.steps[part.steps.length - 1].id,
      stepTitle: step?.title ?? `${part.label}完成`,
    };
    if (!quality.ok) {
      const message = `本机快速检查没通过：${quality.issues.join("；")}。调整后重拍一张就好。`;
      setFlow({ phase: "error", message, image, part: part.key });
      setSubtitle({ text: quality.issues[0], from: "ai", at: Date.now() });
      speaker.speak(quality.issues[0]);
      return;
    }
    if (useApp.getState().consentSessionId === session.id) analyze(image, quality);
    else {
      setFlow({ phase: "captured", image, quality, part: part.key });
      setSubtitle({ text: "拍好了。确认上传这一帧后，我来帮你看。", from: "ai", at: Date.now() });
    }
  };

  const startCheck = () => {
    if (flow.phase === "countdown" || flow.phase === "analyzing") return;
    setPaused(false);
    speaker.cancel();
    setTab("check");
    let n = 3;
    setFlow({ phase: "countdown", n });
    setSubtitle({ text: "3 秒后拍照，保持姿势、看向镜头", from: "narration", at: Date.now() });
    const tick = () => {
      n -= 1;
      if (n > 0) {
        setFlow({ phase: "countdown", n });
        timers.current.push(window.setTimeout(tick, 800));
      } else capture();
    };
    timers.current.push(window.setTimeout(tick, 800));
  };

  const onUtterance = (text: string) => {
    const cmd = parseCommand(text);
    if (!cmd) {
      void ask(text, "voice");
      return;
    }
    setSubtitle({ text: `「${text}」`, from: "user", at: Date.now() });
    if (cmd === "pause") return pause();
    if (paused) setPaused(false);
    if (cmd === "resume") return announce(partIndex, stepIndex);
    if (cmd === "next") return next();
    if (cmd === "prev") return prev();
    if (cmd === "replay") return announce(partIndex, stepIndex);
    if (cmd === "check") return startCheck();
  };

  const recognition = useRecognition({
    enabled: settings.voiceInput && !prepOpen,
    muted: speaker.speaking,
    onFinal: onUtterance,
  });

  const begin = () => {
    updateSession(session.id, (s) => ({ ...s, status: "following", startedAt: s.startedAt ?? Date.now() }));
    announce(partIndex, stepIndex);
  };

  const primary: DockPrimary = step
    ? { kind: "step", label: stepIndex === part.steps.length - 1 ? `完成${part.label}` : "完成这一小步", onClick: next }
    : nextPart
      ? { kind: "next", label: `继续：${nextPart.label}`, onClick: next }
      : { kind: "finish", label: "完成，去拍妆后照", onClick: finish };

  const partChecks = session.checks.filter((c) => c.part === part.key);
  const focus = step ? L[stepFocus(part.key, step.id)] : null;
  const progressPct = Math.round((stepsDone / Math.max(1, allSteps.length)) * 100);

  const dockProps = {
    narration: settings.narration,
    onNarration: (v: boolean) => setSettings({ narration: v }),
    voiceInput: settings.voiceInput,
    onVoiceInput: (v: boolean) => setSettings({ voiceInput: v }),
    voiceMode: recognition.mode,
    listening: recognition.listening,
    interim: recognition.interim,
    speaking: speaker.speaking,
    thinking,
    paused,
    onSimulate: recognition.simulate,
    onSend: (t: string) => void ask(t, "text"),
    primary,
  };

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <AppHeader />
      <main className="flex min-h-0 flex-1 flex-col px-4 pb-40 md:px-8 lg:pb-4">
        <div className="mx-auto flex min-h-0 w-full max-w-[1360px] flex-1 flex-col gap-3">
          <SessionBar
            backHref="/plan"
            backLabel="返回方案"
            title={
              <>
                {session.lookName}
                <span className="ml-2 align-middle font-sans text-sm font-normal text-ink/50">跟妆中</span>
              </>
            }
            subtitle={
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  第 {partIndex + 1}/{parts.length} 个部位 · 已完成 {stepsDone}/{allSteps.length} 小步 · 约剩 {remainingMin} 分钟
                </span>
                <span className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-ink/10 sm:inline-block">
                  <span className="block h-full rounded-full bg-gradient-to-r from-peach to-rose transition-all duration-700" style={{ width: `${progressPct}%` }} />
                </span>
              </span>
            }
            actions={
              <>
                <span className="glass inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 font-mono text-sm text-ink/80" aria-label="已用时">
                  <Clock className="size-4 text-ink/50" /> {formatElapsed(elapsed)}
                </span>
                <button
                  onClick={() => setEndOpen(true)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-ink/15 bg-white/70 px-4 text-sm text-ink transition hover:bg-white"
                >
                  <Square className="size-3.5" /> 结束跟妆
                </button>
              </>
            }
          />

          <PartStepper parts={parts} current={partIndex} done={done} onJump={(i) => setProgress(i, firstOpenStep(parts[i], done))} />

          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(370px,1fr)]">
            <Mirror
              className="aspect-[4/5] sm:aspect-[4/3] lg:aspect-auto"
              mode={mode}
              cameraStatus={camera.status}
              videoRef={camera.videoRef}
              mirrored={settings.mirrored}
              selfie={session.selfieImage}
              after={afterSrc}
              reveal={startedParts}
              landmarks={L}
              shape={face.faceShape}
              part={part.key}
              focus={focus}
              showOverlay={settings.overlay && !!step}
              zoom={zoom}
              subtitle={prepOpen || paused ? null : subtitle}
              speaking={speaker.speaking}
              countdown={flow.phase === "countdown" ? flow.n : null}
              flash={flash}
              paused={paused}
              stepLabel={step ? `${part.label} · ${stepIndex + 1}/${part.steps.length} ${step.title}` : `${part.label} · 已完成`}
              checking={flow.phase === "countdown" || flow.phase === "analyzing"}
              onToggleOverlay={() => setSettings({ overlay: !settings.overlay })}
              onToggleZoom={() => setZoom((z) => !z)}
              onCheck={startCheck}
              onResume={resume}
              onRequestCamera={camera.start}
              onUseDemo={camera.stop}
            />

            <aside className="glass flex min-h-[420px] flex-col rounded-[26px] p-3 lg:min-h-0">
              <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex min-h-0 flex-1 flex-col gap-0">
                <TabsList className="grid h-11! w-full grid-cols-3 rounded-full bg-ink/[0.05] p-1">
                  <TabsTrigger value="guide" className="rounded-full text-[13px] data-active:bg-white data-active:text-ink">
                    <ListChecks /> 步骤指导
                  </TabsTrigger>
                  <TabsTrigger value="check" className="rounded-full text-[13px] data-active:bg-white data-active:text-ink">
                    <ScanFace /> 帮我看看
                    {session.checks.length > 0 && <span className="rounded-full bg-ink/10 px-1.5 font-mono text-[10px]">{session.checks.length}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="rounded-full text-[13px] data-active:bg-white data-active:text-ink">
                    <MessageCircle /> AI 对话
                    {thinking && tab !== "chat" && <span className="size-1.5 animate-pulse rounded-full bg-rose" />}
                  </TabsTrigger>
                </TabsList>
                <div className="scrollbar-none mt-3 min-h-0 flex-1 overflow-y-auto px-1.5 pb-1">
                  <TabsContent value="guide" className="h-full">
                    <GuidePanel
                      part={part}
                      partIndex={partIndex}
                      partsCount={parts.length}
                      stepIndex={stepIndex}
                      done={done}
                      nextPart={nextPart}
                      referenceImage={session.referenceImage}
                      faceShapeLabel={face.faceShapeLabel}
                      speaking={speaker.speaking}
                      paused={paused}
                      partChecks={partChecks}
                      onPrev={prev}
                      onReplay={() => announce(partIndex, stepIndex)}
                      onTogglePause={() => (paused ? resume() : pause())}
                      onJumpStep={(j) => setProgress(partIndex, j)}
                      onCheck={startCheck}
                      onNext={next}
                    />
                  </TabsContent>
                  <TabsContent value="check" className="h-full">
                    <CheckPanel
                      flow={flow}
                      records={session.checks}
                      partLabel={part.label}
                      stepTitle={step?.title ?? `${part.label}完成`}
                      landmarkSet={mode === "camera" ? "generic" : landmarkSet}
                      onStart={startCheck}
                      onAnalyze={(remember) => {
                        if (remember) rememberConsent(session.id);
                        if (flow.phase === "captured") void analyze(flow.image, flow.quality);
                      }}
                      onClear={() => setFlow({ phase: "idle" })}
                      onBack={() => {
                        setFlow({ phase: "idle" });
                        setTab("guide");
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="chat" className="h-full">
                    <ChatPanel messages={session.chat} thinking={thinking} stepTitle={step?.title} onAsk={(q) => void ask(q, "text")} />
                  </TabsContent>
                </div>
              </Tabs>
            </aside>
          </div>

          <AssistantDock {...dockProps} className="hidden lg:block" />
        </div>
      </main>

      <AssistantDock {...dockProps} className="fixed inset-x-3 bottom-3 z-40 lg:hidden" />

      <PrepDialog
        open={prepOpen}
        lookName={session.lookName}
        faceShapeLabel={face.faceShapeLabel}
        parts={parts}
        minutes={remainingMin}
        cameraStatus={camera.status}
        onCamera={camera.start}
        narration={settings.narration}
        voiceInput={settings.voiceInput}
        onNarration={(v) => setSettings({ narration: v })}
        onVoiceInput={(v) => setSettings({ voiceInput: v })}
        onStart={begin}
      />

      <EndDialog
        open={endOpen}
        onOpenChange={setEndOpen}
        stepsDone={stepsDone}
        stepsTotal={allSteps.length}
        elapsed={formatElapsed(elapsed)}
        onSaveExit={() => {
          speaker.cancel();
          toast.success("进度已保存", { description: "在「历史妆容」里可以随时继续" });
          router.push("/history");
        }}
        onScore={finish}
      />

      <span className="sr-only" aria-live="polite">
        {step ? `当前：${part.label}，${step.title}` : `${part.label}已完成`}
      </span>
    </div>
  );
}
