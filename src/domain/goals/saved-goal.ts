import { z } from "zod";
import { AnalysisResultSchema } from "@/domain/goal-analysis/ai-schema";
import { ProgressSchema } from "@/domain/progress/progress";
import { HarvestRecordSchema } from "@/domain/harvest/harvest";

export const SavedGoalSchema = z.object({
  id: z.string().uuid(),
  context: z.string().max(500),
  analysis: AnalysisResultSchema,
  measurements: z.array(AnalysisResultSchema),
  seed: z.object({
    finalGoal: z.string().min(1),
    starterAction: z.string().min(1),
    acquiredAt: z.number().int().nonnegative(),
  }).nullable(),
  progress: ProgressSchema.nullable().optional(),
  progressHistory: z.array(z.object({
    previous: ProgressSchema.nullable(),
    next: ProgressSchema,
    changedAt: z.number().int().nonnegative(),
  }).strict()).optional(),
  harvest: HarvestRecordSchema.optional(),
  status: z.enum(["awaiting_start", "active", "frozen", "harvested"]),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
}).strict().superRefine((record, ctx) => {
  if (record.seed && (record.status === "awaiting_start" || record.seed.finalGoal !== record.analysis.originalGoal)) {
    ctx.addIssue({ code: "custom", message: "씨앗과 최종 목표가 일치하지 않아요." });
  }
  if (record.measurements.some((step) => step.originalGoal !== record.analysis.originalGoal || step.currentAction === null)) {
    ctx.addIssue({ code: "custom", message: "첫 행동 기록이 최종 목표와 일치하지 않아요." });
  }
  if (record.progress && !record.seed) {
    ctx.addIssue({ code: "custom", message: "씨앗을 얻기 전에는 진행률을 저장할 수 없어요." });
  }
  if (record.status === "harvested" !== !!record.harvest || (record.harvest && (
    record.harvest.goalId !== record.id ||
    record.harvest.originalGoal !== record.analysis.originalGoal ||
    !record.progress || record.progress.currentAmount !== record.progress.targetAmount
  ))) {
    ctx.addIssue({ code: "custom", message: "수확 기록이 목표와 일치하지 않아요." });
  }
});

export type SavedGoal = z.infer<typeof SavedGoalSchema>;

export const MAX_ACTIVE_GOALS = 3;

export function canAddActiveGoal(goals: SavedGoal[]): boolean {
  return goals.filter((goal) => goal.status === "active" || goal.status === "awaiting_start").length < MAX_ACTIVE_GOALS;
}

export function canThawGoal(goals: SavedGoal[], id: string): boolean {
  const goal = goals.find((item) => item.id === id);
  return !!goal && goal.status === "frozen" && canAddActiveGoal(goals);
}
