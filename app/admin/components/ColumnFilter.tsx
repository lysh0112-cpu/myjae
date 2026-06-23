'use client'

type Props = {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  labelMap?: Record<string, string>
}

export default function ColumnFilter({ label, value, options, onChange, labelMap }: Props) {
  const isActive = value !== 'all'
  return (
    <th className="px-3 py-3 text-left text-xs font-bold whitespace-nowrap"
      style={{ color: '#FAC775' }}>
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="outline-none rounded text-xs"
          style={{
            background: isActive ? 'rgba(250,199,117,0.3)' : 'rgba(60,52,137,0.4)',
            color: isActive ? '#FAC775' : 'rgba(255,255,255,0.5)',
            border: isActive ? '1px solid rgba(250,199,117,0.4)' : '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            width: '22px',
            padding: '1px',
            borderRadius: '4px',
          }}>
          <option value="all" style={{ background: '#1a1a18', color: '#fff' }}>전체</option>
          {options.map(o => (
            <option key={o} value={o} style={{ background: '#1a1a18', color: '#fff' }}>
              {labelMap?.[o] ?? o}
            </option>
          ))}
        </select>
      </div>
    </th>
  )
}
