"use client";

import * as engine from "./engine";
import type { ColorHint } from "./engine";
import type { LandmarkSetId } from "./face-geometry";
import type {
  AdaptResult,
  CheckResult,
  DemoScenario,
  FaceAnalysis,
  ImageQuality,
  LookId,
  MakeupAnalysis,
  PartKey,
  PartPlan,
  ScoreResult,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

const rid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()));

/** GitHub Pages 静态版没有 /api 路由 */
const STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

/** 在浏览器内直接跑与 route.ts 相同的 mock handler，保留模拟延迟和演示场景 */
async function callInBrowser<T>(
  sessionId: string,
  action: string,
  body: Record<string, unknown>,
  scenario: DemoScenario,
): Promise<T> {
  const { HttpError, handlers } = await import("./server/handlers");
  const handler = handlers[action];
  if (!handler) throw new ApiError(404, "unknown_action");
  const requestId = rid();
  try {
    const data = await handler({ ...body, request_id: requestId }, scenario);
    return { session_id: sessionId, request_id: requestId, ...(data as object) } as T;
  } catch (err) {
    if (err instanceof HttpError) throw new ApiError(err.status, err.code);
    throw new ApiError(500, "internal_error");
  }
}

async function call<T>(
  sessionId: string,
  action: string,
  body: Record<string, unknown>,
  scenario: DemoScenario,
  timeoutMs = 12000,
): Promise<T> {
  if (STATIC_EXPORT) return callInBrowser<T>(sessionId, action, body, scenario);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`/api/v2/sessions/${sessionId}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-demo-scenario": scenario },
      body: JSON.stringify({ ...body, request_id: rid() }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data.error ?? "request_failed");
    return data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, ctrl.signal.aborted ? "timeout" : "network_error");
  } finally {
    clearTimeout(timer);
  }
}

export async function createSession(): Promise<string> {
  if (STATIC_EXPORT) return `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  try {
    const res = await fetch("/api/v2/sessions", { method: "POST" });
    const data = await res.json();
    return data.id as string;
  } catch {
    return `local_${Date.now().toString(36)}`;
  }
}

export async function analyzeMakeup(
  sessionId: string,
  opts: { hint: ColorHint | null; sampleLook?: LookId; scenario: DemoScenario },
): Promise<MakeupAnalysis> {
  try {
    return await call<MakeupAnalysis>(
      sessionId,
      "makeup-analysis",
      { color_hint: opts.hint, sample_look: opts.sampleLook },
      opts.scenario,
    );
  } catch {
    return engine.makeupAnalysis({ hint: opts.hint, sampleLook: opts.sampleLook, fallback: true });
  }
}

/** 脸型分析默认在本机完成（自拍不上云）；这里模拟 wasm 推理耗时 */
export async function analyzeFaceLocal(opts: { seed: number; sample: boolean; quality: ImageQuality }): Promise<FaceAnalysis> {
  await new Promise((r) => setTimeout(r, 900));
  return engine.faceAnalysis(opts);
}

export async function adaptPlan(
  sessionId: string,
  face: FaceAnalysis,
  analysis: MakeupAnalysis,
  scenario: DemoScenario,
): Promise<AdaptResult> {
  try {
    return await call<AdaptResult>(sessionId, "adapt", { face_shape: face.faceShape, makeup_analysis: analysis }, scenario);
  } catch {
    return engine.adapt(face.faceShape, analysis, true);
  }
}

export async function generateSteps(
  sessionId: string,
  opts: { lookId: LookId; adapt: AdaptResult; tools: string[]; included?: PartKey[]; scenario: DemoScenario },
): Promise<PartPlan[]> {
  try {
    const data = await call<{ steps: PartPlan[] }>(
      sessionId,
      "steps",
      { look_id: opts.lookId, adapt_result: opts.adapt, user_tools: opts.tools, included: opts.included },
      opts.scenario,
    );
    return data.steps;
  } catch {
    return engine.steps(opts.lookId, opts.adapt, opts.tools, opts.included);
  }
}

export async function checkFrame(
  sessionId: string,
  opts: {
    image: string;
    part: PartKey;
    stepId: string;
    attempt: number;
    landmarkSet: LandmarkSetId;
    quality: ImageQuality;
    scenario: DemoScenario;
  },
): Promise<CheckResult> {
  try {
    return await call<CheckResult>(
      sessionId,
      "vision",
      {
        image: opts.image,
        part: opts.part,
        step_id: opts.stepId,
        attempt: opts.attempt,
        landmark_set: opts.landmarkSet,
        consent: true,
      },
      opts.scenario,
    );
  } catch {
    return engine.visionLocal(opts.quality);
  }
}

export async function askAI(
  sessionId: string,
  opts: Parameters<typeof engine.dialogue>[0] & { scenario: DemoScenario },
): Promise<string> {
  try {
    const data = await call<{ reply: string }>(
      sessionId,
      "dialogue",
      {
        text: opts.text,
        part: opts.part,
        step_title: opts.stepTitle,
        instruction: opts.instruction,
        adapted: opts.adapted,
        face_shape_label: opts.faceShapeLabel,
        remaining_min: opts.remainingMin,
      },
      opts.scenario,
    );
    return data.reply;
  } catch {
    return engine.dialogue(opts);
  }
}

export async function scoreLook(
  sessionId: string,
  opts: {
    before: string;
    after: string;
    stepsDone: number;
    stepsTotal: number;
    checksGood: number;
    checksTotal: number;
    lookId: LookId;
    scenario: DemoScenario;
  },
): Promise<ScoreResult> {
  try {
    return await call<ScoreResult>(
      sessionId,
      "score",
      {
        before_image: opts.before,
        after_image: opts.after,
        steps_done: opts.stepsDone,
        steps_total: opts.stepsTotal,
        checks_good: opts.checksGood,
        checks_total: opts.checksTotal,
        look_id: opts.lookId,
        consent: true,
      },
      opts.scenario,
    );
  } catch {
    return engine.score({ ...opts, fallback: true });
  }
}
