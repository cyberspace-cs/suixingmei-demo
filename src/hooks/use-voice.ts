"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { transcribe } from "@/lib/api";
import type { DemoScenario } from "@/lib/types";

/**
 * 语音讲解（TTS）：使用浏览器 speechSynthesis 的中文音色。
 *
 * 没有可用中文音色时**必须让用户知道**，否则会静默地只播字幕不出声——
 * 用户以为是自己没开声音。若系统有任意可用音色，仍尝试用它朗读中文；
 * 真的一个音色都没有时，才退回字幕模式并置 noVoice 标志。
 */
export function useSpeaker(enabled: boolean) {
  const [speaking, setSpeaking] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  // 当前播报序号：只有"最新那一次"播报有权结束 speaking 状态，
  // 否则上一条的 onend 会把新一条的播报提前掐掉（问题 17 的另一种表现）
  const seqRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setNoVoice(true);
      return;
    }
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current =
        voices.find((v) => v.lang.toLowerCase().startsWith("zh")) ??
        // 没有中文包时退而求其次：能出声总比完全静音好。
        voices.find((v) => v.default) ??
        voices[0] ??
        null;
      setNoVoice(!voiceRef.current);
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
      const seq = ++seqRef.current;
      setSpeaking(true);
      const simulated = Math.min(14000, 900 + text.length * 190);
      if (voiceRef.current && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.voice = voiceRef.current;
        // 音色不是中文包时不要强行按zh 发音，否则会出现怪异读音。
        u.lang = voiceRef.current.lang || "zh-CN";
        u.rate = 1.02;
        const end = () => {
          if (seqRef.current !== seq) return;
          if (timer.current) clearTimeout(timer.current);
          setSpeaking(false);
        };
        u.onend = end;
        u.onerror = end;
        window.speechSynthesis.speak(u);
        /**
         * 兜底计时器只用来防浏览器漏发 onend 导致永远卡在"播报中"，
         * 不再用它判定播报结束（问题 17）。
         *
         * 原做法：`simulated + 4000` 是按字数估算的时长，长句实际朗读
         * 往往超出，于是提前约 18 秒就把 speaking 置回 false —— 麦克风
         * 随即打开，把还在念的尾音当成"用户说话"收录，既误触发指令又
         * 造成自激。现在改为：估算值大幅放大作为上限，到点后先查
         * `speechSynthesis.speaking`，真的还在念就再等一轮。
         */
        const guard = Math.min(120000, Math.max(25000, 4000 + text.length * 520));
        timer.current = setTimeout(() => {
          if (seqRef.current !== seq) return;
          if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.speaking) {
            timer.current = setTimeout(() => setSpeaking(false), 15000);
            return;
          }
          setSpeaking(false);
        }, guard);
      } else {
        // 一个音色都没有：字幕照常显示，但不假装在播。
        timer.current = setTimeout(() => setSpeaking(false), simulated);
      }
    },
    [cancel, enabled],
  );

  useEffect(() => {
    if (!enabled) stopOutput();
  }, [enabled, stopOutput]);

  useEffect(() => stopOutput, [stopOutput]);

  return { speaking: enabled && speaking, speak, cancel, noVoice };
}

type RecognitionMode = "native" | "simulated" | "server";

// ---------------------------------------------------------------------------
// 服务端识别（评审问题 ① 的根治手段）
// ---------------------------------------------------------------------------
// 浏览器 Web Speech 的识别在 Google 服务端完成，大陆网络下连不上、连上易断。
// 这里改为本机采集 16k PCM → 封装 WAV → 交给服务端音频模型转写。
// 采集用 AudioWorklet（复用 capture.js 的重采样逻辑），拿不到就整体放弃。

const CAPTURE_WORKLET = `
class SuixingmeiCapture extends AudioWorkletProcessor {
  constructor(){super();this.samples=[];this.position=0;this.chunk=[];this.ratio=sampleRate/16000;}
  process(inputs){
    const input=inputs[0]?.[0];if(!input)return true;
    for(let i=0;i<input.length;i++)this.samples.push(input[i]);
    while(this.position+1<this.samples.length){
      const index=Math.floor(this.position),part=this.position-index;
      const value=this.samples[index]*(1-part)+this.samples[index+1]*part;
      this.chunk.push(Math.round(Math.max(-1,Math.min(1,value))*32767));this.position+=this.ratio;
      if(this.chunk.length===1600){const pcm=new Int16Array(this.chunk);this.port.postMessage(pcm.buffer,[pcm.buffer]);this.chunk=[];}
    }
    const consumed=Math.floor(this.position);this.samples.splice(0,consumed);this.position-=consumed;return true;
  }
}
registerProcessor('suixingmei-capture',SuixingmeiCapture);
`;

/**
 * PCM 片段的 RMS 能量（0~1）。
 *
 * 静音片段必须自己先筛掉：会把纯音/底噪送进音频模型时，模型会凭空"转写"
 * 出一句客套话（实测 1 秒 440Hz 正弦 → 「您好，请问有什么可以帮助您的吗？」），
 * 那句假话会被当成用户指令执行。前端也做一次，省流量也省一次误触发。
 */
function pcmRms(chunks: Int16Array[]): number {
  let sum = 0;
  let n = 0;
  for (const c of chunks) {
    for (let i = 0; i < c.length; i += 1) {
      const v = c[i] / 32768;
      sum += v * v;
      n += 1;
    }
  }
  return n ? Math.sqrt(sum / n) : 0;
}

// ---------------------------------------------------------------------------
// 真人复测埋点（2026-10-04）
// ---------------------------------------------------------------------------
// 「3.5 秒一片够不够用」「外放会不会自己触发」这类问题自动化测不出来，
// 只能在真设备上数。复测时用带参数的地址打开页面：
//   https://…/?asrdebug=1            逐片把延迟打到控制台，结束时汇总成表
//   https://…/?asrdebug=1&asrchunk=2.5   现场改分片长度（1.5–8 秒），验证"更短是否更跟手"
//   https://…/?asrdebug=1&asrsilence=0.02 现场改静音阈值，验证外放时会不会误杀人声
// 控制台里 `__asrLog` 是完整数组，可直接复制回填到复测记录表。
// ---------------------------------------------------------------------------
const DEBUG = typeof window !== "undefined" && /[?&]asrdebug=1/.test(window.location.search);

function paramNum(name: string, def: number, min: number, max: number): number {
  if (typeof window === "undefined") return def;
  const m = new RegExp(`[?&]${name}=([0-9.]+)`).exec(window.location.search);
  if (!m) return def;
  const v = Number(m[1]);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def;
}

/** 复测专用：?asrforce=server 关掉浏览器识别，只走服务端转写 */
const FORCE_SERVER = typeof window !== "undefined" && /[?&]asrforce=server/.test(window.location.search);
/** 一片语音攒够多少秒就送服务端（原写死 3.5 秒，复测时可现场调） */
const CHUNK_SEC = paramNum("asrchunk", 3.5, 1.5, 8);
/** 低于这个能量就当没说话，不上传（可用 ?asrsilence= 现场调） */
const SILENCE_RMS = paramNum("asrsilence", 0.012, 0.001, 0.2);

type AsrMark = Record<string, unknown>;

function asrLog(entry: AsrMark) {
  if (!DEBUG || typeof window === "undefined") return;
  const w = window as unknown as { __asrLog?: AsrMark[] };
  if (!w.__asrLog) w.__asrLog = [];
  const row: AsrMark = { t: new Date().toISOString().slice(11, 23), ...entry };
  w.__asrLog.push(row);
  // eslint-disable-next-line no-console
  console.log("[ASR]", JSON.stringify(row));
}

/** 把 PCM 片段封装成 WAV 的 data URL（服务端只认 data:audio/wav;base64） */
function encodeWav(chunks: Int16Array[], sampleRate = 16000): string {
  const total = chunks.reduce((a, c) => a + c.length, 0);
  if (!total) return "";
  const buf = new ArrayBuffer(44 + total * 2);
  const view = new DataView(buf);
  const tag = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i));
  };
  tag(0, "RIFF");
  view.setUint32(4, 36 + total * 2, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, total * 2, true);
  let offset = 44;
  for (const c of chunks) {
    new Int16Array(buf, offset, c.length).set(c);
    offset += c.length * 2;
  }
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...Array.from(bytes.subarray(i, i + 0x8000)));
  }
  return `data:audio/wav;base64,${btoa(bin)}`;
}

export interface ServerAsrOptions {
  enabled: boolean;
  sessionId: string;
  scenario: DemoScenario;
  /** 播报期间必须停采集，否则扬声器声音被收回形成自激（问题 ④） */
  muted: boolean;
  onText: (text: string) => void;
  onStatus?: (message: string) => void;
}

/**
 * 服务端分片识别：每积累约 3.5 秒语音就上传一次。
 * 返回当前是否真的在收音（用于界面显示）。
 */
export function useServerAsr(opts: ServerAsrOptions) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string>("");
  const stopRef = useRef<(() => void) | null>(null);
  const onTextRef = useRef(opts.onText);
  const onStatusRef = useRef(opts.onStatus);
  onTextRef.current = opts.onText;
  onStatusRef.current = opts.onStatus;

  const start = useCallback(async () => {
    if (stopRef.current) return;
    if (typeof window === "undefined") return;
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor || !navigator.mediaDevices?.getUserMedia || !Ctor.prototype.audioWorklet) {
      setError("此浏览器不支持服务端语音识别，请用 Chrome 或 Edge，或点下方句子");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setError("麦克风权限被拒绝，请在浏览器地址栏允许麦克风后重试");
      return;
    }
    const ctx = new Ctor();
    let workletOk = true;
    try {
      await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: "application/javascript" })));
    } catch {
      workletOk = false;
    }
    if (!workletOk) {
      ctx.close();
      stream.getTracks().forEach((t) => t.stop());
      setError("此浏览器不支持服务端语音识别，请用 Chrome 或 Edge，或点下方句子");
      return;
    }
    const source = ctx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(ctx, "suixingmei-capture");
    // 静音输出：worklet 只采集不出声，但仍要接进图才会被调度
    const sink = ctx.createGain();
    sink.gain.value = 0;
    source.connect(node);
    node.connect(sink);
    sink.connect(ctx.destination);

    let pending: Int16Array[] = [];
    let samples = 0;
    let sending = false;
    let dead = false;
    // 最后一次"确实有声音"的时刻：端到端延迟要从这里算，才等于真人感受到的
    // 「我说完 → 界面有反应」。从上传时刻算会漏掉攒片的时间，低估真实体感。
    let lastVoiceAt = 0;

    asrLog({ event: "server-start", chunkSec: CHUNK_SEC, silenceRms: SILENCE_RMS });

    const flush = async () => {
      if (dead || sending || !pending.length) return;
      sending = true;
      const chunk = pending;
      pending = [];
      samples = 0;
      const rms = pcmRms(chunk);
      const chunkSec = +(chunk.reduce((a, c) => a + c.length, 0) / 16000).toFixed(2);
      const since = lastVoiceAt || performance.now();
      const sendAt = performance.now();
      try {
        // 没说话就不上传：避免静音被模型编造成指令
        if (rms >= SILENCE_RMS) {
          const audio = encodeWav(chunk);
          if (audio) {
            const res = await transcribe(opts.sessionId, { audio, scenario: opts.scenario });
            if (dead) return;
            const recvAt = performance.now();
            asrLog({
              event: "text",
              chunkSec,
              rms: +rms.toFixed(4),
              // 攒片等待：上一片结束到这次上传之间"干等"的秒数
              waitMs: Math.round(sendAt - since),
              // 网络 + 模型转写
              modelMs: Math.round(recvAt - sendAt),
              // 端到端：从最后一句人声到拿到文字（真人体感就是这个数）
              e2eMs: Math.round(recvAt - since),
              text: res.text ?? "",
            });
            if (res.text) onTextRef.current(res.text);
            else if (res.reason && res.reason !== "empty" && res.message) onStatusRef.current?.(res.message);
          }
        } else {
          // 复测重点：外放时人声小、或离得远，可能被这里误杀（后面就永远没反应）
          asrLog({ event: "silence-skipped", chunkSec, rms: +rms.toFixed(4) });
        }
      } catch (err) {
        asrLog({ event: "error", chunkSec, message: err instanceof Error ? err.message : String(err) });
        onStatusRef.current?.("服务端识别这一片失败了，正在继续听");
      } finally {
        sending = false;
      }
    };

    node.port.onmessage = (e: MessageEvent) => {
      if (dead) return;
      const pcm = new Int16Array(e.data as ArrayBuffer);
      pending.push(pcm);
      samples += pcm.length;
      // pcmRms 收的是片段数组，单块要包一层
      if (pcmRms([pcm]) >= SILENCE_RMS) lastVoiceAt = performance.now();
      // 约 CHUNK_SEC 秒送一次：太短上下文不足，太长等待明显
      if (samples >= 16000 * CHUNK_SEC) void flush();
    };

    const stop = () => {
      if (dead) return;
      dead = true;
      try {
        source.disconnect();
        node.disconnect();
        sink.disconnect();
      } catch {
        /* 已断开 */
      }
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close().catch?.(() => undefined);
      stopRef.current = null;
      setActive(false);
      if (DEBUG && typeof window !== "undefined") {
        const w = window as unknown as { __asrLog?: AsrMark[] };
        if (w.__asrLog?.length) {
          // eslint-disable-next-line no-console
          console.table(w.__asrLog);
          // eslint-disable-next-line no-console
          console.log("[ASR] 复制这一整段回填复测表：", JSON.stringify(w.__asrLog));
        }
      }
    };
    stopRef.current = stop;
    setError("");
    setActive(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.sessionId, opts.scenario]);

  useEffect(() => {
    if (!opts.enabled) {
      stopRef.current?.();
      return;
    }
    if (opts.muted) {
      // 播报期间停采集：给 TTS 让出麦克风，避免自激（问题 ④）
      stopRef.current?.();
      return;
    }
    void start();
    return () => stopRef.current?.();
  }, [opts.enabled, opts.muted, start]);

  return { active, error };
}

/** 识别不可用的具体原因，用于给用户可执行的提示。 */
export type RecognitionFailure = "unsupported" | "denied" | "network" | "unknown";

/** 每个原因对应一句可操作的说明，而不是笼统的"模拟收音"。 */
export const RECOGNITION_HINTS: Record<RecognitionFailure, string> = {
  unsupported: "此浏览器不支持语音识别，请用 Chrome 或 Edge，或点下方句子",
  denied: "麦克风权限被拒绝，请在浏览器地址栏允许麦克风后重试",
  network: "语音识别需要联网，当前网络不可用；可点下方句子继续",
  unknown: "语音识别未能启动，可点下方句子继续",
};

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
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

export function useRecognition(
  opts: { enabled: boolean; muted: boolean; onFinal: (text: string) => void; sessionId: string; scenario: DemoScenario },
) {
  const [failed, setFailed] = useState<RecognitionFailure | null>(null);
  const [interim, setInterim] = useState("");
  const [reconnecting, setReconnecting] = useState(false);
  const [serverNote, setServerNote] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  // 待执行的重连定时器，静音/卸载时要一并清掉
  const restartRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 连续网络/未知失败次数：达到上限才彻底放弃并告诉用户（评审问题 ①）
  const softFailRef = useRef(0);
  // 最近一次确实收到识别活动的时间，用于看门狗重启
  const activeRef = useRef(0);
  const onFinalRef = useRef(opts.onFinal);
  const mutedRef = useRef(opts.muted);
  const enabledRef = useRef(opts.enabled);
  // 上一次是否处于静音，用于只在「静音结束」时才重新拉起识别
  const wasMutedRef = useRef(opts.muted);
  // 复测专用：?asrforce=server 强制关掉浏览器识别，逼它走服务端通道。
  // 耳机场景下浏览器识别往往能用，不强制就永远测不到服务端转写的节奏。
  const [supported] = useState(() => !!recognitionCtor() && !FORCE_SERVER);

  /**
   * 浏览器识别不可用（不支持 / 权限拒绝 / 连续失败到上限）时，改走服务端识别。
   *
   * 这是评审问题 ①「语音连不上网，连上了也容易断开」的根治手段：不再依赖
   * Google 的识别服务，改由服务端音频模型转写。Web Speech 好用时优先用它
   * （延迟更低），两条路不会同时占用麦克风。
   */
  const needServer = opts.enabled && (!supported || !!failed);
  const server = useServerAsr({
    enabled: needServer,
    sessionId: opts.sessionId,
    scenario: opts.scenario,
    muted: opts.muted,
    onText: (text) => onFinalRef.current(text),
    onStatus: (m) => setServerNote(m),
  });
  const mode: RecognitionMode = supported && !failed ? "native" : server.active ? "server" : "simulated";
  // 复测埋点：记录当前走哪条通道。若整轮都是 "native"，说明服务端通道没被用到，
  // 那样"服务端转写够不够用"这一项就没有被测到——必须在复测表里写清楚。
  useEffect(() => {
    asrLog({ event: "mode", mode, supported, failed, serverActive: server.active });
  }, [mode, supported, failed, server.active]);

  useEffect(() => {
    onFinalRef.current = opts.onFinal;
    mutedRef.current = opts.muted;
    enabledRef.current = opts.enabled;
  });

  useEffect(() => {
    const Ctor = recognitionCtor();
    if (!opts.enabled || !Ctor || failed) return;
    let dead = false;
    // 复测埋点：最后一次收到未定稿结果的时刻，用来算"说完 → 出字"的端到端延迟
    let interimAt = 0;
    // 断线后按退避间隔重连，避免网络不可用时陷入疯狂重连（评审问题 ①）
    let backoff = 600;
    // 记录失败原因，让界面能告诉用户「为什么没在听」，而不是只显示"模拟收音"。
    const fail = (reason: RecognitionFailure = "unknown") => {
      dead = true;
      setFailed(reason);
    };
    const rec = new Ctor();
    rec.lang = "zh-CN";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => {
      activeRef.current = Date.now();
      setReconnecting(false);
    };
    rec.onresult = (e) => {
      activeRef.current = Date.now();
      // 关掉语音输入后，迟到的识别结果一律丢弃（问题 19）
      if (!enabledRef.current || mutedRef.current) return;
      /**
       * 问题 21：只提交已经定稿（isFinal）的片段。
       *
       * 原实现把 resultIndex 之后所有片段（含未定稿的 interim）拼在一起，
       * 只要其中任意一段 isFinal 就把整串当最终文本提交 —— 于是用户还在
       * 说话时就被抢先执行了半句话；下一轮 interim 修正后又重复提交一遍。
       */
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const piece = e.results[i][0]?.transcript ?? "";
        if (e.results[i].isFinal) finalText += piece;
        else interimText += piece;
      }
      setInterim(finalText || interimText);
      if (finalText.trim()) {
        // 与服务端通道同口径：从最后一次"还在说"到拿到定稿的毫秒数
        const e2e = interimAt ? Math.round(performance.now() - interimAt) : null;
        asrLog({ event: "native-final", e2eMs: e2e, text: finalText.trim() });
        interimAt = 0;
        onFinalRef.current(finalText.trim());
        setTimeout(() => setInterim(""), 2500);
      } else if (interimText.trim()) {
        interimAt = performance.now();
      }
      // 确实收到结果说明链路是通的：退避间隔与失败计数一并复位
      backoff = 600;
      softFailRef.current = 0;
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      // 权限是硬错误，没法自己恢复，立刻告诉用户。
      if (e.error === "not-allowed" || e.error === "service-not-allowed") return fail("denied");
      /**
       * network / unknown 不再「一次就判死刑」。
       *
       * 浏览器语音识别走的是外部服务，国内网络抖动非常常见：原来一遇到
       * network 就 setFailed，识别永久停止，表现为「连上了也容易断开，之后
       * 就再也听不见」。改成：先按退避重连（onend 里的逻辑），连续失败到
       * 上限才真正放弃并给出可操作的提示。
       */
      const soft = e.error === "network" || e.error === "unknown" || e.error === "audio-capture";
      asrLog({ event: "native-error", error: e.error, softFail: softFailRef.current + 1 });
      if (!soft) return fail("unknown");
      softFailRef.current += 1;
      if (softFailRef.current >= 5) return fail(e.error === "network" ? "network" : "unknown");
      setReconnecting(true);
    };
    rec.onend = () => {
      if (dead || recRef.current !== rec) return;
      // 播报期间我们已经主动 stop 了，这里不能再拉起——否则扬声器播出的讲解
      // 会被麦克风收录识别成“用户说话”，触发指令后又播报，形成自激（问题 ④）。
      if (!enabledRef.current || mutedRef.current) return;
      if (restartRef.current) clearTimeout(restartRef.current);
      const wait = backoff;
      backoff = Math.min(backoff * 2, 8000);
      asrLog({ event: "native-restart", waitMs: wait });
      restartRef.current = setTimeout(() => {
        restartRef.current = null;
        if (dead || !enabledRef.current || mutedRef.current) return;
        try {
          rec.start();
        } catch {
          fail("unknown");
        }
      }, wait);
    };
    recRef.current = rec;
    activeRef.current = Date.now();
    try {
      rec.start();
    } catch {
      queueMicrotask(() => fail("unknown"));
    }
    /**
     * 看门狗：Chrome 下识别经常「假死」——既不报错也不再给结果（切到后台再回来、
     * 长时间没人说话时尤其常见），界面还显示"在听"，但说什么都没反应。
     * 超过 12s 没有任何识别活动就拉一次：
     *   已停止 → start 直接恢复；仍在跑 → start 抛错，改 stop，由 onend 重连。
     */
    const watchdog = setInterval(() => {
      if (dead || !enabledRef.current || mutedRef.current) return;
      if (Date.now() - activeRef.current < 12000) return;
      activeRef.current = Date.now();
      try {
        rec.start();
      } catch {
        try {
          rec.stop();
        } catch {
          /* 已停止 */
        }
      }
    }, 3000);
    return () => {
      dead = true;
      clearInterval(watchdog);
      if (restartRef.current) clearTimeout(restartRef.current);
      recRef.current = null;
      rec.abort();
    };
  }, [opts.enabled, failed]);

  /**
   * TTS 播报期间**真正停止**识别（评审问题 ④）。
   *
   * 原先只是在 onresult 里 `if (muted) return` 忽略结果，麦克风仍在收音：
   * 扬声器播出的讲解会被识别成用户指令 → 执行 → 再播报，形成自激循环，
   * 表现为「自己加入内容并一直播报，听不见人声」。
   */
  useEffect(() => {
    const rec = recRef.current;
    if (!rec || !opts.enabled || failed) return;
    const wasMuted = wasMutedRef.current;
    wasMutedRef.current = opts.muted;
    if (opts.muted) {
      if (restartRef.current) {
        clearTimeout(restartRef.current);
        restartRef.current = null;
      }
      try {
        rec.stop();
      } catch {
        /* 已经处于停止状态 */
      }
      return;
    }
    // 只有从静音恢复时才重启；初次挂载不该重复 start
    if (!wasMuted) return;
    // 播报结束后稍等再开，避开尾音被录入
    const t = setTimeout(() => {
      if (!enabledRef.current || mutedRef.current) return;
      try {
        rec.start();
      } catch {
        /* 已在运行 */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [opts.muted, opts.enabled, failed]);

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

  // 浏览器压根没有这个 API 时，也要让用户知道原因。
  const failure: RecognitionFailure | null = !supported ? "unsupported" : failed;

  return {
    mode,
    listening: opts.enabled && (mode === "native" || mode === "server"),
    interim: opts.enabled ? interim : "",
    simulate,
    // 服务端识别接上之后，浏览器不可用不再是"没法用"，界面不要显示成故障
    failure: server.active ? null : failure,
    reconnecting: !failure && !server.active && reconnecting,
    /** 不可用时给用户一句可操作的说明；可用时为空串。 */
    hint: server.active
      ? "已改用服务端识别，直接说话就行"
      : server.error
        ? server.error
        : serverNote
          ? serverNote
          : failure
            ? RECOGNITION_HINTS[failure]
            : reconnecting
              ? "语音识别断开了一下，正在自动重连；也可以直接点下方句子"
              : "",
  };
}
