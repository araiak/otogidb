/**
 * Team shape for the simulator UI.
 *
 * The site thinks in 7 slots; the engine's contract splits the 5 battle slots into
 * 4 active plus a helper, because the helper is borrowed and is scoped separately for
 * overlay abilities. `web.py` does that split, so the UI keeps the flat list.
 */

import type { Card } from '../../types/card';
import type { BondSlot, Scheduler, SimRequest } from './client';

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
  /** 'group' runs the groups above; 'cadence' lets the engine choose. */
  scheduler: Scheduler;
  bossId: number | null;
  bossLevel: number;
  iters: number;
  timeLimit: number;
  /** null = roll a fresh seed each run; a number pins the fight. */
  seed: number | null;
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
    scheduler: 'group',
    bossId: null,
    bossLevel: 30,
    iters: 5,
    timeLimit: 300,
    seed: null,
  };
}

export function toRequest(team: TeamState): SimRequest {
  return {
    cards: team.slots.map((s) => (s.cardId ? Number(s.cardId) : null)),
    assists: team.slots.map((s) => (s.assistId ? Number(s.assistId) : null)),
    bonds: team.slots.map((s) => s.bonds),
    groups: team.groups.filter((g) => g.length > 0),
    scheduler: team.scheduler,
    iters: team.iters,
    seed: team.seed,
    time_limit: team.timeLimit,
    boss_id: team.bossId,
    boss_level: team.bossLevel,
  };
}

const STORAGE_KEY = 'otogidb-team-simulator';

/** Named save slots, on top of the autosave. Three is enough to compare a couple of
 *  builds without turning this into a team manager. */
export const SAVE_SLOTS = [1, 2, 3];

/** No slot = the autosave the calculator restores on load. */
function storageKey(slot?: number): string {
  return slot ? `${STORAGE_KEY}-save${slot}` : STORAGE_KEY;
}

export function loadTeam(slot?: number): TeamState {
  try {
    const raw = localStorage.getItem(storageKey(slot));
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
      // Teams saved before the control existed have no scheduler.
      scheduler: parsed.scheduler ?? base.scheduler,
    };
  } catch {
    return emptyTeam();
  }
}

export function saveTeam(team: TeamState, slot?: number): void {
  try {
    localStorage.setItem(storageKey(slot), JSON.stringify(team));
  } catch {
    // Private browsing or blocked storage: the calculator still works, it just
    // forgets. Not worth surfacing.
  }
}

/** Does this save slot hold a team? Drives the Load buttons' disabled state. */
export function hasSavedTeam(slot: number): boolean {
  try {
    return localStorage.getItem(storageKey(slot)) !== null;
  } catch {
    return false;
  }
}
