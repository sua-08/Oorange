import { AnalysisRequestSchema } from "@/domain/goal-analysis/ai-schema";
import { InvalidAnalysisError, validateAiAnalysis } from "@/domain/goal-analysis/validate-ai-analysis";
import { getOpenAiDecision, MissingApiKeyError } from "@/infrastructure/ai/openai-goal-analyzer";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }
  const parsed = AnalysisRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "목표와 행동을 다시 확인해주세요." }, { status: 400 });

  try {
    const decision = await getOpenAiDecision(parsed.data);
    const result = validateAiAnalysis(parsed.data, decision);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof MissingApiKeyError) return Response.json({ error: "AI 연결을 준비 중이에요." }, { status: 503 });
    if (error instanceof InvalidAnalysisError) return Response.json({ error: "분석 결과를 확인할 수 없어요. 다시 시도해주세요." }, { status: 502 });
    return Response.json({ error: "지금은 분석이 어려워요. 잠시 뒤 다시 시도해주세요." }, { status: 503 });
  }
}
