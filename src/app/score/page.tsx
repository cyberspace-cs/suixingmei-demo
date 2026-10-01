import type { Metadata } from "next";
import { DirectScoreView } from "@/components/score/direct-score-view";

export const metadata: Metadata = { title: "直接打分 · 随行美" };

export default function ScorePage() {
  return <DirectScoreView />;
}
