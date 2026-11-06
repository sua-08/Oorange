import { describe, expect, it } from "vitest";
import { canAddActiveGoal, canThawGoal, SavedGoalSchema, type SavedGoal } from "./saved-goal";

function goal(id: string, status: SavedGoal["status"]): SavedGoal {
  return { id, context: "", analysis: {
    originalGoal: "책 한 권 읽기", currentAction: null, isFinite: true,
    suggestedFiniteGoal: "", orangeSizeCm: 100, reason: "범위가 커요.",
    starterAction: "책 꺼내기", suggestedActions: [], canCompleteWithinThreeMinutes: false,
  }, measurements: [], seed: null, status, createdAt: 1, updatedAt: 1 };
}

describe("saved goal rules", () => {
  const ids = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
    "00000000-0000-4000-8000-000000000003",
    "00000000-0000-4000-8000-000000000004",
  ];
  it("allows at most three non-frozen goals", () => {
    const goals = ids.slice(0, 3).map((id) => goal(id, "active"));
    expect(canAddActiveGoal(goals)).toBe(false);
    expect(canAddActiveGoal([goal(ids[0], "frozen"), ...goals.slice(1)])).toBe(true);
    expect(canAddActiveGoal([goal(ids[0], "harvested"), ...goals.slice(1)])).toBe(true);
  });
  it("only thaws when a slot is available", () => {
    const goals = [goal(ids[0], "frozen"), ...ids.slice(1).map((id) => goal(id, "active"))];
    expect(canThawGoal(goals, ids[0])).toBe(false);
    expect(canThawGoal(goals.slice(0, 3), ids[0])).toBe(true);
  });
  it("rejects damaged saved data", () => {
    expect(SavedGoalSchema.safeParse(goal(ids[0], "active")).success).toBe(true);
    expect(SavedGoalSchema.safeParse({ ...goal(ids[0], "active"), status: "unknown" }).success).toBe(false);
    expect(SavedGoalSchema.safeParse({ ...goal(ids[0], "active"), seed: {
      finalGoal: "다른 목표", starterAction: "책 꺼내기", acquiredAt: 2,
    } }).success).toBe(false);
  });
});
