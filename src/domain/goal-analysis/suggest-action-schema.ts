import { z } from "zod";

export const SuggestActionRequestSchema = z.object({
  originalGoal: z.string().trim().min(1).max(200),
  context: z.string().trim().max(500),
  previousAction: z.string().trim().min(1).max(200),
}).strict();

export const SuggestedActionSchema = z.object({
  action: z.string().trim().min(1).max(200),
}).strict();

export type SuggestActionRequest = z.infer<typeof SuggestActionRequestSchema>;
export type SuggestedAction = z.infer<typeof SuggestedActionSchema>;
