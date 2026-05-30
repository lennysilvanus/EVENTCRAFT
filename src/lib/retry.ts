/**
 * Retries an async operation with exponential backoff.
 * Use for non-idempotent side effects (email, payout) where silent failure
 * is worse than a brief delay.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delayMs?: number;
    label?: string;
  } = {}
): Promise<T> {
  const { retries = 3, delayMs = 500, label = "operation" } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) {
        console.error(`[retry] ${label} failed after ${retries} attempts:`, err);
        throw err;
      }
      const wait = delayMs * 2 ** (attempt - 1); // 500ms, 1s, 2s
      console.warn(`[retry] ${label} attempt ${attempt} failed — retrying in ${wait}ms`);
      await new Promise(resolve => setTimeout(resolve, wait));
    }
  }
  throw new Error(`${label}: unreachable`);
}
