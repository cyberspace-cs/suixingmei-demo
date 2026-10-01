"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ALL_TOOLS, buildPlan } from "@/lib/looks";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ToolsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const tools = useApp((s) => s.tools);
  const [draft, setDraft] = useState<string[]>(tools);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setDraft(tools);
  }

  const save = () => {
    const st = useApp.getState();
    st.setTools(draft);
    const session = st.sessions.find((s) => s.id === st.currentId);
    if (session?.adapt && session.status !== "completed") {
      const included = session.plan.filter((p) => p.included).map((p) => p.key);
      st.updateSession(session.id, (s) => ({
        ...s,
        tools: draft,
        plan: buildPlan(s.lookId, s.adapt!.adjustments, draft, included),
      }));
    }
    toast.success("手边工具已更新", { description: "跟妆步骤会按你现有的工具调整做法" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong rounded-[24px] p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-ink">手边有哪些工具？</DialogTitle>
          <DialogDescription>没有的工具不用买，AI 会换成手边就能完成的做法，比如用指腹代替刷子。</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {ALL_TOOLS.map((t) => {
            const on = draft.includes(t);
            return (
              <button
                key={t}
                onClick={() => setDraft((d) => (on ? d.filter((x) => x !== t) : [...d, t]))}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition",
                  on ? "border-ink bg-ink text-white" : "border-ink/15 bg-white/70 text-ink/70 hover:border-ink/40",
                )}
                aria-pressed={on}
              >
                {on && <Check className="size-3.5" />} {t}
              </button>
            );
          })}
        </div>
        <DialogFooter className="-mx-6 -mb-6 rounded-b-[24px] bg-white/40 px-6 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button className="btn-ink rounded-full px-5" onClick={save}>
            保存（{draft.length} 件）
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
