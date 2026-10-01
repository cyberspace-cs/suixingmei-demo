"use client";

import { useCallback, useState } from "react";
import { adaptPlan, analyzeFaceLocal, analyzeMakeup, createSession, generateSteps } from "@/lib/api";
import { analyzeQuality, colorHint, seedFrom } from "@/lib/local/image";
import { useApp } from "@/lib/store";
import type { Session } from "@/lib/types";

export type Stage = "makeup" | "face" | "adapt" | "steps";

export const STAGES: { key: Stage; label: string; detail: string; where: string }[] = [
  { key: "makeup", label: "解析参考妆", detail: "妆型 · 主辅色 · 关键技法", where: "云端多模态" },
  { key: "face", label: "识别你的脸型", detail: "68 关键点 · 三庭五眼", where: "本机处理，不上传" },
  { key: "adapt", label: "把妆容适配到你的脸", detail: "仿射 + TPS 形变映射", where: "本机" },
  { key: "steps", label: "生成专属步骤", detail: "按你手边的工具调整做法", where: "云端文本模型" },
];

export function useAnalysis() {
  const [stage, setStage] = useState<Stage | null>(null);
  const [done, setDone] = useState<Stage[]>([]);
  const [running, setRunning] = useState(false);

  const run = useCallback(async (): Promise<Session | null> => {
    const st = useApp.getState();
    const { reference, selfie, tools } = st;
    const scenario = st.settings.scenario;
    if (!reference || !selfie) return null;
    setRunning(true);
    setDone([]);
    try {
      const id = await createSession();

      setStage("makeup");
      const hint = reference.sampleLook ? null : await colorHint(reference.src).catch(() => null);
      const analysis = await analyzeMakeup(id, { hint, sampleLook: reference.sampleLook, scenario });
      setDone((d) => [...d, "makeup"]);

      setStage("face");
      const quality = selfie.quality ?? (await analyzeQuality(selfie.src));
      const face = await analyzeFaceLocal({ seed: seedFrom(selfie.src), sample: Boolean(selfie.sample), quality });
      setDone((d) => [...d, "face"]);

      setStage("adapt");
      const adapt = await adaptPlan(id, face, analysis, scenario);
      setDone((d) => [...d, "adapt"]);

      setStage("steps");
      const plan = await generateSteps(id, { lookId: analysis.lookId, adapt, tools, scenario });
      setDone((d) => [...d, "steps"]);

      const session: Session = {
        id,
        lookId: analysis.lookId,
        lookName: analysis.lookName,
        referenceImage: reference.src,
        referenceSample: reference.sampleLook,
        selfieImage: selfie.src,
        selfieSample: Boolean(selfie.sample),
        analysis,
        face,
        adapt,
        plan,
        tools,
        status: "ready",
        progress: { partIndex: 0, stepIndex: 0, done: [] },
        checks: [],
        chat: [],
        createdAt: Date.now(),
        elapsedS: 0,
      };
      useApp.getState().upsertSession(session);
      useApp.getState().setCurrent(id);
      return session;
    } finally {
      setStage(null);
      setRunning(false);
    }
  }, []);

  return { run, stage, done, running };
}
