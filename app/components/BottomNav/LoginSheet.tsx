'use client'
import { useRouter } from 'next/navigation'

export default function LoginSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const go = (type: string) => {
    onClose()
    router.push(`/auth/login?type=${type}`)
  }
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 w-full px-4"
        style={{ maxWidth: '430px' }}>
        <div className="rounded-2xl p-5"
          style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-center text-white font-bold text-base mb-4">로그인 / 회원가입</p>
          <div className="flex gap-3">
            <button onClick={() => go('customer')}
              className="flex-1 py-4 rounded-2xl font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #3C3489, #FAC775)', color: '#1a1a18' }}>
              👤 일반 고객
            </button>
            <button onClick={() => go('consultant')}
              className="flex-1 py-4 rounded-2xl font-bold text-sm"
              style={{ background: '#1a1a18', border: '1px solid rgba(250,199,117,0.3)', color: '#FAC775' }}>
              🔮 상담사
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
