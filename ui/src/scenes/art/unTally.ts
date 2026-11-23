/**
 * The Security Council vote on the UN board (QA3R-3c): fifteen seats, the five permanent members
 * and ten elected ones, split over the two boards (8 and 7). The board used to list 18 delegates
 * and counted YES 14 NO 2 on a 15-seat council.
 */
export const COUNCIL = ['CHN', 'FRA', 'RUS', 'GBR', 'USA', 'BRA', 'EGY', 'GHA', 'IND', 'JPN', 'KEN', 'MEX', 'NOR', 'QAT', 'TUR'] as const;
export const COUNCIL_SEATS = 15;
export const BOARD_SPLIT = 8;

export type UnVoteMark = 'y' | 'n' | 'a';

/** How each seat votes in the scene's mood (deterministic, art only). */
export function councilVotes(mood?: string): UnVoteMark[] {
  const yesCut = mood === 'good' ? 7 : mood === 'bad' ? 2 : 4.5;
  return COUNCIL.map((_, i) => {
    const v = (i * 7) % 9;
    return v < yesCut ? 'y' : v === 8 ? 'a' : 'n';
  });
}

export function councilTally(mood?: string): { yes: number; no: number; abstain: number } {
  const v = councilVotes(mood);
  return {
    yes: v.filter((x) => x === 'y').length,
    no: v.filter((x) => x === 'n').length,
    abstain: v.filter((x) => x === 'a').length,
  };
}
