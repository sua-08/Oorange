import { mockProfileFor } from "./mock-goal-profiles";
import type { GoalAnalysis } from "./types";

export function mockAnalyzeGoal(goal: string, context: string): GoalAnalysis {
  const normalizedGoal = goal.trim();
  const profile = mockProfileFor(normalizedGoal, context);
  return {
    goal: normalizedGoal,
    orangeSizeCm: profile.orangeSizeCm,
    reason: profile.reason,
    starterAction: profile.starterAction,
  };
}
