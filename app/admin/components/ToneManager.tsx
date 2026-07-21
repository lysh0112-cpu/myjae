'use client'

import { useState, useEffect } from 'react'

export default function ToneManager() {
  const [rules, setRules] = useState('')
  const [terms, setTerms] = useState('')
  const [mulsang, setMulsang] = useState('')
  const [tarot, setTarot] = useState('')
  const [naming, setNaming] = useState('')
  const [fortune, setFortune] = useState('')
  const [defaultRules, setDefaultRules] = useState('')
  const [defaultTerms, setDefaultTerms] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // 미리보기 (공통 톤 확인용)
  const [sajuInfo, setSajuInfo] = useState('')
  const [preview, setPreview] = useState('')
  const [previewing, setPreviewing] = useState(false)

  const load = async () => {
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/admin/tone')
      const d = await res.json()
      if (!res.ok) { setMsg('불러오기 실패: ' + (d.error || '알 수 없음')) }
      else {
        setRules(d.tone_rules || '')
        setTerms(d.easy_terms || '')
        setMulsang(d.mulsang_guide || '')
        setTarot(d.tarot_guide || '')
        setNaming(d.naming_guide || '')
        setFortune(d.fortune_guide || '')
        setDefaultRules(d.default_rules || '')
        setDefaultTerms(d.default_terms || '')
      }
    } catch (e: unknown) {
      const _m = e instanceof Error ? e.message : ''
      setMsg('불러오는 중 오류: ' + (_m || '알 수 없음'))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    setMsg('')
    try {
      const res = await fetch('/api/admin/tone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone_rules: rules,
          easy_terms: terms,
          mulsang_guide: mulsang,
          tarot_guide: tarot,
          naming_guide: naming,
          fortune_guide: fortune,
        }),
      })
      const d = await res.json()
      if (!res.ok) { setMsg('저장 실패: ' + (d.error || '알 수 없음')) }
      else { setMsg('✓ 저장했어요. 이제 모든 AI 해설에 이 말투가 적용됩니다. (고객 화면은 새로고침 후 반영)') }
    } catch (e: unknown) {
      const _m = e instanceof Error ? e.message : ''
      setMsg('저장 중 오류: ' + (_m || '알 수 없음'))
    }
    setSaving(false)
  }

  const resetToDefault = () => {
    if (!confirm('공통 말투(①②)를 처음 기본값으로 되돌릴까요? 전용 지시문(물상도·타로·작명·운세)은 그대로 둡니다. (저장을 눌러야 실제 적용)')) return
    setRules(defaultRules)
    setTerms(defaultTerms)
    setMsg('공통 말투 기본값을 불러왔어요. 확인 후 [저장하기]를 눌러야 실제로 적용됩니다.')
  }

  const runPreview = async () => {
    setPreviewing(true)
    setPreview('')
    setMsg('')
    try {
      const res = await fetch('/api/admin/tone-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone_rules: rules, easy_terms: terms, saju_info: sajuInfo }),
      })
      const d = await res.json()
      if (!res.ok) { setMsg('미리보기 실패: ' + (d.error || '알 수 없음')) }
      else { setPreview(d.preview || '') }
    } catch (e: unknown) {
      const _m = e instanceof Error ? e.message : ''
      setMsg('미리보기 중 오류: ' + (_m || '알 수 없음'))
    }
    setPreviewing(false)
  }

  const gold = '#FAC775'
  const cardBg = '#2C2C2A'
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: gold, marginBottom: 4 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }
  const textarea: React.CSSProperties = {
    width: '100%', minHeight: 200, background: '#1a1a18', color: '#fff', borderRadius: 10,
    padding: '12px 14px', border: '1px solid rgba(255,255,255,0.15)', fontSize: 14, lineHeight: 1.7,
    boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit',
  }
  const sectionTitle: React.CSSProperties = {
    fontSize: 14, fontWeight: 700, color: '#fff', margin: '26px 0 12px',
    paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)',
  }

  if (loading) {
    return <div style={{ padding: 20, color: 'rgba(255,255,255,0.5)' }}>불러오는 중...</div>
  }

  return (
    <div style={{ padding: '8px 4px', maxWidth: 820 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>💬 어투 관리</h3>

      {/* 안내 */}
      <div style={{ background: 'rgba(250,199,117,0.1)', border: '1px solid rgba(250,199,117,0.25)', borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>
        ℹ️ <b style={{ color: gold }}>공통 말투(①②)</b>는 모든 AI 해설에 적용됩니다.<br />
        <b style={{ color: gold }}>화면별 전용 지시문</b>은 그 화면에만 추가로 적용됩니다. (예: 물상도·타로·작명·운세)<br />
        고친 뒤 맨 아래 <b>[저장하기]</b>를 누르면 한 번에 반영돼요.
      </div>

      {msg && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(250,199,117,0.1)', border: '1px solid rgba(250,199,117,0.25)', color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
          {msg}
        </div>
      )}

      {/* ===== A. 공통 ===== */}
      <div style={{ ...sectionTitle, marginTop: 8 }}>A. 공통 말투 (모든 해설에 적용)</div>

      <div style={{ marginBottom: 20 }}>
        <div style={label}>① 말투 규칙</div>
        <div style={hint}>AI가 어떤 태도·마음가짐으로 쓸지 정합니다. (예: 겁주지 말기, 따뜻하게, 쉬운 말 우선)</div>
        <textarea value={rules} onChange={e => setRules(e.target.value)} style={textarea} placeholder="말투 규칙을 자유롭게 적어주세요" />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={label}>② 쉬운 말 사전</div>
        <div style={hint}>어려운 명리 용어를 고객이 이해하기 쉬운 말로 어떻게 바꿀지 정합니다. (예: 용신 → 나에게 꼭 필요한 기운)</div>
        <textarea value={terms} onChange={e => setTerms(e.target.value)} style={textarea} placeholder="어려운 용어 → 쉬운 표현" />
      </div>

      {/* ===== B. 화면별 전용 ===== */}
      <div style={sectionTitle}>B. 화면별 전용 지시문</div>

      <div style={{ marginBottom: 20 }}>
        <div style={label}>🖼️ 물상도(그림) 전용</div>
        <div style={hint}>물상도(사주 그림) 해설에만 추가로 적용됩니다. 그림을 함께 보며 설명하는 톤, 소장 가치 등.</div>
        <textarea value={mulsang} onChange={e => setMulsang(e.target.value)} style={textarea} placeholder="물상도 해설 전용 지침" />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={label}>🔮 타로(카드) 전용</div>
        <div style={hint}>타로 카드 해석에만 추가로 적용됩니다. 질문에 답하는 톤, 무서운 카드도 따뜻하게 풀기 등.</div>
        <textarea value={tarot} onChange={e => setTarot(e.target.value)} style={textarea} placeholder="타로 해석 전용 지침" />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={label}>✏️ 작명·이름풀이 전용</div>
        <div style={hint}>이름풀이·개명 해설에만 추가로 적용됩니다. 이름은 민감하니 좋은 점 먼저, 한자 뜻 살리기 등.</div>
        <textarea value={naming} onChange={e => setNaming(e.target.value)} style={textarea} placeholder="작명·개명 해설 전용 지침" />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={label}>🌅 오늘의 운세 전용</div>
        <div style={hint}>마이페이지 오늘의 운세에만 추가로 적용됩니다. 매일 아침 짧고 힘나게, 명리 한 조각 등.</div>
        <textarea value={fortune} onChange={e => setFortune(e.target.value)} style={textarea} placeholder="오늘의 운세 해설 전용 지침" />
      </div>

      {/* 저장 / 되돌리기 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 30, flexWrap: 'wrap' }}>
        <button onClick={save} disabled={saving}
          style={{ padding: '11px 22px', borderRadius: 10, border: 'none', background: gold, color: '#1a1a18', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
          {saving ? '저장 중...' : '💾 저장하기'}
        </button>
        <button onClick={resetToDefault}
          style={{ padding: '11px 22px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: 14, cursor: 'pointer' }}>
          ↩ 공통 말투 기본값으로 되돌리기
        </button>
      </div>

      {/* 미리보기 (공통 톤 확인용) */}
      <div style={{ background: cardBg, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: gold, marginBottom: 4 }}>👁 미리보기 (공통 말투 확인)</div>
        <div style={{ ...hint, marginBottom: 12 }}>
          위 공통 말투(①②)로 해설이 어떻게 나오는지 확인합니다. 사주를 자유롭게 적어보세요.<br />
          (말투 확인용입니다. 각 화면 실제 해설은 그 화면에서 확인하세요.)
        </div>
        <input
          value={sajuInfo}
          onChange={e => setSajuInfo(e.target.value)}
          placeholder="예: 음력 1966년 1월 12일 새벽에 태어난 남성 (비워두면 기본 예시로 나옵니다)"
          style={{ width: '100%', background: '#1a1a18', color: '#fff', borderRadius: 10, padding: '11px 14px', border: '1px solid rgba(255,255,255,0.15)', fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }}
        />
        <button onClick={runPreview} disabled={previewing}
          style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid ' + gold, background: 'rgba(250,199,117,0.15)', color: gold, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: previewing ? 0.5 : 1 }}>
          {previewing ? '생성 중...' : '이 사주로 미리보기 생성'}
        </button>

        {preview && (
          <div style={{ marginTop: 16, background: '#1a1a18', border: '1px solid rgba(250,199,117,0.2)', borderRadius: 10, padding: '16px 18px', fontSize: 14, color: '#e8e4ff', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
            {preview}
          </div>
        )}
      </div>
    </div>
  )
}
