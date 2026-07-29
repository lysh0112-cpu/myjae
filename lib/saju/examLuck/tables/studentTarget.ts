// lib/saju/examLuck/tables/studentTarget.ts
//
// ┌──────────────────────────────────────────────────────────────────┐
// │  학생 모드 — 목표 구분과 목표 학교·계열 (2단 드롭다운)                │
// │  2026-07-29                                                       │
// └──────────────────────────────────────────────────────────────────┘
//
// ★2026-07-29 대표님 지시 —
//   학생이 «어디를 목표로 하는지» 를 골라 두면, 그 결에 맞춰 풀어 줄 수 있습니다.
//
// ── ⚠️ 이 파일은 «교재» 가 아닙니다 ────────────────────────────────────
//   여기 담긴 학교 갈래·계열은 교재 어디에도 없습니다. 오늘 입시 제도의 이름입니다.
//   그래서 tables/rules.ts(교재 원문)와 **파일을 갈랐습니다.**
//   ★rules.ts 에 섞어 두면 다음 사람이 «교재에 이런 게 있었나» 하고 헷갈립니다.
//
//   ⚠️ 입시 제도는 자주 바뀝니다. 이 목록은 언젠가 낡습니다.
//      낡았을 때 여기 한 곳만 고치면 화면과 프롬프트가 함께 따라옵니다.
//
// ── 사주와 어떻게 잇는가 ──────────────────────────────────────────────
//   교재가 학교 이름을 말하지는 않지만, 십성의 결은 말합니다.
//     관성  틀을 지키고 평가받는 힘   → 생기부·수시·경쟁이 센 전형
//     인성  받아서 쌓는 힘            → 수능·정시·지필
//     식상  꺼내 보이는 힘            → 면접·실기·수행·논술
//   목표마다 «어느 힘이 더 필요한가» 를 적어 두고, 프롬프트가 그것을 씁니다.
//   ★단정하지 않습니다. "이 힘이 세니 유리하다" 가 아니라
//     "이 목표에는 이 힘이 쓰이니, 지금 어떤지 함께 보자" 는 결로 씁니다.

export type ExamCategory = '' | 'highschool' | 'susi' | 'jeongsi'

export interface TargetOption {
  key: string
  label: string
  /** 그 목표에 특히 쓰이는 십성 결 — 프롬프트가 읽는다 */
  needs: string[]
  /** 한 줄 설명 — 프롬프트에 그대로 실린다 */
  note: string
}

/** 1차 — 목표 구분 */
export const EXAM_CATEGORIES: Array<{ key: ExamCategory; label: string }> = [
  { key: '', label: '선택 안 함' },
  { key: 'highschool', label: '고교 입시 (특목고 · 자사고 · 예술고 등)' },
  { key: 'susi', label: '대입 수시 (학종 · 교과 · 논술)' },
  { key: 'jeongsi', label: '대입 정시 (수능 위주)' },
]

/** 2차 — 목표 학교·계열 */
export const TARGETS: Record<Exclude<ExamCategory, ''>, TargetOption[]> = {
  highschool: [
    { key: 'jasa', label: '자율형사립고(자사고)', needs: ['관성', '인성'],
      note: '학교 안에서 꾸준히 평가받는 자리라, 틀을 지키는 힘과 쌓아 두는 힘이 함께 쓰입니다.' },
    { key: 'foreign', label: '외국어고 · 국제고', needs: ['인성', '식상'],
      note: '언어는 받아들여 쌓고 다시 꺼내 쓰는 일이라, 배우는 힘과 표현하는 힘이 같이 필요합니다.' },
    { key: 'science', label: '과학고 · 영재학교', needs: ['인성', '편인'],
      note: '깊이 파고들어 스스로 답을 찾는 자리라, 안으로 파고드는 힘이 크게 쓰입니다.' },
    { key: 'arts', label: '예체능고', needs: ['식상'],
      note: '꺼내 보이는 것이 곧 실력이 되는 자리라, 표현하는 힘이 가장 크게 쓰입니다.' },
    { key: 'custom', label: '직접 입력', needs: [], note: '' },
  ],
  susi: [
    { key: 'top', label: '주요 상위권 대학', needs: ['관성', '인성'],
      note: '학교 생활과 기록이 함께 평가되는 자리라, 꾸준함과 쌓아 온 것이 같이 쓰입니다.' },
    { key: 'medical', label: '의 · 치 · 한 · 약 · 수 (메디컬)', needs: ['관성', '인성', '편관'],
      note: '오래 버티며 기준을 지켜야 하는 자리라, 눌러 세우는 힘과 배우는 힘이 크게 쓰입니다.' },
    { key: 'kaist', label: '과학기술원 (KAIST 등)', needs: ['편인', '식상'],
      note: '파고드는 힘과 스스로 만들어 내는 힘이 함께 쓰이는 자리입니다.' },
    { key: 'national', label: '거점 국립대', needs: ['인성', '관성'],
      note: '고르게 쌓아 온 것을 보는 자리라, 꾸준함이 그대로 힘이 됩니다.' },
    { key: 'custom', label: '직접 입력', needs: [], note: '' },
  ],
  jeongsi: [
    { key: 'top', label: '주요 상위권 대학', needs: ['인성'],
      note: '한 번의 시험으로 겨루는 자리라, 외워서 쌓는 힘이 가장 크게 쓰입니다.' },
    { key: 'medical', label: '의 · 치 · 한 · 약 · 수 (메디컬)', needs: ['인성', '편관'],
      note: '오래 앉아 견디는 힘과 압박 속에서 흔들리지 않는 힘이 함께 필요합니다.' },
    { key: 'kaist', label: '과학기술원 (KAIST 등)', needs: ['편인', '인성'],
      note: '깊이 파고드는 힘이 성적으로 이어지는 자리입니다.' },
    { key: 'national', label: '거점 국립대', needs: ['인성'],
      note: '고르게 쌓아 온 것이 그대로 드러나는 자리입니다.' },
    { key: 'custom', label: '직접 입력', needs: [], note: '' },
  ],
}

export function categoryLabel(c?: string | null): string {
  return EXAM_CATEGORIES.find(x => x.key === c)?.label ?? ''
}

export function targetOf(c?: string | null, t?: string | null): TargetOption | null {
  if (!c || !t) return null
  const list = TARGETS[c as Exclude<ExamCategory, ''>]
  return list?.find(x => x.key === t) ?? null
}

/**
 * 프롬프트에 실을 한 덩이.
 *   ⚠️ «직접 입력» 이면 손님이 적은 글자를 그대로 씁니다.
 *      우리가 모르는 학교라 needs 를 짐작하지 않습니다. 지어내면 근거가 없어집니다.
 */
export function targetPromptBlock(
  category?: string | null, target?: string | null, custom?: string | null,
): string {
  if (!category) return ''
  const cat = categoryLabel(category)
  const opt = targetOf(category, target)
  const name = (target === 'custom' ? (custom || '').trim() : opt?.label) || ''
  if (!name) return `· 목표 구분: ${cat}`

  const lines = [`· 목표: ${cat} · ${name}`]
  if (opt && opt.key !== 'custom' && opt.needs.length) {
    lines.push(`· 그 자리에 쓰이는 힘: ${opt.needs.join(' · ')} — ${opt.note}`)
    lines.push('· ★이 목표에 쓰이는 힘이 이 아이에게 지금 어떤지 짚어 주세요.')
    lines.push('  «있으니 붙는다»가 아니라 «이 힘을 이렇게 쓰면 좋겠다»로 말하세요.')
  } else {
    lines.push('· 손님이 직접 적은 목표입니다. 우리가 모르는 곳이니 학교 정보를 지어내지 마세요.')
    lines.push('  그 이름을 한 번만 불러 주고, 사주에서 읽히는 결로만 이야기하세요.')
  }
  return lines.join('\n')
}

// ══════════════════════════════════════════════════════════════
// 학년 · 신분 — 같은 «학생» 이라도 결이 완전히 다르다
// ══════════════════════════════════════════════════════════════
//
// ★2026-07-29 대표님 지시 —
//   초등학생과 N수생은 둘 다 «학생» 이지만 묻는 것도, 감당하는 무게도 다릅니다.
//     초·중학생  아직 시간이 많다. 습관과 결을 잡는 이야기.
//     고1~2      내신이 쌓이는 때. 방향을 정하는 이야기.
//     고3·N수생  D-Day 가 눈앞. 실전과 멘탈 이야기.
//   한 덩이로 묶어 두면 열 살 아이에게 «수능 당일 멘탈» 을 말하게 됩니다.
//
// ⚠️ 이 표도 교재가 아닙니다. 오늘 학제의 이름입니다. (위 목표 표와 같은 결)

export type StudentGrade =
  | '' | 'elementary' | 'middle' | 'high12' | 'high3' | 'nsu' | 'other'

export const STUDENT_GRADES: Array<{ key: StudentGrade; label: string }> = [
  { key: '', label: '골라 주세요' },
  { key: 'elementary', label: '초등학생' },
  { key: 'middle', label: '중학생' },
  { key: 'high12', label: '고등학교 1~2학년' },
  { key: 'high3', label: '고등학교 3학년' },
  { key: 'nsu', label: 'N수생 · 재수생' },
  { key: 'other', label: '기타 (검정고시 등)' },
]

/** 학년별로 AI 에게 줄 결 — 프롬프트에 그대로 실린다 */
export const GRADE_PROMPT: Record<Exclude<StudentGrade, ''>, string> = {
  elementary: `초등학생입니다. 시험보다 «공부하는 결» 을 잡는 때입니다.
· 성적·등수 이야기를 앞세우지 마세요. 무엇을 재미있어하고 어디서 힘이 나는지를 봐 주세요.
· 부모가 읽습니다. 아이를 몰아세우는 말로 들리지 않게 하세요.
· 「수능」·「입시」 같은 먼 이야기로 겁주지 마세요.`,
  middle: `중학생입니다. 습관이 자리 잡고 고교 진학을 저울질하는 때입니다.
· 내신과 공부 습관, 그리고 어떤 고교가 결에 맞는지를 중심으로.
· 아직 시간이 있다는 것을 알려 주세요. 지금 바꾸면 바뀝니다.`,
  high12: `고등학교 1~2학년입니다. 내신이 한 줄씩 쌓이는 때입니다.
· 내신 관리와 학습 습관, 생활기록부를 어떻게 채워 갈지를 중심으로.
· 아직 방향을 고칠 수 있는 때입니다. 길게 보는 이야기가 힘이 됩니다.`,
  high3: `고등학교 3학년입니다. 수능이 눈앞이라 무게가 가장 무거운 때입니다.
· 수시 지원 전략(여섯 장을 어떻게 나눌지), 수능 당일 마음 관리,
  체력과 컨디션 조율에 초점을 맞추세요.
· ★«더 일찍 시작했으면» 같은 말을 절대 쓰지 마세요. 지금 할 수 있는 것만 말합니다.
· 남은 시간이 짧다고 겁주지 마세요. 짧아도 쓸 수 있는 결을 알려 주세요.`,
  nsu: `N수생·재수생입니다. 한 번 겪고 다시 서는 자리라 마음이 가장 무겁습니다.
· 지난 결과를 되짚지 마세요. «이번엔» 이라는 말도 부담이 됩니다.
· 실전 감각, 흔들리지 않는 마음, 체력 관리에 초점을 맞추세요.
· ★«작년에는» 으로 시작하는 문장을 쓰지 마세요.`,
  other: `정해진 학제 밖에서 준비하는 학생입니다(검정고시 등).
· 남들과 견주는 말을 쓰지 마세요. 「또래」·「같은 학년」 같은 말도 피하세요.
· 스스로 정한 길이니 그 결을 존중하며, 지금 자리에서 할 수 있는 것을 말해 주세요.`,
}

export function gradeLabel(g?: string | null): string {
  return STUDENT_GRADES.find(x => x.key === g)?.label ?? ''
}

/**
 * 나이와 고른 학년이 크게 어긋나는가.
 *   ⚠️ 막지 않습니다. 조기·만학·유예 등 사정은 저마다입니다.
 *      다만 프롬프트에 «나이와 학년이 다르니 학년을 따르라» 고 알려 줍니다.
 *      안 알려 주면 AI 가 나이를 보고 딴소리를 합니다.
 */
export function gradeMismatch(age: number | null, g?: string | null): boolean {
  if (age == null || !g) return false
  const R: Record<string, [number, number]> = {
    elementary: [6, 13], middle: [12, 16], high12: [15, 18],
    high3: [17, 20], nsu: [18, 30],
  }
  const r = R[g]
  return !!r && (age < r[0] || age > r[1])
}
