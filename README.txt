물상도 시각 보완 (A·B·C) — 적용 안내
2026-07-22 / 검증사주 확인 완료

■ 배경
  오연희님(음력 겨울 子월 · 午시=한낮)의 그림 해설이 자꾸
  "한겨울 밤 / 한밤중 / 네온 꺼진 도시"로 나왔다.
  원인: 해설이 태어난 시각을 몰라, 계절(겨울)을 밤으로 착각.
  → 계절(월지)과 시각(시지)이 프롬프트에서 뒤엉켜 있었다.

■ 바뀐 것 (3가지)
  A. 그림 프롬프트에 태어난 시각 반영 (lib/saju/mulsangPrompt.ts)
     - BRANCH_HOUR 표 신설. 그림 하늘·빛을 시각에 맞춤.
  B. 그림 55초 자체 제한 + 소요시간 로그 (app/api/mulsang/route.ts)
  C. ★해설에 태어난 시각 반영 (lib/saju/mulsangTongbyeonPrompt.ts)  ← 이번 핵심
     - HOUR_MOOD 표 신설 + "계절과 시각을 절대 뒤섞지 말 것" 지침
     - 겨울에 태어나도 午시면 "겨울의 밝은 대낮"으로 쓰라고 명시
     - 시간 모름이면 밤/낮 단정하지 말라고 지시

■ 바뀐 파일 (4개) — 저장소 같은 경로에 덮어쓰기
  lib/saju/mulsangPrompt.ts           (A)
  lib/saju/mulsangTongbyeonPrompt.ts  (C) ← 이번 추가
  app/api/mulsang/route.ts            (B)
  app/manseryeok/mulsang/page.tsx     (A·C 호출부에서 시각 전달)

■ 적용 방법
  1) 파일 덮어쓰기, 또는
  2) git apply mulsang-fix.patch

■ 검증
  - tsc --noEmit : 통과 (에러 0)
  - 새 lint 에러 : 0건
  - A: 오연희 午→한낮 / 류도이 寅→새벽, 그림 프롬프트에 반영 확인
  - C: 오연희(子월+午시) 해설 프롬프트에
       "태어난 시각: 한낮(午시)" + "밤으로 묘사하면 안 됨" 지침 확인

■ 배포 후 확인 (코드 아님)
  - 오연희님으로 실제 해설을 다시 뽑아 "밤" 이야기가
    사라지고 "한낮"으로 나오는지 눈으로 확인 (이 환경엔 API키 없어 미실행)
  - C안(화질 quality:'high')은 소요시간 로그 확인 후 대표님 판단
