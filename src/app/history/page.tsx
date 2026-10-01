import type { Metadata } from "next";
import { HistoryView } from "@/components/history/history-view";

export const metadata: Metadata = { title: "历史妆容 · 随行美" };

export default function HistoryPage() {
  return <HistoryView />;
}
