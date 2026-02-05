/**
 * Formula Contract - CRUD Operations Load Test
 * =============================================
 * Tests Create, Read, Update, Delete operations under load.
 * Simulates real user workflows including edits and status changes.
 *
 * Usage:
 *   k6 run crud-test.js                    # Default (10 users)
 *   k6 run -e SCENARIO=medium crud-test.js # 25 users
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = "https://lsuiaqrpkhejeavsrsqc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdWlhcXJwa2hlamVhdnNyc3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTIyNDcsImV4cCI6MjA4NDMyODI0N30.3vwSeWtDkpL6HUIiAJgJ4aoIpsLzkIzCXBkI041AFk8";

const TEST_USER = {
  email: "admin@formulacontract.com",
  password: "Admin123!",
};

// ============================================================================
// CUSTOM METRICS
// ============================================================================

const createDuration = new Trend("create_duration", true);
const readDuration = new Trend("read_duration", true);
const updateDuration = new Trend("update_duration", true);
const deleteDuration = new Trend("delete_duration", true);
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
      { duration: "2m", target: 10 },
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
};

const selectedScenario = __ENV.SCENARIO || "light";

export const options = {
  scenarios: {
    crud_test: scenarios[selectedScenario] || scenarios.light,
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    create_duration: ["p(95)<1000"],  // Creates under 1s
    read_duration: ["p(95)<500"],     // Reads under 500ms
    update_duration: ["p(95)<1000"],  // Updates under 1s
    delete_duration: ["p(95)<1000"],  // Deletes under 1s
    errors: ["rate<0.1"],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getHeaders(accessToken) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

function login() {
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

  let jsonBody = null;
  try {
    jsonBody = res.json();
  } catch {
    return null;
  }

  if (res.status === 200 && jsonBody && jsonBody.access_token) {
    return jsonBody.access_token;
  }
  return null;
}

function getProjectId(headers) {
  const res = http.get(
    `${SUPABASE_URL}/rest/v1/projects?select=id&is_deleted=eq.false&limit=1`,
    { headers }
  );
  const projects = res.json();
  if (projects && projects.length > 0) {
    return projects[0].id;
  }
  return null;
}

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================

// eslint-disable-next-line import/no-anonymous-default-export
export default function () {
  // Login first
  const accessToken = login();
  if (!accessToken) {
    errorRate.add(1);
    sleep(1);
    return;
  }
  errorRate.add(0);

  const headers = getHeaders(accessToken);
  const projectId = getProjectId(headers);

  if (!projectId) {
    console.warn("No project found");
    sleep(1);
    return;
  }

  // Generate unique identifiers for this iteration
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // =========================================================================
  // TEST 1: CREATE - Create a new scope item
  // =========================================================================
  let createdItemId = null;

  group("1. CREATE - New Scope Item", function () {
    const startTime = Date.now();

    const newItem = {
      project_id: projectId,
      item_code: `TEST-${uniqueId}`,
      name: `Load Test Item ${uniqueId}`,
      description: "Created by load test - will be deleted",
      quantity: 1,
      unit: "pcs",
      status: "pending",
      item_path: "production",
    };

    const res = http.post(
      `${SUPABASE_URL}/rest/v1/scope_items`,
      JSON.stringify(newItem),
      { headers }
    );

    const duration = Date.now() - startTime;
    createDuration.add(duration);
    requestCount.add(1);

    const success = check(res, {
      "create: status 201": (r) => r.status === 201,
      "create: has id": (r) => {
        try {
          const data = r.json();
          if (data && data[0] && data[0].id) {
            createdItemId = data[0].id;
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
      "create: under 1s": () => duration < 1000,
    });

    errorRate.add(success ? 0 : 1);
    sleep(0.5);
  });

  // =========================================================================
  // TEST 2: READ - Read the created item
  // =========================================================================
  group("2. READ - Get Scope Item", function () {
    if (!createdItemId) return;

    const startTime = Date.now();

    const res = http.get(
      `${SUPABASE_URL}/rest/v1/scope_items?id=eq.${createdItemId}&select=*`,
      { headers }
    );

    const duration = Date.now() - startTime;
    readDuration.add(duration);
    requestCount.add(1);

    const success = check(res, {
      "read: status 200": (r) => r.status === 200,
      "read: has data": (r) => {
        try {
          const data = r.json();
          return data && data.length > 0;
        } catch {
          return false;
        }
      },
      "read: under 500ms": () => duration < 500,
    });

    errorRate.add(success ? 0 : 1);
    sleep(0.5);
  });

  // =========================================================================
  // TEST 3: UPDATE - Update the scope item (change status)
  // =========================================================================
  group("3. UPDATE - Change Status", function () {
    if (!createdItemId) return;

    const startTime = Date.now();

    const updateData = {
      status: "in_production",
      production_percentage: 50,
      notes: `Updated by load test at ${new Date().toISOString()}`,
    };

    const res = http.patch(
      `${SUPABASE_URL}/rest/v1/scope_items?id=eq.${createdItemId}`,
      JSON.stringify(updateData),
      { headers }
    );

    const duration = Date.now() - startTime;
    updateDuration.add(duration);
    requestCount.add(1);

    const success = check(res, {
      "update: status 200": (r) => r.status === 200,
      "update: under 1s": () => duration < 1000,
    });

    errorRate.add(success ? 0 : 1);
    sleep(0.5);
  });

  // =========================================================================
  // TEST 4: UPDATE - Update quantity and price
  // =========================================================================
  group("4. UPDATE - Change Quantity/Price", function () {
    if (!createdItemId) return;

    const startTime = Date.now();

    const updateData = {
      quantity: 5,
      unit_sales_price: 1000.00,
      total_sales_price: 5000.00,
    };

    const res = http.patch(
      `${SUPABASE_URL}/rest/v1/scope_items?id=eq.${createdItemId}`,
      JSON.stringify(updateData),
      { headers }
    );

    const duration = Date.now() - startTime;
    updateDuration.add(duration);
    requestCount.add(1);

    const success = check(res, {
      "update price: status 200": (r) => r.status === 200,
      "update price: under 1s": () => duration < 1000,
    });

    errorRate.add(success ? 0 : 1);
    sleep(0.5);
  });

  // =========================================================================
  // TEST 5: READ - Verify updates (read again)
  // =========================================================================
  group("5. READ - Verify Updates", function () {
    if (!createdItemId) return;

    const startTime = Date.now();

    const res = http.get(
      `${SUPABASE_URL}/rest/v1/scope_items?id=eq.${createdItemId}&select=*`,
      { headers }
    );

    const duration = Date.now() - startTime;
    readDuration.add(duration);
    requestCount.add(1);

    const success = check(res, {
      "verify: status 200": (r) => r.status === 200,
      "verify: quantity updated": (r) => {
        try {
          const data = r.json();
          return data && data[0] && data[0].quantity === 5;
        } catch {
          return false;
        }
      },
      "verify: under 500ms": () => duration < 500,
    });

    errorRate.add(success ? 0 : 1);
    sleep(0.5);
  });

  // =========================================================================
  // TEST 6: DELETE - Soft delete the item
  // =========================================================================
  group("6. DELETE - Soft Delete Item", function () {
    if (!createdItemId) return;

    const startTime = Date.now();

    // Soft delete by setting is_deleted = true
    const res = http.patch(
      `${SUPABASE_URL}/rest/v1/scope_items?id=eq.${createdItemId}`,
      JSON.stringify({ is_deleted: true }),
      { headers }
    );

    const duration = Date.now() - startTime;
    deleteDuration.add(duration);
    requestCount.add(1);

    const success = check(res, {
      "delete: status 200": (r) => r.status === 200,
      "delete: under 1s": () => duration < 1000,
    });

    errorRate.add(success ? 0 : 1);
    sleep(0.5);
  });

  // =========================================================================
  // TEST 7: READ - List all scope items (typical page load)
  // =========================================================================
  group("7. READ - List All Items", function () {
    const startTime = Date.now();

    const res = http.get(
      `${SUPABASE_URL}/rest/v1/scope_items?project_id=eq.${projectId}&is_deleted=eq.false&select=*&order=item_code`,
      { headers }
    );

    const duration = Date.now() - startTime;
    readDuration.add(duration);
    requestCount.add(1);

    const success = check(res, {
      "list: status 200": (r) => r.status === 200,
      "list: is array": (r) => Array.isArray(r.json()),
      "list: under 500ms": () => duration < 500,
    });

    errorRate.add(success ? 0 : 1);
    sleep(1);
  });

  // Simulate user think time
  sleep(Math.random() * 2 + 1);
}

// ============================================================================
// SUMMARY
// ============================================================================

export function handleSummary(data) {
  const scenario = selectedScenario;

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    CRUD OPERATIONS LOAD TEST RESULTS                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Scenario: ${scenario.toUpperCase().padEnd(66)}║
╠══════════════════════════════════════════════════════════════════════════════╣
║  OPERATION TIMES (p95)                                                       ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║  CREATE (insert):    ${String((data.metrics.create_duration?.values["p(95)"] || 0).toFixed(0) + "ms").padEnd(56)}║
║  READ (select):      ${String((data.metrics.read_duration?.values["p(95)"] || 0).toFixed(0) + "ms").padEnd(56)}║
║  UPDATE (patch):     ${String((data.metrics.update_duration?.values["p(95)"] || 0).toFixed(0) + "ms").padEnd(56)}║
║  DELETE (soft):      ${String((data.metrics.delete_duration?.values["p(95)"] || 0).toFixed(0) + "ms").padEnd(56)}║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RELIABILITY                                                                 ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║  Total Requests:     ${String(data.metrics.requests?.values?.count || 0).padEnd(57)}║
║  Error Rate:         ${String(((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2) + "%").padEnd(57)}║
║  HTTP Failures:      ${String(((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2) + "%").padEnd(57)}║
╠══════════════════════════════════════════════════════════════════════════════╣
║  THRESHOLDS                                                                  ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║  CREATE < 1s:        ${(data.metrics.create_duration?.values["p(95)"] || 0) < 1000 ? "✓ PASSED" : "✗ FAILED".padEnd(56)}║
║  READ < 500ms:       ${(data.metrics.read_duration?.values["p(95)"] || 0) < 500 ? "✓ PASSED" : "✗ FAILED".padEnd(56)}║
║  UPDATE < 1s:        ${(data.metrics.update_duration?.values["p(95)"] || 0) < 1000 ? "✓ PASSED" : "✗ FAILED".padEnd(56)}║
║  DELETE < 1s:        ${(data.metrics.delete_duration?.values["p(95)"] || 0) < 1000 ? "✓ PASSED" : "✗ FAILED".padEnd(56)}║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);

  return {};
}
