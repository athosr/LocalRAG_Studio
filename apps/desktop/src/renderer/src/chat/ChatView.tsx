import type { KeyboardEventHandler, RefObject } from "react";
import type { ChatMessageViewModel, CitationRow } from "../api/types.js";
import { renderAnswerWithBold } from "../lib/renderAnswerBold.js";
import { SourcesModal } from "./SourcesModal.js";
import chatStyles from "./ChatView.module.css";

export type ChatViewProps = {
  busy: boolean;
  docsCount: number;
  question: string;
  setQuestion: (v: string) => void;
  onQuestionKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  messages: ChatMessageViewModel[];
  asking: boolean;
  sourcesOpen: boolean;
  setSourcesOpen: (v: boolean) => void;
  showOtherRetrieved: boolean;
  setShowOtherRetrieved: (v: boolean | ((prev: boolean) => boolean)) => void;
  sourcesCitations: CitationRow[];
  sourcesOther: CitationRow[];
  onIngest: () => void | Promise<void>;
  onAsk: () => void | Promise<void>;
  onOpenSources: (m: ChatMessageViewModel) => void;
  chatScrollRef: RefObject<HTMLDivElement | null>;
  sourcesCloseRef: RefObject<HTMLButtonElement | null>;
};

export function ChatView({
  busy,
  docsCount,
  question,
  setQuestion,
  onQuestionKeyDown,
  messages,
  asking,
  sourcesOpen,
  setSourcesOpen,
  showOtherRetrieved,
  setShowOtherRetrieved,
  sourcesCitations,
  sourcesOther,
  onIngest,
  onAsk,
  onOpenSources,
  chatScrollRef,
  sourcesCloseRef,
}: ChatViewProps) {
  const showHero = messages.length === 0 && !asking;
  const hasSources = (m: ChatMessageViewModel) =>
    m.role === "assistant" &&
    ((m.metadata?.citations?.length ?? 0) > 0 || (m.metadata?.otherRetrieved?.length ?? 0) > 0);

  return (
    <>
      <div className="chat-layout">
        <div className="chat-scroll" ref={chatScrollRef}>
          <div className="content-narrow">
            {showHero ? (
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

            {messages.length > 0 || asking ? (
              <section className="answer-section" aria-label="Conversation">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <div className="thread-user-turn" key={m.id}>
                      <span className="thread-label">You</span>
                      <div className="thread-bubble thread-bubble-user thread-bubble-sent">{m.content}</div>
                    </div>
                  ) : (
                    <div className="thread-assistant-turn" key={m.id}>
                      <span className="thread-label">Assistant</span>
                      <div className="thread-bubble thread-bubble-assistant">
                        <div className="answer-body">{renderAnswerWithBold(m.content)}</div>
                      </div>
                      {hasSources(m) ? (
                        <div className={chatStyles.sourcesTriggerWrap}>
                          <button
                            type="button"
                            className={chatStyles.sourcesOpenBtn}
                            onClick={() => onOpenSources(m)}
                          >
                            <span className={chatStyles.sourcesOpenLabel}>View sources</span>
                            <span className={chatStyles.sourcesOpenMeta}>
                              {(m.metadata?.citations ?? []).length} cited
                              {(m.metadata?.otherRetrieved ?? []).length > 0
                                ? ` · ${(m.metadata?.otherRetrieved ?? []).length} more retrieved`
                                : ""}
                            </span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ),
                )}

                {asking ? (
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
                    <kbd>Enter</kbd> to send · <kbd>Shift</kbd> + <kbd>Enter</kbd> new line
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SourcesModal
        open={sourcesOpen}
        citations={sourcesCitations}
        otherRetrieved={sourcesOther}
        showOtherRetrieved={showOtherRetrieved}
        setShowOtherRetrieved={setShowOtherRetrieved}
        onClose={() => setSourcesOpen(false)}
        closeButtonRef={sourcesCloseRef}
      />
    </>
  );
}
