"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_TOOLS } from "./looks";
import { seedData } from "./seed";
import type { DemoScenario, ImageQuality, LookId, SavedLook, Session } from "./types";

export interface DraftImage {
  src: string;
  sample?: boolean;
  sampleLook?: LookId;
  name?: string;
  quality?: ImageQuality;
  acceptedIssues?: boolean;
}

export interface Settings {
  narration: boolean;
  voiceInput: boolean;
  overlay: boolean;
  mirrored: boolean;
  scenario: DemoScenario;
}

interface AppState {
  hydrated: boolean;
  seeded: boolean;
  reference?: DraftImage;
  selfie?: DraftImage;
  tools: string[];
  currentId?: string;
  sessions: Session[];
  looks: SavedLook[];
  settings: Settings;
  consentSessionId?: string;
  setReference: (img?: DraftImage) => void;
  setSelfie: (img?: DraftImage) => void;
  setTools: (tools: string[]) => void;
  upsertSession: (s: Session) => void;
  updateSession: (id: string, fn: (s: Session) => Session) => void;
  removeSession: (id: string) => void;
  setCurrent: (id?: string) => void;
  saveLook: (look: SavedLook) => void;
  removeLook: (id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  rememberConsent: (sessionId?: string) => void;
  resetDemo: () => void;
  clearAll: () => void;
}

const defaultSettings: Settings = {
  narration: true,
  voiceInput: true,
  overlay: true,
  mirrored: true,
  scenario: "normal",
};

const MAX_SESSIONS = 12;

const safeStorage = createJSONStorage(() => ({
  getItem: (k: string) => localStorage.getItem(k),
  setItem: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      // 超出 localStorage 配额时丢弃最旧的检查照片后重试
      try {
        const parsed = JSON.parse(v);
        parsed.state.sessions = (parsed.state.sessions ?? []).map((s: Session, i: number) =>
          i > 2 ? { ...s, checks: s.checks.map((c) => ({ ...c, image: s.afterImage ?? s.selfieImage })) } : s,
        );
        localStorage.setItem(k, JSON.stringify(parsed));
      } catch {
        /* 静默失败：演示数据仅在内存中保留 */
      }
    }
  },
  removeItem: (k: string) => localStorage.removeItem(k),
}));

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      hydrated: false,
      seeded: false,
      tools: DEFAULT_TOOLS,
      sessions: [],
      looks: [],
      settings: defaultSettings,
      setReference: (img) => set({ reference: img }),
      setSelfie: (img) => set({ selfie: img }),
      setTools: (tools) => set({ tools }),
      upsertSession: (s) =>
        set((st) => {
          const rest = st.sessions.filter((x) => x.id !== s.id);
          return { sessions: [s, ...rest].slice(0, MAX_SESSIONS) };
        }),
      updateSession: (id, fn) =>
        set((st) => ({ sessions: st.sessions.map((s) => (s.id === id ? fn(s) : s)) })),
      removeSession: (id) =>
        set((st) => ({
          sessions: st.sessions.filter((s) => s.id !== id),
          currentId: st.currentId === id ? undefined : st.currentId,
        })),
      setCurrent: (id) => set({ currentId: id }),
      saveLook: (look) =>
        set((st) => ({ looks: [look, ...st.looks.filter((l) => l.id !== look.id && (!look.sessionId || l.sessionId !== look.sessionId))] })),
      removeLook: (id) => set((st) => ({ looks: st.looks.filter((l) => l.id !== id) })),
      setSettings: (patch) => set((st) => ({ settings: { ...st.settings, ...patch } })),
      rememberConsent: (sessionId) => set({ consentSessionId: sessionId }),
      resetDemo: () => {
        const { sessions, looks } = seedData();
        set({
          seeded: true,
          sessions,
          looks,
          reference: undefined,
          selfie: undefined,
          currentId: undefined,
          tools: DEFAULT_TOOLS,
          consentSessionId: undefined,
        });
      },
      clearAll: () =>
        set({
          seeded: true,
          sessions: [],
          looks: [],
          reference: undefined,
          selfie: undefined,
          currentId: undefined,
          consentSessionId: undefined,
        }),
    }),
    {
      name: "suixingmei-demo-v1",
      storage: safeStorage,
      skipHydration: true,
      partialize: (st) => ({
        seeded: st.seeded,
        reference: st.reference,
        selfie: st.selfie,
        tools: st.tools,
        currentId: st.currentId,
        sessions: st.sessions,
        looks: st.looks,
        settings: st.settings,
        consentSessionId: st.consentSessionId,
      }),
    },
  ),
);

export function useCurrentSession(): Session | undefined {
  return useApp((s) => s.sessions.find((x) => x.id === s.currentId));
}

export function landmarkSetOf(s: { selfieSample: boolean }) {
  return s.selfieSample ? ("user" as const) : ("generic" as const);
}
