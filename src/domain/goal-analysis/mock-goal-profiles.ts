import type { OrangeSize } from "./types";

export type MockStep = { action: string; orangeSizeCm: OrangeSize; reason: string };
type MockProfile = {
  keywords: readonly string[];
  orangeSizeCm: OrangeSize;
  reason: string;
  starterAction: string;
  steps: readonly MockStep[];
};

const profiles: readonly MockProfile[] = [
  {
    keywords: ["책 ", "책을", "책읽", "도서", "독서", "읽기", "교재"], orangeSizeCm: 100,
    reason: "읽어야 할 범위가 넓어 한 번에 떠올리면 크게 느껴질 수 있어요.",
    starterAction: "책을 꺼내 첫 문장을 읽어보세요.",
    steps: [
      { action: "한 챕터 읽기", orangeSizeCm: 30, reason: "한 권보다 범위는 작지만 3분 안에 마치기에는 길어요." },
      { action: "한 페이지 읽기", orangeSizeCm: 10, reason: "읽을 범위가 한 페이지로 줄었지만 3분을 넘길 수 있어요." },
      { action: "한 문단 읽기", orangeSizeCm: 3, reason: "읽을 범위가 한 문단으로 분명해 3분 안에 마칠 수 있어요." },
      { action: "책 꺼내기", orangeSizeCm: 0.5, reason: "책을 꺼내는 준비 행동은 바로 마칠 수 있어요." },
    ],
  },
  {
    keywords: ["강의", "영상", "동영상", "인강", "수업"], orangeSizeCm: 100,
    reason: "들어야 할 분량이 있어 재생할 첫 회차부터 정하면 가벼워져요.",
    starterAction: "강의나 영상 목록을 열어보세요.",
    steps: [
      { action: "강의 한 회차 듣기", orangeSizeCm: 30, reason: "한 회차도 3분보다 길 수 있어요." },
      { action: "영상 첫 부분 보기", orangeSizeCm: 10, reason: "첫 부분으로 줄었지만 길이를 알 수 없어요." },
      { action: "강의나 영상 재생하기", orangeSizeCm: 1, reason: "재생 버튼을 누르는 행동은 바로 마칠 수 있어요." },
      { action: "강의나 영상 목록 열기", orangeSizeCm: 0.5, reason: "목록을 여는 준비 행동은 바로 마칠 수 있어요." },
    ],
  },
  {
    keywords: ["시험", "공부", "자격증", "복습", "학습"], orangeSizeCm: 150,
    reason: "학습 범위와 준비할 단계가 여러 개라 첫 시작점이 흐릿할 수 있어요.",
    starterAction: "공부할 자료를 열고 목차 한 줄을 읽어보세요.",
    steps: [
      { action: "공부할 한 단원 살펴보기", orangeSizeCm: 30, reason: "한 단원은 전체 공부보다 작지만 아직 시간이 필요해요." },
      { action: "자료 한 페이지 살펴보기", orangeSizeCm: 10, reason: "한 페이지로 범위가 줄었지만 3분을 넘길 수 있어요." },
      { action: "목차 한 줄 읽기", orangeSizeCm: 1, reason: "목차 한 줄은 바로 읽고 마칠 수 있어요." },
      { action: "공부 자료 열기", orangeSizeCm: 0.5, reason: "자료를 여는 준비 행동은 바로 마칠 수 있어요." },
    ],
  },
  {
    keywords: ["개발", "코딩", "코드", "프로그래밍", "게임 만들", "게임 제작", "앱 만들", "웹사이트", "웹 만들"], orangeSizeCm: 300,
    reason: "만들고 확인할 단계가 여러 개라 첫 작업을 따로 떼어내면 좋아요.",
    starterAction: "작업할 편집기나 프로젝트 폴더를 열어보세요.",
    steps: [
      { action: "작은 기능 하나 만들기", orangeSizeCm: 30, reason: "작은 기능에도 여러 작업이 필요할 수 있어요." },
      { action: "수정할 파일 하나 살펴보기", orangeSizeCm: 10, reason: "파일 하나로 줄었지만 살펴볼 범위가 남아 있어요." },
      { action: "편집기 열기", orangeSizeCm: 1, reason: "편집기를 여는 행동은 바로 마칠 수 있어요." },
      { action: "프로젝트 폴더 열기", orangeSizeCm: 0.5, reason: "폴더를 여는 준비 행동은 바로 마칠 수 있어요." },
    ],
  },
  {
    keywords: ["프로젝트", "과제", "포트폴리오", "기획"], orangeSizeCm: 300,
    reason: "여러 단계가 연결된 목표라 전체를 한꺼번에 생각하면 부담이 커질 수 있어요.",
    starterAction: "관련 문서를 열고 제목을 한 줄 적어보세요.",
    steps: [
      { action: "작업 한 항목 정리하기", orangeSizeCm: 30, reason: "한 항목만 다뤄도 정리할 내용이 남아 있어요." },
      { action: "관련 문서 한 페이지 살펴보기", orangeSizeCm: 10, reason: "한 페이지로 좁혔지만 3분 안에 끝날지는 불확실해요." },
      { action: "관련 문서 제목 한 줄 적기", orangeSizeCm: 1, reason: "제목 한 줄은 별도 계획 없이 바로 적을 수 있어요." },
      { action: "관련 문서 열기", orangeSizeCm: 0.5, reason: "문서를 여는 준비 행동은 바로 마칠 수 있어요." },
    ],
  },
  {
    keywords: ["운동", "헬스", "달리기", "요가", "걷기", "스트레칭"], orangeSizeCm: 75,
    reason: "준비와 반복이 필요한 목표라 시작 동작을 따로 떼어내면 한결 가벼워져요.",
    starterAction: "운동할 자리를 만들고 가볍게 한 번 움직여보세요.",
    steps: [
      { action: "운동 한 세트 하기", orangeSizeCm: 10, reason: "한 세트로 좁혔지만 3분 안에 끝날지는 종목에 따라 달라요." },
      { action: "운동복 꺼내기", orangeSizeCm: 0.5, reason: "운동복을 꺼내는 준비 행동은 바로 마칠 수 있어요." },
    ],
  },
  {
    keywords: ["청소", "정리", "방", "책상", "설거지"], orangeSizeCm: 50,
    reason: "정리할 범위가 아직 나뉘지 않아 어디서 시작할지 망설여질 수 있어요.",
    starterAction: "눈앞의 물건 하나를 제자리에 놓아보세요.",
    steps: [
      { action: "책상 한 구역 정리하기", orangeSizeCm: 10, reason: "한 구역으로 줄었지만 정리할 물건이 많을 수 있어요." },
      { action: "물건 하나 제자리에 놓기", orangeSizeCm: 1, reason: "물건 하나를 옮기면 바로 마칠 수 있어요." },
    ],
  },
  {
    keywords: ["글쓰기", "글 쓰", "글 적", "보고서", "자소서", "독후감", "작성", "에세이", "소설"], orangeSizeCm: 100,
    reason: "완성된 결과를 먼저 떠올리면 첫 문장을 쓰는 일이 크게 느껴질 수 있어요.",
    starterAction: "문서를 열고 제목이나 첫 문장을 적어보세요.",
    steps: [
      { action: "글 한 문단 적기", orangeSizeCm: 10, reason: "한 문단은 전체 글보다 작지만 생각할 시간이 필요해요." },
      { action: "글 한 문장 적기", orangeSizeCm: 1, reason: "한 문장만 적으면 3분 안에 마칠 수 있어요." },
      { action: "문서 열기", orangeSizeCm: 0.5, reason: "문서를 여는 준비 행동은 바로 마칠 수 있어요." },
    ],
  },
];

const genericProfile: MockProfile = {
  keywords: [], orangeSizeCm: 100,
  reason: "아직 해야 할 범위와 단계가 넓어서 첫 행동을 작게 떼어내면 좋아요.",
  starterAction: "이 목표를 시작할 때 쓸 첫 단계 이름을 하나 적어보세요.",
  steps: [
    { action: "첫 단계 세 가지 적기", orangeSizeCm: 10, reason: "시작점을 좁혔지만 세 가지를 정하는 데 시간이 걸릴 수 있어요." },
    { action: "첫 단계 이름 하나 적기", orangeSizeCm: 1, reason: "목표 종류와 관계없이 한 가지 시작점을 적을 수 있어요." },
  ],
};

export function mockProfileFor(goal: string, context: string): MockProfile {
  const matches = (text: string) => profiles.find(({ keywords }) =>
    keywords.some((keyword) => text.toLowerCase().includes(keyword)));
  return matches(goal) ?? matches(context) ?? genericProfile;
}
