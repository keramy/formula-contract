import { describe, it, expect } from "vitest";
import {
  scopeItemSchema,
  projectSchema,
  clientSchema,
  loginSchema,
  safeValidate,
  getFirstError,
  parseOptionalNumber,
  parseIntWithDefault,
} from "./index";

describe("Validation Schemas", () => {
  describe("scopeItemSchema", () => {
    it("should validate a complete scope item", () => {
      const validItem = {
        item_code: "ITEM-001",
        name: "Test Item",
        description: "A test item",
        width: 100,
        depth: 50,
        height: 75,
        unit: "pcs",
        quantity: 5,
        unit_price: 1000,
        item_path: "production",
        status: "pending",
        notes: "Test notes",
        images: ["https://example.com/image.jpg"],
      };

      const result = scopeItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it("should validate minimal required fields", () => {
      const minimalItem = {
        item_code: "ITEM-001",
        name: "Test Item",
      };

      const result = scopeItemSchema.safeParse(minimalItem);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.unit).toBe("pcs");
        expect(result.data.quantity).toBe(1);
        expect(result.data.item_path).toBe("production");
        expect(result.data.status).toBe("pending");
      }
    });

    it("should reject empty item_code", () => {
      const invalidItem = {
        item_code: "",
        name: "Test Item",
      };

      const result = scopeItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it("should reject empty name", () => {
      const invalidItem = {
        item_code: "ITEM-001",
        name: "",
      };

      const result = scopeItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it("should reject negative dimensions", () => {
      const invalidItem = {
        item_code: "ITEM-001",
        name: "Test Item",
        width: -10,
      };

      const result = scopeItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it("should reject quantity less than 1", () => {
      const invalidItem = {
        item_code: "ITEM-001",
        name: "Test Item",
        quantity: 0,
      };

      const result = scopeItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it("should reject invalid status", () => {
      const invalidItem = {
        item_code: "ITEM-001",
        name: "Test Item",
        status: "invalid_status",
      };

      const result = scopeItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });
  });

  describe("projectSchema", () => {
    it("should validate a complete project", () => {
      const validProject = {
        project_code: "PRJ-001",
        name: "Test Project",
        description: "A test project",
        status: "active",
        currency: "USD",
      };

      const result = projectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });

    it("should reject lowercase project code", () => {
      const invalidProject = {
        project_code: "prj-001",
        name: "Test Project",
      };

      const result = projectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });

    it("should apply default values", () => {
      const minimalProject = {
        project_code: "PRJ-001",
        name: "Test Project",
      };

      const result = projectSchema.safeParse(minimalProject);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("tender");
        expect(result.data.currency).toBe("TRY");
      }
    });
  });

  describe("clientSchema", () => {
    it("should validate a complete client", () => {
      const validClient = {
        company_name: "Test Company",
        contact_person: "John Doe",
        email: "john@example.com",
        phone: "+90 555 123 4567",
        address: "123 Test Street",
      };

      const result = clientSchema.safeParse(validClient);
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const invalidClient = {
        company_name: "Test Company",
        email: "invalid-email",
      };

      const result = clientSchema.safeParse(invalidClient);
      expect(result.success).toBe(false);
    });

    it("should accept empty email", () => {
      const clientWithEmptyEmail = {
        company_name: "Test Company",
        email: "",
      };

      const result = clientSchema.safeParse(clientWithEmptyEmail);
      expect(result.success).toBe(true);
    });
  });

  describe("loginSchema", () => {
    it("should validate valid login credentials", () => {
      const validLogin = {
        email: "test@example.com",
        password: "password123",
      };

      const result = loginSchema.safeParse(validLogin);
      expect(result.success).toBe(true);
    });

    it("should reject short password", () => {
      const invalidLogin = {
        email: "test@example.com",
        password: "12345",
      };

      const result = loginSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
    });
  });
});

describe("Helper Functions", () => {
  describe("safeValidate", () => {
    it("should return success with valid data", () => {
      const result = safeValidate(scopeItemSchema, {
        item_code: "ITEM-001",
        name: "Test",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.item_code).toBe("ITEM-001");
      }
    });

    it("should return errors with invalid data", () => {
      const result = safeValidate(scopeItemSchema, {
        item_code: "",
        name: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toHaveProperty("item_code");
        expect(result.errors).toHaveProperty("name");
      }
    });
  });

  describe("getFirstError", () => {
    it("should return first error message", () => {
      const errors = {
        name: "Name is required",
        email: "Invalid email",
      };

      const result = getFirstError(errors);
      expect(result).toBe("Name is required");
    });

    it("should return default message for empty errors", () => {
      const result = getFirstError({});
      expect(result).toBe("Validation failed");
    });
  });

  describe("parseOptionalNumber", () => {
    it("should parse valid number string", () => {
      expect(parseOptionalNumber("123.45")).toBe(123.45);
    });

    it("should return null for empty string", () => {
      expect(parseOptionalNumber("")).toBe(null);
    });

    it("should return null for undefined", () => {
      expect(parseOptionalNumber(undefined)).toBe(null);
    });

    it("should return null for invalid number", () => {
      expect(parseOptionalNumber("abc")).toBe(null);
    });
  });

  describe("parseIntWithDefault", () => {
    it("should parse valid integer string", () => {
      expect(parseIntWithDefault("42", 1)).toBe(42);
    });

    it("should return default for empty string", () => {
      expect(parseIntWithDefault("", 10)).toBe(10);
    });

    it("should return default for invalid number", () => {
      expect(parseIntWithDefault("abc", 5)).toBe(5);
    });
  });
});
