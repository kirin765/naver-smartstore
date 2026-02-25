# naver-smartstore

네이버 스마트스토어 상품 등록을 돕는 AI 보조 서비스입니다.
웹 앱(Next.js + Supabase + OpenAI + Paddle) 기준으로 개발되어 있으며, 현재 이미지 업로드/분석, 상품 정보 생성, 구독/크레딧 기반 과금 흐름이 포함됩니다.

## 1) 프로젝트 구조

- `apps/web`: Next.js 웹 애플리케이션
- `packages/shared`: 공용 타입/상수
- `supabase`: DB 스키마 정의

## 2) 사전 준비

- Node.js 18+
- pnpm 8+
- Supabase 프로젝트 (DB + Storage)
- OpenAI API Key
- Paddle 계정(Checkout + Webhook)

## 3) 환경변수

루트에 `.env.local`을 만들고 아래 값을 채워주세요.

필수
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_APP_URL`

Paddle/구독 관련
- `PADDLE_CHECKOUT_URL`
- `PADDLE_WEBHOOK_SECRET`
- `PADDLE_API_TOKEN` (선택, 현재는 확장 포인트)
- `PADDLE_VENDOR_ID` (선택, 현재는 확장 포인트)

배포 시 필요할 수 있는 값
- `SUPABASE_SERVICE_ROLE_KEY` (서버 작업에서 사용)

로컬/운영 공통: 배포 대상의 환경변수 설정 화면(예: Vercel Environment Variables)에 동일하게 반영

> 참고: 업로드를 위해 Supabase Storage 버킷 `product-images`가 필요합니다.

## 4) 개발 환경(DEV) 실행

```bash
cd /Users/kiwankim/naver-smartstore
cp .env.example .env.local  # 기존 예시 파일이 있으면 값 변경
pnpm install
pnpm dev
```

- 앱: `http://localhost:3000`
- 기본 루트 명령은 `pnpm --filter web ...` 형태로 동작합니다.
- DB/테이블이 없으면 아래 4번의 스키마 반영을 먼저 수행하세요.

## 5) DB 스키마 반영

### 방법 A: Supabase SQL Editor (권장: 빠른 시작)

`supabase/schema.sql` 전체를 Supabase 프로젝트의 SQL Editor에 실행합니다.

### 방법 B: Supabase CLI

`supabase` CLI로 연결된 프로젝트에 스키마를 반영합니다.

```bash
# Supabase CLI 초기화/로그인 및 프로젝트 연결 후
supabase db reset
# 또는 적절한 경우
# supabase db push
```

또는 새 테이블/컬럼만 반영할 때는 `schema.sql`의 변경분을 직접 migration SQL로 적용합니다.

## 6) 운영 배포(PROD)

### A. Vercel 배포(권장)

1. GitHub 저장소 연결
2. Vercel 프로젝트 설정 (monorepo 핵심)
   - Framework: Next.js
   - Root Directory: `apps/web`
   - Install Command: `corepack enable && pnpm install --frozen-lockfile=false`
   - Build Command: `pnpm build`
   - Output Directory: `.next`
3. 루트 환경변수 등록
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (운영 도메인)
   - `SUPABASE_SERVICE_ROLE_KEY` (서버 작업용)
   - `PADDLE_WEBHOOK_SECRET`
   - `PADDLE_CHECKOUT_URL`
   - `PADDLE_API_TOKEN` (선택)
   - `PADDLE_VENDOR_ID` (선택)
   - `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_SCOPE`(선택)은 GitHub Secrets에 등록
4. 배포 후 앱 URL 확인
   - 사용자 로그인, 상품 등록, 분석/생성/결제 흐름 점검

### B. 수동 Node 실행

```bash
pnpm install
pnpm build
pnpm start
```

- `NODE_ENV=production` 또는 PM2/Docker 등을 함께 사용
- `NEXT_PUBLIC_APP_URL`은 실제 운영 도메인으로 설정

## 7) Paddle Webhook 설정

- Webhook URL: `https://your-domain.com/api/webhooks/paddle`
- Secret: `PADDLE_WEBHOOK_SECRET` 값 등록
- checkout URL 생성 API: `POST /api/billing/paddle/checkout`
- 플랜 목록 API: `GET /api/billing/paddle/plans`

웹훅 처리에서 중복 이벤트(idempotency)는 `paddle_webhook_events` 기반으로 차단됩니다.

## 8) 주요 엔드포인트

- `POST /api/upload/product-image`
- `GET /api/products/[id]/images`
- `PUT /api/products/[id]/images`
- `DELETE /api/products/[id]/images`
- `POST /api/analyze/product-image`
- `POST /api/generate/title`
- `POST /api/generate/full`
- `POST /api/billing/paddle/checkout`
- `POST /api/webhooks/paddle`
- `POST /api/extension/generate-from-images`

## 9) 배포 체크리스트

- [ ] Supabase `product-images` 버킷 생성 및 접근권한 확인
- [ ] `supabase/schema.sql` 반영 완료
- [ ] 환경변수(Production/Preview) 일치
- [ ] `NEXT_PUBLIC_APP_URL` 도메인 설정
- [ ] Paddle Webhook URL + Secret 적용
- [ ] 결제 성공/취소/환불/중복 이벤트 테스트
- [ ] 업로드 크기/형식 제한 테스트 (최대 용량/확장자/개수)

## 10) CI/CD

이 저장소는 GitHub Actions 기준 CI/CD를 제공합니다.

- CI: `/.github/workflows/ci.yml`
  - 트리거: `main` 브랜치 push, `main` 대상 pull request
  - 실행: `pnpm test`, `pnpm build`
- Deploy: `/.github/workflows/deploy.yml`
  - 트리거: `main` 브랜치 push
  - 동작: `pnpm --filter web build` 후 `apps/web` 기준 Vercel 배포
  - 배포 실행 조건: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` Secret이 등록된 경우에만 수행
  - 배포 명령(동작 기준): `pnpm dlx vercel --prod --token "$VERCEL_TOKEN" --scope "$VERCEL_SCOPE" --yes --confirm --project "$VERCEL_PROJECT_ID" --cwd apps/web`

### GitHub Actions Secrets (권장)
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `VERCEL_SCOPE` (선택)
- `PADDLE_WEBHOOK_SECRET` 등 운영용 민감 값은 배포 환경/웹훅 환경변수로 별도 등록

## 11) Vercel 운영 점검 체크리스트

- [ ] Vercel 프로젝트에서 Root Directory가 `apps/web`으로 고정되어 있는지 확인
- [ ] Build Command: `pnpm build`
- [ ] Install Command: `corepack enable && pnpm install --frozen-lockfile=false`
- [ ] Output Directory: `.next`
- [ ] Production 브랜치가 `main`으로 설정되어 있고, Auto Deploy가 `main` push만 처리하는지 확인
- [ ] 아래 환경변수 존재 여부 확인(운영/미리보기 동일 키로 분기)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `OPENAI_API_KEY`
  - `NEXT_PUBLIC_APP_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `PADDLE_WEBHOOK_SECRET`
  - `PADDLE_CHECKOUT_URL`
  - `PADDLE_API_TOKEN`(선택)
  - `PADDLE_VENDOR_ID`(선택)
- [ ] 도메인 연결 후 HTTPS 동작 확인 (`https://your-domain`)
- [ ] Paddle Webhook URL 등록: `https://your-domain/api/webhooks/paddle`
- [ ] 샘플 결제/구독 이벤트에서 크레딧/구독 상태 반영 확인
  - `payment_success`
  - `subscription_created`
  - `subscription_updated`
  - `subscription_cancelled`
- [ ] `/api/webhooks/paddle`의 Idempotency(중복 이벤트 처리) 동작 확인
- [ ] 배포 후 Smoke 체크
  - `/products`, `/products/new`, `/settings` 접근
  - `POST /api/analyze/product-image`
  - `POST /api/generate/full`
