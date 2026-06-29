'use client'

export default function Header() {
  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotateY(0deg) rotateX(15deg); }
          100% { transform: rotateY(360deg) rotateX(15deg); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { text-shadow: 0 0 4px rgba(250,199,117,0.3); }
          50% { text-shadow: 0 0 12px rgba(250,199,117,0.9), 0 0 24px rgba(231,76,60,0.5); }
        }
        .myung-ball {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #ff9966 0%, #e74c3c 35%, #8e1a0e 65%, #4a0a05 100%);
          box-shadow: inset -4px -4px 10px rgba(0,0,0,0.6), inset 2px 2px 6px rgba(255,200,100,0.4), 0 4px 16px rgba(192,57,43,0.6);
          animation: spin 3s linear infinite;
          display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden; flex-shrink: 0;
        }
        .myung-ball-shine {
          position: absolute; top: 5px; left: 6px;
          width: 10px; height: 6px;
          background: radial-gradient(ellipse, rgba(255,255,255,0.8), transparent);
          border-radius: 50%;
          animation: shimmer 3s ease-in-out infinite;
        }
        .myung-ball-char {
          font-size: 15px;
          color: rgba(255,240,180,0.95);
          text-shadow: 0 0 4px rgba(250,199,117,0.8), 1px 1px 1px rgba(0,0,0,0.8);
          font-weight: 900;
          z-index: 2;
          position: relative;
          transform: skewX(-8deg);
        }
        .myung-text {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 2px;
          color: #FAC775;
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
      <header className="fixed top-0 z-50 flex items-center justify-between px-5 py-4"
        style={{ background: 'rgba(44,44,42,0.95)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          width: '100%', maxWidth: '430px', left: '50%', transform: 'translateX(-50%)' }}>
        <div className="flex items-center gap-2">
          <div className="myung-ball">
            <div className="myung-ball-shine" />
            <span className="myung-ball-char">明</span>
          </div>
          <span className="myung-text">명카페</span>
        </div>
      </header>
    </>
  )
}
