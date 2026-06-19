// app/manseryeok/result/components/GongmangDisplay.tsx
'use client'

import { getGongmang, JI_COLOR } from '@/lib/saju'

interface Props {
  ilgan: string
  iljji: string
}

export default function GongmangDisplay({ ilgan, iljji }: Props) {
  const [gm1, gm2] = getGongmang(ilgan, iljji)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
      <h3 className="text-sm font-semibold text-gray-500 mb-3 tracking-wide">
        공망 (空亡) · 일주 기준
      </h3>
      <div className="flex items-center gap-3">
        {[gm1, gm2].map((jiji) => (
          <div
            key={jiji}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2"
            style={{
              borderColor: JI_COLOR[jiji] ?? '#999',
              backgroundColor: `${JI_COLOR[jiji] ?? '#999'}18`,
            }}
          >
            <span
              className="text-2xl font-bold"
              style={{ color: JI_COLOR[jiji] ?? '#555' }}
            >
              {jiji}
            </span>
          </div>
        ))}
        <p className="text-xs text-gray-400 ml-1">
          이 지지가 놓인 기둥은<br />힘이 약해집니다
        </p>
      </div>
    </div>
  )
}
