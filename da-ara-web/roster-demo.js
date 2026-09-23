/* ═══════════════════════════════════════════════════════════
   다알아 (Da-Ara) — 조합원 명부 (가상 시연 데이터)
   ───────────────────────────────────────────────────────────
   ★ 전부 가짜입니다. 실제 조합원과 아무 관계가 없습니다.
     이름·연락처·지번·감정평가액 모두 무작위로 만든 값입니다.

   ★ 실제 명부를 절대 이 파일에 넣지 마십시오.
     이 파일은 인터넷에 공개된 폴더에 있습니다. 누구나 내려받을 수 있습니다.
     진짜 명부는 Supabase 의 daara_registry 스키마에 두고,
     서버 로그인을 거친 사람에게만 내려보내야 합니다.

   ★ 시연용 규칙
     · 인증번호(암호)는 전원 111111
     · 이름과 휴대폰번호가 명부와 맞으면 조합원으로 로그인
     · 맞지 않으면 일반회원으로 로그인 (기존 테스트 모드)

   금액 단위 : 만원   면적 단위 : ㎡
   ═══════════════════════════════════════════════════════════ */

const ROSTER_PW = "111111";          /* 시연용 공통 암호 */

const ROSTER = [
  {no:1, name:"심진자", phone:"010-7617-5081", addr:"미아동 601-73", type:"근린생활시설", land:193.0, bldg:215.4, appraisal:104200, want:101, joined:false},
  {no:2, name:"안지은", phone:"010-8023-4170", addr:"미아동 670-71", type:"단독주택", land:97.3, bldg:126.1, appraisal:50200, want:114, joined:false},
  {no:3, name:"서우은", phone:"010-5393-1736", addr:"미아동 430-119", type:"공동주택", land:129.6, bldg:221.6, appraisal:71700, want:84, joined:true},
  {no:4, name:"박윤숙", phone:"010-8088-1786", addr:"미아동 551-100", type:"다가구", land:85.0, bldg:95.6, appraisal:39700, want:59, joined:false},
  {no:5, name:"임선영", phone:"010-8836-7698", addr:"미아동 425-64", type:"단독주택", land:52.4, bldg:51.6, appraisal:23300, want:84, joined:false},
  {no:6, name:"양민용", phone:"010-6863-1355", addr:"미아동 679-14", type:"다가구", land:162.8, bldg:241.9, appraisal:97100, want:84, joined:false},
  {no:7, name:"안진서", phone:"010-5071-9984", addr:"미아동 624-68", type:"근린생활시설", land:148.0, bldg:227.4, appraisal:80000, want:84, joined:false},
  {no:8, name:"안선정", phone:"010-2347-1066", addr:"미아동 612-95", type:"다가구", land:125.5, bldg:177.0, appraisal:69600, want:59, joined:false},
  {no:9, name:"황시희", phone:"010-7414-8277", addr:"미아동 423-18", type:"공동주택", land:132.9, bldg:104.9, appraisal:61400, want:84, joined:false},
  {no:10, name:"강윤우", phone:"010-8642-5423", addr:"미아동 620-86", type:"근린생활시설", land:171.8, bldg:172.5, appraisal:103500, want:59, joined:true},
  {no:11, name:"정예서", phone:"010-9592-8050", addr:"미아동 416-71", type:"공동주택", land:64.6, bldg:88.8, appraisal:34800, want:84, joined:true},
  {no:12, name:"안도규", phone:"010-8079-8897", addr:"미아동 451-40", type:"공동주택", land:72.1, bldg:71.4, appraisal:43700, want:84, joined:true},
  {no:13, name:"박수석", phone:"010-7420-5726", addr:"미아동 445-74", type:"단독주택", land:42.6, bldg:71.7, appraisal:23300, want:84, joined:false},
  {no:14, name:"전민철", phone:"010-3146-5973", addr:"미아동 681-49", type:"공동주택", land:191.2, bldg:310.6, appraisal:89600, want:84, joined:false},
  {no:15, name:"윤예희", phone:"010-7880-3173", addr:"미아동 491-13", type:"다세대", land:193.3, bldg:175.1, appraisal:83700, want:84, joined:false},
  {no:16, name:"오예정", phone:"010-5474-7781", addr:"미아동 487-89", type:"공동주택", land:51.8, bldg:91.2, appraisal:23200, want:59, joined:true},
  {no:17, name:"윤영서", phone:"010-4964-9148", addr:"미아동 572-89", type:"다세대", land:35.3, bldg:43.1, appraisal:20500, want:84, joined:false},
  {no:18, name:"조성은", phone:"010-5095-8264", addr:"미아동 614-54", type:"근린생활시설", land:185.2, bldg:199.3, appraisal:89300, want:84, joined:false},
  {no:19, name:"권선희", phone:"010-8340-7870", addr:"미아동 453-116", type:"단독주택", land:166.5, bldg:135.8, appraisal:93200, want:84, joined:false},
  {no:20, name:"조영희", phone:"010-6342-5056", addr:"미아동 504-76", type:"단독주택", land:82.1, bldg:56.0, appraisal:47600, want:84, joined:false},
  {no:21, name:"최현호", phone:"010-8306-6753", addr:"미아동 602-4", type:"단독주택", land:176.4, bldg:212.3, appraisal:76100, want:59, joined:true},
  {no:22, name:"권예진", phone:"010-9784-1397", addr:"미아동 577-50", type:"다가구", land:189.7, bldg:176.7, appraisal:100000, want:84, joined:true},
  {no:23, name:"홍윤철", phone:"010-8858-8591", addr:"미아동 603-28", type:"공동주택", land:66.5, bldg:117.1, appraisal:29200, want:59, joined:false},
  {no:24, name:"장준우", phone:"010-6746-1398", addr:"미아동 674-56", type:"근린생활시설", land:55.9, bldg:47.4, appraisal:31600, want:59, joined:true},
  {no:25, name:"이재석", phone:"010-8461-2695", addr:"미아동 648-101", type:"다가구", land:122.3, bldg:168.1, appraisal:55900, want:84, joined:true},
  {no:26, name:"김우철", phone:"010-4312-7489", addr:"미아동 657-33", type:"근린생활시설", land:57.0, bldg:42.8, appraisal:31400, want:84, joined:true},
  {no:27, name:"배선호", phone:"010-2819-5861", addr:"미아동 480-50", type:"다세대", land:141.9, bldg:194.4, appraisal:81400, want:59, joined:true},
  {no:28, name:"오윤환", phone:"010-2017-2739", addr:"미아동 561-9", type:"다세대", land:65.5, bldg:43.2, appraisal:34400, want:114, joined:false},
  {no:29, name:"양선은", phone:"010-3341-4275", addr:"미아동 524-67", type:"다가구", land:137.5, bldg:99.2, appraisal:77500, want:59, joined:true},
  {no:30, name:"김시철", phone:"010-5026-6327", addr:"미아동 619-43", type:"다세대", land:175.7, bldg:187.4, appraisal:93100, want:84, joined:false},
  {no:31, name:"안시규", phone:"010-9675-8650", addr:"미아동 550-80", type:"근린생활시설", land:116.8, bldg:140.2, appraisal:59000, want:84, joined:false},
  {no:32, name:"최진길", phone:"010-9366-3868", addr:"미아동 408-24", type:"근린생활시설", land:36.7, bldg:63.2, appraisal:18800, want:114, joined:true},
  {no:33, name:"양성영", phone:"010-4358-9419", addr:"미아동 527-12", type:"다가구", land:40.4, bldg:61.2, appraisal:17700, want:59, joined:false},
  {no:34, name:"황재수", phone:"010-3794-1909", addr:"미아동 439-30", type:"단독주택", land:77.3, bldg:60.2, appraisal:46400, want:59, joined:false},
  {no:35, name:"문하규", phone:"010-9586-1014", addr:"미아동 406-70", type:"근린생활시설", land:177.9, bldg:275.4, appraisal:91800, want:59, joined:false},
  {no:36, name:"최선수", phone:"010-8280-1707", addr:"미아동 587-102", type:"근린생활시설", land:143.0, bldg:222.2, appraisal:68700, want:59, joined:true},
  {no:37, name:"전수연", phone:"010-5953-8965", addr:"미아동 508-70", type:"공동주택", land:115.4, bldg:129.8, appraisal:54900, want:84, joined:false},
  {no:38, name:"오태희", phone:"010-4695-7447", addr:"미아동 439-78", type:"단독주택", land:111.0, bldg:95.1, appraisal:63500, want:114, joined:false},
  {no:39, name:"심은영", phone:"010-4776-3131", addr:"미아동 534-59", type:"다가구", land:116.3, bldg:164.6, appraisal:68100, want:84, joined:false},
  {no:40, name:"안선우", phone:"010-5175-4445", addr:"미아동 440-2", type:"단독주택", land:105.5, bldg:115.9, appraisal:61900, want:59, joined:true},
  {no:41, name:"문태서", phone:"010-9428-2071", addr:"미아동 502-115", type:"단독주택", land:56.0, bldg:76.6, appraisal:28900, want:101, joined:false},
  {no:42, name:"조시환", phone:"010-4136-9567", addr:"미아동 420-9", type:"다세대", land:184.9, bldg:282.8, appraisal:81600, want:101, joined:true},
  {no:43, name:"심현희", phone:"010-5219-7026", addr:"미아동 411-67", type:"근린생활시설", land:130.0, bldg:94.5, appraisal:62300, want:84, joined:false},
  {no:44, name:"한준정", phone:"010-6426-9209", addr:"미아동 514-41", type:"다세대", land:101.0, bldg:102.3, appraisal:49100, want:59, joined:false},
  {no:45, name:"이은준", phone:"010-8641-8274", addr:"미아동 479-73", type:"다가구", land:144.0, bldg:257.9, appraisal:69100, want:59, joined:false},
  {no:46, name:"조현아", phone:"010-4707-4591", addr:"미아동 626-105", type:"다세대", land:146.0, bldg:129.9, appraisal:73600, want:84, joined:false},
  {no:47, name:"양영은", phone:"010-7068-9645", addr:"미아동 562-114", type:"단독주택", land:106.0, bldg:95.7, appraisal:56900, want:84, joined:true},
  {no:48, name:"권수연", phone:"010-5427-9128", addr:"미아동 587-112", type:"근린생활시설", land:144.8, bldg:218.4, appraisal:69400, want:59, joined:false},
  {no:49, name:"손하진", phone:"010-3813-7327", addr:"미아동 443-97", type:"단독주택", land:194.0, bldg:250.8, appraisal:95400, want:84, joined:false},
  {no:50, name:"권민철", phone:"010-5958-7446", addr:"미아동 455-14", type:"다가구", land:116.0, bldg:133.1, appraisal:69800, want:59, joined:false},
  {no:51, name:"손윤우", phone:"010-2055-9302", addr:"미아동 565-106", type:"단독주택", land:78.1, bldg:106.6, appraisal:43700, want:84, joined:false},
  {no:52, name:"황영아", phone:"010-2295-2463", addr:"미아동 534-66", type:"공동주택", land:158.7, bldg:154.4, appraisal:91700, want:84, joined:false},
  {no:53, name:"문도희", phone:"010-6635-4890", addr:"미아동 536-69", type:"근린생활시설", land:155.4, bldg:115.9, appraisal:81200, want:84, joined:false},
  {no:54, name:"권선수", phone:"010-9783-8537", addr:"미아동 576-108", type:"공동주택", land:138.6, bldg:204.2, appraisal:75800, want:59, joined:true},
  {no:55, name:"고은영", phone:"010-5130-7622", addr:"미아동 515-2", type:"단독주택", land:68.2, bldg:81.2, appraisal:30200, want:101, joined:true},
  {no:56, name:"박도자", phone:"010-7786-8186", addr:"미아동 440-110", type:"공동주택", land:67.2, bldg:112.0, appraisal:34400, want:101, joined:false},
  {no:57, name:"유우연", phone:"010-5552-6257", addr:"미아동 469-90", type:"다가구", land:175.2, bldg:267.7, appraisal:88700, want:84, joined:true},
  {no:58, name:"정윤정", phone:"010-9355-3302", addr:"미아동 625-72", type:"단독주택", land:95.5, bldg:131.0, appraisal:44100, want:84, joined:true},
  {no:59, name:"문영준", phone:"010-5342-4614", addr:"미아동 554-7", type:"공동주택", land:117.8, bldg:210.2, appraisal:57100, want:59, joined:true},
  {no:60, name:"윤선철", phone:"010-5033-7173", addr:"미아동 464-25", type:"공동주택", land:44.0, bldg:28.7, appraisal:23800, want:59, joined:true},
  {no:61, name:"유현정", phone:"010-6611-1225", addr:"미아동 632-113", type:"다세대", land:167.7, bldg:181.2, appraisal:78900, want:59, joined:false},
  {no:62, name:"최시호", phone:"010-5294-3129", addr:"미아동 423-57", type:"다가구", land:39.5, bldg:63.0, appraisal:18800, want:84, joined:false},
  {no:63, name:"황영석", phone:"010-3151-2606", addr:"미아동 522-51", type:"다세대", land:101.4, bldg:102.1, appraisal:54400, want:59, joined:true},
  {no:64, name:"허예준", phone:"010-5972-1098", addr:"미아동 408-76", type:"공동주택", land:147.1, bldg:199.2, appraisal:80600, want:59, joined:false},
  {no:65, name:"박수진", phone:"010-3333-4369", addr:"미아동 525-41", type:"단독주택", land:186.3, bldg:250.4, appraisal:90000, want:59, joined:false},
  {no:66, name:"정재진", phone:"010-6356-1708", addr:"미아동 684-95", type:"근린생활시설", land:113.0, bldg:169.3, appraisal:55900, want:59, joined:false},
  {no:67, name:"박진준", phone:"010-6743-7765", addr:"미아동 455-19", type:"다세대", land:114.1, bldg:161.8, appraisal:49100, want:114, joined:false},
  {no:68, name:"백현준", phone:"010-5466-1864", addr:"미아동 605-46", type:"단독주택", land:48.3, bldg:70.5, appraisal:26500, want:84, joined:false},
  {no:69, name:"조수아", phone:"010-2214-9815", addr:"미아동 409-44", type:"다세대", land:141.8, bldg:97.3, appraisal:78100, want:84, joined:false},
  {no:70, name:"오서준", phone:"010-3097-5340", addr:"미아동 620-34", type:"다가구", land:139.9, bldg:110.7, appraisal:78600, want:84, joined:false},
  {no:71, name:"황수희", phone:"010-3737-8109", addr:"미아동 657-83", type:"근린생활시설", land:123.5, bldg:191.9, appraisal:55000, want:114, joined:true},
  {no:72, name:"남수정", phone:"010-7157-1925", addr:"미아동 572-72", type:"다가구", land:55.8, bldg:47.7, appraisal:31800, want:84, joined:true},
  {no:73, name:"고태용", phone:"010-7483-1577", addr:"미아동 573-41", type:"다가구", land:158.4, bldg:172.3, appraisal:81700, want:84, joined:false},
  {no:74, name:"전하수", phone:"010-2144-9017", addr:"미아동 585-45", type:"공동주택", land:168.0, bldg:154.5, appraisal:100400, want:59, joined:false},
  {no:75, name:"권준진", phone:"010-4402-7621", addr:"미아동 659-116", type:"근린생활시설", land:143.6, bldg:112.5, appraisal:84900, want:59, joined:false},
  {no:76, name:"서현정", phone:"010-3278-6235", addr:"미아동 530-24", type:"다세대", land:71.5, bldg:75.2, appraisal:43000, want:84, joined:true},
  {no:77, name:"정윤길", phone:"010-8258-2433", addr:"미아동 477-85", type:"다가구", land:60.5, bldg:60.8, appraisal:32800, want:84, joined:true},
  {no:78, name:"고지규", phone:"010-3029-9201", addr:"미아동 489-75", type:"근린생활시설", land:50.2, bldg:59.5, appraisal:23200, want:59, joined:false},
  {no:79, name:"윤재석", phone:"010-3719-8770", addr:"미아동 590-28", type:"단독주택", land:122.8, bldg:202.5, appraisal:61100, want:114, joined:true},
  {no:80, name:"심재호", phone:"010-6547-2685", addr:"미아동 681-15", type:"다가구", land:107.2, bldg:165.6, appraisal:62400, want:59, joined:true},
  {no:81, name:"박하용", phone:"010-6164-3904", addr:"미아동 612-38", type:"다세대", land:172.3, bldg:110.1, appraisal:95600, want:84, joined:true},
  {no:82, name:"심준수", phone:"010-8306-8241", addr:"미아동 654-29", type:"다세대", land:168.4, bldg:169.7, appraisal:101800, want:59, joined:false},
  {no:83, name:"백영영", phone:"010-9282-5242", addr:"미아동 421-75", type:"다세대", land:135.4, bldg:127.4, appraisal:66100, want:84, joined:true},
  {no:84, name:"오영석", phone:"010-9906-8905", addr:"미아동 428-89", type:"근린생활시설", land:89.2, bldg:148.7, appraisal:49100, want:114, joined:false},
  {no:85, name:"신준수", phone:"010-8805-2230", addr:"미아동 688-27", type:"공동주택", land:130.7, bldg:85.7, appraisal:59300, want:59, joined:true},
  {no:86, name:"장준준", phone:"010-4996-2957", addr:"미아동 527-90", type:"공동주택", land:90.4, bldg:76.6, appraisal:45000, want:59, joined:true},
  {no:87, name:"허진환", phone:"010-4367-2173", addr:"미아동 677-40", type:"공동주택", land:185.9, bldg:239.4, appraisal:86900, want:101, joined:false},
  {no:88, name:"조은자", phone:"010-9167-1398", addr:"미아동 545-40", type:"다가구", land:172.6, bldg:246.3, appraisal:103400, want:59, joined:false},
  {no:89, name:"강현진", phone:"010-6881-5392", addr:"미아동 601-67", type:"근린생활시설", land:176.8, bldg:111.7, appraisal:99200, want:59, joined:false},
  {no:90, name:"강태길", phone:"010-5978-6756", addr:"미아동 482-28", type:"공동주택", land:77.0, bldg:138.2, appraisal:37000, want:84, joined:true},
  {no:91, name:"남은우", phone:"010-7226-6477", addr:"미아동 462-63", type:"단독주택", land:187.7, bldg:193.7, appraisal:83800, want:101, joined:true},
  {no:92, name:"배도희", phone:"010-4816-8109", addr:"미아동 686-93", type:"공동주택", land:173.4, bldg:193.5, appraisal:81400, want:59, joined:false},
  {no:93, name:"윤현용", phone:"010-6051-6395", addr:"미아동 481-105", type:"단독주택", land:86.6, bldg:98.6, appraisal:37600, want:59, joined:false},
  {no:94, name:"서선진", phone:"010-8598-1745", addr:"미아동 445-46", type:"다세대", land:178.1, bldg:287.3, appraisal:97100, want:59, joined:true},
  {no:95, name:"심수석", phone:"010-4294-6127", addr:"미아동 506-49", type:"다세대", land:115.6, bldg:187.7, appraisal:51500, want:101, joined:true},
  {no:96, name:"조선자", phone:"010-6050-9716", addr:"미아동 446-50", type:"다가구", land:154.4, bldg:118.6, appraisal:70500, want:84, joined:true},
  {no:97, name:"임영정", phone:"010-5030-3268", addr:"미아동 591-59", type:"다가구", land:36.0, bldg:52.0, appraisal:19100, want:101, joined:true},
  {no:98, name:"임도길", phone:"010-2956-1709", addr:"미아동 661-112", type:"근린생활시설", land:183.7, bldg:310.1, appraisal:100200, want:59, joined:true},
  {no:99, name:"한예연", phone:"010-7877-3496", addr:"미아동 594-55", type:"단독주택", land:100.6, bldg:80.8, appraisal:53800, want:59, joined:true},
  {no:100, name:"배현철", phone:"010-3153-6405", addr:"미아동 588-5", type:"공동주택", land:124.4, bldg:156.2, appraisal:66000, want:84, joined:false}
];


/* ═══════════════════════════════════════════════════════════
   소유 물건 (property)
   ───────────────────────────────────────────────────────────
   ★ 조합원 한 분이 여러 필지를 가진 경우가 흔하다.
     한 줄에 물건 하나만 담으면 동의율 계산이 틀어진다.
     그래서 조합원과 물건을 나눈다.

       조합원(ROSTER)   번호 · 성명 · 연락처 · 대표조합원
       소유 물건(PROPS) 번호 · 지번 · 지목 · 대지면적 · 지분 · 소유구분
                        + 동 · 호수 (재건축용)

   ★ 재건축은 동별 과반수를 따로 본다.
     한 동이 통째로 반대하면 전체 동의율이 아무리 높아도 안 된다.
     그래서 물건에 동 정보를 담아 둔다.
     재개발에서는 비워 두면 된다.

   ★ 면적의 의미가 사업마다 다르다.
       재개발  필지 면적       미아동 403-1  82.5㎡
       재건축  대지권 지분     101동 502호   45.3㎡
     넣는 자리는 같아서 계산은 그대로 쓴다. 화면 이름만 달라진다.

   ★ 면적은 대지면적 × 지분을 다 더한다.
     한 필지 100㎡ 를 둘이 반씩 가졌으면 각각 50㎡ 다.
     대표조합원이 100㎡ 를 다 가진 것으로 세면 안 된다.

   ★ 건물만 소유한 분이 있다.
     남의 땅에 건물만 가진 경우로, 사람 수에는 들어가지만 면적은 0이다.
     이걸 빼먹으면 요건 계산이 어긋난다.

   ★ 국공유지는 소유자가 지자체라 동의 대상이 아니다.
     구역 면적에는 들어가지만 동의 모수에서는 빼야 한다.

   ★ Supabase 대응 : daara_registry.property
   ═══════════════════════════════════════════════════════════ */
const OWN_KINDS = ["토지+건물", "토지만", "건물만"];

/* 지분 문자열을 숫자로 — "1/2" → 0.5 */
function shareVal(s){
  if(!s) return 1;
  const m = String(s).match(/^(\d+)\s*\/\s*(\d+)$/);
  if(m) return Number(m[2]) ? Number(m[1]) / Number(m[2]) : 1;
  const v = Number(s);
  return isNaN(v) ? 1 : (v > 1 ? v / 100 : v);
}

let PROPS = [];

/* 조합원의 물건 목록 */
const propsOf = no => PROPS.filter(p => p.no === no);

/* 조합원의 동의 산정 면적 — 지분을 곱해 더한다 */
function ownArea(no){
  return Math.round(propsOf(no)
    .filter(p => p.kind !== "건물만")
    .reduce((a, p) => a + (p.area || 0) * shareVal(p.share), 0) * 10) / 10;
}
/* 동 목록 — 재건축에서만 값이 있다 */
const dongList = () => [...new Set(PROPS.filter(p => p.dong).map(p => p.dong))].sort();
/* 그 동에 속한 조합원 번호 */
const dongMembers = d => [...new Set(PROPS.filter(p => p.dong === d && p.no > 0).map(p => p.no))];

/* 구역 전체 동의 모수 면적 — 국공유지는 뺀다 */
function totalArea(){
  return Math.round(PROPS
    .filter(p => p.kind !== "건물만" && !p.public)
    .reduce((a, p) => a + (p.area || 0) * shareVal(p.share), 0) * 10) / 10;
}

/* ── 지분 · 대표조합원 ─────────────────────────────────────
   ★ 한 부동산을 부부나 형제가 나눠 가진 경우(공유),
     두 사람 다 명부에는 오르지만 의결권은 대표 1인에게만 있다.

     이걸 잘못 잡으면 총회 정족수가 통째로 틀어진다.
     전자투표 · 설문 · 집계가 모두 이 모수를 쓰기 때문이다.

   ★ 그래서 모수는 ROSTER.length 가 아니라 VOTER_N() 을 쓴다.
     명부 인원 ≠ 의결권자 수.
   ───────────────────────────────────────────────────────── */
ROSTER.forEach(r => { r.share = "1/1"; r.rep = true; });

/* 공유 물건 세 쌍 — 뒷사람이 앞사람과 같은 물건을 반씩 가진다 */
[[18,19],[37,38],[55,56]].forEach(([a,b]) => {
  const A = ROSTER.find(x=>x.no===a), B = ROSTER.find(x=>x.no===b);
  if(!A || !B) return;
  B.addr = A.addr; B.type = A.type;
  B.land = A.land; B.bldg = A.bldg;
  B.appraisal = A.appraisal;          /* 물건이 같으므로 평가액도 같다 */
  A.share = "1/2"; B.share = "1/2";
  A.rep = true;                       /* 대표는 앞사람 */
  B.rep = false;                      /* 뒷사람은 의결권 없음 */
});

/* 의결권자 = 대표조합원. 정족수와 집계의 모수는 이것이다. */
const VOTERS  = () => ROSTER.filter(r => r.rep);
const VOTER_N = () => VOTERS().length;

/* ── 소유 물건 만들기 (가상) ───────────────────────────────
   실제로는 조합에서 받은 엑셀에서 읽어 온다.
   여기서는 명부에서 만들어 내되, 실제 구역처럼
   여러 필지를 가진 분과 건물만 가진 분을 섞어 둔다. */
(function buildProps(){
  const rnd = _rng(20260821);
  const jimok = ["대", "대", "대", "도로", "잡종지"];
  ROSTER.forEach(r => {
    const many = rnd() < 0.18;                 /* 18% 는 필지가 여럿 */
    const onlyBld = rnd() < 0.06;              /* 6% 는 건물만 소유 */
    if(onlyBld){
      PROPS.push({no:r.no, addr:r.addr, jimok:"대", area:0,
        share:"1/1", kind:"건물만", bldg:r.bldg, public:false, dong:"", ho:""});
      return;
    }
    if(many){
      /* 본 필지 + 딸린 필지 한둘 */
      const n = 1 + Math.floor(rnd() * 2) + 1;
      let left = r.land;
      for(let i = 0; i < n; i++){
        const last = i === n - 1;
        const a = last ? Math.round(left * 10) / 10
                       : Math.round(left * (0.35 + rnd() * 0.3) * 10) / 10;
        left = Math.round((left - a) * 10) / 10;
        PROPS.push({no:r.no,
          addr: i === 0 ? r.addr : r.addr.replace(/-\d+$/, "-" + (100 + i * 7)),
          jimok: jimok[Math.floor(rnd() * jimok.length)],
          area: a, share: i === 0 ? r.share : "1/1",
          kind: i === 0 ? "토지+건물" : "토지만",
          bldg: i === 0 ? r.bldg : 0, public:false, dong:"", ho:""});
        if(left <= 0) break;
      }
      return;
    }
    PROPS.push({no:r.no, addr:r.addr, jimok:"대", area:r.land,
      share:r.share, kind:"토지+건물", bldg:r.bldg, public:false,
      dong:"", ho:""});          /* 재개발이라 비워 둔다 */
  });

  /* 공유 물건은 같은 지번을 반씩 나눠 갖는다.
     ★ 한쪽이 '건물만' 으로 잡히면 면적이 0이 되어 지분 계산이 깨진다.
       공유 필지는 양쪽 다 토지를 가진 것으로 맞춘다. */
  [[18,19],[37,38],[55,56]].forEach(([a,b])=>{
    PROPS = PROPS.filter(p => p.no !== b);           /* 뒷사람 물건을 다시 만든다 */
    const pa = PROPS.find(p => p.no === a);
    if(!pa) return;
    pa.kind = "토지+건물"; pa.share = "1/2";
    if(!pa.area) pa.area = 120.0;
    PROPS.push({no:b, addr:pa.addr, jimok:pa.jimok, area:pa.area,
      share:"1/2", kind:"토지만", bldg:0, public:false, dong:pa.dong||"", ho:""});
  });

  /* 국공유지 — 도로 · 구거. 소유자가 지자체라 동의 대상이 아니다. */
  PROPS.push({no:0, addr:"미아동 도로 일원", jimok:"도로", area:18420.0,
    share:"1/1", kind:"토지만", bldg:0, public:true, dong:"", ho:"",
    owner:"서울특별시 강북구"});
  PROPS.push({no:0, addr:"미아동 구거 일원", jimok:"구거", area:2610.0,
    share:"1/1", kind:"토지만", bldg:0, public:true, dong:"", ho:"", owner:"국"});
})();

/* ═══════════════════════════════════════════════════════════
   총회 · 안건 · 투표 (가상 시연 데이터)
   ───────────────────────────────────────────────────────────
   ★ 조합원 앱(index.html)과 관리자 화면(admin.html)이
     이 파일 하나를 함께 보므로 숫자가 항상 일치한다.

   ★ Supabase 로 옮길 때의 대응
       DEMO_MEETING          → meetings   (총회 마스터)
       DEMO_MEETING.agendas  → agendas    (안건)
       DEMO_VOTES            → votes      (통합 투표 로그)
       DEMO_WITHDRAWALS      → withdrawals(철회 신청)

   ★ 집계는 status === 'active' 인 표만 센다.
     철회된 표는 지우지 않고 'withdrawn' 으로 남긴다.
     지운 기록은 나중에 아무것도 증명하지 못한다.
   ═══════════════════════════════════════════════════════════ */

/* 총회 마스터 + 안건 */
const DEMO_MEETING = {
  meeting_id : "M-2026-01",
  tenant_id  : "MIA-002",
  title      : "2026년 정기총회",
  /* ★ 정기와 임시는 성격이 다르다.
     정기는 연 1회 정해진 것이고, 임시는 필요할 때 소집한다.
     소집 절차와 통지 기한도 달라 구분해 둔다. */
  kind       : "정기총회",
  meet_date  : "2026-03-20",
  place      : "강북구민회관 대강당",
  vote_open  : "2026-03-10 09:00",
  vote_close : "2026-03-19 17:00",
  status     : "open",                 /* draft 대기 · open 진행중 · closed 마감 */
  agendas: [
    {agenda_id:"A1", no:1, title:"사업시행계획 변경의 건",
     is_vote:true,  quorum_pass:"조합원 과반수 찬성",
     quorum_base:"members",    /* 모수 = 전체 조합원 */ quorum_attend:20,
     law_ref:"도시정비법 제45조 제4항·제10항"},
    {agenda_id:"A2", no:2, title:"2026년도 예산안 승인의 건",
     is_vote:true,  quorum_pass:"출석 조합원 과반수 찬성",
     quorum_base:"attendees",  /* 모수 = 출석 조합원 */ quorum_attend:10,
     law_ref:"도시정비법 제45조 제3항·제10항"},
    {agenda_id:"A3", no:3, title:"조합 임원 선임의 건",
     is_vote:true,  quorum_pass:"출석 조합원 과반수 찬성",
     quorum_base:"attendees",  quorum_attend:10,
     law_ref:"도시정비법 제45조 제3항 · 정관"},
    {agenda_id:"A4", no:4, title:"시공자 선정 관련 보고",
     is_vote:false, quorum_pass:null, quorum_base:null, quorum_attend:null,
     law_ref:"도시정비법 제45조 제10항 단서"},
    {agenda_id:"A5", no:5, title:"기타 안건",
     is_vote:false, quorum_pass:null, quorum_base:null, quorum_attend:null, law_ref:null}
  ]
};

/* 같은 결과가 나오도록 씨앗을 고정한 난수 */
function _rng(seed){ let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/* 투표 로그 생성 — 명부 100명 기준 */
const DEMO_VOTES = (() => {
  const rnd = _rng(20260320), out = [];
  const votable = DEMO_MEETING.agendas.filter(a => a.is_vote);
  const pad = (p,n) => p + "-2026-" + String(n).padStart(4,"0");
  let ve = 0, vw = 0, vo = 0;

  /* 안건별 찬성 성향 (0~1) — 제2호는 팽팽하게 */
  const lean = {A1:0.76, A2:0.47, A3:0.68};

  /* ★ 명부 전체가 아니라 의결권자(대표조합원)만 돌린다 */
  VOTERS().forEach(r => {
    const x = rnd();
    if (x < 0.05) return;                      /* 미참여 5% */
    const type = x < 0.66 ? "electronic" : x < 0.88 ? "written" : "onsite";
    const serial = type === "electronic" ? pad("V", ++ve)
                 : type === "written"    ? pad("W", ++vw)
                 : pad("O", ++vo);
    votable.forEach(a => {
      const y = rnd();
      /* 찬성 → 반대 → 기권(약 5%) 순으로 자른다 */
      const L = lean[a.agenda_id];
      const choice = y < L ? "yes" : y < 0.95 ? "no" : "abstain";
      out.push({
        vote_id : `${serial}-${a.agenda_id}`,
        meeting_id: DEMO_MEETING.meeting_id, agenda_id: a.agenda_id,
        voter_id: r.no, voter_name: r.name,
        vote_type: type, choice, serial, status: "active",
        entered_by: type === "electronic" ? null : "류승현2",
        verified_by: type === "electronic" ? null : "확인자 ○○○",
        created_at: type === "electronic" ? "2026-03-17 21:04" : "2026-03-20 14:12"
      });
    });
  });
  return out;
})();

/* 철회 3건 — 전자투표 후 현장에서 다시 투표한 사례 */
const DEMO_WITHDRAWALS = (() => {
  const elec = [...new Set(DEMO_VOTES.filter(v => v.vote_type === "electronic").map(v => v.voter_id))];
  const picks = [elec[4], elec[11], elec[19]].filter(Boolean);
  const out = [];
  picks.forEach((vid, i) => {
    const olds = DEMO_VOTES.filter(v => v.voter_id === vid && v.vote_type === "electronic");
    const rec  = ROSTER.find(r => r.no === vid);
    const rNo  = "R-2026-" + String(i + 5).padStart(4,"0");
    const oNo  = "O-2026-" + String(28 + i * 4).padStart(4,"0");
    olds.forEach(v => { v.status = "withdrawn"; v.withdrawn_by = rNo; v.replaced_by = oNo; });
    /* 현장에서 다시 던진 표 */
    olds.forEach(v => DEMO_VOTES.push({
      vote_id: `${oNo}-${v.agenda_id}`, meeting_id: v.meeting_id, agenda_id: v.agenda_id,
      voter_id: vid, voter_name: rec ? rec.name : "", vote_type: "onsite",
      choice: v.choice === "yes" ? "no" : "yes",     /* 마음이 바뀌어 다시 온 경우 */
      serial: oNo, status: "active", entered_by: "류승현2", verified_by: "확인자 ○○○",
      created_at: "2026-03-20 14:12"
    }));
    out.push({
      withdrawal_id: rNo, serial: rNo, meeting_id: DEMO_MEETING.meeting_id,
      voter_id: vid, voter_name: rec ? rec.name : "",
      from_vote: olds[0] ? olds[0].serial : "", to_vote: oNo,
      sign_verified: true, id_verified: true, approved_by: "조합장",
      scan_status: i === 0 ? "done" : "pending",     /* 1건만 스캔 완료 */
      scan_due: "2026-03-23 18:00",
      entered_by: "류승현2", verified_by: "확인자 ○○○",
      created_at: "2026-03-20 14:12"
    });
  });
  return out;
})();

/* ═══════════════════════════════════════════════════════════
   ★★★ 총회 · 안건을 서버에 잇는다 (2026-08-31) ★★★
   ───────────────────────────────────────────────────────────
   ★ 무엇이 달라졌나

     예전에는 위의 DEMO_MEETING 하나가 전부였다.
     화면 파일 안에 박혀 있어 직원이 고쳐도 새로고침하면 사라지고,
     지난 총회는 아예 남지 않았다.

     이제 meetings · agendas 표에서 읽어 온다.
     2025년 임시총회에서 무엇을 어떤 요건으로 의결했는지
     3년 뒤에도 열어 보실 수 있다.
     → sql/014_meeting.sql

   ★ 표가 아직 없거나 비어 있으면 위의 DEMO_MEETING 을 보여 준다.
     014 를 안 돌리신 분이 화면을 열었을 때 빈 화면이 되면 안 된다.
     이때는 demo:true 가 붙어 화면에 「예시입니다」가 나온다.
     ACCT_DEMO · MKT_DEMO 와 같은 방식이다.

   ★★★ 투표 수치는 아직 예시 총회에서만 나온다 ★★★

     DEMO_VOTES 는 위의 DEMO_MEETING 안건(A1·A2…)을 보고 만든 것이다.
     서버에 새로 만드신 총회의 안건은 그 표와 짝이 맞지 않아
     집계가 0으로 나온다. 틀린 것이 아니라 아직 없는 것이다.
     화면에 그렇게 적어 둔다. 투표 로그를 옮기는 것은 다음 단계다.

   ★ 이름 겹침 주의
     admin.html 의 MT() · mtSet() · mtLive() 와 겹치지 않게
     여기서는 mt~ 대신 되도록 긴 이름을 쓴다.
   ═══════════════════════════════════════════════════════════ */

const MT_DEMO = true;          /* 서버가 비었을 때 예시 총회를 보일까 */

/* ═══════════════════════════════════════════════════════════
   ★ 회의 네 갈래 (2026-08-31 · sql/015)
   ───────────────────────────────────────────────────────────
   ★ 총회 둘은 서로 같고, 대의원회·이사회 둘도 서로 같다.
     총회에만 투표 기간과 직접출석 요건이 있다.
     회의체 둘은 그 자리에서 거수로 정하기 때문이다.

   ★ dec 는 의결 기록의 회의 종류 코드다.
     정기총회·임시총회가 둘 다 mtg 로 간다.
     의결 기록에서는 정기와 임시를 나누지 않는다.
     법이 요구하는 것은 「총회 의결이냐」뿐이다.

   ★ lock — 이 종류가 열려 있을 때 명부 변경을 미룰까 (절대규칙 ⑧)
     총회만 잠근다. 대의원회에서 명부가 바뀌어도 모수가 안 흔들린다.
   ═══════════════════════════════════════════════════════════ */
const MT_KINDS = {
  "정기총회": {key:"mtg1", dec:"mtg", who:"조합원", vote:true,  lock:true,  seq:false,
    law:"도시정비법 제45조 · 조합 정관",
    note:"조합원 과반수 출석에 출석 조합원 과반수 찬성이 원칙입니다. "
       + "정관 변경 · 시공자 선정 등은 조합원 2/3 이상입니다."},
  "임시총회": {key:"mtg2", dec:"mtg", who:"조합원", vote:true,  lock:true,  seq:true,
    law:"도시정비법 제45조 · 조합 정관",
    note:"정기총회와 요건은 같습니다. 그 해 몇 번째인지 차수를 붙입니다."},
  "대의원회": {key:"del",  dec:"del", who:"대의원", vote:false, lock:false, seq:true,
    law:"조합 정관 · 대의원회 규정",
    note:"대의원 과반수 출석에 출석 과반수 찬성이 보통입니다. "
       + "총회 권한을 대행하는 사항은 정관에서 따로 정합니다."},
  "이사회":   {key:"brd",  dec:"brd", who:"이사",   vote:false, lock:false, seq:true,
    law:"조합 정관 · 이사회 규정",
    note:"이사 과반수 출석에 출석 과반수 찬성이 보통입니다. "
       + "이사회 의결로 총회 부의 안건을 정합니다."}
};
const MT_KIND_LIST = Object.keys(MT_KINDS);
const mtK   = k => MT_KINDS[k] || MT_KINDS["정기총회"];
/* 왼쪽 메뉴 열쇠(mtg1·del…) → 회의 종류 이름 */
const mtKindOfKey = key =>
  MT_KIND_LIST.find(k => MT_KINDS[k].key === key) || "정기총회";

/* ★ 회의 이름을 만든다. 손으로 치지 않는다.
     정기총회   2026년 정기총회
     임시총회   2026년 제1차 임시총회
     대의원회   제2026-4차 대의원회
     이사회     제2026-2차 이사회
   손으로 치면 「제2026-4차」와 「2026-4차」가 섞여
   나중에 순서대로 늘어놓을 수가 없다. */
function mtTitleOf(kind, year, seq){
  const y = +year || new Date().getFullYear();
  const n = +seq || 0;
  if(kind === "정기총회") return `${y}년 정기총회`;
  if(kind === "임시총회") return `${y}년 제${n||1}차 임시총회`;
  return `제${y}-${n||1}차 ${kind}`;
}

/* 그 해 그 종류의 다음 차수 */
function mtNextSeq(kind, year){
  const y = +year || new Date().getFullYear();
  const used = (typeof MEETINGS !== "undefined" ? MEETINGS : [])
    .filter(m => m.kind === kind && +m.year === y)
    .map(m => +m.seq || 0);
  return used.length ? Math.max.apply(null, used) + 1 : 1;
}

/* 이 회의의 모수 — 조합원 · 대인원 · 이사 */
function mtBaseOf(kind){
  const dec = mtK(kind).dec;
  if(typeof decBaseOf !== "undefined") return decBaseOf(dec);
  if(dec === "mtg" && typeof VOTER_N !== "undefined") return VOTER_N();
  return 0;
}

let MEETINGS = [];             /* 서버에서 읽어 온 총회들 */
let MT_DB    = false;          /* 정식 표를 쓰고 있는가 */
let MT_ERR   = "";             /* 못 읽었을 때 이유 */
let MT_CUR   = null;           /* 지금 보고 있는 총회 id */

/* 표 한 줄 → 화면이 쓰던 모양 그대로.
   ★ 칸 이름을 DEMO_MEETING 과 똑같이 맞춘다.
     그래야 화면 코드를 거의 안 고친다. */
function mtFromRow(r, ags){
  return {
    meeting_id : r.id,
    tenant_id  : r.tenant_id,
    title      : r.title || "",
    kind       : r.kind || "정기총회",
    year       : r.year || (r.meet_date||"").slice(0,4),
    seq        : r.seq || null,
    meet_date  : r.meet_date || "",
    meet_time  : r.meet_time || "",
    place      : r.place || "",
    vote_open  : r.vote_open || "",
    vote_close : r.vote_close || "",
    status     : r.status || "draft",
    /* 출처 — 정보몽땅에서 옮겨 담은 것인가 (2026-08-31 · 016) */
    srcKind    : r.src_kind || "own",
    srcAt      : r.src_at || "",
    srcUrl     : r.src_url || "",
    srcNo      : r.src_no || "",
    /* 요약 — 조합원 소식으로 나가는 글 (2026-08-31 · 017) */
    headline   : r.headline || "",
    digest     : r.digest || "",
    meaning    : r.meaning || "",
    toldAt     : (r.told_at || "").slice(0, 16).replace("T", " "),
    toldBy     : r.told_by || "",
    told       : !!r.told_at,
    lateDays   : (r.late_days == null) ? null : +r.late_days,
    demo       : false,
    nDec       : r.decided_n || 0,
    closedAt   : (r.closed_at || "").slice(0, 16).replace("T", " "),
    upAt       : (r.updated_at || "").slice(0, 16).replace("T", " "),
    upBy       : r.updated_by || "",
    agendas    : (ags || []).map(agFromRow)
                            .sort((a, b) => (a.no || 0) - (b.no || 0))
  };
}
function agFromRow(a){
  return {
    agenda_id    : a.id,
    no           : a.no || 0,
    title        : a.title || "",
    is_vote      : !!a.is_vote,
    quorum_pass  : a.quorum_pass || null,
    quorum_base  : a.quorum_base || null,
    quorum_attend: a.quorum_attend || null,
    law_ref      : a.law_ref || null,
    detail       : a.detail || "",
    memo         : a.memo || "",
    decId        : a.decision_id || null,
    /* 표결 수치 — 의결 기록에서 딸려 온다 (v_agenda 가 이어 준다)

       ★★★ 반대표는 nay 로 쓴다. no 로 쓰면 안 된다 ★★★

       안건 번호가 이미 no 다. 같은 이름을 두 번 쓰면
       **뒤에 쓴 것이 앞의 것을 덮는다.** 실제로 그렇게 해서
       조합원 앱에 「제undefined호」가 나왔다.
       오류도 안 나고 화면만 이상해진다. */
    total        : a.total_n, att:a.attend_n,
    yes          : a.yes_n,   nay:a.no_n, abs:a.abstain_n
  };
}
function mtToRow(m){
  const kind = m.kind || "정기총회";
  const K = mtK(kind);
  const year = +m.year || +(m.meet_date||"").slice(0,4) || new Date().getFullYear();
  const seq  = K.seq ? (+m.seq || 1) : null;
  return {
    /* ★ 이름은 언제나 다시 만든다. 손으로 고친 이름은 담지 않는다. */
    title:mtTitleOf(kind, year, seq),
    kind:kind, year:year, seq:seq,
    meet_date:m.meet_date, meet_time:m.meet_time || null, place:m.place || null,
    /* ★ 대의원회 · 이사회에는 투표 기간이 없다. 남아 있으면 비운다.
       종류를 바꾸셨을 때 예전 값이 따라다니면 안 된다. */
    vote_open :K.vote ? (m.vote_open  || null) : null,
    vote_close:K.vote ? (m.vote_close || null) : null,
    /* ★ 정보몽땅에서 옮긴 것이면 등록일이 반드시 있어야 한다.
       「정보몽땅 자료입니다」라고만 하고 언제 올린 것인지 없으면
       조합원이 원문과 대조할 수가 없다. 표에도 같은 규칙이 있다. */
    src_kind  :(m.srcKind === "mtd") ? "mtd" : "own",
    src_at    :(m.srcKind === "mtd") ? (m.srcAt || m.meet_date) : (m.srcAt || null),
    src_url   :m.srcUrl || null,
    src_no    :m.srcNo  || null,
    headline  :(m.headline || "").trim() || null,
    digest    :(m.digest   || "").trim() || null,
    meaning   :(m.meaning  || "").trim() || null
  };
}

/* ★ 조합원에게 알린다 · 알림을 거둔다 (2026-08-31)
     told_at 이 비어 있으면 「아직 안 알린 것」으로 뜬다.
   ★ 한 줄 요약이 없으면 알릴 수 없다. 표에도 같은 규칙이 있다.
     제목 없이 알림만 나가면 조합원이 무슨 소식인지 모른다. */
async function meetingTell(id, on, who){
  if(!MT_DB) return MT_NODB;
  const r = await dbSet("meetings", id,
    on ? {told_at:new Date().toISOString(), told_by:who || null}
       : {told_at:null, told_by:null});
  if(r.ok) await meetingSync();
  return r;
}

/* 정보몽땅에 올렸는데 아직 조합원에게 안 알린 것 · 오래 밀린 것이 위 */
function mtNotTold(){
  return meetingList()
    .filter(m => !m.demo && m.srcKind === "mtd" && !m.told)
    .sort((a, b) => (b.lateDays || 0) - (a.lateDays || 0));
}
/* 조합원 앱에 나가는 소식 — 알린 것만 · 최신이 위 */
function mtTold(kind){
  return meetingList(kind).filter(m => m.told || m.demo);
}
function agToRow(a, meetingId){
  const vote = !!a.is_vote;
  return {
    meeting_id:meetingId, no:+a.no || 1,
    title:a.title || "(제목 없음)", is_vote:vote,
    quorum_pass  : a.quorum_pass || null,
    /* ★ 보고 안건에 가결 기준이 붙어 있으면 나중에 「의결했다」로 읽힌다.
       표에도 같은 규칙이 있지만 여기서 먼저 비운다. */
    quorum_base  : vote ? (a.quorum_base || null) : null,
    quorum_attend: vote ? (a.quorum_attend || null) : null,
    law_ref      : a.law_ref || null,
    detail       : (a.detail || "").trim() || null,
    memo         : (a.memo   || "").trim() || null
  };
}

/* ★ 표에서 다시 읽어 온다. 화면은 늘 이것을 부른다. */
async function meetingSync(){
  if(typeof dbList === "undefined") return false;
  const r = await dbList("v_meeting", "order=meet_date.desc");
  if(!r.ok){ MT_ERR = r.why || ""; return false; }
  const a = await dbList("v_agenda", "order=no.asc");
  if(!a.ok){ MT_ERR = a.why || ""; return false; }

  MT_DB = true; MT_ERR = "";
  const byMeeting = {};
  a.rows.forEach(x => (byMeeting[x.meeting_id] = byMeeting[x.meeting_id] || []).push(x));
  MEETINGS = r.rows.map(x => mtFromRow(x, byMeeting[x.id]));

  /* 고른 총회가 없거나 사라졌으면 진행중인 것을, 그것도 없으면 맨 위를 */
  if(!MEETINGS.some(m => m.meeting_id === MT_CUR)){
    const open = MEETINGS.find(m => m.status === "open");
    MT_CUR = open ? open.meeting_id : (MEETINGS[0] ? MEETINGS[0].meeting_id : null);
  }
  return true;
}

/* 예시 총회 — 표가 없거나 비었을 때만 */
function mtDemoOne(){
  if(typeof DEMO_MEETING === "undefined") return null;
  return Object.assign({}, DEMO_MEETING, {demo:true, nDec:0});
}

/* 화면이 보는 회의들 · 개최일 최신이 위
   ★ kind 를 주면 그 갈래만 돌려준다 (왼쪽 메뉴 넷이 이것을 쓴다) */
function meetingList(kind){
  const L = (MT_DB && MEETINGS.length) ? MEETINGS
          : (MT_DEMO && mtDemoOne() ? [mtDemoOne()] : []);
  return kind ? L.filter(m => m.kind === kind) : L;
}
/* 갈래별 건수 — 메뉴와 알약에 숫자를 달아 준다 */
function mtCounts(){
  const c = {all:0};
  MT_KIND_LIST.forEach(k => c[k] = 0);
  meetingList().forEach(m => { c.all++; if(c[m.kind] !== undefined) c[m.kind]++; });
  return c;
}
/* 지금 보고 있는 총회 하나 */
function mtCur(){
  const L = meetingList();
  return L.find(m => m.meeting_id === MT_CUR) || L[0] || null;
}
function mtPickOne(id){ MT_CUR = id; if(typeof render !== "undefined") render(); }

/* 진행중인 회의 — 갈래마다 하나씩 열릴 수 있다 */
const mtOpenOne = kind => meetingList(kind).find(m => m.status === "open") || null;

/* ★★★ 명부 변경 잠금은 「총회」만 본다 (절대규칙 ⑧ · 2026-08-31) ★★★

   대의원회 · 이사회는 그 자리에서 거수로 정한다.
   전자투표를 하지 않으니 명부가 바뀌어도 집계 모수가 흔들리지 않는다.

   총회 준비 중에 대의원회가 열리는 것이 보통이다.
   (총회에 올릴 안건을 대의원회에서 먼저 정한다)
   대의원회 때문에 명부 변경이 몇 달씩 멈추면 안 된다. */
const mtOpenVote = () =>
  meetingList().find(m => m.status === "open" && mtK(m.kind).lock) || null;

const MT_NODB = {ok:false, why:"총회 표가 아직 준비되지 않았습니다.\n"
  + "Supabase 에서 sql/014_meeting.sql 을 돌려 주십시오."};

/* ── 넣기 · 고치기 ─────────────────────────────────────────── */
async function meetingAdd(m, who){
  if(!MT_DB) return MT_NODB;
  const row = mtToRow(m); row.created_by = who || null; row.updated_by = who || null;
  const r = await dbAdd("meetings", row);
  if(r.ok){
    await meetingSync();
    /* 새로 만든 것을 바로 보여 드린다 */
    const made = MEETINGS.find(x => x.title === row.title && x.meet_date === row.meet_date);
    if(made) MT_CUR = made.meeting_id;
  }
  return r;
}
async function meetingSave(id, m, who){
  if(!MT_DB) return MT_NODB;
  const row = mtToRow(m); row.updated_by = who || null;
  const r = await dbSet("meetings", id, row);
  if(r.ok) await meetingSync();
  return r;
}
/* ★ 상태를 바꾼다. 진행중은 구역에 하나뿐이라 표가 막는다. */
async function meetingStatus(id, st, who){
  if(!MT_DB) return MT_NODB;
  const row = {status:st, updated_by:who || null};
  if(st === "closed"){ row.closed_by = who || null; }
  const r = await dbSet("meetings", id, row);
  if(!r.ok && /meetings_one_open_idx|duplicate key/i.test(r.why || ""))
    return {ok:false, why:"이미 진행 중인 총회가 있습니다.\n"
      + "먼저 그 총회를 마감하신 뒤에 여십시오.\n"
      + "투표 중에 두 총회가 열려 있으면 집계 모수가 흔들립니다."};
  if(r.ok) await meetingSync();
  return r;
}
async function meetingDel(id){
  if(!MT_DB) return MT_NODB;
  const r = await dbDel("meetings", id);
  if(r.ok){ if(MT_CUR === id) MT_CUR = null; await meetingSync(); }
  return r;
}

/* ── 안건 ──────────────────────────────────────────────────── */
async function agendaAdd(meetingId, a){
  if(!MT_DB) return MT_NODB;
  const r = await dbAdd("agendas", Object.assign(agToRow(a, meetingId),
    {tenant_id:(typeof hubTenant !== "undefined") ? hubTenant() : null}));
  if(r.ok) await meetingSync();
  return r;
}
async function agendaSave(id, meetingId, a){
  if(!MT_DB) return MT_NODB;
  const row = agToRow(a, meetingId); delete row.meeting_id;
  const r = await dbSet("agendas", id, row);
  if(r.ok) await meetingSync();
  return r;
}
async function agendaDel(id){
  if(!MT_DB) return MT_NODB;
  const r = await dbDel("agendas", id);
  if(r.ok) await meetingSync();
  return r;
}
/* 다음 안건 번호 — 비어 있는 번호를 찾지 않고 뒤에 붙인다.
   ★ 제3호를 지우고 새로 넣었을 때 옛 제3호와 헷갈리면 안 된다. */
function agNextNo(m){
  return (m && m.agendas && m.agendas.length)
    ? Math.max.apply(null, m.agendas.map(a => a.no || 0)) + 1 : 1;
}

/* ── 안건 → 의결 기록 ──────────────────────────────────────── */
/* ★ 총회 안건의 가결 기준을 의결 기록의 요건 코드로 옮긴다.
     문장으로 판단하지 말 것 — quorum_base 를 먼저 본다.
       members   전체 조합원이 모수
       attendees 출석 조합원이 모수
     문장에 「2/3」 · 「3분의 2」가 있으면 가중 요건이다. */
function agRule(a){
  const s = String(a.quorum_pass || "");
  const two3 = /2\s*\/\s*3|3분의\s*2|3분의2|三分/.test(s);
  if(a.quorum_base === "members")   return two3 ? "two3" : "all2";
  if(a.quorum_base === "attendees") return two3 ? "att2" : "half";
  return two3 ? "two3" : "all2";
}
/* 아직 의결 기록으로 넘기지 않은 의결 안건 */
function agWaiting(m){
  if(!m || m.demo) return [];
  return (m.agendas || []).filter(a => a.is_vote && !a.decId);
}
/* 의결 기록 화면이 폼을 채울 때 쓰는 밑값 */
function agToDecision(m, a){
  /* ★ 회의 종류를 그대로 넘긴다.
     대의원회 기록에 총회 총원 97 이 남아 있으면 정족수가 통째로 틀린다. */
  const K = mtK(m.kind);
  return {
    kind:K.dec, date:m.meet_date || "", meeting:m.title || "",
    no2:a.no || 0, title:a.title || "", rule:agRule(a),
    total:a.total || mtBaseOf(m.kind) || 0,
    /* ★ 의결 기록 쪽은 반대표가 no 다. 안건 쪽은 nay 다.
       여기가 두 이름이 만나는 유일한 자리다. */
    att:a.att || 0, yes:a.yes || 0, no:a.nay || 0, abs:a.abs || 0,
    /* ★ 비고는 의결 기록의 메모로 함께 넘긴다.
       「누가 선임됐나」는 표결 숫자만큼 중요한 기록이다. */
    note:[a.memo || "", a.law_ref ? "근거 · " + a.law_ref : ""]
          .filter(Boolean).join("\n"),
    meeting_id:m.meeting_id, agenda_id:a.agenda_id
  };
}

/* 처음 한 번 읽고, 20초마다 다시 본다.
   ★ 직원이 치고 계실 때는 갈아엎지 않는다. */
if(typeof dbList !== "undefined"){
  meetingSync().then(ok => { if(ok && typeof render !== "undefined") render(); });
  setInterval(async () => {
    const el = document.activeElement, t = el ? (el.tagName || "").toUpperCase() : "";
    if(t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
    const before = JSON.stringify(MEETINGS);
    if(await meetingSync() && JSON.stringify(MEETINGS) !== before
       && typeof render !== "undefined"){
      /* ★ 쓰던 글을 먼저 담는다 (2026-09-20 · 110절). 직원 화면에만 있다. */
      if(typeof keepAll === "function") keepAll();
      render();
    }
  }, 20000);
}

/* ═══════════════════════════════════════════════════════════
   ★ 투표를 서버에 잇는다 (2026-08-22 밤)
   ───────────────────────────────────────────────────────────
   ★ 왜 붙였나
     예전에는 화면 안 변수(DEMO_VOTES)에만 담겼다.
     직원이 서면결의서를 스무 장 치고 F5 를 누르면 **다 사라졌다.**
     화면에는 「접수 저장」이라고 나가는데 실제로는 아무 데도 없었다.
     동의서에서 이미 겪은 것과 같은 종류다(8번 절).

   ★★★ 투표는 동의서보다 더 무겁다 ★★★
     서면결의서 한 장이 없어지면 그 조합원의 의사가 사라진다.
     집계가 한 표 틀리면 총회 결의 자체가 다투어진다.

   ★ 담기는 것 — app_state("votes") · app_state("wdraws")
     조합원 이름이 들어가지만, 총회 참석자 명부는
     조합원 누구나 열람 청구할 수 있는 자료라 명부와는 성격이 다르다.
     다만 **누가 어떻게 투표했는지(choice)** 는 비밀투표라
     조합원 앱에는 절대 내려보내지 않는다. 직원 화면에서만 본다.
     → 조합원 앱은 tallyAgenda() 로 숫자만 본다.

   ★ 20초마다 살펴본다. 총회 당일 두 사람이 나눠 칠 수 있어야 한다.
     ★ 직원이 치고 계실 때는 화면을 갈아엎지 않는다.
       칸에 커서가 있으면 받아만 두고 손을 떼시면 얹는다.
       (동의서에서 쓴 것과 같은 방식) */
let VOTE_SEQ = (typeof hubLoad !== "undefined") ? hubLoad("vote_seq", {w:0, o:0}) : {w:0, o:0};
let VOTE_WAIT = null;

function votesPut(who){
  if(typeof hubPush === "undefined") return Promise.resolve(false);
  return Promise.all([
    hubPush("votes",    DEMO_VOTES,       who),
    hubPush("wdraws",   DEMO_WITHDRAWALS, who),
    hubPush("vote_seq", VOTE_SEQ,         who)
  ]).then(r => r.every(Boolean));
}

function voteTyping(){
  const t = document.activeElement;
  const n = t ? (t.tagName||"").toUpperCase() : "";
  return n === "INPUT" || n === "TEXTAREA" || n === "SELECT";
}

if(typeof hubPoll !== "undefined"){
  const take = (k, apply) => hubPoll(k, v => {
    if(!v) return;
    if(voteTyping()){                       /* 치고 계신 중 — 손 떼실 때까지 미룬다 */
      clearTimeout(VOTE_WAIT);
      VOTE_WAIT = setTimeout(() => { apply(v);
        if(typeof keepAll === "function") keepAll();          /* 113절 */
        if(typeof render!=="undefined") render(); }, 1500);
      return;
    }
    apply(v);
    if(typeof render !== "undefined") render();
  }, 20);
  /* ★ 번호를 먼저 받아온다. 두 사람이 같은 번호를 매기면 표가 겹친다. */
  hubPoll("vote_seq", v => { if(v){
    VOTE_SEQ.w = Math.max(VOTE_SEQ.w||0, v.w||0);
    VOTE_SEQ.o = Math.max(VOTE_SEQ.o||0, v.o||0); } }, 20);
  take("votes",  v => { DEMO_VOTES.length = 0;       DEMO_VOTES.push(...v); });
  take("wdraws", v => { DEMO_WITHDRAWALS.length = 0; DEMO_WITHDRAWALS.push(...v); });
}

/* ═══════════════════════════════════════════════════════════
   총회 현장 접수 (2026-08-23 새벽)
   ───────────────────────────────────────────────────────────
   ★ 접수와 투표는 다른 일이다.

     접수  오신 분을 확인하고 투표용지를 드리는 것   ← 정족수를 만든다
     투표  받은 표를 적는 것

   ★★★ 출석 인원이 여기서 결정된다 ★★★
     「출석 과반수」의 출석이 이 숫자다.
     이 화면이 없으면 직원이 종이에 정(正) 자를 그어 세게 된다.
     한 사람 잘못 세면 총회 결의 자체가 다투어진다.

   ★ 직접 · 위임 · 서면을 나눠 센다.
       직접   현장에 오신 분          용지를 드린다
       위임   대리인이 오신 경우      용지를 드린다 · 위임장 확인 필요
       서면   우편으로 결의서가 온 것  출석으로 치되 **용지는 안 드린다**
     안 나누면 정족수가 틀리고 용지가 남거나 모자란다.

   ★ 취소는 지우지 않는다 (절대 규칙 ①).
     잘못 접수한 것을 지우면 「출석을 조작했다」는 말이 나온다.
     status = "cancelled" 로 남기고 집계에서만 뺀다.
     누가 언제 왜 취소했는지도 함께 남긴다.

   ★ 종이 참석부 서명이 진짜 방어선이다.
     「나는 그날 안 갔다」고 하시면 화면 기록이 아니라
     본인 서명이 있는 참석부가 답이 된다.
     조합이 만든 화면 기록은 조합이 만든 것이라 그것만으로는 약하다.
   ═══════════════════════════════════════════════════════════ */
/* ★★★ 데스크마다 자기 칸에만 담는다 (2026-08-23 새벽) ★★★
   ───────────────────────────────────────────────────────────
   ★ 왜 나눠야 하나

     총회 당일에는 접수 데스크가 여럿이다. 처음부터 동시에 하는 일이다.
     그런데 hubPush 는 **목록 전체를 갈아 끼운다.**

       1번 PC   [A,B,C] → D 를 더해 [A,B,C,D] 를 통째로 올림
       2번 PC   [A,B,C] → E 를 더해 [A,B,C,E] 를 통째로 올림
       서버                        [A,B,C,E]     ← D 가 사라진다

     **접수됐다가 사라진다.** 화면에는 「접수했습니다」가 떴는데
     목록에서 없어지고, 그분은 이미 용지를 들고 가셨다.
     투표함에 든 표와 출석부가 안 맞는다.

   ★ 칸을 나누면 덮어쓸 수가 없다.

       attend__1   1번 데스크 것만
       attend__2   2번 데스크 것만
       attend__3   …

     볼 때는 합쳐서 본다. 각자 자기 칸에만 쓰므로 구조적으로 안전하다.

   ★ 접수번호에도 데스크가 들어간다.  A1-0001 · A2-0001
     나중에 「어느 데스크에서 접수했나」에 답할 수 있다.

   ★ 예전 attend 도 함께 읽는다. 이미 접수하신 것이 사라지면 안 된다. */
/* ★★★ 「세는 것」과 「고르는 것」을 나눈다 (2026-08-23) ★★★
   ATT_MAX  20   자리는 스무 개까지 열어 둔다 (고정)
   ATT_N     n   지금 놓은 데스크 수 — 화면에서 늘리고 줄인다
   ATT_DESK  k   이 PC 가 쓰는 번호

   ★ 데스크 수를 줄여도 기록은 사라지지 않는다.
     5개를 쓰다 4로 줄이시면 5번 자리는 못 고르게 되지만
     **5번에 접수된 분들은 그대로 출석에 잡힌다.**
     데스크 수는 「몇 대를 놓을까」이지 「어디까지 셀까」가 아니다.
     이걸 섞으면 출석이 갑자기 줄고 정족수가 미달로 바뀐다.

   ★ 그래서 세는 쪽(attAll · attWho · attFind)은 늘 ATT_MAX 전부를 본다.
     고르는 쪽만 ATT_N 을 본다. */
const ATT_MAX = 20;
let ATT_N    = (typeof hubLoad !== "undefined") ? hubLoad("att_n", 2) : 2;
let ATT_DESK = (typeof hubLoad !== "undefined") ? hubLoad("att_desk_me", 1) : 1;
let ATT_ON   = (typeof hubLoad !== "undefined") ? hubLoad("att_on", {}) : {};
const attKey = n => "attend__" + (n || ATT_DESK);

/* ★★★ 접수 직전에 모든 데스크를 서버에서 다시 읽는다 (2026-08-23) ★★★
   ───────────────────────────────────────────────────────────
   ★ 왜 필요한가

     칸을 나눠 「사라지는 접수」는 막았지만
     **「같은 분을 두 데스크에서 접수하는 것」은 못 막았다.**

       09:41:03  1번 데스크 · 박윤숙 접수 · 용지 교부
       09:41:07  2번 데스크 · 박윤숙 검색 → 화면에는 아직 안 뜸 (15초 주기)
       09:41:09  2번 데스크 · 접수 · 용지 또 교부      ← 두 장이 나갔다

     **용지가 두 장 나가면 되돌릴 수 없다.**
     투표함에 표가 두 개 들어가고, 그것이 어느 것인지 가릴 수 없다.
     총회 결의 자체가 다투어진다.

   ★ 15초를 기다릴 수 없다. 누르는 그 순간에 서버를 본다.

     화면에 보이는 것은 최대 15초 낡은 것이다.
     [접수] 를 누르는 순간 **모든 데스크 칸을 강제로 읽어** 대조한다.
     남는 틈은 「서버를 읽고 → 쓰는」 사이의 1초 미만뿐이다.

   ★ 검색할 때도 한 번 읽는다.
     직원이 「이미 접수」 딱지를 보시면 애초에 안 누르신다.
     누르고 막히는 것보다 낫다.
   ═══════════════════════════════════════════════════════════ */
async function attSync(){
  if(typeof hubPull === "undefined") return false;
  const jobs = [];
  /* ★ 켜져 있는 것만 읽는다 (attNeed) */
  attNeed().forEach(k => jobs.push(
    hubPull(attKey(k), null).then(v => { if(Array.isArray(v)) ATT_BOX[k] = v; })
  ));
  jobs.push(hubPull("att_on", null).then(v => { if(v) ATT_ON = v; }));
  jobs.push(hubPull("att_n",  null).then(v => { if(typeof v === "number") ATT_N = v; }));
  jobs.push(hubPull("attend", null).then(v => { if(Array.isArray(v)) ATT_OLD = v; }));
  jobs.push(hubPull("att_seq", null).then(v => {
    if(typeof v === "number") ATT_SEQ = Math.max(ATT_SEQ, v); }));
  try { await Promise.all(jobs); return true; }
  catch(e){ return false; }
}

/* ★ 어느 데스크에서 접수했는지까지 돌려준다.
   「이미 접수」로만 알리면 직원이 어디 가서 확인할지 모른다. */
function attWho(no){
  for(let i = 1; i <= ATT_MAX; i++){
    const x = (ATT_BOX[i]||[]).find(a => a.voter_id === no && a.status === "active");
    if(x) return {rec:x, desk:i};
  }
  const o = ATT_OLD.find(a => a.voter_id === no && a.status === "active");
  return o ? {rec:o, desk:o.desk || 0} : null;
}

/* 데스크별 접수 · 내 것만 고친다. 자리는 스무 개. */
let ATT_BOX = {};
for(let i = 1; i <= ATT_MAX; i++){
  ATT_BOX[i] = (typeof hubLoad !== "undefined") ? hubLoad(attKey(i), []) : [];
}
/* 예전 판(한 칸에 몰아 담던 것) — 읽기만 한다 */
let ATT_OLD = (typeof hubLoad !== "undefined") ? hubLoad("attend", []) : [];
const ATT_OLD_LEN    = () => ATT_OLD.filter(a => a.status === "active").length;
const ATT_OLD_PAPERS = () => ATT_OLD.filter(a =>
  a.status === "active" && a.how !== "written").length;

/* ★ 세는 쪽은 늘 스무 개를 다 본다. 데스크 수를 줄여도 기록은 남는다. */
function attAll(){
  const out = ATT_OLD.slice();
  for(let i = 1; i <= ATT_MAX; i++) out.push(...(ATT_BOX[i] || []));
  return out.sort((a,b) => (a.serial||"").localeCompare(b.serial||""));
}

/* ★ 이 PC 가 살아 있다고 알린다 — 5분이 지나면 꺼진 것으로 본다 */
function attAlive(){
  ATT_ON[ATT_DESK] = Date.now();
  if(typeof hubPush !== "undefined") hubPush("att_on", ATT_ON);
  if(typeof cacheSet !== "undefined") cacheSet("att_on", ATT_ON);
}

/* ★ 읽어야 할 데스크만 골라낸다 (2026-08-23).
   스무 개를 다 읽으면 접수 한 건에 서버 조회가 22번이다.
   500명이면 1만 번이 넘고 총회장 인터넷이 느리면 접수가 굼떠진다.

     ① 지금 놓은 범위 안       1 ~ ATT_N
     ② 내 번호                반드시
     ③ 5분 안에 살아 있던 것    다른 PC 가 켜져 있다
     ④ 기록이 있는 것          줄여도 세야 하므로 반드시 */
function attNeed(){
  const out = new Set();
  for(let i = 1; i <= Math.min(ATT_N, ATT_MAX); i++) out.add(i);
  out.add(ATT_DESK);
  const now = Date.now();
  Object.keys(ATT_ON).forEach(k => {
    if(now - (ATT_ON[k]||0) < 5*60*1000) out.add(+k);
  });
  for(let i = 1; i <= ATT_MAX; i++) if((ATT_BOX[i]||[]).length) out.add(i);
  return [...out].filter(n => n >= 1 && n <= ATT_MAX).sort((a,b)=>a-b);
}

/* 기록이 있는 가장 큰 번호 — 이 아래로는 줄일 수 없다 */
function attMaxUsed(){
  let m = 0;
  for(let i = 1; i <= ATT_MAX; i++) if((ATT_BOX[i]||[]).length) m = i;
  return m;
}

/* 데스크별 현황 — 어디에 사람이 몰리는지 */
function attByDesk(){
  const out = [];
  const top = Math.max(ATT_N, attMaxUsed(), ATT_DESK);
  const now = Date.now();
  for(let i = 1; i <= top; i++){
    const rows = (ATT_BOX[i]||[]).filter(a => a.status === "active");
    out.push({no:i, n:rows.length,
      papers: rows.filter(a => a.how !== "written").length,
      off: i > ATT_N, me: i === ATT_DESK,
      live: now - (ATT_ON[i]||0) < 5*60*1000});
  }
  if(ATT_OLD_LEN()) out.push({no:0, n:ATT_OLD_LEN(), papers:ATT_OLD_PAPERS(),
    off:true, me:false, live:false, old:true});
  return out;
}
/* 예전 이름을 쓰는 곳이 있어 남겨 둔다 */
Object.defineProperty(globalThis, "ATTEND", {get: attAll, configurable:true});

let ATT_SEQ = (typeof hubLoad !== "undefined") ? hubLoad("att_seq", 0) : 0;

/* 정관에서 정하는 값 — 조합마다 다르다.
   ★ 법은 「정관으로 정한다」고만 하고 실제 숫자는 정관에 있다.
     정관이 올라오면 그 값으로 고쳐야 한다. */
let PROXY_MAX = (typeof hubLoad !== "undefined") ? hubLoad("proxy_max", 3) : 3;

const ATT_HOW  = {direct:"직접 참석", proxy:"대리인 (위임)", written:"서면결의 도착"};
const ATT_ID   = {rrc:"주민등록증", drv:"운전면허증", pass:"여권", app:"조합원증 앱",
                  pass2:"PASS 인증"};

/* 살아 있는 접수만 */
const attLive  = () => attAll().filter(a => a.status === "active");
const attOf    = no => attLive().find(a => a.voter_id === no) || null;
/* 대리인이 이미 몇 분을 받았나 — 정관 한도 검사 */
const proxyN   = name => attLive().filter(a =>
  a.how === "proxy" && (a.proxy_name||"").trim() === String(name||"").trim()).length;

/* ★ 출석 집계 — 이 숫자가 정족수다 */
function attTally(){
  const L = attLive();
  const by = k => L.filter(a => a.how === k).length;
  const direct = by("direct"), proxy = by("proxy"), written = by("written");
  const total  = direct + proxy + written;
  const voters = (typeof VOTER_N !== "undefined") ? VOTER_N() : 0;
  const half   = Math.floor(voters / 2) + 1;      /* 조합원 과반수 */
  return {
    voters, direct, proxy, written, total,
    papers: direct + proxy,                       /* 용지를 드린 수 — 서면은 뺀다 */
    need: half, ok: total >= half, gap: total - half,
    rate: voters ? Math.round(total / voters * 1000) / 10 : 0,
    cancelled: attAll().filter(a => a.status === "cancelled").length
  };
}

/* 서버에 담기 */
/* ★ 내 데스크 칸만 쓴다. 남의 것은 건드리지 않는다. */
function attendPut(who){
  if(typeof hubPush === "undefined") return Promise.resolve(false);
  return Promise.all([
    hubPush(attKey(), ATT_BOX[ATT_DESK] || [], who),
    hubPush("att_seq",   ATT_SEQ,   who),
    hubPush("proxy_max", PROXY_MAX, who)
  ]).then(r => r.every(Boolean));
}
/* 내 칸에 한 건 더하기 · 고치기 */
function attAdd(rec){ (ATT_BOX[ATT_DESK] = ATT_BOX[ATT_DESK] || []).push(rec); }
function attFind(serial){
  for(let i = 1; i <= ATT_MAX; i++){
    const x = (ATT_BOX[i]||[]).find(a => a.serial === serial);
    if(x) return {rec:x, desk:i};
  }
  const o = ATT_OLD.find(a => a.serial === serial);
  return o ? {rec:o, desk:0} : null;
}
function attDeskSet(n){
  ATT_DESK = n;
  if(typeof hubPush !== "undefined") hubPush("att_desk_me", n);
  if(typeof cacheSet !== "undefined") cacheSet("att_desk_me", n);
  attAlive();
}
/* ★ 데스크 수 늘리고 줄이기 — 기록이 있는 번호 아래로는 못 줄인다 */
function attSetN(n){
  const used = attMaxUsed();
  n = Math.max(1, Math.min(ATT_MAX, n));
  if(n < used) return {ok:false, used};
  ATT_N = n;
  if(ATT_DESK > n) attDeskSet(n);          /* 내가 없어진 자리에 있으면 옮긴다 */
  if(typeof hubPush !== "undefined") hubPush("att_n", n);
  if(typeof cacheSet !== "undefined") cacheSet("att_n", n);
  return {ok:true};
}

if(typeof hubPoll !== "undefined"){
  hubPoll("att_seq",   v => { if(typeof v === "number") ATT_SEQ = Math.max(ATT_SEQ, v); }, 15);
  hubPoll("proxy_max", v => { if(typeof v === "number") PROXY_MAX = v; }, 60);
  /* ★ 데스크 칸을 하나씩 살펴본다. 남의 것은 읽기만 하고 쓰지 않는다.
     직원이 치고 계실 때는 미룬다(투표와 같은 방식). */
  const busyTyping = () => {
    const t = document.activeElement, n = t ? (t.tagName||"").toUpperCase() : "";
    return n === "INPUT" || n === "TEXTAREA" || n === "SELECT";
  };
  /* ★ 자리는 스무 개지만 살펴보는 것은 켜진 것만.
     매번 attNeed() 를 다시 보므로 데스크를 늘리면 그때부터 함께 본다. */
  for(let i = 1; i <= ATT_MAX; i++){
    ((k) => hubPoll(attKey(k), v => {
      if(!v || busyTyping()) return;
      if(k === ATT_DESK) return;                    /* 내 칸은 내가 진짜다 */
      if(!attNeed().includes(k)) return;            /* 안 쓰는 자리는 건너뛴다 */
      if(JSON.stringify(v) === JSON.stringify(ATT_BOX[k])) return;
      ATT_BOX[k] = v;
      if(typeof render !== "undefined") render();
    }, 15))(i);
  }
  hubPoll("att_on", v => { if(v) ATT_ON = v; }, 30);
  hubPoll("att_n",  v => { if(typeof v === "number" && v !== ATT_N){
    ATT_N = v; if(typeof render !== "undefined") render(); } }, 30);
  hubPoll("attend", v => {
    if(!v || busyTyping()) return;
    if(JSON.stringify(v) === JSON.stringify(ATT_OLD)) return;
    ATT_OLD = v;
    if(typeof render !== "undefined") render();
  }, 30);
}

/* 집계 도우미 — 유효한 표만 센다 */
function tallyAgenda(agendaId){
  const v = DEMO_VOTES.filter(x => x.agenda_id === agendaId && x.status === "active");
  const c = k => v.filter(x => x.choice === k).length;
  const t = k => v.filter(x => x.vote_type === k).length;
  return {
    yes:c("yes"), no:c("no"), abstain:c("abstain"), join:v.length,
    total:VOTER_N(), absent:VOTER_N() - v.length,
    electronic:t("electronic"), written:t("written"), onsite:t("onsite")
  };
}
function tallyMeeting(){
  const a = DEMO_MEETING.agendas.find(x => x.is_vote);
  return tallyAgenda(a.agenda_id);
}
