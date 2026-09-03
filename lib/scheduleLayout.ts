// Side-by-side layout for overlapping schedule items.
//
// Pure and dependency-free so the day grid stays a thin rendering layer, and so
// this can be unit tested once a test runner exists.

export type TimeSpan = {
  start: Date;
  end: Date;
};

export type LaidOutItem<T> = T & {
  /** Zero-based column within the item's overlap cluster. */
  column: number;
  /** Total columns in that cluster, i.e. how many ways to split the width. */
  columnCount: number;
};

/**
 * Assigns each item a column so overlapping items sit beside each other instead
 * of on top of each other.
 *
 * Items are swept in start order and grouped into clusters of transitively
 * overlapping items. Within a cluster an item reuses the first column whose
 * previous item has already ended, so a run of back-to-back appointments stays
 * full width. Every item in a cluster shares that cluster's column count, which
 * keeps their left edges aligned.
 *
 * Touching items (one ends exactly as the next begins) do not overlap.
 */
export function layoutScheduleItems<T extends TimeSpan>(
  items: T[]
): LaidOutItem<T>[] {
  const sorted = [...items].sort((a, b) => {
    const startDiff = a.start.getTime() - b.start.getTime();
    if (startDiff !== 0) return startDiff;
    return b.end.getTime() - a.end.getTime();
  });

  const result: LaidOutItem<T>[] = [];

  let cluster: LaidOutItem<T>[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = Number.NEGATIVE_INFINITY;

  function flushCluster() {
    if (cluster.length === 0) return;

    const columnCount = columnEnds.length;
    for (const item of cluster) {
      item.columnCount = columnCount;
    }

    result.push(...cluster);
    cluster = [];
    columnEnds = [];
    clusterEnd = Number.NEGATIVE_INFINITY;
  }

  for (const item of sorted) {
    const start = item.start.getTime();
    const end = item.end.getTime();

    // Starting at or after every item so far means a fresh, independent cluster.
    if (start >= clusterEnd) {
      flushCluster();
    }

    let column = columnEnds.findIndex((columnEnd) => columnEnd <= start);

    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(end);
    } else {
      columnEnds[column] = end;
    }

    cluster.push({ ...item, column, columnCount: 1 });
    clusterEnd = Math.max(clusterEnd, end);
  }

  flushCluster();

  return result;
}
