import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockAnalyzeGoal } from "@/domain/goal-analysis/mock-analyze-goal";
import { getSmallerActionSuggestions, mockMeasureSmallerAction } from "@/domain/goal-analysis/mock-reduce-goal";
import type { AnalysisRequest } from "@/domain/goal-analysis/ai-schema";
import type { SavedGoal } from "@/domain/goals/saved-goal";
import { canHarvest, createHarvestedGoal } from "@/domain/harvest/harvest";
import { indexedDbGoalRepository } from "@/infrastructure/db/indexeddb/goal-repository";
import { GoalAnalyzer } from "./goal-analyzer";

const repositoryState = vi.hoisted(() => ({ goals: [] as SavedGoal[] }));
vi.mock("@/infrastructure/db/indexeddb/goal-repository", () => ({
  indexedDbGoalRepository: {
    list: async () => ({ goals: [...repositoryState.goals], skippedInvalid: 0 }),
    put: async (goal: SavedGoal) => {
      repositoryState.goals = [goal, ...repositoryState.goals.filter((item) => item.id !== goal.id)];
    },
    harvest: vi.fn(async (goalId: string, harvestedAt: number, randomValue: number, recordId: string) => {
      const current = repositoryState.goals.find((item) => item.id === goalId);
      if (!current || !canHarvest(current)) return null;
      const harvested = createHarvestedGoal(current, harvestedAt, randomValue, recordId);
      repositoryState.goals = [harvested, ...repositoryState.goals.filter((item) => item.id !== goalId)];
      return harvested;
    }),
  },
}));

function mockAnalysis(request: AnalysisRequest) {
  const initial = mockAnalyzeGoal(request.originalGoal, request.context);
  if (request.mode === "goal") return {
    originalGoal: request.originalGoal, currentAction: null, isFinite: true,
    suggestedFiniteGoal: "", orangeSizeCm: initial.orangeSizeCm, reason: initial.reason,
    starterAction: initial.starterAction,
    progressUnitLabel: "항목", progressUnitReason: "완료한 부분을 셀 수 있어요.",
    suggestedActions: getSmallerActionSuggestions(request.originalGoal, request.context, initial.orangeSizeCm),
    canCompleteWithinThreeMinutes: false,
  };
  const measured = mockMeasureSmallerAction(request.originalGoal, request.context, request.currentAction);
  return {
    originalGoal: request.originalGoal, currentAction: request.currentAction, isFinite: true,
    suggestedFiniteGoal: "", orangeSizeCm: measured.orangeSizeCm, reason: measured.reason,
    starterAction: initial.starterAction,
    suggestedActions: getSmallerActionSuggestions(request.originalGoal, request.context, measured.orangeSizeCm),
    canCompleteWithinThreeMinutes: measured.canCompleteWithinThreeMinutes,
  };
}

beforeEach(() => {
  repositoryState.goals = [];
  vi.mocked(indexedDbGoalRepository.harvest).mockClear();
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => {
    const request = JSON.parse(options.body as string) as AnalysisRequest;
    return Response.json(mockAnalysis(request));
  }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function enterGoal(goal: string, context = "") {
  await waitFor(() => expect(screen.getByRole("button", { name: "오렌지 측정하기" })).toBeEnabled());
  fireEvent.change(screen.getByLabelText(/최종 목표/), { target: { value: goal } });
  fireEvent.change(screen.getByLabelText(/지금 상황/), { target: { value: context } });
  fireEvent.click(screen.getByRole("button", { name: "오렌지 측정하기" }));
  await screen.findByRole("heading", { name: goal });
}

async function reachSeedSize(goal = "책 한 권 읽기", starterHint?: string) {
  await enterGoal(goal);
  if (starterHint) expect(screen.getByText((content, element) =>
    element?.tagName === "STRONG" && element.closest(".action-box") !== null && content.includes(starterHint),
  )).toBeInTheDocument();
  let reductions = 0;
  while (!screen.queryByRole("button", { name: /1분 안에 시작하기/ }) && reductions < 5) {
    const suggestions = screen.getByRole("region", { name: "오렌지를 더 줄여볼까요?" })
      .querySelectorAll<HTMLButtonElement>(".suggestion-list button");
    expect(suggestions.length).toBeGreaterThan(0);
    fireEvent.click(suggestions[suggestions.length - 1]);
    fireEvent.click(screen.getByRole("button", { name: /이 행동 다시 측정하기/ }));
    await waitFor(() => expect(screen.queryByText("다시 측정하고 있어요…")).not.toBeInTheDocument());
    reductions += 1;
  }
  expect(reductions).toBeGreaterThan(0);
  expect(screen.getByText("씨앗 크기에 도달했어요!")).toBeInTheDocument();
}

describe("GoalAnalyzer VS1–VS3 through the VS4 API boundary", () => {
  it.each([
    ["책/독서", "책 한 권 읽기", "책을 꺼내"],
    ["강의/영상 학습", "강의 5개 듣기", "강의나 영상 목록"],
    ["시험/공부", "자격증 시험 공부하기", "공부할 자료"],
    ["개발/코딩/게임 제작", "게임 만들기", "편집기나 프로젝트 폴더"],
    ["프로젝트/과제", "과제 프로젝트 완성하기", "관련 문서"],
    ["운동", "운동 10회 하기", "운동할 자리"],
    ["청소", "방 청소하기", "물건 하나"],
    ["글쓰기", "에세이 작성하기", "문서를 열고"],
    ["generic fallback", "자전거 조립하기", "첫 단계 이름"],
  ])("completes the loop for %s", async (_category, goal, starterHint) => {
    render(<GoalAnalyzer />);
    await reachSeedSize(goal, starterHint);
    const starterAction = screen.getByText("현재 고른 행동").nextElementSibling?.textContent;
    expect(starterAction).toBeTruthy();
    if (_category !== "책/독서") expect(starterAction).not.toMatch(/책|챕터|문단 읽기/);
    fireEvent.click(screen.getByRole("button", { name: /1분 안에 시작하기/ }));
    expect(screen.getByRole("timer")).toHaveTextContent("01:00");
    fireEvent.click(screen.getByRole("button", { name: "시작했어요!" }));
    expect(screen.getByText("씨앗을 얻었어요!")).toBeInTheDocument();
    expect(screen.getByText("이 씨앗이 자라서 이루어갈 목표").nextElementSibling).toHaveTextContent(goal);
    expect(screen.getByText(`첫 행동: ${starterAction}`)).toBeInTheDocument();
  });

  it("keeps an unclear custom action from shrinking the orange", async () => {
    render(<GoalAnalyzer />);
    await enterGoal("책 한 권 읽기");
    fireEvent.change(screen.getByLabelText("지금 시작할 작은 행동"), { target: { value: "책 읽기" } });
    fireEvent.click(screen.getByRole("button", { name: /이 행동 다시 측정하기/ }));
    expect(await screen.findByText(/지금 오렌지보다 더 작게/)).toBeInTheDocument();
    expect(screen.queryByText("씨앗 크기에 도달했어요!")).not.toBeInTheDocument();
  });

  it("copies a suggested action into the input without measuring until submitted", async () => {
    render(<GoalAnalyzer />);
    await enterGoal("책 한 권 읽기");
    const callsBeforeSelection = vi.mocked(fetch).mock.calls.length;
    const suggestion = screen.getByRole("region", { name: "오렌지를 더 줄여볼까요?" })
      .querySelector<HTMLButtonElement>(".suggestion-list button");
    expect(suggestion).not.toBeNull();
    fireEvent.click(suggestion!);
    expect(screen.getByLabelText("지금 시작할 작은 행동")).toHaveValue(suggestion!.textContent?.replace("☝", "").replace("3분 후보", "").trim());
    expect(fetch).toHaveBeenCalledTimes(callsBeforeSelection);
  });

  it("does not grant a seed after 60 seconds and allows retry or defer", async () => {
    render(<GoalAnalyzer />);
    await reachSeedSize();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T09:00:00Z"));
    fireEvent.click(screen.getByRole("button", { name: /1분 안에 시작하기/ }));
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.queryByRole("button", { name: "시작했어요!" })).not.toBeInTheDocument();
    expect(screen.queryByText("씨앗을 얻었어요!")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "한 번 더 준비할래요" }));
    expect(screen.getByRole("timer")).toHaveTextContent("01:00");
    fireEvent.click(screen.getByRole("button", { name: "다음에 시작할게요" }));
    expect(screen.getByRole("button", { name: /1분 안에 시작하기/ })).toBeInTheDocument();
  });

  it("preserves the current result on an API error", async () => {
    render(<GoalAnalyzer />);
    await enterGoal("책 한 권 읽기");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "잠시 뒤 다시 시도해주세요." }, { status: 503 })));
    fireEvent.click(screen.getByRole("button", { name: /한 페이지 읽기/ }));
    fireEvent.click(screen.getByRole("button", { name: /이 행동 다시 측정하기/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("잠시 뒤 다시 시도해주세요.");
    expect(screen.getByRole("heading", { name: "책 한 권 읽기" })).toBeInTheDocument();
  });

  it("does not send duplicate requests while measuring", async () => {
    let finish!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    render(<GoalAnalyzer />);
    await waitFor(() => expect(screen.getByRole("button", { name: "오렌지 측정하기" })).toBeEnabled());
    fireEvent.change(screen.getByLabelText(/최종 목표/), { target: { value: "게임 만들기" } });
    fireEvent.click(screen.getByRole("button", { name: "오렌지 측정하기" }));
    expect(screen.getByRole("button", { name: /오렌지를 측정하고 있어요/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /오렌지를 측정하고 있어요/ }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => finish(Response.json(mockAnalysis({ mode: "goal", originalGoal: "게임 만들기", context: "" }))));
    expect(screen.getByRole("heading", { name: "게임 만들기" })).toBeInTheDocument();
  });

  it("offers a retry when the API request times out", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    render(<GoalAnalyzer />);
    await waitFor(() => expect(screen.getByRole("button", { name: "오렌지 측정하기" })).toBeEnabled());
    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText(/최종 목표/), { target: { value: "게임 만들기" } });
    fireEvent.click(screen.getByRole("button", { name: "오렌지 측정하기" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(16_000); });
    expect(screen.getByRole("alert")).toHaveTextContent("다시 측정해볼까요?");
    expect(screen.getByRole("button", { name: "오렌지 측정하기" })).toBeEnabled();
  });

  it("blocks an infinite goal until a finite goal is chosen", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      originalGoal: "운동하기", currentAction: null, isFinite: false,
      suggestedFiniteGoal: "운동 10회 하기", orangeSizeCm: "infinity",
      reason: "끝이 정해지지 않았어요.", starterAction: "운동복 꺼내기",
      suggestedActions: [], canCompleteWithinThreeMinutes: false,
    })));
    render(<GoalAnalyzer />);
    await enterGoal("운동하기");
    expect(screen.getByText("끝을 정하면 씨앗을 얻을 수 있어요")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /1분 안에 시작하기/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "이 목표로 다시 측정하기" }));
    expect(screen.getByLabelText(/최종 목표/)).toHaveValue("운동 10회 하기");
  });
});

describe("local goal vault", () => {
  it("restores the original goal, reduced action, and seed after remount", async () => {
    const view = render(<GoalAnalyzer />);
    await reachSeedSize("게임 만들기");
    fireEvent.click(screen.getByRole("button", { name: /1분 안에 시작하기/ }));
    fireEvent.click(screen.getByRole("button", { name: "시작했어요!" }));
    await waitFor(() => expect(repositoryState.goals[0]?.seed?.finalGoal).toBe("게임 만들기"));
    view.unmount();
    render(<GoalAnalyzer />);
    expect(await screen.findByText("씨앗을 얻었어요!")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "게임 만들기" })).toBeInTheDocument();
    expect(screen.getByText(`첫 행동: ${repositoryState.goals[0].seed?.starterAction}`)).toBeInTheDocument();
  });

  it("freezes and restores a goal without losing its action", async () => {
    render(<GoalAnalyzer />);
    await reachSeedSize("책 한 권 읽기");
    const action = repositoryState.goals[0].measurements.at(-1)?.currentAction;
    fireEvent.click(screen.getByRole("button", { name: "동결창고에 보관" }));
    await waitFor(() => expect(repositoryState.goals[0].status).toBe("frozen"));
    expect(screen.queryByText("씨앗 크기에 도달했어요!")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 활성화" }));
    expect(await screen.findByText("씨앗 크기에 도달했어요!")).toBeInTheDocument();
    expect(repositoryState.goals[0].measurements.at(-1)?.currentAction).toBe(action);
  });

  it("asks for a freeze before creating a fourth active goal", async () => {
    render(<GoalAnalyzer />);
    await enterGoal("책 한 권 읽기");
    await enterGoal("게임 만들기");
    await enterGoal("방 청소하기");
    expect(repositoryState.goals).toHaveLength(3);
    const fetchMock = vi.mocked(fetch);
    const callsBefore = fetchMock.mock.calls.length;
    fireEvent.change(screen.getByLabelText(/최종 목표/), { target: { value: "운동 10회 하기" } });
    fireEvent.click(screen.getByRole("button", { name: "오렌지 측정하기" }));
    expect(await screen.findByText(/활성 목표는 3개까지/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });
});

describe("progress after earning a seed", () => {
  it("keeps a recommendation across reload and refreshes it only on request", async () => {
    const fetchMock = vi.fn(async (url: string, options: RequestInit) => {
      if (url === "/api/ai/suggest-action") return Response.json({ action: "강의 목록 열기" });
      return Response.json(mockAnalysis(JSON.parse(options.body as string) as AnalysisRequest));
    });
    vi.stubGlobal("fetch", fetchMock);
    const view = render(<GoalAnalyzer />);
    await reachSeedSize("강의 5개 듣기");
    fireEvent.click(screen.getByRole("button", { name: /1분 안에 시작하기/ }));
    fireEvent.click(screen.getByRole("button", { name: "시작했어요!" }));
    await waitFor(() => expect(repositoryState.goals[0].recommendation?.action).toBe(repositoryState.goals[0].seed?.starterAction));
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/ai/suggest-action")).toHaveLength(0);
    view.unmount();
    render(<GoalAnalyzer />);
    expect(await screen.findByRole("button", { name: "다른 행동 추천받기" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다른 행동 추천받기" }));
    await waitFor(() => expect(repositoryState.goals[0].recommendation?.action).toBe("강의 목록 열기"));
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/ai/suggest-action")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /이 행동으로 시작/ }));
    expect(screen.getByLabelText("지금 시작할 작은 행동")).toHaveValue("강의 목록 열기");
    expect(repositoryState.goals[0].progress?.currentAmount ?? 0).toBe(0);
  });

  it("keeps the saved recommendation when a refresh fails", async () => {
    render(<GoalAnalyzer />);
    await reachSeedSize("강의 5개 듣기");
    fireEvent.click(screen.getByRole("button", { name: /1분 안에 시작하기/ }));
    fireEvent.click(screen.getByRole("button", { name: "시작했어요!" }));
    await waitFor(() => expect(repositoryState.goals[0].recommendation?.action).toBeTruthy());
    const previous = repositoryState.goals[0].recommendation?.action;
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "잠시 뒤 다시 시도해주세요." }, { status: 503 })));
    fireEvent.click(screen.getByRole("button", { name: "다른 행동 추천받기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("잠시 뒤 다시 시도해주세요.");
    expect(repositoryState.goals[0].recommendation?.action).toBe(previous);
  });

  it("celebrates finishing the first action without changing final-goal progress", async () => {
    render(<GoalAnalyzer />);
    await reachSeedSize("강의 5개 듣기");
    fireEvent.click(screen.getByRole("button", { name: /1분 안에 시작하기/ }));
    fireEvent.click(screen.getByRole("button", { name: "시작했어요!" }));
    await waitFor(() => expect(screen.getByRole("progressbar", { name: "최종 목표 진행률" })).toHaveAttribute("aria-valuenow", "0"));
    const saveCalls = repositoryState.goals[0].progressHistory?.length ?? 0;
    fireEvent.click(screen.getByRole("button", { name: "마쳤어요" }));
    expect(screen.getByText(/첫 행동도 마쳤네요!/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "최종 목표 진행률" })).toHaveAttribute("aria-valuenow", "0");
    expect(repositoryState.goals[0].progressHistory?.length ?? 0).toBe(saveCalls);
  });

  it("does not count the starter action automatically and restores cumulative progress", async () => {
    const view = render(<GoalAnalyzer />);
    await reachSeedSize("강의 5개 듣기");
    fireEvent.click(screen.getByRole("button", { name: /1분 안에 시작하기/ }));
    fireEvent.click(screen.getByRole("button", { name: "시작했어요!" }));
    await waitFor(() => expect(screen.getByRole("progressbar", { name: "최종 목표 진행률" })).toHaveAttribute("aria-valuenow", "0"));
    expect(screen.getByLabelText("같은 비중으로 셀 단위")).toHaveValue("항목");
    expect(screen.getByLabelText("전체 범위")).toHaveValue(null);
    fireEvent.change(screen.getByLabelText("같은 비중으로 셀 단위"), { target: { value: "강의" } });
    fireEvent.change(screen.getByLabelText("전체 범위"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "진행 상태 저장" }));
    await waitFor(() => expect(repositoryState.goals[0].progress?.currentAmount).toBe(0));
    fireEvent.click(screen.getByRole("button", { name: /한 단위 더했어요/ }));
    await waitFor(() => expect(repositoryState.goals[0].progress?.currentAmount).toBe(1));
    expect(screen.getByRole("progressbar", { name: "최종 목표 진행률" })).toHaveAttribute("aria-valuenow", "20");
    view.unmount();
    render(<GoalAnalyzer />);
    expect(await screen.findByRole("progressbar", { name: "최종 목표 진행률" })).toHaveAttribute("aria-valuenow", "20");
    expect(screen.getByLabelText("지금까지")).toHaveValue(1);
  });

  it("allows a correction and only shows fruit-ready at 100%", async () => {
    render(<GoalAnalyzer />);
    await reachSeedSize();
    fireEvent.click(screen.getByRole("button", { name: /1분 안에 시작하기/ }));
    fireEvent.click(screen.getByRole("button", { name: "시작했어요!" }));
    await waitFor(() => expect(screen.getByLabelText("같은 비중으로 셀 단위")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("같은 비중으로 셀 단위"), { target: { value: "페이지" } });
    fireEvent.change(screen.getByLabelText("전체 범위"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("지금까지"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "진행 상태 저장" }));
    await waitFor(() => expect(screen.getByText("열매 준비", { selector: "h3" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /수확하기/ })).toBeInTheDocument();
    expect(repositoryState.goals[0].harvest).toBeUndefined();
    fireEvent.click(screen.getByText("수확 전에 진행 상태를 다시 맞추기"));
    fireEvent.change(screen.getByLabelText("지금까지"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "진행 상태 저장" }));
    await waitFor(() => expect(screen.getByRole("progressbar", { name: "최종 목표 진행률" })).toHaveAttribute("aria-valuenow", "20"));
    expect(repositoryState.goals[0].progressHistory).toHaveLength(2);
  });
});

describe("explicit harvest and record book", () => {
  it("only harvests after the button click and restores one permanent record", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.98);
    const view = render(<GoalAnalyzer />);
    await reachSeedSize();
    fireEvent.click(screen.getByRole("button", { name: /1분 안에 시작하기/ }));
    fireEvent.click(screen.getByRole("button", { name: "시작했어요!" }));
    await waitFor(() => expect(screen.getByLabelText("같은 비중으로 셀 단위")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("같은 비중으로 셀 단위"), { target: { value: "페이지" } });
    fireEvent.change(screen.getByLabelText("전체 범위"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("지금까지"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "진행 상태 저장" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /수확하기/ })).toBeInTheDocument());
    expect(repositoryState.goals[0].harvest).toBeUndefined();
    fireEvent.click(screen.getByRole("button", { name: /수확하기/ }));
    await waitFor(() => expect(screen.getByText("달콤한 열매를 수확했어요!")).toBeInTheDocument());
    expect(repositoryState.goals[0].harvest?.varietyId).toBe("sunshine");
    expect(repositoryState.goals[0].harvest?.originalGoal).toBe("책 한 권 읽기");
    expect(indexedDbGoalRepository.harvest).toHaveBeenCalledTimes(1);
    view.unmount();
    render(<GoalAnalyzer />);
    expect(await screen.findByText("달콤한 열매를 수확했어요!")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /기록장 1/ })).toBeInTheDocument();
  });
});
