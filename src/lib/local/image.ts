import type { FaceShape, ImageQuality, PartKey } from "../types";
import type { ColorHint } from "../engine";
import { FACE_H, FACE_W, revealLayers, type Landmarks, type RevealLayer } from "../face-geometry";

export const MAX_UPLOAD_MB = 15;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = src;
  });
}

export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}

/** 居中裁成 3:4 并压缩，演示中所有人脸图统一到同一坐标系 */
export async function normalizePortrait(src: string, width = 480, quality = 0.84): Promise<string> {
  const img = await loadImage(src);
  const height = Math.round((width * 4) / 3);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const targetRatio = 3 / 4;
  const ratio = img.naturalWidth / img.naturalHeight;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (ratio > targetRatio) sw = sh * targetRatio;
  else sh = sw / targetRatio;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

function sample(img: CanvasImageSource, w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}

/** 本机质检：亮度 + 拉普拉斯方差（清晰度），对应 PRD F5 "光线 / 清晰度" 快速检查 */
export async function analyzeQuality(src: string): Promise<ImageQuality> {
  const img = await loadImage(src);
  const w = 96;
  const h = 128;
  const data = sample(img, w, h);
  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) {
    const g = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    gray[i] = g;
    sum += g;
  }
  const brightness = sum / (w * h);
  let lapSum = 0;
  let lapSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      lapSum += lap;
      lapSq += lap * lap;
      n++;
    }
  }
  const mean = lapSum / n;
  const sharpness = lapSq / n - mean * mean;
  const issues: string[] = [];
  if (brightness < 62) issues.push("光线偏暗，靠近窗边或打开台灯再拍");
  if (brightness > 232) issues.push("画面过曝，避开直射光源");
  if (sharpness < 18) issues.push("画面有些模糊，或开启了美颜，建议关闭美颜重拍");
  return {
    brightness: Math.round(brightness),
    sharpness: Math.round(sharpness),
    ok: issues.length === 0,
    issues,
  };
}

/** 取画面中央区域的平均色相，供 mock 妆型识别使用 */
export async function colorHint(src: string): Promise<ColorHint> {
  const img = await loadImage(src);
  const w = 48;
  const h = 64;
  const data = sample(img, w, h);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  let satSum = 0;
  let hx = 0;
  let hy = 0;
  for (let y = Math.floor(h * 0.35); y < Math.floor(h * 0.75); y++) {
    for (let x = Math.floor(w * 0.25); x < Math.floor(w * 0.75); x++) {
      const i = (y * w + x) * 4;
      const R = data[i] / 255;
      const G = data[i + 1] / 255;
      const B = data[i + 2] / 255;
      const max = Math.max(R, G, B);
      const min = Math.min(R, G, B);
      const l = (max + min) / 2;
      const d = max - min;
      const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
      let hue = 0;
      if (d !== 0) {
        if (max === R) hue = ((G - B) / d) % 6;
        else if (max === G) hue = (B - R) / d + 2;
        else hue = (R - G) / d + 4;
        hue *= 60;
        if (hue < 0) hue += 360;
      }
      hx += Math.cos((hue * Math.PI) / 180) * s;
      hy += Math.sin((hue * Math.PI) / 180) * s;
      satSum += s;
      r += R;
      g += G;
      b += B;
      n++;
    }
  }
  let hue = (Math.atan2(hy, hx) * 180) / Math.PI;
  if (hue < 0) hue += 360;
  const lightness = (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / n;
  return { hue: Math.round(hue), saturation: satSum / n, lightness };
}

export function seedFrom(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += Math.max(1, Math.floor(text.length / 400))) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function revealMask(width: number, height: number, layers: RevealLayer[]) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const k = width / FACE_W;
  ctx.scale(k, height / FACE_H);
  ctx.filter = `blur(${Math.max(2, 9 * k)}px)`;
  for (const l of layers) {
    ctx.save();
    ctx.globalAlpha = l.alpha;
    ctx.globalCompositeOperation = l.mode === "show" ? "source-over" : "destination-out";
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#fff";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const s = l.shape;
    if (s.ellipse) {
      const e = s.ellipse;
      ctx.beginPath();
      ctx.ellipse(e.cx, e.cy, e.rx * 1.08, e.ry * 1.08, (e.rotate * Math.PI) / 180, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.d) {
      const path = new Path2D(s.d);
      if (s.kind === "fill") {
        ctx.fill(path);
        if (l.part !== "base") {
          ctx.lineWidth = 14;
          ctx.stroke(path);
        }
      } else {
        ctx.lineWidth = (s.width ?? 8) * l.grow;
        ctx.stroke(path);
      }
    }
    ctx.restore();
  }
  return canvas;
}

/** 从 <video> 或演示画面截取一帧（演示画面 = 妆前图 + 已完成部位的妆后效果） */
export async function captureFrame(opts: {
  video?: HTMLVideoElement | null;
  bare?: string;
  after?: string;
  afterOpacity?: number;
  reveal?: { parts: PartKey[]; landmarks: Landmarks; shape: FaceShape };
  mirrored?: boolean;
  width?: number;
}): Promise<string> {
  const width = opts.width ?? 480;
  const height = Math.round((width * 4) / 3);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  if (opts.video && opts.video.videoWidth) {
    const v = opts.video;
    const ratio = v.videoWidth / v.videoHeight;
    let sw = v.videoWidth;
    let sh = v.videoHeight;
    if (ratio > 3 / 4) sw = sh * 0.75;
    else sh = sw / 0.75;
    if (opts.mirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, (v.videoWidth - sw) / 2, (v.videoHeight - sh) / 2, sw, sh, 0, 0, width, height);
  } else if (opts.bare) {
    const bare = await loadImage(opts.bare);
    ctx.drawImage(bare, 0, 0, width, height);
    if (opts.after && opts.reveal) {
      const after = await loadImage(opts.after);
      const layer = document.createElement("canvas");
      layer.width = width;
      layer.height = height;
      const lctx = layer.getContext("2d")!;
      lctx.drawImage(after, 0, 0, width, height);
      lctx.globalCompositeOperation = "destination-in";
      lctx.drawImage(revealMask(width, height, revealLayers(opts.reveal.parts, opts.reveal.landmarks, opts.reveal.shape)), 0, 0);
      ctx.drawImage(layer, 0, 0);
    } else if (opts.after && (opts.afterOpacity ?? 0) > 0) {
      const after = await loadImage(opts.after);
      ctx.globalAlpha = opts.afterOpacity ?? 0;
      ctx.drawImage(after, 0, 0, width, height);
      ctx.globalAlpha = 1;
    }
  }
  return canvas.toDataURL("image/jpeg", 0.82);
}
