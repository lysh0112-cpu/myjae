'use client'

import React, { useState } from 'react'
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

interface Props {
  result: YongsinNewResult
}

const EL_TO_STEMS: Record<string, string> = { 목: '甲乙', 화: '丙丁', 토: '戊己', 금: '庚辛', 수: '壬癸' }
const EL_COLOR: Record<string, string> = { 목: '#2e7d32', 화: '#c62828', 토: '#f57f17', 금: '#616161', 수: '#ffffff' }
const EL_SUB: Record<string, string> = { 목: '#2e7d32', 화: '#c62828', 토: '#f57f17', 금: '#616161', 수: '#dddddd' }
const EL_BG: Record<string, string> = { 목: '#e8f5e9', 화: '#ffebee', 토: '#fff8e1', 금: '#f5f5f5', 수: '#2b2b2b' }
const EL_BD: Record<string, string> = { 목: '#a5d6a744', 화: '#c6282844', 토: '#f57f1744', 금: '#61616144', 수: '#2b2b2b' }
const EL_BD_STRONG: Record<string, string> = { 목: '#2e7d32', 화: '#c62828', 토: '#f57f17', 금: '#616161', 수: '#2b2b2b' }
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

export default function YongsinCard({ result }: Props) {
  const [open, setOpen] = useState<{ role: string; el: string } | null>(null)
  const [detail, setDetail] = useState(false)

  const openCard = (role: string, el: string | null) => { if (!el) return; setOpen({ role, el }); setDetail(false) }
  const close = () => { setOpen(null); setDetail(false) }
  const info = open ? OHAENG_INFO[open.el] : null

  const { johu, eokbu, gyeokguk } = result

  // 한 칸 렌더 (오행 or 없음)
  const cell = (el: Ohaeng | null, role: string, big: boolean, isYong: boolean) => {
    if (!el) {
      return (
        <div style={{ background: '#f5f5f5', border: '0.5px solid #eee', borderRadius: 10, padding: big ? '12px 4px' : '8px 3px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: big ? 15 : 13, color: '#bbb' }}>없음</div>
        </div>
      )
    }
    const isSu = el === '수'
    return (
      <div onClick={() => openCard(role, el)}
        style={{
          background: EL_BG[el], border: `${isYong ? 1.5 : 0.5}px solid ${isYong ? EL_BD_STRONG[el] : EL_BD[el]}`,
          borderRadius: 10, padding: big ? '12px 4px' : '8px 3px', textAlign: 'center', cursor: 'pointer',
        }}>
        <div style={{ fontSize: big ? 21 : 15, fontWeight: 700, color: isSu ? '#fff' : '#1a1a1a', lineHeight: 1 }}>{EL_TO_STEMS[el]}</div>
        <div style={{ fontSize: big ? 9.5 : 8.5, color: EL_SUB[el], fontWeight: 600, marginTop: 3 }}>{OHAENG_INFO[el]?.name}({EL_HAN[el]})</div>
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
        <div style={{ flex: 1 }}>{cell(johu.element, '용신', true, true)}</div>
      </div>

      {/* ② 억부용신 (5신) */}
      <div style={{ marginBottom: 8 }}>
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

      {/* ③ 격국용신 (용신 1개) */}
      <div style={{ display: 'flex', gap: 7, alignItems: 'stretch', marginBottom: 12 }}>
        {labelBox('격국용신', gyeokguk.name || '직업·명예')}
        <div style={{ flex: 1 }}>{cell(gyeokguk.element, '용신', true, true)}</div>
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
