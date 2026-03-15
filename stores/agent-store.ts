'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { PersistedExecutionRecord, RoutePreference } from '@/types/agent';

type AgentSettings = {
  routePreference: RoutePreference;
  slippageBps: number;
  exactApprovalOnly: boolean;
  debugMode: boolean;
};

type AgentStore = {
  settings: AgentSettings;
  activeExecution: PersistedExecutionRecord | null;
  history: PersistedExecutionRecord[];
  setSettings: (partial: Partial<AgentSettings>) => void;
  setActiveExecution: (record: PersistedExecutionRecord | null) => void;
  upsertHistory: (record: PersistedExecutionRecord) => void;
  clearHistory: () => void;
};

const DEFAULT_SETTINGS: AgentSettings = {
  routePreference: 'recommended',
  slippageBps: 50,
  exactApprovalOnly: true,
  debugMode: false,
};

export const useAgentStore = create<AgentStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      activeExecution: null,
      history: [],
      setSettings: (partial) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...partial,
          },
        })),
      setActiveExecution: (record) =>
        set((state) => ({
          activeExecution: record,
          history: record
            ? [record, ...state.history.filter((item) => item.id !== record.id)].slice(0, 20)
            : state.history,
        })),
      upsertHistory: (record) =>
        set((state) => ({
          history: [record, ...state.history.filter((item) => item.id !== record.id)].slice(0, 20),
        })),
      clearHistory: () =>
        set({
          history: [],
          activeExecution: null,
        }),
    }),
    {
      name: 'swap-agent-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        activeExecution: state.activeExecution,
        history: state.history,
      }),
    },
  ),
);
