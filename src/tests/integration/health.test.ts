import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/health/route";

vi.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: vi.fn() },
}));

import { prisma } from "@/lib/prisma";
const mockQuery = vi.mocked(prisma.$queryRaw);

beforeEach(() => vi.clearAllMocks());

describe("GET /api/health", () => {
  it("returns 200 with ok status when database is reachable", async () => {
    mockQuery.mockResolvedValue([{ "?column?": 1 }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.services.database.status).toBe("ok");
    expect(typeof body.services.database.latencyMs).toBe("number");
  });

  it("returns 503 with degraded status when database is unreachable", async () => {
    mockQuery.mockRejectedValue(new Error("Connection refused"));
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.services.database.status).toBe("error");
  });
});
