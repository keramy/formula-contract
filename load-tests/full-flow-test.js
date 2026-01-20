/**
 * Formula Contract - Full User Flow Load Test
 * ============================================
 * Simulates authenticated users navigating through the app.
 * Tests: Login → Dashboard → Projects → Project Details → Scope Items
 *
 * Usage:
 *   k6 run full-flow-test.js                    # Default (medium load - 25 users)
 *   k6 run -e SCENARIO=light full-flow-test.js  # Light load (10 users)
 *   k6 run -e SCENARIO=heavy full-flow-test.js  # Heavy load (50 users)
 *   k6 run -e SCENARIO=stress full-flow-test.js # Stress test (100 users)
 */

import http from "k6/http";
import { check, group, sleep, fail } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const SUPABASE_URL = "https://lsuiaqrpkhejeavsrsqc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdWlhcXJwa2hlamVhdnNyc3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTIyNDcsImV4cCI6MjA4NDMyODI0N30.3vwSeWtDkpL6HUIiAJgJ4aoIpsLzkIzCXBkI041AFk8";

// Test user credentials
const TEST_USER = {
  email: "admin@formulacontract.com",
  password: "Admin123!",
};

// ============================================================================
// CUSTOM METRICS
// ============================================================================

const loginDuration = new Trend("login_duration", true);
const dashboardDuration = new Trend("dashboard_duration", true);
const projectsPageDuration = new Trend("projects_page_duration", true);
const projectDetailDuration = new Trend("project_detail_duration", true);
const scopeItemsApiDuration = new Trend("scope_items_api_duration", true);
const errorRate = new Rate("errors");
const requestCount = new Counter("requests");

// ============================================================================
// SCENARIOS
// ============================================================================

const scenarios = {
  light: {
    executor: "ramping-vus",
    stages: [
      { duration: "30s", target: 10 },
      { duration: "1m", target: 10 },
      { duration: "30s", target: 0 },
    ],
  },
  medium: {
    executor: "ramping-vus",
    stages: [
      { duration: "30s", target: 25 },
      { duration: "2m", target: 25 },
      { duration: "30s", target: 0 },
    ],
  },
  heavy: {
    executor: "ramping-vus",
    stages: [
      { duration: "1m", target: 50 },
      { duration: "3m", target: 50 },
      { duration: "1m", target: 0 },
    ],
  },
  stress: {
    executor: "ramping-vus",
    stages: [
      { duration: "1m", target: 25 },
      { duration: "1m", target: 50 },
      { duration: "1m", target: 75 },
      { duration: "1m", target: 100 },
      { duration: "3m", target: 100 },
      { duration: "2m", target: 0 },
    ],
  },
};

const selectedScenario = __ENV.SCENARIO || "medium";

export const options = {
  scenarios: {
    user_flow: scenarios[selectedScenario] || scenarios.medium,
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],              // Less than 5% errors
    http_req_duration: ["p(95)<2000"],           // 95% under 2s (SSR pages)
    login_duration: ["p(95)<1000"],              // Login under 1s
    dashboard_duration: ["p(95)<1500"],          // Dashboard under 1.5s
    projects_page_duration: ["p(95)<1500"],      // Projects page under 1.5s
    project_detail_duration: ["p(95)<2000"],     // Project detail under 2s
    scope_items_api_duration: ["p(95)<500"],     // API calls under 500ms
    errors: ["rate<0.1"],                        // Less than 10% errors
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function supabaseHeaders(accessToken = null) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else {
    headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  }
  return headers;
}

function login() {
  const startTime = Date.now();

  const res = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
    }
  );

  const duration = Date.now() - startTime;
  loginDuration.add(duration);
  requestCount.add(1);

  // Parse JSON response
  let jsonBody = null;
  try {
    jsonBody = res.json();
  } catch (e) {
    console.error(`Failed to parse login response: ${e}`);
  }

  const success = check(res, {
    "login: status 200": (r) => r.status === 200,
    "login: has access_token": () => jsonBody && jsonBody.access_token,
    "login: response time < 1s": () => duration < 1000,
  });

  if (!success || !jsonBody || !jsonBody.access_token) {
    errorRate.add(1);
    console.error(`Login failed: ${res.status}`);
    return null;
  }

  errorRate.add(0);
  return jsonBody.access_token;
}

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================

export default function () {
  let accessToken = null;

  // Step 1: Login
  group("1. User Login", function () {
    accessToken = login();
    if (!accessToken) {
      fail("Login failed - cannot continue test");
    }
    sleep(1);
  });

  const headers = supabaseHeaders(accessToken);

  // Step 2: Load Dashboard (get user profile)
  group("2. Load Dashboard", function () {
    const startTime = Date.now();

    const res = http.get(
      `${SUPABASE_URL}/rest/v1/users?select=*&limit=1`,
      { headers }
    );

    const duration = Date.now() - startTime;
    dashboardDuration.add(duration);
    requestCount.add(1);

    const success = check(res, {
      "dashboard: status 200": (r) => r.status === 200,
      "dashboard: response time < 500ms": () => duration < 500,
    });

    errorRate.add(success ? 0 : 1);
    sleep(2); // User looks at dashboard
  });

  // Step 3: Navigate to Projects List
  group("3. Projects List", function () {
    const startTime = Date.now();

    const res = http.get(
      `${SUPABASE_URL}/rest/v1/projects?select=*,client:clients(id,company_name)&is_deleted=eq.false&order=created_at.desc`,
      { headers }
    );

    const duration = Date.now() - startTime;
    projectsPageDuration.add(duration);
    requestCount.add(1);

    const success = check(res, {
      "projects: status 200": (r) => r.status === 200,
      "projects: is array": (r) => Array.isArray(r.json()),
      "projects: response time < 500ms": () => duration < 500,
    });

    errorRate.add(success ? 0 : 1);

    // Store project IDs for later use
    const projects = res.json();
    if (projects && projects.length > 0) {
      // Pick a random project to view details
      const randomProject = projects[Math.floor(Math.random() * projects.length)];
      __ENV.CURRENT_PROJECT_ID = randomProject.id;
    }

    sleep(2); // User browses project list
  });

  // Step 4: View Project Details
  group("4. Project Details", function () {
    // First, get projects to have a valid ID
    const projectsRes = http.get(
      `${SUPABASE_URL}/rest/v1/projects?select=id&is_deleted=eq.false&limit=1`,
      { headers }
    );

    const projects = projectsRes.json();
    if (!projects || projects.length === 0) {
      console.warn("No projects found - skipping project details");
      return;
    }

    const projectId = projects[0].id;
    const startTime = Date.now();

    // Get project with all related data
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/projects?select=*,client:clients(*)&id=eq.${projectId}`,
      { headers }
    );

    const duration = Date.now() - startTime;
    projectDetailDuration.add(duration);
    requestCount.add(1);

    const success = check(res, {
      "project detail: status 200": (r) => r.status === 200,
      "project detail: response time < 500ms": () => duration < 500,
    });

    errorRate.add(success ? 0 : 1);
    sleep(1);
  });

  // Step 5: Load Scope Items (the heaviest query)
  group("5. Scope Items List", function () {
    // Get project ID first
    const projectsRes = http.get(
      `${SUPABASE_URL}/rest/v1/projects?select=id&is_deleted=eq.false&limit=1`,
      { headers }
    );

    const projects = projectsRes.json();
    if (!projects || projects.length === 0) {
      return;
    }

    const projectId = projects[0].id;
    const startTime = Date.now();

    const res = http.get(
      `${SUPABASE_URL}/rest/v1/scope_items?select=*&project_id=eq.${projectId}&is_deleted=eq.false&order=item_code`,
      { headers }
    );

    const duration = Date.now() - startTime;
    scopeItemsApiDuration.add(duration);
    requestCount.add(1);

    const success = check(res, {
      "scope items: status 200": (r) => r.status === 200,
      "scope items: is array": (r) => Array.isArray(r.json()),
      "scope items: response time < 500ms": () => duration < 500,
    });

    errorRate.add(success ? 0 : 1);
    sleep(3); // User reviews scope items
  });

  // Step 6: Load Materials for project
  group("6. Materials List", function () {
    const projectsRes = http.get(
      `${SUPABASE_URL}/rest/v1/projects?select=id&is_deleted=eq.false&limit=1`,
      { headers }
    );

    const projects = projectsRes.json();
    if (!projects || projects.length === 0) return;

    const projectId = projects[0].id;
    const startTime = Date.now();

    const res = http.get(
      `${SUPABASE_URL}/rest/v1/materials?select=*&project_id=eq.${projectId}&is_deleted=eq.false`,
      { headers }
    );

    const duration = Date.now() - startTime;
    requestCount.add(1);

    const success = check(res, {
      "materials: status 200": (r) => r.status === 200,
      "materials: response time < 300ms": () => duration < 300,
    });

    errorRate.add(success ? 0 : 1);
    sleep(2);
  });

  // Step 7: Load Drawings
  group("7. Drawings List", function () {
    const startTime = Date.now();

    const res = http.get(
      `${SUPABASE_URL}/rest/v1/drawings?select=*,item:scope_items(id,item_code,name),revisions:drawing_revisions(*)`,
      { headers }
    );

    const duration = Date.now() - startTime;
    requestCount.add(1);

    const success = check(res, {
      "drawings: status 200": (r) => r.status === 200,
      "drawings: response time < 500ms": () => duration < 500,
    });

    errorRate.add(success ? 0 : 1);
    sleep(2);
  });

  // Simulate user idle time before next session
  sleep(Math.random() * 3 + 2); // 2-5 seconds
}

// ============================================================================
// SUMMARY
// ============================================================================

export function handleSummary(data) {
  const scenario = selectedScenario;
  const stages = scenarios[scenario].stages;
  const maxVUs = Math.max(...stages.map(s => s.target));

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    FORMULA CONTRACT - LOAD TEST RESULTS                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Scenario: ${scenario.toUpperCase().padEnd(66)}║
║  Max Virtual Users: ${String(maxVUs).padEnd(57)}║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESPONSE TIMES                                                              ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║  Login:              p95 = ${String((data.metrics.login_duration?.values["p(95)"] || 0).toFixed(0) + "ms").padEnd(50)}║
║  Dashboard:          p95 = ${String((data.metrics.dashboard_duration?.values["p(95)"] || 0).toFixed(0) + "ms").padEnd(50)}║
║  Projects Page:      p95 = ${String((data.metrics.projects_page_duration?.values["p(95)"] || 0).toFixed(0) + "ms").padEnd(50)}║
║  Project Detail:     p95 = ${String((data.metrics.project_detail_duration?.values["p(95)"] || 0).toFixed(0) + "ms").padEnd(50)}║
║  Scope Items API:    p95 = ${String((data.metrics.scope_items_api_duration?.values["p(95)"] || 0).toFixed(0) + "ms").padEnd(50)}║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RELIABILITY                                                                 ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║  Total Requests:     ${String(data.metrics.requests?.values?.count || 0).padEnd(57)}║
║  Error Rate:         ${String(((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2) + "%").padEnd(57)}║
║  HTTP Failures:      ${String(((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2) + "%").padEnd(57)}║
╠══════════════════════════════════════════════════════════════════════════════╣
║  THRESHOLDS                                                                  ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║  ✓ = Passed, ✗ = Failed                                                      ║
║                                                                              ║
║  http_req_failed < 5%:      ${(data.metrics.http_req_failed?.values?.rate || 0) < 0.05 ? "✓ PASSED" : "✗ FAILED".padEnd(49)}║
║  login_duration p95 < 1s:   ${(data.metrics.login_duration?.values["p(95)"] || 0) < 1000 ? "✓ PASSED" : "✗ FAILED".padEnd(49)}║
║  scope_items p95 < 500ms:   ${(data.metrics.scope_items_api_duration?.values["p(95)"] || 0) < 500 ? "✓ PASSED" : "✗ FAILED".padEnd(49)}║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);

  return {
    "load-tests/results/summary.json": JSON.stringify({
      timestamp: new Date().toISOString(),
      scenario,
      maxVUs,
      metrics: {
        totalRequests: data.metrics.requests?.values?.count || 0,
        errorRate: data.metrics.errors?.values?.rate || 0,
        httpFailRate: data.metrics.http_req_failed?.values?.rate || 0,
        responseTimes: {
          login_p95: data.metrics.login_duration?.values["p(95)"] || 0,
          dashboard_p95: data.metrics.dashboard_duration?.values["p(95)"] || 0,
          projects_p95: data.metrics.projects_page_duration?.values["p(95)"] || 0,
          scopeItems_p95: data.metrics.scope_items_api_duration?.values["p(95)"] || 0,
        },
      },
    }, null, 2),
  };
}
