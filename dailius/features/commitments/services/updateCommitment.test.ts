import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), timezone: vi.fn(), client: vi.fn(), update: vi.fn(), generate: vi.fn() }));
vi.mock("@/features/auth/services/requireUser", () => ({ requireUser: mocks.user }));
vi.mock("@/features/auth/services/getUserTimezone", () => ({ getUserTimezone: mocks.timezone }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/features/planning/services/generatePlan", () => ({ generatePlan: mocks.generate }));
import { updateCommitment } from "./updateCommitment";
const input = { id: "commitment", title: "Meeting", scheduledDate: "2026-11-01", scheduledTime: "01:30", durationMinutes: 60 };
describe("manual commitment clock choices", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "user" });
    mocks.timezone.mockResolvedValue("America/New_York");
    mocks.generate.mockResolvedValue({ ok: true });
    const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { source: "Manual", timezone: "Asia/Tokyo" }, error: null }), then: (resolve: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve) };
    mocks.update.mockReturnValue(q);
    mocks.client.mockResolvedValue({ from: () => ({ ...q, update: mocks.update }) });
  });
  it("asks for a repeated-time choice without writing", async () => {
    expect(await updateCommitment(input)).toMatchObject({ ok: false, needsTimeChoice: true, field: "scheduledTime" });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it.each([['earlier', '2026-11-01T05:30:00.000Z', '2026-11-01T06:30:00.000Z'], ['later', '2026-11-01T06:30:00.000Z', '2026-11-01T07:30:00.000Z']] as const)("stores %s in the profile zone and preserves one real hour", async (timeOccurrence, start, end) => {
    expect(await updateCommitment({ ...input, timeOccurrence })).toEqual({ ok: true });
    expect(mocks.update).toHaveBeenCalledWith({ title: "Meeting", start_time: start, end_time: end, timezone: "America/New_York" });
  });
  it("rejects a nonexistent time without normalizing it", async () => {
    expect(await updateCommitment({ ...input, scheduledDate: "2026-03-08", scheduledTime: "02:30" })).toMatchObject({ ok: false, needsTimeChoice: false });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
