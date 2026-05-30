import { vi } from "vitest";

// Provide required env vars before any module imports them
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-only-jwt-secret-not-for-production";

// Mock next/headers globally so any import of it in lib/auth doesn't crash
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
  }),
}));
