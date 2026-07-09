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
import { useCopilotChat, useCopilotConfirm } from '@/hooks/useCopilot';
import type { CopilotChatTurn, PendingAction } from '@/app/lib/api/copilotApi';

export type CopilotRole = 'user' | 'assistant';

/** Resolution state of a prepared write attached to an assistant bubble. */
export type PendingActionStatus = 'applied' | 'cancelled';

export interface CopilotMessage {
  id: string;
  role: CopilotRole;
  content: string;
  /** Marks an assistant bubble that represents a failed request. */
  isError?: boolean;
  /** A prepared write awaiting confirmation (Tier-2 update / Tier-1 delete). */
  pendingAction?: PendingAction;
  /** Set once the user has applied or cancelled the attached pending action. */
  pendingStatus?: PendingActionStatus;
  /**
   * Hidden turns are excluded from rendering but replayed to the model as
   * history (used for synthetic confirmation/cancellation notifications so the
   * LLM tracks committed DB state without a server-side session).
   */
  hidden?: boolean;
}

interface CopilotContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  openCopilot: () => void;
  /** Desktop docked-window minimized state (collapsed to header bar). */
  minimized: boolean;
  setMinimized: (minimized: boolean) => void;
  toggleMinimized: () => void;
  messages: CopilotMessage[];
  isLoading: boolean;
  send: (text: string) => Promise<void>;
  retry: () => Promise<void>;
  clear: () => void;
  /** Confirm and execute the prepared write on the given message. */
  confirmAction: (messageId: string) => Promise<void>;
  /** Cancel the prepared write on the given message without executing it. */
  cancelAction: (messageId: string) => void;
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
const UI_STATE_KEY = 'copilot:ui';

interface CopilotUiState {
  open: boolean;
  minimized: boolean;
}

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

/**
 * Strip transient pending-action state before persisting. A prepared write is
 * only valid for the lifetime of its short-lived signed token, so replaying a
 * stale one after reload would be useless (and confusing) — we drop the token
 * and mark any unresolved action as cancelled.
 */
function toPersistable(messages: CopilotMessage[]): CopilotMessage[] {
  return messages.slice(-MAX_STORED_MESSAGES).map((m) => {
    if (!m.pendingAction) return m;
    const { pendingAction: _drop, ...rest } = m;
    return { ...rest, pendingStatus: m.pendingStatus ?? 'cancelled' };
  });
}

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const { selectedTeamId } = useTeam();
  const sendChat = useCopilotChat();
  const confirmChat = useCopilotConfirm();

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scheduleId, setScheduleId] = useState<string | null>(null);

  // Gate persisting the docked-window UI state until it has hydrated from
  // storage, to avoid clobbering the cache during static-export hydration.
  const [uiHydrated, setUiHydrated] = useState(false);

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

  // Restore the docked-window open/minimized state on mount so it survives
  // reloads (navigation persistence is provided by the mounted provider).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(UI_STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CopilotUiState>;
        if (typeof parsed.open === 'boolean') setOpen(parsed.open);
        if (typeof parsed.minimized === 'boolean') setMinimized(parsed.minimized);
      }
    } catch {
      // ignore malformed / unavailable storage
    }
    setUiHydrated(true);
  }, []);

  // Persist the docked-window state (only after hydration).
  useEffect(() => {
    if (!uiHydrated) return;
    try {
      localStorage.setItem(UI_STATE_KEY, JSON.stringify({ open, minimized }));
    } catch {
      // Storage full / unavailable — non-fatal.
    }
  }, [open, minimized, uiHydrated]);

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
      localStorage.setItem(storageKey(selectedTeamId), JSON.stringify(toPersistable(messages)));
    } catch {
      // Storage full / unavailable — non-fatal, keep chatting in memory.
    }
  }, [messages, selectedTeamId, hydratedTeam]);

  const runRequest = useCallback(
    async (message: string, priorMessages: CopilotMessage[]) => {
      setIsLoading(true);
      try {
        const { response, pendingAction } = await sendChat({
          message,
          history: toHistoryTurns(priorMessages),
          teamId: selectedTeamId,
          scheduleId,
        });
        setMessages((prev) => [
          ...prev,
          {
            id: createId(),
            role: 'assistant',
            content: response,
            ...(pendingAction ? { pendingAction } : {}),
          },
        ]);
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

  // Append a hidden synthetic notification turn so the model tracks whether a
  // prepared write was actually committed (the mutation happens on a separate
  // REST route the LLM cannot otherwise observe).
  const appendNotification = useCallback((content: string) => {
    setMessages((prev) => [...prev, { id: createId(), role: 'user', content, hidden: true }]);
  }, []);

  const confirmAction = useCallback(
    async (messageId: string) => {
      const target = messagesRef.current.find((m) => m.id === messageId);
      if (!target?.pendingAction || target.pendingStatus) return;
      const action = target.pendingAction;
      setIsLoading(true);
      try {
        const { message } = await confirmChat(action);
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, pendingStatus: 'applied' } : m)),
        );
        appendNotification(
          `[System Notification: The manager confirmed and applied the proposed ` +
            `${action.toolName} operation successfully. ${message}]`,
        );
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: createId(), role: 'assistant', content: '', isError: true },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [confirmChat, appendNotification],
  );

  const cancelAction = useCallback(
    (messageId: string) => {
      const target = messagesRef.current.find((m) => m.id === messageId);
      if (!target?.pendingAction || target.pendingStatus) return;
      const action = target.pendingAction;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, pendingStatus: 'cancelled' } : m)),
      );
      appendNotification(
        `[System Notification: The manager cancelled the proposed ` +
          `${action.toolName} operation. No changes were made.]`,
      );
    },
    [appendNotification],
  );

  const openCopilot = useCallback(() => {
    setOpen(true);
    setMinimized(false);
  }, []);

  const toggleMinimized = useCallback(() => setMinimized((prev) => !prev), []);

  const value = useMemo<CopilotContextValue>(
    () => ({
      open,
      setOpen,
      openCopilot,
      minimized,
      setMinimized,
      toggleMinimized,
      messages,
      isLoading,
      send,
      retry,
      clear,
      confirmAction,
      cancelAction,
      setScheduleId,
    }),
    [
      open,
      openCopilot,
      minimized,
      toggleMinimized,
      messages,
      isLoading,
      send,
      retry,
      clear,
      confirmAction,
      cancelAction,
    ],
  );

  return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>;
}
