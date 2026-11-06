import { z } from "zod";

const amount = z.number().int().nonnegative().safe();

export const ProgressSchema = z.object({
  unitLabel: z.string().trim().min(1).max(30),
  targetAmount: amount.positive(),
  currentAmount: amount,
}).strict().refine((value) => value.currentAmount <= value.targetAmount, {
  message: "현재 진행량은 전체 범위를 넘을 수 없어요.",
});

export type Progress = z.infer<typeof ProgressSchema>;
export type GrowthStage = "seed" | "sprout" | "tree" | "flower" | "fruit_ready";

export function progressPercent(progress: Progress): number {
  const valid = ProgressSchema.parse(progress);
  if (valid.currentAmount === valid.targetAmount) return 100;
  return Math.min(99, Math.ceil((valid.currentAmount / valid.targetAmount) * 100));
}

export function growthStage(progress: Progress): GrowthStage {
  const percent = progressPercent(progress);
  if (percent === 0) return "seed";
  if (percent <= 25) return "sprout";
  if (percent <= 60) return "tree";
  if (percent < 100) return "flower";
  return "fruit_ready";
}

export function addProgress(progress: Progress, amountToAdd = 1): Progress {
  if (!Number.isSafeInteger(amountToAdd) || amountToAdd <= 0) {
    throw new Error("추가할 진행량은 1 이상의 정수여야 해요.");
  }
  return ProgressSchema.parse({ ...progress, currentAmount: progress.currentAmount + amountToAdd });
}

export function correctProgress(progress: Progress, changes: Partial<Progress>): Progress {
  return ProgressSchema.parse({ ...progress, ...changes });
}
