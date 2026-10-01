import * as engine from "./engine";
import { LOOKS, buildPlan, DEFAULT_TOOLS } from "./looks";
import type { CheckRecord, LookId, PartKey, SavedLook, Session } from "./types";
import { asset } from "./utils";

const DAY = 86400000;

function seededSession(opts: {
  id: string;
  lookId: LookId;
  daysAgo: number;
  hour: number;
  completed: boolean;
  doneParts: number;
  checks: { part: PartKey; attempt: number; minutesIn: number }[];
  elapsedMin: number;
}): Session {
  const look = LOOKS[opts.lookId];
  const now = new Date();
  now.setHours(opts.hour, 12, 0, 0);
  const createdAt = now.getTime() - opts.daysAgo * DAY;
  const analysis = engine.makeupAnalysis({ sampleLook: opts.lookId });
  const face = engine.faceAnalysis({ seed: 0, sample: true, quality: { brightness: 168, sharpness: 120, ok: true, issues: [] } });
  const adapt = engine.adapt("round", analysis);
  const plan = buildPlan(opts.lookId, adapt.adjustments, DEFAULT_TOOLS);
  const included = plan.filter((p) => p.included);
  const done = included.slice(0, opts.doneParts).flatMap((p) => p.steps.map((s) => s.id));
  const checks: CheckRecord[] = opts.checks.map((c, i) => {
    const part = plan.find((p) => p.key === c.part)!;
    const res = engine.vision({ part: c.part, attempt: c.attempt, landmarkSet: "user" });
    return {
      ...res,
      id: `${opts.id}-c${i}`,
      landmarkSet: "user",
      part: c.part,
      stepId: part.steps[part.steps.length - 1].id,
      stepTitle: part.steps[part.steps.length - 1].title,
      image: asset("/images/user-after.jpg"),
      createdAt: createdAt + c.minutesIn * 60000,
    };
  });
  const checksGood = checks.filter((c) => c.status === "good").length;
  const stepsTotal = included.reduce((a, p) => a + p.steps.length, 0);
  return {
    id: opts.id,
    lookId: opts.lookId,
    lookName: look.name,
    referenceImage: look.referenceImage,
    referenceSample: opts.lookId,
    selfieImage: asset("/images/user-bare.jpg"),
    selfieSample: true,
    afterImage: opts.completed ? asset("/images/user-after.jpg") : undefined,
    analysis,
    face,
    adapt,
    plan,
    tools: DEFAULT_TOOLS,
    status: opts.completed ? "completed" : "following",
    progress: {
      partIndex: Math.min(opts.doneParts, included.length - 1),
      stepIndex: 0,
      done,
    },
    checks,
    chat: [],
    score: opts.completed
      ? engine.score({
          stepsDone: done.length,
          stepsTotal,
          checksGood,
          checksTotal: checks.length,
          lookId: opts.lookId,
        })
      : undefined,
    createdAt,
    startedAt: createdAt + 60000,
    completedAt: opts.completed ? createdAt + opts.elapsedMin * 60000 : undefined,
    elapsedS: opts.elapsedMin * 60,
  };
}

export function seedData(): { sessions: Session[]; looks: SavedLook[] } {
  const sessions = [
    seededSession({
      id: "seed-peach-1",
      lookId: "peach",
      daysAgo: 1,
      hour: 8,
      completed: false,
      doneParts: 2,
      checks: [{ part: "brow", attempt: 0, minutesIn: 6 }],
      elapsedMin: 7,
    }),
    seededSession({
      id: "seed-guofeng",
      lookId: "guofeng",
      daysAgo: 3,
      hour: 19,
      completed: true,
      doneParts: 6,
      checks: [
        { part: "eyeshadow", attempt: 0, minutesIn: 9 },
        { part: "eyeshadow", attempt: 1, minutesIn: 11 },
        { part: "lip", attempt: 0, minutesIn: 21 },
      ],
      elapsedMin: 26,
    }),
    seededSession({
      id: "seed-milktea",
      lookId: "milktea",
      daysAgo: 8,
      hour: 7,
      completed: true,
      doneParts: 5,
      checks: [
        { part: "brow", attempt: 1, minutesIn: 5 },
        { part: "lip", attempt: 1, minutesIn: 13 },
      ],
      elapsedMin: 15,
    }),
  ];
  const looks: SavedLook[] = [
    {
      id: "look-guofeng",
      sessionId: "seed-guofeng",
      lookId: "guofeng",
      lookName: LOOKS.guofeng.name,
      styleLabel: LOOKS.guofeng.styleLabel,
      referenceImage: LOOKS.guofeng.referenceImage,
      afterImage: asset("/images/user-after.jpg"),
      score: sessions[1].score?.total,
      savedAt: sessions[1].completedAt!,
    },
    {
      id: "look-milktea",
      sessionId: "seed-milktea",
      lookId: "milktea",
      lookName: LOOKS.milktea.name,
      styleLabel: LOOKS.milktea.styleLabel,
      referenceImage: LOOKS.milktea.referenceImage,
      afterImage: asset("/images/user-after.jpg"),
      score: sessions[2].score?.total,
      savedAt: sessions[2].completedAt!,
    },
    {
      id: "look-cool",
      lookId: "cool",
      lookName: LOOKS.cool.name,
      styleLabel: LOOKS.cool.styleLabel,
      referenceImage: LOOKS.cool.referenceImage,
      savedAt: Date.now() - 12 * DAY,
    },
  ];
  return { sessions, looks };
}
