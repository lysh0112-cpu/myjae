# -*- coding: utf-8 -*-
"""선언만 하고 안 쓰는 값을 찾는다. 타입 검사로는 안 잡히는 사고다.
   2026-07-27 — /api/lunar 가 birthMinute 을 계산해 놓고 안 넘겨서
   절입 시각 반영이 통째로 죽어 있었다.

   [1판의 빈틈 — 2026-07-27 지적받아 고침]
     ① const { a } = b   구조분해를 아예 안 봤다
     ② const min = …     3자 이하를 안 봤다
     ③ DAYUN_WEIGHT      대문자 상수를 안 봤다
     ④ counter = 5       쓰기만 해도 "썼다" 고 셌다
     ⑤ 두 함수에 같은 이름  개수가 2가 되어 통과했다
"""
import re, sys, os

DECL = re.compile(r'(?<!export )\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*[=:]')
DESTRUCT = re.compile(r'(?<!export )\b(?:const|let|var)\s*\{([^}]*)\}\s*=')
# 쓰기(대입)인가 — 이름 뒤에 =(비교 아님)가 오면 쓰기다
def is_write(body, name, pos):
    m = re.match(rf'\s*=(?!=)', body[pos + len(name):])
    return m is not None

def scan_scope(body, path, scope_name, bad, whole=None):
    """whole 이 있으면 "쓰였는가" 는 파일 전체에서 센다.
       최상단 상수는 함수 몸통 안에서 쓰이므로, 최상단만 보면 다 안 쓰는 것처럼 보인다."""
    names = []
    for m in DECL.finditer(body):
        names.append((m.group(1), m.start(1)))
    for m in DESTRUCT.finditer(body):
        inner = m.group(1)
        for part in inner.split(','):
            n = part.split(':')[-1].split('=')[0].strip().lstrip('.')
            if not re.fullmatch(r'[A-Za-z_$][\w$]*', n or ''):
                continue
            # ★그 이름이 중괄호 안 어디에 있는지 정확히 찾아야
            #   아래에서 "선언 자리" 를 건너뛸 수 있다.
            off = inner.find(n)
            names.append((n, m.start(1) + (off if off >= 0 else 0)))
    for name, declpos in names:
        if name.startswith('_'):          # _ 로 시작하면 일부러 안 쓰는 것
            continue
        hay = whole if whole is not None else body
        # 선언 자리 하나만 빼고 센다 (whole 을 쓸 때는 문자열이 달라 위치가 안 맞으므로
        # 선언 모양 자체를 한 번만 지운다)
        if whole is not None:
            decl_txt = body[max(0, declpos - 12):declpos + len(name)]
            hay = hay.replace(decl_txt, '', 1)
            reads = sum(1 for u in re.finditer(rf'\b{re.escape(name)}\b', hay)
                        if not is_write(hay, name, u.start()))
        else:
            reads = 0
            for u in re.finditer(rf'\b{re.escape(name)}\b', body):
                if u.start() == declpos:
                    continue
                if is_write(body, name, u.start()):
                    continue
                reads += 1
        if reads == 0:
            bad.append((path, scope_name, name))

def split_scopes(s):
    """함수·화살표 몸통을 대충 갈라 이름이 겹치는 것을 따로 센다"""
    out, depth, start, name = [], 0, 0, '(파일)'
    for i, ch in enumerate(s):
        if ch == '{':
            if depth == 0:
                head = s[max(0, i - 120):i]
                # ★구조분해(const { a } = b)·객체 리터럴의 { 를 함수 몸통으로 보면
                #   그 줄이 통째로 도려내져 검사에서 사라진다. (2026-07-27)
                if re.search(r'\b(?:const|let|var)\s+$|[=(,:]\s*$', head):
                    # 구조분해·객체 리터럴의 { 다. 함수 몸통이 아니다.
                    start = -1
                    name = ''
                else:
                    m = re.findall(r'(?:function\s+(\w+)|(\w+)\s*=\s*(?:async\s*)?\()', head)
                    name = (m[-1][0] or m[-1][1]) if m else '(블록)'
                    start = i
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0 and start >= 0:
                out.append((name, s[start:i + 1]))
    return out

bad = []
root = sys.argv[1]
for dp, _, fs in os.walk(root):
    if 'node_modules' in dp or '.next' in dp or '/.git' in dp:
        continue
    for fn in fs:
        if not fn.endswith(('.ts', '.tsx')):
            continue
        p = os.path.join(dp, fn)
        s = open(p, encoding='utf-8', errors='ignore').read()
        body = re.sub(r'//[^\n]*|/\*[\s\S]*?\*/', '', s)          # 주석 제거
        body = re.sub(r'`(?:[^`\\]|\\.)*`', '``', body)           # 템플릿 문자열은 통째로
        scopes = split_scopes(body)
        seen = set()
        for nm, blk in scopes:
            scan_scope(blk, os.path.relpath(p, root), nm, bad)
            seen.add(id(blk))
        # 어느 블록에도 안 든 파일 최상단
        #   ⚠️ { } 를 통째로 지우면 구조분해(const { a } = b)까지 사라진다.
        #      함수 몸통만 도려내고 나머지를 본다.
        top = body
        for _, blk in scopes:
            top = top.replace(blk, '', 1)
        scan_scope(top, os.path.relpath(p, root), '(최상단)', bad, whole=body)

if bad:
    print(f"⚠️ 선언만 하고 안 쓰는 값 {len(bad)}건")
    for p, sc, v in bad[:30]:
        print(f"   {p}  [{sc}]  →  {v}")
else:
    print("✅ 선언만 하고 안 쓰는 값 0건")
