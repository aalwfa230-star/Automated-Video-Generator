/**
 * async-pool.ts — bounded concurrency for IO-bound pipeline stages.
 *
 * Several agentic stages verify media by spawning ffprobe/ffmpeg per
 * candidate. Run serially, a 20-scene x 4-candidate job spawns ~80
 * subprocesses one after another — the dominant cost of a run on a
 * low-RAM machine. `mapPool` keeps identical ordering semantics while
 * capping how many run at once, so we get parallelism without melting
 * memory.
 */

/**
 * Map over `items` with at most `limit` concurrent invocations of `fn`.
 *
 * Results are returned in the SAME ORDER as `items` (not completion order),
 * so callers that rely on candidate ordering are unaffected.
 * A rejection propagates immediately (fail fast) — callers that want
 * best-effort should catch inside `fn`.
 */
export async function mapPool<T, R>(
    items: readonly T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
    const total = items.length;
    if (total === 0) return [];

    const width = Math.max(1, Math.min(Math.floor(limit) || 1, total));
    const out = new Array<R>(total);
    let cursor = 0;

    const worker = async (): Promise<void> => {
        for (;;) {
            const i = cursor++;
            if (i >= total) return;
            out[i] = await fn(items[i], i);
        }
    };

    await Promise.all(Array.from({ length: width }, worker));
    return out;
}

/**
 * Sensible default concurrency for subprocess-bound work.
 *
 * Deliberately conservative: each ffprobe/ffmpeg spawn can cost a few hundred
 * MB, so we trade some throughput for not OOMing on 6GB boxes. Override via
 * the AGENTIC_VERIFY_CONCURRENCY env var.
 */
export function subprocessConcurrency(fallback = 4): number {
    const raw = process.env.AGENTIC_VERIFY_CONCURRENCY;
    if (raw !== undefined && raw.trim() !== '') {
        const n = Number.parseInt(raw, 10);
        if (Number.isFinite(n) && n > 0) return Math.min(n, 16);
    }
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const cpus = (require('os').cpus() ?? []).length;
        if (cpus > 0) return Math.max(2, Math.min(cpus, fallback));
    } catch {
        /* ignore */
    }
    return fallback;
}
