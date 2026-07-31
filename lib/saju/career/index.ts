// lib/saju/career/index.ts
//
// ★★★절대 지우지 마십시오★★★
//   `import { judgeOhaengGijil } from '@/lib/saju/career'` 처럼
//   **폴더를 통째로 부르는 import** 는 파일 이름이 드러나지 않습니다.
//   죽은 파일을 이름으로만 세면 이 파일은 반드시 "참조 0건"으로 잡힙니다.
//   지우는 순간 진로적성 화면이 전부 깨집니다. (28부 교훈 AM — 같은 사고로
//   lib/saju/index.ts 를 지워 Vercel 배포가 20여 건 연속 실패한 적이 있습니다)

export * from './types'
export * from './careerScore'
export * from './calcPerson'
export * from './ohaengGijil'
export * from './yukchin'
export * from './ilju'
export * from './sinsal9'
export * from './gyeokguk'
export * from './yongsin'
export * from './jobStructure'
export * from './jobs'
export * from './buildCareerPrompt'
export * from './gyeyeol'
export * from './special'
export * from './sajuMbti'
export * from './status'
export * from './jobFit'
export * from './roleFit'
// ★2026-07-31 (41부 Step 3) — 잇기 두 겹. 기존 값은 하나도 안 바뀝니다
export * from './jijangganBridge'
export * from './namingBridge'
