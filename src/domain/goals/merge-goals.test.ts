import { describe, expect, it, vi } from "vitest";
import { mergeGoals } from "./merge-goals";
import type { SavedGoal } from "./saved-goal";

function goal(id: string, updatedAt: number, status: SavedGoal["status"] = "active"): SavedGoal {
  return { id, updatedAt, status } as SavedGoal;
}

describe("mergeGoals", () => {
  it("keeps distinct local and remote goals and chooses the newer shared snapshot", () => {
    const result = mergeGoals(
      [goal("a", 4), goal("b", 2)],
      [goal("a", 3), goal("c", 1)],
    );
    expect(result.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(result[0].updatedAt).toBe(4);
    expect(mergeGoals(result, result)).toEqual(result);
  });

  it("preserves a completed harvest even when a stale active snapshot has a later timestamp", () => {
    const result = mergeGoals([goal("a", 9, "active")], [goal("a", 5, "harvested")]);
    expect(result[0].status).toBe("harvested");
  });

  it("moves excess cross-device active goals to the freezer without deleting them", () => {
    vi.setSystemTime(10);
    const result = mergeGoals([goal("a", 4), goal("b", 3)], [goal("c", 2), goal("d", 1)]);
    expect(result).toHaveLength(4);
    expect(result.filter((item) => item.status === "active")).toHaveLength(3);
    expect(result.find((item) => item.id === "d")?.status).toBe("frozen");
    vi.useRealTimers();
  });
});
