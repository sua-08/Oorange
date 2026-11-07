import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOpenAiSuggestedAction } from "@/infrastructure/ai/openai-suggest-action";
import { POST } from "./route";

vi.mock("@/infrastructure/ai/openai-suggest-action", () => ({ getOpenAiSuggestedAction: vi.fn() }));

const input = { originalGoal: "게임 만들기", context: "첫날이에요", previousAction: "편집기 열기" };
const post = (body: unknown) => POST(new Request("http://localhost/api/ai/suggest-action", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
}));

beforeEach(() => vi.mocked(getOpenAiSuggestedAction).mockReset());

describe("POST /api/ai/suggest-action", () => {
  it("returns one validated action without storing the response", async () => {
    vi.mocked(getOpenAiSuggestedAction).mockResolvedValue("새 프로젝트 폴더 열기");
    const response = await post(input);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ action: "새 프로젝트 폴더 열기" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects malformed input before a paid request", async () => {
    const response = await post({ ...input, originalGoal: "" });
    expect(response.status).toBe(400);
    expect(getOpenAiSuggestedAction).not.toHaveBeenCalled();
  });

  it("preserves the old recommendation when the model repeats or returns an invalid action", async () => {
    vi.mocked(getOpenAiSuggestedAction).mockResolvedValueOnce(input.previousAction).mockResolvedValueOnce(" ");
    expect((await post(input)).status).toBe(502);
    expect((await post(input)).status).toBe(502);
  });

});
