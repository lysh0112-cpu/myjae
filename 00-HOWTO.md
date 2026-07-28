# 넣는 법 — 2026-07-28 용신·격국 수정

## ⚠️ 지난번에 왜 빌드가 깨졌나

`changed-files/` 폴더가 **통째로 저장소에 커밋됐습니다.**
Next.js 가 그 안까지 타입 검사를 하면서 터졌습니다.

```
Type error: Module '"@/lib/saju/yongsinNew"' has no exported member 'NO_GYEOK'
  ./changed-files/app/manseryeok/birth-timing/lib/gyeokgukSungpae.ts:16
     ↑ 이 앞머리가 문제였습니다
```

상자 안 파일이 `@/lib/saju/yongsinNew` 를 찾는데, 그건 **덮어쓰이지 않은 옛 파일**이라
`NO_GYEOK` 이 없었던 것입니다. **코드는 멀쩡합니다.** 자리만 잘못 놓였습니다.

이번 압축은 **저장소 뿌리에 그대로 풀면 제자리에 들어가도록** 만들었습니다.

---

# 순서대로 하십시오

## ① 저장소에 들어간 상자를 먼저 지웁니다 ★반드시

```bash
cd myjae                       # package.json 있는 곳
git rm -r --cached changed-files
rm -rf changed-files
```

**이것만은 꼭 하셔야 합니다.** 안 지우면 새 파일을 넣어도 같은 자리에서 또 걸립니다.

## ② 새 파일을 풉니다

```bash
unzip -o ../myjae-src-20260728.zip
```

`-o` 는 묻지 않고 덮어쓰라는 뜻입니다.
**폴더가 새로 생기지 않고 기존 파일 일곱 개만 바뀝니다.** 압축 안에 `lib/` 와 `app/` 만 들어 있습니다.

## ③ 제대로 들어갔는지 확인

```bash
grep -c "NO_GYEOK" lib/saju/yongsinNew.ts     # ★2 가 나와야 합니다
ls changed-files 2>/dev/null                  # ★아무것도 안 나와야 합니다
git status --porcelain                        # ★ M 일곱 줄만 있어야 합니다
```

`①`이 `0` 이면 덮어쓰기가 안 된 것입니다. 그대로 올리면 지난번과 똑같이 깨집니다.

## ④ 검사하고 올립니다

```bash
npx tsc --noEmit --skipLibCheck    # 0건
npx next build                     # 통과
python3 ../04-verify-19-cases.py   # 19/19

git add -A
git commit -m "용신·격국 수정 — 교재 4장(139~183쪽) 반영"
git push
```

★검증에서 확인했습니다. 이 순서대로 하면 **타입 검사 0건**입니다.

---

## GitHub 웹으로 하신다면

**반드시 `yongsinNew.ts` 를 맨 먼저** 올리십시오. 나머지 여섯이 여기에 매달려 있습니다.

```
1  lib/saju/yongsinNew.ts                     ★이것부터
2  lib/saju/career/gyeokguk.ts
3  lib/saju/career/tables/gyeokguk.ts
4  lib/saju/career/tables/sinsal.ts
5  lib/saju/career/jobStructure.ts
6  app/manseryeok/result-new/YongsinCard.tsx
7  app/manseryeok/birth-timing/lib/gyeokgukSungpae.ts
```

그리고 웹 화면에서 `changed-files` 폴더를 지우십시오.

---

## 저장소에 다른 문서도 섞여 있습니다

지금 저장소 뿌리에 이런 것들이 함께 커밋돼 있습니다.

```
00-repo-survey-2026-07-28.md      01-yukchin-106-115.md
01-report-textbook-comparison.md  02-yukchin-116-131.md
02-report-changes-applied.md      03-jinro-126-139.md
03-yongsin-gyeokguk.patch         04-verify-19-cases.py
AB-fix.patch                      mulsang-fix.patch
README.md
```

⚠️ **이것들은 빌드를 깨지 않습니다.** `.md` 와 `.patch` 는 타입 검사를 안 받습니다.
위험한 것은 `changed-files/` 하나뿐입니다.

다만 교재 전사본(`01-yukchin-*`, `03-jinro-*`)처럼 **남겨 두실 뜻이 있는 것도 섞여 있어**
제가 함부로 지우시라고 말씀드리지 않겠습니다. 필요 없는 것만 골라 정리하십시오.
정리하실 거라면 `docs/` 같은 폴더로 옮겨 두는 편이 깔끔합니다.

---

## 넣은 뒤 눈으로 볼 것

격 이름이 바뀌므로 화면이 흔들립니다.

```
사주보기    격국용신 칸 · 세 용신 일치 카드 · 양인일주 태그
진로적성    「격과 그릇」 카드 · 무격일 때 카드가 비지 않는지
출산택일    성패 판정에서 무격이 보류로 빠지는지
궁합 · 합격운 · 물상
```

## 이 폴더의 문서

```
00-HOWTO.md                        지금 보고 계신 것
01-report-textbook-comparison.md   교재 4장 대조 리포트 (일치9·불일치5·누락11·충돌4)
02-report-changes-applied.md       무엇을 고쳤는지 · 화면이 어떻게 바뀌는지
                                   ⚠️ 5장에 교재와 부딪히는 자리 하나가 있습니다
03-yongsin-gyeokguk.patch          git 패치 (git apply 로 넣을 수도 있습니다)
04-verify-19-cases.py              교재 격국 사례 19건 검증 — 19/19 나와야 합니다
```

## ⚠️ 한 줄만 기억하십시오

`lib/saju/yongsinNew.ts` 의 `YANGIN_MONTH` 마지막 줄 `己: '巳'` 는
**교재 178쪽("음일간은 음인격이 없다")과 부딪히는 자리**입니다.
대표님 지시(火土同法)로 넣었습니다. 연재쌤 답이 오면 그 한 줄만 지우면 됩니다.
戊(양일간)는 아무 영향 없습니다.
