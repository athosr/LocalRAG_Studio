import type { ReactNode } from "react";

const BOLD_SEGMENT = /\*\*([^*]+)\*\*/g;

/** Renders assistant reply text with **bold** segments (no `*` inside a bold span). */
export function renderAnswerWithBold(text: string): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = BOLD_SEGMENT.exec(text)) !== null) {
    if (m.index > last) {
      out.push(text.slice(last, m.index));
    }
    out.push(
      <strong key={`b${k++}`} className="answer-strong">
        {m[1]}
      </strong>,
    );
    last = BOLD_SEGMENT.lastIndex;
  }
  if (last < text.length) {
    out.push(text.slice(last));
  }
  return out.length > 0 ? out : text;
}
