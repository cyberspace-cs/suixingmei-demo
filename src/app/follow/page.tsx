import type { Metadata } from "next";
import { FollowView } from "@/components/follow/follow-view";

export const metadata: Metadata = { title: "跟妆中 · 随行美" };

export default function FollowPage() {
  return <FollowView />;
}
