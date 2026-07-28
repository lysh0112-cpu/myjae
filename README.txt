물상도 보완 (A·B·C·D·E) — 적용 안내
2026-07-22 / 검증 완료

■ 담긴 수정
  A. 그림 프롬프트에 태어난 시각 반영         (mulsangPrompt.ts)
  B. 그림 55초 제한 + 소요시간 로그            (route.ts)
  C. 해설에 태어난 시각 반영                  (mulsangTongbyeonPrompt.ts)
     - 오연희(겨울+한낮)가 "한밤중"으로 나오던 문제
  D. 수묵담채화 색 쏠림(노랑/세피아) 수정      (mulsangPrompt.ts)
  E. ★화풍 색·무게 전반 수정                  (mulsangPrompt.ts)  ← 이번 추가
     - 시티팝: "sunset / peach coral 팔레트" 강제를 뺌.
       하늘·물·땅이 각자 색을 유지하도록 → 전체 붉은 쏠림 해소.
     - 빛나는하늘(shinkai): 'hyper-detailed' 등 무거운 말 제거(B 메모 지적).
       60초 초과·실패 위험 낮춤.

■ 색 쏠림의 공통 원인
  화풍 문구가 색을 한 덩어리로 강제하고 있었다.
   - oriental: warm 4겹 → 세피아
   - citypop : "sunset gradient palette of peach coral" → 전체 붉음
  둘 다 "팔레트 강제"를 풀고, 각 요소가 제 색을 갖도록 바꿈.
  실제 색은 계절+시각(A)이 정하게 두고, 화풍은 '기법'만 지시.

■ 검증 (酉·卯월 등 4화풍)
  - 색강제: 없음 (oriental의 'NOT golden' 부정문만 남음=노랑 차단)
  - 무거운 말: 0
  - tsc 통과, 새 lint 에러 0

■ 바뀐 파일 (4개) — 저장소 같은 경로에 덮어쓰기
  lib/saju/mulsangPrompt.ts           (A·D·E)
  lib/saju/mulsangTongbyeonPrompt.ts  (C)
  app/api/mulsang/route.ts            (B)
  app/manseryeok/mulsang/page.tsx     (A·C 호출부)

■ 적용: 파일 덮어쓰기  또는  git apply mulsang-fix.patch

■ 배포 후 확인 (이 환경엔 이미지 키 없어 미실행)
  - 시티팝 다시 뽑아 하늘/물/땅 색이 분리되는지 (붉은 쏠림 해소 확인)
  - 빛나는하늘 다시 뽑아 잘 나오고 시간 안 초과하는지
  - 수묵담채화·해설 시각은 앞서 확인됨(정상)
