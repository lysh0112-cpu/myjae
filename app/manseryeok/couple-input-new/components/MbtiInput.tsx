'use client'
// MBTI 고르기 — 남녀 공용.
// ★2026-07-21: 직접 입력(text) → 고르기(select)로 바꿨다.
//   [왜] 손으로 치면 오타·소문자·엉뚱한 값이 들어와 통변 재료가 지저분해진다.
//        16개뿐이라 고르는 편이 빠르고 정확하다.
//   함께 정리한 것:
//     · 다크톤(#0d0d1a) → 피치톤 (고객 화면인데 이 부품만 검었다)
//     · 부품 안의 'MBTI (선택)' 라벨 제거 — 부모가 이미 같은 라벨을 그린다(중복 표시)

// 16가지 — 분석가 / 외교관 / 관리자 / 탐험가 (16personalities 분류)
const MBTI_GROUPS: { label: string; items: [string, string][] }[] = [
  { label: '분석가', items: [['INTJ','전략가'],['INTP','논리술사'],['ENTJ','통솔자'],['ENTP','변론가']] },
  { label: '외교관', items: [['INFJ','옹호자'],['INFP','중재자'],['ENFJ','선도자'],['ENFP','활동가']] },
  { label: '관리자', items: [['ISTJ','현실주의자'],['ISFJ','수호자'],['ESTJ','경영자'],['ESFJ','집정관']] },
  { label: '탐험가', items: [['ISTP','장인'],['ISFP','모험가'],['ESTP','사업가'],['ESFP','연예인']] },
]

export default function MbtiInput({ value, onChange }: {
  value: string
  onChange: (mbti: string) => void
}) {
  // 예전에 손으로 친 값이 소문자·공백일 수 있다. 대문자로 맞춰 목록과 대조한다.
  //   (목록에 없는 값이면 빈 칸으로 보이고, 고객이 다시 고르면 정상 값으로 저장된다)
  const norm = (value || '').trim().toUpperCase()
  const known = MBTI_GROUPS.some(g => g.items.some(([c]) => c === norm))
  const current = known ? norm : ''

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select
        value={current}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1,
          background: '#fff',
          border: '0.5px solid #e4d4be',
          borderRadius: 10,
          padding: '11px 12px',
          color: current ? '#3a2e28' : '#b4785a',
          fontSize: 14,
          fontFamily: 'inherit',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        <option value="">모르거나 안 넣어도 괜찮아요</option>
        {MBTI_GROUPS.map(g => (
          <optgroup key={g.label} label={g.label}>
            {g.items.map(([code, ko]) => (
              <option key={code} value={code}>{code} · {ko}</option>
            ))}
          </optgroup>
        ))}
      </select>

      <button
        type="button"
        onClick={() => window.open('https://www.16personalities.com/ko', '_blank')}
        style={{
          padding: '9px 12px',
          borderRadius: 10,
          background: 'transparent',
          border: '0.5px solid #d8c4b4',
          color: '#96502e',
          fontSize: 11,
          fontFamily: 'inherit',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          lineHeight: 1.4,
        }}>
        모르면<br />진단 →
      </button>
    </div>
  )
}
