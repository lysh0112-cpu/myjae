'use client'

import { useRouter } from 'next/navigation'

// ── 오행 색상 ──
const STEM_ELEMENT: Record<string, string> = { 甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수' }
const BRANCH_ELEMENT: Record<string, string> = { 子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수' }
const ELEMENT_COLOR: Record<string, string> = { 목:'#4caf50',화:'#f44336',토:'#ff9800',금:'#9e9e9e',수:'#2196f3' }
const READ: Record<string, string> = {
  甲:'갑',乙:'을',丙:'병',丁:'정',戊:'무',己:'기',庚:'경',辛:'신',壬:'임',癸:'계',
  子:'자',丑:'축',寅:'인',卯:'묘',辰:'진',巳:'사',午:'오',未:'미',申:'신',酉:'유',戌:'술',亥:'해',
}
function elemColor(ch: string) {
  const el = STEM_ELEMENT[ch] || BRANCH_ELEMENT[ch]
  return ELEMENT_COLOR[el] || '#555'
}

// ── 랜딩용 예시 사주 (보여주기 전용) ──
const COLS = ['생시', '생일', '생월', '생년']
const TOP_STEMS = ['癸', '壬', '己', '乙']
const TOP_REL = ['아들', '자신', '부친', '조부']
const TOP_SIPSIN = ['겁재', '비견', '정관', '상관']
const BOT_BRANCH = ['卯', '辰', '丑', '巳']
const BOT_REL = ['딸', '배우자', '모친', '조모']
const BOT_SIPSIN = ['상관', '편관', '정관', '편재']

export default function LandingPage() {
  const router = useRouter()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF8',
      maxWidth: '430px',
      margin: '0 auto',
      fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
      color: '#1a1a1a',
    }}>

      {/* 네비게이션 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px',
        background: '#FAFAF8',
        borderBottom: '0.5px solid #f0ede6',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.3px' }}>
          명카페
        </div>
        <button
          onClick={() => router.push('/login')}
          onPointerDown={(e) => { e.currentTarget.style.transform = 'scale(0.94)' }}
          onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          style={{
            padding: '7px 18px',
            border: '1px solid #1a1a1a',
            borderRadius: '20px',
            background: 'transparent',
            color: '#1a1a1a',
            fontSize: '12px', fontWeight: 500,
            cursor: 'pointer',
            transition: 'transform 0.1s ease',
          }}
        >로그인</button>
      </div>

      <main>

        {/* ① 히어로 */}
        <div style={{ padding: '36px 20px 28px', background: '#FAFAF8', textAlign: 'center' }}>
          <div style={{
            fontSize: '10px', letterSpacing: '2.5px', color: '#8B6914',
            marginBottom: '16px', fontWeight: 500,
          }}>
            사주명리 전문 플랫폼
          </div>
          <h1 style={{
            fontSize: '28px', fontWeight: 300, lineHeight: 1.4,
            color: '#1a1a1a', letterSpacing: '-0.5px', margin: '0 0 8px',
          }}>
            모두를 위한 사주,<br />
            <strong style={{ fontWeight: 700 }}>명카페가 밝혀드립니다</strong>
          </h1>
          <p style={{
            fontSize: '13px', color: '#999', lineHeight: 1.8,
            margin: '0 0 28px',
          }}>
            3대 고전(적천수·자평진전·궁통보감)을 바탕으로<br />
            AI와 전문가가 함께 분석하는 깊이 있는 명리
          </p>

          {/* ── 사주 원국 미리보기 표 ── */}
          <div style={{
            background: '#dcd9d3',
            borderRadius: '16px',
            padding: '12px',
            marginBottom: '14px',
          }}>
            {/* 상단 바 */}
            <div style={{
              background: '#595550', borderRadius: '8px',
              padding: '10px 14px', marginBottom: '10px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>✦ 사주 원국</span>
              <span style={{ color: '#fff', fontSize: '13px' }}>∧</span>
            </div>

            {/* 흰 표 */}
            <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', padding: '4px 0' }}>
              {/* 헤더 줄 */}
              <div style={{ display: 'grid', gridTemplateColumns: '38px repeat(4, 1fr)' }}>
                <div />
                {COLS.map(c => (
                  <div key={c} style={{ textAlign: 'center', fontSize: '11px', color: '#999', padding: '6px 0' }}>{c}</div>
                ))}
              </div>

              {/* 천간 (큰 글자 + 관계) */}
              <div style={{ display: 'grid', gridTemplateColumns: '38px repeat(4, 1fr)', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#aaa' }}>천간</div>
                {TOP_STEMS.map((ch, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '6px 0', borderLeft: '1px solid #eee' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: elemColor(ch), lineHeight: 1.1 }}>
                      {READ[ch]}{ch}
                    </div>
                    <div style={{ fontSize: '9px', color: '#bbb', marginTop: '2px' }}>{TOP_REL[i]}</div>
                  </div>
                ))}
              </div>

              {/* 십성 줄 */}
              <div style={{ display: 'grid', gridTemplateColumns: '38px repeat(4, 1fr)', borderTop: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#aaa' }}>십성</div>
                {TOP_SIPSIN.map((s, i) => (
                  <div key={i} style={{ textAlign: 'center', fontSize: '11px', color: '#666', padding: '5px 0', borderLeft: '1px solid #eee' }}>{s}</div>
                ))}
              </div>

              {/* 지지 (큰 글자 + 관계) */}
              <div style={{ display: 'grid', gridTemplateColumns: '38px repeat(4, 1fr)', borderTop: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#aaa' }}>지지</div>
                {BOT_BRANCH.map((ch, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '6px 0', borderLeft: '1px solid #eee' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: elemColor(ch), lineHeight: 1.1 }}>
                      {READ[ch]}{ch}
                    </div>
                    <div style={{ fontSize: '9px', color: '#bbb', marginTop: '2px' }}>{BOT_REL[i]}</div>
                  </div>
                ))}
              </div>

              {/* 십성 줄 */}
              <div style={{ display: 'grid', gridTemplateColumns: '38px repeat(4, 1fr)', borderTop: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#aaa' }}>십성</div>
                {BOT_SIPSIN.map((s, i) => (
                  <div key={i} style={{ textAlign: 'center', fontSize: '11px', color: '#666', padding: '5px 0', borderLeft: '1px solid #eee' }}>{s}</div>
                ))}
              </div>
            </div>
          </div>

          {/* 안내 문구 */}
          <div style={{ fontSize: '11px', color: '#9b7dcc', fontWeight: 600, marginBottom: '24px' }}>
            ▲ 가입하면 나의 실제 사주를 볼 수 있어요
          </div>

          {/* CTA 버튼 */}
          <button
            onClick={() => router.push('/login')}
            onPointerDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)' }}
            onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            style={{
              width: '100%', height: '54px',
              background: '#1a1a1a', border: 'none', borderRadius: '16px',
              color: '#fff', fontSize: '16px', fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.3px', marginBottom: '12px',
              transition: 'transform 0.1s ease',
            }}
          >
            ✦ 시작하기
          </button>
          <button
            onClick={() => router.push('/login')}
            style={{
              width: '100%', height: '46px',
              background: '#f5f5f3', border: '0.5px solid #e0ddd6',
              borderRadius: '16px', color: '#666',
              fontSize: '14px', cursor: 'pointer',
            }}
          >
            저장된 사주 불러오기
          </button>
        </div>

        {/* 구분선 */}
        <div style={{ height: '8px', background: '#f0ede6' }} />

        {/* ② WHY 명연재 (밝은 흰색 카드 섹션) */}
        <div style={{ background: '#FAFAF8', padding: '32px 16px' }}>
          <div style={{
            display: 'inline-block',
            background: '#8B6914', color: '#fff',
            fontSize: '10px', fontWeight: 700,
            padding: '3px 10px', borderRadius: '10px',
            marginBottom: '16px', letterSpacing: '1px',
          }}>WHY 명카페</div>
          <h2 style={{
            fontSize: '22px', fontWeight: 300, lineHeight: 1.5,
            color: '#1a1a1a', margin: '0 0 8px', letterSpacing: '-0.3px',
          }}>
            비싼 상담, 꼭 필요할까요?<br />
            <strong style={{ fontWeight: 700, color: '#8B6914' }}>명카페가 더 깊게 알려드립니다</strong>
          </h2>
          <p style={{ fontSize: '12px', color: '#999', lineHeight: 1.8, margin: '0 0 24px' }}>
            20만원짜리 대면 상담보다 정확하고 세밀하게.<br />
            3대 고전을 바탕으로 AI가 분석하고,<br />
            필요할 때만 전문가와 연결됩니다.
          </p>

          {[
            { title: '정통 명리 3대 고전 기반', desc: '적천수·자평진전·궁통보감을 학습한 AI가 분석합니다' },
            { title: '사주·궁합·이름·택일 통합', desc: '한 플랫폼에서 명리의 모든 것을 해결하세요' },
            { title: '검증된 전문가 직접 상담', desc: 'AI 분석 후 더 깊은 해석이 필요할 때만 연결' },
            { title: '내 사주 영구 저장', desc: '매번 입력 없이, 로그인하면 바로 내 분석 확인' },
          ].map((item) => (
            <div key={item.title} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              background: '#fff',
              border: '0.5px solid #e8e5de',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '10px',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: '#fffbee',
                border: '0.5px solid #e8d5a0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '15px', color: '#8B6914', flexShrink: 0,
              }}>✦</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a', marginBottom: '3px' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '11px', color: '#999', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={() => router.push('/login')}
              onPointerDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)' }}
              onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
              onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
              style={{
                flex: 1, height: '50px',
                background: '#1a1a1a', border: 'none', borderRadius: '12px',
                color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                transition: 'transform 0.1s ease',
              }}
            >지금 무료로 시작</button>
            <button
              style={{
                flex: 1, height: '50px',
                background: '#fff',
                border: '0.5px solid #e0ddd6',
                borderRadius: '12px',
                color: '#666', fontSize: '13px', cursor: 'pointer',
              }}
            >서비스 더 알아보기</button>
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ height: '8px', background: '#f0ede6' }} />

        {/* ④ 푸터 */}
        <div style={{ background: '#f8f8f6', padding: '24px 20px 40px', borderTop: '0.5px solid #e8e5de' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' as const }}>
            {['회사소개', '이용약관', '개인정보처리방침'].map((t, i) => (
              <span key={t} style={{
                fontSize: '11px',
                color: i === 2 ? '#1a1a1a' : '#999',
                fontWeight: i === 2 ? 700 : 400,
                cursor: 'pointer',
              }}>{t}</span>
            ))}
          </div>
          <div style={{ height: '1px', background: '#e8e5de', marginBottom: '16px' }} />
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            {['IG', 'YT', 'X'].map((s) => (
              <div key={s} style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: '#e8e5de', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', color: '#888', cursor: 'pointer',
              }}>{s}</div>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: '#bbb', lineHeight: 1.9 }}>
            (주)명연재 &nbsp;|&nbsp; 대표 오연희<br />
            사업자등록번호 000-00-0000<br />
            서울시 강북구 솔매로45길 95, 201호
          </div>
          <div style={{ marginTop: '12px', fontSize: '11px', color: '#888', lineHeight: 1.9 }}>
            <strong style={{ color: '#555' }}>고객센터</strong><br />
            lysh6728@naver.com<br />
            070-0000-0000
          </div>
          <button style={{
            marginTop: '12px', padding: '7px 18px',
            border: '0.5px solid #ddd', borderRadius: '16px',
            background: '#fff', color: '#666',
            fontSize: '11px', cursor: 'pointer',
          }}>문의하기</button>
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '0.5px solid #eee', fontSize: '10px', color: '#ccc' }}>
            © 2026 (주)명연재. All rights reserved.
          </div>
        </div>

      </main>
    </div>
  )
}
