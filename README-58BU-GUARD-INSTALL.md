# 58부 — 관리자 API 「아침마다 막힘」 고침 · 넣는 법

```
작성   2026-08-12
저장소 https://github.com/lysh0112-cpu/myjae.git
기준   270a01c «5214» 에서 이어짐
고침   48부 인수인계서 10-2 PENDING
파일   ★한 개 (app/api/admin/_guard.ts) · 실질 세 줄
검사   tsc 통과 · verify ★통과 1,690 · 실패 0 · eslint 82/135 ★기준선 그대로
       ★npx next build — 100/100 화면 그려짐 (실제로 돌려 확인 · 폰트·env 되돌림 완료)
```

⚠️ **SQL 없습니다.** ⚠️ **npm 새 꾸러미 없습니다.** (`npm i` 다시 안 하셔도 됩니다)

---

## ★넣는 법 — 덮어쓰기만 하면 됩니다

이 zip 을 **저장소 뿌리(`myjae/`)에서 그대로 풀면** 됩니다.
안에 든 파일이 **이미 저장소와 같은 자리**에 놓여 있습니다.

```
myjae/                              ← ★여기서 풉니다
└─ app/api/admin/_guard.ts          ★덮어쓰기 (이 파일 하나뿐입니다)
```

넣고 나서 확인 —

```bash
npx tsc --noEmit      # 아무것도 안 나오면 정상
npm run verify        # ★1,690건 · 실패 0 이면 정상
npx eslint .          # ★82 errors, 135 warnings  ← 기준선 그대로
```

⚠️ `58bu-guard-role-fix.patch` 는 **참고용**입니다.
`git apply` 로 넣으셔도 되고, 위 파일을 덮어쓰셨다면 **안 쓰셔도 됩니다.**

---

## 1. 무엇이 문제였나

```
[겪은 일]  대표님 —「어제 밤까지 됐는데 아침에 안 되네」
   관리자 화면 → 회원 관리 →「관리자만 사용할 수 있습니다」(403)
   → 로그아웃하고 다시 로그인하면 ★됩니다.
   ⇒ 매일 아침 첫 접속마다 재로그인. 관리자 API ★여덟 개가 다 같이 막혔습니다.
```

🔴 **문지기가 «둘» 인데 등급을 읽는 방식이 달랐습니다.**

```
화면  hooks/useRoleGate.tsx   브라우저 supabase-js  → ★토큰을 «스스로» 되살림
API   app/api/admin/_guard.ts 서버 anon 키 + 쿠키   → ★되살리는 길이 «없음»

⇒ 밤새 토큰이 만료되면 profiles 조회에 uid 가 안 실립니다.
  RLS 정책이 auth.uid() = id 라 profile 이 null →「매니저가 아니다」→ 403.

★그래서 「관리자 화면은 열리는데 회원 관리만 안 되는」 모양이 나왔습니다.
  로그아웃이 «됐으면» 차라리 나았습니다 — 로그인 화면이 떴을 테니까요.
```

⚠️ 이것은 **AutoLogout(무동작 2시간) 과 다른 일입니다.**
그쪽은 일부러 넣은 것이고 «맞게» 돌고 있습니다. ⛔ 2시간을 늘리지 마십시오.

---

## 2. 무엇을 고쳤나 — ★세 줄

```
[전]  const { data: profile } = await supabase          ← anon 키 + 만료된 쿠키
        .from('profiles').select('role').eq('id', user.id).single()

[후]  const reader = roleReader() ?? supabase           ← ★service_role
      const { data: profile } = await reader
        .from('profiles').select('role').eq('id', user.id).maybeSingle()
```

```
✅ ①② 「누구세요」는 ★한 글자도 안 건드렸습니다 — 쿠키 세션 검증 그대로입니다.
✅ 바뀐 것은 ③ 「그 사람의 등급을 읽는 길」 ★하나뿐입니다.
✅ user.id 는 Supabase 가 «서명해 발급한» 토큰에서 나온 값이라 위조할 수 없고,
   요청 본문은 여전히 ★믿지 않습니다.  ⇒ ★보안 수준은 그대로입니다.
✅ 열쇠(SUPABASE_SERVICE_ROLE_KEY)가 «없으면» anon 으로 내려갑니다 — 안 죽습니다.
✅ single() → maybeSingle() — profiles 줄이 «없는» 사람은 오류가 아니라 «손님» 입니다.
```

---

## 3. ⚠️ 확인은 «내일 아침» 에 됩니다

밤새 토큰이 만료돼야 재현되는 것이라 **지금 눌러 보면 어차피 됩니다.**

```
내일 아침 첫 접속 —
   ✅ 회원 관리가 «그냥» 열리면   → 잡혔습니다
   ❌ 그래도 403 이 나면         → 원인이 «다른 곳» 입니다.
      ⇒ middleware.ts 의 세션 갱신 쪽을 봐야 합니다. 그때 알려 주십시오.
```

되든 안 되든 **이 고침 자체는 손해가 없습니다** —
두 문지기가 등급을 «같은 방식으로» 읽게 된 것이라 원래 맞춰야 했던 자리입니다.

---

## ⛔ 손대지 말 것 (58부에 더해짐)

```
⛔⛔ ★profiles 의 RLS 정책을 «풀지» 마십시오 —
     전 회원의 생년월일이 들어 있습니다.
     이 파일이 service_role 로 읽는 것은 ★role «한 칸» 뿐입니다.

⛔⛔ ★①② (auth.getUser) 를 service_role 로 «바꾸지» 마십시오 —
     거기는 쿠키를 «검증하는» 자리입니다. service_role 로 바꾸면 검증이 사라집니다.

⛔ ★roleReader() 의 클라이언트를 «다른 표» 를 읽는 데 돌려쓰지 마십시오.

⛔ ★AutoLogout 의 무동작 2시간을 «늘리지» 마십시오 —
     이번 일과 다른 것이고, 공용 기기 대비로 일부러 넣은 것입니다.

⛔ ★requireUser 는 등급을 안 봅니다. 여기에 roleReader 를 붙이지 마십시오.
```
