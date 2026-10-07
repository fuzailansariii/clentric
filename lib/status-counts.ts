/**
 * Turns `SELECT status, count(*) ... GROUP BY status` rows into a complete
 * record — every status present, zero when nothing matched — so filter tabs
 * can show a count for each status without undefined checks.
 */
export function toStatusCounts<S extends string>(
  statuses: readonly S[],
  rows: { status: string; value: number }[],
): Record<S, number> {
  const counts = Object.fromEntries(
    statuses.map((status) => [status, 0]),
  ) as Record<S, number>;

  for (const row of rows) {
    if (row.status in counts) {
      counts[row.status as S] += Number(row.value);
    }
  }

  return counts;
}

export function sumStatusCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, value) => sum + value, 0);
}
