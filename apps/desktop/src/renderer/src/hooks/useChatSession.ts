import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLocalragApi } from "../api/LocalragApiContext.js";
import type { AppTab } from "../shell/types.js";
import type { ChatMessageViewModel, CitationRow, IngestPathResult } from "../api/types.js";

type SetTab = (tab: AppTab) => void;

function normalizeMessage(r: {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  metadata: { citations?: unknown[]; otherRetrieved?: unknown[] } | null;
}): ChatMessageViewModel {
  const meta = r.metadata;
  if (r.role === "assistant") {
    return {
      id: r.id,
      role: "assistant",
      content: r.content,
      createdAt: r.createdAt,
      metadata: {
        citations: (meta?.citations ?? []) as CitationRow[],
        otherRetrieved: (meta?.otherRetrieved ?? []) as CitationRow[],
      },
    };
  }
  return {
    id: r.id,
    role: "user",
    content: r.content,
    createdAt: r.createdAt,
  };
}

export function useChatSession(opts: {
  setError: (message: string | null) => void;
  setBusy: (busy: boolean) => void;
  busy: boolean;
  refreshDocs: () => Promise<void>;
  setTab: SetTab;
  tab: AppTab;
  persistChatHistory: boolean | undefined;
}) {
  const { setError, setBusy, busy, refreshDocs, setTab, tab, persistChatHistory } = opts;
  const api = useLocalragApi();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessageViewModel[]>([]);
  const [asking, setAsking] = useState(false);
  const [showOtherRetrieved, setShowOtherRetrieved] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [sourcesCitations, setSourcesCitations] = useState<CitationRow[]>([]);
  const [sourcesOther, setSourcesOther] = useState<CitationRow[]>([]);
  const [ingesting, setIngesting] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const sourcesCloseRef = useRef<HTMLButtonElement>(null);

  const loadPersistedHistory = useCallback(async () => {
    try {
      const rows = await api.listChatMessages();
      setMessages(rows.map(normalizeMessage));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [api, setError]);

  useEffect(() => {
    if (persistChatHistory !== true) return;
    void loadPersistedHistory();
  }, [persistChatHistory, loadPersistedHistory]);

  useEffect(() => {
    if (!sourcesOpen) setShowOtherRetrieved(false);
  }, [sourcesOpen]);

  useEffect(() => {
    if (!sourcesOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setSourcesOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sourcesOpen]);

  useEffect(() => {
    if (sourcesOpen) sourcesCloseRef.current?.focus();
  }, [sourcesOpen]);

  useLayoutEffect(() => {
    if (tab !== "chat") return;
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: asking ? "smooth" : "auto" });
  }, [tab, asking, messages]);

  const onOpenSources = useCallback((m: ChatMessageViewModel) => {
    if (m.role !== "assistant") return;
    setShowOtherRetrieved(false);
    setSourcesCitations(m.metadata?.citations ?? []);
    setSourcesOther(m.metadata?.otherRetrieved ?? []);
    setSourcesOpen(true);
  }, []);

  const clearChatHistory = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.clearChatMessages();
      if (!res.ok) return;
      setMessages([]);
      setSourcesOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [api, setBusy, setError]);

  const onIngest = useCallback(async () => {
    setIngesting(true);
    setBusy(true);
    setError(null);
    try {
      const pick = await api.pickIngestPaths();
      if (!pick.paths.length) return;
      const results: IngestPathResult[] = [];
      for (const path of pick.paths) {
        const item = await api.ingestPath(path);
        results.push(item);
        await refreshDocs();
      }
      const failed = results.filter((r) => !r.ok);
      if (failed.length) {
        setError(failed.map((f) => `${f.path}: ${f.error ?? "error"}`).join("\n"));
      }
      setTab("library");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setIngesting(false);
    }
  }, [api, refreshDocs, setBusy, setError, setTab]);

  const onAsk = useCallback(async () => {
    const q = question.trim();
    if (!q) return;
    const optimisticUser: ChatMessageViewModel = {
      id: crypto.randomUUID(),
      role: "user",
      content: q,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimisticUser]);
    setQuestion("");
    setBusy(true);
    setAsking(true);
    setError(null);
    try {
      const res = await api.ask(q);
      const meta = { citations: res.citations ?? [], otherRetrieved: res.otherRetrieved ?? [] };
      if (persistChatHistory === true) {
        await api.appendChatExchange({
          userContent: q,
          assistantContent: res.text,
          metadata: meta,
        });
        await loadPersistedHistory();
      } else {
        const assistant: ChatMessageViewModel = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.text,
          createdAt: new Date().toISOString(),
          metadata: meta,
        };
        setMessages((m) => [...m, assistant]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setQuestion(q);
      setMessages((m) => (m.length && m[m.length - 1]?.role === "user" ? m.slice(0, -1) : m));
    } finally {
      setAsking(false);
      setBusy(false);
    }
  }, [api, loadPersistedHistory, persistChatHistory, question, setBusy, setError]);

  const onQuestionKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      if (!busy && !asking && question.trim()) void onAsk();
    },
    [asking, busy, onAsk, question],
  );

  return {
    question,
    setQuestion,
    messages,
    asking,
    showOtherRetrieved,
    setShowOtherRetrieved,
    sourcesOpen,
    setSourcesOpen,
    sourcesCitations,
    sourcesOther,
    chatScrollRef,
    sourcesCloseRef,
    onIngest,
    onAsk,
    onQuestionKeyDown,
    onOpenSources,
    clearChatHistory,
    loadPersistedHistory,
    ingesting,
  };
}
