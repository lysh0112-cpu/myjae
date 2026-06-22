'use client'
import { useRef, useState } from 'react'

export const CATEGORIES = ['saju', 'mulsang', 'taro', 'naming', 'etc']
export const CAT_LABEL: Record<string, string> = {
  saju: '사주명리', mulsang: '물상학', taro: '타로', naming: '성명학', etc: '기타'
}

export type DocForm = {
  id: string
  title: string
  content: string
  category: string
  is_active: boolean
  created_at: string
  file_type?: string
}

export const emptyDoc: DocForm = {
  id: '', title: '', content: '', category: 'saju', is_active: true, created_at: ''
}

type Props = {
  form: DocForm
  editing: boolean
  loading: boolean
  onChange: (f: DocForm) => void
  onSave: () => void
  onCancel: () => void
  onMultiSave: (docs: Omit<DocForm, 'id' | 'created_at'>[]) => void
}

export default function KnowledgeForm({
  form, editing, loading, onChange, onSave, onCancel, onMultiSave
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [extracting, setExtracting] = useState(false)
  const [fileNames, setFileNames] = useState<string[]>([])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    const names = Array.from(files).map(f => f.name)
    setFileNames(names)

    if (files.length === 1) {
      const file = files[0]
      const isPdf = file.name.toLowerCase().endsWith('.pdf')
      const isText = file.name.toLowerCase().endsWith('.txt')

      if (isPdf) {
        setExtracting(true)
        try {
          const fd = new FormData()
          fd.append('file', file)
          const res = await fetch('/api/extract-pdf', { method: 'POST', body: fd })
          const data = await res.json()
          onChange({ ...form, title: '', content: data.text || '', file_type: 'pdf' })
        } catch {
          onChange({ ...form, title: '', content: '', file_type: 'pdf' })
        } finally {
          setExtracting(false)
        }
      } else if (isText) {
        const text = await file.text().catch(() => '')
        onChange({ ...form, title: '', content: text, file_type: 'txt' })
      }
    } else {
      // 여러 파일
      const docs: Omit<DocForm, 'id' | 'created_at'>[] = []
      for (const file of Array.from(files)) {
        const isPdf = file.name.toLowerCase().endsWith('.pdf')
        const isText = file.name.toLowerCase().endsWith('.txt')
        let content = ''
        let file_type = ''

        if (isPdf) {
          setExtracting(true)
          try {
            const fd = new FormData()
            fd.append('file', file)
            const res = await fetch('/api/extract-pdf', { method: 'POST', body: fd })
            const data = await res.json()
            content = data.text || ''
            file_type = 'pdf'
          } catch {
            file_type = 'pdf'
          } finally {
            setExtracting(false)
          }
        } else if (isText) {
          content = await file.text().catch(() => '')
          file_type = 'txt'
        }

        docs.push({
          title: '',
          content,
          category: form.category,
          is_active: true,
          file_type,
        })
      }
      onMultiSave(docs)
    }
  }

  return (
    <div className="rounded-2xl p-5"
      style={{ background: 'rgba(60,52,137,0.2)', border: '1px solid rgba(250,199,117,0.2)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold" style={{ color: '#FAC775' }}>
          {editing ? '✏️ 연구자료 수정' : '➕ 연구자료'}
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => fileRef.current?.click()}
            disabled={extracting}
            className="px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#b0aec8', border: '1px solid rgba(255,255,255,0.1)' }}>
            {extracting ? '⏳ 추출중...' : `📎 파일 첨부 ${fileNames.length > 0 ? `(${fileNames.length}개)` : ''}`}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.txt" multiple
            className="hidden" onChange={handleFileUpload} />
          {editing && (
            <button onClick={onCancel}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(255,100,100,0.15)', color: '#ff6464' }}>
              취소
            </button>
          )}
          <button onClick={onSave} disabled={loading || extracting}
            className="px-4 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: '#FAC775', color: '#1a1a18' }}>
            {loading ? '저장중...' : '저장'}
          </button>
        </div>
      </div>

      {extracting && (
        <div className="mb-3 p-3 rounded-xl text-xs text-center"
          style={{ background: 'rgba(250,199,117,0.1)', color: '#FAC775', border: '1px solid rgba(250,199,117,0.2)' }}>
          ⏳ Claude AI가 PDF 텍스트를 추출하고 있어요... 잠시만 기다려주세요
        </div>
      )}

      {fileNames.length > 0 && !extracting && (
        <div className="mb-3 p-3 rounded-xl text-xs"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#b0aec8' }}>
          📄 {fileNames.join(', ')}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: '#b0aec8' }}>제목</label>
          <input
            type="text"
            value={form.title}
            onChange={e => onChange({ ...form, title: e.target.value })}
            placeholder="제목을 직접 입력하세요"
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(250,199,117,0.3)' }}
          />
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: '#b0aec8' }}>분류</label>
          <select value={form.category} onChange={e => onChange({ ...form, category: e.target.value })}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: '#1a1a18', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: '#b0aec8' }}>
            내용 · {form.content.length.toLocaleString()}자
          </label>
          <textarea
            value={form.content}
            onChange={e => onChange({ ...form, content: e.target.value })}
            placeholder="PDF 업로드 시 자동 추출됩니다."
            rows={16}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: '#b0aec8' }}>AI 참고 여부</span>
          <button onClick={() => onChange({ ...form, is_active: !form.is_active })}
            className="px-3 py-1 rounded-lg text-xs font-bold"
            style={form.is_active
              ? { background: 'rgba(76,175,80,0.2)', color: '#81c784' }
              : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
            {form.is_active ? '✅ 활성' : '⭕ 비활성'}
          </button>
        </div>
      </div>
    </div>
  )
}
