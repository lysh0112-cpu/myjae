# 용신·격국 수정 묶음 — 2026-07-28

```
저장소  https://github.com/lysh0112-cpu/myjae
바탕    커밋 기준 lib/saju/yongsinNew.ts 420줄 (33부 다음)
근거    『명리적성 비법노트』(심산) 4장 用神과 格  139~183쪽
```

⚠️ **파일 이름은 영문입니다.** 한글 이름이 업로드에서 걸려서 바꿨습니다. 내용은 그대로 한글입니다.

## 들어 있는 것

```
01-report-textbook-comparison.md   ★먼저 보십시오 — 교재 대조 리포트
      교재 4장에서 뽑은 데이터 + 코드와 1:1 대조
      일치 9 · 불일치 5 · 누락 11 · 교재 내부 충돌 4

02-report-changes-applied.md       수정 완료 보고서
      무엇을 어떻게 고쳤는지 · 손님 화면이 어떻게 바뀌는지
      ⚠️ 5장에 교재와 부딪히는 자리 하나가 적혀 있습니다. 꼭 보십시오

03-yongsin-gyeokguk.patch          git 패치 (7파일 · +287 / -64)

04-verify-19-cases.py              ★검증 스크립트
      교재 4장 격국 사례 열아홉을 돌려 봅니다
      저장소도 파이썬 패키지도 필요 없이 혼자 돕니다

changed-files/                     고친 파일 일곱 개 전문
      저장소 구조 그대로입니다 (lib/ 와 app/)
```

## 넣는 법

```bash
git clone --depth 1 https://github.com/lysh0112-cpu/myjae.git
cd myjae
git apply ../03-yongsin-gyeokguk.patch
```

패치가 안 먹으면 `changed-files/` 를 같은 경로에 덮어쓰십시오.

```bash
cp -r changed-files/lib  myjae/
cp -r changed-files/app  myjae/
```

## 넣은 뒤 반드시

```bash
python3 04-verify-19-cases.py         # 19/19 나와야 합니다
npx tsc --noEmit --skipLibCheck       # 0건
npx next build                        # 통과
```

**그리고 여섯 화면을 눈으로 확인하십시오.** 격 이름이 바뀌므로 구조가 흔들립니다.

```
사주보기    격국용신 칸 · 세 용신 일치 카드 · 양인일주 태그
진로적성    「격과 그릇」 카드 · 무격일 때 카드가 비지 않는지
출산택일    성패 판정에서 무격이 보류로 빠지는지
궁합 · 합격운 · 물상
```

## 고친 파일 일곱

```
lib/saju/yongsinNew.ts                     록왕지 표 · 무격 · checkAgree · isYanginIlju
lib/saju/career/gyeokguk.ts                중복 특례 걷어냄 (엔진이 직접 잡음)
lib/saju/career/tables/gyeokguk.ts         비견격·겁재격 삭제 · 무격 추가
lib/saju/career/tables/sinsal.ts           「양인살」 → 「양인일주」 이름 정정
lib/saju/career/jobStructure.ts            격 흐릿 판정을 무격 기준으로
app/manseryeok/result-new/YongsinCard.tsx  상신 사본 정리 · 일치 카드 · 양인일주 태그
app/manseryeok/birth-timing/lib/gyeokgukSungpae.ts   case 정리 · 무격 보류
```

## ⚠️ 한 줄만 기억하십시오

`lib/saju/yongsinNew.ts` 의 `YANGIN_MONTH` 마지막 줄 `己: '巳'` 는
**교재 178쪽("음일간은 음인격이 없다")과 부딪히는 자리**입니다.

대표님 지시(火土同法)로 넣었습니다. 연재쌤 답이 오면 그 한 줄만 지우면 원래대로 돌아갑니다.
戊(양일간)는 아무 영향 없습니다.

## 검증 스크립트를 남기는 까닭

31부의 「하늘도마뱀 18사례」가 대운을 지키는 그물이라면,
`04-verify-19-cases.py` 는 **격을 지키는 그물**입니다.

격 판정을 손대는 사람이 반드시 이걸 먼저 돌리도록,
다음 인수인계서의 검증 명령 목록에 한 줄 넣어 두시기를 권합니다.
