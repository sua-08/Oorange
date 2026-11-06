import { describe, expect, it } from "vitest";
import { addProgress, correctProgress, growthStage, progressPercent, ProgressSchema } from "./progress";

describe("equal-weight cumulative progress", () => {
  it.each([
    [0, "seed"], [1, "sprout"], [25, "sprout"],
    [26, "tree"], [60, "tree"], [61, "flower"],
    [99, "flower"], [100, "fruit_ready"],
  ] as const)("maps %i%% to %s", (currentAmount, stage) => {
    expect(growthStage({ unitLabel: "페이지", targetAmount: 100, currentAmount })).toBe(stage);
  });

  it("counts participating days without a streak or missed-day penalty", () => {
    const initial = { unitLabel: "참여 일수", targetAmount: 100, currentAmount: 0 };
    const afterFirstDay = addProgress(initial);
    expect(progressPercent(afterFirstDay)).toBe(1);
    expect(progressPercent(afterFirstDay)).toBe(1);
    expect(addProgress(afterFirstDay).currentAmount).toBe(2);
  });

  it("shows nonzero progress as at least one percent", () => {
    expect(progressPercent({ unitLabel: "페이지", targetAmount: 1000, currentAmount: 1 })).toBe(1);
    expect(progressPercent({ unitLabel: "페이지", targetAmount: 1000, currentAmount: 999 })).toBe(99);
  });

  it("allows range and amount corrections without penalty", () => {
    const initial = { unitLabel: "강의", targetAmount: 10, currentAmount: 5 };
    const corrected = correctProgress(initial, { targetAmount: 20, currentAmount: 3 });
    expect(corrected).toEqual({ unitLabel: "강의", targetAmount: 20, currentAmount: 3 });
    expect(progressPercent(corrected)).toBe(15);
  });

  it("rejects invalid or weighted amounts", () => {
    expect(ProgressSchema.safeParse({ unitLabel: "", targetAmount: 10, currentAmount: 0 }).success).toBe(false);
    expect(ProgressSchema.safeParse({ unitLabel: "회", targetAmount: 0, currentAmount: 0 }).success).toBe(false);
    expect(ProgressSchema.safeParse({ unitLabel: "회", targetAmount: 3, currentAmount: 4 }).success).toBe(false);
    expect(ProgressSchema.safeParse({ unitLabel: "회", targetAmount: 3, currentAmount: 1.5 }).success).toBe(false);
    expect(() => addProgress({ unitLabel: "회", targetAmount: 3, currentAmount: 0 }, 1.5)).toThrow();
  });
});
