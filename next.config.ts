import type { NextConfig } from "next";
import { execSync } from "child_process";

// Get version info at build time
const packageVersion = process.env.npm_package_version || "0.1.0";

// Try to get git info (works in CI and local dev)
let gitCommitSha = "";
let gitBranch = "";
try {
  gitCommitSha = process.env.VERCEL_GIT_COMMIT_SHA
    || execSync("git rev-parse --short HEAD").toString().trim();
  gitBranch = process.env.VERCEL_GIT_COMMIT_REF
    || execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
} catch {
  // Git not available, use fallbacks
  gitCommitSha = "dev";
  gitBranch = "local";
}

const nextConfig: NextConfig = {
  // Inject version info as environment variables at build time
  env: {
    NEXT_PUBLIC_APP_VERSION: packageVersion,
    NEXT_PUBLIC_GIT_SHA: gitCommitSha,
    NEXT_PUBLIC_GIT_BRANCH: gitBranch,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lsuiaqrpkhejeavsrsqc.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // ============================================================================
  // PERFORMANCE & SERVER CONFIG
  // ============================================================================
  experimental: {
    // Increase body size limit for Server Actions (PDF uploads with photos)
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // Optimize barrel imports for large icon/component libraries
    // Before: import { Icon } from "lucide-react" loads ALL 1000+ icons
    // After:  Automatically transforms to direct imports, loading only used icons
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-icons",
    ],
  },
};

export default nextConfig;
