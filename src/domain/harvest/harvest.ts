import { z } from "zod";
import type { SavedGoal } from "@/domain/goals/saved-goal";

export const VARIETY_RULE_VERSION = 1;
export const BASIC_VARIETY_CHANCE = 0.94;

export const HarvestRecordSchema = z.object({
  id: z.string().uuid(),
  goalId: z.string().uuid(),
  originalGoal: z.string().min(1).max(200),
  seededAt: z.number().int().nonnegative(),
  harvestedAt: z.number().int().nonnegative(),
  varietyId: z.enum(["basic", "sunshine"]),
  varietyRuleVersion: z.literal(VARIETY_RULE_VERSION),
}).strict();
export type HarvestRecord = z.infer<typeof HarvestRecordSchema>;

export const varietyLabels: Record<HarvestRecord["varietyId"], string> = {
  basic: "기본 오렌지",
  sunshine: "햇살 오렌지",
};

export function canHarvest(goal: SavedGoal): boolean {
  return goal.status === "active" && !!goal.seed && !!goal.progress && !goal.harvest
    && goal.progress.currentAmount === goal.progress.targetAmount;
}

export function createHarvestedGoal(goal: SavedGoal, harvestedAt: number, randomValue: number, recordId: string): SavedGoal {
  if (!canHarvest(goal)) throw new Error("아직 수확할 수 없는 목표예요.");
  if (!Number.isSafeInteger(harvestedAt) || harvestedAt < goal.seed!.acquiredAt) throw new Error("수확 시각을 확인할 수 없어요.");
  if (randomValue < 0 || randomValue >= 1 || !Number.isFinite(randomValue)) throw new Error("추첨값을 확인할 수 없어요.");
  const harvest = HarvestRecordSchema.parse({
    id: recordId,
    goalId: goal.id,
    originalGoal: goal.analysis.originalGoal,
    seededAt: goal.seed!.acquiredAt,
    harvestedAt,
    varietyId: randomValue < BASIC_VARIETY_CHANCE ? "basic" : "sunshine",
    varietyRuleVersion: VARIETY_RULE_VERSION,
  });
  return { ...goal, harvest, status: "harvested", updatedAt: harvestedAt };
}
