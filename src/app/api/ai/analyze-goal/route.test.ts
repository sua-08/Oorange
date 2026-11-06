import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOpenAiDecision } from "@/infrastructure/ai/openai-goal-analyzer";
import { POST } from "./route";

vi.mock("@/infrastructure/ai/openai-goal-analyzer", async () => {
  const actual = await vi.importActual<typeof import("@/infrastructure/ai/openai-goal-analyzer")>("@/infrastructure/ai/openai-goal-analyzer");
  return { ...actual, getOpenAiDecision: vi.fn() };
});

const decision = {
  isFinite: true, suggestedFiniteGoal: "", orangeSizeCm: "300", reason: "여러 단계가 있어요.",
  starterAction: "편집기 열기", suggestedActions: [{ action: "작은 기능 하나 만들기", orangeSizeCm: "30" }],
  progressUnitLabel: "항목", progressUnitReason: "기능을 같은 비중으로 셀 수 있어요.",
  canCompleteWithinThreeMinutes: false,
};

function post(body: unknown) {
  return POST(new Request("http://localhost/api/ai/analyze-goal", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }));
}

beforeEach(() => vi.mocked(getOpenAiDecision).mockReset());

describe("POST /api/ai/analyze-goal", () => {
  it("accepts a goal and returns a validated result without changing its name", async () => {
    vi.mocked(getOpenAiDecision).mockResolvedValue(decision);
    const response = await post({ mode: "goal", originalGoal: "게임 만들기", context: "" });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ originalGoal: "게임 만들기", orangeSizeCm: 300 });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects invalid input before calling the model", async () => {
    const response = await post({ mode: "action", originalGoal: "게임 만들기", context: "", currentAction: "", previousSize: 7 });
    expect(response.status).toBe(400);
    expect(getOpenAiDecision).not.toHaveBeenCalled();
  });

  it("validates a smaller action against the previous size", async () => {
    vi.mocked(getOpenAiDecision).mockResolvedValue({
      ...decision, orangeSizeCm: "1", suggestedActions: [], canCompleteWithinThreeMinutes: true,
    });
    const response = await post({
      mode: "action", originalGoal: "게임 만들기", context: "", currentAction: "편집기 열기", previousSize: 10,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      originalGoal: "게임 만들기", currentAction: "편집기 열기", orangeSizeCm: 1,
      canCompleteWithinThreeMinutes: true,
    });
  });

  it("rejects malformed model output rather than returning it to the browser", async () => {
    vi.mocked(getOpenAiDecision).mockResolvedValue({ ...decision, orangeSizeCm: "7" } as never);
    const response = await post({ mode: "goal", originalGoal: "게임 만들기", context: "" });
    expect(response.status).toBe(502);
  });

});
