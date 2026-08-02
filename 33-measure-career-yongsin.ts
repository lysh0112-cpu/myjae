// 33-measure-career-yongsin.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  진로적성 용신에 «계절 치환» 을 넣으면 무엇이 달라지는가 — 자(尺)  │
// └───────────────────────────────────────────────────────────────┘
//
//  ★2026-08-02 — 진로적성 화면에 「중화신강 55%」와 「극신약」이 함께 떴습니다.
//    앞은 치환한 점수, 뒤는 본래 오행. ⇒ 같은 물음에 반대 답이었습니다.
//    대표님 확정으로 «진로적성만» 치환 점수를 쓰게 했습니다.
//
//  ⚠️ 이것은 «검사» 가 아니라 «자» 입니다. verify 체인에 넣지 마십시오.
//  쓰는 법   npm run measure:yongsin
//
//  [2026-08-02 처음 잰 값 — 다음에 견줄 잣대]
//     ★신강약이 바뀜 19.29%  ·  ★용신이 바뀜 29.03%  ·  격이 바뀜 0%
//     ⇒ 세 분 중 한 분의 용신이 달라집니다. ★진로적성 화면 «에서만» 입니다.
//
//  ⚠️ 다른 화면은 «건드리지 않았습니다» — 대표님 지시 「이미 프로그램된 대로」.
//     어느 화면이 어느 잣대를 쓰는지는 career/yongsin.ts 머리말에 적어 두었습니다.

import { calcYongsinNew } from '/home/claude/myjae/lib/saju/yongsinNew'
import { calcSimsanOhaeng, type Pillar } from '/home/claude/myjae/lib/saju/simsanOhaeng'
const GAN='甲乙丙丁戊己庚辛壬癸'.split(''), JI='子丑寅卯辰巳午未申酉戌亥'.split('')
const YS=new Set(['甲','丙','戊','庚','壬']), YB=new Set(['子','寅','辰','午','申','戌'])
const R=(n:number)=>Math.floor(Math.random()*n)
const one=()=>{for(;;){const s=GAN[R(10)],b=JI[R(12)]; if(YS.has(s)===YB.has(b)) return {s,b}}}
const SOLAR:Record<string,[number,number]>={寅:[2,20],卯:[3,20],辰:[4,20],巳:[5,20],午:[6,20],未:[7,20],申:[8,20],酉:[9,20],戌:[10,20],亥:[11,20],子:[12,20],丑:[1,20]}
let n=0, sFlip=0, yFlip=0, gFlip=0
const st:Record<string,number>={}
for(let i=0;i<200000;i++){
  const p=['년주','월주','일주','시주'].map(k=>{const x=one(); return {pillar:k,stem:x.s,branch:x.b}}) as Pillar[]
  const day=p[2].stem, mb=p[1].branch, hb=p[3].branch
  const [sm,sd]=SOLAR[mb]
  const a=calcYongsinNew(p as never, day)                                    // 지금 (본래 오행)
  const conv=calcSimsanOhaeng(p,sm,sd,hb,{purpose:'진로'})
  const b=calcYongsinNew(p as never, day, conv as never)                     // 후 (치환 점수)
  if(!a||!b) continue
  n++
  const A=a as unknown as {status:string;eokbu:{yongsin:string};gyeokguk:{name:string}}
  const B=b as unknown as {status:string;eokbu:{yongsin:string};gyeokguk:{name:string}}
  if(A.status!==B.status) sFlip++
  if(A.eokbu.yongsin!==B.eokbu.yongsin) yFlip++
  if(A.gyeokguk.name!==B.gyeokguk.name) gFlip++
  const k=A.status+'→'+B.status
  if(A.status!==B.status) st[k]=(st[k]??0)+1
}
const pc=(x:number)=>(x/n*100).toFixed(2)+'%'
console.log('임의 사주',n.toLocaleString(),'건 — 본래오행 ↔ 치환점수')
console.log('★신강약이 바뀜 :', pc(sFlip))
console.log('★용신이 바뀜   :', pc(yFlip))
console.log('★격이 바뀜     :', pc(gFlip))
console.log()
console.log('신강약 이동 :', Object.entries(st).sort((x,y)=>y[1]-x[1]).slice(0,6).map(([k,v])=>k+' '+pc(v)).join(' · '))
