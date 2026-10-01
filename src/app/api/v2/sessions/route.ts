import { NextResponse } from "next/server";

export async function POST() {
  const id = `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return NextResponse.json({ id, revision: 0, created_at: Date.now() });
}
