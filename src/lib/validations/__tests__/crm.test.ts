import { describe, it, expect } from "vitest";

import {
  activitySchema,
  activityTypeSchema,
  brandSchema,
  brandTierSchema,
  connectionStrengthSchema,
  contactSchema,
  crmPrioritySchema,
  firmSchema,
  opportunitySchema,
  opportunityStageSchema,
  relationshipStatusSchema,
  vendorListStatusSchema,
} from "../crm";

const VALID_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

// ============================================================================
// Enum Schemas
// ============================================================================

describe("brandTierSchema", () => {
  it.each(["luxury", "mid_luxury", "bridge"])("accepts '%s'", (value) => {
    expect(brandTierSchema.safeParse(value).success).toBe(true);
  });

  it.each(["premium", ""])("rejects '%s'", (value) => {
    expect(brandTierSchema.safeParse(value).success).toBe(false);
  });
});

describe("vendorListStatusSchema", () => {
  it.each(["not_applied", "applied", "under_review", "approved", "rejected"])(
    "accepts '%s'",
    (value) => {
      expect(vendorListStatusSchema.safeParse(value).success).toBe(true);
    },
  );

  it("rejects 'pending'", () => {
    expect(vendorListStatusSchema.safeParse("pending").success).toBe(false);
  });
});

describe("connectionStrengthSchema", () => {
  it.each(["none", "cold", "warm", "hot"])("accepts '%s'", (value) => {
    expect(connectionStrengthSchema.safeParse(value).success).toBe(true);
  });

  it("rejects 'strong'", () => {
    expect(connectionStrengthSchema.safeParse("strong").success).toBe(false);
  });
});

describe("relationshipStatusSchema", () => {
  it.each([
    "identified",
    "reached_out",
    "connected",
    "meeting_scheduled",
    "active_relationship",
  ])("accepts '%s'", (value) => {
    expect(relationshipStatusSchema.safeParse(value).success).toBe(true);
  });

  it("rejects 'unknown'", () => {
    expect(relationshipStatusSchema.safeParse("unknown").success).toBe(false);
  });
});

describe("opportunityStageSchema", () => {
  it.each([
    "researched",
    "contacted",
    "sample_sent",
    "meeting",
    "proposal",
    "negotiation",
    "won",
    "lost",
  ])("accepts '%s'", (value) => {
    expect(opportunityStageSchema.safeParse(value).success).toBe(true);
  });

  it("rejects 'closed'", () => {
    expect(opportunityStageSchema.safeParse("closed").success).toBe(false);
  });
});

describe("activityTypeSchema", () => {
  it.each([
    "email",
    "call",
    "meeting",
    "linkedin_message",
    "sample_sent",
    "vendor_application",
    "trade_show",
    "site_visit",
    "proposal_sent",
    "follow_up",
    "note",
  ])("accepts '%s'", (value) => {
    expect(activityTypeSchema.safeParse(value).success).toBe(true);
  });

  it("rejects 'sms'", () => {
    expect(activityTypeSchema.safeParse("sms").success).toBe(false);
  });
});

describe("crmPrioritySchema", () => {
  it.each(["high", "medium", "low"])("accepts '%s'", (value) => {
    expect(crmPrioritySchema.safeParse(value).success).toBe(true);
  });

  it("rejects 'critical'", () => {
    expect(crmPrioritySchema.safeParse("critical").success).toBe(false);
  });
});

// ============================================================================
// Brand Schema
// ============================================================================

describe("brandSchema", () => {
  it("accepts valid minimal input with defaults", () => {
    const result = brandSchema.safeParse({ name: "Test Brand" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tier).toBe("mid_luxury");
      expect(result.data.priority).toBe("medium");
      expect(result.data.cd_changed_recently).toBe(false);
    }
  });

  it("rejects empty name", () => {
    expect(brandSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects name over 100 characters", () => {
    expect(brandSchema.safeParse({ name: "a".repeat(101) }).success).toBe(
      false,
    );
  });

  it("accepts valid website URL", () => {
    const result = brandSchema.safeParse({
      name: "X",
      website: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string website", () => {
    const result = brandSchema.safeParse({ name: "X", website: "" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid website URL", () => {
    const result = brandSchema.safeParse({ name: "X", website: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("rejects negative store_count", () => {
    const result = brandSchema.safeParse({ name: "X", store_count: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts valid store_count", () => {
    const result = brandSchema.safeParse({ name: "X", store_count: 5 });
    expect(result.success).toBe(true);
  });

  it("accepts null for optional nullable fields", () => {
    const result = brandSchema.safeParse({
      name: "X",
      parent_group: null,
      segment: null,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Firm Schema
// ============================================================================

describe("firmSchema", () => {
  it("accepts valid minimal input with defaults", () => {
    const result = firmSchema.safeParse({ name: "Test Firm" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vendor_list_status).toBe("not_applied");
      expect(result.data.connection_strength).toBe("none");
    }
  });

  it("rejects empty name", () => {
    expect(firmSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects name over 100 characters", () => {
    expect(firmSchema.safeParse({ name: "a".repeat(101) }).success).toBe(
      false,
    );
  });

  it("accepts valid website URL", () => {
    const result = firmSchema.safeParse({
      name: "X",
      website: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string website", () => {
    const result = firmSchema.safeParse({ name: "X", website: "" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid website URL", () => {
    const result = firmSchema.safeParse({ name: "X", website: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("accepts null for all optional nullable fields", () => {
    const result = firmSchema.safeParse({
      name: "X",
      location: null,
      specialty: null,
      key_clients: null,
      vendor_application_date: null,
      website: null,
      connection_notes: null,
      notes: null,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Contact Schema
// ============================================================================

describe("contactSchema", () => {
  it("accepts valid minimal input with defaults", () => {
    const result = contactSchema.safeParse({
      first_name: "John",
      last_name: "Doe",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.relationship_status).toBe("identified");
    }
  });

  it("rejects empty first_name", () => {
    const result = contactSchema.safeParse({
      first_name: "",
      last_name: "Doe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty last_name", () => {
    const result = contactSchema.safeParse({
      first_name: "John",
      last_name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects first_name over 50 characters", () => {
    const result = contactSchema.safeParse({
      first_name: "a".repeat(51),
      last_name: "Doe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects last_name over 50 characters", () => {
    const result = contactSchema.safeParse({
      first_name: "John",
      last_name: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid email", () => {
    const result = contactSchema.safeParse({
      first_name: "J",
      last_name: "D",
      email: "test@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string email", () => {
    const result = contactSchema.safeParse({
      first_name: "J",
      last_name: "D",
      email: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = contactSchema.safeParse({
      first_name: "J",
      last_name: "D",
      email: "not-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid linkedin_url", () => {
    const result = contactSchema.safeParse({
      first_name: "J",
      last_name: "D",
      linkedin_url: "https://linkedin.com/in/johndoe",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid linkedin_url", () => {
    const result = contactSchema.safeParse({
      first_name: "J",
      last_name: "D",
      linkedin_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID brand_id", () => {
    const result = contactSchema.safeParse({
      first_name: "J",
      last_name: "D",
      brand_id: "not-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid UUID brand_id", () => {
    const result = contactSchema.safeParse({
      first_name: "J",
      last_name: "D",
      brand_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Opportunity Schema
// ============================================================================

describe("opportunitySchema", () => {
  it("accepts valid minimal input with defaults", () => {
    const result = opportunitySchema.safeParse({ title: "Test Opportunity" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stage).toBe("researched");
      expect(result.data.currency).toBe("USD");
      expect(result.data.priority).toBe("medium");
    }
  });

  it("rejects empty title", () => {
    expect(opportunitySchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects title over 200 characters", () => {
    expect(
      opportunitySchema.safeParse({ title: "a".repeat(201) }).success,
    ).toBe(false);
  });

  it("rejects negative estimated_value", () => {
    const result = opportunitySchema.safeParse({
      title: "X",
      estimated_value: -1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts estimated_value of 0", () => {
    const result = opportunitySchema.safeParse({
      title: "X",
      estimated_value: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects probability over 100", () => {
    const result = opportunitySchema.safeParse({
      title: "X",
      probability: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative probability", () => {
    const result = opportunitySchema.safeParse({
      title: "X",
      probability: -1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts probability of 50", () => {
    const result = opportunitySchema.safeParse({
      title: "X",
      probability: 50,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid currency", () => {
    const result = opportunitySchema.safeParse({
      title: "X",
      currency: "GBP",
    });
    expect(result.success).toBe(false);
  });

  it.each(["TRY", "USD", "EUR"])("accepts currency '%s'", (currency) => {
    const result = opportunitySchema.safeParse({ title: "X", currency });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID assigned_to", () => {
    const result = opportunitySchema.safeParse({
      title: "X",
      assigned_to: "not-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid UUID assigned_to", () => {
    const result = opportunitySchema.safeParse({
      title: "X",
      assigned_to: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Activity Schema
// ============================================================================

describe("activitySchema", () => {
  const validActivity = {
    activity_type: "email" as const,
    title: "Test",
    activity_date: "2026-01-15",
  };

  it("accepts valid minimal input", () => {
    const result = activitySchema.safeParse(validActivity);
    expect(result.success).toBe(true);
  });

  it("rejects missing activity_type", () => {
    const { activity_type: _, ...rest } = validActivity;
    expect(activitySchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = activitySchema.safeParse({ ...validActivity, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects title over 200 characters", () => {
    const result = activitySchema.safeParse({
      ...validActivity,
      title: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty activity_date", () => {
    const result = activitySchema.safeParse({
      ...validActivity,
      activity_date: "",
    });
    expect(result.success).toBe(false);
  });

  it.each(["brand_id", "contact_id", "opportunity_id", "architecture_firm_id"])(
    "rejects invalid UUID for %s",
    (field) => {
      const result = activitySchema.safeParse({
        ...validActivity,
        [field]: "not-uuid",
      });
      expect(result.success).toBe(false);
    },
  );

  it.each(["brand_id", "contact_id", "opportunity_id", "architecture_firm_id"])(
    "accepts valid UUID for %s",
    (field) => {
      const result = activitySchema.safeParse({
        ...validActivity,
        [field]: VALID_UUID,
      });
      expect(result.success).toBe(true);
    },
  );

  it.each(["brand_id", "contact_id", "opportunity_id", "architecture_firm_id"])(
    "accepts null for %s",
    (field) => {
      const result = activitySchema.safeParse({
        ...validActivity,
        [field]: null,
      });
      expect(result.success).toBe(true);
    },
  );
});
