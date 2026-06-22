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
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full rounded-t-2xl p-6"
        style={{ maxWidth: '430px', background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-6"
          style={{ background: 'rgba(255,255,255,0.2)' }} />
        <p className="text-center text-white font-bold text-base mb-5">로그인 / 회원가입</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => go('customer')}
            className="w-full py-4 rounded-2xl font-bold text-base"
            style={{ background: 'linear-gradient(135deg, #3C3489, #FAC775)', color: '#1a1a18' }}>
            👤 일반 고객
          </button>
          <button onClick={() => go('consultant')}
            className="w-full py-4 rounded-2xl font-bold text-base"
            style={{ background: '#1a1a18', border: '1px solid rgba(250,199,117,0.3)', color: '#FAC775' }}>
            🔮 상담사
          </button>
        </div>
      </div>
    </>
  )
}
