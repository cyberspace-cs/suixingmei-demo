import type { Metadata } from "next";
import { PlanView } from "@/components/plan/plan-view";

export const metadata: Metadata = { title: "专属方案 · 随行美" };

export default function PlanPage() {
  return <PlanView />;
}
