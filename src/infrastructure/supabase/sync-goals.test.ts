import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SavedGoal } from "@/domain/goals/saved-goal";
import { indexedDbGoalRepository } from "@/infrastructure/db/indexeddb/goal-repository";
import { getSupabaseClient } from "./client";
import { CLOUD_OWNER_KEY, syncGoals } from "./sync-goals";

vi.mock("./client", () => ({ getSupabaseClient: vi.fn() }));
vi.mock("@/infrastructure/db/indexeddb/goal-repository", () => ({
  indexedDbGoalRepository: { list: vi.fn(), put: vi.fn() },
}));

const record = {
  id: "a8c1647c-04fe-4eaa-9825-8d1f6ae146db",
  context: "",
  analysis: {
    originalGoal: "책 한 권 읽기", currentAction: null, isFinite: true,
    suggestedFiniteGoal: "", orangeSizeCm: 100, reason: "큰 목표예요.",
    starterAction: "책 펴기", suggestedActions: [], canCompleteWithinThreeMinutes: false,
  },
  measurements: [], seed: null, status: "awaiting_start", createdAt: 1, updatedAt: 2,
} as SavedGoal;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("syncGoals", () => {
  it("merges a cloud goal into local storage and uploads a distinct local goal", async () => {
    const local = { ...record, id: "1adcfe04-8539-469f-86e2-e9c8ed00f7aa" };
    vi.mocked(indexedDbGoalRepository.list).mockResolvedValue({ goals: [local], skippedInvalid: 0 });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const range = vi.fn().mockResolvedValue({ data: [{ record }], error: null });
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: "user-1", is_anonymous: false } }, error: null }) },
      from: () => ({ select: () => ({ order: () => ({ range }) }), upsert }),
    } as unknown as NonNullable<ReturnType<typeof getSupabaseClient>>);
    const result = await syncGoals();
    expect(result.map((item) => item.id)).toContain(record.id);
    expect(indexedDbGoalRepository.put).toHaveBeenCalledWith(record);
    expect(upsert).toHaveBeenCalledWith([{ user_id: "user-1", id: local.id, record: local, updated_at: 2 }], { onConflict: "user_id,id" });
  });

  it("does not sync an anonymous auth user", async () => {
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: "anon", is_anonymous: true } }, error: null }) },
    } as unknown as NonNullable<ReturnType<typeof getSupabaseClient>>);
    await expect(syncGoals()).rejects.toThrow("Google 계정");
    expect(indexedDbGoalRepository.list).not.toHaveBeenCalled();
  });

  it("never uploads this browser's records to a different signed-in account", async () => {
    localStorage.setItem(CLOUD_OWNER_KEY, "previous-user");
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: "new-user", is_anonymous: false } }, error: null }) },
    } as unknown as NonNullable<ReturnType<typeof getSupabaseClient>>);
    await expect(syncGoals()).rejects.toThrow("다른 계정");
    expect(indexedDbGoalRepository.list).not.toHaveBeenCalled();
  });
});
