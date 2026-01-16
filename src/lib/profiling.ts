/**
 * Performance Profiling Utilities
 *
 * Use these to identify slow database queries and data fetching.
 * Results are logged to the server console.
 *
 * Usage:
 *   const result = await profileQuery("fetch users", async () => {
 *     return await supabase.from("users").select("*");
 *   });
 *
 * Enable/disable with environment variable:
 *   ENABLE_PROFILING=true npm run dev
 */

const ENABLE_PROFILING = process.env.ENABLE_PROFILING === "true" || process.env.NODE_ENV === "development";

interface ProfileResult<T> {
  data: T;
  duration: number;
  label: string;
}

// Store timing results for analysis
const timingResults: Map<string, number[]> = new Map();

/**
 * Profile a single async operation
 */
export async function profileQuery<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!ENABLE_PROFILING) {
    return fn();
  }

  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  // Store for aggregate analysis
  const existing = timingResults.get(label) || [];
  existing.push(duration);
  timingResults.set(label, existing);

  // Color-code based on duration
  const color = duration > 1000 ? "🔴" : duration > 500 ? "🟠" : duration > 100 ? "🟡" : "🟢";

  console.log(`${color} [PROFILE] ${label}: ${duration.toFixed(2)}ms`);

  return result;
}

/**
 * Profile multiple operations in parallel and log total time
 * Note: For simpler profiling, use inline console.time() instead
 */
export async function profileParallel<T>(
  label: string,
  operations: Array<{ name: string; fn: () => Promise<T> }>
): Promise<T[]> {
  if (!ENABLE_PROFILING) {
    return Promise.all(operations.map((op) => op.fn()));
  }

  const start = performance.now();
  console.log(`\n📊 [PROFILE] Starting: ${label}`);
  console.log("─".repeat(50));

  const results = await Promise.all(
    operations.map(async (op) => {
      const opStart = performance.now();
      const result = await op.fn();
      const opDuration = performance.now() - opStart;

      const color = opDuration > 1000 ? "🔴" : opDuration > 500 ? "🟠" : opDuration > 100 ? "🟡" : "🟢";
      console.log(`  ${color} ${op.name}: ${opDuration.toFixed(2)}ms`);

      return result;
    })
  );

  const totalDuration = performance.now() - start;
  console.log("─".repeat(50));
  console.log(`📊 [PROFILE] Total ${label}: ${totalDuration.toFixed(2)}ms\n`);

  return results;
}

/**
 * Get timing summary for all profiled operations
 */
export function getProfilingSummary(): Record<string, { avg: number; min: number; max: number; count: number }> {
  const summary: Record<string, { avg: number; min: number; max: number; count: number }> = {};

  timingResults.forEach((times, label) => {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    summary[label] = { avg, min, max, count: times.length };
  });

  return summary;
}

/**
 * Log a summary of all profiled operations
 */
export function logProfilingSummary(): void {
  if (!ENABLE_PROFILING || timingResults.size === 0) return;

  console.log("\n" + "=".repeat(60));
  console.log("📈 PROFILING SUMMARY");
  console.log("=".repeat(60));

  const summary = getProfilingSummary();
  const sortedLabels = Object.keys(summary).sort(
    (a, b) => summary[b].avg - summary[a].avg
  );

  sortedLabels.forEach((label) => {
    const { avg, min, max, count } = summary[label];
    const color = avg > 1000 ? "🔴" : avg > 500 ? "🟠" : avg > 100 ? "🟡" : "🟢";
    console.log(
      `${color} ${label}: avg=${avg.toFixed(0)}ms, min=${min.toFixed(0)}ms, max=${max.toFixed(0)}ms (${count} calls)`
    );
  });

  console.log("=".repeat(60) + "\n");
}

/**
 * Clear stored timing results
 */
export function clearProfilingData(): void {
  timingResults.clear();
}

/**
 * Decorator for profiling class methods
 */
export function Profile(label?: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return profileQuery(label || propertyKey, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}
