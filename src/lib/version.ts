// App version info - injected at build time from next.config.ts

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0";
export const GIT_SHA = process.env.NEXT_PUBLIC_GIT_SHA || "dev";
export const GIT_BRANCH = process.env.NEXT_PUBLIC_GIT_BRANCH || "local";
export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();

/**
 * Get formatted version string for display
 * Examples:
 * - Production: "v1.2.0"
 * - Development: "v1.2.0-dev (abc123)"
 */
export function getVersionDisplay(): string {
  const isProduction = GIT_BRANCH === "main" || GIT_BRANCH === "master";

  if (isProduction) {
    return `v${APP_VERSION}`;
  }

  // Include short SHA for non-production builds
  const shortSha = GIT_SHA.substring(0, 7);
  return `v${APP_VERSION}-${GIT_BRANCH} (${shortSha})`;
}

/**
 * Get full version info for debugging/about page
 */
export function getFullVersionInfo() {
  return {
    version: APP_VERSION,
    gitSha: GIT_SHA,
    gitBranch: GIT_BRANCH,
    buildTime: BUILD_TIME,
    displayVersion: getVersionDisplay(),
  };
}
