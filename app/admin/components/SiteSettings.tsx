'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Setting = { key: string; value: string }

const SETTINGS = [
  { key: 'body_bg', label: '전체 배경색', type: 'color' },
  { key: 'card_bg', label: '카드 배경색', type: 'color' },
  { key: 'accent_color', label: '강조색 (골드)', type: 'color' },
  { key: 'primary_color', label: '주요색 (보라)', type: 'color' },
  { key: 'hero_bg', label: '히어로 배경 (그라디언트)', type: 'text' },
]

export default function SiteSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { fetchSettings() }, [])

  async function fetchSettings() {
    const { data } = await supabase.from('site_settings').select('*')
    if (data) {
      const map: Record<string, string> = {}
      data.forEach((s: Setting) => { map[s.key] = s.value })
      setSettings(map)
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    // 오류를 받아 확인한다. 안 그러면 막혀도 "저장완료!"가 떠서 원인을 알 수 없다.
    let failed = ''
    for (const [key, value] of Object.entries(settings)) {
      const { error } = await supabase.from('site_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() })
      if (error) { failed = error.message; break }
    }
    setSaving(false)
    if (failed) { alert('저장하지 못했어요: ' + failed); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleReset() {
    if (!confirm('기본값으로 초기화하시겠습니까?')) return
    const defaults = {
      body_bg: '#1a1a18',
      card_bg: '#2C2C2A',
      accent_color: '#FAC775',
      primary_color: '#3C3489',
      hero_bg: 'linear-gradient(160deg, #1a1a18 0%, #2C2C2A 40%, #3C3489 100%)',
    }
    setSettings(defaults)
  }

  if (loading) return <div className="text-center py-10" style={{ color: '#FAC775' }}>불러오는 중...</div>

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4"
        style={{ background: '#2C2C2A', border: '1px solid rgba(250,199,117,0.2)' }}>
        <div className="text-sm font-bold mb-1" style={{ color: '#FAC775' }}>⚙️ 사이트 테마 설정</div>
        <div className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
          저장 후 홈화면에 즉시 반영됩니다
        </div>
        <div className="space-y-4">
          {SETTINGS.map(({ key, label, type }) => (
            <div key={key}>
              <label className="text-xs font-medium mb-2 block" style={{ color: '#b0aec8' }}>{label}</label>
              {type === 'color' ? (
                <div className="flex items-center gap-3">
                  <input type="color" value={settings[key] || '#000000'}
                    onChange={e => setSettings({ ...settings, [key]: e.target.value })}
                    className="w-12 h-10 rounded-lg cursor-pointer border-0 outline-none"
                    style={{ background: 'transparent' }} />
                  <input type="text" value={settings[key] || ''}
                    onChange={e => setSettings({ ...settings, [key]: e.target.value })}
                    className="flex-1 rounded-xl px-3 py-2 text-sm outline-none font-mono"
                    style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <div className="w-10 h-10 rounded-lg border border-white/10"
                    style={{ background: settings[key] }} />
                </div>
              ) : (
                <input type="text" value={settings[key] || ''}
                  onChange={e => setSettings({ ...settings, [key]: e.target.value })}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none font-mono"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl overflow-hidden"
          style={{ height: '60px', background: settings['hero_bg'] || '#1a1a18' }}>
          <div className="flex items-center justify-center h-full text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            히어로 배경 미리보기
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{ background: saved ? 'rgba(76,175,80,0.3)' : '#FAC775', color: '#1a1a18' }}>
            {saving ? '저장중...' : saved ? '✅ 저장완료!' : '저장하기'}
          </button>
          <button onClick={handleReset}
            className="px-4 py-3 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
            초기화
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-4"
        style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-sm font-bold mb-3" style={{ color: '#FAC775' }}>🎨 현재 테마 미리보기</div>
        <div className="grid grid-cols-4 gap-2">
          {['body_bg', 'card_bg', 'accent_color', 'primary_color'].map(key => (
            <div key={key} className="text-center">
              <div className="w-full h-10 rounded-lg border border-white/10 mb-1"
                style={{ background: settings[key] }} />
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px' }}>
                {SETTINGS.find(s => s.key === key)?.label.split(' ')[0]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
