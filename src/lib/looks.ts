import type { Adjustment, FaceShape, LookId, PartKey, PartPlan, Swatch } from "./types";
import type { LandmarkKey } from "./face-geometry";

interface StepTemplate {
  id: string;
  title: string;
  instruction: string;
  /** 用户没有这一部位的推荐工具时的替代做法 */
  noTool?: string;
  durationS: number;
  focus: LandmarkKey;
}

interface PartTemplate {
  key: PartKey;
  label: string;
  enLabel: string;
  tool: string;
  altTool: string;
  /** 适配说明挂在哪一个小步上 */
  adaptStep: number;
  steps: StepTemplate[];
}

export const PART_ORDER: PartKey[] = [
  "base",
  "contour",
  "brow",
  "eyeshadow",
  "eyeliner",
  "lashes",
  "blush",
  "lip",
];

export const PARTS: Record<PartKey, PartTemplate> = {
  base: {
    key: "base",
    label: "底妆",
    enLabel: "Foundation",
    tool: "气垫",
    altTool: "粉底液",
    adaptStep: 0,
    steps: [
      {
        id: "base-1",
        title: "少量多次点拍",
        instruction: "粉扑轻按一次气垫，先点在额头、两颊、下巴五个点，再由内向外轻拍开。",
        noTool: "挤黄豆大小的粉底液在手背，用指腹点在五个位置，由内向外轻拍开。",
        durationS: 60,
        focus: "cheekL",
      },
      {
        id: "base-2",
        title: "局部遮瑕",
        instruction: "用粉扑边角在鼻翼、嘴角等泛红处再轻按一层，不要来回擦。",
        durationS: 40,
        focus: "nose",
      },
    ],
  },
  contour: {
    key: "contour",
    label: "修容/高光",
    enLabel: "Contour",
    tool: "修容盘",
    altTool: "深一号粉底",
    adaptStep: 0,
    steps: [
      {
        id: "contour-1",
        title: "下颌修容",
        instruction: "从耳下约 1 厘米处起笔，沿下颌线向前扫，到嘴角正下方停住。",
        noTool: "用深一号的粉底在下颌线薄薄点开，再用指腹向下晕染。",
        durationS: 45,
        focus: "jawL",
      },
      {
        id: "contour-2",
        title: "高光提亮",
        instruction: "在眉骨、鼻梁上半段和颧骨最高点轻扫高光，鼻梁高光不要拉太长。",
        durationS: 35,
        focus: "noseBridge",
      },
    ],
  },
  brow: {
    key: "brow",
    label: "眉毛",
    enLabel: "Brows",
    tool: "眉笔",
    altTool: "眉粉",
    adaptStep: 1,
    steps: [
      {
        id: "brow-1",
        title: "勾勒眉形",
        instruction: "先找三个点：眉头对准鼻翼，眉峰在黑眼球外缘上方，眉尾落在鼻翼与眼尾的连线上。轻描出上下边缘。",
        durationS: 60,
        focus: "browLPeak",
      },
      {
        id: "brow-2",
        title: "填补眉尾",
        instruction: "沿眉尾方向少量补色，轻轻连接眉峰。笔触短而轻，宁淡勿浓。",
        durationS: 45,
        focus: "browLTail",
      },
      {
        id: "brow-3",
        title: "柔化眉头",
        instruction: "用眉刷从下往上轻扫眉头，让颜色自然过渡：眉头最淡，眉尾最清晰。",
        durationS: 30,
        focus: "browLHead",
      },
    ],
  },
  eyeshadow: {
    key: "eyeshadow",
    label: "眼影",
    enLabel: "Eyeshadow",
    tool: "眼影盘",
    altTool: "指腹",
    adaptStep: 1,
    steps: [
      {
        id: "eye-1",
        title: "大面积打底",
        instruction: "取最浅的颜色，用指腹在整个上眼皮轻点开，范围到眼窝凹陷处。",
        durationS: 40,
        focus: "eyeL",
      },
      {
        id: "eye-2",
        title: "加深眼尾",
        instruction: "用小刷子蘸深色，从眼尾向内晕染到眼睛三分之一处，边缘来回轻扫到看不出分界。",
        noTool: "用无名指指腹蘸深色，从眼尾向内轻拍到三分之一处，再用干净指腹推开边缘。",
        durationS: 60,
        focus: "eyeLOuter",
      },
      {
        id: "eye-3",
        title: "卧蚕提亮",
        instruction: "用带珠光的浅色点在下眼睑前三分之一，眼睛会更有神。",
        durationS: 25,
        focus: "eyeLLower",
      },
    ],
  },
  eyeliner: {
    key: "eyeliner",
    label: "眼线",
    enLabel: "Eyeliner",
    tool: "眼线笔",
    altTool: "深色眼影",
    adaptStep: 1,
    steps: [
      {
        id: "liner-1",
        title: "填补睫毛根部",
        instruction: "轻轻抬起上眼皮，用眼线笔在睫毛根部小段小段点填，不要一笔拉完。",
        durationS: 50,
        focus: "eyeL",
      },
      {
        id: "liner-2",
        title: "眼尾微扬",
        instruction: "眼尾顺着下眼睑的延长线向外画一小段，收尾要细。",
        durationS: 40,
        focus: "eyeLOuter",
      },
    ],
  },
  lashes: {
    key: "lashes",
    label: "睫毛",
    enLabel: "Lashes",
    tool: "睫毛膏",
    altTool: "睫毛夹",
    adaptStep: 0,
    steps: [
      {
        id: "lash-1",
        title: "分段夹翘",
        instruction: "睫毛夹从根部、中段、尾端分三次夹，每次停留 2 秒。",
        durationS: 30,
        focus: "eyeL",
      },
      {
        id: "lash-2",
        title: "Z 字刷睫毛膏",
        instruction: "刷头横放，从根部以 Z 字形向上提拉；下睫毛用刷头尖端轻扫。",
        durationS: 45,
        focus: "eyeLOuter",
      },
    ],
  },
  blush: {
    key: "blush",
    label: "腮红",
    enLabel: "Blush",
    tool: "腮红刷",
    altTool: "指腹",
    adaptStep: 0,
    steps: [
      {
        id: "blush-1",
        title: "找到起点",
        instruction: "微笑找到苹果肌最高点，再往外上方移一指宽，这里就是你的腮红起点。",
        durationS: 25,
        focus: "cheekL",
      },
      {
        id: "blush-2",
        title: "斜向晕染",
        instruction: "刷子蘸取后先在手背掸掉余粉，朝耳朵上缘方向斜向轻扫三次，边缘不要有分界线。",
        noTool: "指腹蘸少量腮红，在起点轻拍后朝耳朵上缘方向斜着推开，边缘多拍几下。",
        durationS: 40,
        focus: "cheekL",
      },
    ],
  },
  lip: {
    key: "lip",
    label: "唇妆",
    enLabel: "Lips",
    tool: "口红",
    altTool: "唇釉",
    adaptStep: 2,
    steps: [
      {
        id: "lip-1",
        title: "润唇打底",
        instruction: "薄涂一层润唇膏，等 30 秒吸收，唇纹会更平滑。",
        durationS: 30,
        focus: "lipCenter",
      },
      {
        id: "lip-2",
        title: "点涂唇中",
        instruction: "口红点在上下唇中央，用指腹向两侧轻拍晕开，做出自然的咬唇感。",
        durationS: 40,
        focus: "lipCenter",
      },
      {
        id: "lip-3",
        title: "修饰唇缘",
        instruction: "用棉签沿唇线轻擦溢出的颜色，两侧唇角收干净。",
        durationS: 35,
        focus: "lipLeft",
      },
    ],
  },
};

export interface LookPreset {
  id: LookId;
  name: string;
  style: string;
  styleLabel: string;
  palette: Swatch[];
  techniques: string[];
  difficulty: number;
  modelFaceShape: FaceShape;
  referenceImage: string;
  defaultParts: PartKey[];
  shades: Partial<Record<PartKey, string>>;
  tagline: string;
}

export const LOOKS: Record<LookId, LookPreset> = {
  peach: {
    id: "peach",
    name: "温柔蜜桃妆",
    style: "daily-soft",
    styleLabel: "日常 · 温柔",
    palette: [
      { name: "蜜桃粉", hex: "#F1B5A6" },
      { name: "奶茶棕", hex: "#B98A72" },
      { name: "玫瑰豆沙", hex: "#C47684" },
    ],
    techniques: ["苹果肌腮红", "眼尾晕染", "咬唇点涂"],
    difficulty: 0.42,
    modelFaceShape: "oval",
    referenceImage: "/images/ref-peach.jpg",
    defaultParts: ["base", "brow", "eyeshadow", "blush", "lip"],
    shades: {
      base: "自然色",
      contour: "浅灰棕",
      brow: "灰棕色",
      eyeshadow: "蜜桃 + 奶茶棕",
      eyeliner: "深棕",
      lashes: "自然黑",
      blush: "蜜桃粉",
      lip: "玫瑰豆沙",
    },
    tagline: "清透底妆配蜜桃色眼颊，温柔有气色",
  },
  guofeng: {
    id: "guofeng",
    name: "朱砂国风妆",
    style: "guofeng",
    styleLabel: "国风 · 浓郁",
    palette: [
      { name: "朱砂红", hex: "#B8322C" },
      { name: "胭脂粉", hex: "#E39A8E" },
      { name: "鎏金棕", hex: "#B58A4C" },
    ],
    techniques: ["上扬红眼尾", "花钿点缀", "饱满朱唇"],
    difficulty: 0.78,
    modelFaceShape: "long",
    referenceImage: "/images/ref-guofeng.jpg",
    defaultParts: ["base", "brow", "eyeshadow", "eyeliner", "blush", "lip"],
    shades: {
      base: "冷白瓷",
      brow: "深棕",
      eyeshadow: "朱砂红 + 鎏金",
      eyeliner: "酒红",
      blush: "胭脂粉",
      lip: "朱砂红",
      contour: "灰棕",
      lashes: "浓黑",
    },
    tagline: "红金眼尾与朱唇，适合节日和拍照",
  },
  milktea: {
    id: "milktea",
    name: "奶茶通勤妆",
    style: "daily-commute",
    styleLabel: "日常 · 通勤",
    palette: [
      { name: "奶茶", hex: "#C9A288" },
      { name: "焦糖", hex: "#9C6B4E" },
      { name: "裸杏", hex: "#D8A890" },
    ],
    techniques: ["大地色眼影", "细眼线", "裸色唇"],
    difficulty: 0.35,
    modelFaceShape: "oval",
    referenceImage: "/images/ref-milktea.jpg",
    defaultParts: ["base", "brow", "eyeshadow", "eyeliner", "lip"],
    shades: {
      base: "自然色",
      brow: "浅棕",
      eyeshadow: "奶茶 + 焦糖",
      eyeliner: "棕色",
      blush: "裸杏",
      lip: "裸杏",
      contour: "浅灰棕",
      lashes: "棕黑",
    },
    tagline: "十分钟搞定的干净通勤妆",
  },
  cool: {
    id: "cool",
    name: "清冷感妆",
    style: "cool-serene",
    styleLabel: "清冷 · 冷调",
    palette: [
      { name: "灰紫", hex: "#A08AA8" },
      { name: "雾霾玫瑰", hex: "#B57B86" },
      { name: "冷棕", hex: "#7E6A66" },
    ],
    techniques: ["平直眉", "冷调眼影", "雾面唇"],
    difficulty: 0.55,
    modelFaceShape: "heart",
    referenceImage: "/images/ref-cool.jpg",
    defaultParts: ["base", "brow", "eyeshadow", "blush", "lip"],
    shades: {
      base: "冷调自然",
      brow: "灰棕",
      eyeshadow: "灰紫 + 冷棕",
      eyeliner: "深灰",
      blush: "雾紫粉",
      lip: "雾霾玫瑰",
      contour: "灰调",
      lashes: "自然黑",
    },
    tagline: "低饱和冷调，安静又有距离感",
  },
};

export const FACE_SHAPE_LABEL: Record<FaceShape, string> = {
  round: "偏圆脸",
  oval: "鹅蛋脸",
  long: "长脸",
  square: "方圆脸",
  heart: "心形脸",
};

export const FACE_SHAPE_SUMMARY: Record<FaceShape, string> = {
  round: "腮红向外上方晕染，让轮廓更轻盈",
  oval: "比例均衡，大多数妆容可直接参考",
  long: "横向晕染腮红，缩短视觉长度",
  square: "柔化下颌棱角，线条画得更圆润",
  heart: "额角两侧轻修容，下半脸保持饱满",
};

type AdjustTable = Partial<Record<PartKey, { reference: string; forYou: string }>>;

const ADJUSTMENTS: Record<FaceShape, AdjustTable> = {
  round: {
    base: { reference: "全脸均匀铺开", forYou: "两颊外侧只少量带过，保留立体感" },
    contour: {
      reference: "模特脸较长，修容集中在下颌下半段",
      forYou: "起点上移到耳下，缩短纵向范围，只修饰两侧",
    },
    brow: {
      reference: "平直长眉，眉尾较长",
      forYou: "眉峰略抬，眉尾收短约 2 毫米，脸部线条会显得更修长",
    },
    eyeshadow: {
      reference: "眼尾圆形晕染",
      forYou: "眼尾向外上方多带出 3 毫米，拉长眼型",
    },
    eyeliner: { reference: "眼尾平拉", forYou: "眼尾微微上扬约 2 毫米" },
    blush: {
      reference: "苹果肌正中横向晕开",
      forYou: "从苹果肌外侧斜向耳朵上缘晕染，避免显得脸更圆",
    },
    lip: {
      reference: "唇峰清晰锐利",
      forYou: "唇峰画得圆润一些，和柔和的脸部线条更协调",
    },
  },
  oval: {
    brow: { reference: "参考眉形", forYou: "按参考眉形即可，眉尾自然收细" },
    blush: { reference: "苹果肌晕染", forYou: "保持原位置，范围比参考妆收小一圈" },
  },
  long: {
    contour: {
      reference: "下颌两侧修容",
      forYou: "修容改在发际线和下巴，缩短脸部纵向长度",
    },
    brow: { reference: "上扬挑眉", forYou: "画成平直一些的眉形，眉峰不要太高" },
    blush: { reference: "斜向晕染", forYou: "改为横向晕染，增加脸部横向宽度" },
  },
  square: {
    contour: { reference: "轻修下颌", forYou: "重点柔化下颌角，边缘多晕开几次" },
    brow: { reference: "有棱角的眉峰", forYou: "眉峰画圆润，避免和下颌一样有棱角" },
    blush: { reference: "圆形腮红", forYou: "斜向偏长晕染，弱化下半脸宽度" },
    lip: { reference: "方唇", forYou: "唇形画得圆润饱满" },
  },
  heart: {
    contour: { reference: "下颌修容", forYou: "只在额角两侧轻修，下巴不修容" },
    brow: { reference: "高挑眉", forYou: "眉形柔和，眉峰放在正中位置" },
    blush: { reference: "斜向腮红", forYou: "放在苹果肌偏低位置横向晕开" },
    lip: { reference: "薄唇", forYou: "下唇画得饱满一些，平衡尖下巴" },
  },
};

export function buildAdjustments(face: FaceShape, parts: PartKey[]): Adjustment[] {
  const table = ADJUSTMENTS[face];
  return parts
    .filter((p) => table[p])
    .map((p) => ({ part: p, reference: table[p]!.reference, forYou: table[p]!.forYou }));
}

export function buildPlan(
  lookId: LookId,
  adjustments: Adjustment[],
  tools: string[],
  included?: PartKey[],
): PartPlan[] {
  const look = LOOKS[lookId];
  const chosen = included ?? look.defaultParts;
  return PART_ORDER.map((key) => {
    const tpl = PARTS[key];
    const hasTool = tools.includes(tpl.tool);
    const adj = adjustments.find((a) => a.part === key);
    return {
      key,
      label: tpl.label,
      enLabel: tpl.enLabel,
      tool: hasTool ? tpl.tool : tpl.altTool,
      shade: look.shades[key],
      included: chosen.includes(key),
      steps: tpl.steps.map((s, i) => ({
        id: s.id,
        title: s.title,
        instruction: !hasTool && s.noTool ? s.noTool : s.instruction,
        adapted: adj && i === tpl.adaptStep ? adj.forYou : undefined,
        durationS: s.durationS,
      })),
    };
  });
}

export function stepFocus(part: PartKey, stepId: string): LandmarkKey {
  return PARTS[part].steps.find((s) => s.id === stepId)?.focus ?? "nose";
}

export const ALL_TOOLS = [
  "气垫",
  "粉底液",
  "遮瑕",
  "修容盘",
  "高光",
  "眉笔",
  "眉粉",
  "眼影盘",
  "眼影刷",
  "眼线笔",
  "睫毛夹",
  "睫毛膏",
  "腮红",
  "腮红刷",
  "口红",
  "唇釉",
  "棉签",
];

export const DEFAULT_TOOLS = ["气垫", "眼影盘", "腮红刷", "眉笔", "睫毛膏", "口红", "棉签"];

/** 步骤时长只计动作本身，乘 2.2 估算含取色、对镜确认在内的真实耗时 */
export function minutesOfSteps(steps: { durationS: number }[]) {
  const s = steps.reduce((a, st) => a + st.durationS, 0);
  return Math.max(1, Math.round((s * 2.2) / 60));
}

export function minutesOf(plan: PartPlan[]) {
  return minutesOfSteps(plan.filter((p) => p.included).flatMap((p) => p.steps));
}
