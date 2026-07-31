// types/lunar-javascript.d.ts
//
// lunar-javascript 는 타입 선언을 담고 있지 않습니다.
// allowJs 로 «추론» 되기는 하지만, TS 판이 바뀌면 흔들립니다.
// ★우리가 쓰는 만큼만 «못 박아» 둡니다.
//
// ⚠️ 이 라이브러리는 윤달을 «음수 월» 로 나타냅니다 (1995년 윤8월 = -8).
//    그 규약이 밖으로 새지 않게 lib/saju/lunarConvert.ts 가 감쌉니다.

declare module 'lunar-javascript' {
  export interface LunarLike {
    getYear(): number
    /** ★윤달이면 «음수» 입니다 */
    getMonth(): number
    getDay(): number
    getSolar(): SolarLike
  }
  export interface SolarLike {
    getYear(): number
    getMonth(): number
    getDay(): number
    getLunar(): LunarLike
  }
  export const Solar: { fromYmd(y: number, m: number, d: number): SolarLike }
  /** ⚠️ 윤달은 month 를 «음수» 로 넘깁니다 */
  export const Lunar: { fromYmd(y: number, m: number, d: number): LunarLike }
}
