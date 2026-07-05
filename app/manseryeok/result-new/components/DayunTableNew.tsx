<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; background: #f9f9f9; padding: 16px; }
.wrap { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #e8e8e8; }

/* 섹션 타이틀 */
.sec-title { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.sec-title .dot { color: #8B6914; font-size: 13px; }
.sec-title .name { font-size: 14px; font-weight: 700; color: #222; }
.sec-title .badge { font-size: 11px; background: #fffbe6; border: 1px solid #e8d5a0; color: #8B6914; border-radius: 10px; padding: 1px 8px; }
.sec-title .nav { font-size: 10px; color: #bbb; margin-left: auto; }

.subtitle { font-size: 11px; color: #aaa; margin-bottom: 10px; }
.section-gap { margin-bottom: 20px; }

/* 스크롤 */
.scroll-wrap { overflow-x: auto; scrollbar-width: thin; scrollbar-color: #ddd transparent; padding-bottom: 6px; }

/* 대운/세운/월운 공통 표 */
.dayun-tbl { border-collapse: collapse; white-space: nowrap; }
.dayun-tbl td { padding: 1px 2px; text-align: center; vertical-align: middle; }

.age-row td { font-size: 9px; color: #aaa; padding-bottom: 2px; line-height: 1.2; }
.sipsin-top td { font-size: 10px; font-weight: 600; height: 15px; line-height: 15px; color: #888; }
.sipsin-bot td { font-size: 9px; height: 13px; line-height: 13px; color: #aaa; }
.row-lbl { font-size: 9px; color: #bbb; width: 20px; text-align: right; padding-right: 3px !important; }

/* 간지 박스 */
.gj { width: 44px; height: 44px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; border: 1px solid; margin: 1px auto; }
.gj .mc { font-size: 22px; font-weight: 700; line-height: 1; }
.gj .sc { font-size: 8px; font-weight: 600; position: absolute; bottom: 2px; right: 4px; }

/* 오행 색상 — 포스텔러 스타일 (파스텔) */
.m  { background: #e8f5e9; border-color: #a5d6a7 !important; color: #2e7d32; } /* 목 */
.h  { background: #ffebee; border-color: #ef9a9a !important; color: #c62828; } /* 화 */
.t  { background: #fff8e1; border-color: #ffe082 !important; color: #f57f17; } /* 토 */
.g  { background: #f5f5f5; border-color: #bdbdbd !important; color: #616161; } /* 금 */
.su { background: #e3f2fd; border-color: #90caf9 !important; color: #1565c0; } /* 수 */

/* 현재 강조 */
.cur { outline: 2px solid #555; border-radius: 10px; display: inline-block; padding: 1px; }

/* 십성 색상 */
.비견,.겁재 { color: #9e9e9e !important; }
.식신,.상관 { color: #43a047 !important; }
.편재,.정재 { color: #fb8c00 !important; }
.편관,.정관 { color: #e53935 !important; }
.편인,.정인 { color: #1e88e5 !important; }

/* 상세 패널 */
.detail-panel { background: #fff; border: 1px solid #e8e8e8; border-radius: 10px; padding: 14px; margin: 8px 0 14px; position: relative; }
.detail-panel .close { position: absolute; top: 10px; right: 12px; font-size: 16px; color: #bbb; cursor: pointer; }
.detail-title { font-size: 16px; font-weight: 700; color: #222; margin-bottom: 2px; }
.detail-badge { font-size: 12px; background: #f5f5f5; border: 1px solid #ddd; color: #555; border-radius: 10px; padding: 2px 10px; margin-left: 6px; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
.detail-item { background: #fafafa; border: 1px solid #eeeeee; border-radius: 8px; padding: 10px 12px; }
.detail-item .lbl { font-size: 10px; color: #aaa; margin-bottom: 4px; }
.detail-item .val { font-size: 14px; font-weight: 700; color: #222; }
.detail-item .val.red { color: #e53935; }
.detail-item .val.blue { color: #1e88e5; }
.detail-item .val.orange { color: #fb8c00; }
</style>
</head>
<body>
<div class="wrap">

  <!-- 대운 -->
  <div class="section-gap">
    <div class="sec-title">
      <span class="dot">✦</span>
      <span class="name">대운</span>
      <span class="badge">현재 36세</span>
      <span class="nav">← 미래 · 과거 →</span>
    </div>
    <div class="subtitle">좌우로 슬라이드해서 더 볼 수 있어요.</div>
    <div class="scroll-wrap">
      <table class="dayun-tbl">
        <tbody>
          <tr class="age-row">
            <td class="row-lbl"></td>
            <td>94<br><span style="color:#888;font-size:8px;">정관</span></td>
            <td>85~74<br><span style="color:#888;font-size:8px;">편인</span></td>
            <td>75~84<br><span style="color:#888;font-size:8px;">편관</span></td>
            <td style="color:#8B6914;">65~74<br><span style="color:#8B6914;font-size:8px;">정관</span></td>
            <td>55~64<br><span style="color:#888;font-size:8px;">편관</span></td>
            <td>45~54<br><span style="color:#888;font-size:8px;">편인</span></td>
            <td>35~44<br><span style="color:#888;font-size:8px;">정관</span></td>
            <td>25~34<br><span style="color:#888;font-size:8px;">비견</span></td>
            <td>15~24<br><span style="color:#888;font-size:8px;">편재</span></td>
            <td>5~14<br><span style="color:#888;font-size:8px;">정재</span></td>
          </tr>
          <!-- 천간 -->
          <tr>
            <td class="row-lbl" style="font-size:9px;color:#bbb;">천간</td>
            <td><div class="gj h"><span class="mc">丙</span><span class="sc">火</span></div></td>
            <td><div class="gj m"><span class="mc">乙</span><span class="sc">木</span></div></td>
            <td><div class="gj m"><span class="mc">甲</span><span class="sc">Wood</span></div></td>
            <td><div class="cur"><div class="gj su"><span class="mc">癸</span><span class="sc">水</span></div></div></td>
            <td><div class="gj su"><span class="mc">壬</span><span class="sc">Water</span></div></td>
            <td><div class="gj g"><span class="mc">辛</span><span class="sc">Metal</span></div></td>
            <td><div class="gj g"><span class="mc">庚</span><span class="sc">Metal</span></div></td>
            <td><div class="gj t"><span class="mc">己</span><span class="sc">土</span></div></td>
            <td><div class="gj t"><span class="mc">戊</span><span class="sc">Earth</span></div></td>
            <td><div class="gj h"><span class="mc">丁</span><span class="sc">Fire</span></div></td>
          </tr>
          <!-- 지지 -->
          <tr>
            <td class="row-lbl" style="font-size:9px;color:#bbb;">지지</td>
            <td><div class="gj h"><span class="mc">戌</span><span class="sc">火</span></div></td>
            <td><div class="gj g"><span class="mc">酉</span><span class="sc">Metal</span></div></td>
            <td><div class="gj g"><span class="mc">申</span><span class="sc">Metal</span></div></td>
            <td><div class="cur"><div class="gj t"><span class="mc">未</span><span class="sc">Earth</span></div></div></td>
            <td><div class="gj h"><span class="mc">午</span><span class="sc">Fire</span></div></td>
            <td><div class="gj h"><span class="mc">巳</span><span class="sc">Fire</span></div></td>
            <td><div class="gj t"><span class="mc">辰</span><span class="sc">Earth</span></div></td>
            <td><div class="gj m"><span class="mc">卯</span><span class="sc">Wood</span></div></td>
            <td><div class="gj m"><span class="mc">寅</span><span class="sc">Wood</span></div></td>
            <td><div class="gj su"><span class="mc">丑</span><span class="sc">Water</span></div></td>
          </tr>
          <tr class="sipsin-bot">
            <td class="row-lbl"></td>
            <td class="식신">식신<br>사</td>
            <td class="편인">편인<br>묘</td>
            <td class="편재">편재<br>연재</td>
            <td class="정관">정관<br>보</td>
            <td class="편관">편관<br>부</td>
            <td class="편인">편인<br>목</td>
            <td class="정인">정인<br>장생</td>
            <td class="비견">비견<br>목욕</td>
            <td class="편재">편재<br>이제</td>
            <td class="정재">정재<br>식신</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 상세 패널 -->
    <div class="detail-panel">
      <span class="close">✕</span>
      <div style="display:flex;align-items:center;">
        <span class="detail-title">丙戌</span>
        <span class="detail-badge">65~74세</span>
        <span style="font-size:11px;color:#bbb;margin-left:8px;">2055~2064년</span>
      </div>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="lbl">천간 십성</div>
          <div class="val">비견</div>
        </div>
        <div class="detail-item">
          <div class="lbl">지지 십성</div>
          <div class="val">식신</div>
        </div>
        <div class="detail-item">
          <div class="lbl">12운성</div>
          <div class="val red">묘</div>
        </div>
        <div class="detail-item">
          <div class="lbl">신살(년지)</div>
          <div class="val orange">화개</div>
        </div>
        <div class="detail-item" style="grid-column:1/-1;">
          <div class="lbl">신살(일지)</div>
          <div class="val orange">화개</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 세운 (연운) -->
  <div class="section-gap">
    <div class="sec-title">
      <span class="dot">✦</span>
      <span class="name">세운 (연운)</span>
      <span class="badge">2026년</span>
      <span class="nav">← 미래 · 과거 →</span>
    </div>
    <div class="scroll-wrap">
      <table class="dayun-tbl">
        <tbody>
          <tr class="age-row">
            <td class="row-lbl"></td>
            <td>2035<br><span style="color:#888;font-size:8px;">겁재</span></td>
            <td>2034<br><span style="color:#888;font-size:8px;">편인</span></td>
            <td>2033<br><span style="color:#888;font-size:8px;">식신</span></td>
            <td>2032<br><span style="color:#888;font-size:8px;">정관</span></td>
            <td>2031<br><span style="color:#888;font-size:8px;">상관</span></td>
            <td>2030<br><span style="color:#888;font-size:8px;">편인</span></td>
            <td>2029<br><span style="color:#888;font-size:8px;">전재</span></td>
            <td>2028<br><span style="color:#888;font-size:8px;">정재</span></td>
            <td style="color:#8B6914;">2027<br><span style="color:#8B6914;font-size:8px;">정관</span></td>
            <td style="color:#8B6914;">2026<br><span style="color:#8B6914;font-size:8px;">편관</span></td>
          </tr>
          <tr>
            <td class="row-lbl" style="font-size:9px;color:#bbb;">천간</td>
            <td><div class="gj m"><span class="mc">癸</span><span class="sc">Wood</span></div></td>
            <td><div class="gj su"><span class="mc">壬</span><span class="sc">Water</span></div></td>
            <td><div class="gj g"><span class="mc">辛</span><span class="sc">Metal</span></div></td>
            <td><div class="gj g"><span class="mc">庚</span><span class="sc">Metal</span></div></td>
            <td><div class="gj t"><span class="mc">己</span><span class="sc">Earth</span></div></td>
            <td><div class="gj t"><span class="mc">戊</span><span class="sc">Earth</span></div></td>
            <td><div class="gj h"><span class="mc">丁</span><span class="sc">Fire</span></div></td>
            <td><div class="gj h"><span class="mc">丙</span><span class="sc">Fire</span></div></td>
            <td><div class="cur"><div class="gj m"><span class="mc">乙</span><span class="sc">Wood</span></div></div></td>
            <td><div class="cur"><div class="gj m"><span class="mc">甲</span><span class="sc">Wood</span></div></div></td>
          </tr>
          <tr>
            <td class="row-lbl" style="font-size:9px;color:#bbb;">지지</td>
            <td><div class="gj t"><span class="mc">丑</span><span class="sc">Earth</span></div></td>
            <td><div class="gj su"><span class="mc">子</span><span class="sc">Water</span></div></td>
            <td><div class="gj su"><span class="mc">亥</span><span class="sc">Water</span></div></td>
            <td><div class="gj t"><span class="mc">戌</span><span class="sc">Earth</span></div></td>
            <td><div class="gj g"><span class="mc">酉</span><span class="sc">Metal</span></div></td>
            <td><div class="gj g"><span class="mc">申</span><span class="sc">Metal</span></div></td>
            <td><div class="gj t"><span class="mc">未</span><span class="sc">Earth</span></div></td>
            <td><div class="gj h"><span class="mc">午</span><span class="sc">Fire</span></div></td>
            <td><div class="cur"><div class="gj h"><span class="mc">巳</span><span class="sc">Fire</span></div></div></td>
            <td><div class="cur"><div class="gj m"><span class="mc">辰</span><span class="sc">Wood</span></div></div></td>
          </tr>
          <tr class="sipsin-bot">
            <td class="row-lbl"></td>
            <td class="비견">비견</td>
            <td class="비견">비견</td>
            <td class="편인">편인</td>
            <td class="편재">편재</td>
            <td class="정인">정인</td>
            <td class="편인">편인</td>
            <td class="정관">정관</td>
            <td class="식신">식신</td>
            <td class="정관">정관</td>
            <td class="편재">편재</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 월운 -->
  <div class="section-gap">
    <div class="sec-title">
      <span class="dot">✦</span>
      <span class="name">월운</span>
      <span class="badge">2026년</span>
      <span class="nav">← 미래 · 과거 →</span>
    </div>
    <div class="scroll-wrap">
      <table class="dayun-tbl">
        <tbody>
          <tr class="age-row">
            <td class="row-lbl"></td>
            <td>1월<br><span style="color:#888;font-size:8px;">편재</span></td>
            <td>2월<br><span style="color:#888;font-size:8px;">정재</span></td>
            <td>3월<br><span style="color:#888;font-size:8px;">식신</span></td>
            <td>4월<br><span style="color:#888;font-size:8px;">상관</span></td>
            <td>5월<br><span style="color:#888;font-size:8px;">편관</span></td>
            <td>6월<br><span style="color:#888;font-size:8px;">정관</span></td>
            <td style="color:#8B6914;">7월<br><span style="color:#8B6914;font-size:8px;">편인</span></td>
            <td>8월<br><span style="color:#888;font-size:8px;">정인</span></td>
            <td>9월<br><span style="color:#888;font-size:8px;">비견</span></td>
            <td>10월<br><span style="color:#888;font-size:8px;">겁재</span></td>
          </tr>
          <tr>
            <td class="row-lbl" style="font-size:9px;color:#bbb;">천간</td>
            <td><div class="gj t"><span class="mc">戊</span><span class="sc">Earth</span></div></td>
            <td><div class="gj t"><span class="mc">己</span><span class="sc">Earth</span></div></td>
            <td><div class="gj m"><span class="mc">甲</span><span class="sc">Wood</span></div></td>
            <td><div class="gj m"><span class="mc">乙</span><span class="sc">Wood</span></div></td>
            <td><div class="gj h"><span class="mc">丙</span><span class="sc">Fire</span></div></td>
            <td><div class="gj h"><span class="mc">丁</span><span class="sc">Fire</span></div></td>
            <td><div class="cur"><div class="gj t"><span class="mc">戊</span><span class="sc">Earth</span></div></div></td>
            <td><div class="gj t"><span class="mc">己</span><span class="sc">Earth</span></div></td>
            <td><div class="gj g"><span class="mc">庚</span><span class="sc">Metal</span></div></td>
            <td><div class="gj g"><span class="mc">辛</span><span class="sc">Metal</span></div></td>
          </tr>
          <tr>
            <td class="row-lbl" style="font-size:9px;color:#bbb;">지지</td>
            <td><div class="gj t"><span class="mc">丑</span><span class="sc">Earth</span></div></td>
            <td><div class="gj m"><span class="mc">寅</span><span class="sc">Wood</span></div></td>
            <td><div class="gj m"><span class="mc">卯</span><span class="sc">Wood</span></div></td>
            <td><div class="gj t"><span class="mc">辰</span><span class="sc">Earth</span></div></td>
            <td><div class="gj h"><span class="mc">巳</span><span class="sc">Fire</span></div></td>
            <td><div class="gj h"><span class="mc">午</span><span class="sc">Fire</span></div></td>
            <td><div class="cur"><div class="gj t"><span class="mc">未</span><span class="sc">Earth</span></div></div></td>
            <td><div class="gj g"><span class="mc">申</span><span class="sc">Metal</span></div></td>
            <td><div class="gj g"><span class="mc">酉</span><span class="sc">Metal</span></div></td>
            <td><div class="gj t"><span class="mc">戌</span><span class="sc">Earth</span></div></td>
          </tr>
          <tr class="sipsin-bot">
            <td class="row-lbl"></td>
            <td class="편재">편재<br>관대</td>
            <td class="정재">정재<br>목욕</td>
            <td class="식신">식신<br>장생</td>
            <td class="상관">상관<br>양</td>
            <td class="편관">편관<br>태</td>
            <td class="정관">정관<br>절</td>
            <td class="편인">편인<br>정관</td>
            <td class="정인">정인<br>장생</td>
            <td class="비견">비견<br>사</td>
            <td class="겁재">겁재<br>식신</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

</div>
</body>
</html>
