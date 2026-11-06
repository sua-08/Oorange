import { AnalysisResultSchema, ModelDecisionSchema, type AnalysisRequest } from "./ai-schema";

export class InvalidAnalysisError extends Error {
  constructor() { super("AI analysis did not satisfy product rules"); }
}

export function validateAiAnalysis(request: AnalysisRequest, unknownDecision: unknown) {
  const parsed = ModelDecisionSchema.safeParse(unknownDecision);
  if (!parsed.success) throw new InvalidAnalysisError();
  const decision = parsed.data;
  const size = decision.orangeSizeCm === "infinity" ? "infinity" : Number(decision.orangeSizeCm);
  const suggestions = decision.suggestedActions.map((item) => ({
    action: item.action.trim(), orangeSizeCm: Number(item.orangeSizeCm),
  }));
  const result = AnalysisResultSchema.safeParse({
    originalGoal: request.originalGoal,
    currentAction: request.mode === "action" ? request.currentAction : null,
    isFinite: decision.isFinite,
    suggestedFiniteGoal: decision.suggestedFiniteGoal.trim(),
    orangeSizeCm: size,
    reason: decision.reason.trim(),
    starterAction: decision.starterAction.trim(),
    progressUnitLabel: decision.progressUnitLabel.trim(),
    progressUnitReason: decision.progressUnitReason.trim(),
    suggestedActions: suggestions,
    canCompleteWithinThreeMinutes: decision.canCompleteWithinThreeMinutes,
  });
  if (!result.success) throw new InvalidAnalysisError();
  const value = result.data;

  if (!value.isFinite) {
    if (value.orangeSizeCm !== "infinity" || !value.suggestedFiniteGoal || value.canCompleteWithinThreeMinutes || suggestions.length) {
      throw new InvalidAnalysisError();
    }
    return value;
  }
  if (value.orangeSizeCm === "infinity" || value.suggestedFiniteGoal) throw new InvalidAnalysisError();
  if (!value.progressUnitLabel || !value.progressUnitReason) throw new InvalidAnalysisError();
  const currentSize = value.orangeSizeCm;
  if (request.mode === "action" && currentSize >= request.previousSize) throw new InvalidAnalysisError();
  if (value.canCompleteWithinThreeMinutes && (request.mode !== "action" || currentSize > 3)) throw new InvalidAnalysisError();
  if (!value.canCompleteWithinThreeMinutes && currentSize <= 3 && request.mode === "action") throw new InvalidAnalysisError();
  if (!value.canCompleteWithinThreeMinutes && suggestions.length === 0) throw new InvalidAnalysisError();
  if (suggestions.some((item) => item.orangeSizeCm >= currentSize || item.action === (request.mode === "action" ? request.currentAction : request.originalGoal))) {
    throw new InvalidAnalysisError();
  }
  if (new Set(suggestions.map((item) => item.action)).size !== suggestions.length) throw new InvalidAnalysisError();
  return value;
}
