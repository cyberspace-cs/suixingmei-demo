import type { PartKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const PATHS: Record<PartKey, string[]> = {
  base: ["M12 3.5c3.2 3.8 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0c0-3 2.3-6.2 5.5-10z", "M9.5 14.5a2.6 2.6 0 0 0 2.5 2.4"],
  contour: ["M8 3.5C5.4 5.6 4 8.6 4 12s1.4 6.4 4 8.5", "M16 3.5c2.6 2.1 4 5.1 4 8.5s-1.4 6.4-4 8.5", "M12 7.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"],
  brow: ["M3.5 14.5C7 9.8 13 8.3 20.5 10.2", "M5 15.8c3.2-3.4 8.2-4.6 14.5-3.6"],
  eyeshadow: ["M3 13.5s3.5-4.8 9-4.8 9 4.8 9 4.8-3.5 4-9 4-9-4-9-4z", "M5 9.6C7 7 9.5 6 12 6s5 1 7 3.6", "M12 11.2a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z"],
  eyeliner: ["M3 13.5s3.5-4.8 9-4.8c4 0 7 2.4 8.4 3.6l2.1-1.6", "M3 13.5s3.5 4 9 4 9-4 9-4", "M12 11.2a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z"],
  lashes: ["M3.5 11c2.5 2.6 5.3 3.8 8.5 3.8s6-1.2 8.5-3.8", "M6.2 13.4 5 16.2", "M9 14.5l-.6 3", "M12 14.8v3.2", "M15 14.5l.6 3", "M17.8 13.4l1.2 2.8"],
  blush: ["M12 5.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z", "M9 13.5c1.6 1.4 4.4 1.4 6 0", "M19.5 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"],
  lip: ["M3.5 12c2.5-3 4.5-4.6 6-4.6 1 0 1.6.7 2.5.7s1.5-.7 2.5-.7c1.5 0 3.5 1.6 6 4.6-2.5 3.1-5 4.9-8.5 4.9S6 15.1 3.5 12z", "M3.5 12c3 .9 5.8 1.3 8.5 1.3s5.5-.4 8.5-1.3"],
};

export function PartGlyph({ part, className }: { part: PartKey; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[part].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
