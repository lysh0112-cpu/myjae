물상도 A·B 보완 — 적용 안내
(2026-07-22, 검증사주 4명 확인 완료)

■ 무엇이 바뀌었나
  A. 그림 프롬프트에 태어난 시각(時支)을 반영
     - 기존엔 해설에만 시각이 들어가고 그림엔 빠져 있어
       AI가 매번 노을·여명으로만 그리던 문제를 고침
  B. 그림 생성 55초 자체 제한 + 소요 시간 로그
     - Vercel 60초 상한에 그냥 걸려 오류 처리조차 못 하던 문제를 고침
     - image_timeout 안내 문구 + 관리자 로그 기록

■ 바뀐 파일 (3개) — 저장소 같은 경로에 덮어쓰기
  lib/saju/mulsangPrompt.ts          (BRANCH_HOUR 표 신설 + hourBranch 반영)
  app/api/mulsang/route.ts           (55초 AbortController + elapsed 로그)
  app/manseryeok/mulsang/page.tsx    (hourBranch 전달 + 타임아웃 안내 문구)

■ 적용 방법 (둘 중 하나)
  1) 파일 덮어쓰기: 위 3개 파일을 저장소 같은 경로에 복사
  2) 패치 적용:     저장소 루트에서  git apply AB-fix.patch

■ 검증 결과
  - tsc --noEmit : 통과 (에러 0)
  - 새 lint 경고 : 0건
  - A: 오연희(午)=한낮 / 류도이(寅)=새벽 / 류승현(卯)=아침 / 시간모름=지시없음 — 모두 그림 프롬프트에 정확히 반영
  - B: 제한 안이면 통과, 초과 시 image_timeout으로 정확히 끊김

■ 배포 전 남은 일 (코드 아님)
  - 검증사주로 화풍4개 × 시간대 몇 개 그림을 뽑아 눈으로 확인
    (BRANCH_HOUR 영어 문구 톤이 의도와 맞는지)
  - BRANCH_HOUR 문구 조정은 mulsangPrompt.ts 표 한 곳만 고치면 됨

■ 여기 포함 안 된 것 (의도적)
  - C 화질(quality:'high') : 배포 후 소요 시간 로그 확인 → 대표님 판단 뒤에
  - D 교훈 / E 미확인      : 인수인계서 문서에 기록할 항목
