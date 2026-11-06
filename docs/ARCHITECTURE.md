# Orange Task Farm — Architecture proposal

- Updated: 2026-09-08
- Status: 기술 설계 확정, 애플리케이션 코드 미생성

## 1. 추천 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| Runtime | Node.js 22 LTS | 안정적인 최신 LTS |
| Package manager | pnpm | 빠르고 재현 가능한 설치 |
| Web | Next.js App Router + React + TypeScript | UI와 서버 API를 한 저장소에서 단순하게 운영 |
| Styling | Tailwind CSS + CSS variables | 빠른 반응형 제작과 명시적인 디자인 토큰 |
| Form/schema | React Hook Form + Zod | 적은 입력 리렌더와 공유 가능한 런타임 검증 |
| AI | OpenAI Responses API + Structured Outputs | 서버 전용 키와 스키마 기반 결과 |
| Guest data | IndexedDB + Dexie | 구조화된 브라우저 저장과 버전 마이그레이션 |
| Cloud | Supabase Auth + Postgres + RLS | 승인됨. 익명 사용자에서 Google OAuth 계정 연결, 사용자별 데이터 격리 |
| Tests | Vitest + Testing Library + Playwright | 규칙, UI, 전체 Core Loop 검증 |
| Hosting | Vercel + Supabase | 초기 운영 부담 최소화 |

정확한 패키지 버전은 Phase 0에서 당시 stable 버전으로 고정하고 lockfile을 커밋한다.

인증은 MVP에서 Google OAuth 하나만 제공한다. 이메일 로그인은 Google 사용이 어려운 실제 사용자 요구가 확인될 때 후속 추가한다. Vercel 설정은 애플리케이션 완성 후 배포 단계까지 보류한다.

## 2. 설계 원칙

### Local-first, account-optional

UI는 IndexedDB나 Supabase를 직접 호출하지 않고 저장소 인터페이스를 사용한다. 계정 연결 전에는 IndexedDB가 원본이며, 연결 시 동기화 서비스가 로컬 레코드를 사용자별 클라우드 행으로 안전하게 병합한다. 성공 후 로컬 데이터는 캐시 역할을 한다.

### Server-owned AI

브라우저는 목표 입력만 Next.js Route Handler로 보낸다. 서버가 API 키를 보관하고 AI 구조화 응답을 Zod로 검증한다. 허용되지 않은 cm와 잘못된 결과는 저장하지 않는다.

### Pure domain rules

cm, 유한성, 진행률, 성장 구간, 활성 목표 제한, 수확 가능 여부는 React·DB·네트워크에 의존하지 않는 순수 코드로 둔다.

### Feature-oriented UI

상호작용은 `features`에, 범용 시각 요소는 `components/ui`에 둔다. 제품 컴포넌트를 거대한 공용 폴더에 섞지 않는다.

## 3. 제안 폴더 구조

```text
Oorange_Lab/
├─ docs/
│  ├─ PRD.md
│  ├─ RULES.md
│  ├─ TODO.md
│  ├─ ARCHITECTURE.md
│  └─ IMPLEMENTATION_PLAN.md
├─ public/
│  ├─ images/
│  │  └─ orange-main.png
│  └─ icons/
├─ src/
│  ├─ app/
│  │  ├─ api/ai/
│  │  │  ├─ analyze-goal/route.ts
│  │  │  ├─ validate-action/route.ts
│  │  │  └─ suggest-action/route.ts
│  │  ├─ goals/[goalId]/page.tsx
│  │  ├─ freezer/page.tsx
│  │  ├─ records/page.tsx
│  │  ├─ encyclopedia/page.tsx
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  └─ globals.css
│  ├─ components/ui/
│  ├─ features/
│  │  ├─ goal-analysis/
│  │  ├─ starter-action/
│  │  ├─ start-timer/
│  │  ├─ active-goals/
│  │  ├─ freezer/
│  │  ├─ progress/
│  │  ├─ growth/
│  │  ├─ harvest/
│  │  ├─ records/
│  │  └─ encyclopedia/
│  ├─ domain/
│  │  ├─ goal/
│  │  ├─ orange/
│  │  ├─ progress/
│  │  └─ shared/
│  ├─ application/
│  │  ├─ ports/
│  │  └─ services/
│  ├─ infrastructure/
│  │  ├─ ai/
│  │  ├─ db/indexeddb/
│  │  ├─ db/supabase/
│  │  ├─ auth/
│  │  └─ analytics/
│  ├─ lib/
│  └─ test/
├─ supabase/migrations/
├─ e2e/
├─ .env.example
├─ package.json
├─ pnpm-lock.yaml
└─ README.md
```

각 폴더는 해당 단계가 시작될 때만 만든다. 초기화 시 빈 폴더를 미리 생성하지 않는다.

## 4. 핵심 데이터 모델

### Goal

`id`, `ownerId?`, `title`, `context?`, `status`, `orangeSizeCm`, `sizeReason`, `isFinite`, `progressMode`, `unitLabel`, `currentAmount`, `targetAmount`, `createdAt`, `startedAt?`, `updatedAt`

상태는 `draft | awaiting_start | active | frozen | ready_to_harvest | harvested`다.

### StarterAction

`id`, `goalId`, `text`, `orangeSizeCm`, `canCompleteWithinThreeMinutes`, `source`, `startedAt?`, `finishedAt?`. 완료 시각은 최종 목표 진행률을 자동 변경하지 않는다.

### Orange

`id`, `goalId`, `growthStage`, `seededAt`, `harvestedAt?`, `varietyId?`

### ProgressEntry

`id`, `goalId`, `previousAmount`, `newAmount`, `createdAt`, `note?`. 정정과 동기화 충돌을 안전하게 다루기 위해 변경 기록을 남긴다.

### HarvestRecord and Variety

명시적 수확 후 기록은 불변이다. 품종 자격과 확률 설정에는 버전을 저장해 결과를 추적 가능하게 한다.

## 5. API 경계

- `POST /api/ai/analyze-goal`: cm, 이유, 유한성, 완료 기준, 진행 단위, 첫 행동
- `POST /api/ai/validate-action`: 씨앗 생성 전 수정 행동만 검증
- `POST /api/ai/suggest-action`: 저장된 제안 이후 사용자가 요청할 때만 재생성

저장, 진행률, 동결, 수확 규칙은 application service를 통한다. Route Handler나 React 컴포넌트에 비즈니스 규칙을 직접 넣지 않는다.

## 6. 보안과 보류 사항

- `OPENAI_API_KEY`는 서버에서만 사용한다.
- 실제 비밀키는 `.env.local` 또는 배포 플랫폼 secret에만 저장하고 Git과 문서에는 기록하지 않는다.
- 모든 사용자 소유 테이블에 RLS를 적용한다.
- 목표 본문을 로그나 분석 이벤트에 넣지 않는다.
- 공개 전 AI endpoint에 rate limit을 둔다.
- AI 모델은 한국어 품질·지연·비용 평가 후 선택한다.
- 특별 품종 확률, 레이드 집계, 결제는 현재 구현하지 않는다.

## 7. 승인된 시각 자산

- 기본 오렌지 원본: `public/images/orange-main.png`
- 용도: 브랜드 오렌지, 초기 목표 크기 표현, 기본 수확 오렌지의 원본 자산
- 원본 비율을 보존하고 찌그러뜨리지 않는다.
- 성장 단계에 필요한 씨앗·새싹·나무·꽃 이미지는 이 파일과 별도 자산이므로 MVP-1 전에 추가 결정한다.
