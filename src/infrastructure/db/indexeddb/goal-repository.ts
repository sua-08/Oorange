import type { GoalRepository, GoalLoadResult } from "@/application/ports/goal-repository";
import { SavedGoalSchema, type SavedGoal } from "@/domain/goals/saved-goal";
import { canHarvest, createHarvestedGoal } from "@/domain/harvest/harvest";

const DATABASE_NAME = "orange-task-farm";
const STORE_NAME = "goals";
const DATABASE_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("이 브라우저에서는 목표를 저장할 수 없어요."));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("목표 보관함을 열 수 없어요."));
    request.onblocked = () => reject(new Error("다른 탭에서 목표 보관함을 사용 중이에요. 탭을 닫고 다시 시도해주세요."));
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = run(transaction.objectStore(STORE_NAME));
      let result: T;
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error ?? new Error("목표를 저장할 수 없어요."));
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error ?? new Error("목표를 저장할 수 없어요."));
      transaction.onabort = () => reject(transaction.error ?? new Error("목표 저장이 중단됐어요."));
    });
  } finally {
    database.close();
  }
}

export const indexedDbGoalRepository: GoalRepository = {
  async list(): Promise<GoalLoadResult> {
    const raw = await withStore<unknown[]>("readonly", (store) => store.getAll());
    const goals: SavedGoal[] = [];
    let skippedInvalid = 0;
    for (const item of raw) {
      const parsed = SavedGoalSchema.safeParse(item);
      if (parsed.success) goals.push(parsed.data);
      else skippedInvalid += 1;
    }
    goals.sort((a, b) => b.updatedAt - a.updatedAt);
    return { goals, skippedInvalid };
  },
  async put(goal: SavedGoal): Promise<void> {
    const valid = SavedGoalSchema.parse(goal);
    const database = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const existing = store.get(valid.id);
        existing.onsuccess = () => {
          if (existing.result?.status === "harvested") {
            transaction.abort();
            reject(new Error("수확 기록은 변경할 수 없어요."));
            return;
          }
          store.put(valid);
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("목표를 저장할 수 없어요."));
        transaction.onabort = () => reject(transaction.error ?? new Error("목표 저장이 중단됐어요."));
      });
    } finally {
      database.close();
    }
  },
  async harvest(goalId: string, harvestedAt: number, randomValue: number, recordId: string): Promise<SavedGoal | null> {
    const database = await openDatabase();
    try {
      return await new Promise<SavedGoal | null>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        let harvested: SavedGoal | null = null;
        const request = store.get(goalId);
        request.onsuccess = () => {
          const parsed = SavedGoalSchema.safeParse(request.result);
          if (!parsed.success || !canHarvest(parsed.data)) return;
          try {
            harvested = createHarvestedGoal(parsed.data, harvestedAt, randomValue, recordId);
            store.put(harvested);
          } catch (error) {
            transaction.abort();
            reject(error);
          }
        };
        transaction.oncomplete = () => resolve(harvested);
        transaction.onerror = () => reject(transaction.error ?? new Error("수확 기록을 보관할 수 없어요."));
        transaction.onabort = () => reject(transaction.error ?? new Error("수확 기록 보관이 중단됐어요."));
      });
    } finally {
      database.close();
    }
  },
};
