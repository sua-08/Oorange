import { SuggestedActionSchema, type SuggestActionRequest } from "@/domain/goal-analysis/suggest-action-schema";

export async function suggestGoalAction(input: SuggestActionRequest, signal: AbortSignal): Promise<string> {
  const response = await fetch("/api/ai/suggest-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
      ? body.error : "지금은 새 행동을 추천하기 어려워요. 잠시 뒤 다시 시도해주세요.";
    throw new Error(message);
  }
  const parsed = SuggestedActionSchema.safeParse(body);
  if (!parsed.success || parsed.data.action === input.previousAction) {
    throw new Error("새로운 행동을 제안하지 못했어요. 다시 시도해주세요.");
  }
  return parsed.data.action;
}
