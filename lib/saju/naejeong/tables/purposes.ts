/**
 *  일진내정법 — ★상담 목적 고르기 (콤보상자)  · 2026-09-15 (9부)
 *  [대표님] 「/naejeong 연재쌤 전용 화면에 [상담 목적 고르기] 로 배치」
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │  🔴 [무엇을 하는가]                                               │
 *  │    질문을 고르면 —                                                │
 *  │      ㉮ 그 질문의 ★«자리(궁위)» 가 «맨 위» 로 올라오고             │
 *  │      ㉯ 테두리로 ★도드라집니다                                    │
 *  │    ⇒ 상담 중에 ★볼 곳을 «한눈에» 찾으시라는 것입니다.              │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 *  ⚠️ ★자리 짝(질문 → 궁위)은 «제가 교재를 읽고 고른 것» 입니다.
 *     ⇒ by: '초안' 으로 표시해 두었습니다. 연재쌤이 다르게 잡으실 수 있습니다.
 *     ⇒ 고치실 때는 ★이 파일만 고치십시오.
 *
 *  ⛔⛔ ★넣지 «않은» 것 — 대표님 확정 (2026-09-15)
 *     아래는 교재에 있지만 ★프로그램이 답하면 «안 되는» 것들입니다.
 *     ⇒ 필요하시면 연재쌤이 ★교재를 직접 보십니다.
 *
 *       · 도주자·은닉처 찾기          교재 21쪽  ★특정인을 지목합니다
 *       · 삼겹살 태워 연기 쐬기(동토)  교재 22쪽  ★주술 처방입니다
 *       · 소주·소금 뿌리기            교재 19쪽  〃
 *       · 위자료 6억 · 최소 8억       교재 41·18쪽 ★금액을 단정합니다
 *       · 성씨 오행으로 사람 고르기    교재 15·21쪽 ★특정인을 가리킵니다
 *       · 부부 폭력 단정              교재 38쪽  ★사람을 단정합니다
 *
 *     ⛔ 이 여섯을 «되살리지» 마십시오 — 검사 56 ⑪ 이 지킵니다.
 */

import type { Jari } from '../sinGung'

/** 이 질문을 무엇으로 보는가 */
export type PurposeKind =
  /** ★12신궁 — 사주 네 자리로 봅니다 (이 프로그램의 본령) */
  | 'singung'
  /** ★신살 — «띠(연지)» 기준입니다. ⚠️ 12신궁과 «기준이 다릅니다». 섞지 마십시오. */
  | 'sinsal'

export interface Purpose {
  id: string
  label: string
  kind: PurposeKind
  /** 도드라지게 할 자리 — 맨 앞이 ★으뜸입니다 (singung 일 때만) */
  jari?: Jari[]
  /** 교재 쪽 — 연재쌤이 찾아보실 근거 */
  page: string
  /**
   * ⚠️ 12신궁만으로는 «답이 안 나오는» 대목 — 화면이 이 메모를 그대로 보여 줍니다.
   * ⛔ 메모가 있는 질문은 ★프로그램이 답을 «단정하지» 않습니다.
   */
  note?: string
}

export interface PurposeGroup {
  group: string
  items: Purpose[]
}

export const PURPOSES: PurposeGroup[] = [
  {
    group: '재정 · 부동산 · 사업',
    items: [
      { id: 'land', label: '땅·부동산을 사고파는 일', kind: 'singung', jari: ['연지'], page: '교재 4~7쪽' },
      { id: 'house', label: '집을 사고파는 일 · 전월세', kind: 'singung', jari: ['월지'], page: '교재 4~7·42~43쪽',
        note: '언제 팔릴지는 삼합월로 봅니다 — 교재 43쪽' },
      { id: 'bizStart', label: '가게·사업을 새로 시작할지', kind: 'singung', jari: ['시지'], page: '교재 4~7·11~12쪽' },
      { id: 'bizGrow', label: '가게·사업을 넓힐지', kind: 'singung', jari: ['시지'], page: '교재 19쪽' },
      { id: 'bizEnd', label: '가게·사업을 접거나 업종을 바꿀지', kind: 'singung', jari: ['시지'], page: '교재 16·22~23쪽' },
      { id: 'partner', label: '동업을 할지 · 상대가 맞는지', kind: 'singung', jari: ['시지', '월지'], page: '교재 13~15쪽' },
      { id: 'sellNow', label: '물건을 지금 팔지 · 기다릴지', kind: 'singung', jari: ['월지', '시지'], page: '교재 18쪽' },
      { id: 'money', label: '돈이 들어올지 (금전 이익)', kind: 'singung', jari: ['시지', '일지'], page: '교재 7쪽' },
    ],
  },
  {
    group: '애정 · 결혼 · 부부',
    items: [
      { id: 'marry', label: '결혼을 할 수 있을지 · 언제', kind: 'singung', jari: ['일지'], page: '교재 30~32·34~35쪽',
        note: '결혼식 달은 문점일 일진의 삼합월로 봅니다 — 교재 35쪽' },
      { id: 'dating', label: '사귀는 사람과 잘될지', kind: 'singung', jari: ['일지'], page: '교재 29~31쪽' },
      { id: 'callBack', label: '헤어진 사람에게 연락이 올지', kind: 'singung', jari: ['일지'], page: '교재 29~30쪽',
        note: '언제 오는지는 문점일에서 가장 가까운 그 날로 봅니다 — 교재 29~30쪽' },
      { id: 'divorce', label: '부부 사이 불화 · 이혼을 할지', kind: 'singung', jari: ['일지', '월지'], page: '교재 5·41쪽' },
      { id: 'affair', label: '배우자·연인의 외도', kind: 'singung', jari: ['일지'], page: '교재 39~40쪽' },
      { id: 'remarry', label: '재혼을 할지', kind: 'singung', jari: ['일지'], page: '교재 28·37쪽' },
    ],
  },
  {
    group: '자녀 · 임신 · 학업',
    items: [
      { id: 'pregnant', label: '아이를 가질 수 있을지', kind: 'singung', jari: ['시지'], page: '교재 24~25·35~36쪽' },
      { id: 'birth', label: '무사히 출산할지', kind: 'singung', jari: ['시지', '일지'], page: '교재 25·37쪽' },
      { id: 'child', label: '자식과의 인연 · 속을 썩이는지', kind: 'singung', jari: ['시지'], page: '교재 26~27쪽' },
      { id: 'exam', label: '대학·시험에 붙을지', kind: 'singung', jari: ['월지'], page: '교재 47~54쪽' },
      { id: 'study', label: '유학을 보낼지', kind: 'singung', jari: ['월지', '시지'], page: '교재 26쪽' },
    ],
  },
  {
    group: '직장 · 시험 · 송사',
    items: [
      { id: 'job', label: '취업이 될지', kind: 'singung', jari: ['월지'], page: '교재 47~49쪽',
        note: '언제 구해질지는 문점일 일진의 삼합월로 봅니다 — 교재 49쪽' },
      { id: 'promote', label: '승진·재임용이 될지', kind: 'singung', jari: ['월지'], page: '교재 47~48쪽' },
      { id: 'quit', label: '직장을 그만둘지 · 옮길지', kind: 'singung', jari: ['월지'], page: '교재 50~51쪽' },
      { id: 'lawsuit', label: '재판에서 이길지', kind: 'singung', jari: ['일지', '시지'], page: '교재 20~21쪽' },
    ],
  },
  {
    group: '집 · 이사',
    items: [
      { id: 'move', label: '이사를 할지 · 언제', kind: 'singung', jari: ['월지'], page: '교재 44~45쪽',
        note: '이사 달은 문점일 일진의 삼합월로 봅니다 — 교재 45쪽' },
    ],
  },
  {
    /*  🔴 ★신살로 보는 것 — 2026-09-15 [대표님 「㉮로 먼저」]
     *  ⚠️⚠️ 기준이 ★«다릅니다» —
     *     12신궁 : ★문점일 일진 기준
     *     신살   : ★손님의 «띠(연지)» 기준
     *     ⛔ 섞지 마십시오. 화면이 «따로» 보여 줍니다.
     *  ⚠️ 여기 셋은 ★사주가 필요 없습니다 — 띠 하나면 됩니다. */
    group: '방향 · 자리 (띠로 봅니다)',
    items: [
      { id: 'moveDir', label: '이사 방향은 어디가 좋은가', kind: 'sinsal', page: '교재 45쪽' },
      { id: 'bizDir', label: '사업장·가게 방향', kind: 'sinsal', page: '교재 16~17쪽' },
      { id: 'homePlace', label: '집 안에 무엇을 어디에 둘까', kind: 'sinsal', page: '교재 45쪽' },
    ],
  },
]

/* ══════════════════════════════════════════════════════════════════
 *  ★신살 방향 — 교재 16~17쪽 · 45쪽
 *  ⛔ 교재에 «없는» 방향을 지어내지 않았습니다.
 * ══════════════════════════════════════════════════════════════════ */
export const SINSAL_DIR: Record<string, { head: string; body: string }[]> = {
  moveDir: [
    { head: '1순위 반안살 방향', body: '꾸준히 흥합니다.' },
    { head: '2순위 망신살 방향', body: '횡재수가 있고 집값이 오릅니다.' },
    { head: '3순위 역마살 방향', body: '일이 잘 풀립니다.' },
    { head: '4순위 화개살 방향', body: '싸게 집을 구할 수 있습니다.' },
  ],
  bizDir: [
    { head: '사업 장소', body: '지금 사는 집을 기준으로 반안살 방향이 좋습니다.' },
    { head: '출입문', body: '지살 → 반안살 → 망신살 → 역마살 차례로 좋습니다. 장성살 방향이면 좋지 않습니다.' },
    { head: '간판·홍보물', body: '지살 방향에 걸어야 길합니다.' },
    { head: '사장 자리', body: '연지 기준 천살 방향을 등지고 앉아 앞을 봅니다. 경리·금고는 반안살 방향에 둡니다.' },
  ],
  homePlace: [
    { head: '금고·귀중품', body: '집 안 중심점을 기준으로 반안살 방향에 둡니다.' },
    { head: '화장대·진열장·어항', body: '연살 방향입니다.' },
    { head: 'TV·전화기·컴퓨터', body: '역마살 방향입니다.' },
    { head: '화장실·창고', body: '육해살 방향입니다.' },
    { head: '출입문', body: '장성살 방향에는 내지 마십시오.' },
    { head: '보안 시설물', body: '월살 방향입니다.' },
  ],
}

/** 열둘을 한 줄로 찾기 쉽게 */
export function findPurpose(id: string): Purpose | null {
  for (const g of PURPOSES) {
    const hit = g.items.find(i => i.id === id)
    if (hit) return hit
  }
  return null
}
