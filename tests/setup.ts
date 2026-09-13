import { expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom";

// Mock environment variables for tests
process.env.DATABASE_URL =
  "postgresql://test:test@localhost:5432/eyebrow_hub_test";

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Global test utilities can be added here as needed
