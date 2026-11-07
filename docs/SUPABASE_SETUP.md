# 선택적 계정 연결 설정

게스트 기록은 계정을 연결하기 전까지 이 브라우저의 IndexedDB에만 남습니다. 첫 씨앗을 얻은 뒤 Google 계정을 선택적으로 연결하면 로컬 목표, 동결창고, 수확 기록, 도감의 원본 기록을 사용자별 클라우드 행과 합칩니다. 실제 Google 로그인과 두 기기 복원은 프로젝트 설정 후 수동 확인이 필요합니다.

1. Supabase 프로젝트를 만들고 `supabase/migrations/0001_goal_records.sql`을 SQL Editor에서 실행합니다. 정책과 테이블이 적용됐는지 확인합니다.
2. Supabase Auth에서 Google provider를 활성화하고, Google OAuth 클라이언트 ID/비밀값을 **Supabase 설정 화면에만** 입력합니다. 앱 저장소나 브라우저 환경변수에는 비밀값을 넣지 않습니다.
3. Supabase Auth의 URL Configuration에 실제 사이트 URL을 지정합니다. 개발 중에는 `http://localhost:3000`을 redirect 허용 목록에 추가합니다. 다른 포트로 개발한다면 그 포트도 추가합니다.
4. `.env.local`에 다음 공개 설정만 추가하고 개발 서버를 재시작합니다. 기존 `OPENAI_API_KEY` 값은 유지합니다.

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=프로젝트_URL
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=프로젝트_publishable_key
   ```

5. 브라우저에서 씨앗 하나를 획득한 뒤 `Google 계정 연결하기`를 누릅니다. 같은 계정으로 다른 기기에 로그인해 목표·동결창고·수확 기록·도감이 복원되는지 확인합니다.

게스트에게 Supabase 익명 계정을 자동 생성하지 않습니다. 연결 이전의 시작 흐름은 인터넷이나 로그인에 의존하지 않습니다. 같은 브라우저에서 다른 Google 계정으로 전환하면 기존 로컬 기록을 다른 계정에 합치지 않고 오류를 표시합니다. 계정 전환과 동시 편집 충돌 해결은 후속 검증 항목입니다.
