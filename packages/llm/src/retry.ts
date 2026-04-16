export async function withRetries<T>(
  fn: () => Promise<T>,
  opts: { attempts: number; baseMs: number; maxMs: number },
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < opts.attempts; i += 1) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i === opts.attempts - 1) break;
      const delay = Math.min(
        opts.maxMs,
        opts.baseMs * 2 ** i + Math.floor(Math.random() * 100),
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw last;
}
