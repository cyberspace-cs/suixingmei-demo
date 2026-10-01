import type { Metadata } from "next";
import { LooksView } from "@/components/looks/looks-view";

export const metadata: Metadata = { title: "我的妆容 · 随行美" };

export default function LooksPage() {
  return <LooksView />;
}
