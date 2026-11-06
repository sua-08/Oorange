import { describe, expect, it } from "vitest";
import { getSmallerActionSuggestions, mockMeasureSmallerAction } from "./mock-reduce-goal";
import { ORANGE_SIZES } from "./types";

describe("mock goal reduction", () => {
  it("offers progressively smaller book actions from the current size", () => {
    const first = getSmallerActionSuggestions("책 한 권 읽기", "", 100);
    expect(first.map((step) => step.orangeSizeCm)).toEqual([30, 10]);

    const second = getSmallerActionSuggestions("책 한 권 읽기", "", 30);
    expect(second.map((step) => step.orangeSizeCm)).toEqual([10, 3]);

    const finalAction = mockMeasureSmallerAction("책 한 권 읽기", "", "한 문단 읽기");
    expect(finalAction.orangeSizeCm).toBe(3);
    expect(finalAction.canCompleteWithinThreeMinutes).toBe(true);
    expect(ORANGE_SIZES).toContain(finalAction.orangeSizeCm);
  });

  it("does not accept a vague custom action as a three-minute action", () => {
    const result = mockMeasureSmallerAction("책 한 권 읽기", "", "책 읽기");
    expect(result.canCompleteWithinThreeMinutes).toBe(false);
    expect(result.orangeSizeCm).toBeGreaterThan(3);
  });

  it("accepts a concrete preparation action without goal details", () => {
    const result = mockMeasureSmallerAction("책 한 권 읽기", "", "책 꺼내기");
    expect(result.orangeSizeCm).toBe(0.5);
    expect(result.canCompleteWithinThreeMinutes).toBe(true);
  });

  it("keeps the game-making path even when the context mentions books", () => {
    const suggestions = getSmallerActionSuggestions("게임 만들기", "책을 읽다가 생각났어요", 300);
    expect(suggestions[0].action).toBe("작은 기능 하나 만들기");
    expect(suggestions.some((step) => step.action.includes("읽기"))).toBe(false);
  });

  it("uses goal-neutral suggestions for unknown goals", () => {
    const suggestions = getSmallerActionSuggestions("자전거 조립하기", "", 100);
    expect(suggestions.map((step) => step.action)).toEqual(["첫 단계 세 가지 적기", "첫 단계 이름 하나 적기"]);
    expect(mockMeasureSmallerAction("자전거 조립하기", "", suggestions[1].action).canCompleteWithinThreeMinutes).toBe(true);
  });
});
