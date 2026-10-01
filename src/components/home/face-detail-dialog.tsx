"use client";

import { Lock } from "lucide-react";
import { FaceCanvas } from "@/components/common/face-canvas";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LANDMARKS, scanPoints } from "@/lib/face-geometry";
import { landmarkSetOf } from "@/lib/store";
import type { Session } from "@/lib/types";

export function FaceDetailDialog({
  open,
  onOpenChange,
  session,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session: Session;
}) {
  const face = session.face!;
  const L = LANDMARKS[landmarkSetOf(session)];
  const labels = ["上庭", "中庭", "下庭"];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong rounded-[24px] p-6 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-ink">脸型分析 · {face.faceShapeLabel}</DialogTitle>
          <DialogDescription>{face.summary}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
            <FaceCanvas src={session.selfieImage} landmarks={L} shape={face.faceShape} />
            <svg viewBox="0 0 768 1024" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full">
              {scanPoints(L).map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={4} fill="#fff" stroke="#6d63c9" strokeWidth={1.5} />
              ))}
              {[L.forehead.y - 40, (L.browLPeak.y + L.browRPeak.y) / 2, L.nose.y, L.chin.y].map((y, i) => (
                <line key={i} x1={150} x2={700} y1={y} y2={y} stroke="#fff" strokeDasharray="8 8" strokeWidth={2} opacity={0.8} />
              ))}
            </svg>
          </div>
          <div className="space-y-4">
            <div>
              <div className="label-mono">三庭比例</div>
              <div className="mt-2 flex h-3 overflow-hidden rounded-full">
                {face.thirds.map((t, i) => (
                  <div key={i} style={{ width: `${t * 100}%`, background: ["#cfc6ee", "#f1b5a6", "#c47684"][i] }} />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-ink/60">
                {face.thirds.map((t, i) => (
                  <span key={i}>
                    {labels[i]} {Math.round(t * 100)}%
                  </span>
                ))}
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm">
              {[
                ["五眼", face.fiveEyes],
                ["颧骨", face.cheekbone],
                ["下颌", face.jaw],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3 rounded-xl bg-white/60 px-3 py-2.5">
                  <dt className="w-10 shrink-0 text-ink/50">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-ink/50">
              <Lock className="mt-px size-3.5 shrink-0" />
              由 {face.engine} 在本机完成，照片未上传。脸型只用于调整画法位置，不做任何外貌评价。
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
