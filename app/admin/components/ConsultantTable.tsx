import { ConsultantFormData } from './ConsultantForm'

type Props = {
  list: ConsultantFormData[]
  onEdit: (c: ConsultantFormData) => void
  onDelete: (id: string) => void
  onToggleActive: (c: ConsultantFormData) => void
}

export default function ConsultantTable({ list, onEdit, onDelete, onToggleActive }: Props) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: '900px' }}>
        <thead>
          <tr style={{ background: 'rgba(60,52,137,0.3)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            {['이름', '활성', '전화번호', '전문분야', '거주지역', '상담료', '은행', '계좌번호', '수수료율', '수수료금액', '수정', '삭제'].map(h => (
              <th key={h} className="px-3 py-3 text-left text-xs font-bold whitespace-nowrap"
                style={{ color: '#FAC775' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map((c, i) => (
            <tr key={c.id}
              style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td className="px-3 py-3 font-bold text-white whitespace-nowrap">{c.name}</td>
              <td className="px-3 py-3">
                <button onClick={() => onToggleActive(c)}
                  className="px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
                  style={c.active
                    ? { background: 'rgba(76,175,80,0.2)', color: '#81c784' }
                    : { background: 'rgba(255,100,100,0.2)', color: '#ff6464' }}>
                  {c.active ? '활성' : '비활성'}
                </button>
              </td>
              <td className="px-3 py-3 whitespace-nowrap" style={{ color: '#b0aec8' }}>{c.phone}</td>
              <td className="px-3 py-3 whitespace-nowrap" style={{ color: '#b0aec8' }}>{c.specialty || '-'}</td>
              <td className="px-3 py-3 whitespace-nowrap" style={{ color: '#b0aec8' }}>{c.region || '-'}</td>
              <td className="px-3 py-3 whitespace-nowrap" style={{ color: '#FAC775' }}>
                {(c.price || 0).toLocaleString()}원
              </td>
              <td className="px-3 py-3 whitespace-nowrap" style={{ color: '#b0aec8' }}>{c.bank || '-'}</td>
              <td className="px-3 py-3 whitespace-nowrap" style={{ color: '#b0aec8' }}>{c.account || '-'}</td>
              <td className="px-3 py-3 whitespace-nowrap" style={{ color: '#b0aec8' }}>
                {c.commission_rate || 0}%
              </td>
              <td className="px-3 py-3 whitespace-nowrap" style={{ color: '#b0aec8' }}>
                {(c.commission_amount || 0).toLocaleString()}원
              </td>
              <td className="px-3 py-3">
                <button onClick={() => onEdit(c)}
                  className="px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
                  style={{ background: 'rgba(250,199,117,0.15)', color: '#FAC775' }}>
                  수정
                </button>
              </td>
              <td className="px-3 py-3">
                <button onClick={() => onDelete(c.id)}
                  className="px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
                  style={{ background: 'rgba(255,100,100,0.15)', color: '#ff6464' }}>
                  삭제
                </button>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan={12} className="text-center py-10 text-sm"
                style={{ color: 'rgba(255,255,255,0.3)' }}>
                등록된 상담사가 없습니다
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
