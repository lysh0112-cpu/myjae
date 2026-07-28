# -*- coding: utf-8 -*-
"""
교재 78~83쪽 「09 합에 관한 이해」 — 규칙별 실측
  python3 05-verify-hap-78-83.py

★저장소도 파이썬 패키지도 없이 혼자 돕니다. (04-verify-19-cases.py 와 같은 결)
  전수 표본 = 년/월/일/시 네 기둥의 간지 조합에서 뽑은 명식
"""
import itertools, random
from collections import Counter

STEMS = list('甲乙丙丁戊己庚辛壬癸')
BRANCHES = list('子丑寅卯辰巳午未申酉戌亥')
GAPJA = [(STEMS[i % 10], BRANCHES[i % 12]) for i in range(60)]

STEM_EL = dict(zip(STEMS, ['목','목','화','화','토','토','금','금','수','수']))
BRANCH_EL = {'子':'수','丑':'토','寅':'목','卯':'목','辰':'토','巳':'화',
             '午':'화','未':'토','申':'금','酉':'금','戌':'토','亥':'수'}
JIJANGAN = {
    '子':['壬','癸'], '丑':['癸','辛','己'], '寅':['戊','丙','甲'], '卯':['甲','乙'],
    '辰':['乙','癸','戊'], '巳':['戊','庚','丙'], '午':['丙','己','丁'], '未':['丁','乙','己'],
    '申':['戊','壬','庚'], '酉':['庚','辛'], '戌':['辛','丁','戊'], '亥':['戊','甲','壬'],
}
CON = {'목':'토','토':'수','수':'화','화':'금','금':'목'}   # 극

CHEONGAN_HAP = [('甲','己'),('乙','庚'),('丙','辛'),('丁','壬'),('戊','癸')]
HAP_EL = {'甲己':'토','乙庚':'금','丙辛':'수','丁壬':'목','戊癸':'화'}
YUKHAP = [('子','丑'),('寅','亥'),('卯','戌'),('辰','酉'),('巳','申'),('午','未')]
SAMHAP = [('申','子','辰'),('亥','卯','未'),('寅','午','戌'),('巳','酉','丑')]
SAMHAP_EL = {'申子辰':'수','亥卯未':'목','寅午戌':'화','巳酉丑':'금'}
BANGHAP = [('寅','卯','辰'),('巳','午','未'),('申','酉','戌'),('亥','子','丑')]
WANGJI = set('子午卯酉')
CHUNG = {'子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅',
         '卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳'}
WONJIN = {'子':'未','未':'子','丑':'午','午':'丑','寅':'酉','酉':'寅',
          '卯':'申','申':'卯','辰':'亥','亥':'辰','巳':'戌','戌':'巳'}
JAHWA = [('甲','午'),('戊','子'),('辛','巳'),('丁','亥'),('壬','午')]
TOJI = set('辰戌丑未')
HYEONG = [('丑','戌'),('戌','未'),('丑','未'),('寅','巳'),('巳','申'),('寅','申')]


def sample(n=60000, seed=7):
    """네 기둥을 60갑자에서 뽑아 명식을 만든다 (년·월·일·시)"""
    rnd = random.Random(seed)
    out = []
    for _ in range(n):
        out.append([GAPJA[rnd.randrange(60)] for _ in range(4)])
    return out


def pct(a, b):
    return f'{a:>7,}  {a/b*100:5.1f}%'


def main():
    ms = sample()
    N = len(ms)
    print('교재 78~83쪽 합(合) — 규칙별 실측')
    print(f'표본 {N:,} 명식 (년·월·일·시 각각 60갑자에서 무작위)')
    print('=' * 72)

    c = Counter()
    for m in ms:
        stems = [s for s, _ in m]
        brs = [b for _, b in m]
        monthB = m[1][1]
        dayS, dayB = m[2]

        # ── 1. 천간합 ───────────────────────────────────────────
        for a, b in CHEONGAN_HAP:
            if a not in stems or b not in stems:
                continue
            c['천간합_있음'] += 1
            # 자리를 본다 — 지금 코드는 이걸 안 본다
            ia, ib = stems.index(a), stems.index(b)
            lo, hi = min(ia, ib), max(ia, ib)
            if hi - lo == 1:
                c['천간합_붙어있음'] += 1
            else:
                c['천간합_떨어짐'] += 1
                mid = stems[lo + 1:hi]
                # 사이 글자가 합하는 두 글자 중 하나를 극하는가
                if any(CON.get(STEM_EL[x]) in (STEM_EL[a], STEM_EL[b]) for x in mid):
                    c['★방해_극'] += 1
                elif mid:
                    c['★방해_끼어듦'] += 1
            # 쟁합·투합 — 한쪽이 둘 이상
            if stems.count(a) >= 2 or stems.count(b) >= 2:
                c['★쟁합투합'] += 1
            # 합화 조건 — 지지에 합화 오행 세력이 있는가
            el = HAP_EL[a + b]
            if any(BRANCH_EL[x] == el for x in brs):
                c['천간합_합화됨'] += 1
            else:
                c['★합화안됨'] += 1
            break

        # ── 2. 육합 ────────────────────────────────────────────
        for a, b in YUKHAP:
            if a in brs and b in brs:
                c['육합_있음'] += 1
                if (a, b) == ('子', '丑'):
                    c['子丑合'] += 1
                    if monthB in '亥子丑' or sum(1 for x in brs if BRANCH_EL[x] in ('수', '금')) >= 3:
                        c['  └水로'] += 1
                    else:
                        c['  └土로'] += 1
                if (a, b) == ('巳', '申'):
                    c['巳申合'] += 1
                    nw = sum(1 for x in brs if BRANCH_EL[x] == '수')
                    ng = sum(1 for x in brs if BRANCH_EL[x] == '금')
                    c['  └水로' if nw > ng else '  └金로'] += 1
                if (a, b) == ('午', '未'):
                    # 육합이 깨지는가 — 子午沖 / 子未원진
                    if '子' in brs:
                        c['★午未合_깨짐'] += 1
                break

        # ── 3. 삼합 ────────────────────────────────────────────
        for s in SAMHAP:
            have = [x for x in s if x in brs]
            if len(have) == 3:
                c['삼합_셋다'] += 1
                if monthB in s:
                    c['  └월지에걸침(강)'] += 1
                else:
                    c['  └월지에안걸침'] += 1
            elif len(have) == 2:
                c['삼합_두글자'] += 1
                # 가합 = 왕지가 없는 두 글자 · 천간 투간이면 성립 (81쪽)
                if not any(x in WANGJI for x in have):
                    c['  └가합(왕지없음)'] += 1
                    el = SAMHAP_EL[''.join(s)]
                    if any(STEM_EL[x] == el for x in stems):
                        c['  ★└가합+투간→삼합' ] += 1

        # ── 4. 방합 ────────────────────────────────────────────
        for s in BANGHAP:
            if all(x in brs for x in s):
                c['방합_셋다'] += 1
                c['  └월지에걸침(강)' if monthB in s else '  └월지에안걸침2'] += 1

        # ── 5. 자화간합 · 암합 ──────────────────────────────────
        if (dayS, dayB) in JAHWA:
            c['★자화간합_일주'] += 1
        # 암합 — 亥午 · 卯申
        if '亥' in brs and '午' in brs:
            c['★암합_亥午'] += 1
        if '卯' in brs and '申' in brs:
            c['★암합_卯申'] += 1
        # 辰戌丑未 — 개고(형충)가 있어야 암합 인정
        toji = [x for x in brs if x in TOJI]
        if len(toji) >= 2:
            c['토지_둘이상'] += 1
            opened = any((x, y) in HYEONG or (y, x) in HYEONG or CHUNG.get(x) == y
                         for x, y in itertools.combinations(toji, 2))
            c['  ★└개고됨' if opened else '  └개고안됨'] += 1

        # 합이 많은가 (83쪽)
        nhap = sum(1 for a, b in CHEONGAN_HAP if a in stems and b in stems)
        nhap += sum(1 for a, b in YUKHAP if a in brs and b in brs)
        if nhap >= 3:
            c['★합이많음(3이상)'] += 1
        if nhap >= 2 and sum(1 for a, b in CHEONGAN_HAP if a in stems and b in stems) >= 1:
            c['천지합덕_후보'] += 1

    order = [
        ('1. 천간합 (78~79쪽)', [
            '천간합_있음', '천간합_붙어있음', '천간합_떨어짐',
            '★방해_극', '★방해_끼어듦', '★쟁합투합',
            '천간합_합화됨', '★합화안됨']),
        ('2. 육합 (80쪽)', [
            '육합_있음', '子丑合', '  └水로', '  └土로',
            '巳申合', '  └金로', '★午未合_깨짐']),
        ('3. 삼합 (80~81쪽)', [
            '삼합_셋다', '  └월지에걸침(강)', '  └월지에안걸침',
            '삼합_두글자', '  └가합(왕지없음)', '  ★└가합+투간→삼합']),
        ('4. 방합 (82쪽)', ['방합_셋다', '  └월지에안걸침2']),
        ('5. 자화간합·암합 (82~83쪽)', [
            '★자화간합_일주', '★암합_亥午', '★암합_卯申',
            '토지_둘이상', '  ★└개고됨', '  └개고안됨',
            '★합이많음(3이상)', '천지합덕_후보']),
    ]
    for title, keys in order:
        print(f'\n── {title} ' + '─' * max(0, 50 - len(title)))
        for k in keys:
            print(f'   {k:<24} {pct(c[k], N)}')

    print('\n' + '=' * 72)
    print('★ 표시 = 지금 코드가 판정하지 않는 자리입니다.')


if __name__ == '__main__':
    main()
