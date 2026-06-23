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
            background: isActive ? 'rgba(250,199,117,0.2)' : 'transparent',
            color: isActive ? '#FAC775' : 'rgba(255,255,255,0.3)',
            border: 'none',
            cursor: 'pointer',
            width: '20px',
            padding: 0,
          }}>
          <option value="all">▼</option>
          {options.map(o => (
            <option key={o} value={o}>
              {labelMap?.[o] ?? o}
            </option>
          ))}
        </select>
      </div>
    </th>
  )
}
