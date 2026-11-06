import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SavedGoal } from "@/domain/goals/saved-goal";
import { EncyclopediaView } from "./encyclopedia-view";

const repositoryState = vi.hoisted(() => ({ goals: [] as SavedGoal[] }));
vi.mock("@/infrastructure/db/indexeddb/goal-repository", () => ({
  indexedDbGoalRepository: {
    list: async () => ({ goals: repositoryState.goals, skippedInvalid: 0 }),
  },
}));

const ids = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"];
function harvestedGoal(index: number): SavedGoal {
  const id = ids[index];
  return {
    id, context: "", analysis: {
      originalGoal: `목표 ${index}`, currentAction: null, isFinite: true,
      suggestedFiniteGoal: "", orangeSizeCm: 100, reason: "유한해요.",
      starterAction: "문서 열기", suggestedActions: [], canCompleteWithinThreeMinutes: false,
    }, measurements: [], seed: { finalGoal: `목표 ${index}`, starterAction: "문서 열기", acquiredAt: 1 },
    progress: { unitLabel: "항목", targetAmount: 1, currentAmount: 1 },
    harvest: { id, goalId: id, originalGoal: `목표 ${index}`, seededAt: 1, harvestedAt: 10 + index, varietyId: "basic", varietyRuleVersion: 1 },
    status: "harvested", createdAt: 1, updatedAt: 10 + index,
  };
}

beforeEach(() => { repositoryState.goals = []; });

describe("EncyclopediaView", () => {
  it("shows both varieties before the first harvest", async () => {
    render(<EncyclopediaView />);
    expect(await screen.findByText("만난 품종 0 / 2 · 수확한 오렌지 0개")).toBeInTheDocument();
    expect(screen.getAllByText("아직 만나지 못했어요")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /홈으로/ })).toHaveAttribute("href", "/");
  });
  it("restores duplicate harvest counts from browser records", async () => {
    repositoryState.goals = [harvestedGoal(0), harvestedGoal(1)];
    render(<EncyclopediaView />);
    expect(await screen.findByText("만난 품종 1 / 2 · 수확한 오렌지 2개")).toBeInTheDocument();
    expect(screen.getByText("2개 수확")).toBeInTheDocument();
    expect(screen.getByText("아직 0개")).toBeInTheDocument();
  });
});
