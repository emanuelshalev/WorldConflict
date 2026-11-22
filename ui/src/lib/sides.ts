/**
 * The side the title screen selects when the player picks a crisis: today's side when this is
 * today's crisis, else the first playable side. Never the side kept from the previous crisis: it may
 * also be playable here but sit below the fold, so "Take office as United States" would not match
 * the highlighted Ukraine card (Maya, iteration 1).
 */
export function defaultSide(
  flashpoint: { id: string; playable: Array<{ countryId: string }> } | undefined,
  daily: { flashpointId: string; countryId: string } | null | undefined,
): string {
  if (!flashpoint) return '';
  if (daily && daily.flashpointId === flashpoint.id && flashpoint.playable.some((p) => p.countryId === daily.countryId)) return daily.countryId;
  return flashpoint.playable[0]?.countryId ?? '';
}
