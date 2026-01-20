// Load Test Configuration for Formula Contract App
// =================================================

// Your app's base URL (change this when testing production)
export const BASE_URL = "http://localhost:3000";

// Supabase configuration for direct API testing
export const SUPABASE_URL = "https://lsuiaqrpkhejeavsrsqc.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdWlhcXJwa2hlamVhdnNyc3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTIyNDcsImV4cCI6MjA4NDMyODI0N30.3vwSeWtDkpL6HUIiAJgJ4aoIpsLzkIzCXBkI041AFk8";

// Test user credentials (create a test user for load testing)
export const TEST_USER = {
  email: "loadtest@formula.com",
  password: "LoadTest123!",
};

// Performance thresholds - what we consider acceptable
export const THRESHOLDS = {
  // HTTP errors should be less than 1%
  http_req_failed: ["rate<0.01"],
  // 95% of requests should complete within 500ms
  http_req_duration: ["p(95)<500", "p(99)<1000"],
  // Page load should be under 2 seconds
  page_load: ["p(95)<2000"],
  // API calls should be under 300ms
  api_duration: ["p(95)<300"],
};

// Load test scenarios
export const SCENARIOS = {
  // Light load - 10 concurrent users
  light: {
    executor: "ramping-vus",
    stages: [
      { duration: "30s", target: 10 },  // Ramp up to 10 users
      { duration: "1m", target: 10 },   // Stay at 10 users
      { duration: "30s", target: 0 },   // Ramp down
    ],
  },

  // Medium load - 25 concurrent users
  medium: {
    executor: "ramping-vus",
    stages: [
      { duration: "30s", target: 25 },
      { duration: "2m", target: 25 },
      { duration: "30s", target: 0 },
    ],
  },

  // Heavy load - 50 concurrent users
  heavy: {
    executor: "ramping-vus",
    stages: [
      { duration: "1m", target: 50 },
      { duration: "3m", target: 50 },
      { duration: "1m", target: 0 },
    ],
  },

  // Stress test - 100 concurrent users
  stress: {
    executor: "ramping-vus",
    stages: [
      { duration: "1m", target: 25 },
      { duration: "1m", target: 50 },
      { duration: "1m", target: 75 },
      { duration: "1m", target: 100 },
      { duration: "3m", target: 100 },  // Hold at max
      { duration: "2m", target: 0 },    // Ramp down
    ],
  },

  // Breakpoint test - find the breaking point
  breakpoint: {
    executor: "ramping-vus",
    stages: [
      { duration: "2m", target: 50 },
      { duration: "2m", target: 100 },
      { duration: "2m", target: 150 },
      { duration: "2m", target: 200 },
      { duration: "2m", target: 250 },
      // Keep going until it breaks...
    ],
  },
};
