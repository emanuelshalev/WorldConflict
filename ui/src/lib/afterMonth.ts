/** What the player sees after each month (design-month.md 9), per browser. */
export type AfterMonth = 'result' | 'details' | 'everything';
const AFTER_KEY = 'worldconflict.afterMonth';
export function readAfterMonth(): AfterMonth {
  try {
    const v = localStorage.getItem(AFTER_KEY);
    return v === 'details' || v === 'everything' ? v : 'result';
  } catch {
    return 'result';
  }
}
export function writeAfterMonth(v: AfterMonth) {
  try {
    localStorage.setItem(AFTER_KEY, v);
  } catch {
    /* storage unavailable */
  }
}

