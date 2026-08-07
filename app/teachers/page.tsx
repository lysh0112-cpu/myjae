'use client'
// app/teachers/page.tsx
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-07 (48부 8차) — 🧑‍🏫 선생님 소개  [대표님 지시]
//    「상담=> "선생님 소개"로 하고, 소속 전체 상담사 프로필 보여줌」
//    「선생님 프로필은 ★단순 프로필 소개만 하려고 해」
//    「내가 1,2,3,4… 노출시킨 리스트가 ★그대로 나오면 됨.
//      ★비노출로 놓으면 안 나와도 됨」
//    「전문분야는 ★안 걸어도 됨」
//
//  ★조건 — 상담사 고르기 화면과 «같습니다»
//     active = true   ★비활성은 안 나옵니다 (관리자 「비활」 버튼)
//     order sort      ★관리자가 매긴 순번 그대로
//  ⛔ ★전문분야(specialties)로 «거르지» 마십시오 [대표님 지시].
//     여기는 서비스를 안 타고 들어오는 자리라 ★활성인 분 «전부» 가 나옵니다.
//
//  ⛔⛔ ★예약·상담 버튼을 넣지 마십시오 —
//     「★단순 프로필 소개만」 이라 하셨습니다.
//     상담 신청은 각 서비스 결과 화면의 ConsultButton 을 타야
//     ★priceKey 가 실려 전문분야 거르기가 걸립니다.
//     여기서 바로 보내면 그 배관이 끊깁니다.
//
//  ⚠️⚠️ ★이름은 «별칭(호)» 입니다 — shownName() 을 씁니다.
//     ⛔ c.name 을 직접 쓰지 마십시오. ★본명이 샙니다.
//     ⚠️ 조회에 ★alias 를 «반드시» 넣으십시오. 빠뜨리면
//        ★화면은 멀쩡히 뜨고 본명만 «조용히» 나갑니다. 검사도 못 잡습니다.
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { shownName } from '@/lib/consultantName'
import HomeBottomNav from '@/app/components/HomeBottomNav'

type Teacher = {
  id: string
  name: string
  alias?: string | null
  specialty?: string | null
  photo_url?: string | null
  career?: string | null
  intro?: string | null
  rating?: number | null
  review_count?: number | null
  region?: string | null
}

export default function TeachersPage() {
  const [list, setList] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('consultants')
        // ⚠️ ★alias 를 빠뜨리면 본명이 나갑니다.
        .select('id, name, alias, specialty, photo_url, career, intro, rating, review_count, region')
        .eq('active', true)
        .order('sort')
        .order('created_at')
      setList((data ?? []) as Teacher[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{
      minHeight: '100vh', background: '#FDF6F0',
      maxWidth: 430, margin: '0 auto', paddingBottom: 76,
    }}>
      <div style={{
        padding: '18px 16px 12px', background: '#FFFBF7',
        borderBottom: '0.5px solid #e8d9c9',
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#3a2e28' }}>선생님 소개</div>
        <div style={{ fontSize: 12, color: '#8a7461', marginTop: 4 }}>
          명카페와 함께하는 선생님들이세요
        </div>
      </div>

      <div style={{ padding: 14 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: '#8a7461' }}>
            불러오는 중…
          </div>
        ) : list.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: '#8a7461', lineHeight: 1.8 }}>
            소개해 드릴 선생님을 준비하고 있어요.
          </div>
        ) : (
          list.map((t) => (
            <div key={t.id} style={{
              background: '#fff', border: '1px solid #ea8c46', borderRadius: 12,
              padding: 14, marginBottom: 12,
            }}>
              {/* ★2026-08-07 (48부 16차) — ★경력을 «이름 옆» 으로 [대표님 지시]
                  「선생님 옆 공간이 많은데 ★효율적으로 사용할 방법」
                  [전]  사진 | 이름·전문분야·지역   →  경력(따로 한 줄)
                  [후]  ★사진 | 이름·전문분야·지역·★경력
                  ⇒ ★빈 자리가 사라지고 세로도 짧아집니다.
                  ⚠️ ★전문분야와 지역을 «한 줄» 로 합쳤습니다 — 둘 다 짧습니다.
                  ⛔ 경력을 다시 «아래» 로 내리지 마십시오.
                  □ 경력이 ★다섯 줄 넘게 긴 분이 오면 카드가 다시 길어집니다.
                     그때는 ★세 줄까지만 보이고 「더 보기」를 붙이십시오. */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 58, height: 58, borderRadius: '50%', overflow: 'hidden',
                  background: '#f2eee9', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {t.photo_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={t.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 20, color: '#96502e' }}>{shownName(t)[0] || '?'}</span>}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#3a2e28' }}>
                      {shownName(t)}
                    </span>
                    <span style={{ fontSize: 12, color: '#96502e' }}>선생님</span>
                    {(t.rating ?? 0) > 0 && (
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: '#d9a55f' }}>
                        ★ {t.rating}
                        {(t.review_count ?? 0) > 0 && (
                          <span style={{ color: '#a08d7d' }}> ({t.review_count})</span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* ★전문분야 · 지역을 «한 줄» 로 */}
                  {(t.specialty || t.region) && (
                    <div style={{ fontSize: 12, color: '#6b5340', marginTop: 3 }}>
                      {t.specialty}
                      {t.specialty && t.region && <span style={{ color: '#a08d7d' }}> · </span>}
                      {t.region && <span style={{ color: '#a08d7d' }}>{t.region}</span>}
                    </div>
                  )}

                  {/* ★경력 — 여기가 «비어 있던» 자리입니다 */}
                  {t.career && (
                    <div style={{
                      marginTop: 7, fontSize: 12, color: '#4a3f38',
                      lineHeight: 1.7, whiteSpace: 'pre-line',
                    }}>
                      {t.career}
                    </div>
                  )}
                </div>
              </div>

              {t.intro && (
                <div style={{
                  marginTop: 9, padding: '9px 11px', background: '#faf3ec', borderRadius: 9,
                  fontSize: 12.5, color: '#4a3f38', lineHeight: 1.85, whiteSpace: 'pre-line',
                }}>
                  {t.intro}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <HomeBottomNav />
    </div>
  )
}
