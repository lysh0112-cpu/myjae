물상도 보완 (A·B·C·D) — 적용 안내
2026-07-22 / 검증 완료

■ 담긴 수정 4가지
  A. 그림 프롬프트에 태어난 시각 반영    (mulsangPrompt.ts)
  B. 그림 55초 제한 + 소요시간 로그       (route.ts)
  C. 해설에 태어난 시각 반영             (mulsangTongbyeonPrompt.ts)
     - 오연희(겨울 子월+한낮 午시)가 "한밤중"으로 나오던 문제
  D. ★수묵담채화 색 쏠림(노란/세피아) 수정  (mulsangPrompt.ts)  ← 이번 추가

■ D 상세 — 왜 노랬나
  "필터"가 아니라 프롬프트가 색을 노랗게 밀고 있었다.
  한 프롬프트에 'warm'이 4번 겹침(계절+용신+분위기+화풍).
  이미지 AI는 warm을 "따뜻한 감정"이 아니라 "웜톤=노랑"으로 읽는다.
  용신이 土(황색)인 사람은 이게 겹쳐 온 화면이 세피아가 됐다.
  수정:
   - 감정 톤 'warm'은 hopeful/uplifting으로 교체(색 영향 제거)
   - 용신 빛 문구에서 색온도 말 제거
   - 가을·늦여름 계절의 과한 golden/amber 눅임
   - 수묵담채화 화풍: "흰 한지+먹 농담+은은한 담채, 세피아·단색노랑 금지" 명시
  결과(酉월+土용신 기준): warm 4→0회, 노랑계열은 전부 "NOT~" 부정문 안.
  다른 화풍(지브리/신카이/시티팝)은 영향 없음 확인.

■ 바뀐 파일 (4개) — 저장소 같은 경로에 덮어쓰기
  lib/saju/mulsangPrompt.ts           (A·D)
  lib/saju/mulsangTongbyeonPrompt.ts  (C)
  app/api/mulsang/route.ts            (B)
  app/manseryeok/mulsang/page.tsx     (A·C 호출부)

■ 적용: 파일 덮어쓰기  또는  git apply mulsang-fix.patch

■ 검증
  - tsc --noEmit : 통과(에러 0) / 새 lint 에러 0
  - A: 오연희 午→한낮, 그림 프롬프트 반영
  - C: 오연희 해설에 "한낮(午시)" + 밤 묘사 금지 지침
  - D: 4개 화풍 색 균형 확인, 수묵담채화 세피아 방지

■ 배포 후 확인 (이 환경엔 API/이미지 키 없어 미실행)
  - 홍길동(土 용신)으로 수묵담채화 다시 뽑아 색이 정상인지
  - 오연희 해설에서 "밤" 사라지고 "한낮"인지
  - quality:'high'(화질)는 소요시간 로그 본 뒤 대표님 판단
