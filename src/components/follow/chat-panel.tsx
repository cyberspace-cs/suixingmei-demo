"use client";

import { useEffect, useRef } from "react";
import { Bot, Loader2, MessageCircleQuestion, Mic } from "lucide-react";
import { QUICK_QUESTIONS } from "@/lib/commands";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ChatPanel(props: { messages: ChatMessage[]; thinking: boolean; stepTitle?: string; onAsk: (text: string) => void }) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [props.messages.length, props.thinking]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div>
        <div className="label-mono">AI makeup coach</div>
        <h3 className="mt-1 font-serif text-xl font-bold text-ink">问问 AI 跟妆师</h3>
        <p className="mt-0.5 text-xs text-ink/55">
          {props.stepTitle ? `正在做「${props.stepTitle}」，` : ""}直接说出来或在下方输入，回答会同步显示在镜面字幕上。
        </p>
      </div>

      <div ref={listRef} className="scrollbar-none mt-3 min-h-[160px] flex-1 space-y-3 overflow-y-auto pr-1">
        {props.messages.length === 0 && !props.thinking ? (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl bg-white/40 px-4 py-6 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-ink/[0.06] text-ink">
              <MessageCircleQuestion className="size-5" />
            </span>
            <p className="mt-2.5 text-sm font-medium text-ink">手上忙着也能问</p>
            <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-ink/55">比如「眉尾要画多长」「颜色太深了怎么办」，AI 会结合你的脸型和当前步骤回答。</p>
          </div>
        ) : (
          props.messages.map((m) => (
            <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "ai" && (
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-ink text-white">
                  <Bot className="size-3.5" />
                </span>
              )}
              <div
                className={cn(
                  "max-w-[82%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed",
                  m.role === "user" ? "rounded-br-md bg-ink text-white" : "rounded-bl-md bg-white/85 text-ink/85",
                )}
              >
                {m.via === "voice" && m.role === "user" && <Mic className="mr-1 inline size-3 -translate-y-px opacity-70" />}
                {m.text}
              </div>
            </div>
          ))
        )}
        {props.thinking && (
          <div className="flex items-center gap-2 text-xs text-ink/55">
            <span className="grid size-7 place-items-center rounded-full bg-ink text-white">
              <Loader2 className="size-3.5 animate-spin" />
            </span>
            AI 跟妆师正在想…
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-[11px] text-ink/45">常见问题</div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => props.onAsk(q)}
              disabled={props.thinking}
              className="rounded-full border border-ink/12 bg-white/70 px-3 py-1.5 text-xs text-ink/75 transition hover:border-ink/30 hover:bg-white disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
