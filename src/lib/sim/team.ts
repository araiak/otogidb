/**
 * Team shape for the simulator UI.
 *
 * The site thinks in 7 slots; the engine's contract splits the 5 battle slots into
 * 4 active plus a helper, because the helper is borrowed and is scoped separately for
 * overlay abilities. `web.py` does that split, so the UI keeps the flat list.
 */

import type { Card } from '../../types/card';
import type { BondSlot, SimRequest } from './client';

export const SLOT_COUNT = 7;
export const BATTLE_SLOTS = 5; // P1..P5; P5 is the helper
export const HELPER_INDEX = 4;

/** Short slot ids. The same card can sit in two slots with different assists, so the
 *  id is what tells them apart anywhere a card is shown twice. */
export const SLOT_IDS = ['S1', 'S2', 'S3', 'S4', 'H', 'R1', 'R2'];

/** Short id for an engine slot key ("P1".."P5"), for the cast groups. */
export function slotIdFor(key: string): string {
  const i = Number(key.slice(1)) - 1;
  return SLOT_IDS[i] ?? key;
}

export const SLOT_LABELS = [
  'Slot 1 (Leader)',
  'Slot 2',
  'Slot 3',
  'Slot 4',
  'Helper',
  'Reserve 1',
  'Reserve 2',
];

/** Engine slot key for a UI index, or null for the reserves (they never cast). */
export function slotKey(index: number): string | null {
  return index < BATTLE_SLOTS ? `P${index + 1}` : null;
}

const ASSIST_TYPE = 4;

export function isAssistCard(card: Card): boolean {
  return card.stats.type === ASSIST_TYPE || card.stats.type_name === 'Assist';
}

export interface SlotState {
  cardId: string | null;
  assistId: string | null;
  /** Up to 3 bond slots; the assist occupies one, so at most 2 when an assist is set. */
  bonds: BondSlot[];
}

export interface TeamState {
  slots: SlotState[];
  /** Ordered cast groups of engine slot keys; priority left to right. */
  groups: string[][];
  bossId: number | null;
  bossLevel: number;
  iters: number;
  timeLimit: number;
}

export function emptySlot(): SlotState {
  return { cardId: null, assistId: null, bonds: [] };
}

export function emptyTeam(): TeamState {
  return {
    slots: Array.from({ length: SLOT_COUNT }, emptySlot),
    // One group by default: every battle slot fires together, which is the simplest
    // thing to reason about and the baseline other groupings get compared against.
    groups: [['P1', 'P2', 'P3', 'P4', 'P5']],
    bossId: null,
    bossLevel: 30,
    iters: 5,
    timeLimit: 300,
  };
}

export function toRequest(team: TeamState): SimRequest {
  return {
    cards: team.slots.map((s) => (s.cardId ? Number(s.cardId) : null)),
    assists: team.slots.map((s) => (s.assistId ? Number(s.assistId) : null)),
    bonds: team.slots.map((s) => s.bonds),
    groups: team.groups.filter((g) => g.length > 0),
    iters: team.iters,
    time_limit: team.timeLimit,
    boss_id: team.bossId,
    boss_level: team.bossLevel,
  };
}

const STORAGE_KEY = 'otogidb-team-simulator';

export function loadTeam(): TeamState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyTeam();
    const parsed = JSON.parse(raw) as Partial<TeamState>;
    const base = emptyTeam();
    return {
      ...base,
      ...parsed,
      // A stored team from an older shape must not shrink the slot list, or the
      // reserves silently become undefined and every read after them shifts.
      slots: Array.from(
        { length: SLOT_COUNT },
        (_, i) => parsed.slots?.[i] ?? emptySlot()
      ),
      groups: parsed.groups?.length ? parsed.groups : base.groups,
    };
  } catch {
    return emptyTeam();
  }
}

export function saveTeam(team: TeamState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(team));
  } catch {
    // Private browsing or blocked storage: the calculator still works, it just
    // forgets. Not worth surfacing.
  }
}
