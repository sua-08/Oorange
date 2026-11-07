import { SuggestedActionSchema, SuggestActionRequestSchema } from "@/domain/goal-analysis/suggest-action-schema";
import { MissingApiKeyError } from "@/infrastructure/ai/openai-goal-analyzer";
import { getOpenAiSuggestedAction } from "@/infrastructure/ai/openai-suggest-action";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }
  const parsed = SuggestActionRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "목표와 이전 행동을 다시 확인해주세요." }, { status: 400 });

  try {
    const action = await getOpenAiSuggestedAction(parsed.data);
    const result = SuggestedActionSchema.safeParse({ action });
    if (!result.success || result.data.action === parsed.data.previousAction) {
      return Response.json({ error: "새로운 행동을 제안하지 못했어요. 다시 시도해주세요." }, { status: 502 });
    }
    return Response.json(result.data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof MissingApiKeyError) return Response.json({ error: "AI 연결을 준비 중이에요." }, { status: 503 });
    return Response.json({ error: "지금은 새 행동을 추천하기 어려워요. 잠시 뒤 다시 시도해주세요." }, { status: 503 });
  }
}
