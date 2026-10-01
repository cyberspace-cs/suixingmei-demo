export type PartKey =
  | "base"
  | "contour"
  | "brow"
  | "eyeshadow"
  | "eyeliner"
  | "lashes"
  | "blush"
  | "lip";

export type LookId = "peach" | "guofeng" | "milktea" | "cool";

export type FaceShape = "round" | "oval" | "long" | "square" | "heart";

export interface Swatch {
  name: string;
  hex: string;
}

/** F1 · 妆面解析输出（对应 code-plan M1） */
export interface MakeupAnalysis {
  lookId: LookId;
  lookName: string;
  style: string;
  styleLabel: string;
  primaryColor: string;
  accentColors: string[];
  palette: Swatch[];
  techniques: string[];
  regions: PartKey[];
  difficulty: number;
  modelFaceShape: FaceShape;
  engine: string;
  fallback?: boolean;
  capturedAt: number;
}

export interface ImageQuality {
  brightness: number;
  sharpness: number;
  ok: boolean;
  issues: string[];
}

/** F2 · 用户脸型分析输出（本机处理，对应 code-plan M2 兜底） */
export interface FaceAnalysis {
  faceShape: FaceShape;
  faceShapeLabel: string;
  summary: string;
  thirds: [number, number, number];
  fiveEyes: string;
  cheekbone: string;
  jaw: string;
  quality: ImageQuality;
  engine: string;
}

export interface Adjustment {
  part: PartKey;
  reference: string;
  forYou: string;
}

/** F3 · 适配引擎输出（对应 code-plan M3） */
export interface AdaptResult {
  engine: string;
  adjustments: Adjustment[];
  fallback?: boolean;
}

export interface SubStep {
  id: string;
  title: string;
  instruction: string;
  adapted?: string;
  durationS: number;
}

export interface PartPlan {
  key: PartKey;
  label: string;
  enLabel: string;
  tool: string;
  shade?: string;
  included: boolean;
  steps: SubStep[];
}

export type CheckStatus = "good" | "improve";

export interface CheckItem {
  type: "good" | "improve";
  text: string;
  marker?: { x: number; y: number };
}

/** F5 · 帮我看看输出（对应 code-plan M6） */
export interface CheckResult {
  status: CheckStatus;
  summary: string;
  items: CheckItem[];
  engine: string;
  fallback?: boolean;
}

export interface CheckRecord extends CheckResult {
  id: string;
  landmarkSet: "user" | "ref-peach" | "generic";
  part: PartKey;
  stepId: string;
  stepTitle: string;
  image: string;
  createdAt: number;
}

export interface ScoreDimension {
  key: string;
  label: string;
  score: number;
  note: string;
}

/** F6 · 妆后打分输出（对应 code-plan M7） */
export interface ScoreResult {
  total: number;
  dimensions: ScoreDimension[];
  highlight: string;
  improve: string;
  engine: string;
  fallback?: boolean;
  capturedAt: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  via: "voice" | "text" | "narration" | "system";
  createdAt: number;
}

export type SessionStatus = "draft" | "ready" | "following" | "completed";

export interface Session {
  id: string;
  lookId: LookId;
  lookName: string;
  referenceImage: string;
  referenceSample?: LookId;
  selfieImage: string;
  selfieSample: boolean;
  afterImage?: string;
  analysis?: MakeupAnalysis;
  face?: FaceAnalysis;
  adapt?: AdaptResult;
  plan: PartPlan[];
  tools: string[];
  status: SessionStatus;
  progress: { partIndex: number; stepIndex: number; done: string[] };
  checks: CheckRecord[];
  chat: ChatMessage[];
  score?: ScoreResult;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  elapsedS: number;
}

export interface SavedLook {
  id: string;
  sessionId?: string;
  lookId: LookId;
  lookName: string;
  styleLabel: string;
  referenceImage: string;
  afterImage?: string;
  score?: number;
  savedAt: number;
}

export type DemoScenario = "normal" | "analysis-timeout" | "selfie-bad" | "camera-denied" | "vision-timeout";
