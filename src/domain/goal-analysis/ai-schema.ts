import { z } from "zod";
import { ORANGE_SIZES } from "./types";

const goal = z.string().trim().min(1).max(200);
const context = z.string().trim().max(500);
const action = z.string().trim().min(1).max(200);
const numericSize = z.number().refine((value) => ORANGE_SIZES.some((size) => size === value));

export const AnalysisRequestSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("goal"), originalGoal: goal, context }).strict(),
  z.object({ mode: z.literal("action"), originalGoal: goal, context, currentAction: action, previousSize: numericSize }).strict(),
]);
export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;

export const ModelDecisionSchema = z.object({
  isFinite: z.boolean(),
  suggestedFiniteGoal: z.string().max(200),
  orangeSizeCm: z.enum([...ORANGE_SIZES.map(String), "infinity"]),
  reason: z.string().max(240),
  starterAction: z.string().max(200),
  progressUnitLabel: z.string().max(30),
  progressUnitReason: z.string().max(160),
  suggestedActions: z.array(z.object({ action: z.string().max(200), orangeSizeCm: z.enum(ORANGE_SIZES.map(String)) })).max(2),
  canCompleteWithinThreeMinutes: z.boolean(),
});
export type ModelDecision = z.infer<typeof ModelDecisionSchema>;

export const AnalysisResultSchema = z.object({
  originalGoal: goal,
  currentAction: action.nullable(),
  isFinite: z.boolean(),
  suggestedFiniteGoal: z.string().max(200),
  orangeSizeCm: z.union([numericSize, z.literal("infinity")]),
  reason: z.string().min(1).max(240),
  starterAction: action,
  progressUnitLabel: z.string().max(30).optional(),
  progressUnitReason: z.string().max(160).optional(),
  suggestedActions: z.array(z.object({ action, orangeSizeCm: numericSize })).max(2),
  canCompleteWithinThreeMinutes: z.boolean(),
}).strict();
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
