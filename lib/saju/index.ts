// lib/saju/index.ts
// ============================================================================
//  lib/saju 폴더의 대문(배럴 파일).
//
//  ⚠️ 절대 지우지 마십시오. 2026-07-26 에 한 번 지웠다가 배포가 전부 깨졌습니다.
//
//  [왜 지웠다가 깨졌나]
//  이 파일을 이름으로 직접 import 하는 곳은 한 군데도 없다. 그래서 "참조 0건,
//  죽은 파일"로 잘못 판단했다. 하지만 아래처럼 폴더를 통째로 부르는 곳이 있고,
//
//      import { getUnsung, getSinsal, unsungColor, SINSAL_HIGHLIGHT } from '@/lib/saju'
//
//  폴더를 import 하면 그 안의 index 를 찾는다. 이 파일이 그 index 다.
//  지우는 순간 아래 화면들이 전부 "Module not found" 로 빌드가 깨진다.
//
//  [이 대문을 쓰는 곳 — 2026-07-26 기준]
//    app/manseryeok/result-new/page.tsx
//    app/manseryeok/result-new/SajuWonguk.tsx
//    app/manseryeok/result-new/ExpertDetail.tsx
//    app/manseryeok/result-new/components/DayunTableNew.tsx
//    app/manseryeok/result-new/components/SeyunTableNew.tsx
//    app/manseryeok/mulsang/page.tsx
//
//  ★죽은 파일을 찾을 때는 "파일 이름"이 아니라 "폴더 이름으로 부르는 import"도
//    함께 세야 한다. (교훈 AM)
// ============================================================================
export * from './constants'
export * from './unsung'
export * from './sinsal'
export * from './gongmang'
export * from './dayun'
