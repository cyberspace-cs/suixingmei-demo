import type { FaceShape, PartKey } from "./types";

/** 所有人脸图在演示中统一为 3:4，坐标系 768 × 1024 */
export const FACE_W = 768;
export const FACE_H = 1024;

export type LandmarkKey =
  | "browLTail" | "browLPeak" | "browLHead" | "browRHead" | "browRPeak" | "browRTail"
  | "eyeLOuter" | "eyeL" | "eyeLInner" | "eyeLLower" | "eyeRInner" | "eyeR" | "eyeROuter"
  | "nose" | "noseBridge"
  | "lipLeft" | "lipRight" | "lipTop" | "lipBottom" | "lipCenter" | "lipPeakL" | "lipPeakR"
  | "cheekL" | "cheekR" | "jawL" | "jawR" | "chin" | "earL" | "earR" | "templeL" | "templeR" | "forehead";

export type Pt = { x: number; y: number };
export type Landmarks = Record<LandmarkKey, Pt>;
export type LandmarkSetId = "user" | "ref-peach" | "generic";

const USER: Landmarks = {
  browLTail: { x: 300, y: 400 },
  browLPeak: { x: 355, y: 386 },
  browLHead: { x: 412, y: 396 },
  browRHead: { x: 498, y: 394 },
  browRPeak: { x: 552, y: 386 },
  browRTail: { x: 606, y: 402 },
  eyeLOuter: { x: 328, y: 462 },
  eyeL: { x: 370, y: 462 },
  eyeLInner: { x: 408, y: 468 },
  eyeLLower: { x: 385, y: 484 },
  eyeRInner: { x: 518, y: 470 },
  eyeR: { x: 550, y: 466 },
  eyeROuter: { x: 592, y: 462 },
  nose: { x: 470, y: 568 },
  noseBridge: { x: 470, y: 495 },
  lipLeft: { x: 392, y: 656 },
  lipRight: { x: 522, y: 656 },
  lipTop: { x: 456, y: 636 },
  lipBottom: { x: 456, y: 690 },
  lipCenter: { x: 456, y: 662 },
  lipPeakL: { x: 432, y: 634 },
  lipPeakR: { x: 482, y: 634 },
  cheekL: { x: 330, y: 552 },
  cheekR: { x: 592, y: 552 },
  jawL: { x: 290, y: 690 },
  jawR: { x: 628, y: 690 },
  chin: { x: 458, y: 770 },
  earL: { x: 248, y: 565 },
  earR: { x: 658, y: 560 },
  templeL: { x: 268, y: 440 },
  templeR: { x: 650, y: 440 },
  forehead: { x: 465, y: 300 },
};

const REF_PEACH: Landmarks = {
  browLTail: { x: 380, y: 300 },
  browLPeak: { x: 435, y: 288 },
  browLHead: { x: 515, y: 304 },
  browRHead: { x: 570, y: 318 },
  browRPeak: { x: 620, y: 310 },
  browRTail: { x: 675, y: 328 },
  eyeLOuter: { x: 390, y: 352 },
  eyeL: { x: 430, y: 358 },
  eyeLInner: { x: 470, y: 372 },
  eyeLLower: { x: 440, y: 384 },
  eyeRInner: { x: 578, y: 390 },
  eyeR: { x: 610, y: 392 },
  eyeROuter: { x: 650, y: 398 },
  nose: { x: 520, y: 485 },
  noseBridge: { x: 512, y: 410 },
  lipLeft: { x: 420, y: 580 },
  lipRight: { x: 560, y: 592 },
  lipTop: { x: 482, y: 560 },
  lipBottom: { x: 480, y: 628 },
  lipCenter: { x: 485, y: 592 },
  lipPeakL: { x: 460, y: 558 },
  lipPeakR: { x: 505, y: 562 },
  cheekL: { x: 350, y: 432 },
  cheekR: { x: 600, y: 470 },
  jawL: { x: 310, y: 600 },
  jawR: { x: 640, y: 620 },
  chin: { x: 430, y: 672 },
  earL: { x: 222, y: 432 },
  earR: { x: 680, y: 452 },
  templeL: { x: 285, y: 312 },
  templeR: { x: 668, y: 352 },
  forehead: { x: 510, y: 180 },
};

function shift(l: Landmarks, dx: number, dy: number): Landmarks {
  const out = {} as Landmarks;
  for (const k of Object.keys(l) as LandmarkKey[]) out[k] = { x: l[k].x + dx, y: l[k].y + dy };
  return out;
}

export const LANDMARKS: Record<LandmarkSetId, Landmarks> = {
  user: USER,
  "ref-peach": REF_PEACH,
  generic: shift(USER, -74, -40),
};

export const PART_COLOR: Record<PartKey, string> = {
  base: "#F3CDB8",
  contour: "#9B7A66",
  brow: "#6B5346",
  eyeshadow: "#D58F7E",
  eyeliner: "#3B2C2A",
  lashes: "#2B2230",
  blush: "#EE8F98",
  lip: "#C9606F",
};

export type ShapeKind = "fill" | "stroke";

export interface ZoneShape {
  d?: string;
  ellipse?: { cx: number; cy: number; rx: number; ry: number; rotate: number };
  kind: ShapeKind;
  width?: number;
}

const p = (pt: Pt) => `${pt.x} ${pt.y}`;
const mirrorX = (L: Landmarks, x: number) => {
  const axis = (L.eyeLInner.x + L.eyeRInner.x) / 2;
  return axis * 2 - x;
};

function browPath(L: Landmarks, side: "L" | "R", variant: "adapted" | "reference", shape: FaceShape): string {
  const head = side === "L" ? L.browLHead : L.browRHead;
  const peak = side === "L" ? L.browLPeak : L.browRPeak;
  const tail = side === "L" ? L.browLTail : L.browRTail;
  const out = side === "L" ? -1 : 1;
  if (variant === "reference") {
    const ext = { x: tail.x + out * 14, y: head.y + 2 };
    const mid = { x: (head.x + ext.x) / 2, y: head.y - 4 };
    return `M ${p(head)} Q ${p(mid)} ${p(ext)}`;
  }
  const lift = shape === "long" ? 0 : shape === "round" ? 6 : 3;
  const shorten = shape === "round" ? 10 : 2;
  const peak2 = { x: peak.x, y: peak.y - lift };
  const tail2 = { x: tail.x - out * shorten, y: tail.y - (shape === "round" ? 4 : 0) };
  return `M ${p(head)} Q ${p(peak2)} ${p(tail2)}`;
}

function eyeLid(L: Landmarks, side: "L" | "R", wing: number): string {
  const inner = side === "L" ? L.eyeLInner : L.eyeRInner;
  const outer = side === "L" ? L.eyeLOuter : L.eyeROuter;
  const c = side === "L" ? L.eyeL : L.eyeR;
  const out = side === "L" ? -1 : 1;
  const tip = { x: outer.x + out * wing, y: outer.y - 10 - wing * 0.6 };
  return `M ${p(inner)} Q ${c.x} ${c.y - 44} ${p(tip)} Q ${outer.x} ${outer.y - 2} ${p(outer)} Q ${c.x} ${c.y - 14} ${p(inner)} Z`;
}

function liner(L: Landmarks, side: "L" | "R", lift: number): string {
  const inner = side === "L" ? L.eyeLInner : L.eyeRInner;
  const outer = side === "L" ? L.eyeLOuter : L.eyeROuter;
  const c = side === "L" ? L.eyeL : L.eyeR;
  const out = side === "L" ? -1 : 1;
  return `M ${p(inner)} Q ${c.x} ${c.y - 16} ${p(outer)} L ${outer.x + out * 16} ${outer.y - lift}`;
}

function lashes(L: Landmarks, side: "L" | "R"): string {
  const inner = side === "L" ? L.eyeLInner : L.eyeRInner;
  const outer = side === "L" ? L.eyeLOuter : L.eyeROuter;
  const c = side === "L" ? L.eyeL : L.eyeR;
  const out = side === "L" ? -1 : 1;
  let d = "";
  for (let i = 1; i <= 6; i++) {
    const t = i / 7;
    const x = inner.x + (outer.x - inner.x) * t;
    const y = inner.y + (outer.y - inner.y) * t - Math.sin(Math.PI * t) * 12 - 2;
    d += `M ${x} ${y} l ${out * (3 + t * 6)} -${10 + Math.sin(Math.PI * t) * 4} `;
  }
  void c;
  return d;
}

function blushEllipse(L: Landmarks, side: "L" | "R", variant: "adapted" | "reference", shape: FaceShape) {
  const ch = side === "L" ? L.cheekL : L.cheekR;
  const out = side === "L" ? -1 : 1;
  if (variant === "reference") return { cx: ch.x - out * 6, cy: ch.y + 6, rx: 40, ry: 30, rotate: 0 };
  switch (shape) {
    case "round":
      return { cx: ch.x + out * 4, cy: ch.y - 14, rx: 50, ry: 22, rotate: side === "L" ? 26 : -26 };
    case "long":
      return { cx: ch.x, cy: ch.y + 4, rx: 54, ry: 24, rotate: 0 };
    case "square":
      return { cx: ch.x + out * 2, cy: ch.y - 6, rx: 52, ry: 20, rotate: side === "L" ? 18 : -18 };
    case "heart":
      return { cx: ch.x - out * 6, cy: ch.y + 16, rx: 44, ry: 24, rotate: 0 };
    default:
      return { cx: ch.x, cy: ch.y, rx: 36, ry: 26, rotate: side === "L" ? 8 : -8 };
  }
}

function lipPath(L: Landmarks, variant: "adapted" | "reference"): string {
  const { lipLeft: a, lipRight: b, lipTop: t, lipBottom: bt, lipCenter: c, lipPeakL: pl, lipPeakR: pr } = L;
  if (variant === "reference") {
    return `M ${p(a)} L ${pl.x} ${t.y - 6} L ${c.x} ${t.y + 3} L ${pr.x} ${t.y - 6} L ${p(b)} Q ${c.x} ${bt.y + 8} ${p(a)} Z`;
  }
  return `M ${p(a)} Q ${pl.x - 12} ${t.y - 4} ${p(pl)} Q ${c.x} ${t.y + 6} ${p(pr)} Q ${pr.x + 12} ${t.y - 4} ${p(b)} Q ${c.x} ${bt.y + 12} ${p(a)} Z`;
}

function contourPath(L: Landmarks, side: "L" | "R", variant: "adapted" | "reference", shape: FaceShape): string {
  const ear = side === "L" ? L.earL : L.earR;
  const jaw = side === "L" ? L.jawL : L.jawR;
  const lip = side === "L" ? L.lipLeft : L.lipRight;
  const out = side === "L" ? -1 : 1;
  if (variant === "reference") {
    return `M ${jaw.x - out * 6} ${jaw.y + 10} Q ${jaw.x - out * 24} ${L.chin.y - 10} ${L.chin.x + out * 42} ${L.chin.y - 2}`;
  }
  if (shape === "long") {
    const t = side === "L" ? L.templeL : L.templeR;
    return `M ${t.x - out * 4} ${t.y - 90} Q ${t.x - out * 10} ${t.y - 40} ${t.x} ${t.y}`;
  }
  if (shape === "heart") {
    const t = side === "L" ? L.templeL : L.templeR;
    return `M ${t.x + out * 6} ${t.y - 110} Q ${t.x - out * 4} ${t.y - 60} ${t.x + out * 2} ${t.y - 10}`;
  }
  return `M ${ear.x - out * 2} ${ear.y + 14} Q ${jaw.x - out * 2} ${jaw.y - 22} ${lip.x + out * 26} ${jaw.y + 46}`;
}

function highlightPath(L: Landmarks): string {
  const nb = L.noseBridge;
  const bl = L.browLPeak;
  const br = L.browRPeak;
  return [
    `M ${nb.x} ${nb.y - 50} L ${nb.x} ${nb.y + 22}`,
    `M ${bl.x - 22} ${bl.y - 18} Q ${bl.x} ${bl.y - 26} ${bl.x + 22} ${bl.y - 18}`,
    `M ${br.x - 22} ${br.y - 18} Q ${br.x} ${br.y - 26} ${br.x + 22} ${br.y - 18}`,
    `M ${L.cheekL.x - 18} ${L.cheekL.y - 46} Q ${L.cheekL.x} ${L.cheekL.y - 56} ${L.cheekL.x + 18} ${L.cheekL.y - 50}`,
    `M ${L.cheekR.x - 18} ${L.cheekR.y - 50} Q ${L.cheekR.x} ${L.cheekR.y - 56} ${L.cheekR.x + 18} ${L.cheekR.y - 46}`,
  ].join(" ");
}

function faceOval(L: Landmarks): string {
  const cx = (L.jawL.x + L.jawR.x) / 2;
  const top = L.forehead.y + 40;
  return `M ${cx} ${top} C ${L.templeR.x + 10} ${top} ${L.templeR.x + 4} ${L.jawR.y - 60} ${L.jawR.x - 8} ${L.jawR.y} Q ${cx + 70} ${L.chin.y + 4} ${cx} ${L.chin.y - 6} Q ${cx - 70} ${L.chin.y + 4} ${L.jawL.x + 8} ${L.jawL.y} C ${L.templeL.x - 4} ${L.jawL.y - 60} ${L.templeL.x - 10} ${top} ${cx} ${top} Z`;
}

export function zonesFor(
  part: PartKey,
  L: Landmarks,
  variant: "adapted" | "reference",
  shape: FaceShape,
): ZoneShape[] {
  switch (part) {
    case "base":
      return [{ d: faceOval(L), kind: "fill" }];
    case "contour":
      return [
        { d: contourPath(L, "L", variant, shape), kind: "stroke", width: 26 },
        { d: contourPath(L, "R", variant, shape), kind: "stroke", width: 26 },
        ...(variant === "adapted" ? [{ d: highlightPath(L), kind: "stroke" as const, width: 8 }] : []),
      ];
    case "brow":
      return [
        { d: browPath(L, "L", variant, shape), kind: "stroke", width: 15 },
        { d: browPath(L, "R", variant, shape), kind: "stroke", width: 15 },
      ];
    case "eyeshadow": {
      const wing = variant === "adapted" && shape === "round" ? 20 : 6;
      return [
        { d: eyeLid(L, "L", wing), kind: "fill" },
        { d: eyeLid(L, "R", wing), kind: "fill" },
      ];
    }
    case "eyeliner": {
      const lift = variant === "adapted" && shape === "round" ? 10 : 2;
      return [
        { d: liner(L, "L", lift), kind: "stroke", width: 5 },
        { d: liner(L, "R", lift), kind: "stroke", width: 5 },
      ];
    }
    case "lashes":
      return [
        { d: lashes(L, "L"), kind: "stroke", width: 3 },
        { d: lashes(L, "R"), kind: "stroke", width: 3 },
      ];
    case "blush":
      return [
        { ellipse: blushEllipse(L, "L", variant, shape), kind: "fill" },
        { ellipse: blushEllipse(L, "R", variant, shape), kind: "fill" },
      ];
    case "lip":
      return [{ d: lipPath(L, variant), kind: "fill" }];
  }
}

/** 把视图聚焦到某个部位，返回 viewBox */
export function focusBox(part: PartKey | "face", L: Landmarks, aspect = 3 / 4): string {
  let cx = L.nose.x;
  let cy = L.nose.y - 20;
  let w = 520;
  switch (part) {
    case "brow":
    case "eyeshadow":
    case "eyeliner":
    case "lashes":
      cx = (L.eyeL.x + L.eyeR.x) / 2;
      cy = (L.browLPeak.y + L.eyeL.y) / 2 + 4;
      w = 340;
      break;
    case "lip":
      cx = L.lipCenter.x;
      cy = L.lipCenter.y;
      w = 260;
      break;
    case "blush":
    case "contour":
    case "base":
      cx = L.nose.x;
      cy = L.nose.y;
      w = 440;
      break;
  }
  const h = w / aspect;
  const x = Math.max(0, Math.min(FACE_W - w, cx - w / 2));
  const y = Math.max(0, Math.min(FACE_H - h, cy - h / 2));
  return `${Math.round(x)} ${Math.round(y)} ${Math.round(w)} ${Math.round(h)}`;
}

export function mirrorPoint(L: Landmarks, k: LandmarkKey): Pt {
  return { x: mirrorX(L, L[k].x), y: L[k].y };
}

/** 用关键点近似 68 点，用于分析动画 */
export function scanPoints(L: Landmarks): Pt[] {
  const pts: Pt[] = [];
  const lerp = (a: Pt, b: Pt, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const chain = (arr: Pt[], n: number) => {
    for (let i = 0; i < arr.length - 1; i++) for (let j = 0; j < n; j++) pts.push(lerp(arr[i], arr[i + 1], j / n));
    pts.push(arr[arr.length - 1]);
  };
  chain([L.earL, L.jawL, { x: (L.jawL.x + L.chin.x) / 2, y: L.chin.y - 20 }, L.chin, { x: (L.jawR.x + L.chin.x) / 2, y: L.chin.y - 20 }, L.jawR, L.earR], 3);
  chain([L.browLTail, L.browLPeak, L.browLHead], 2);
  chain([L.browRHead, L.browRPeak, L.browRTail], 2);
  chain([L.noseBridge, L.nose], 3);
  chain([L.eyeLOuter, { x: L.eyeL.x, y: L.eyeL.y - 10 }, L.eyeLInner, { x: L.eyeL.x, y: L.eyeL.y + 9 }, L.eyeLOuter], 1);
  chain([L.eyeRInner, { x: L.eyeR.x, y: L.eyeR.y - 10 }, L.eyeROuter, { x: L.eyeR.x, y: L.eyeR.y + 9 }, L.eyeRInner], 1);
  chain([L.lipLeft, L.lipPeakL, L.lipTop, L.lipPeakR, L.lipRight, L.lipBottom, L.lipLeft], 1);
  return pts;
}
