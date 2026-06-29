'use client'
import { useRouter } from 'next/navigation'

export default function LoginSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const go = () => {
    onClose()
    router.push('/auth')
  }
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 w-full px-4"
        style={{ maxWidth: '430px' }}>
        <div className="rounded-2xl p-5"
          style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-center text-white font-bold text-base mb-2">로그인 / 회원가입</p>
          <p className="text-center text-xs mb-4" style={{ color: '#8a88a0' }}>
            카카오·네이버·구글로 간편하게 시작하세요
          </p>
          <button onClick={go}
            className="w-full py-4 rounded-2xl font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #3C3489, #FAC775)', color: '#1a1a18' }}>
            시작하기 →
          </button>
        </div>
      </div>
    </>
  )
}
