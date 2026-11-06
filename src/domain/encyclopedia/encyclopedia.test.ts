import { describe, expect, it } from "vitest";
import type { SavedGoal } from "@/domain/goals/saved-goal";
import { buildEncyclopedia } from "./encyclopedia";

const ids = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
];

function harvestedGoal(index: number, varietyId: "basic" | "sunshine"): SavedGoal {
  const id = ids[index];
  return {
    id, context: "", analysis: {
      originalGoal: `목표 ${index}`, currentAction: null, isFinite: true,
      suggestedFiniteGoal: "", orangeSizeCm: 100, reason: "유한해요.",
      starterAction: "문서 열기", suggestedActions: [], canCompleteWithinThreeMinutes: false,
    }, measurements: [], seed: { finalGoal: `목표 ${index}`, starterAction: "문서 열기", acquiredAt: 1 },
    progress: { unitLabel: "항목", targetAmount: 1, currentAmount: 1 },
    harvest: {
      id, goalId: id, originalGoal: `목표 ${index}`, seededAt: 1, harvestedAt: 100 + index,
      varietyId, varietyRuleVersion: 1,
    },
    status: "harvested", createdAt: 1, updatedAt: 100 + index,
  };
}

describe("encyclopedia", () => {
  it("shows locked varieties without treating them as lost or failed", () => {
    expect(buildEncyclopedia([]).map(({ id, count, unlocked }) => ({ id, count, unlocked }))).toEqual([
      { id: "basic", count: 0, unlocked: false },
      { id: "sunshine", count: 0, unlocked: false },
    ]);
  });
  it("counts duplicate varieties from distinct harvests", () => {
    const entries = buildEncyclopedia([harvestedGoal(0, "basic"), harvestedGoal(1, "basic"), harvestedGoal(2, "sunshine")]);
    expect(entries[0].count).toBe(2);
    expect(entries[0].unlocked).toBe(true);
    expect(entries[1].count).toBe(1);
    expect(entries[1].latestHarvest?.goalId).toBe(ids[2]);
  });
  it("does not count the same goal twice", () => {
    const harvested = harvestedGoal(0, "basic");
    expect(buildEncyclopedia([harvested, harvested])[0].count).toBe(1);
  });
});
