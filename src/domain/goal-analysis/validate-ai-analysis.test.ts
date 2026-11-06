import { describe, expect, it } from "vitest";
import type { AnalysisRequest, ModelDecision } from "./ai-schema";
import { InvalidAnalysisError, validateAiAnalysis } from "./validate-ai-analysis";

const goalRequest: AnalysisRequest = { mode: "goal", originalGoal: "게임 만들기", context: "처음 시작해요" };
const actionRequest: AnalysisRequest = { mode: "action", originalGoal: "게임 만들기", context: "처음 시작해요", currentAction: "편집기 열기", previousSize: 10 };
const validGoal: ModelDecision = {
  isFinite: true, suggestedFiniteGoal: "", orangeSizeCm: "300", reason: "여러 단계가 있어요.",
  starterAction: "편집기 열기", suggestedActions: [{ action: "작은 기능 하나 만들기", orangeSizeCm: "30" }],
  progressUnitLabel: "항목", progressUnitReason: "완료한 작은 기능을 같은 비중으로 셀 수 있어요.",
  canCompleteWithinThreeMinutes: false,
};

describe("AI result validation", () => {
  it("preserves the user-supplied original goal and validates shrinking", () => {
    const first = validateAiAnalysis(goalRequest, validGoal);
    expect(first.originalGoal).toBe("게임 만들기");
    expect(first.orangeSizeCm).toBe(300);
    const action = validateAiAnalysis(actionRequest, {
      ...validGoal, orangeSizeCm: "1", suggestedActions: [], canCompleteWithinThreeMinutes: true,
    });
    expect(action.originalGoal).toBe("게임 만들기");
    expect(action.currentAction).toBe("편집기 열기");
  });

  it.each([
    ["unknown cm", { ...validGoal, orangeSizeCm: "7" }],
    ["larger suggestion", { ...validGoal, suggestedActions: [{ action: "더 큰 일", orangeSizeCm: "500" }] }],
    ["duplicate suggestion", { ...validGoal, suggestedActions: [{ action: "파일 열기", orangeSizeCm: "1" }, { action: "파일 열기", orangeSizeCm: "0.5" }] }],
    ["missing progress unit", { ...validGoal, progressUnitLabel: "" }],
    ["endless goal with finite cm", { ...validGoal, isFinite: false, suggestedFiniteGoal: "게임 한 개 만들기", suggestedActions: [] }],
  ])("rejects %s", (_name, output) => {
    expect(() => validateAiAnalysis(goalRequest, output)).toThrow(InvalidAnalysisError);
  });

  it("rejects a non-shrinking custom action and premature seed eligibility", () => {
    expect(() => validateAiAnalysis(actionRequest, { ...validGoal, orangeSizeCm: "30" })).toThrow(InvalidAnalysisError);
    expect(() => validateAiAnalysis(actionRequest, { ...validGoal, orangeSizeCm: "10", canCompleteWithinThreeMinutes: true })).toThrow(InvalidAnalysisError);
  });

  it("accepts an infinite goal only with a finite suggestion and no seed", () => {
    const result = validateAiAnalysis(goalRequest, {
      ...validGoal, isFinite: false, suggestedFiniteGoal: "게임 한 개 만들기", orangeSizeCm: "infinity",
      suggestedActions: [], canCompleteWithinThreeMinutes: false,
    });
    expect(result.orangeSizeCm).toBe("infinity");
    expect(result.isFinite).toBe(false);
  });
});
