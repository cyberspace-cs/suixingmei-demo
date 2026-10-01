import { CheckCircle2, CircleAlert, CloudOff } from "lucide-react";
import { FaceCanvas } from "@/components/common/face-canvas";
import { LANDMARKS, focusBox } from "@/lib/face-geometry";
import type { CheckRecord, CheckResult, FaceShape, PartKey } from "@/lib/types";
import { cn } from "@/lib/utils";

export function markersOf(result: CheckResult) {
  return result.items
    .map((it, i) => (it.marker ? { ...it.marker, type: it.type, index: i + 1 } : null))
    .filter(Boolean) as { x: number; y: number; type: "good" | "improve"; index: number }[];
}

export function CheckPhoto({
  image,
  part,
  landmarkSet,
  result,
  shape = "round",
  zoom = true,
  className,
}: {
  image: string;
  part: PartKey;
  landmarkSet: CheckRecord["landmarkSet"];
  result?: CheckResult;
  shape?: FaceShape;
  zoom?: boolean;
  className?: string;
}) {
  const L = LANDMARKS[landmarkSet];
  return (
    <div className={cn("overflow-hidden bg-ink/5", className)}>
      <FaceCanvas
        src={image}
        landmarks={L}
        shape={shape}
        viewBox={zoom ? focusBox(part, L, 4 / 3) : undefined}
        markers={result ? markersOf(result) : []}
      />
    </div>
  );
}

export function StatusPill({ status, fallback }: { status: CheckResult["status"]; fallback?: boolean }) {
  if (fallback)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
        <CloudOff className="size-3" /> 本机检查
      </span>
    );
  return status === "good" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
      <CheckCircle2 className="size-3" /> 通过
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#e07a5f]/12 px-2 py-0.5 text-[11px] font-medium text-[#c4603f]">
      <CircleAlert className="size-3" /> 可改进
    </span>
  );
}

export function CheckItems({ result }: { result: CheckResult }) {
  return (
    <ol className="space-y-2">
      {result.items.map((it, i) => (
        <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-ink/80">
          <span
            className={cn(
              "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white",
              it.type === "good" ? "bg-success" : "bg-[#e07a5f]",
            )}
          >
            {i + 1}
          </span>
          <span>
            <span className={cn("mr-1 font-medium", it.type === "good" ? "text-success" : "text-[#c4603f]")}>
              {it.type === "good" ? "做得好" : "可改进"}
            </span>
            {it.text}
          </span>
        </li>
      ))}
    </ol>
  );
}
