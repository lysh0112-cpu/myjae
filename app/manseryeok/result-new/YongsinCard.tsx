'use client'

import React, { useState } from 'react'
import { OHAENG_INFO } from './ohaengInfo'

/**
 * 용신·희신·기신 카드 + 2단계 설명 모달 (명카페)
 *
 * 카드: 용신/희신/기신 3개. 각 칸에 그 사람 오행의 천간(丙丁 등) + 오행 이름.
 * 1단계 모달: "오행 중 나에게 가장 좋은 것은 O의 기운이에요" (한 줄)
 * 2단계 모달: 그 오행의 뜻·성질 + 실생활(색·방향·음식·직업·취미·장소·소품·건강·궁합)
 *
 *   <YongsinCard yongsin="금" heeksin="수" gisin="화" description="..." />
 */

interface Props {
  yongsin: string   // 오행: 목/화/토/금/수
  heeksin: string
  gisin: string
  description?: string  // 계산기가 준 설명 (하단 참고용)
}

const EL_TO_STEMS: Record<string, string> = { 목: '甲乙', 화: '丙丁', 토: '戊己', 금: '庚辛', 수: '壬癸' }
const EL_COLOR: Record<string, string> = { 목: '#2e7d32', 화: '#c62828', 토: '#f57f17', 금: '#616161', 수: '#ffffff' }
const EL_BG: Record<string, string> = { 목: '#e8f5e9', 화: '#ffebee', 토: '#fff8e1', 금: '#f5f5f5', 수: '#2b2b2b' }
const EL_BD: Record<string, string> = { 목: '#a5d6a744', 화: '#c6282844', 토: '#f57f1744', 금: '#61616144', 수: '#2b2b2b' }
const EL_HAN: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }

// 역할별 한 줄 문구
const ROLE_LINE: Record<string, (elName: string) => string> = {
  용신: (n) => `오행 중 나에게 가장 좋은 것은 ${n}의 기운이에요`,
  희신: (n) => `오행 중 나를 가장 많이 도와주는 것은 ${n}의 기운이에요`,
  기신: (n) => `오행 중 내가 가장 피해야 할 것은 ${n}의 기운이에요`,
}
const ROLE_HANJA: Record<string, string> = { 용신: '用神', 희신: '喜神', 기신: '忌神' }
const ROLE_TAG: Record<string, string> = { 용신: '나에게 좋은 기운', 희신: '나를 돕는 기운', 기신: '피해야 할 기운' }

export default function YongsinCard({ yongsin, heeksin, gisin, description }: Props) {
  // 어떤 카드를 눌렀는지 (역할·오행)
  const [open, setOpen] = useState<{ role: string; el: string } | null>(null)
  // 2단계(상세) 열림 여부
  const [detail, setDetail] = useState(false)

  const cards = [
    { role: '용신', el: yongsin },
    { role: '희신', el: heeksin },
    { role: '기신', el: gisin },
  ]

  const openCard = (role: string, el: string) => { setOpen({ role, el }); setDetail(false) }
  const close = () => { setOpen(null); setDetail(false) }

  const info = open ? OHAENG_INFO[open.el] : null

  return (
    <div style={{ fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif" }}>
      <div style={{ fontSize: 10, color: '#c8a86a', marginBottom: 10 }}>👆 아래 한자를 누르면 쉬운 설명이 나와요</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {cards.map(({ role, el }) => {
          const info2 = OHAENG_INFO[el]
          const isSu = el === '수'
          return (
            <div key={role} onClick={() => openCard(role, el)}
              style={{
                flex: 1, background: EL_BG[el] || '#f5f5f5',
                border: `0.5px solid ${EL_BD[el] || '#ddd'}`, borderRadius: 12,
                padding: '12px 4px', textAlign: 'center', cursor: 'pointer',
              }}>
              <div style={{ fontSize: 10, color: isSu ? '#fff' : (EL_COLOR[el] || '#616161'), fontWeight: 700, marginBottom: 6 }}>{role}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: isSu ? '#fff' : '#1a1a1a', lineHeight: 1, marginBottom: 3 }}>{EL_TO_STEMS[el] || '-'}</div>
              <div style={{ fontSize: 10, color: isSu ? '#ddd' : (EL_COLOR[el] || '#616161'), fontWeight: 600 }}>{info2 ? `${info2.name}(${EL_HAN[el]})` : el}</div>
            </div>
          )
        })}
      </div>

      {description && (
        <div style={{ background: '#faf3ee', border: '0.5px solid #f0e0d5', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#666', lineHeight: 1.8 }}>
          {description}
        </div>
      )}

      {/* 모달 */}
      {open && info && (
        <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 320, width: '100%', background: '#fff', borderRadius: 16, padding: '20px 18px', maxHeight: '80vh', overflowY: 'auto' }}>
            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 19, fontWeight: 700, color: '#1a1a1a' }}>
                {open.role} <span style={{ fontSize: 12, color: '#bbb', fontWeight: 400 }}>({ROLE_HANJA[open.role]})</span>
              </span>
              <span style={{ fontSize: 10, color: '#c8a86a', background: '#fdf6ee', padding: '2px 8px', borderRadius: 8 }}>{ROLE_TAG[open.role]}</span>
              <button onClick={close} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 16, color: '#ccc', cursor: 'pointer' }}>✕</button>
            </div>

            {/* 1단계: 한 줄 */}
            <div style={{ background: '#f6f6f3', borderRadius: 10, padding: 14, marginBottom: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 30, marginBottom: 6 }}>{info.emoji}</div>
              <div style={{ fontSize: 14, color: '#333', lineHeight: 1.7, fontWeight: 600 }}>
                {ROLE_LINE[open.role](info.name)}
              </div>
            </div>

            {/* 2단계 열기 버튼 */}
            {!detail && (
              <div onClick={() => setDetail(true)} style={{ background: '#fff3e9', border: '0.5px solid #e8d5c5', color: '#c8783c', textAlign: 'center', padding: 11, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {info.name}({info.hanja})의 기운이 뭐예요? →
              </div>
            )}

            {/* 2단계: 상세 (뜻 + 실생활) */}
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
