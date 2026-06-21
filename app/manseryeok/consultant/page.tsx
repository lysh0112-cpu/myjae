{/* 설정 패널 — 컴팩트 */}
      {showSettings && (
        <div style={{
          position:'fixed', top:'48px', right:'0', zIndex:100,
          background:'#16161f', borderLeft:'1px solid rgba(255,255,255,0.08)',
          borderBottom:'1px solid rgba(255,255,255,0.08)',
          borderRadius:'0 0 0 10px',
          padding:'10px 14px',
          boxShadow:'-4px 4px 16px rgba(0,0,0,0.5)',
          display:'flex', flexDirection:'column', gap:'8px', minWidth:'320px',
        }}>

          {/* 1행: 색상 스와치들 */}
          <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
            {[
              { label:'전체배경', key:'bgColor' },
              { label:'채팅배경', key:'chatBg' },
              { label:'내버블', key:'myBubble' },
              { label:'고객버블', key:'customerBubble' },
            ].map(({ label, key }) => (
              <div key={key} style={{display:'flex', alignItems:'center', gap:'4px'}}>
                <span style={{fontSize:'10px', color:'#666688'}}>{label}</span>
                <label style={{position:'relative', cursor:'pointer'}}>
                  <div style={{
                    width:'22px', height:'22px', borderRadius:'3px',
                    background:(s as any)[key],
                    border:'1px solid rgba(255,255,255,0.15)',
                    cursor:'pointer',
                  }}/>
                  <input type="color"
                    value={(s as any)[key]}
                    onChange={e => setSettings(prev => ({...prev, [key]: e.target.value}))}
                    style={{
                      position:'absolute', opacity:0, width:'22px', height:'22px',
                      top:0, left:0, cursor:'pointer',
                    }}
                  />
                </label>
                <span style={{fontSize:'10px', color:'#444466', fontFamily:'monospace'}}>
                  {(s as any)[key]}
                </span>
              </div>
            ))}
          </div>

          {/* 2행: 폰트 크기 + 폰트 종류 */}
          <div style={{display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap'}}>
            {/* 폰트 크기 */}
            <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
              <span style={{fontSize:'10px', color:'#666688'}}>폰트</span>
              <span style={{fontSize:'10px', color:'#444466'}}>11</span>
              <input type="range" min="11" max="16" step="1"
                value={s.fontSize}
                onChange={e => setSettings(prev => ({...prev, fontSize: Number(e.target.value)}))}
                style={{width:'80px', cursor:'pointer'}}
              />
              <span style={{fontSize:'10px', color:'#444466'}}>16</span>
              <span style={{fontSize:'11px', color:'#b8a9ff', minWidth:'28px'}}>{s.fontSize}px</span>
            </div>

            {/* 폰트 종류 */}
            <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
              <span style={{fontSize:'10px', color:'#666688'}}>종류</span>
              <select
                value={s.fontFamily}
                onChange={e => setSettings(prev => ({...prev, fontFamily: e.target.value}))}
                style={{
                  fontSize:'11px', padding:'2px 6px', borderRadius:'5px',
                  background:'#1e1e2e', color:'#c8c0ff',
                  border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer',
                }}>
                <option value="var(--font-sans)">기본</option>
                <option value="Batang, serif">명조</option>
                <option value="Malgun Gothic, sans-serif">고딕</option>
                <option value="Apple SD Gothic Neo, sans-serif">둥근고딕</option>
              </select>
            </div>

            {/* 저장·초기화 */}
            <div style={{display:'flex', gap:'5px', marginLeft:'auto'}}>
              <button onClick={handleSaveSettings}
                style={{
                  fontSize:'11px', padding:'4px 12px', borderRadius:'6px',
                  border:'none', background:'#3d2a88', color:'#c8b0ff', cursor:'pointer',
                }}>
                💾 저장
              </button>
              <button onClick={() => setSettings(DEFAULT_SETTINGS)}
                style={{
                  fontSize:'11px', padding:'4px 10px', borderRadius:'6px',
                  border:'1px solid rgba(255,255,255,0.08)',
                  background:'transparent', color:'#555577', cursor:'pointer',
                }}>
                초기화
              </button>
              <button onClick={() => setShowSettings(false)}
                style={{
                  fontSize:'11px', padding:'4px 8px', borderRadius:'6px',
                  border:'1px solid rgba(255,255,255,0.08)',
                  background:'transparent', color:'#555577', cursor:'pointer',
                }}>
                ✕
              </button>
            </div>
          </div>

        </div>
      )}
