import { describe, expect, it } from "vitest";
import type { SavedGoal } from "@/domain/goals/saved-goal";
import { BASIC_VARIETY_CHANCE, canHarvest, createHarvestedGoal } from "./harvest";

const goalId = "00000000-0000-4000-8000-000000000001";
const recordId = "00000000-0000-4000-8000-000000000002";
function completedGoal(): SavedGoal {
  return {
    id: goalId, context: "", analysis: {
      originalGoal: "책 한 권 읽기", currentAction: null, isFinite: true,
      suggestedFiniteGoal: "", orangeSizeCm: 100, reason: "한 권이에요.",
      starterAction: "책 꺼내기", suggestedActions: [], canCompleteWithinThreeMinutes: false,
    }, measurements: [], seed: { finalGoal: "책 한 권 읽기", starterAction: "책 꺼내기", acquiredAt: 100 },
    progress: { unitLabel: "페이지", currentAmount: 100, targetAmount: 100 }, status: "active", createdAt: 1, updatedAt: 100,
  };
}

describe("harvest rules", () => {
  it("requires a completed, active, unharvested goal", () => {
    const ready = completedGoal();
    expect(canHarvest(ready)).toBe(true);
    expect(canHarvest({ ...ready, progress: { unitLabel: "페이지", currentAmount: 99, targetAmount: 100 } })).toBe(false);
    expect(canHarvest({ ...ready, progress: { unitLabel: "페이지", currentAmount: 999, targetAmount: 1000 } })).toBe(false);
    expect(canHarvest({ ...ready, status: "frozen" })).toBe(false);
    expect(canHarvest({ ...ready, seed: null })).toBe(false);
  });
  it("uses fixed 94% basic and 6% sunshine odds with no pity", () => {
    const ready = completedGoal();
    expect(createHarvestedGoal(ready, 200, 0, recordId).harvest?.varietyId).toBe("basic");
    expect(createHarvestedGoal(ready, 200, BASIC_VARIETY_CHANCE - 0.0001, recordId).harvest?.varietyId).toBe("basic");
    expect(createHarvestedGoal(ready, 200, BASIC_VARIETY_CHANCE, recordId).harvest?.varietyId).toBe("sunshine");
    expect(createHarvestedGoal(ready, 200, 0.9999, recordId).harvest?.varietyId).toBe("sunshine");
  });
  it("does not allow a second harvest", () => {
    const harvested = createHarvestedGoal(completedGoal(), 200, 0.98, recordId);
    expect(canHarvest(harvested)).toBe(false);
    expect(() => createHarvestedGoal(harvested, 300, 0, recordId)).toThrow();
  });
});
