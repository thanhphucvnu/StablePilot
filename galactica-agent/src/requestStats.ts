const byPath: Record<string, number> = {};
let total = 0;

export function recordRequest(path: string): void {
  total += 1;
  const key = path.split("?")[0] || path;
  byPath[key] = (byPath[key] ?? 0) + 1;
}

export function getRequestStats(): {
  totalRequestsSinceBoot: number;
  topPaths: { path: string; count: number }[];
} {
  const topPaths = Object.entries(byPath)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25);
  return { totalRequestsSinceBoot: total, topPaths };
}
