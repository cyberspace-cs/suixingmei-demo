import { LANDMARKS, type LandmarkKey, type LandmarkSetId } from "./face-geometry";
import { FACE_SHAPE_LABEL, FACE_SHAPE_SUMMARY, LOOKS, PARTS, buildAdjustments, buildPlan } from "./looks";
import type {
  AdaptResult,
  CheckResult,
  FaceAnalysis,
  FaceShape,
  ImageQuality,
  LookId,
  MakeupAnalysis,
  PartKey,
  PartPlan,
  ScoreResult,
} from "./types";

export interface ColorHint {
  hue: number;
  saturation: number;
  lightness: number;
}

export function lookFromHint(hint?: ColorHint | null, sampleLook?: LookId): LookId {
  if (sampleLook) return sampleLook;
  if (!hint) return "peach";
  const { hue, saturation, lightness } = hint;
  if ((hue < 14 || hue > 345) && saturation > 0.42) return "guofeng";
  if (saturation < 0.16 || (hue > 200 && hue < 330)) return "cool";
  if (hue >= 18 && hue < 45 && lightness < 0.62) return "milktea";
  return "peach";
}

export function makeupAnalysis(opts: {
  hint?: ColorHint | null;
  sampleLook?: LookId;
  fallback?: boolean;
}): MakeupAnalysis {
  const lookId = lookFromHint(opts.hint, opts.sampleLook);
  const look = LOOKS[lookId];
  return {
    lookId,
    lookName: look.name,
    style: look.style,
    styleLabel: look.styleLabel,
    primaryColor: look.palette[0].hex,
    accentColors: look.palette.slice(1).map((s) => s.hex),
    palette: look.palette,
    techniques: look.techniques,
    regions: look.defaultParts,
    difficulty: look.difficulty,
    modelFaceShape: look.modelFaceShape,
    engine: opts.fallback ? "BiSeNet 本机兜底" : "qwen-vl（模拟）",
    fallback: opts.fallback,
    capturedAt: Date.now(),
  };
}

const SHAPES: FaceShape[] = ["round", "oval", "heart", "square", "long"];

export function faceAnalysis(opts: { seed: number; sample?: boolean; quality: ImageQuality }): FaceAnalysis {
  const shape: FaceShape = opts.sample ? "round" : SHAPES[Math.abs(opts.seed) % SHAPES.length];
  const thirds: Record<FaceShape, [number, number, number]> = {
    round: [0.32, 0.34, 0.34],
    oval: [0.33, 0.33, 0.34],
    long: [0.31, 0.33, 0.36],
    square: [0.33, 0.34, 0.33],
    heart: [0.35, 0.33, 0.32],
  };
  const detail: Record<FaceShape, { cheekbone: string; jaw: string; fiveEyes: string }> = {
    round: { cheekbone: "颧骨较宽、饱满", jaw: "下颌圆润，下颌角不明显", fiveEyes: "眼距略宽于一眼" },
    oval: { cheekbone: "颧骨适中", jaw: "下颌线流畅", fiveEyes: "五眼比例均衡" },
    long: { cheekbone: "颧骨偏窄", jaw: "下巴偏长", fiveEyes: "眼距适中" },
    square: { cheekbone: "颧骨适中", jaw: "下颌角较明显", fiveEyes: "眼距适中" },
    heart: { cheekbone: "颧骨较高", jaw: "下巴较尖", fiveEyes: "眼距略窄" },
  };
  return {
    faceShape: shape,
    faceShapeLabel: FACE_SHAPE_LABEL[shape],
    summary: FACE_SHAPE_SUMMARY[shape],
    thirds: thirds[shape],
    ...detail[shape],
    quality: opts.quality,
    engine: "face-parsing + beauty_vision（本机模拟）",
  };
}

export function adapt(face: FaceShape, analysis: MakeupAnalysis, fallback = false): AdaptResult {
  const parts = Object.keys(PARTS) as PartKey[];
  return {
    engine: fallback ? "通用比例模板" : "仿射 + TPS（模拟）",
    adjustments: buildAdjustments(face, parts.filter((p) => p !== "lashes")).filter(
      (a) => face !== analysis.modelFaceShape || a.part === "blush",
    ),
    fallback,
  };
}

export function steps(lookId: LookId, adaptResult: AdaptResult, tools: string[], included?: PartKey[]): PartPlan[] {
  return buildPlan(lookId, adaptResult.adjustments, tools, included);
}

interface CheckCopy {
  good: string;
  improve: string;
  goodAt: LandmarkKey;
  improveAt: LandmarkKey;
  summaryImprove: string;
  summaryGood: string;
}

const CHECK_COPY: Record<PartKey, CheckCopy> = {
  base: {
    improve: "左侧鼻翼边还有一点泛红，用粉扑边角再轻按一下。",
    good: "肤色整体均匀，两颊外侧保留了立体感。",
    improveAt: "nose",
    goodAt: "cheekR",
    summaryImprove: "底妆基本均匀，鼻翼还差一点",
    summaryGood: "底妆干净均匀，可以进入下一步",
  },
  contour: {
    improve: "右侧修容边缘有点明显，用干净的刷子向下晕开。",
    good: "修容起点位置正确，下颌线更利落了。",
    improveAt: "jawR",
    goodAt: "jawL",
    summaryImprove: "修容位置对了，右侧边缘再晕开",
    summaryGood: "修容和高光过渡自然",
  },
  brow: {
    improve: "右眉尾颜色比左边浅一些，再轻扫一层。",
    good: "两侧眉峰高度一致，眉形对称。",
    improveAt: "browRTail",
    goodAt: "browLPeak",
    summaryImprove: "眉形位置正确，右眉尾颜色偏浅",
    summaryGood: "眉形对称，浓淡过渡自然",
  },
  eyeshadow: {
    improve: "左眼尾深色的晕染边界有点硬，用指腹轻轻推开。",
    good: "眼尾上扬角度合适，眼型被拉长了。",
    improveAt: "eyeLOuter",
    goodAt: "eyeROuter",
    summaryImprove: "眼尾方向对了，左眼边界再晕开",
    summaryGood: "眼影层次清楚，过渡柔和",
  },
  eyeliner: {
    improve: "右眼线尾端略粗，用棉签把下缘擦细一点。",
    good: "睫毛根部填得很满，没有空隙。",
    improveAt: "eyeROuter",
    goodAt: "eyeL",
    summaryImprove: "眼线流畅，右眼尾稍粗",
    summaryGood: "眼线干净，尾端收得很细",
  },
  lashes: {
    improve: "左眼外侧睫毛有些粘连，用睫毛梳梳开。",
    good: "睫毛根根分明，卷翘度保持得不错。",
    improveAt: "eyeLOuter",
    goodAt: "eyeR",
    summaryImprove: "睫毛卷翘，左眼外侧有粘连",
    summaryGood: "睫毛根根分明",
  },
  blush: {
    improve: "左侧腮红比右侧低一点，向外上方补一笔。",
    good: "腮红斜向外上方，晕染边缘自然。",
    improveAt: "cheekL",
    goodAt: "cheekR",
    summaryImprove: "腮红方向正确，左右高度差一点",
    summaryGood: "腮红位置对称，气色很好",
  },
  lip: {
    improve: "唇缘偏左多了一点，用棉签轻擦左侧唇角。",
    good: "下唇中央颜色饱满，唇峰圆润自然。",
    improveAt: "lipLeft",
    goodAt: "lipBottom",
    summaryImprove: "唇色饱满，左侧唇缘略有溢出",
    summaryGood: "唇形圆润，边缘干净",
  },
};

export function vision(opts: {
  part: PartKey;
  attempt: number;
  landmarkSet: LandmarkSetId;
}): CheckResult {
  const copy = CHECK_COPY[opts.part];
  const L = LANDMARKS[opts.landmarkSet];
  const good = { type: "good" as const, text: copy.good, marker: L[copy.goodAt] };
  if (opts.attempt > 0) {
    return {
      status: "good",
      summary: copy.summaryGood,
      items: [good, { type: "good", text: "和上次相比改善明显，保持这个力度。", marker: L[copy.improveAt] }],
      engine: "qwen-vl（模拟）",
    };
  }
  return {
    status: "improve",
    summary: copy.summaryImprove,
    items: [good, { type: "improve", text: copy.improve, marker: L[copy.improveAt] }],
    engine: "qwen-vl（模拟）",
  };
}

export function visionLocal(quality: ImageQuality): CheckResult {
  return {
    status: "good",
    summary: "云端暂时没有回应，已完成本机基础检查",
    items: [
      { type: quality.brightness > 70 ? "good" : "improve", text: quality.brightness > 70 ? "光线充足，颜色识别可靠。" : "光线偏暗，靠近窗边会更准。" },
      { type: "good", text: "人脸位于画面中央，已检测到上妆区域的颜色变化。" },
      { type: "improve", text: "细节建议需要云端分析，网络恢复后可再点一次「帮我看看」。" },
    ],
    engine: "本机规则（BiSeNet）",
    fallback: true,
  };
}

export function dialogue(opts: {
  text: string;
  part?: PartKey;
  stepTitle?: string;
  instruction?: string;
  adapted?: string;
  faceShapeLabel?: string;
  remainingMin?: number;
}): string {
  const t = opts.text;
  const face = opts.faceShapeLabel ?? "你的脸型";
  if (/眉尾|多长|眉峰/.test(t))
    return `按${face}来画，眉尾落在鼻翼和眼尾的连线上就停，比参考妆短 2 毫米左右，眉峰微微抬高，脸会显得更修长。`;
  if (/太深|太浓|浓了|深了|画重/.test(t))
    return "颜色深了不用擦掉，用干净的刷子或指腹轻轻晕开就会变淡。宁淡勿浓，一层一层往上加更稳。";
  if (/太淡|看不出|没颜色/.test(t))
    return "可以再叠一层，但每次只取一点点，先在手背上掸掉余粉，再轻扫上去。";
  if (/腮红/.test(t))
    return `${face}的腮红从苹果肌外侧开始，朝耳朵上缘斜着晕开，不要画在正中间画成圆形，那样会显得脸更圆。`;
  if (/没有|工具|刷子|没刷/.test(t))
    return "没有刷子也可以用指腹：先在手背上蹭掉多余的量，再轻轻拍在皮肤上，效果反而更自然。";
  if (/手抖|画歪|歪了|失误|擦/.test(t))
    return "画歪了别担心，用棉签蘸一点乳液擦掉那一小段就好。手肘撑在桌面上，手会稳很多。";
  if (/多久|时间|还要/.test(t))
    return `按现在的节奏，剩下的部分大约还要 ${opts.remainingMin ?? 8} 分钟。不用赶，每一步做好再往下走。`;
  if (/脸型|圆脸|为什么|适合/.test(t))
    return `参考妆的模特脸型和你不同，所以我把关键位置做了调整。${opts.adapted ? `这一步：${opts.adapted}。` : "具体调整在每一步的「为你调整」里能看到。"}`;
  if (/颜色|色号|哪个色/.test(t))
    return "用色卡里的颜色就可以；如果手边没有完全一样的，选同色系浅一号的更安全。";
  if (opts.stepTitle)
    return `关于「${opts.stepTitle}」：${opts.instruction ?? ""} 不确定效果的话，点「帮我看看」拍一张，我帮你看。`;
  return "我在呢。你可以问我当前这一步怎么做，或者说「帮我看看」让我检查效果。";
}

export function score(opts: {
  stepsDone: number;
  stepsTotal: number;
  checksGood: number;
  checksTotal: number;
  lookId: LookId;
  fallback?: boolean;
}): ScoreResult {
  const completion = opts.stepsTotal ? opts.stepsDone / opts.stepsTotal : 1;
  const checkBonus = opts.checksTotal ? (opts.checksGood / opts.checksTotal) * 4 : 0;
  const base = 74 + Math.round(completion * 8 + checkBonus);
  const look = LOOKS[opts.lookId];
  const dims = [
    { key: "symmetry", label: "左右对称", score: base + 4, note: "两侧眉峰高度一致，腮红位置基本对称" },
    { key: "edge", label: "边缘干净", score: base - 3, note: "唇缘左侧略有溢出，其他边缘干净" },
    { key: "evenness", label: "色彩均匀", score: base + 2, note: "底妆均匀，眼影过渡自然" },
    { key: "fullness", label: "妆感饱满", score: base - 5, note: "唇色可以再饱满一点" },
    { key: "harmony", label: "整体协调", score: base + 6, note: `配色统一在${look.palette[0].name}色系，和你的肤色很搭` },
  ].map((d) => ({ ...d, score: Math.max(55, Math.min(98, d.score)) }));
  const total = Math.round(dims.reduce((a, d) => a + d.score, 0) / dims.length);
  return {
    total,
    dimensions: dims,
    highlight:
      completion < 1
        ? "已完成的部位做得很认真，腮红和眉形的方向都对了。"
        : "腮红斜向外上方晕染，很好地修饰了脸型，整体温柔又有精神。",
    improve:
      completion < 1
        ? "还有部位没有完成，未完成的部分不计入评分；下次可以从中断处继续。"
        : "唇缘左侧可以用棉签再修一下；下次眼尾的深色可以再晕开一点。",
    engine: opts.fallback ? "本机规则（参考）" : "qwen-vl（模拟）",
    fallback: opts.fallback,
    capturedAt: Date.now(),
  };
}
