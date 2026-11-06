import { describe, expect, it } from "vitest";
import { mockAnalyzeGoal } from "./mock-analyze-goal";
import { ORANGE_SIZES } from "./types";

describe("mockAnalyzeGoal", () => {
  it("returns a book-specific analysis", () => {
    const result = mockAnalyzeGoal("책 한 권 읽기", "이번 달 안에 읽고 싶어요");

    expect(result.goal).toBe("책 한 권 읽기");
    expect(result.orangeSizeCm).toBe(100);
    expect(result.starterAction).toContain("첫 문장");
  });

  it("uses only an allowed fixed orange size", () => {
    const result = mockAnalyzeGoal("새로운 목표 준비하기", "아직 막막해요");

    expect(ORANGE_SIZES).toContain(result.orangeSizeCm);
  });

  it("uses context when choosing the mock profile", () => {
    const result = mockAnalyzeGoal("이번 달 목표", "방을 청소하고 싶어요");

    expect(result.orangeSizeCm).toBe(50);
    expect(result.starterAction).toContain("물건 하나");
  });

  it("prioritizes the final goal over unrelated context keywords", () => {
    const result = mockAnalyzeGoal("게임 만들기", "책을 읽다가 아이디어가 났어요");
    expect(result.orangeSizeCm).toBe(300);
    expect(result.starterAction).toContain("편집기");
  });

  it("does not mistake a desk for a book", () => {
    const result = mockAnalyzeGoal("책상 정리하기", "");
    expect(result.orangeSizeCm).toBe(50);
    expect(result.starterAction).toContain("물건 하나");
  });
});
