import { type DeskFocus, useGameStore } from '../store/gameStore';

/** Every item on this month's desk, in the order to handle them (also drives J/K). */
export function deskItems(): Array<DeskFocus & { label: string }> {
  const s = useGameStore.getState();
  const items: Array<DeskFocus & { label: string }> = [];
  if (s.worldState?.objective) items.push({ kind: 'mission', label: 'Mission' });
  for (const d of s.pendingDecisions) items.push({ kind: 'crisis', id: d.id, label: d.title });
  for (const m of s.worldState?.agenda ?? []) items.push({ kind: 'meeting', id: m.id, label: m.speaker });
  items.push({ kind: 'suggestions', label: 'Staff orders' }, { kind: 'catalog', label: 'All orders' });
  return items;
}
