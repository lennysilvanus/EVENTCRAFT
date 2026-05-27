import { vi } from "vitest";

// Mock next/headers globally so any import of it in lib/auth doesn't crash
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
  }),
}));
