import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mock Setup — Supabase chainable query builder
// ============================================================================

// Terminal result that all chains eventually resolve to
let mockTerminalResult: { data: unknown; error: unknown; count?: number | null } = {
  data: null,
  error: null,
};

// Track what methods were called and with what args
const mockCalls: { method: string; args: unknown[] }[] = [];

// Auth mock state
let mockUser: { id: string; email: string } | null = {
  id: "test-user-id",
  email: "finance@test.com",
};

// Role mock state (getUserRoleFromJWT)
let mockUserRole = "admin";

// Track .from() calls to return different results for auth vs data queries
let fromCallCount = 0;
let fromResultOverrides: Map<number, { data: unknown; error: unknown; count?: number | null }> =
  new Map();

/**
 * Creates a chainable mock that records method calls and returns itself
 * until a terminal method is called (which returns the result).
 */
function createChainMock(
  callLog: typeof mockCalls,
  terminalResultFn: () => { data: unknown; error: unknown; count?: number | null }
) {
  const chain: Record<string, unknown> = {};

  const methods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "in",
    "order",
    "single",
    "maybeSingle",
    "is",
    "neq",
    "gte",
    "lte",
    "lt",
    "like",
    "ilike",
    "match",
    "filter",
    "limit",
    "range",
    "head",
    "not",
  ];

  for (const method of methods) {
    chain[method] = vi.fn((...args: unknown[]) => {
      callLog.push({ method, args });
      // "single", "maybeSingle", and "head" are terminal — return a Promise
      if (method === "single" || method === "maybeSingle" || method === "head") {
        return Promise.resolve(terminalResultFn());
      }
      // Otherwise return the chain (and also make it thenable for terminal-less queries)
      return Object.assign(chain, {
        then: (resolve: (v: unknown) => void) => resolve(terminalResultFn()),
      });
    });
  }

  return chain;
}

// The mock Supabase client factory
function createMockClient(
  callLog: typeof mockCalls,
  terminalResultFn: () => { data: unknown; error: unknown; count?: number | null }
) {
  return {
    from: vi.fn((_table: string) => {
      const callIdx = fromCallCount++;
      callLog.push({ method: "from", args: [_table] });
      // If there's an override for this specific from() call, use it
      const override = fromResultOverrides.get(callIdx);
      if (override) {
        return createChainMock(callLog, () => override);
      }
      return createChainMock(callLog, terminalResultFn);
    }),
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: mockUser },
          error: null,
        })
      ),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://cdn.test.com/file.pdf" } })),
        remove: vi.fn(() => Promise.resolve({ error: null })),
      })),
    },
  };
}

// Mock @/lib/supabase/server
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve(
      createMockClient(mockCalls, () => mockTerminalResult)
    )
  ),
  getUserRoleFromJWT: vi.fn(() => Promise.resolve(mockUserRole)),
}));

// Mock sanitize (passthrough — sanitize.test.ts tests this separately)
vi.mock("@/lib/sanitize", () => ({
  sanitizeText: vi.fn((v: string) => v),
}));

// Mock activity logging (no-op)
vi.mock("@/lib/activity-log/actions", () => ({
  logActivity: vi.fn(() => Promise.resolve()),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock Resend for notification tests
const mockResendSend = vi.fn(() => Promise.resolve({ data: { id: "mock-email-id" }, error: null }));
vi.mock("resend", () => {
  return {
    Resend: class MockResend {
      emails = { send: mockResendSend };
      batch = { send: vi.fn(() => Promise.resolve({ error: null })) };
    },
  };
});

// Mock email templates
vi.mock("@/emails/finance-summary-email", () => ({
  FinanceSummaryEmail: vi.fn(() => "mock-summary-email"),
}));

vi.mock("@/emails/finance-urgent-email", () => ({
  FinanceUrgentEmail: vi.fn(() => "mock-urgent-email"),
}));

// Mock PDF generator
vi.mock("@/lib/pdf/generate-payment-schedule-pdf", () => ({
  generatePaymentSchedulePdf: vi.fn(() => Promise.resolve(Buffer.from("mock-pdf"))),
}));

// Mock notification creation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCreateNotification = vi.fn((_input: any) => Promise.resolve());
vi.mock("@/lib/notifications/actions", () => ({
  createNotification: (input: unknown) => mockCreateNotification(input),
}));

// ============================================================================
// Import server actions AFTER mocks are set up
// ============================================================================

import {
  checkFinanceAccess,
  getCategories,
  createCategory,
  deleteCategory,
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  createInvoice,
  deleteInvoice,
  approveInvoice,
  rejectInvoice,
  recordPayment,
  deletePayment,
  getRecurringTemplates,
  createRecurringTemplate,
  processRecurringTemplates,
  grantFinanceAccess,
  revokeFinanceAccess,
  getAvailableUsers,
  sendWeeklyDigestEmails,
  notifyTeamUrgent,
} from "../finance";

import { logActivity } from "@/lib/activity-log/actions";
import { revalidatePath } from "next/cache";

// ============================================================================
// Test Data Factories
// ============================================================================

const SUPPLIER_ID = "supplier-001";
const INVOICE_ID = "invoice-001";
const CATEGORY_ID = "category-001";
const PAYMENT_ID = "payment-001";
const TEMPLATE_ID = "template-001";

function makeSupplier(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: SUPPLIER_ID,
    supplier_code: "SUP-001",
    name: "Acme Materials",
    contact_person: "John Doe",
    phone: "+90 555 1234",
    email: "john@acme.com",
    category: "raw_materials",
    tax_id: "1234567890",
    iban: "TR330006100519786457841326",
    bank_name: "Ziraat Bankasi",
    address: "Istanbul, Turkey",
    notes: null,
    is_deleted: false,
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-03-01T10:00:00Z",
    ...overrides,
  };
}

function makeInvoice(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: INVOICE_ID,
    invoice_code: "INV-001",
    supplier_id: SUPPLIER_ID,
    category_id: CATEGORY_ID,
    project_id: null,
    invoice_number: "F-2026-001",
    invoice_date: "2026-03-01",
    due_date: "2026-03-31",
    total_amount: 10000,
    currency: "TRY",
    vat_rate: 20,
    vat_amount: 2000,
    description: "Raw material order",
    requires_approval: false,
    has_installments: false,
    approved_by: null,
    approved_at: null,
    rejection_reason: null,
    status: "pending",
    notes: null,
    is_deleted: false,
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-03-01T10:00:00Z",
    ...overrides,
  };
}

function makeCategory(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: CATEGORY_ID,
    name: "Raw Materials",
    type: "expense",
    color: "#ff6b6b",
    is_deleted: false,
    created_at: "2026-03-01T10:00:00Z",
    ...overrides,
  };
}

function makeTemplate(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TEMPLATE_ID,
    supplier_id: SUPPLIER_ID,
    category_id: CATEGORY_ID,
    description: "Monthly rent",
    amount: 5000,
    currency: "TRY",
    frequency: "monthly",
    day_of_month: 15,
    next_due_date: "2026-03-15",
    requires_approval: false,
    is_active: true,
    is_deleted: false,
    created_at: "2026-03-01T10:00:00Z",
    ...overrides,
  };
}

// ============================================================================
// Helper: set up finance_access mock for requireFinanceAccess
// ============================================================================

/**
 * Sets up the fromResultOverrides so that the first .from("finance_access")
 * call returns the desired access data. Call index 0 is the finance_access
 * auth check; subsequent calls are the actual data queries.
 */
function setFinanceAccessResult(canApprove = true) {
  // The first .from() call in requireFinanceAccess is to "finance_access"
  fromResultOverrides.set(0, {
    data: { can_approve: canApprove },
    error: null,
  });
}

function setFinanceAccessDenied() {
  fromResultOverrides.set(0, {
    data: null,
    error: null,
  });
}

// ============================================================================
// Reset mocks before each test
// ============================================================================

beforeEach(() => {
  mockTerminalResult = { data: null, error: null };
  mockCalls.length = 0;
  mockUser = { id: "test-user-id", email: "finance@test.com" };
  mockUserRole = "admin";
  fromCallCount = 0;
  fromResultOverrides = new Map();
  mockResendSend.mockResolvedValue({ data: { id: "mock-email-id" }, error: null });
  mockCreateNotification.mockResolvedValue(undefined);
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.NEXT_PUBLIC_SITE_URL = "https://test.com";
  vi.clearAllMocks();
});

// ============================================================================
// Auth Guards
// ============================================================================

describe("Auth Guards", () => {
  describe("checkFinanceAccess", () => {
    it("returns true when user is in whitelist", async () => {
      mockTerminalResult = { data: { id: "access-1" }, error: null };

      const result = await checkFinanceAccess();

      expect(result).toBe(true);
    });

    it("returns false when user is not in whitelist", async () => {
      mockTerminalResult = { data: null, error: null };

      const result = await checkFinanceAccess();

      expect(result).toBe(false);
    });

    it("returns false when user is not authenticated", async () => {
      mockUser = null;

      const result = await checkFinanceAccess();

      expect(result).toBe(false);
    });
  });

  describe("requireFinanceAccess", () => {
    it("blocks unauthenticated users", async () => {
      mockUser = null;

      const result = await getCategories();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("blocks non-whitelisted users", async () => {
      setFinanceAccessDenied();

      const result = await getCategories();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authorized");
    });

    it("blocks users without can_approve when approval required", async () => {
      setFinanceAccessResult(false); // can_approve = false

      const result = await approveInvoice(INVOICE_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Approval permission required");
    });

    it("allows users with can_approve when approval required", async () => {
      setFinanceAccessResult(true);
      mockTerminalResult = { data: null, error: null };

      const result = await approveInvoice(INVOICE_ID);

      // Should succeed (no DB error)
      expect(result.success).toBe(true);
    });
  });

  describe("requireAdmin", () => {
    it("blocks non-admin roles", async () => {
      mockUserRole = "pm";

      const result = await getAvailableUsers();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Admin required");
    });

    it("allows admin role", async () => {
      mockUserRole = "admin";
      mockTerminalResult = {
        data: [{ id: "u1", name: "Admin", email: "admin@test.com", role: "admin" }],
        error: null,
      };

      const result = await getAvailableUsers();

      expect(result.success).toBe(true);
    });

    it("blocks unauthenticated users from admin actions", async () => {
      mockUser = null;

      const result = await grantFinanceAccess("user-id", true);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });
  });
});

// ============================================================================
// Supplier CRUD
// ============================================================================

describe("Supplier CRUD", () => {
  it("createSupplier creates with sanitized name and returns id", async () => {
    setFinanceAccessResult(true);
    mockTerminalResult = { data: { id: SUPPLIER_ID }, error: null };

    const result = await createSupplier({
      name: "  Acme Materials  ",
      contact_person: "John",
      phone: "+90 555 1234",
      email: "john@acme.com",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: SUPPLIER_ID });
    // Verify from("finance_suppliers") was called
    const fromCalls = mockCalls.filter(
      (c) => c.method === "from" && c.args[0] === "finance_suppliers"
    );
    expect(fromCalls.length).toBeGreaterThanOrEqual(1);
    // Verify activity logged
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "finance_supplier_created",
        entityType: "finance_supplier",
        entityId: SUPPLIER_ID,
      })
    );
    // Verify revalidation
    expect(revalidatePath).toHaveBeenCalledWith("/payments");
  });

  it("createSupplier blocks unauthenticated user", async () => {
    mockUser = null;

    const result = await createSupplier({ name: "Test" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("createSupplier returns error on DB failure", async () => {
    setFinanceAccessResult(true);
    mockTerminalResult = { data: null, error: { message: "duplicate key" } };

    const result = await createSupplier({ name: "Acme" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("duplicate key");
  });

  it("updateSupplier updates with sanitized fields", async () => {
    setFinanceAccessResult(true);
    mockTerminalResult = { data: null, error: null };

    const result = await updateSupplier(SUPPLIER_ID, {
      name: "Updated Acme",
      contact_person: "Jane",
    });

    expect(result.success).toBe(true);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "finance_supplier_updated",
        entityId: SUPPLIER_ID,
      })
    );
  });

  it("deleteSupplier soft deletes (sets is_deleted = true)", async () => {
    setFinanceAccessResult(true);
    mockTerminalResult = { data: null, error: null };

    const result = await deleteSupplier(SUPPLIER_ID);

    expect(result.success).toBe(true);
    // Check that update was called (not delete)
    const updateCalls = mockCalls.filter((c) => c.method === "update");
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    // Verify the update arg includes is_deleted: true
    const updateArg = updateCalls[0].args[0] as Record<string, unknown>;
    expect(updateArg.is_deleted).toBe(true);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "finance_supplier_deleted",
        entityId: SUPPLIER_ID,
      })
    );
  });
});

// ============================================================================
// Invoice CRUD
// ============================================================================

describe("Invoice CRUD", () => {
  it("createInvoice sets status to 'awaiting_approval' when requires_approval is true", async () => {
    setFinanceAccessResult(true);
    mockTerminalResult = { data: { id: INVOICE_ID }, error: null };

    const result = await createInvoice({
      supplier_id: SUPPLIER_ID,
      invoice_date: "2026-03-01",
      due_date: "2026-03-31",
      total_amount: 10000,
      currency: "TRY",
      vat_rate: 20,
      requires_approval: true,
      has_installments: false,
    });

    expect(result.success).toBe(true);
    // Check the insert call contains status: "awaiting_approval"
    const insertCalls = mockCalls.filter((c) => c.method === "insert");
    expect(insertCalls.length).toBeGreaterThanOrEqual(1);
    const insertArg = insertCalls[0].args[0] as Record<string, unknown>;
    expect(insertArg.status).toBe("awaiting_approval");
  });

  it("createInvoice sets status to 'pending' when requires_approval is false", async () => {
    setFinanceAccessResult(true);
    mockTerminalResult = { data: { id: INVOICE_ID }, error: null };

    const result = await createInvoice({
      supplier_id: SUPPLIER_ID,
      invoice_date: "2026-03-01",
      due_date: "2026-03-31",
      total_amount: 5000,
      currency: "USD",
      vat_rate: 0,
      requires_approval: false,
      has_installments: false,
    });

    expect(result.success).toBe(true);
    const insertCalls = mockCalls.filter((c) => c.method === "insert");
    const insertArg = insertCalls[0].args[0] as Record<string, unknown>;
    expect(insertArg.status).toBe("pending");
  });

  it("createInvoice creates installments when has_installments is true", async () => {
    setFinanceAccessResult(true);
    mockTerminalResult = { data: { id: INVOICE_ID }, error: null };

    const installments = [
      { amount: 3000, due_date: "2026-04-01" },
      { amount: 3000, due_date: "2026-05-01" },
      { amount: 4000, due_date: "2026-06-01" },
    ];

    const result = await createInvoice({
      supplier_id: SUPPLIER_ID,
      invoice_date: "2026-03-01",
      due_date: "2026-03-31",
      total_amount: 10000,
      currency: "TRY",
      vat_rate: 0,
      requires_approval: false,
      has_installments: true,
      installments,
    });

    expect(result.success).toBe(true);
    // Should have two inserts: 1 for invoice, 1 for installments
    const insertCalls = mockCalls.filter((c) => c.method === "insert");
    expect(insertCalls.length).toBeGreaterThanOrEqual(2);
    // Second insert should be the installment rows
    const installmentInsert = insertCalls[1].args[0] as Array<Record<string, unknown>>;
    expect(installmentInsert).toHaveLength(3);
    expect(installmentInsert[0].installment_number).toBe(1);
    expect(installmentInsert[0].amount).toBe(3000);
    expect(installmentInsert[2].installment_number).toBe(3);
    // When installments, due_date should be last installment's due_date
    const invoiceInsert = insertCalls[0].args[0] as Record<string, unknown>;
    expect(invoiceInsert.due_date).toBe("2026-06-01");
  });

  it("createInvoice calculates VAT amount from total_amount * vat_rate", async () => {
    setFinanceAccessResult(true);
    mockTerminalResult = { data: { id: INVOICE_ID }, error: null };

    await createInvoice({
      supplier_id: SUPPLIER_ID,
      invoice_date: "2026-03-01",
      due_date: "2026-03-31",
      total_amount: 10000,
      currency: "TRY",
      vat_rate: 18,
      requires_approval: false,
      has_installments: false,
    });

    const insertCalls = mockCalls.filter((c) => c.method === "insert");
    const insertArg = insertCalls[0].args[0] as Record<string, unknown>;
    // vat_amount = 10000 * 18 / 100 = 1800
    expect(insertArg.vat_amount).toBe(1800);
  });

  it("createInvoice logs activity with amount and currency", async () => {
    setFinanceAccessResult(true);
    mockTerminalResult = { data: { id: INVOICE_ID }, error: null };

    await createInvoice({
      supplier_id: SUPPLIER_ID,
      invoice_date: "2026-03-01",
      due_date: "2026-03-31",
      total_amount: 7500,
      currency: "EUR",
      vat_rate: 0,
      requires_approval: false,
      has_installments: false,
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "finance_invoice_created",
        entityType: "finance_invoice",
        entityId: INVOICE_ID,
        details: expect.objectContaining({ amount: 7500, currency: "EUR" }),
      })
    );
  });

  it("deleteInvoice soft deletes", async () => {
    setFinanceAccessResult(true);
    mockTerminalResult = { data: null, error: null };

    const result = await deleteInvoice(INVOICE_ID);

    expect(result.success).toBe(true);
    const updateCalls = mockCalls.filter((c) => c.method === "update");
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    const updateArg = updateCalls[0].args[0] as Record<string, unknown>;
    expect(updateArg.is_deleted).toBe(true);
  });
});

// ============================================================================
// Payment Recording
// ============================================================================

describe("Payment Recording", () => {
  it("recordPayment validates amount does not exceed remaining balance", async () => {
    setFinanceAccessResult(true);
    // First from call after auth: finance_invoices (get total_amount)
    fromResultOverrides.set(1, {
      data: { total_amount: 10000 },
      error: null,
    });
    // Second from call after auth: finance_payments (existing payments)
    fromResultOverrides.set(2, {
      data: [{ amount: 8000 }],
      error: null,
    });

    const result = await recordPayment({
      direction: "outgoing",
      invoice_id: INVOICE_ID,
      amount: 3000, // remaining is 2000, 3000 > 2000
      currency: "TRY",
      payment_date: "2026-03-20",
      payment_method: "bank_transfer",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Amount exceeds remaining balance");
  });

  it("recordPayment succeeds when amount is within remaining balance", async () => {
    setFinanceAccessResult(true);
    // from(1): finance_invoices — get total_amount for validation
    fromResultOverrides.set(1, {
      data: { total_amount: 10000 },
      error: null,
    });
    // from(2): finance_payments — existing payments for validation
    fromResultOverrides.set(2, {
      data: [{ amount: 5000 }],
      error: null,
    });
    // from(3): finance_payments — insert payment (terminal = single)
    fromResultOverrides.set(3, {
      data: { id: PAYMENT_ID },
      error: null,
    });
    // from(4): finance_invoices — updateInvoicePaymentStatus reads invoice
    fromResultOverrides.set(4, {
      data: { total_amount: 10000, status: "pending" },
      error: null,
    });
    // from(5): finance_payments — updateInvoicePaymentStatus reads all payments
    fromResultOverrides.set(5, {
      data: [{ amount: 5000 }, { amount: 4000 }],
      error: null,
    });
    // from(6): finance_invoices — updateInvoicePaymentStatus updates status
    mockTerminalResult = { data: null, error: null };

    const result = await recordPayment({
      direction: "outgoing",
      invoice_id: INVOICE_ID,
      amount: 4000, // remaining is 5000, 4000 <= 5000
      currency: "TRY",
      payment_date: "2026-03-20",
      payment_method: "bank_transfer",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: PAYMENT_ID });
  });

  it("recordPayment returns error when amount > remaining for incoming receivable", async () => {
    setFinanceAccessResult(true);
    // Receivable total
    fromResultOverrides.set(1, {
      data: { total_amount: 5000 },
      error: null,
    });
    // Existing payments for receivable
    fromResultOverrides.set(2, {
      data: [{ amount: 4500 }],
      error: null,
    });

    const result = await recordPayment({
      direction: "incoming",
      receivable_id: "rec-001",
      amount: 600, // remaining is 500, 600 > 500.01
      currency: "TRY",
      payment_date: "2026-03-20",
      payment_method: "bank_transfer",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Amount exceeds remaining balance");
  });

  it("recordPayment logs activity with amount and currency", async () => {
    setFinanceAccessResult(true);
    // No invoice validation (no invoice_id for standalone payment)
    mockTerminalResult = { data: { id: PAYMENT_ID }, error: null };

    await recordPayment({
      direction: "outgoing",
      amount: 1000,
      currency: "USD",
      payment_date: "2026-03-20",
      payment_method: "credit_card",
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "finance_payment_recorded",
        entityType: "finance_payment",
        details: expect.objectContaining({ amount: 1000, currency: "USD" }),
      })
    );
  });

  it("recordPayment logs 'finance_payment_received' for incoming direction", async () => {
    setFinanceAccessResult(true);
    mockTerminalResult = { data: { id: PAYMENT_ID }, error: null };

    await recordPayment({
      direction: "incoming",
      amount: 2000,
      currency: "TRY",
      payment_date: "2026-03-20",
      payment_method: "bank_transfer",
    });

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "finance_payment_received",
      })
    );
  });

  it("recordPayment blocks unauthenticated users", async () => {
    mockUser = null;

    const result = await recordPayment({
      direction: "outgoing",
      amount: 100,
      currency: "TRY",
      payment_date: "2026-03-20",
      payment_method: "cash",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("deletePayment soft deletes and revalidates", async () => {
    setFinanceAccessResult(true);
    mockTerminalResult = { data: { invoice_id: null, receivable_id: null }, error: null };

    const result = await deletePayment(PAYMENT_ID);

    expect(result.success).toBe(true);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "finance_payment_deleted",
        entityId: PAYMENT_ID,
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith("/payments");
  });
});

// ============================================================================
// Approval Flow
// ============================================================================

describe("Approval Flow", () => {
  it("approveInvoice only works for users with can_approve permission", async () => {
    setFinanceAccessResult(false); // can_approve = false

    const result = await approveInvoice(INVOICE_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Approval permission required");
  });

  it("approveInvoice succeeds and sets approved_by, approved_at, clears rejection_reason", async () => {
    setFinanceAccessResult(true); // can_approve = true
    mockTerminalResult = { data: null, error: null };

    const result = await approveInvoice(INVOICE_ID);

    expect(result.success).toBe(true);
    // Check that update was called with approval fields
    const updateCalls = mockCalls.filter((c) => c.method === "update");
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    const updateArg = updateCalls[0].args[0] as Record<string, unknown>;
    expect(updateArg.status).toBe("approved");
    expect(updateArg.approved_by).toBe("test-user-id");
    expect(updateArg.approved_at).toBeDefined();
    expect(updateArg.rejection_reason).toBeNull();
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "finance_invoice_approved",
        entityId: INVOICE_ID,
      })
    );
  });

  it("rejectInvoice requires reason minimum 3 characters", async () => {
    setFinanceAccessResult(true);

    const result = await rejectInvoice(INVOICE_ID, "No");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Rejection reason is required (min 3 characters)");
  });

  it("rejectInvoice rejects with empty reason", async () => {
    setFinanceAccessResult(true);

    const result = await rejectInvoice(INVOICE_ID, "");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Rejection reason is required (min 3 characters)");
  });

  it("rejectInvoice succeeds with valid reason", async () => {
    setFinanceAccessResult(true);
    mockTerminalResult = { data: null, error: null };

    const result = await rejectInvoice(INVOICE_ID, "Incorrect amount on line items");

    expect(result.success).toBe(true);
    const updateCalls = mockCalls.filter((c) => c.method === "update");
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    const updateArg = updateCalls[0].args[0] as Record<string, unknown>;
    expect(updateArg.status).toBe("pending");
    expect(updateArg.rejection_reason).toBe("Incorrect amount on line items");
    expect(updateArg.approved_by).toBeNull();
    expect(updateArg.approved_at).toBeNull();
  });

  it("rejectInvoice logs activity with reason", async () => {
    setFinanceAccessResult(true);
    mockTerminalResult = { data: null, error: null };

    await rejectInvoice(INVOICE_ID, "Budget exceeded");

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "finance_invoice_rejected",
        entityId: INVOICE_ID,
        details: { reason: "Budget exceeded" },
      })
    );
  });

  it("rejectInvoice blocks users without can_approve", async () => {
    setFinanceAccessResult(false);

    const result = await rejectInvoice(INVOICE_ID, "Some reason here");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Approval permission required");
  });
});

// ============================================================================
// Categories
// ============================================================================

describe("Categories", () => {
  it("getCategories returns categories filtered by is_deleted", async () => {
    setFinanceAccessResult(true);
    const categories = [makeCategory(), makeCategory({ id: "cat-2", name: "Services" })];
    mockTerminalResult = { data: categories, error: null };

    const result = await getCategories();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    // Verify is_deleted filter was applied
    const eqCalls = mockCalls.filter(
      (c) => c.method === "eq" && c.args[0] === "is_deleted" && c.args[1] === false
    );
    expect(eqCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("createCategory creates and returns id", async () => {
    setFinanceAccessResult(true);
    mockTerminalResult = { data: { id: CATEGORY_ID }, error: null };

    const result = await createCategory({
      name: "Office Supplies",
      type: "expense",
      color: "#4ecdc4",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: CATEGORY_ID });
    expect(revalidatePath).toHaveBeenCalledWith("/payments");
  });

  it("deleteCategory soft deletes", async () => {
    setFinanceAccessResult(true);
    mockTerminalResult = { data: null, error: null };

    const result = await deleteCategory(CATEGORY_ID);

    expect(result.success).toBe(true);
    const updateCalls = mockCalls.filter((c) => c.method === "update");
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    const updateArg = updateCalls[0].args[0] as Record<string, unknown>;
    expect(updateArg.is_deleted).toBe(true);
  });

  it("deleteCategory blocks non-whitelisted users", async () => {
    setFinanceAccessDenied();

    const result = await deleteCategory(CATEGORY_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authorized");
  });
});

// ============================================================================
// Recurring Templates
// ============================================================================

describe("Recurring Templates", () => {
  it("getRecurringTemplates returns active templates", async () => {
    setFinanceAccessResult(true);
    const templates = [makeTemplate()];
    mockTerminalResult = { data: templates, error: null };

    const result = await getRecurringTemplates();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("createRecurringTemplate creates and returns id", async () => {
    setFinanceAccessResult(true);
    mockTerminalResult = { data: { id: TEMPLATE_ID }, error: null };

    const result = await createRecurringTemplate({
      supplier_id: SUPPLIER_ID,
      description: "Monthly rent",
      amount: 5000,
      currency: "TRY",
      frequency: "monthly",
      day_of_month: 15,
      next_due_date: "2026-04-15",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: TEMPLATE_ID });
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "finance_recurring_created",
        entityType: "finance_recurring_template",
      })
    );
  });

  it("processRecurringTemplates creates invoices from templates where next_due_date <= today", async () => {
    setFinanceAccessResult(true);
    // Templates query returns 2 due templates
    const templates = [
      makeTemplate({ id: "t1", next_due_date: "2026-03-01", frequency: "monthly", day_of_month: 1 }),
      makeTemplate({ id: "t2", next_due_date: "2026-03-15", frequency: "quarterly", day_of_month: 15 }),
    ];
    // Override: first from() = finance_access auth, second from() = templates query
    fromResultOverrides.set(0, { data: { can_approve: true }, error: null });
    fromResultOverrides.set(1, { data: templates, error: null });
    mockTerminalResult = { data: null, error: null };

    const result = await processRecurringTemplates();

    expect(result.success).toBe(true);
    expect(result.data?.created).toBe(2);
    // Should have insert calls for invoices
    const insertCalls = mockCalls.filter((c) => c.method === "insert");
    expect(insertCalls.length).toBeGreaterThanOrEqual(2);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "finance_recurring_processed",
        details: expect.objectContaining({ created: 2, templates: 2 }),
      })
    );
  });

  it("processRecurringTemplates returns created: 0 when no templates due", async () => {
    setFinanceAccessResult(true);
    // Override: templates query returns empty
    fromResultOverrides.set(0, { data: { can_approve: true }, error: null });
    fromResultOverrides.set(1, { data: [], error: null });

    const result = await processRecurringTemplates();

    expect(result.success).toBe(true);
    expect(result.data?.created).toBe(0);
  });

  it("processRecurringTemplates advances next_due_date based on frequency", async () => {
    setFinanceAccessResult(true);
    const template = makeTemplate({
      id: "t1",
      next_due_date: "2026-03-15",
      frequency: "monthly",
      day_of_month: 15,
    });
    fromResultOverrides.set(0, { data: { can_approve: true }, error: null });
    fromResultOverrides.set(1, { data: [template], error: null });
    mockTerminalResult = { data: null, error: null };

    await processRecurringTemplates();

    // Should have update call to advance next_due_date
    const updateCalls = mockCalls.filter((c) => c.method === "update");
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    // The update should contain a new next_due_date
    const lastUpdate = updateCalls[updateCalls.length - 1];
    const updateArg = lastUpdate.args[0] as Record<string, unknown>;
    expect(updateArg.next_due_date).toBeDefined();
    // For monthly, should advance to April 2026
    expect((updateArg.next_due_date as string).startsWith("2026-04")).toBe(true);
  });
});

// ============================================================================
// Access Management (Admin only)
// ============================================================================

describe("Access Management", () => {
  it("grantFinanceAccess creates access record", async () => {
    mockUserRole = "admin";
    mockTerminalResult = { data: { id: "access-new" }, error: null };

    const result = await grantFinanceAccess("new-user-id", true);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: "access-new" });
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "finance_access_granted",
      })
    );
  });

  it("grantFinanceAccess returns error for duplicate user", async () => {
    mockUserRole = "admin";
    mockTerminalResult = { data: null, error: { code: "23505", message: "unique_violation" } };

    const result = await grantFinanceAccess("existing-user-id", false);

    expect(result.success).toBe(false);
    expect(result.error).toBe("User already has finance access");
  });

  it("revokeFinanceAccess removes access", async () => {
    mockUserRole = "admin";
    mockTerminalResult = { data: null, error: null };

    const result = await revokeFinanceAccess("user-to-revoke");

    expect(result.success).toBe(true);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "finance_access_revoked",
      })
    );
  });

  it("revokeFinanceAccess blocks non-admin", async () => {
    mockUserRole = "pm";

    const result = await revokeFinanceAccess("some-user");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Admin required");
  });
});

// ============================================================================
// Weekly Digest Notifications
// ============================================================================

describe("sendWeeklyDigestEmails", () => {
  it("sends emails to all whitelisted users with email", async () => {
    // 1st from: finance_access with users
    fromResultOverrides.set(0, {
      data: [
        { user_id: "user-1", user: { name: "Alice", email: "alice@test.com" } },
        { user_id: "user-2", user: { name: "Bob", email: "bob@test.com" } },
      ],
      error: null,
    });
    // 2nd from: finance_invoices
    fromResultOverrides.set(1, {
      data: [
        {
          id: "inv-1",
          invoice_code: "INV-001",
          total_amount: 100000,
          currency: "TRY",
          due_date: new Date().toISOString().split("T")[0],
          status: "pending",
          description: "Test invoice",
          supplier: { name: "ABC Materials", iban: "TR1234", bank_name: "Garanti" },
        },
      ],
      error: null,
    });
    // 3rd from: finance_payments
    fromResultOverrides.set(2, { data: [], error: null });
    // 4th from: finance_receivables
    fromResultOverrides.set(3, { data: [], error: null });

    const result = await sendWeeklyDigestEmails();

    expect(result.success).toBe(true);
    expect(result.data?.sent).toBe(2);
    expect(mockResendSend).toHaveBeenCalledTimes(2);
  });

  it("returns sent: 0 when no whitelisted users", async () => {
    fromResultOverrides.set(0, { data: [], error: null });

    const result = await sendWeeklyDigestEmails();

    expect(result.success).toBe(true);
    expect(result.data?.sent).toBe(0);
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("filters out users without email", async () => {
    fromResultOverrides.set(0, {
      data: [
        { user_id: "user-1", user: { name: "Alice", email: "alice@test.com" } },
        { user_id: "user-2", user: { name: "No Email", email: "" } },
      ],
      error: null,
    });
    fromResultOverrides.set(1, { data: [], error: null });
    fromResultOverrides.set(2, { data: [], error: null });
    fromResultOverrides.set(3, { data: [], error: null });

    const result = await sendWeeklyDigestEmails();

    expect(result.success).toBe(true);
    expect(result.data?.sent).toBe(1);
  });

  it("fails when RESEND_API_KEY is not set", async () => {
    delete process.env.RESEND_API_KEY;

    fromResultOverrides.set(0, {
      data: [{ user_id: "user-1", user: { name: "Alice", email: "alice@test.com" } }],
      error: null,
    });
    fromResultOverrides.set(1, { data: [], error: null });
    fromResultOverrides.set(2, { data: [], error: null });
    fromResultOverrides.set(3, { data: [], error: null });

    const result = await sendWeeklyDigestEmails();

    expect(result.success).toBe(false);
    expect(result.error).toBe("RESEND_API_KEY not configured");
  });

  it("categorizes overdue invoices correctly", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    fromResultOverrides.set(0, {
      data: [{ user_id: "user-1", user: { name: "Alice", email: "alice@test.com" } }],
      error: null,
    });
    fromResultOverrides.set(1, {
      data: [
        {
          id: "inv-overdue",
          invoice_code: "INV-OVERDUE",
          total_amount: 50000,
          currency: "TRY",
          due_date: pastDate.toISOString().split("T")[0],
          status: "pending",
          description: "Overdue one",
          supplier: { name: "Late Supplier", iban: null, bank_name: null },
        },
      ],
      error: null,
    });
    fromResultOverrides.set(2, { data: [], error: null });
    fromResultOverrides.set(3, { data: [], error: null });

    const result = await sendWeeklyDigestEmails();

    expect(result.success).toBe(true);
    // The email was sent (overdue invoice should be included)
    expect(mockResendSend).toHaveBeenCalledTimes(1);
  });

  it("creates in-app notifications for each user", async () => {
    fromResultOverrides.set(0, {
      data: [
        { user_id: "user-1", user: { name: "Alice", email: "alice@test.com" } },
        { user_id: "user-2", user: { name: "Bob", email: "bob@test.com" } },
      ],
      error: null,
    });
    fromResultOverrides.set(1, { data: [], error: null });
    fromResultOverrides.set(2, { data: [], error: null });
    fromResultOverrides.set(3, { data: [], error: null });

    await sendWeeklyDigestEmails();

    expect(mockCreateNotification).toHaveBeenCalledTimes(2);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: "finance_weekly_digest",
      })
    );
  });
});

// ============================================================================
// Urgent Team Notification
// ============================================================================

describe("notifyTeamUrgent", () => {
  it("blocks unauthenticated users", async () => {
    mockUser = null;

    const result = await notifyTeamUrgent(["inv-1"], "urgent");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("blocks non-whitelisted users", async () => {
    // First from() = finance_access check → no row
    fromResultOverrides.set(0, { data: null, error: { code: "PGRST116", message: "not found" } });

    const result = await notifyTeamUrgent(["inv-1"], "urgent");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authorized");
  });

  it("sends urgent email with selected invoices", async () => {
    // 1st: finance_access auth check
    fromResultOverrides.set(0, { data: { can_approve: false }, error: null });
    // 2nd: selected invoices
    fromResultOverrides.set(1, {
      data: [
        {
          id: "inv-1",
          invoice_code: "INV-001",
          total_amount: 100000,
          currency: "TRY",
          due_date: "2026-04-01",
          status: "pending",
          description: "Marble slabs",
          supplier: { name: "ABC Materials", iban: "TR1234", bank_name: "Garanti" },
        },
      ],
      error: null,
    });
    // 3rd: payments for selected invoices
    fromResultOverrides.set(2, { data: [], error: null });
    // 4th: sender name
    fromResultOverrides.set(3, { data: { name: "Kerem" }, error: null });
    // 5th: finance_access list for recipients
    fromResultOverrides.set(4, {
      data: [
        { user_id: "user-1", user: { name: "Alice", email: "alice@test.com" } },
      ],
      error: null,
    });

    const result = await notifyTeamUrgent(["inv-1"], "Process today please");

    expect(result.success).toBe(true);
    expect(result.data?.sent).toBe(1);
    expect(mockResendSend).toHaveBeenCalledTimes(1);
  });

  it("includes sender note in notification", async () => {
    fromResultOverrides.set(0, { data: { can_approve: false }, error: null });
    fromResultOverrides.set(1, {
      data: [{
        id: "inv-1", invoice_code: "INV-001", total_amount: 50000,
        currency: "TRY", due_date: "2026-04-01", status: "pending",
        description: null, supplier: { name: "Test", iban: null, bank_name: null },
      }],
      error: null,
    });
    fromResultOverrides.set(2, { data: [], error: null });
    fromResultOverrides.set(3, { data: { name: "Kerem" }, error: null });
    fromResultOverrides.set(4, {
      data: [{ user_id: "user-1", user: { name: "Alice", email: "alice@test.com" } }],
      error: null,
    });

    await notifyTeamUrgent(["inv-1"], "Supplier blocking production");

    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "finance_urgent_notify",
        message: expect.stringContaining("Supplier blocking production"),
      })
    );
  });

  it("returns error when no invoices found", async () => {
    fromResultOverrides.set(0, { data: { can_approve: false }, error: null });
    fromResultOverrides.set(1, { data: [], error: null });

    const result = await notifyTeamUrgent(["nonexistent-id"]);

    expect(result.success).toBe(false);
    expect(result.error).toBe("No invoices found");
  });

  it("logs activity after sending", async () => {
    fromResultOverrides.set(0, { data: { can_approve: false }, error: null });
    fromResultOverrides.set(1, {
      data: [{
        id: "inv-1", invoice_code: "INV-001", total_amount: 50000,
        currency: "TRY", due_date: "2026-04-01", status: "pending",
        description: null, supplier: { name: "Test", iban: null, bank_name: null },
      }],
      error: null,
    });
    fromResultOverrides.set(2, { data: [], error: null });
    fromResultOverrides.set(3, { data: { name: "Kerem" }, error: null });
    fromResultOverrides.set(4, {
      data: [{ user_id: "user-1", user: { name: "Alice", email: "alice@test.com" } }],
      error: null,
    });

    await notifyTeamUrgent(["inv-1"]);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "finance_urgent_notify_sent",
        details: expect.objectContaining({
          invoiceIds: ["inv-1"],
          senderName: "Kerem",
        }),
      })
    );
  });
});

// ============================================================================
// Week Label Helper
// ============================================================================

describe("getWeekLabel (via sendWeeklyDigestEmails subject)", () => {
  it("uses correct ordinal suffix in email subject", async () => {
    fromResultOverrides.set(0, {
      data: [{ user_id: "user-1", user: { name: "Alice", email: "alice@test.com" } }],
      error: null,
    });
    fromResultOverrides.set(1, { data: [], error: null });
    fromResultOverrides.set(2, { data: [], error: null });
    fromResultOverrides.set(3, { data: [], error: null });

    await sendWeeklyDigestEmails();

    // Verify the email was sent with a subject containing the week label
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringMatching(/Formula — .+ Week Payments:/),
      })
    );
  });
});
