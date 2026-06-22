'use client'
import { DocForm, CAT_LABEL } from './KnowledgeForm'

type Props = {
  list: DocForm[]
  onEdit: (doc: DocForm) => void
  onDelete: (id: string) => void
  onToggleActive: (doc: DocForm) => void
}

export default function KnowledgeList({ list, onEdit, onDelete, onToggleActive }: Props) {
  return (
    <div className="rounded-2xl overflow-hidden h-full"
      style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-sm font-bold text-white">
          연구자료 목록
          <span className="ml-2 text-xs" style={{ color: '#8a88a0' }}>총 {list.length}개</span>
        </div>
        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          AI 분석 시 활성 항목 자동 참고
        </div>
      </div>

      <div style={{ overflowY: 'auto', maxHeight: '70vh' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(60,52,137,0.2)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['등록일자', '제목', '분류', '크기', 'AI참고', '수정', '삭제'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold whitespace-nowrap"
                  style={{ color: '#FAC775' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-sm"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  등록된 연구자료가 없습니다
                </td>
              </tr>
            )}
            {list.map((doc, i) => (
              <tr key={doc.id}
                style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: '#8a88a0' }}>
                  {new Date(doc.created_at).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-4 py-3" style={{ maxWidth: '200px' }}>
                  <div className="text-sm font-bold text-white truncate">{doc.title}</div>
                  <div className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {doc.content.slice(0, 40)}...
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs px-2 py-1 rounded-full"
                    style={{ background: 'rgba(60,52,137,0.4)', color: '#b0aec8' }}>
                    {CAT_LABEL[doc.category] || doc.category}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: '#8a88a0' }}>
                  {(new Blob([doc.content]).size / 1024).toFixed(1)}KB
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => onToggleActive(doc)}
                    className="px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
                    style={doc.is_active
                      ? { background: 'rgba(76,175,80,0.2)', color: '#81c784' }
                      : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                    {doc.is_active ? '✅ 활성' : '⭕ 비활성'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => onEdit(doc)}
                    className="px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
                    style={{ background: 'rgba(250,199,117,0.15)', color: '#FAC775' }}>
                    수정
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => onDelete(doc.id)}
                    className="px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
                    style={{ background: 'rgba(255,100,100,0.15)', color: '#ff6464' }}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
