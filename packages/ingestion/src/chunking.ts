export type TextChunk = {
  index: number;
  content: string;
  charStart: number;
  charEnd: number;
};

export function chunkText(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
): TextChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length === 0) return [];

  const size = Math.max(200, chunkSize);
  const overlap = Math.min(Math.max(0, chunkOverlap), Math.floor(size / 2));
  const step = Math.max(1, size - overlap);

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;
  while (start < normalized.length) {
    const end = Math.min(normalized.length, start + size);
    const content = normalized.slice(start, end).trim();
    if (content.length > 0) {
      chunks.push({
        index,
        content,
        charStart: start,
        charEnd: end,
      });
      index += 1;
    }
    if (end >= normalized.length) break;
    start += step;
  }
  return chunks;
}
