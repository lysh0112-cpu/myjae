'use client'

import React, { useState } from 'react'
import { EL_BG, EL_C, EL_C_SUB, EL_TEXT as EL_BD_STRONG } from '@/lib/saju/ohaengColor'
import { OHAENG_INFO } from './ohaengInfo'
import type { YongsinNewResult, Ohaeng } from '@/lib/saju/yongsinNew'
import { checkAgree, isYanginIlju } from '@/lib/saju/yongsinNew'

/**
 * 용신 카드 (심산 3종 용신 · 명카페)
 *
 * 조후용신(건강·마음) · 억부용신(재물·현실, 5신) · 격국용신(직업·명예)
 * 각 오행 칸을 누르면 2단계 오행 설명 모달이 뜬다. (OHAENG_INFO 재사용)
 *
 *   <YongsinCard result={calcYongsinNew(saju, dayStem)} />
 */

/* 격국별 원리 이름 + 한 줄 설명 (소스 상신표 기반)
 * ★2026-07-28 — 「비견격」「겁재격」 두 줄을 지웠습니다.
 *   교재 178쪽 "비견겁, 겁재격은 없다. 비견격이라 하지 않고 건록격이라 하며,
 *               겁재가 있을 때는 겁재격이 아니라 양인격이라고 하는 것이다"
 *   ⚠️ 이 표는 yongsinNew.GYEOK_SANGSIN 의 사본입니다. 한쪽만 고치지 마십시오. (교훈 BQ)
 */
const GYEOK_PRINCIPLE: Record<string, { name: string; line: string }> = {
  건록격: { name: '건록용관', line: '관성이 있어야 능력을 제대로 펼쳐요' },
  양인격: { name: '양인용살', line: '관성이 강한 기운을 다스려 줘요' },
  식신격: { name: '식신생재', line: '내 재능이 재물로 이어져요' },
  상관격: { name: '상관패인', line: '인성이 넘치는 재주를 다잡아 줘요' },
  편재격: { name: '식상생재', line: '재능을 써서 재물을 키워요' },
  정재격: { name: '식상생재', line: '재능을 써서 재물을 키워요' },
  편관격: { name: '식신제살', line: '식상이 거친 기운을 눌러 줘요' },
  정관격: { name: '관인상생', line: '관이 인을 살려 나를 키워요' },
  편인격: { name: '관인상생', line: '관이 인을 살려 나를 키워요' },
  정인격: { name: '관인상생', line: '관이 인을 살려 나를 키워요' },
}
/* ★2026-08-04 (45부) — 격 설명 «사전» (교재 A책 159~182쪽 「8정격과 양인격, 건록격」)
 *
 *  [무엇인가]  격 이름을 누르면 나오는 모달의 글입니다.
 *
 *  ⚠️⚠️ 교재는 «상담자용 노트» 라 손님께 그대로 낼 수 없는 말이 많습니다.
 *     ⛔ 안 담은 것 — 「한량」 「카사노바」 「일부다처형」 「주색잡기」 「조폭」
 *        「밖에서는 좋은데 안에서는 폭군」 「이혼 가능성」 「화류계」
 *        「돈을 벌려면 건강을 잃어야 한다」 · 성별 단정 · 직업 목록
 *     ★44부 화개살(교훈 CA)과 «같은 판단» 입니다 — 어투를 다듬어 될 자리가 아닙니다.
 *     ⛔ 되살리지 마십시오. 되살리려면 대표님께 여쭈십시오.
 *
 *  ★교재가 «좋은 쪽» 을 스스로 일러 준 줄만 살렸습니다.
 *     예) 180쪽 「카리스마를 고집으로 부리지 말고 자존감·추진력·리더십으로 발휘하라」
 *
 *  ★말은 «쉬운 말 + 괄호에 명리 말» 입니다 (44부 34차 방식).
 *     28차에 명리 말을 «전부» 걷어냈더니 사주 화면인데 사주가 안 보였습니다.
 *
 *  ⚠️ 차례는 ★「타고난 결」이 «먼저», 「무엇이 있으면 좋나요」가 «뒤» 입니다.
 *     (2026-08-04 대표님 확정 — 손님이 궁금한 것이 먼저 옵니다)
 */
const GYEOK_DESC: Record<string, { gyeol: string; need: string }> = {
  식신격: {
    gyeol: '마음이 넉넉하고 남을 배려하며 양보할 줄 압니다. 낙천적이면서도 파고드는 힘이 있고, 표현이 좋아 사람이 따릅니다. 먹을 복과 건강 복이 있고, 어울리는 일이 많아 길을 고르는 데 크게 어려움이 없는 결입니다.',
    need: '재물의 기운(재성)이 함께 있으면 가장 좋습니다. 가진 재주가 그대로 결실로 이어지는 구조입니다.',
  },
  상관격: {
    gyeol: '기회를 알아채는 눈이 빠르고 머리가 총명합니다. 생각이 새롭고 상상력과 예술성이 있으며 말솜씨가 뛰어납니다. 기운이 고르게 잡히면 지금 시대에 크게 쓰일 결입니다. 자존심이 센 만큼 마음을 다스리는 시간이 도움이 됩니다.',
    need: '배우고 다스리는 기운(인성)이 함께 있어야 합니다. 넘치는 재주를 다잡아 주는 자리입니다.',
  },
  정재격: {
    gyeol: '셈이 밝고 성실하며 노력으로 쌓아 가는 결입니다. 명예와 신용을 무겁게 여기고 의리가 있습니다. 일을 크게 벌이기보다 자리를 잡고 다지는 쪽에서 힘이 납니다. 투기보다 안정된 방향이 이 결과 잘 맞습니다.',
    need: '나 자신의 힘이 튼튼해야 합니다. 내가 강하고 재물도 강한 구조일 때 가장 좋습니다.',
  },
  편재격: {
    gyeol: '사람을 끄는 힘이 있고 인기와 재치가 있습니다. 움직임이 넓어 여러 곳에서 기회를 잡습니다. 일에 프로 정신이 있고 쫀쫀하지 않아 융통성이 아주 좋습니다. 통이 큰 결이라 씀씀이에 내 잣대를 하나 두면 좋습니다.',
    need: '나 자신의 힘이 튼튼해야 합니다. 내가 강하면 큰 재물을 감당해 내는 구조입니다.',
  },
  정관격: {
    gyeol: '근면하고 성실하며 명예를 소중히 여깁니다. 예의가 바르고 신용을 지키며 원리 원칙이 뚜렷합니다. 꼼꼼하고 믿음직해 사람들이 기대는 자리에 서게 됩니다. 원칙이 뚜렷한 만큼 너그러움을 한 뼘 두면 더 넓어집니다.',
    need: '나도 강하고 관도 강해야 합니다. 부딪히고 흔들리는 기운은 이 결이 꺼립니다.',
  },
  편관격: {
    gyeol: '추진력과 통솔력이 있고 무리를 이끄는 힘이 있습니다. 결단이 빠르고 어려운 자리에서 앞에 서는 결입니다. 몸에서 뿜는 기운이 있어 사람들이 따릅니다. 힘이 센 만큼 서두르지 않는 것이 이 결의 열쇠입니다.',
    need: '나 자신의 힘이 튼튼해야 합니다. 베풀고 표현하는 기운(식신)이 있으면 가장 좋습니다.',
  },
  정인격: {
    gyeol: '지혜롭고 정직하며 남을 이해하는 마음이 깊습니다. 배움에 힘이 있고 눈썰미가 좋으며 머리가 총명합니다. 스스로 서는 힘이 있고 기회를 알아보는 눈이 밝습니다. 공부와 자격으로 쌓아 갈 때 가장 멀리 가는 결입니다.',
    need: '재물을 지나치게 좇지 않아야 합니다. 실력을 쌓으면 재물이 뒤따라오는 구조입니다.',
  },
  편인격: {
    gyeol: '상황에 맞추는 재주가 뛰어나 융통성의 달인이라 합니다. 눈치가 빠르고 호기심이 많아 연구하고 궁리하기를 즐깁니다. 남이 못 보는 것을 보는 감각이 있습니다. 생각이 많은 만큼 손에 쥔 것 하나로 파고들면 결실이 납니다.',
    need: '재물의 기운(재성)이 함께 있어야 합니다. 한쪽으로 쏠린 기운을 고르게 잡아 주는 자리입니다.',
  },
  양인격: {
    gyeol: '나를 위해서보다 여럿을 위해 움직이는 마음이 있습니다. 사람을 이끄는 힘이 세고 한번 마음먹으면 끝까지 밉니다. 힘이 센 결이라 고집으로 쓰지 않는 것이 관건입니다. 말을 아끼고 지갑을 열면 사람이 모이는 결입니다.',
    need: '책임지는 기운(관성)이 반드시 있어야 합니다. 없으면 강한 힘이 갈 곳을 잃습니다.',
  },
  건록격: {
    gyeol: '영향력을 지닌 사람으로 크게 될 가능성이 큽니다. 원리 원칙이 뚜렷하고 정직하며 성실해 누구에게나 인정받습니다. 가슴 깊이 책임을 품고 여럿을 위해 움직입니다. 재물을 좇기보다 공익 쪽으로 갈 때 더 크게 되는 결입니다.',
    need: '책임지는 기운(정관)이 있어야 합니다. 있으면 어디를 가도 능력을 인정받습니다.',
  },
}

/* 육친 이름 (조후·격국용신 표시용) */
const YUKCHIN_OF_EL = (dayEl: string, el: string): string => {
  const GEN: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
  const CON: Record<string, string> = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' }
  if (el === dayEl) return '비겁'
  if (GEN[dayEl] === el) return '식상'
  if (CON[dayEl] === el) return '재성'
  if (CON[el] === dayEl) return '관성'
  if (GEN[el] === dayEl) return '인성'
  return ''
}

interface Props {
  result: YongsinNewResult
  /** 사주 네 기둥 — 조후용신이 원국에 있는지 세기 위해 사용 */
  saju?: Array<{ pillar: string; stem: string; branch: string }>
}

/* 오행 → 그 오행에 해당하는 천간·지지 글자 */
const EL_STEMS: Record<string, string[]> = {
  목: ['甲', '乙'], 화: ['丙', '丁'], 토: ['戊', '己'], 금: ['庚', '辛'], 수: ['壬', '癸'],
}
const EL_BRANCHES: Record<string, string[]> = {
  목: ['寅', '卯'], 화: ['巳', '午'], 토: ['辰', '戌', '丑', '未'], 금: ['申', '酉'], 수: ['亥', '子'],
}

const EL_COLOR: Record<string, string> = { 목: '#2e7d32', 화: '#c62828', 토: '#f57f17', 금: '#616161', 수: '#ffffff' }
const EL_HAN: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }

// 5신 역할 → 모달 한 줄 문구
const ROLE_LINE: Record<string, (n: string) => string> = {
  용신: (n) => `나에게 가장 좋은 것은 ${n}의 기운이에요`,
  희신: (n) => `나를 도와주는 것은 ${n}의 기운이에요`,
  기신: (n) => `내가 조심해야 할 것은 ${n}의 기운이에요`,
  구신: (n) => `기운을 어지럽히는 것은 ${n}의 기운이에요`,
  한신: (n) => `크게 상관없는 것은 ${n}의 기운이에요`,
}
const ROLE_HANJA: Record<string, string> = { 용신: '用神', 희신: '喜神', 기신: '忌神', 구신: '仇神', 한신: '閑神' }
const ROLE_TAG: Record<string, string> = { 용신: '가장 좋은 기운', 희신: '도와주는 기운', 기신: '조심할 기운', 구신: '어지럽히는 기운', 한신: '중립 기운' }

export default function YongsinCard({ result, saju }: Props) {
  const [open, setOpen] = useState<{ role: string; el: string } | null>(null)
  const [detail, setDetail] = useState(false)

  const openCard = (role: string, el: string | null) => { if (!el) return; setOpen({ role, el }); setDetail(false) }
  // ★2026-08-04 (45부) — 격 이름 전용 모달. 오행 모달과 «따로» 둡니다.
  //   ⚠️ 오행 모달(open)은 하나도 안 건드렸습니다.
  const [openGyeok, setOpenGyeok] = useState<string | null>(null)
  const close = () => { setOpen(null); setDetail(false) }
  const info = open ? OHAENG_INFO[open.el] : null

  const { johu, eokbu, gyeokguk } = result

  // ── ★세 용신이 일치하는가 (교재 146·147·148쪽) ──
  //   계산은 yongsinNew.checkAgree 한 곳에서만 한다. 여기서 다시 재지 않는다.
  const agree = checkAgree(result)

  // ── ★양인일주 (교재 178쪽) — 격이 아니라 일주의 성질 ──
  const ilju = saju?.find(p => p.pillar === '일주')
  const yanginIlju = !!ilju && isYanginIlju(ilju.stem, ilju.branch)

  // ── 특정 오행이 원국(천간·지지)에 있는지 찾기 — 조후·격국 공용 ──
  const elFoundInSaju = (el: string | null): string[] => {
    if (!el || !saju?.length) return []
    const stems = EL_STEMS[el] ?? []
    const branches = EL_BRANCHES[el] ?? []
    const found: string[] = []
    for (const p of saju) {
      if (stems.includes(p.stem)) found.push(`${p.stem}${EL_HAN[el]}`)
      if (branches.includes(p.branch)) found.push(`${p.branch}${EL_HAN[el]}`)
    }
    return found
  }

  // ── 조후용신이 원국에 실제로 있는지 ──
  const johuFound: string[] = elFoundInSaju(johu.element)

  // 한 칸 렌더 (오행 or 없음)
  const cell = (el: Ohaeng | null, role: string, big: boolean, isYong: boolean) => {
    if (!el) {
      return (
        <div style={{ background: '#f5f5f5', border: '0.5px solid #eee', borderRadius: 10, padding: big ? '12px 4px' : '8px 3px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: big ? 15 : 13, color: '#6b5340' }}>없음</div>
        </div>
      )
    }
    // 배경이 진한 오행색이라 글씨는 EL_C(흰색, 금만 검정)
    // 조후·격국과 결을 맞춰 한자 아래 육친을 함께 보여준다 (일간 기준으로 매번 계산)
    const yukchin = YUKCHIN_OF_EL(result.dayElement, el)
    return (
      <div onClick={() => openCard(role, el)}
        style={{
          background: EL_BG[el],
          border: isYong ? '1.5px solid #c8783c' : `1px solid ${EL_BD_STRONG[el]}`,
          borderRadius: 10, padding: big ? '12px 4px' : '8px 3px', textAlign: 'center', cursor: 'pointer',
        }}>
        <div style={{ fontSize: big ? 21 : 18, fontWeight: 700, color: EL_C[el], lineHeight: 1 }}>{EL_HAN[el]}</div>
        <div style={{ fontSize: big ? 11 : 10, color: EL_C_SUB[el], fontWeight: 600, marginTop: 2 }}>{yukchin}</div>
      </div>
    )
  }

  // 조후용신 전용 칸 — 오행 이름 + 원국에 있는지 표시
  //   연재쌤 지시: 丙丁 같은 천간 나열은 의미 없음. "화(火) / 巳火 1개 있음" 형태로.
  const johuCell = () => {
    const el = johu.element
    if (!el) {
      return (
        <div style={{ background: '#f7f4f0', border: '0.5px solid #e5dcd2', borderRadius: 10, padding: '14px 6px', textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: '#7d6553', fontWeight: 600 }}>해당 없음</div>
          <div style={{ fontSize: 10.5, color: '#5c3a1e', marginTop: 3 }}>{johu.note}</div>
        </div>
      )
    }
    const has = johuFound.length > 0
    const yukchin = YUKCHIN_OF_EL(result.dayElement, el)
    // 배경이 진한 오행색이라 글씨는 EL_C(흰색, 금만 검정) / 보조글씨는 EL_C_SUB
    return (
      <div onClick={() => openCard('용신', el)}
        style={{
          background: EL_BG[el],
          border: `1.5px solid ${EL_BD_STRONG[el]}`,
          borderRadius: 10, padding: '12px 6px', textAlign: 'center', cursor: 'pointer',
        }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: EL_C[el], lineHeight: 1.2 }}>
          {EL_HAN[el]}({yukchin || OHAENG_INFO[el]?.name})
        </div>
        <div style={{ fontSize: 11, marginTop: 4, fontWeight: 600, color: EL_C_SUB[el] }}>
          {has
            ? `✓ 원국에 ${johuFound.join('·')} ${johuFound.length}개 있음`
            : '원국에 없음 · 운에서 와야 해요'}
        </div>
      </div>
    )
  }

  // 격국용신 전용 칸 — 오행(육친) + 원리 설명 + 원국 존재 여부
  //   연재쌤 지시: "金(인성)" 표기 + 관인상생 같은 원리를 함께 보여줄 것
  const gyeokCell = () => {
    const el = gyeokguk.element
    if (!el) {
      return (
        <div style={{ background: '#f7f4f0', border: '0.5px solid #e5dcd2', borderRadius: 10, padding: '14px 6px', textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: '#7d6553', fontWeight: 600 }}>없음</div>
        </div>
      )
    }
    const yukchin = YUKCHIN_OF_EL(result.dayElement, el)
    const pr = GYEOK_PRINCIPLE[gyeokguk.name]
    const found = elFoundInSaju(el)
    const has = found.length > 0
    // ★2026-08-04 (45부 · 대표님 지시) — 격 이름을 «왼쪽 라벨에서 이리로» 옮겼습니다.
    //   「양인격, 土(관성)」 처럼 앞에 붙습니다. 크기는 ★뒤와 «똑같이» (대표님 확정 ⓐ).
    //   ⚠️ 격이 없는 분은 예전처럼 「土(관성)」만 나옵니다.
    const hasDesc = !!GYEOK_DESC[gyeokguk.name]
    return (
      <div onClick={() => openCard('용신', el)}
        style={{
          background: EL_BG[el], border: `1.5px solid ${EL_BD_STRONG[el]}`,
          borderRadius: 10, padding: '12px 6px', textAlign: 'center', cursor: 'pointer',
        }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: EL_C[el], lineHeight: 1.2 }}>
          {gyeokguk.name && (
            <span
              onClick={(e) => { e.stopPropagation(); if (hasDesc) setOpenGyeok(gyeokguk.name) }}
              style={hasDesc
                ? { textDecoration: 'underline', textDecorationStyle: 'dotted' as const, textUnderlineOffset: 4, cursor: 'pointer' }
                : undefined}
            >{gyeokguk.name}</span>
          )}
          {gyeokguk.name ? ', ' : ''}{EL_HAN[el]}({yukchin})
        </div>
        {pr && (
          <div style={{ fontSize: 11, color: EL_C_SUB[el], marginTop: 5, fontWeight: 600 }}>
            {pr.name} — {pr.line}
          </div>
        )}
        <div style={{ fontSize: 10.5, marginTop: 3, fontWeight: 600, color: EL_C_SUB[el] }}>
          {has ? `✓ 원국에 ${found.join('·')} ${found.length}개 있음` : '원국에 없음 · 운에서 와야 해요'}
        </div>
      </div>
    )
  }

  // strongSub=true 면 아랫줄(부제)을 크고 진하게 — 격국 이름처럼 "설명"이 아니라
  // "정보"인 경우에 쓴다. (연재쌤: 무슨 격인지가 직업·사회활동 판단에 중요)
  const labelBox = (title: string, sub: string, strongSub = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff3e9', border: '0.5px solid #9c7a58', borderRadius: 9, minWidth: 52, padding: '6px 0' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#8f3d0e' }}>{title}</span>
      <span style={strongSub
        ? { fontSize: 12, fontWeight: 700, color: '#8f3d0e', marginTop: 3, whiteSpace: 'nowrap' as const }
        : { fontSize: 8, color: '#6b5340', marginTop: 2 }}>{sub}</span>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif" }}>
      <div style={{ fontSize: 10, color: '#8f3d0e', marginBottom: 12 }}>👆 아래 한자를 누르면 쉬운 설명이 나와요</div>

      {/* ① 조후용신 (용신 1개) */}
      <div style={{ display: 'flex', gap: 7, alignItems: 'stretch', marginBottom: 8 }}>
        {labelBox('조후용신', '건강·마음')}
        <div style={{ flex: 1 }}>{johuCell()}</div>
      </div>

      {/* ② 격국용신 (용신 1개)
          ★2026-08-04 (45부) — 격 이름(양인격)을 «오른쪽 칸으로» 옮겼습니다.
            왼쪽은 조후용신과 «같은 모양» 이 됩니다. (대표님 지시) */}
      <div style={{ display: 'flex', gap: 7, alignItems: 'stretch', marginBottom: 8 }}>
        {labelBox('격국용신', '직업·명예')}
        <div style={{ flex: 1 }}>{gyeokCell()}</div>
      </div>

      {/* ③ 억부용신 (5신) */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '34px repeat(5,1fr)', gap: 4, marginBottom: 5 }}>
          <div />
          {(['용신', '희신', '기신', '구신', '한신'] as const).map((h, i) => (
            <div key={h} style={{ textAlign: 'center', fontSize: 9, color: i === 0 ? '#96502e' : '#b4785a', fontWeight: i === 0 ? 700 : 600 }}>{h}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '34px repeat(5,1fr)', gap: 4, alignItems: 'stretch' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff3e9', border: '0.5px solid #9c7a58', borderRadius: 8 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#8f3d0e' }}>억부</span>
            <span style={{ fontSize: 7, color: '#6b5340' }}>재물</span>
          </div>
          {cell(eokbu.yongsin, '용신', false, true)}
          {cell(eokbu.heesin, '희신', false, false)}
          {cell(eokbu.gisin, '기신', false, false)}
          {cell(eokbu.gusin, '구신', false, false)}
          {cell(eokbu.hansin, '한신', false, false)}
        </div>
      </div>

      {/* ★세 용신 일치 — 교재 146·147·148쪽
          "격국, 억부, 조후까지 用神이 같으면 좋은데 (…) 用神이 다 같으면 유리하다"
          셋이 모두 같을 때만 강조 카드를 띄우고, 그 밖에는 한 줄로만 알려 준다. */}
      {agree.highlight ? (
        <div style={{
          background: 'linear-gradient(135deg,#fff8ec 0%,#fdf0e0 100%)',
          border: '1.5px solid #d9a55f', borderRadius: 12,
          padding: '14px 14px 13px', marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 15 }}>✨</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#8f3d0e' }}>{agree.title}</span>
            <span style={{
              marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#fff',
              background: '#c58a3d', padding: '2px 8px', borderRadius: 8,
            }}>
              {EL_HAN[eokbu.yongsin]} 하나로
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: '#6b5340', lineHeight: 1.8 }}>{agree.note}</div>
        </div>
      ) : (
        <div style={{
          background: '#fdf9f4', border: '0.5px solid #eee0d0', borderRadius: 8,
          padding: '9px 12px', marginBottom: 10, fontSize: 11, color: '#7a6350', lineHeight: 1.75,
        }}>
          <b style={{ color: '#96502e' }}>{agree.title}</b> — {agree.note}
        </div>
      )}

      {/* ★양인일주 — 격이 아니라 일주의 성질 (교재 178쪽) */}
      {yanginIlju && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: '#fbf2f2', border: '0.5px solid #e8cfcf', borderRadius: 8,
          padding: '9px 12px', marginBottom: 10,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#fff', background: '#b06060',
            padding: '2px 8px', borderRadius: 7, whiteSpace: 'nowrap',
          }}>양인일주</span>
          <span style={{ fontSize: 11, color: '#7a5a5a', lineHeight: 1.7 }}>
            일지에 겁재를 깔고 있어요. 격(格)은 아니고 타고난 기질이 세다는 뜻입니다.
          </span>
        </div>
      )}

      {/* 안내 문구 */}
      <div style={{ background: '#faf3ee', border: '0.5px solid #9c7a58', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#666', lineHeight: 1.75 }}>
        <b style={{ color: '#96502e' }}>조후</b>는 건강·마음, <b style={{ color: '#96502e' }}>억부</b>는 재물·현실, <b style={{ color: '#96502e' }}>격국</b>은 직업·명예를 도와주는 기운이에요.
      </div>

      {/* 모달 (오행 설명 · 기존 재사용) */}
      {open && info && (
        <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 320, width: '100%', background: '#fff', borderRadius: 16, padding: '20px 18px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 19, fontWeight: 700, color: '#1a1a1a' }}>
                {open.role} <span style={{ fontSize: 12, color: '#6b5340', fontWeight: 400 }}>({ROLE_HANJA[open.role]})</span>
              </span>
              <span style={{ fontSize: 10, color: '#8f3d0e', background: '#fdf6ee', padding: '2px 8px', borderRadius: 8 }}>{ROLE_TAG[open.role]}</span>
              <button onClick={close} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 16, color: '#ccc', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: '#f6f6f3', borderRadius: 10, padding: 14, marginBottom: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 30, marginBottom: 6 }}>{info.emoji}</div>
              <div style={{ fontSize: 14, color: '#333', lineHeight: 1.7, fontWeight: 600 }}>
                {(ROLE_LINE[open.role] ?? ROLE_LINE['용신'])(info.name)}
              </div>
            </div>

            {!detail && (
              <div onClick={() => setDetail(true)} style={{ background: '#fff3e9', border: '0.5px solid #9c7a58', color: '#8f3d0e', textAlign: 'center', padding: 11, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {info.name}({info.hanja})의 기운이 뭐예요? →
              </div>
            )}

            {detail && (
              <div style={{ fontSize: 12.5, color: '#555', lineHeight: 1.95 }}>
                <div style={{ background: '#faf3ee', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                  <b style={{ color: '#96502e' }}>{info.name}({info.hanja})는</b> {info.nature}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr', rowGap: 7, columnGap: 6, alignItems: 'start' }}>
                  <span>🎨</span><span><b>색깔</b> {info.color}</span>
                  <span>🧭</span><span><b>방향</b> {info.direction}</span>
                  <span>🍽️</span><span><b>음식</b> {info.taste}</span>
                  <span>💼</span><span><b>어울리는 일</b> {info.job}</span>
                  <span>🏃</span><span><b>취미·활동</b> {info.hobby}</span>
                  <span>📍</span><span><b>좋은 장소</b> {info.place}</span>
                  <span>💍</span><span><b>소품</b> {info.item}</span>
                  <span>💪</span><span><b>건강</b> {info.health} 챙기기</span>
                  <span>🤝</span><span><b>잘 맞는 사람</b> {info.goodWith} 기운의 사람</span>
                </div>
              </div>
            )}

            <div onClick={close} style={{ marginTop: 16, background: '#1a1a1a', color: '#fff', textAlign: 'center', padding: 11, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              확인
            </div>
          </div>
        </div>
      )}
      {/* ★2026-08-04 (45부) — 격 전용 모달 (교재 A책 159~182쪽)
          ⚠️ 위 오행 모달과 «따로» 입니다. 합치지 마십시오 — 담는 것이 다릅니다.
          ★알약은 «칸 이름표» 입니다 (대표님 확정 ⓐ). 글을 상자로 감싸지 않습니다.
          ★차례 — 「타고난 결」이 먼저, 「무엇이 있으면 좋나요」가 뒤. */}
      {openGyeok && GYEOK_DESC[openGyeok] && (
        <div onClick={() => setOpenGyeok(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 320, width: '100%', background: '#fff', borderRadius: 16, padding: '20px 18px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 19, fontWeight: 700, color: '#1a1a1a' }}>{openGyeok}</span>
              <button onClick={() => setOpenGyeok(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 16, color: '#ccc', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'inline-block', background: '#fff3e9', border: '0.5px solid #9c7a58', color: '#8f3d0e', fontSize: 11, padding: '3px 11px', borderRadius: 20, marginBottom: 7 }}>
              타고난 결
            </div>
            <div style={{ fontSize: 12.5, color: '#555', lineHeight: 1.9, marginBottom: 15 }}>
              {GYEOK_DESC[openGyeok].gyeol}
            </div>

            <div style={{ display: 'inline-block', background: '#f2f6f2', border: '0.5px solid #d8e4d8', color: '#3b6d11', fontSize: 11, padding: '3px 11px', borderRadius: 20, marginBottom: 7 }}>
              무엇이 있으면 좋나요
            </div>
            <div style={{ fontSize: 12.5, color: '#555', lineHeight: 1.9 }}>
              {GYEOK_DESC[openGyeok].need}
            </div>

            <div onClick={() => setOpenGyeok(null)} style={{ marginTop: 16, background: '#1a1a1a', color: '#fff', textAlign: 'center', padding: 11, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              확인
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
