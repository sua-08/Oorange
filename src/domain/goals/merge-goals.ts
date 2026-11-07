import { MAX_ACTIVE_GOALS, type SavedGoal } from "./saved-goal";

// A harvest is final. Otherwise the latest complete goal snapshot wins.
export function mergeGoals(local: SavedGoal[], remote: SavedGoal[]): SavedGoal[] {
  const byId = new Map<string, SavedGoal>();
  for (const goal of remote) byId.set(goal.id, goal);
  for (const goal of local) {
    const other = byId.get(goal.id);
    if (!other || goal.status === "harvested" || (other.status !== "harvested" && goal.updatedAt > other.updatedAt)) {
      byId.set(goal.id, goal);
    }
  }

  const goals = [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
  let activeCount = 0;
  return goals.map((goal) => {
    if (goal.status !== "active" && goal.status !== "awaiting_start") return goal;
    activeCount += 1;
    return activeCount <= MAX_ACTIVE_GOALS ? goal : { ...goal, status: "frozen", updatedAt: Date.now() };
  });
}
