#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
교재 『명리적성 비법노트』(심산) 4장 격국 사례 열아홉을 돌려 보는 스크립트.

  ★격 판정(yongsinNew.calcGyeokguk)을 손대면 반드시 이걸로 다시 재십시오.
  ★19/19 가 나와야 합니다. 하나라도 틀리면 교재와 어긋난 것입니다.

  저장소 없이 혼자 돕니다.  python3 검증-격국사례19건.py

  2026-07-28 작성
"""
STEMS=list('甲乙丙丁戊己庚辛壬癸'); BRANCHES=list('子丑寅卯辰巳午未申酉戌亥')
STEM_EL=dict(zip(STEMS,['목','목','화','화','토','토','금','금','수','수']))
GEN={'수':'목','목':'화','화':'토','토':'금','금':'수'}; CON={'수':'화','화':'금','금':'목','목':'토','토':'수'}
YANG_STEM=set('甲丙戊庚壬')
JIJANGAN={'子':['壬','癸'],'丑':['癸','辛','己'],'寅':['戊','丙','甲'],'卯':['甲','乙'],
 '辰':['乙','癸','戊'],'巳':['戊','庚','丙'],'午':['丙','己','丁'],'未':['丁','乙','己'],
 '申':['戊','壬','庚'],'酉':['庚','辛'],'戌':['辛','丁','戊'],'亥':['戊','甲','壬']}
def sipsin(d,o):
    de,oe=STEM_EL[d],STEM_EL[o]; same=(d in YANG_STEM)==(o in YANG_STEM)
    if de==oe: return '비견' if same else '겁재'
    if GEN[de]==oe: return '식신' if same else '상관'
    if CON[de]==oe: return '편재' if same else '정재'
    if CON[oe]==de: return '편관' if same else '정관'
    return '편인' if same else '정인'

# ★대표님 확정 (2026-07-28) — 화토동법
GEONROK={'甲':'寅','乙':'卯','丙':'巳','丁':'午','戊':'巳','己':'午','庚':'申','辛':'酉','壬':'亥','癸':'子'}
YANGIN ={'甲':'卯','丙':'午','戊':'午','庚':'酉','壬':'子','己':'巳'}

def gyeok_new(saju, ds):
    mb=saju['월'][1]
    if YANGIN.get(ds)==mb: return '양인격'
    if GEONROK.get(ds)==mb: return '건록격'
    hid=JIJANGAN[mb]; others=[saju[p][0] for p in ('년','월','시')]
    bongi=hid[-1]; junggi=hid[1] if len(hid)==3 else None; yeogi=hid[0]
    if bongi in others: g=bongi
    elif junggi and junggi in others: g=junggi
    elif yeogi in others: g=yeogi
    else: g=bongi
    name=sipsin(ds,g)+'격'
    if name in ('비견격','겁재격'): return '무격'   # 157·178쪽 — 비견격·겁재격은 없다
    return name

CASES=[
 (158,('戊','戌'),('甲','辰'),('辛','巳'),('甲','午'),'편재격'),
 (158,('乙','巳'),('丁','酉'),('辛','亥'),('壬','午'),'정관격'),
 (158,('壬','午'),('庚','寅'),('己','未'),('癸','未'),'정인격'),
 (160,('乙','巳'),('壬','戌'),('丙','寅'),('甲','戌'),'식신격'),
 (162,('甲','辰'),('丁','未'),('丁','巳'),('戊','戌'),'상관격'),
 (165,('丙','申'),('乙','未'),('戊','戌'),('辛','亥'),'정재격'),
 (166,('丁','巳'),('庚','申'),('乙','卯'),('戊','辰'),'정재격'),
 (167,('己','亥'),('辛','酉'),('乙','卯'),('戊','辰'),'편재격'),
 (168,('己','巳'),('甲','子'),('戊','辰'),('己','酉'),'편재격'),
 (169,('癸','巳'),('丙','子'),('戊','子'),('乙','亥'),'정관격'),
 (170,('乙','亥'),('己','未'),('壬','寅'),('壬','申'),'정관격'),
 (171,('乙','酉'),('庚','辰'),('丙','午'),('壬','寅'),'편관격'),
 (173,('庚','辰'),('乙','巳'),('乙','亥'),('己','酉'),'정인격'),
 (176,('壬','辰'),('辛','巳'),('丁','丑'),('甲','寅'),'편인격'),
 (176,('丁','未'),('辛','亥'),('己','丑'),('戊','辰'),'편인격'),
 (179,('丙','寅'),('甲','午'),('辛','卯'),('辛','亥'),'양인격'),
 (179,('甲','申'),('庚','辰'),('乙','酉'),('乙','未'),'양인격'),
 (181,('甲','申'),('庚','辰'),('戊','申'),('壬','寅'),'건록격'),
 (181,('甲','申'),('庚','辰'),('乙','酉'),('乙','未'),'양인격'),
]
ok=0
print("교재 4장 격국 사례 19건 — 고친 뒤")
print("-"*72)
for p,si,il,wol,ny,ans in CASES:
    saju={'시':si,'일':il,'월':wol,'년':ny}; ds=il[0]
    g=gyeok_new(saju,ds); m='✅' if g==ans else '❌'
    if g==ans: ok+=1
    else: print(f"  {p}쪽 {''.join(si)} {''.join(il)} {''.join(wol)} {''.join(ny)}  교재 {ans} → {g} {m}")
print(f"\n  정답 {ok}/{len(CASES)}  ({ok/len(CASES)*100:.0f}%)")

# 양인일주 — 60갑자 안에서 일지가 일간의 양인인 것
YANG_BR=set('子寅辰午申戌')
print("\n양인일주 (일지가 일간의 양인)")
ilju=[d+b for d,b in YANGIN.items() if ((d in YANG_STEM)==(b in YANG_BR))]
for d,b in YANGIN.items():
    valid=(d in YANG_STEM)==(b in YANG_BR)
    print(f"   {d}{b}  {'✅ 60갑자에 있음' if valid else '— 60갑자에 없는 조합'}")
print(f"   → {' · '.join(sorted(ilju))}")

# 격 이름 분포 전수
from itertools import product
from collections import Counter
def month_stem(ys,mb):
    st={'甲':'丙','己':'丙','乙':'戊','庚':'戊','丙':'庚','辛':'庚','丁':'壬','壬':'壬','戊':'甲','癸':'甲'}[ys]
    return STEMS[(STEMS.index(st)+(BRANCHES.index(mb)-2)%12)%10]
def hour_stem(ds,hb):
    st={'甲':'甲','己':'甲','乙':'丙','庚':'丙','丙':'戊','辛':'戊','丁':'庚','壬':'庚','戊':'壬','癸':'壬'}[ds]
    return STEMS[(STEMS.index(st)+BRANCHES.index(hb))%10]
cnt=Counter(); tot=0
for ys,mb in product(STEMS,BRANCHES):
    ms=month_stem(ys,mb)
    for ds,db in product(STEMS,BRANCHES):
        if (STEMS.index(ds)-BRANCHES.index(db))%2: continue
        for hb in BRANCHES:
            hs=hour_stem(ds,hb)
            for yb in BRANCHES:
                if (STEMS.index(ys)-BRANCHES.index(yb))%2: continue
                saju={'년':(ys,yb),'월':(ms,mb),'일':(ds,db),'시':(hs,hb)}
                cnt[gyeok_new(saju,ds)]+=1; tot+=1
                break
print(f"\n격 이름 분포 (표본 {tot:,})")
for k,v in cnt.most_common(): print(f"   {k:<6} {v:>6,}  {v/tot*100:>5.1f}%")

# 록왕지가 아닌데 월지 본기가 비견·겁재라 「무격」이 되는 칸
print("\n★록왕지가 아니라 무격이 되는 칸 (전에는 비견격·겁재격이던 자리)")
from itertools import product
for d,b in product(STEMS,BRANCHES):
    s=sipsin(d,JIJANGAN[b][-1])
    if s in ('비견','겁재') and YANGIN.get(d)!=b and GEONROK.get(d)!=b:
        print(f"   {d} 일간 {b}월  본기 {JIJANGAN[b][-1]}={s}  → 무격")
