import { describe, it, expect } from "vitest";
import { requireAdmin } from "@/lib/adminAuth";
import { createMockNextRequest } from "../utils/test-helpers";

describe("adminAuth - requireAdmin", () => {
  it("should return null when adminAccessToken cookie is present", () => {
    const request = createMockNextRequest("GET", {
      cookies: { adminAccessToken: "valid-token-123" },
    });

    const result = requireAdmin(request);

    expect(result).toBeNull();
  });

  it("should return 401 Unauthorized when adminAccessToken cookie is missing", () => {
    const request = createMockNextRequest("GET");

    const result = requireAdmin(request);

    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
  });

  it("should return 401 Unauthorized with proper error message when token is missing", async () => {
    const request = createMockNextRequest("GET");

    const result = requireAdmin(request);

    expect(result).not.toBeNull();
    if (result) {
      const body = await result.json();
      expect(body.error).toBe("Unauthorized");
    }
  });

  it("should return null for various valid token formats", () => {
    const tokens = [
      "abc123",
      "jwt-token-with-dots.token.here",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      "token!@#$%^&*()",
    ];

    tokens.forEach((token) => {
      const request = createMockNextRequest("GET", {
        cookies: { adminAccessToken: token },
      });

      const result = requireAdmin(request);

      expect(result).toBeNull();
    });
  });

  it("should return 401 for empty adminAccessToken value", () => {
    const request = createMockNextRequest("GET", {
      cookies: { adminAccessToken: "" },
    });

    const result = requireAdmin(request);

    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
  });

  describe("Session Management", () => {
    it("should allow multiple requests with same valid token", () => {
      const token = "persistent-session-token";

      for (let i = 0; i < 5; i++) {
        const request = createMockNextRequest("GET", {
          cookies: { adminAccessToken: token },
        });

        const result = requireAdmin(request);

        expect(result).toBeNull();
      }
    });

    it("should reject all requests without token", () => {
      for (let i = 0; i < 5; i++) {
        const request = createMockNextRequest("GET");

        const result = requireAdmin(request);

        expect(result).not.toBeNull();
        expect(result?.status).toBe(401);
      }
    });
  });

  describe("HTTP Method Handling", () => {
    const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];

    methods.forEach((method) => {
      it(`should work for ${method} requests with valid token`, () => {
        const request = createMockNextRequest(method, {
          cookies: { adminAccessToken: "token" },
        });

        const result = requireAdmin(request);

        expect(result).toBeNull();
      });

      it(`should reject ${method} requests without token`, () => {
        const request = createMockNextRequest(method);

        const result = requireAdmin(request);

        expect(result).not.toBeNull();
        expect(result?.status).toBe(401);
      });
    });
  });

  describe("Cookie Case Sensitivity", () => {
    it("should handle exact cookie name match", () => {
      const request = createMockNextRequest("GET", {
        cookies: { adminAccessToken: "valid-token" },
      });

      const result = requireAdmin(request);

      expect(result).toBeNull();
    });

    it("should reject when cookie name case does not match exactly", () => {
      const request = createMockNextRequest("GET", {
        cookies: { AdminAccessToken: "valid-token" },
      });

      const result = requireAdmin(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });
  });
});
