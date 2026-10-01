"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 语音讲解（TTS）：优先使用浏览器 speechSynthesis 的中文音色；
 * 没有可用音色时按字数模拟播报时长，字幕照常显示。
 * 真实产品中替换为 v1.0 realtime.mjs 的语音通话链路。
 */
export function useSpeaker(enabled: boolean) {
  const [speaking, setSpeaking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current = voices.find((v) => v.lang.toLowerCase().startsWith("zh")) ?? null;
    };
    pick();
    window.speechSynthesis.addEventListener("voiceschanged", pick);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pick);
  }, []);

  const stopOutput = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const cancel = useCallback(() => {
    stopOutput();
    setSpeaking(false);
  }, [stopOutput]);

  const speak = useCallback(
    (text: string) => {
      cancel();
      if (!enabled || !text) return;
      setSpeaking(true);
      const simulated = Math.min(14000, 900 + text.length * 190);
      if (voiceRef.current && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.voice = voiceRef.current;
        u.lang = voiceRef.current.lang;
        u.rate = 1.02;
        u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(u);
        timer.current = setTimeout(() => setSpeaking(false), simulated + 4000);
      } else {
        timer.current = setTimeout(() => setSpeaking(false), simulated);
      }
    },
    [cancel, enabled],
  );

  useEffect(() => {
    if (!enabled) stopOutput();
  }, [enabled, stopOutput]);

  useEffect(() => stopOutput, [stopOutput]);

  return { speaking: enabled && speaking, speak, cancel };
}

type RecognitionMode = "native" | "simulated";

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

/**
 * 语音指令：Chrome 下使用 Web Speech API（zh-CN）；
 * 不支持或出错时切到"模拟收音"，由界面上的快捷语句触发同样的识别流程。
 * 讲解播报期间忽略识别结果，避免语音自触发（PRD 错误代价 P0）。
 */
type RecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function useRecognition(opts: { enabled: boolean; muted: boolean; onFinal: (text: string) => void }) {
  const [failed, setFailed] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(opts.onFinal);
  const mutedRef = useRef(opts.muted);
  const enabledRef = useRef(opts.enabled);
  const [supported] = useState(() => !!recognitionCtor());
  const mode: RecognitionMode = supported && !failed ? "native" : "simulated";

  useEffect(() => {
    onFinalRef.current = opts.onFinal;
    mutedRef.current = opts.muted;
    enabledRef.current = opts.enabled;
  });

  useEffect(() => {
    const Ctor = recognitionCtor();
    if (!opts.enabled || !Ctor || failed) return;
    let dead = false;
    const fail = () => {
      dead = true;
      setFailed(true);
    };
    const rec = new Ctor();
    rec.lang = "zh-CN";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      if (mutedRef.current) return;
      let text = "";
      let final = false;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) final = true;
      }
      setInterim(text);
      if (final && text.trim()) {
        onFinalRef.current(text.trim());
        setTimeout(() => setInterim(""), 2500);
      }
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      fail();
    };
    rec.onend = () => {
      if (dead || !enabledRef.current || recRef.current !== rec) return;
      try {
        rec.start();
      } catch {
        fail();
      }
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      queueMicrotask(fail);
    }
    return () => {
      dead = true;
      recRef.current = null;
      rec.abort();
    };
  }, [opts.enabled, failed]);

  const simulate = useCallback((text: string) => {
    let i = 0;
    const tick = () => {
      i += 1;
      setInterim(text.slice(0, i));
      if (i < text.length) setTimeout(tick, 55);
      else {
        onFinalRef.current(text);
        setTimeout(() => setInterim(""), 2500);
      }
    };
    tick();
  }, []);

  return { mode, listening: opts.enabled, interim: opts.enabled ? interim : "", simulate };
}
