import type { SavedGoal } from "@/domain/goals/saved-goal";

export type GoalLoadResult = { goals: SavedGoal[]; skippedInvalid: number };

export interface GoalRepository {
  list(): Promise<GoalLoadResult>;
  put(goal: SavedGoal): Promise<void>;
  harvest(goalId: string, harvestedAt: number, randomValue: number, recordId: string): Promise<SavedGoal | null>;
}
