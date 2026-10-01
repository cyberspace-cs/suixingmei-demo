import type { Metadata } from "next";
import { CompleteView } from "@/components/complete/complete-view";

export const metadata: Metadata = { title: "妆后评分 · 随行美" };

export default function CompletePage() {
  return <CompleteView />;
}
