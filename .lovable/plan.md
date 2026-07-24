
# IntentLock — 한국어 실동작 앱 구현 계획

랜딩페이지를 걷어내고, PRODUCT_SPEC의 R1 흐름(로그인 → 계약 승인 → Guardian → 결제 → Beta Pass 지급 → 리포트 → 취소)을 **Lovable Cloud + Lovable AI로 재구현**합니다. 실제 토스페이먼츠·Cloudflare D1·ChatGPT Access는 이 환경에서 못 붙이므로, **결제는 통제된 모의(mock) PG**로 대체하고 나머지 정책·감사·이행 로직은 실제로 동작하게 만듭니다. 모든 UI는 한국어.

## 사용 스택

- **Lovable Cloud** (Supabase): 인증(이메일 매직링크), Postgres 데이터, RLS.
- **Lovable AI** (`google/gemini-2.5-flash`): 자연어 Intent 정규화 + Guardian 판정.
- TanStack Start 라우팅, shadcn UI, 기존 흑백 디자인 토큰 유지.

## 데이터 모델 (Postgres, RLS 필수)

```text
products               상품 원본. Beta Pass 1,000원 시드
orders                 서버가 만든 주문. status: PENDING|PAID|CANCELED|FULFILLED
intent_contracts       계약 v1..vN. status: PENDING|APPROVED|CONSUMED|SUPERSEDED
                       fingerprint(sha256), amount_limit, purpose, expires_at
payments               결제. status: READY|APPROVED|CANCELED, mock_payment_key
payment_events         append-only 감사
entitlements           Beta Pass 이용권. remaining_reports, expires_at, status
guardian_reports       Guardian 판정 결과. verdict: ALLOW|BLOCK, reason
cancellation_requests  전액 취소 요청. idempotency_key
user_roles             admin/operator 여부 (별도 테이블 + has_role SECURITY DEFINER)
```

모든 테이블에 `GRANT` + RLS 정책. 운영자 판정은 `has_role(auth.uid(), 'operator')`.

## 서버 로직 (createServerFn, requireSupabaseAuth)

- `createOrder` — 상품 원본으로 주문 생성, 클라이언트 금액 금지.
- `createContract` — 자연어 문장 받아 Lovable AI로 목적/금액/횟수 정규화 → SHA-256 지문 → PENDING 저장.
- `approveContract` — 정책 판정(금액 ≤ 상품가, 목적 일치) 후 APPROVED.
- `guardCheckout` — 승인 계약과 결제 요청을 대조해 ALLOW/BLOCK 판정.
- `mockConfirmPayment` — 모의 승인. 주문·계약·금액 재검증, 결제 APPROVED, 계약 CONSUMED, 이용권 지급을 하나의 트랜잭션에서.
- `generateGuardianReport` — Lovable AI가 사용자가 입력한 구매 시나리오를 판정, 잔여 리포트 1 차감.
- `operatorCancel` — operator 역할만, 전액 취소, 이용권 REVOKED, 감사 이벤트.

멱등키는 클라이언트가 `crypto.randomUUID()`로 생성해 헤더로 전달, 서버가 `orders.idempotency_key` UNIQUE로 강제.

## 화면 (한국어, 흑백 감각 유지)

```text
/            홈. Beta Pass 소개 + [구매하기] → /checkout
/auth        로그인/가입 (이메일)
/checkout    1) 주문 생성  2) Intent Contract 자연어 입력·미리보기·승인
             3) Guardian 판정 결과  4) [결제 승인] (모의 PG)
/purchases   내 구매 내역: 주문·결제·이용권 상태, 영수증
/beta        Beta Pass 대시보드: 잔여 리포트, 새 리포트 생성 폼
/beta/reports/:id  리포트 판정 상세 + JSON 다운로드
/operator    operator 전용: 주문 검색, 상세, 전액 취소 (사유 10~200자)
```

라우팅은 `_authenticated` 레이아웃으로 게이트, `/operator`는 컴포넌트에서 role 재검증.

## 흑백 디자인 유지

기존 `src/styles.css`의 monochrome 토큰과 그리드 배경을 그대로 사용. 컴포넌트에는 하드코딩 색상 금지, `bg-foreground text-background` 같은 semantic 조합만 사용.

## 구현 순서

1. Lovable Cloud 활성화.
2. 스키마 마이그레이션 + RLS + `has_role` + Beta Pass 시드.
3. `_authenticated` 게이트 + `/auth` 매직링크.
4. 서버 함수 7개 (`createOrder`, `createContract`, `approveContract`, `guardCheckout`, `mockConfirmPayment`, `generateGuardianReport`, `operatorCancel`) — 각자 Zod 검증 + 감사 이벤트 append.
5. 화면 라우트 7개 구현.
6. 랜딩 `src/routes/index.tsx`를 홈(로그인/구매 진입)으로 교체.
7. 흑백 톤·타이포 톤 QA.

## 명시적 스코프 축소

- 실제 토스페이먼츠 승인 API 호출은 붙이지 않음. `mockConfirmPayment`가 그 자리를 대체하고 흐름·감사·멱등은 동일하게 동작.
- ChatGPT/Cloudflare Access 대신 Lovable Cloud 이메일 인증.
- 웹훅 재조정, 라이브 게이트 F-10, PG 원본 재조회는 UI에서 "샌드박스 데모" 배지로 명시.

이대로 진행할까요? 특히 결제 부분은 **모의 승인**으로 가야 이 환경에서 동작합니다 — 실제 토스 라이브 연동이 꼭 필요하시면 알려주세요(별도 배포 필요).
