import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLocalragApi } from "../api/LocalragApiContext.js";
import type { AppTab } from "../shell/types.js";
import type { CitationRow } from "../api/types.js";

type SetTab = (tab: AppTab) => void;

export function useChatSession(opts: {
  setError: (message: string | null) => void;
  setBusy: (busy: boolean) => void;
  busy: boolean;
  refreshDocs: () => Promise<void>;
  setTab: SetTab;
  tab: AppTab;
}) {
  const { setError, setBusy, busy, refreshDocs, setTab, tab } = opts;
  const api = useLocalragApi();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{
    text: string;
    citations: CitationRow[];
    otherRetrieved: CitationRow[];
  } | null>(null);
  const [asking, setAsking] = useState(false);
  const [showOtherRetrieved, setShowOtherRetrieved] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const sourcesCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (answer) setShowOtherRetrieved(false);
  }, [answer]);

  useEffect(() => {
    if (!answer) setSourcesOpen(false);
  }, [answer]);

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
  }, [tab, asking, answer, lastPrompt]);

  const onIngest = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.ingestPick();
      if (!res.ok || !res.results) return;
      const failed = res.results.filter((r) => !r.ok);
      if (failed.length) {
        setError(failed.map((f) => `${f.path}: ${f.error ?? "error"}`).join("\n"));
      }
      await refreshDocs();
      setTab("library");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [api, refreshDocs, setBusy, setError, setTab]);

  const onAsk = useCallback(async () => {
    const q = question.trim();
    if (!q) return;
    setLastPrompt(q);
    setQuestion("");
    setBusy(true);
    setAsking(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await api.ask(q);
      setAnswer({
        text: res.text,
        citations: res.citations ?? [],
        otherRetrieved: res.otherRetrieved ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setQuestion(q);
    } finally {
      setAsking(false);
      setBusy(false);
    }
  }, [api, question, setBusy, setError]);

  const onQuestionKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!busy && !asking && question.trim()) void onAsk();
      }
    },
    [asking, busy, onAsk, question],
  );

  return {
    question,
    setQuestion,
    answer,
    asking,
    showOtherRetrieved,
    setShowOtherRetrieved,
    sourcesOpen,
    setSourcesOpen,
    lastPrompt,
    chatScrollRef,
    sourcesCloseRef,
    onIngest,
    onAsk,
    onQuestionKeyDown,
  };
}
