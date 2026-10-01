import * as engine from "@/lib/engine";
import type { ColorHint } from "@/lib/engine";
import type { LandmarkSetId } from "@/lib/face-geometry";
import type { AdaptResult, DemoScenario, FaceShape, ImageQuality, LookId, MakeupAnalysis, PartKey } from "@/lib/types";

/**
 * Mock 实现，与 code-plan §4 的接口一一对应。
 * 接入真实服务时，把每个 handler 换成对 beauty-mvp/server 或阿里云百炼（DashScope）的调用，
 * 返回结构保持 src/lib/types.ts 中的类型即可，前端无需改动。
 */

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Body = Record<string, unknown>;
type Handler = (body: Body, scenario: DemoScenario) => Promise<unknown>;

function requireConsent(body: Body) {
  if (body.consent !== true) throw new HttpError(403, "consent_required");
}

export const handlers: Record<string, Handler> = {
  // F1 · 阿里云百炼 qwen-vl 多模态
  "makeup-analysis": async (body, scenario) => {
    if (scenario === "analysis-timeout") {
      await wait(2200);
      throw new HttpError(504, "upstream_timeout");
    }
    await wait(1300);
    return engine.makeupAnalysis({
      hint: body.color_hint as ColorHint | undefined,
      sampleLook: body.sample_look as LookId | undefined,
    });
  },

  // F2 · 云端兜底；正常情况在浏览器本机完成（face-parsing.wasm + beauty_vision.wasm）
  "face-analysis": async (body) => {
    await wait(700);
    return engine.faceAnalysis({
      seed: Number(body.seed ?? 0),
      sample: Boolean(body.sample),
      quality: body.quality as ImageQuality,
    });
  },

  // F3 · 适配引擎（仿射 + TPS），code-plan 中计划落在本机
  adapt: async (body) => {
    await wait(900);
    return engine.adapt(body.face_shape as FaceShape, body.makeup_analysis as MakeupAnalysis);
  },

  // F3 · 步骤生成，阿里云百炼 qwen3-text
  steps: async (body) => {
    await wait(800);
    return {
      steps: engine.steps(
        body.look_id as LookId,
        body.adapt_result as AdaptResult,
        (body.user_tools as string[]) ?? [],
        body.included as PartKey[] | undefined,
      ),
      engine: "qwen3-text（模拟）",
    };
  },

  // F5 · 帮我看看，复用 v1.0 vision 接口
  vision: async (body, scenario) => {
    requireConsent(body);
    if (scenario === "vision-timeout") {
      await wait(2000);
      throw new HttpError(504, "upstream_timeout");
    }
    await wait(1500);
    return engine.vision({
      part: body.part as PartKey,
      attempt: Number(body.attempt ?? 0),
      landmarkSet: (body.landmark_set as LandmarkSetId) ?? "generic",
    });
  },

  // F4 · 对话，复用 v1.0 dialogue；语音通话走 realtime.mjs
  dialogue: async (body) => {
    await wait(650);
    return {
      reply: engine.dialogue({
        text: String(body.text ?? ""),
        part: body.part as PartKey | undefined,
        stepTitle: body.step_title as string | undefined,
        instruction: body.instruction as string | undefined,
        adapted: body.adapted as string | undefined,
        faceShapeLabel: body.face_shape_label as string | undefined,
        remainingMin: body.remaining_min as number | undefined,
      }),
      engine: "qwen3-text（模拟）",
    };
  },

  // F6 · 妆后打分
  score: async (body) => {
    requireConsent(body);
    await wait(1900);
    return {
      status: "scored",
      ...engine.score({
        stepsDone: Number(body.steps_done ?? 0),
        stepsTotal: Number(body.steps_total ?? 0),
        checksGood: Number(body.checks_good ?? 0),
        checksTotal: Number(body.checks_total ?? 0),
        lookId: (body.look_id as LookId) ?? "peach",
      }),
    };
  },
};
