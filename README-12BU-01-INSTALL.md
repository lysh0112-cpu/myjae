# myjae-12bu-01 — 토스 «라이브 키» 교체 (2026-09-30)

## 바뀐 파일 4개 (+ 이 안내서)
  app/wallet/charge/page.tsx            ★CLIENT_KEY → live_gck_ma60…YWBn1
  app/components/common/WalletPanel.tsx 주석만 (테스트 → 라이브)
  app/api/toss/confirm/route.ts         주석만 (wallet_charge → wallet_charge_paid 옛 문구 바로잡음)
  58-verify-home-prices.ts              ★라이브 키인지 «값으로» 봄 · 테스트 키가 남으면 멈춤

## 검사
  npm run verify → 통과 3,718 · 실패 0 · 그물 31   (11부 3,717 +1)
  tsc 0 · eslint 84/147 (기준선 그대로)
  ⚠️ 역시험: 키를 test_ 로 되돌리면 ★검사가 멈추는 것 확인

## 🔴 순서 — 이 셋을 «한 번에»
  ① Vercel → myjae → Settings → Environment Variables
     TOSS_SECRET_KEY (Production) → ★live_gsk_… 로 덮어쓰기
     (토스 개발자센터 → 라이브 → 주문서형·결제창형 연동 키 → 시크릿 키 [보기])
  ② 이 봉투를 올리기 (올리면 재배포가 됩니다)
  ③ Vercel Deployments 맨 위가 ★Ready · Production 초록인지

## 🔴 그 다음 — 5,000원 한 번
  ⚠️ 이제 «진짜 돈» 이 빠집니다. 심사 완료된 카드로 하십시오 (국민카드 제외).
  □ 「충전됐어요」 · 잔액 +5,000
  □ 그 화면에서 ★새로고침 — 또 늘면 고장
  □ 토스 상점관리자 → 결제내역에 찍히는지
  □ 시험 뒤 환불하실지는 따로 정합니다 (카드 취소만 하면 ★지갑 잔액은 그대로 남습니다)
