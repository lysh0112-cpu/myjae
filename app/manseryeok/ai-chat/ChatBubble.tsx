// app/manseryeok/ai-chat/ChatBubble.tsx
type Props = {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export default function ChatBubble({ role, content, isStreaming }: Props) {
  const isUser = role === 'user'

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '12px',
      gap: '8px',
      alignItems: 'flex-end',
    }}>
      {/* AI 아바타 */}
      {!isUser && (
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #3d2060, #6644cc)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', flexShrink: 0,
        }}>
          🔮
        </div>
      )}

      <div style={{
        maxWidth: '72%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}>
        {/* 이름 */}
        {!isUser && (
          <div style={{fontSize: '11px', color: '#7766aa', marginBottom: '4px'}}>
            명연재 AI
          </div>
        )}

        {/* 버블 */}
        <div style={{
          padding: '10px 14px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isUser ? '#3d2a88' : '#1e1e2e',
          color: isUser ? '#e8e4ff' : '#d8d4f0',
          fontSize: '14px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
        }}>
          {content}
          {isStreaming && (
            <span style={{
              display: 'inline-block',
              width: '8px', height: '14px',
              background: '#9977ff',
              marginLeft: '4px',
              borderRadius: '2px',
              animation: 'blink 0.8s infinite',
            }}/>
          )}
        </div>
      </div>

      {/* 유저 아바타 */}
      {isUser && (
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: '#2d2060',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', flexShrink: 0, color: '#c8b0ff', fontWeight: '500',
        }}>
          나
        </div>
      )}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
