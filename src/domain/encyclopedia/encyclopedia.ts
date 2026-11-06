import type { SavedGoal } from "@/domain/goals/saved-goal";
import { varietyLabels, type HarvestRecord } from "@/domain/harvest/harvest";

export type VarietyId = HarvestRecord["varietyId"];
export type EncyclopediaEntry = {
  id: VarietyId;
  label: string;
  description: string;
  count: number;
  unlocked: boolean;
  latestHarvest: HarvestRecord | null;
};

const varieties: { id: VarietyId; description: string }[] = [
  { id: "basic", description: "작은 시작이 모여 자란 든든한 오렌지예요." },
  { id: "sunshine", description: "햇살처럼 밝은 기운을 가진 특별한 오렌지예요." },
];

export function buildEncyclopedia(goals: SavedGoal[]): EncyclopediaEntry[] {
  const uniqueRecords = new Map<string, HarvestRecord>();
  for (const goal of goals) {
    if (goal.status === "harvested" && goal.harvest && goal.harvest.goalId === goal.id) {
      uniqueRecords.set(goal.id, goal.harvest);
    }
  }
  const records = [...uniqueRecords.values()];
  return varieties.map(({ id, description }) => {
    const matching = records.filter((record) => record.varietyId === id);
    const latestHarvest = matching.sort((a, b) => b.harvestedAt - a.harvestedAt)[0] ?? null;
    return {
      id,
      label: varietyLabels[id],
      description,
      count: matching.length,
      unlocked: matching.length > 0,
      latestHarvest,
    };
  });
}
