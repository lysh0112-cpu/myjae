'use client'

import React, { useState } from 'react'
import { EL_BG, EL_C, EL_C_SUB, EL_TEXT as EL_BD_STRONG } from '@/lib/saju/ohaengColor'
import { OHAENG_INFO } from './ohaengInfo'
import type { YongsinNewResult, Ohaeng } from '@/lib/saju/yongsinNew'

/**
 * 용신 카드 (심산 3종 용신 · 명카페)
 *
 * 조후용신(건강·마음) · 억부용신(재물·현실, 5신) · 격국용신(직업·명예)
 * 각 오행 칸을 누르면 2단계 오행 설명 모달이 뜬다. (OHAENG_INFO 재사용)
 *
 *   <YongsinCard result={calcYongsinNew(saju, dayStem)} />
 */

/* 격국별 원리 이름 + 한 줄 설명 (소스 상신표 기반) */
const GYEOK_PRINCIPLE: Record<string, { name: string; line: string }> = {
  비견격: { name: '건록용관', line: '관성이 있어야 능력을 제대로 펼쳐요' },
  건록격: { name: '건록용관', line: '관성이 있어야 능력을 제대로 펼쳐요' },
  겁재격: { name: '양인용살', line: '관성이 강한 기운을 다스려 줘요' },
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

const EL_TO_STEMS: Record<string, string> = { 목: '甲乙', 화: '丙丁', 토: '戊己', 금: '庚辛', 수: '壬癸' }
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
  const close = () => { setOpen(null); setDetail(false) }
  const info = open ? OHAENG_INFO[open.el] : null

  const { johu, eokbu, gyeokguk } = result

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
          <div style={{ fontSize: big ? 15 : 13, color: '#bbb' }}>없음</div>
        </div>
      )
    }
    // 배경이 진한 오행색이라 글씨는 EL_C(흰색, 금만 검정)
    return (
      <div onClick={() => openCard(role, el)}
        style={{
          background: EL_BG[el],
          border: isYong ? '1.5px solid #c8783c' : `1px solid ${EL_BD_STRONG[el]}`,
          borderRadius: 10, padding: big ? '12px 4px' : '8px 3px', textAlign: 'center', cursor: 'pointer',
        }}>
        <div style={{ fontSize: big ? 21 : 15, fontWeight: 700, color: EL_C[el], lineHeight: 1 }}>{EL_TO_STEMS[el]}</div>
        <div style={{ fontSize: big ? 10.5 : 9.5, color: EL_C_SUB[el], fontWeight: 600, marginTop: 3 }}>{EL_HAN[el]}</div>
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
          <div style={{ fontSize: 15, color: '#8a7360', fontWeight: 600 }}>해당 없음</div>
          <div style={{ fontSize: 10.5, color: '#b4785a', marginTop: 3 }}>{johu.note}</div>
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
          <div style={{ fontSize: 15, color: '#8a7360', fontWeight: 600 }}>없음</div>
        </div>
      )
    }
    const yukchin = YUKCHIN_OF_EL(result.dayElement, el)
    const pr = GYEOK_PRINCIPLE[gyeokguk.name]
    const found = elFoundInSaju(el)
    const has = found.length > 0
    return (
      <div onClick={() => openCard('용신', el)}
        style={{
          background: EL_BG[el], border: `1.5px solid ${EL_BD_STRONG[el]}`,
          borderRadius: 10, padding: '12px 6px', textAlign: 'center', cursor: 'pointer',
        }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: EL_C[el], lineHeight: 1.2 }}>
          {EL_HAN[el]}({yukchin})
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

  const labelBox = (title: string, sub: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff3e9', border: '0.5px solid #e8d5c5', borderRadius: 9, minWidth: 52, padding: '6px 0' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#c8783c' }}>{title}</span>
      <span style={{ fontSize: 8, color: '#c5a590', marginTop: 2 }}>{sub}</span>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif" }}>
      <div style={{ fontSize: 10, color: '#c8a86a', marginBottom: 12 }}>👆 아래 한자를 누르면 쉬운 설명이 나와요</div>

      {/* ① 조후용신 (용신 1개) */}
      <div style={{ display: 'flex', gap: 7, alignItems: 'stretch', marginBottom: 8 }}>
        {labelBox('조후용신', '건강·마음')}
        <div style={{ flex: 1 }}>{johuCell()}</div>
      </div>

      {/* ② 격국용신 (용신 1개) */}
      <div style={{ display: 'flex', gap: 7, alignItems: 'stretch', marginBottom: 8 }}>
        {labelBox('격국용신', gyeokguk.name || '직업·명예')}
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff3e9', border: '0.5px solid #e8d5c5', borderRadius: 8 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#c8783c' }}>억부</span>
            <span style={{ fontSize: 7, color: '#c5a590' }}>재물</span>
          </div>
          {cell(eokbu.yongsin, '용신', false, true)}
          {cell(eokbu.heesin, '희신', false, false)}
          {cell(eokbu.gisin, '기신', false, false)}
          {cell(eokbu.gusin, '구신', false, false)}
          {cell(eokbu.hansin, '한신', false, false)}
        </div>
      </div>

      {/* 안내 문구 */}
      <div style={{ background: '#faf3ee', border: '0.5px solid #f0e0d5', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#666', lineHeight: 1.75 }}>
        <b style={{ color: '#96502e' }}>조후</b>는 건강·마음, <b style={{ color: '#96502e' }}>억부</b>는 재물·현실, <b style={{ color: '#96502e' }}>격국</b>은 직업·명예를 도와주는 기운이에요.
      </div>

      {/* 모달 (오행 설명 · 기존 재사용) */}
      {open && info && (
        <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 320, width: '100%', background: '#fff', borderRadius: 16, padding: '20px 18px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 19, fontWeight: 700, color: '#1a1a1a' }}>
                {open.role} <span style={{ fontSize: 12, color: '#bbb', fontWeight: 400 }}>({ROLE_HANJA[open.role]})</span>
              </span>
              <span style={{ fontSize: 10, color: '#c8a86a', background: '#fdf6ee', padding: '2px 8px', borderRadius: 8 }}>{ROLE_TAG[open.role]}</span>
              <button onClick={close} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 16, color: '#ccc', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: '#f6f6f3', borderRadius: 10, padding: 14, marginBottom: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 30, marginBottom: 6 }}>{info.emoji}</div>
              <div style={{ fontSize: 14, color: '#333', lineHeight: 1.7, fontWeight: 600 }}>
                {(ROLE_LINE[open.role] ?? ROLE_LINE['용신'])(info.name)}
              </div>
            </div>

            {!detail && (
              <div onClick={() => setDetail(true)} style={{ background: '#fff3e9', border: '0.5px solid #e8d5c5', color: '#c8783c', textAlign: 'center', padding: 11, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
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
    </div>
  )
}
