import { describe, it, expect } from "vitest";

import {
  categorySchema,
  categoryTypeSchema,
  financeCurrencySchema,
  invoiceSchema,
  invoiceStatusSchema,
  notifyTeamSchema,
  paymentDirectionSchema,
  paymentMethodSchema,
  paymentSchema,
  receivableSchema,
  receivableStatusSchema,
  recurringFrequencySchema,
  recurringTemplateSchema,
  sendSummarySchema,
  supplierCategorySchema,
  supplierSchema,
} from "../finance";

const VALID_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

// ============================================================================
// Enum Schemas
// ============================================================================

describe("supplierCategorySchema", () => {
  it.each(["material_supplier", "service_provider", "subcontractor"])(
    "accepts '%s'",
    (value) => {
      expect(supplierCategorySchema.safeParse(value).success).toBe(true);
    },
  );

  it.each(["vendor", ""])("rejects '%s'", (value) => {
    expect(supplierCategorySchema.safeParse(value).success).toBe(false);
  });
});

describe("invoiceStatusSchema", () => {
  it.each([
    "pending",
    "awaiting_approval",
    "approved",
    "partially_paid",
    "paid",
    "overdue",
    "cancelled",
  ])("accepts '%s'", (value) => {
    expect(invoiceStatusSchema.safeParse(value).success).toBe(true);
  });

  it("rejects 'unknown'", () => {
    expect(invoiceStatusSchema.safeParse("unknown").success).toBe(false);
  });
});

describe("receivableStatusSchema", () => {
  it.each(["pending", "partially_received", "received", "overdue", "cancelled"])(
    "accepts '%s'",
    (value) => {
      expect(receivableStatusSchema.safeParse(value).success).toBe(true);
    },
  );

  it("rejects 'unknown'", () => {
    expect(receivableStatusSchema.safeParse("unknown").success).toBe(false);
  });
});

describe("paymentDirectionSchema", () => {
  it.each(["outgoing", "incoming"])("accepts '%s'", (value) => {
    expect(paymentDirectionSchema.safeParse(value).success).toBe(true);
  });

  it("rejects 'transfer'", () => {
    expect(paymentDirectionSchema.safeParse("transfer").success).toBe(false);
  });
});

describe("paymentMethodSchema", () => {
  it.each(["bank_transfer", "cash", "check", "credit_card"])(
    "accepts '%s'",
    (value) => {
      expect(paymentMethodSchema.safeParse(value).success).toBe(true);
    },
  );

  it("rejects 'wire'", () => {
    expect(paymentMethodSchema.safeParse("wire").success).toBe(false);
  });
});

describe("recurringFrequencySchema", () => {
  it.each(["monthly", "quarterly", "yearly"])("accepts '%s'", (value) => {
    expect(recurringFrequencySchema.safeParse(value).success).toBe(true);
  });

  it("rejects 'weekly'", () => {
    expect(recurringFrequencySchema.safeParse("weekly").success).toBe(false);
  });
});

describe("financeCurrencySchema", () => {
  it.each(["TRY", "USD", "EUR"])("accepts '%s'", (value) => {
    expect(financeCurrencySchema.safeParse(value).success).toBe(true);
  });

  it("rejects 'GBP'", () => {
    expect(financeCurrencySchema.safeParse("GBP").success).toBe(false);
  });
});

describe("categoryTypeSchema", () => {
  it.each(["expense", "income"])("accepts '%s'", (value) => {
    expect(categoryTypeSchema.safeParse(value).success).toBe(true);
  });

  it("rejects 'transfer'", () => {
    expect(categoryTypeSchema.safeParse("transfer").success).toBe(false);
  });
});

// ============================================================================
// Supplier Schema
// ============================================================================

describe("supplierSchema", () => {
  it("accepts valid minimal input", () => {
    const result = supplierSchema.safeParse({ name: "ABC Materials" });
    expect(result.success).toBe(true);
  });

  it("accepts full input with all optional fields", () => {
    const result = supplierSchema.safeParse({
      name: "ABC Materials",
      contact_person: "John Doe",
      phone: "+905551234567",
      email: "john@abc.com",
      category: "material_supplier",
      tax_id: "1234567890",
      iban: "TR330006100519786457841326",
      bank_name: "Garanti BBVA",
      address: "Istanbul, Turkey",
      notes: "Preferred supplier for wood",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(supplierSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects name over 200 characters", () => {
    expect(supplierSchema.safeParse({ name: "a".repeat(201) }).success).toBe(false);
  });

  // Email validation
  it("accepts valid email", () => {
    const result = supplierSchema.safeParse({
      name: "X",
      email: "test@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = supplierSchema.safeParse({
      name: "X",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty string email", () => {
    const result = supplierSchema.safeParse({ name: "X", email: "" });
    expect(result.success).toBe(true);
  });

  it("accepts null email", () => {
    const result = supplierSchema.safeParse({ name: "X", email: null });
    expect(result.success).toBe(true);
  });

  // IBAN validation
  it("accepts valid 26-char TR IBAN", () => {
    const result = supplierSchema.safeParse({
      name: "X",
      iban: "TR330006100519786457841326",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.iban).toBe("TR330006100519786457841326");
    }
  });

  it("accepts IBAN with spaces (transform strips them)", () => {
    const result = supplierSchema.safeParse({
      name: "X",
      iban: "TR33 0006 1005 1978 6457 8413 26",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.iban).toBe("TR330006100519786457841326");
    }
  });

  it("accepts lowercase IBAN (transform uppercases)", () => {
    const result = supplierSchema.safeParse({
      name: "X",
      iban: "tr330006100519786457841326",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.iban).toBe("TR330006100519786457841326");
    }
  });

  it("accepts null IBAN", () => {
    const result = supplierSchema.safeParse({ name: "X", iban: null });
    expect(result.success).toBe(true);
  });

  it("accepts undefined IBAN", () => {
    const result = supplierSchema.safeParse({ name: "X" });
    expect(result.success).toBe(true);
  });

  it("rejects IBAN that is too short", () => {
    const result = supplierSchema.safeParse({ name: "X", iban: "TR12345" });
    expect(result.success).toBe(false);
  });

  it("rejects IBAN without TR prefix", () => {
    const result = supplierSchema.safeParse({
      name: "X",
      iban: "DE330006100519786457841326",
    });
    expect(result.success).toBe(false);
  });

  it("rejects IBAN that is too long", () => {
    const result = supplierSchema.safeParse({
      name: "X",
      iban: "TR33000610051978645784132699",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Invoice Schema
// ============================================================================

describe("invoiceSchema", () => {
  const validInvoice = {
    supplier_id: VALID_UUID,
    invoice_date: "2026-03-01",
    due_date: "2026-04-01",
    total_amount: 5000,
  };

  it("accepts valid minimal input with defaults", () => {
    const result = invoiceSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("TRY");
      expect(result.data.requires_approval).toBe(false);
      expect(result.data.vat_rate).toBe(0);
      expect(result.data.has_installments).toBe(false);
    }
  });

  it("accepts valid input with installments and no due_date", () => {
    const result = invoiceSchema.safeParse({
      supplier_id: VALID_UUID,
      invoice_date: "2026-03-01",
      total_amount: 10000,
      has_installments: true,
      installments: [
        { amount: 5000, due_date: "2026-04-01" },
        { amount: 5000, due_date: "2026-05-01" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing supplier_id", () => {
    const { supplier_id: _, ...rest } = validInvoice;
    expect(invoiceSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects total_amount of 0", () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      total_amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative total_amount", () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      total_amount: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing invoice_date", () => {
    const result = invoiceSchema.safeParse({
      supplier_id: VALID_UUID,
      due_date: "2026-04-01",
      total_amount: 5000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty invoice_date", () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      invoice_date: "",
    });
    expect(result.success).toBe(false);
  });

  // Conditional due_date validation
  it("rejects has_installments=false with empty due_date", () => {
    const result = invoiceSchema.safeParse({
      supplier_id: VALID_UUID,
      invoice_date: "2026-03-01",
      due_date: "",
      total_amount: 5000,
      has_installments: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const dueDateError = result.error.issues.find((i) => i.path.includes("due_date"));
      expect(dueDateError).toBeDefined();
    }
  });

  it("accepts has_installments=true with empty due_date", () => {
    const result = invoiceSchema.safeParse({
      supplier_id: VALID_UUID,
      invoice_date: "2026-03-01",
      due_date: "",
      total_amount: 5000,
      has_installments: true,
    });
    expect(result.success).toBe(true);
  });

  // VAT rate
  it.each([0, 1, 10, 20])("accepts vat_rate %d", (vat_rate) => {
    const result = invoiceSchema.safeParse({ ...validInvoice, vat_rate });
    expect(result.success).toBe(true);
  });

  it("rejects vat_rate over 100", () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      vat_rate: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative vat_rate", () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      vat_rate: -1,
    });
    expect(result.success).toBe(false);
  });

  // Currency
  it.each(["TRY", "USD", "EUR"])("accepts currency '%s'", (currency) => {
    const result = invoiceSchema.safeParse({ ...validInvoice, currency });
    expect(result.success).toBe(true);
  });

  it("rejects invalid currency", () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      currency: "GBP",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Receivable Schema
// ============================================================================

describe("receivableSchema", () => {
  const validReceivable = {
    client_id: VALID_UUID,
    issue_date: "2026-03-01",
    due_date: "2026-04-01",
    total_amount: 15000,
  };

  it("accepts valid minimal input", () => {
    const result = receivableSchema.safeParse(validReceivable);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("TRY");
    }
  });

  it("rejects missing client_id", () => {
    const { client_id: _, ...rest } = validReceivable;
    expect(receivableSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects non-UUID client_id", () => {
    const result = receivableSchema.safeParse({
      ...validReceivable,
      client_id: "not-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects total_amount of 0", () => {
    const result = receivableSchema.safeParse({
      ...validReceivable,
      total_amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative total_amount", () => {
    const result = receivableSchema.safeParse({
      ...validReceivable,
      total_amount: -500,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing issue_date", () => {
    const result = receivableSchema.safeParse({
      client_id: VALID_UUID,
      due_date: "2026-04-01",
      total_amount: 15000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty due_date", () => {
    const result = receivableSchema.safeParse({
      ...validReceivable,
      due_date: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null for optional fields", () => {
    const result = receivableSchema.safeParse({
      ...validReceivable,
      category_id: null,
      reference_number: null,
      description: null,
      notes: null,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Payment Schema
// ============================================================================

describe("paymentSchema", () => {
  const validPayment = {
    amount: 2500,
    payment_date: "2026-03-15",
    payment_method: "bank_transfer" as const,
  };

  it("accepts valid minimal input", () => {
    const result = paymentSchema.safeParse(validPayment);
    expect(result.success).toBe(true);
  });

  it("rejects amount of 0", () => {
    const result = paymentSchema.safeParse({ ...validPayment, amount: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = paymentSchema.safeParse({ ...validPayment, amount: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects missing payment_date", () => {
    const { payment_date: _, ...rest } = validPayment;
    expect(paymentSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty payment_date", () => {
    const result = paymentSchema.safeParse({
      ...validPayment,
      payment_date: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid payment_method", () => {
    const result = paymentSchema.safeParse({
      ...validPayment,
      payment_method: "wire",
    });
    expect(result.success).toBe(false);
  });

  it.each(["bank_transfer", "cash", "check", "credit_card"])(
    "accepts payment_method '%s'",
    (method) => {
      const result = paymentSchema.safeParse({
        ...validPayment,
        payment_method: method,
      });
      expect(result.success).toBe(true);
    },
  );

  it("accepts null for optional fields", () => {
    const result = paymentSchema.safeParse({
      ...validPayment,
      reference_number: null,
      notes: null,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Recurring Template Schema
// ============================================================================

describe("recurringTemplateSchema", () => {
  const validTemplate = {
    supplier_id: VALID_UUID,
    description: "Monthly office rent",
    amount: 8000,
    day_of_month: 1,
    next_due_date: "2026-04-01",
  };

  it("accepts valid input with defaults", () => {
    const result = recurringTemplateSchema.safeParse(validTemplate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.frequency).toBe("monthly");
      expect(result.data.currency).toBe("TRY");
      expect(result.data.requires_approval).toBe(false);
    }
  });

  it("accepts all required fields with explicit values", () => {
    const result = recurringTemplateSchema.safeParse({
      ...validTemplate,
      frequency: "quarterly",
      currency: "EUR",
      requires_approval: true,
      category_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects day_of_month less than 1", () => {
    const result = recurringTemplateSchema.safeParse({
      ...validTemplate,
      day_of_month: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects day_of_month greater than 28", () => {
    const result = recurringTemplateSchema.safeParse({
      ...validTemplate,
      day_of_month: 29,
    });
    expect(result.success).toBe(false);
  });

  it("accepts day_of_month of 1", () => {
    const result = recurringTemplateSchema.safeParse({
      ...validTemplate,
      day_of_month: 1,
    });
    expect(result.success).toBe(true);
  });

  it("accepts day_of_month of 28", () => {
    const result = recurringTemplateSchema.safeParse({
      ...validTemplate,
      day_of_month: 28,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing description", () => {
    const { description: _, ...rest } = validTemplate;
    expect(recurringTemplateSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty description", () => {
    const result = recurringTemplateSchema.safeParse({
      ...validTemplate,
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description over 500 characters", () => {
    const result = recurringTemplateSchema.safeParse({
      ...validTemplate,
      description: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing supplier_id", () => {
    const { supplier_id: _, ...rest } = validTemplate;
    expect(recurringTemplateSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects non-positive amount", () => {
    const result = recurringTemplateSchema.safeParse({
      ...validTemplate,
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty next_due_date", () => {
    const result = recurringTemplateSchema.safeParse({
      ...validTemplate,
      next_due_date: "",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Category Schema
// ============================================================================

describe("categorySchema", () => {
  it("accepts valid expense category", () => {
    const result = categorySchema.safeParse({ name: "Office Supplies", type: "expense" });
    expect(result.success).toBe(true);
  });

  it("accepts valid income category", () => {
    const result = categorySchema.safeParse({ name: "Project Revenue", type: "income" });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = categorySchema.safeParse({ type: "expense" });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = categorySchema.safeParse({ name: "", type: "expense" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 100 characters", () => {
    const result = categorySchema.safeParse({
      name: "a".repeat(101),
      type: "expense",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing type", () => {
    const result = categorySchema.safeParse({ name: "Rent" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = categorySchema.safeParse({ name: "Rent", type: "transfer" });
    expect(result.success).toBe(false);
  });

  it("accepts null color", () => {
    const result = categorySchema.safeParse({
      name: "Rent",
      type: "expense",
      color: null,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Notify Team Schema
// ============================================================================

describe("notifyTeamSchema", () => {
  it("accepts valid array of UUIDs", () => {
    const result = notifyTeamSchema.safeParse({
      invoice_ids: [VALID_UUID],
    });
    expect(result.success).toBe(true);
  });

  it("accepts multiple UUIDs with optional note", () => {
    const result = notifyTeamSchema.safeParse({
      invoice_ids: [VALID_UUID, "b2c3d4e5-f6a7-8901-bcde-f12345678901"],
      note: "Please review these invoices urgently",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty array", () => {
    const result = notifyTeamSchema.safeParse({ invoice_ids: [] });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID strings in array", () => {
    const result = notifyTeamSchema.safeParse({
      invoice_ids: ["not-a-uuid"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts null note", () => {
    const result = notifyTeamSchema.safeParse({
      invoice_ids: [VALID_UUID],
      note: null,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Send Summary Schema
// ============================================================================

describe("sendSummarySchema", () => {
  it.each(["this_week", "rest_of_week", "next_week", "custom"])(
    "accepts date_range '%s'",
    (value) => {
      const result = sendSummarySchema.safeParse({ date_range: value });
      expect(result.success).toBe(true);
    },
  );

  it("rejects invalid date_range", () => {
    const result = sendSummarySchema.safeParse({ date_range: "last_month" });
    expect(result.success).toBe(false);
  });

  it("defaults include_overdue to true", () => {
    const result = sendSummarySchema.safeParse({ date_range: "this_week" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_overdue).toBe(true);
    }
  });

  it("defaults include_incoming to true", () => {
    const result = sendSummarySchema.safeParse({ date_range: "this_week" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_incoming).toBe(true);
    }
  });

  it("defaults include_already_paid to false", () => {
    const result = sendSummarySchema.safeParse({ date_range: "this_week" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_already_paid).toBe(false);
    }
  });

  it("accepts custom date range with start and end", () => {
    const result = sendSummarySchema.safeParse({
      date_range: "custom",
      custom_start: "2026-03-01",
      custom_end: "2026-03-31",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null note", () => {
    const result = sendSummarySchema.safeParse({
      date_range: "this_week",
      note: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts overridden boolean flags", () => {
    const result = sendSummarySchema.safeParse({
      date_range: "this_week",
      include_overdue: false,
      include_incoming: false,
      include_already_paid: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_overdue).toBe(false);
      expect(result.data.include_incoming).toBe(false);
      expect(result.data.include_already_paid).toBe(true);
    }
  });
});
