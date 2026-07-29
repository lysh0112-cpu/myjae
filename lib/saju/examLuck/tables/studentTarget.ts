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
