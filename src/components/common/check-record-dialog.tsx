"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PARTS } from "@/lib/looks";
import type { CheckRecord } from "@/lib/types";
import { CheckItems, CheckPhoto, StatusPill } from "./check-view";

export function formatTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function CheckRecordDialog({ record, onOpenChange }: { record: CheckRecord | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={!!record} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong rounded-[24px] p-5 sm:max-w-xl">
        {record && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-serif text-xl text-ink">
                {PARTS[record.part].label} · {record.stepTitle}
                <StatusPill status={record.status} fallback={record.fallback} />
              </DialogTitle>
              <DialogDescription>
                {new Date(record.createdAt).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })} {formatTime(record.createdAt)} · {record.engine}
              </DialogDescription>
            </DialogHeader>
            <CheckPhoto image={record.image} part={record.part} landmarkSet={record.landmarkSet} result={record} className="aspect-[4/3] rounded-2xl" />
            <div>
              <p className="font-medium text-ink">{record.summary}</p>
              <div className="mt-2.5">
                <CheckItems result={record} />
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
