'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTeam } from '@/context/TeamContext';
import { useCopilotChat } from '@/hooks/useCopilot';
import type { CopilotChatTurn } from '@/app/lib/api/copilotApi';

export type CopilotRole = 'user' | 'assistant';

export interface CopilotMessage {
  id: string;
  role: CopilotRole;
  content: string;
  /** Marks an assistant bubble that represents a failed request. */
  isError?: boolean;
}

interface CopilotContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  openCopilot: () => void;
  messages: CopilotMessage[];
  isLoading: boolean;
  send: (text: string) => Promise<void>;
  retry: () => Promise<void>;
  clear: () => void;
  /** Set by pages that expose an active schedule (e.g. the schedule tab). */
  setScheduleId: (scheduleId: string | null) => void;
}

const CopilotContext = createContext<CopilotContextValue | undefined>(undefined);

export function useCopilot(): CopilotContextValue {
  const ctx = useContext(CopilotContext);
  if (!ctx) throw new Error('useCopilot must be used within a CopilotProvider');
  return ctx;
}

/**
 * Non-throwing variant for components (e.g. the shared nav bar) that may render
 * outside a `CopilotProvider` — returns `undefined` when unavailable.
 */
export function useCopilotOptional(): CopilotContextValue | undefined {
  return useContext(CopilotContext);
}

// Cap what we persist and what we replay to the model to protect the token
// budget and the backend rate limit (the DTO also enforces max 20 turns).
const MAX_STORED_MESSAGES = 40;
const MAX_HISTORY_TURNS = 10;

const storageKey = (teamId: string) => `copilot:history:${teamId}`;

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toHistoryTurns(messages: CopilotMessage[]): CopilotChatTurn[] {
  return messages
    .filter((m) => !m.isError)
    .slice(-MAX_HISTORY_TURNS)
    .map(({ role, content }) => ({ role, content }));
}

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const { selectedTeamId } = useTeam();
  const sendChat = useCopilotChat();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scheduleId, setScheduleId] = useState<string | null>(null);

  // Tracks which team's history has been loaded from storage. Persisting is
  // gated on this to avoid clobbering the cache with the initial empty array
  // before hydration completes (Next.js static-export hydration safety).
  const [hydratedTeam, setHydratedTeam] = useState<string | null>(null);

  const messagesRef = useRef<CopilotMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const loadingRef = useRef(isLoading);
  useEffect(() => {
    loadingRef.current = isLoading;
  }, [isLoading]);

  // Load persisted history whenever the active team changes.
  useEffect(() => {
    if (!selectedTeamId) {
      setMessages([]);
      setHydratedTeam(null);
      return;
    }
    let loaded: CopilotMessage[] = [];
    try {
      const raw = localStorage.getItem(storageKey(selectedTeamId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) loaded = parsed;
      }
    } catch {
      loaded = [];
    }
    setMessages(loaded);
    setHydratedTeam(selectedTeamId);
  }, [selectedTeamId]);

  // Persist history (only after the current team has hydrated).
  useEffect(() => {
    if (!selectedTeamId || hydratedTeam !== selectedTeamId) return;
    try {
      localStorage.setItem(
        storageKey(selectedTeamId),
        JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)),
      );
    } catch {
      // Storage full / unavailable — non-fatal, keep chatting in memory.
    }
  }, [messages, selectedTeamId, hydratedTeam]);

  const runRequest = useCallback(
    async (message: string, priorMessages: CopilotMessage[]) => {
      setIsLoading(true);
      try {
        const { response } = await sendChat({
          message,
          history: toHistoryTurns(priorMessages),
          teamId: selectedTeamId,
          scheduleId,
        });
        setMessages((prev) => [...prev, { id: createId(), role: 'assistant', content: response }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: createId(), role: 'assistant', content: '', isError: true },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [sendChat, selectedTeamId, scheduleId],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loadingRef.current) return;
      const prior = messagesRef.current;
      setMessages((prev) => [...prev, { id: createId(), role: 'user', content: trimmed }]);
      await runRequest(trimmed, prior);
    },
    [runRequest],
  );

  const retry = useCallback(async () => {
    if (loadingRef.current) return;
    const msgs = messagesRef.current;
    const lastUserIdx = msgs.map((m) => m.role).lastIndexOf('user');
    if (lastUserIdx === -1) return;
    const lastUser = msgs[lastUserIdx];
    const prior = msgs.slice(0, lastUserIdx);
    // Drop the failed error bubble(s) that followed the last user message.
    setMessages(msgs.slice(0, lastUserIdx + 1));
    await runRequest(lastUser.content, prior);
  }, [runRequest]);

  const clear = useCallback(() => {
    setMessages([]);
    if (selectedTeamId) {
      try {
        localStorage.removeItem(storageKey(selectedTeamId));
      } catch {
        // ignore
      }
    }
  }, [selectedTeamId]);

  const openCopilot = useCallback(() => setOpen(true), []);

  const value = useMemo<CopilotContextValue>(
    () => ({
      open,
      setOpen,
      openCopilot,
      messages,
      isLoading,
      send,
      retry,
      clear,
      setScheduleId,
    }),
    [open, openCopilot, messages, isLoading, send, retry, clear],
  );

  return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>;
}
