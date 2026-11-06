import { AnalysisResultSchema, type AnalysisRequest, type AnalysisResult } from "@/domain/goal-analysis/ai-schema";

export async function analyzeGoal(input: AnalysisRequest, signal: AbortSignal): Promise<AnalysisResult> {
  const response = await fetch("/api/ai/analyze-goal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
      ? body.error : "지금은 분석이 어려워요. 잠시 뒤 다시 시도해주세요.";
    throw new Error(message);
  }
  const parsed = AnalysisResultSchema.safeParse(body);
  if (!parsed.success || parsed.data.originalGoal !== input.originalGoal) {
    throw new Error("분석 결과를 확인할 수 없어요. 다시 시도해주세요.");
  }
  return parsed.data;
}
