import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  // PERFORMANCE: Optimize barrel imports for large icon/component libraries
  // Before: import { Icon } from "lucide-react" loads ALL 1000+ icons
  // After:  Automatically transforms to direct imports, loading only used icons
  // Impact: ~15-20% smaller bundle size for pages with many icons
  // ============================================================================
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-icons",
    ],
  },
};

export default nextConfig;
