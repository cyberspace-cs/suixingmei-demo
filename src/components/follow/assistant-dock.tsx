"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, Flag, Loader2, Mic, MicOff, SendHorizontal, Volume2, VolumeX } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VOICE_HINTS } from "@/lib/commands";
import { cn } from "@/lib/utils";

export interface DockPrimary {
  label: string;
  kind: "step" | "next" | "finish";
  onClick: () => void;
}

function Wave({ active }: { active: boolean }) {
  return (
    <span className="flex h-4 items-center gap-[3px]" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn("w-[3px] origin-center rounded-full bg-current", active ? "animate-wave" : "scale-y-[0.35] opacity-50")}
          style={{ height: 16, animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </span>
  );
}

export function AssistantDock(props: {
  narration: boolean;
  onNarration: (v: boolean) => void;
  voiceInput: boolean;
  onVoiceInput: (v: boolean) => void;
  voiceMode: "native" | "simulated";
  listening: boolean;
  interim: string;
  speaking: boolean;
  thinking: boolean;
  paused: boolean;
  onSimulate: (text: string) => void;
  onSend: (text: string) => void;
  primary: DockPrimary;
  className?: string;
}) {
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    props.onSend(t);
    setText("");
  };

  const status = props.interim
    ? { tone: "live", text: `已识别：${props.interim}` }
    : !props.voiceInput
      ? { tone: "off", text: "语音已关闭 · 可打字提问" }
      : props.speaking
        ? { tone: "muted", text: "讲解中 · 播报时暂停收音" }
        : props.thinking
          ? { tone: "muted", text: "AI 正在回答…" }
          : { tone: "live", text: props.voiceMode === "native" ? "正在听 · 直接说" : "模拟收音 · 点一句试试" };

  const hints = props.voiceInput && !props.interim && (
    <div className="scrollbar-none flex min-w-0 gap-1.5 overflow-x-auto">
      {VOICE_HINTS.map((h) => (
        <button
          key={h}
          onClick={() => props.onSimulate(h)}
          disabled={props.paused && h !== "暂停"}
          className="shrink-0 rounded-full bg-ink/[0.05] px-2.5 py-1 text-xs text-ink/70 transition hover:bg-ink/10 hover:text-ink disabled:opacity-40"
          title={props.voiceMode === "native" ? `也可以直接说「${h}」` : `模拟说出「${h}」`}
        >
          「{h}」
        </button>
      ))}
    </div>
  );

  const PrimaryIcon = props.primary.kind === "step" ? Check : props.primary.kind === "finish" ? Flag : ArrowRight;

  return (
    <div className={cn("glass-strong rounded-[22px] p-2", props.className)}>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={() => props.onVoiceInput(!props.voiceInput)}
                className={cn(
                  "relative grid size-11 shrink-0 place-items-center rounded-full transition",
                  props.voiceInput ? "bg-ink text-white" : "bg-ink/[0.06] text-ink/50",
                )}
                aria-pressed={props.voiceInput}
                aria-label={props.voiceInput ? "关闭语音指令" : "开启语音指令"}
              />
            }
          >
            {props.voiceInput ? <Mic className="size-[18px]" /> : <MicOff className="size-[18px]" />}
            {props.voiceInput && props.listening && !props.speaking && (
              <span className="absolute inset-0 animate-ping rounded-full border-2 border-ink/30 [animation-duration:2.2s]" />
            )}
          </TooltipTrigger>
          <TooltipContent>{props.voiceInput ? "语音指令已开启，点击关闭" : "开启语音指令"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={() => props.onNarration(!props.narration)}
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-full border transition",
                  props.narration ? "border-ink/15 bg-white text-ink" : "border-transparent bg-ink/[0.06] text-ink/50",
                )}
                aria-pressed={props.narration}
                aria-label={props.narration ? "关闭语音讲解" : "开启语音讲解"}
              />
            }
          >
            {props.narration ? <Volume2 className={cn("size-[18px]", props.speaking && "text-rose")} /> : <VolumeX className="size-[18px]" />}
          </TooltipTrigger>
          <TooltipContent>{props.narration ? "语音讲解已开启，点击静音" : "开启语音讲解"}</TooltipContent>
        </Tooltip>

        <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-1">
          <span className={cn("hidden shrink-0 items-center gap-2 text-xs sm:flex", status.tone === "live" ? "text-ink" : "text-ink/50")}>
            {props.voiceInput && <Wave active={status.tone === "live" && !props.paused} />}
            <span className={cn("whitespace-nowrap", props.interim && "font-medium")}>{status.text}</span>
          </span>
          <span className={cn("truncate text-xs sm:hidden", props.interim ? "font-medium text-ink" : "text-ink/55")}>
            {props.interim ? status.text : props.voiceInput ? "" : status.text}
          </span>
          <div className="min-w-0 flex-1">{hints}</div>
        </div>

        <form onSubmit={submit} className="hidden h-11 w-[clamp(200px,22vw,300px)] shrink-0 items-center rounded-full border border-ink/10 bg-white/80 pl-4 pr-1 lg:flex">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="打字问 AI，比如「眉尾画多长」"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
            aria-label="向 AI 跟妆师提问"
          />
          <button type="submit" disabled={!text.trim() || props.thinking} className="grid size-9 place-items-center rounded-full text-ink transition hover:bg-ink/5 disabled:opacity-35" aria-label="发送">
            {props.thinking ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
          </button>
        </form>

        <button
          onClick={props.primary.onClick}
          disabled={props.paused}
          className="btn-ink hidden h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-medium disabled:opacity-50 lg:inline-flex"
        >
          <PrimaryIcon className="size-4" /> {props.primary.label}
        </button>
      </div>

      <div className="mt-2 flex gap-2 lg:hidden">
        <form onSubmit={submit} className="flex h-11 min-w-0 flex-1 items-center rounded-full border border-ink/10 bg-white/80 pl-4 pr-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="打字问 AI…"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
            aria-label="向 AI 跟妆师提问"
          />
          <button type="submit" disabled={!text.trim() || props.thinking} className="grid size-9 place-items-center rounded-full text-ink disabled:opacity-35" aria-label="发送">
            {props.thinking ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
          </button>
        </form>
        <button
          onClick={props.primary.onClick}
          disabled={props.paused}
          className="btn-ink inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium disabled:opacity-50"
        >
          <PrimaryIcon className="size-4" /> {props.primary.label}
        </button>
      </div>
    </div>
  );
}
