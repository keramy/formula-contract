/**
 * Formula Contract - API Load Test
 * ================================
 * Tests the Supabase API endpoints directly to measure database performance.
 *
 * Usage:
 *   k6 run api-test.js                    # Default (medium load)
 *   k6 run -e SCENARIO=light api-test.js  # Light load (10 users)
 *   k6 run -e SCENARIO=heavy api-test.js  # Heavy load (50 users)
 *   k6 run -e SCENARIO=stress api-test.js # Stress test (100 users)
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// Configuration
const SUPABASE_URL = "https://lsuiaqrpkhejeavsrsqc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdWlhcXJwa2hlamVhdnNyc3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTIyNDcsImV4cCI6MjA4NDMyODI0N30.3vwSeWtDkpL6HUIiAJgJ4aoIpsLzkIzCXBkI041AFk8";

// Custom metrics for detailed analysis
const projectsListDuration = new Trend("projects_list_duration", true);
const scopeItemsDuration = new Trend("scope_items_duration", true);
const clientsDuration = new Trend("clients_duration", true);
const authDuration = new Trend("auth_duration", true);
const apiErrors = new Rate("api_errors");
const totalRequests = new Counter("total_requests");

// Scenario selection based on environment variable
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
    api_test: scenarios[selectedScenario] || scenarios.medium,
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],           // Less than 1% errors
    http_req_duration: ["p(95)<500"],         // 95% under 500ms
    projects_list_duration: ["p(95)<300"],    // Projects API under 300ms
    scope_items_duration: ["p(95)<400"],      // Scope items under 400ms
    api_errors: ["rate<0.05"],                // Less than 5% API errors
  },
};

// Common headers for Supabase requests
const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

export default function () {
  // Simulate a typical user session

  group("1. List Projects", function () {
    const startTime = Date.now();
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/projects?select=*,client:clients(id,company_name)&is_deleted=eq.false&order=created_at.desc`,
      { headers }
    );

    const duration = Date.now() - startTime;
    projectsListDuration.add(duration);
    totalRequests.add(1);

    const success = check(res, {
      "projects: status 200": (r) => r.status === 200,
      "projects: has data": (r) => r.json() !== null,
      "projects: response time < 500ms": () => duration < 500,
    });

    if (!success) apiErrors.add(1);
    else apiErrors.add(0);

    sleep(1); // Think time between actions
  });

  group("2. List Clients", function () {
    const startTime = Date.now();
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/clients?select=*&is_deleted=eq.false&order=company_name`,
      { headers }
    );

    const duration = Date.now() - startTime;
    clientsDuration.add(duration);
    totalRequests.add(1);

    const success = check(res, {
      "clients: status 200": (r) => r.status === 200,
      "clients: response time < 300ms": () => duration < 300,
    });

    if (!success) apiErrors.add(1);
    else apiErrors.add(0);

    sleep(0.5);
  });

  group("3. Get Scope Items (with joins)", function () {
    // This is typically the heaviest query - scope items with parent/child relationships
    const startTime = Date.now();
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/scope_items?select=*&is_deleted=eq.false&order=item_code`,
      { headers }
    );

    const duration = Date.now() - startTime;
    scopeItemsDuration.add(duration);
    totalRequests.add(1);

    const success = check(res, {
      "scope_items: status 200": (r) => r.status === 200,
      "scope_items: has data": (r) => r.json() !== null,
      "scope_items: response time < 500ms": () => duration < 500,
    });

    if (!success) apiErrors.add(1);
    else apiErrors.add(0);

    sleep(1);
  });

  group("4. Get Materials", function () {
    const startTime = Date.now();
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/materials?select=*&is_deleted=eq.false`,
      { headers }
    );

    const duration = Date.now() - startTime;
    totalRequests.add(1);

    const success = check(res, {
      "materials: status 200": (r) => r.status === 200,
      "materials: response time < 300ms": () => duration < 300,
    });

    if (!success) apiErrors.add(1);
    else apiErrors.add(0);

    sleep(0.5);
  });

  group("5. Get Drawings with Revisions", function () {
    const startTime = Date.now();
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/drawings?select=*,revisions:drawing_revisions(*)`,
      { headers }
    );

    const duration = Date.now() - startTime;
    totalRequests.add(1);

    const success = check(res, {
      "drawings: status 200": (r) => r.status === 200,
      "drawings: response time < 400ms": () => duration < 400,
    });

    if (!success) apiErrors.add(1);
    else apiErrors.add(0);

    sleep(0.5);
  });

  group("6. Get Reports", function () {
    const startTime = Date.now();
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/reports?select=*,lines:report_lines(*)&order=created_at.desc`,
      { headers }
    );

    const duration = Date.now() - startTime;
    totalRequests.add(1);

    const success = check(res, {
      "reports: status 200": (r) => r.status === 200,
      "reports: response time < 400ms": () => duration < 400,
    });

    if (!success) apiErrors.add(1);
    else apiErrors.add(0);

    sleep(1);
  });

  // Simulate user reading/thinking between page loads
  sleep(Math.random() * 2 + 1); // 1-3 seconds random delay
}

export function handleSummary(data) {
  // Custom summary output
  const summary = {
    timestamp: new Date().toISOString(),
    scenario: selectedScenario,
    metrics: {
      total_requests: data.metrics.total_requests?.values?.count || 0,
      failed_requests: data.metrics.http_req_failed?.values?.rate || 0,
      avg_response_time: data.metrics.http_req_duration?.values?.avg || 0,
      p95_response_time: data.metrics.http_req_duration?.values["p(95)"] || 0,
      p99_response_time: data.metrics.http_req_duration?.values["p(99)"] || 0,
      projects_p95: data.metrics.projects_list_duration?.values["p(95)"] || 0,
      scope_items_p95: data.metrics.scope_items_duration?.values["p(95)"] || 0,
    },
  };

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    "results/api-test-summary.json": JSON.stringify(summary, null, 2),
  };
}

// Helper function for text summary (k6 built-in)
function textSummary(data, options) {
  // This returns the default k6 summary
  return `
================================================================================
                         LOAD TEST RESULTS - ${selectedScenario.toUpperCase()}
================================================================================

Scenario: ${selectedScenario}
Virtual Users: ${scenarios[selectedScenario].stages.map(s => s.target).join(" → ")}

Key Metrics:
  Total Requests:     ${data.metrics.total_requests?.values?.count || "N/A"}
  Failed Requests:    ${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%

Response Times:
  Average:            ${(data.metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms
  P95:                ${(data.metrics.http_req_duration?.values["p(95)"] || 0).toFixed(2)}ms
  P99:                ${(data.metrics.http_req_duration?.values["p(99)"] || 0).toFixed(2)}ms

API Endpoints:
  Projects List P95:  ${(data.metrics.projects_list_duration?.values["p(95)"] || 0).toFixed(2)}ms
  Scope Items P95:    ${(data.metrics.scope_items_duration?.values["p(95)"] || 0).toFixed(2)}ms
  Clients P95:        ${(data.metrics.clients_duration?.values["p(95)"] || 0).toFixed(2)}ms

Thresholds:
  http_req_failed:    ${data.metrics.http_req_failed?.thresholds ? "✓ PASSED" : "✗ FAILED"}
  http_req_duration:  ${data.metrics.http_req_duration?.thresholds ? "✓ PASSED" : "✗ FAILED"}

================================================================================
`;
}
