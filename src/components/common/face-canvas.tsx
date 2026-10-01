"use client";

import { useId } from "react";
import {
  FACE_H,
  FACE_W,
  PART_COLOR,
  revealLayers,
  scanPoints,
  zonesFor,
  type Landmarks,
  type Pt,
  type RevealLayer,
} from "@/lib/face-geometry";
import type { FaceShape, PartKey } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface ZoneSpec {
  part: PartKey;
  variant: "adapted" | "reference";
  look: "solid" | "ghost";
  dim?: boolean;
}

export interface MarkerSpec extends Pt {
  type: "good" | "improve";
  index: number;
}

export interface PinSpec extends Pt {
  label: string;
  active?: boolean;
}

function MaskShape({ layer }: { layer: RevealLayer }) {
  const color = layer.mode === "show" ? "#fff" : "#000";
  const style = layer.mode === "show" ? { animation: "reveal-in 1.1s ease both" } : undefined;
  const s = layer.shape;
  if (s.ellipse) {
    const e = s.ellipse;
    return (
      <ellipse cx={e.cx} cy={e.cy} rx={e.rx * 1.08} ry={e.ry * 1.08} transform={`rotate(${e.rotate} ${e.cx} ${e.cy})`} fill={color} opacity={layer.alpha} style={style} />
    );
  }
  if (s.kind === "fill") {
    return <path d={s.d} fill={color} stroke={color} strokeWidth={layer.part === "base" ? 0 : 14} strokeLinejoin="round" opacity={layer.alpha} style={style} />;
  }
  return <path d={s.d} fill="none" stroke={color} strokeWidth={(s.width ?? 8) * layer.grow} strokeLinecap="round" opacity={layer.alpha} style={style} />;
}

interface Props {
  src?: string;
  after?: string;
  afterOpacity?: number;
  /** 传入后改为按部位逐个显露妆后图，afterOpacity 失效 */
  reveal?: PartKey[];
  landmarks: Landmarks;
  shape: FaceShape;
  viewBox?: string;
  zones?: ZoneSpec[];
  focus?: Pt | null;
  markers?: MarkerSpec[];
  pins?: PinSpec[];
  scan?: boolean;
  preserve?: "slice" | "meet";
  className?: string;
  imageClassName?: string;
}

export function FaceCanvas({
  src,
  after,
  afterOpacity = 0,
  reveal,
  landmarks,
  shape,
  viewBox = `0 0 ${FACE_W} ${FACE_H}`,
  zones = [],
  focus,
  markers = [],
  pins = [],
  scan = false,
  preserve = "slice",
  className,
  imageClassName,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const vbW = Number(viewBox.split(" ")[2]);
  const unit = vbW / FACE_W;
  const pts = scan ? scanPoints(landmarks) : [];

  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio={`xMidYMid ${preserve}`}
      className={cn("block h-full w-full", className)}
      role="img"
    >
      <defs>
        <filter id={`soft-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={`softer-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <linearGradient id={`scan-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#c9c0f2" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {src && <image href={src} width={FACE_W} height={FACE_H} preserveAspectRatio="xMidYMid slice" className={imageClassName} />}
      {after && reveal && (
        <>
          <defs>
            <filter id={`mblur-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
            <mask id={`reveal-${uid}`} maskUnits="userSpaceOnUse" x={0} y={0} width={FACE_W} height={FACE_H}>
              <g filter={`url(#mblur-${uid})`}>
                {revealLayers(reveal, landmarks, shape).map((l, i) => (
                  <MaskShape key={`${l.part}-${l.mode}-${i}`} layer={l} />
                ))}
              </g>
            </mask>
            <style>{`@keyframes reveal-in{from{opacity:0}}`}</style>
          </defs>
          <image href={after} width={FACE_W} height={FACE_H} preserveAspectRatio="xMidYMid slice" mask={`url(#reveal-${uid})`} />
        </>
      )}
      {after && !reveal && (
        <image
          href={after}
          width={FACE_W}
          height={FACE_H}
          preserveAspectRatio="xMidYMid slice"
          opacity={afterOpacity}
          style={{ transition: "opacity 900ms ease" }}
        />
      )}

      {zones.map((z, zi) =>
        zonesFor(z.part, landmarks, z.variant, shape).map((s, si) => {
          const color = PART_COLOR[z.part];
          const key = `${zi}-${si}`;
          const opacity = z.dim ? 0.35 : 1;
          if (z.look === "ghost") {
            const common = {
              fill: "none",
              stroke: "#ffffff",
              strokeWidth: 2.2 * Math.max(unit, 0.6),
              strokeDasharray: `${7 * Math.max(unit, 0.6)} ${6 * Math.max(unit, 0.6)}`,
              strokeLinecap: "round" as const,
              opacity: 0.95 * opacity,
            };
            return s.ellipse ? (
              <ellipse key={key} {...common} cx={s.ellipse.cx} cy={s.ellipse.cy} rx={s.ellipse.rx} ry={s.ellipse.ry} transform={`rotate(${s.ellipse.rotate} ${s.ellipse.cx} ${s.ellipse.cy})`} />
            ) : (
              <path key={key} {...common} d={s.d} />
            );
          }
          if (s.ellipse) {
            const e = s.ellipse;
            const tr = `rotate(${e.rotate} ${e.cx} ${e.cy})`;
            return (
              <g key={key} opacity={opacity}>
                <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} transform={tr} fill={color} opacity={0.55} filter={`url(#soft-${uid})`} />
                <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} transform={tr} fill="none" stroke="#fff" strokeWidth={1.6 * Math.max(unit, 0.6)} opacity={0.9} />
              </g>
            );
          }
          if (s.kind === "fill") {
            return (
              <g key={key} opacity={opacity}>
                <path d={s.d} fill={color} opacity={z.part === "base" ? 0.28 : 0.5} filter={`url(#softer-${uid})`} />
                <path d={s.d} fill="none" stroke="#fff" strokeWidth={1.6 * Math.max(unit, 0.6)} opacity={0.9} />
              </g>
            );
          }
          return (
            <g key={key} opacity={opacity}>
              <path d={s.d} fill="none" stroke={color} strokeWidth={s.width} strokeLinecap="round" opacity={0.5} filter={`url(#softer-${uid})`} />
              <path d={s.d} fill="none" stroke="#fff" strokeWidth={1.4 * Math.max(unit, 0.6)} strokeLinecap="round" opacity={0.85} />
            </g>
          );
        }),
      )}

      {focus && (
        <g>
          <circle cx={focus.x} cy={focus.y} r={9 * Math.max(unit, 0.5)} fill="#fff" opacity={0.95} />
          <circle cx={focus.x} cy={focus.y} r={9 * Math.max(unit, 0.5)} fill="none" stroke="#fff" strokeWidth={2 * Math.max(unit, 0.5)}>
            <animate attributeName="r" from={9 * Math.max(unit, 0.5)} to={34 * Math.max(unit, 0.5)} dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.9" to="0" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx={focus.x} cy={focus.y} r={4 * Math.max(unit, 0.5)} fill="#2f2b66" />
        </g>
      )}

      {pins.map((pin) => (
        <g key={pin.label} transform={`translate(${pin.x} ${pin.y})`}>
          <circle r={15 * Math.max(unit, 0.7)} fill={pin.active ? "#2f2b66" : "#ffffff"} stroke="#2f2b66" strokeWidth={1.5} opacity={0.95} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={15 * Math.max(unit, 0.7)}
            fontWeight={600}
            fill={pin.active ? "#fff" : "#2f2b66"}
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            {pin.label}
          </text>
        </g>
      ))}

      {markers.map((m) => (
        <g key={`${m.index}-${m.x}`} transform={`translate(${m.x} ${m.y})`}>
          <circle r={24 * unit} fill="none" stroke={m.type === "good" ? "#3f9b6e" : "#e07a5f"} strokeWidth={2.5 * unit} strokeDasharray={m.type === "improve" ? `${5 * unit} ${4 * unit}` : undefined} />
          <circle cx={22 * unit} cy={-22 * unit} r={11 * unit} fill={m.type === "good" ? "#3f9b6e" : "#e07a5f"} />
          <text x={22 * unit} y={-22 * unit} textAnchor="middle" dominantBaseline="central" fontSize={13 * unit} fontWeight={700} fill="#fff">
            {m.index}
          </text>
        </g>
      ))}

      {scan && (
        <g>
          {pts.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={3.2 * unit}
              fill="#ffffff"
              stroke="#6d63c9"
              strokeWidth={1.2 * unit}
              style={{ opacity: 0, animation: `fade-pt 0.5s ease forwards`, animationDelay: `${0.25 + i * 0.035}s` }}
            />
          ))}
          <rect x={0} y={0} width={FACE_W} height={60} fill={`url(#scan-${uid})`} style={{ animation: "scan-y 2.6s ease-in-out infinite" }} />
          <style>{`@keyframes fade-pt{to{opacity:.95}}@keyframes scan-y{0%{transform:translateY(120px)}50%{transform:translateY(820px)}100%{transform:translateY(120px)}}`}</style>
        </g>
      )}
    </svg>
  );
}
