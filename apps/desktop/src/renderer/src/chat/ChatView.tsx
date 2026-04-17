import type { KeyboardEventHandler, RefObject } from "react";
import type { CitationRow } from "../api/types.js";
import { SourcesModal } from "./SourcesModal.js";
import chatStyles from "./ChatView.module.css";

export type ChatViewProps = {
  busy: boolean;
  docsCount: number;
  question: string;
  setQuestion: (v: string) => void;
  onQuestionKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  lastPrompt: string | null;
  asking: boolean;
  answer: {
    text: string;
    citations: CitationRow[];
    otherRetrieved: CitationRow[];
  } | null;
  sourcesOpen: boolean;
  setSourcesOpen: (v: boolean) => void;
  showOtherRetrieved: boolean;
  setShowOtherRetrieved: (v: boolean | ((prev: boolean) => boolean)) => void;
  onIngest: () => void | Promise<void>;
  onAsk: () => void | Promise<void>;
  chatScrollRef: RefObject<HTMLDivElement | null>;
  sourcesCloseRef: RefObject<HTMLButtonElement | null>;
};

export function ChatView({
  busy,
  docsCount,
  question,
  setQuestion,
  onQuestionKeyDown,
  lastPrompt,
  asking,
  answer,
  sourcesOpen,
  setSourcesOpen,
  showOtherRetrieved,
  setShowOtherRetrieved,
  onIngest,
  onAsk,
  chatScrollRef,
  sourcesCloseRef,
}: ChatViewProps) {
  return (
    <>
      <div className="chat-layout">
        <div className="chat-scroll" ref={chatScrollRef}>
          <div className="content-narrow">
            {!lastPrompt && !asking && !answer ? (
              <div className="chat-hero">
                <h1 className="chat-hero-title">Ask your documents</h1>
                <p className="chat-hero-lead">
                  Answers are grounded in your library and include citations you can open in context.
                </p>
                {docsCount === 0 ? (
                  <button type="button" className="primary" disabled={busy} onClick={() => void onIngest()}>
                    Add your first documents
                  </button>
                ) : null}
              </div>
            ) : null}

            {lastPrompt ? (
              <section className="answer-section" aria-label="Conversation">
                <div className="thread-user-turn">
                  <span className="thread-label">You</span>
                  <div className="thread-bubble thread-bubble-user thread-bubble-sent">{lastPrompt}</div>
                </div>

                {asking && !answer ? (
                  <div className="thread-assistant-turn">
                    <span className="thread-label">Assistant</span>
                    <div
                      className="thread-bubble thread-bubble-assistant thread-bubble-pending"
                      aria-live="polite"
                      aria-busy="true"
                    >
                      <div className="pending-reply">
                        <span className="spinner" aria-hidden />
                        <span>Retrieving context and drafting a reply…</span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {answer ? (
                  <>
                    <div className="thread-assistant-turn">
                      <span className="thread-label">Assistant</span>
                      <div className="thread-bubble thread-bubble-assistant">
                        <div className="answer-body">{answer.text}</div>
                      </div>
                    </div>

                    <div className={chatStyles.sourcesTriggerWrap}>
                      <button
                        type="button"
                        className={chatStyles.sourcesOpenBtn}
                        onClick={() => setSourcesOpen(true)}
                      >
                        <span className={chatStyles.sourcesOpenLabel}>View sources</span>
                        <span className={chatStyles.sourcesOpenMeta}>
                          {(answer.citations ?? []).length} cited
                          {(answer.otherRetrieved ?? []).length > 0
                            ? ` · ${(answer.otherRetrieved ?? []).length} more retrieved`
                            : ""}
                        </span>
                      </button>
                    </div>
                  </>
                ) : null}
              </section>
            ) : null}
          </div>
        </div>

        <div className="chat-dock">
          <div className="content-narrow chat-dock-inner">
            <div className="composer" aria-busy={asking}>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={onQuestionKeyDown}
                placeholder="Message your library…"
                disabled={asking}
                rows={3}
                aria-label="Message for the library"
              />
              <div className="composer-footer">
                <div className="row ask-actions">
                  <button
                    type="button"
                    className="primary"
                    disabled={busy || asking || !question.trim()}
                    onClick={() => void onAsk()}
                  >
                    Send
                  </button>
                  {asking ? (
                    <span className="composer-status" aria-live="polite">
                      <span className="spinner" aria-hidden />
                      Working…
                    </span>
                  ) : null}
                </div>
                {asking ? null : (
                  <span className="kbd-hint">
                    <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>Enter</kbd>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SourcesModal
        open={sourcesOpen}
        answer={answer}
        showOtherRetrieved={showOtherRetrieved}
        setShowOtherRetrieved={setShowOtherRetrieved}
        onClose={() => setSourcesOpen(false)}
        closeButtonRef={sourcesCloseRef}
      />
    </>
  );
}
