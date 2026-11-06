import { mockProfileFor, type MockStep } from "./mock-goal-profiles";
import type { OrangeSize } from "./types";

export type ActionMeasurement = {
  action: string;
  orangeSizeCm: OrangeSize;
  reason: string;
  canCompleteWithinThreeMinutes: boolean;
};

function pathFor(finalGoal: string, context: string): readonly MockStep[] {
  return mockProfileFor(finalGoal, context).steps;
}

export function getSmallerActionSuggestions(
  finalGoal: string,
  context: string,
  currentSize: OrangeSize,
): MockStep[] {
  return pathFor(finalGoal, context)
    .filter((step) => step.orangeSizeCm < currentSize)
    .slice(0, 2);
}

function classifyCustomAction(action: string): Pick<ActionMeasurement, "orangeSizeCm" | "reason" | "canCompleteWithinThreeMinutes"> {
  const text = action.replace(/\s/g, "");

  if (/(전체|전부|모두|한권|1권|한달|한주|프로젝트|완성|끝내|마무리)/.test(text)) {
    return { orangeSizeCm: 100, reason: "아직 전체 목표나 여러 단계를 포함해 있어요.", canCompleteWithinThreeMinutes: false };
  }
  if (/(한챕터|1챕터|한단원|1단원)/.test(text)) {
    return { orangeSizeCm: 30, reason: "한 묶음으로 줄었지만 3분 안에 마치기는 어려워요.", canCompleteWithinThreeMinutes: false };
  }
  if (/(한페이지|1페이지|한장|1장|한세트|1세트|한구역|1구역|한문단|1문단)/.test(text)) {
    const paragraph = /(한문단|1문단)/.test(text);
    return {
      orangeSizeCm: paragraph ? 3 : 10,
      reason: paragraph ? "한 문단은 3분 안에 마칠 수 있는 분명한 범위예요." : "범위가 작아졌지만 3분을 넘길 수 있어요.",
      canCompleteWithinThreeMinutes: paragraph,
    };
  }
  if (/(한문장|1문장|한줄|1줄|물건하나|물건1개)/.test(text) && /(읽|적|쓰|놓|옮|확인|살펴)/.test(text)) {
    return { orangeSizeCm: 1, reason: "대상과 행동이 분명하고 3분 안에 마칠 수 있어요.", canCompleteWithinThreeMinutes: true };
  }
  if (/(꺼내|열기|열어|펼치|앉기|앉아)/.test(text) && /(책|자료|문서|운동복|자리|의자|파일)/.test(text)) {
    return { orangeSizeCm: 0.5, reason: "바로 할 수 있는 작은 준비 행동이에요.", canCompleteWithinThreeMinutes: true };
  }
  return {
    orangeSizeCm: 100,
    reason: "이 표현만으로는 3분 안에 마칠 수 있는 범위인지 알기 어려워요. 대상과 양을 더 작게 적어보세요.",
    canCompleteWithinThreeMinutes: false,
  };
}

export function mockMeasureSmallerAction(
  finalGoal: string,
  context: string,
  action: string,
): ActionMeasurement {
  const normalized = action.trim();
  const exactStep = pathFor(finalGoal, context).find((step) => step.action === normalized);
  const measure = exactStep
    ? {
        orangeSizeCm: exactStep.orangeSizeCm,
        reason: exactStep.reason,
        canCompleteWithinThreeMinutes: exactStep.orangeSizeCm <= 3,
      }
    : classifyCustomAction(normalized);

  return { action: normalized, ...measure };
}
