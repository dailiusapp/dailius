import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), client: vi.fn(), rpc: vi.fn() }));
vi.mock("@/features/auth/services/requireUser", () => ({ requireUser: mocks.user }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
import { completeOnboarding } from "./actions";
import { EMPTY_ONBOARDING_DATA } from "../types";
describe("completeOnboarding", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "user" });
    mocks.client.mockResolvedValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ error: null });
  });
  it("sends the complete onboarding payload in one transaction", async () => {
    await completeOnboarding(EMPTY_ONBOARDING_DATA);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("complete_onboarding", { p_data: EMPTY_ONBOARDING_DATA });
  });
  it("propagates transaction failure without retrying individual writes", async () => {
    const error = { code: "23514" };
    mocks.rpc.mockResolvedValue({ error });
    await expect(completeOnboarding(EMPTY_ONBOARDING_DATA)).rejects.toBe(error);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("does not write without authentication", async () => {
    mocks.user.mockRejectedValue(new Error("Unauthenticated"));
    await expect(completeOnboarding(EMPTY_ONBOARDING_DATA)).rejects.toThrow("Unauthenticated");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
