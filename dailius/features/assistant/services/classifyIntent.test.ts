import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function (this: unknown) {
    return { chat: { completions: { create: mockCreate } } };
  }),
}));

import { classifyIntent } from "./classifyIntent";

function contentResponse(content: string) {
  return { choices: [{ message: { content } }] };
}

describe("classifyIntent", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("matches a manual commitment candidate and returns COMMITMENT_MOVE", async () => {
    mockCreate.mockResolvedValue(contentResponse(JSON.stringify({ commitmentId: "c1", targetDayLabel: "Fri" })));

    const trigger = await classifyIntent(
      "move my dentist appointment to Friday",
      "2026-08-10",
      [],
      [],
      [],
      [],
      [{ id: "c1", title: "Dentist", scheduledDate: "2026-08-12" }],
    );

    expect(trigger).toEqual({ type: "COMMITMENT_MOVE", commitmentId: "c1", targetDayLabel: "Fri" });
  });

  it("returns UNKNOWN and calls no classifier when there are no candidates of any kind", async () => {
    const trigger = await classifyIntent("do something", "2026-08-10", [], [], [], [], []);
    expect(trigger).toEqual({ type: "UNKNOWN" });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("matches a past (missed-activity) candidate before ever considering commitment candidates", async () => {
    mockCreate.mockResolvedValue(contentResponse(JSON.stringify({ blockId: "b1" })));

    const trigger = await classifyIntent(
      "I missed my run",
      "2026-08-10",
      [{ id: "b1", activityName: "Running", dayLabel: "Mon", scheduledDate: "2026-08-10" }],
      [],
      [],
      [],
      [{ id: "c1", title: "Dentist", scheduledDate: "2026-08-12" }],
    );

    expect(trigger).toEqual({ type: "MISSED_ACTIVITY", blockId: "b1" });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
