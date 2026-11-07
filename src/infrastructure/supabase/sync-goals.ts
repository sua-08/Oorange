import { mergeGoals } from "@/domain/goals/merge-goals";
import { SavedGoalSchema, type SavedGoal } from "@/domain/goals/saved-goal";
import { indexedDbGoalRepository } from "@/infrastructure/db/indexeddb/goal-repository";
import { getSupabaseClient } from "./client";

let queue: Promise<unknown> = Promise.resolve();
export const CLOUD_OWNER_KEY = "orange-cloud-owner";

export async function syncGoals(): Promise<SavedGoal[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("계정 연결 설정이 아직 준비되지 않았어요.");
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user || userData.user.is_anonymous) throw new Error("Google 계정으로 다시 연결해주세요.");
  const userId = userData.user.id;
  const owner = localStorage.getItem(CLOUD_OWNER_KEY);
  if (owner && owner !== userId) throw new Error("이 브라우저에는 다른 계정의 기록이 있어요. 계정을 확인해주세요.");
  const local = (await indexedDbGoalRepository.list()).goals;
  const remote: SavedGoal[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await supabase.from("goal_records").select("record").order("id").range(start, start + 499);
    if (error) throw new Error("클라우드 기록을 읽지 못했어요. 잠시 뒤 다시 동기화해주세요.");
    for (const row of data ?? []) {
      const parsed = SavedGoalSchema.safeParse(row.record);
      if (!parsed.success) throw new Error("클라우드 기록 일부를 읽을 수 없어요. 기록을 덮어쓰지 않았어요.");
      remote.push(parsed.data);
    }
    if (!data || data.length < 500) break;
  }

  const merged = mergeGoals(local, remote);
  const localById = new Map(local.map((goal) => [goal.id, goal]));
  const remoteById = new Map(remote.map((goal) => [goal.id, goal]));
  for (const goal of merged) {
    if (JSON.stringify(localById.get(goal.id)) !== JSON.stringify(goal)) {
      await indexedDbGoalRepository.put(goal);
    }
  }
  const toUpload = merged.filter((goal) => JSON.stringify(remoteById.get(goal.id)) !== JSON.stringify(goal));
  for (let start = 0; start < toUpload.length; start += 100) {
    const rows = toUpload.slice(start, start + 100).map((goal) => ({ user_id: userId, id: goal.id, record: goal, updated_at: goal.updatedAt }));
    const { error } = await supabase.from("goal_records").upsert(rows, { onConflict: "user_id,id" });
    if (error) throw new Error("클라우드에 기록을 저장하지 못했어요. 브라우저 기록은 남아 있어요.");
  }
  return merged;
}

export function queueGoalSync(): Promise<SavedGoal[]> {
  const next = queue.then(syncGoals, syncGoals);
  queue = next.catch(() => undefined);
  return next;
}
