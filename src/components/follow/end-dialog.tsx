"use client";

import { Camera, Clock, Play, Save } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function EndDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  stepsDone: number;
  stepsTotal: number;
  elapsed: string;
  onSaveExit: () => void;
  onScore: () => void;
}) {
  const allDone = props.stepsDone >= props.stepsTotal;
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent className="glass-strong rounded-[24px] p-6 sm:max-w-[420px]">
        <AlertDialogHeader className="place-items-start text-left">
          <AlertDialogTitle className="font-serif text-xl font-bold text-ink">{allDone ? "妆容完成了，去看看效果？" : "先到这里吗？"}</AlertDialogTitle>
          <AlertDialogDescription className="text-[13px] text-ink/60">
            已完成 {props.stepsDone}/{props.stepsTotal} 小步 · 用时 {props.elapsed}。进度已自动保存在「历史妆容」，随时可以接着画。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2">
          <button onClick={props.onScore} className="btn-ink flex h-12 items-center justify-center gap-2 rounded-full text-sm font-medium">
            <Camera className="size-4" /> 拍妆后照，让 AI 打分
          </button>
          <button
            onClick={props.onSaveExit}
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-ink/15 bg-white/80 text-sm text-ink hover:bg-white"
          >
            <Save className="size-4" /> 保存进度并退出
          </button>
          <button onClick={() => props.onOpenChange(false)} className="flex h-10 items-center justify-center gap-2 rounded-full text-sm text-ink/60 hover:text-ink">
            <Play className="size-4" /> 继续跟妆
          </button>
        </div>
        {!allDone && (
          <p className="flex items-center gap-1.5 text-[11px] text-ink/45">
            <Clock className="size-3" /> 未完成的部位不会计入评分
          </p>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
