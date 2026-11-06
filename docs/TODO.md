# Orange Task Farm — TODO

- `[ ]` 미시작 · `[~]` 진행 중 · `[x]` 완료 · `[!]` 결정 필요

브라우저 저장부터 명시적 수확·기록장까지 구현했다. Supabase 동기화는 계정 연결 단계로 미룬다. 완료 기준을 모두 만족한 단계만 완료 처리한다.

## MVP Vertical Slices

- [x] VS1 - 목표 입력 → Mock 오렌지 측정
- [x] VS2 - 목표 줄이기 Loop
- [x] VS3 - 1분 시작 → 씨앗
- [x] VS4 - OpenAI API 연결
- [x] VS5 - 브라우저 저장·복원 (Supabase는 이후 계정 연결 단계)
- [x] VS6 - 진행률 → 성장
- [x] VS7 - 수확 → 기록장
- [~] VS8 - 도감 → MVP QA (도감 완료, 브라우저 전체 흐름 점검 진행 중)

## Phase 0 — Project setup

- [x] Git 저장소 초기화
- [x] 제품 규칙 pressure-test
- [x] PRD와 RULES 정리
- [x] 기술 스택과 폴더 구조 결정
- [x] 구현 계획 작성
- [x] Google OAuth 우선 로그인 방식 결정
- [x] Supabase 사용 승인
- [x] 기본 오렌지 이미지 등록
- [x] Vercel 설정을 배포 단계로 보류
- [x] Next.js 프로젝트 생성
- [x] Node/pnpm 버전과 lockfile 고정
- [x] 환경 변수 예제 작성
- [ ] lint, typecheck, unit, E2E, build 명령 구성
- [x] README 작성

완료 기준: 깨끗한 설치 후 개발 서버와 모든 검사 명령이 성공한다.

## MVP-0.1 — Domain foundation

- [ ] 목표, 첫 행동, 씨앗, 진행 단위, 동결 상태 스키마
- [~] 고정 cm와 성장 단계 순수 함수 (성장 단계 완료, cm는 AI 검증에 구현)
- [ ] 유한 목표 및 3분 행동 검증 규칙
- [ ] 순화된 UX 문구 카탈로그
- [ ] domain unit test

## MVP-0.2 — Goal analysis

- [x] 목표/맥락 입력 화면
- [x] mock 기반 첫 vertical slice 결과 화면
- [x] 오렌지 이미지, 단계형 cm, 이유, 추천 첫 행동 표시
- [x] 첫 vertical slice unit/component test 및 production build
- [x] 서버 전용 AI endpoint
- [x] 구조화 출력과 런타임 검증
- [ ] cm, 이유, 유한성, 진행 단위 반환
- [x] `∞cm` 표시와 씨앗 차단
- [ ] AI 실패·재시도·안전한 기본 제안

## MVP-0.3 — Three-minute action loop

- [x] 최종 목표를 보존한 mock 행동 축소 UI
- [x] 추천 행동 선택·직접 입력 후 반복 재측정
- [x] 3분 행동 도달 상태와 최종 목표에 연결된 첫 행동 표시
- [x] 단계별 오렌지 크기 변화와 mock Loop 테스트
- [x] 추천 말풍선, 입력칸, 손가락 복사 버튼 (3분 후보도 재측정 후 확정)
- [x] 수정 행동 재검증
- [x] 60초 타이머
- [x] `시작했어요!`에서 클라이언트 상태로 씨앗 생성
- [x] 선택적 `마쳤어요` (첫 행동 축하만 표시, 진행률 변화 없음)
- [x] `한 번 더 준비할래요` / `다음에 시작할게요`

## MVP-0.4 — Guest storage and active goals

- [x] IndexedDB 구조와 초기 스키마 버전
- [x] 새로고침 상태 복원
- [x] 활성 목표 최대 3개
- [x] 동결창고 저장·복원
- [ ] 첫 씨앗 이후 선택적 계정 연결 안내
- [x] 게스트 데이터 손실 안내

## MVP-0.5 — Progress and return loop

- [x] AI 추천 진행 단위와 사용자 교체
- [x] 동일 비중 진행률 계산
- [x] 지원 단위별 UI
- [x] 비연속 누적형 목표
- [x] 범위·진행률 정정과 순화된 피드백
- [ ] 활성 카드별 저장된 추천 행동
- [ ] 요청 기반 추천 재생성

## MVP-0.6 — Cloud account connection

- [ ] Supabase 익명 사용자 전략 검증
- [ ] 선택적 Google OAuth 계정 연결
- [ ] 이메일 로그인 필요성 검증
- [ ] 로컬 데이터 병합과 중복 방지
- [ ] 사용자별 RLS
- [ ] 여러 기기 복원과 통합 테스트

## MVP-0.7 — Validation release

- [ ] 모바일·데스크톱 Core Loop E2E
- [ ] AI 오류, 타이머 이탈, 무한 목표 차단 테스트
- [ ] 활성 목표와 동결창고 테스트
- [ ] 접근성 기본 검사
- [ ] 익명 제품 지표 정의

MVP-0 완료 기준: 목표 입력부터 씨앗 생성, 진행률 기록, 재방문 복원까지 설명 없이 수행할 수 있다.

## MVP-1 — Growth and collection

- [x] 고정 성장 단계 UI
- [x] 100% 열매 준비 상태
- [~] 크고 귀여운 수확 버튼과 건너뛸 수 있는 애니메이션 (버튼 완료, 애니메이션 보류)
- [x] 기본 우세·조건부 특별 품종 추첨과 테스트
- [x] 기록장 목록과 상세
- [x] 도감과 중복 수확 누적
- [ ] 전체 Core Loop E2E

MVP-1 완료 기준: 명시적 수확으로만 영구 기록이 하나 생성되고 이후 복원할 수 있다.

## Version 2

- [ ] 일일 주제별 레이드와 하루 1회 참여
- [ ] 참여 인원 집계
- [ ] 함께했오렌지 조건
- [ ] 누적 수확 해금
- [ ] 비소비형 상점
- [ ] 오렌지·농장 외형 꾸미기

## Future / backlog

- [ ] 친구와 농장 방문
- [ ] 소셜 인증
- [ ] 시즌 이벤트와 한정 도감
- [ ] 결제 시스템
