import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function (this: unknown) {
    return { chat: { completions: { create: mockCreate } } };
  }),
}));

import { callAIPlanner } from "./aiPlanner";
import type { PlanningContext } from "../types";

const CONTEXT: PlanningContext = {
  today: "2026-08-10",
  trigger: { type: "MISSED_ACTIVITY", blockId: "b1" },
  userMessage: "I missed my run",
  goals: [],
  activities: [],
  constraints: [],
  scheduledBlocks: [],
  commitments: [],
};

function contentResponse(content: string, usage?: { prompt_tokens: number; completion_tokens: number }) {
  return { choices: [{ message: { content } }], usage };
}

describe("callAIPlanner", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("parses a well-formed operation", async () => {
    mockCreate.mockResolvedValue(
      contentResponse(
        JSON.stringify({
          summary: "Move the run.",
          operations: [
            { type: "MOVE_ACTIVITY", blockId: "b1", activityId: null, goalId: null, targetDate: "2026-08-12", newPriority: null },
          ],
        }),
        { prompt_tokens: 10, completion_tokens: 5 },
      ),
    );

    const result = await callAIPlanner(CONTEXT);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.operations).toEqual([{ type: "MOVE_ACTIVITY", blockId: "b1", targetDate: "2026-08-12" }]);
      expect(result.inputTokens).toBe(10);
      expect(result.outputTokens).toBe(5);
    }
  });

  it("drops an operation of an unsupported type and fails when nothing valid remains", async () => {
    mockCreate.mockResolvedValue(
      contentResponse(
        JSON.stringify({
          summary: "test",
          operations: [{ type: "SWAP_ACTIVITIES", blockId: null, activityId: null, goalId: null, targetDate: null, newPriority: null }],
        }),
      ),
    );

    const result = await callAIPlanner(CONTEXT);
    expect(result.ok).toBe(false);
  });

  it("fails when a required field for the operation's type is missing", async () => {
    mockCreate.mockResolvedValue(
      contentResponse(
        JSON.stringify({
          summary: "test",
          operations: [{ type: "MOVE_ACTIVITY", blockId: null, activityId: null, goalId: null, targetDate: "2026-08-12", newPriority: null }],
        }),
      ),
    );

    const result = await callAIPlanner(CONTEXT);
    expect(result.ok).toBe(false);
  });

  it("fails on malformed (non-JSON) output", async () => {
    mockCreate.mockResolvedValue(contentResponse("not valid json"));
    const result = await callAIPlanner(CONTEXT);
    expect(result.ok).toBe(false);
  });

  it("fails closed when the API call throws", async () => {
    mockCreate.mockRejectedValue(new Error("network error"));
    const result = await callAIPlanner(CONTEXT);
    expect(result.ok).toBe(false);
  });
});
