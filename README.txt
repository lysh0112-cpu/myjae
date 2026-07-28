myjae - 2026-07-28 전달분
==========================

파일 두 개입니다. 폴더 없이 그대로 들어 있습니다.


[1] ohaengTrait.ts   ->   저장소의  lib/saju/ohaengTrait.ts  로 두십시오
------------------------------------------------------------------
교재 27~28쪽 「05 특정 오행 과다 시 나타나는 문제점」

 * career/ 안이 아닙니다. lib/saju/ 바로 밑입니다.
   사주분석/대운/세운/궁합/합격운/물상이 다 쓸 자료라
   byeongjon.ts, jijiTrait.ts 와 같은 자리입니다.

 * 아직 아무도 안 부릅니다. 넣어도 화면은 안 바뀝니다.

 * tsconfig.strict.json 의 include 에 한 줄 더하십시오
       "lib/saju/ohaengTrait.ts",
   넣고  npx tsc -p tsconfig.strict.json  ->  0건 확인했습니다.

 * 주의 - 火(화), 水(수) 의 original 은 교재와 글자가 다릅니다.
   병명을 저장소에 두지 않기로 정한 자리입니다 (대표님 지시).
   OCR 사고가 아니니 되살리지 마십시오. 파일 안 세 곳에 적어 두었습니다.
   검수 때 두 오행의 과다는 PDF 스캔(27, 28쪽)을 함께 보십시오.


[2] unused.py   ->   저장소 밖, hookcheck.py 와 같은 폴더에
------------------------------------------------------------------
3판입니다.

 * 2판이 지금 저장소 루트에 커밋돼 있습니다. 빼셔야 합니다.
       git rm --cached unused.py

 * 3판은 템플릿 문자열 안의 쓰임을 살립니다
       2판   lib/saju 75건 + app/api 55건 = 130건 (대부분 거짓)
       3판   lib/saju  7건 + app/api  3건 =  10건
   그중 진짜는 셋입니다
       samjae.ts BRANCHES / hapchungScore.ts STEM_EL / career/gyeyeol.ts toS
   나머지 일곱은 중첩 템플릿(백틱 안의 백틱)을 못 가려서 나는 거짓입니다.

 * 이 검사기는 거들 뿐입니다. 진짜 그물은
       npx tsc -p tsconfig.strict.json


다음에 할 일
------------------------------------------------------------------
1. 잣대 통일 - 글자 개수 잣대(과다 4개, 월지 끼면 3개)가 지금
   career/careerScore.ts 안에만 있습니다. simsanOhaeng.ts 로 올리십시오.
   이걸 먼저 하지 않고 표를 여섯 서비스에 이으면, 같은 사람이
   진로적성에서는 "화 과다", 사주분석에서는 "화 발달" 로 나옵니다.

2. ohaengGijil.ts 가 새 표를 함께 부르게 (지금은 GRADE_NOTE 한 줄만 나감)

3. 여섯 서비스에 잇기
   toTongbyeonInput / toCoupleTongbyeonInput / buildCareerPrompt
   mulsangTongbyeonPrompt / buildExamPrompt / monthlyFortune


연재쌤 확인
------------------------------------------------------------------
 * 木 발달의 "문과 70%, 이과 30%" - 나머지 네 오행에는 이 수치가 없습니다.
   교재 다른 쪽에 있는지 확인이 필요합니다.
 * 土 과다의 "독립적이고 명예 지향적이다" 를 과다 카드에 그대로 낼지.
