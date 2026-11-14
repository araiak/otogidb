/**
 * Team shape for the simulator UI.
 *
 * The site thinks in 7 slots; the engine's contract splits the 5 battle slots into
 * 4 active plus a helper, because the helper is borrowed and is scoped separately for
 * overlay abilities. `web.py` does that split, so the UI keeps the flat list.
 */

import type { Card } from '../../types/card';
import type { BondSlot, Scheduler, SimRequest, SwapWhen } from './client';

/** The calculator's Casting control: an engine policy, or the planner held to the
 *  player's groups (sent as scheduler 'plan' + plan_groups). */
export type CastPolicy = Scheduler | 'plan_groups';

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
  /** {retiring: replacement} -- a card that stands down once the carry's autos cap. */
  swap: Record<string, string>;
  /** Which channel has to cap before the swap above fires. */
  swapWhen: SwapWhen;
  /** 'group' runs the groups above; 'cadence'/'plan' let the engine choose;
   *  'plan_groups' plans within the groups above; 'auto' runs all and keeps the best. */
  scheduler: CastPolicy;
  /** With 'plan_groups': the cycle length copied from a planner run ('' = planner's pick). */
  planForce?: string;
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
    swap: {},
    swapWhen: 'autos',
    // Best of cadence, the planner and the groups: never below any of them.
    scheduler: 'auto',
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
    // Only send a swap whose BOTH ends still have a card and a group -- an edit that
    // removed one of them would otherwise ship a dangling rule the engine silently
    // ignores, and the run would not match what the editor shows.
    swap: Object.fromEntries(
      Object.entries(team.swap ?? {}).filter(
        ([a, b]) => team.groups.flat().includes(a) && team.groups.flat().includes(b)
      )
    ),
    swap_when: team.swapWhen ?? 'autos',
    scheduler: team.scheduler === 'plan_groups' ? 'plan' : team.scheduler,
    plan_groups: team.scheduler === 'plan_groups',
    plan_force: team.scheduler === 'plan_groups' ? (team.planForce ?? '') : '',
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

const BOND_KINDS = ['normal', 'skill', 'hp'];
const SCHEDULERS: CastPolicy[] = ['group', 'cadence', 'plan', 'auto', 'plan_groups'];
const SWAP_WHENS: SwapWhen[] = ['autos', 'skills', 'either', 'both'];
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isKey = (v: unknown): v is string => typeof v === 'string' && /^P[1-5]$/.test(v);
const clamp = (v: unknown, lo: number, hi: number, fallback: number) =>
  isNum(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

function cardRef(v: unknown): string | null {
  if (isNum(v)) return String(v);
  return typeof v === 'string' && v ? v : null;
}

function normalizeSlot(raw: unknown): SlotState {
  if (!raw || typeof raw !== 'object') return emptySlot();
  const s = raw as Record<string, unknown>;
  const bonds = Array.isArray(s.bonds)
    ? s.bonds
        .filter((b): b is BondSlot => Array.isArray(b) && BOND_KINDS.includes(b[0]) && isNum(b[1]))
        .slice(0, 3)
    : [];
  return { cardId: cardRef(s.cardId), assistId: cardRef(s.assistId), bonds };
}

/** Rebuild a stored, imported or shared team field by field. All three come from
 *  outside the page (an old save, a hand-edited file, someone else's link), so every
 *  field is type-checked and anything malformed falls back to its default instead of
 *  reaching toRequest or the UI -- and, through the autosave, every later reload. */
export function normalizeTeam(parsed: unknown): TeamState {
  const base = emptyTeam();
  const p = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
  const slots: unknown[] = Array.isArray(p.slots) ? p.slots : [];
  const team: TeamState = {
    // Always full length, or an older short save shifts every read after the gap.
    slots: Array.from({ length: SLOT_COUNT }, (_, i) => normalizeSlot(slots[i])),
    // An explicit [] is the player's choice and is kept; only a missing or
    // malformed list falls back to the default group.
    groups: Array.isArray(p.groups)
      ? p.groups.filter(Array.isArray).map((g: unknown[]) => g.filter(isKey))
      : base.groups,
    swap:
      p.swap && typeof p.swap === 'object' && !Array.isArray(p.swap)
        ? Object.fromEntries(
            Object.entries(p.swap as Record<string, unknown>).filter(
              (e): e is [string, string] => isKey(e[0]) && isKey(e[1])
            )
          )
        : base.swap,
    swapWhen: SWAP_WHENS.includes(p.swapWhen as SwapWhen)
      ? (p.swapWhen as SwapWhen)
      : base.swapWhen,
    // Teams saved before the control existed have no scheduler.
    scheduler: SCHEDULERS.includes(p.scheduler as CastPolicy)
      ? (p.scheduler as CastPolicy)
      : base.scheduler,
    bossId: isNum(p.bossId) ? p.bossId : base.bossId,
    // Same bounds as the inputs, so a link cannot ask the worker for a huge run.
    bossLevel: clamp(p.bossLevel, 1, 30, base.bossLevel),
    iters: clamp(p.iters, 1, 20, base.iters),
    timeLimit: clamp(p.timeLimit, 10, 600, base.timeLimit),
    seed: isNum(p.seed) ? Math.max(0, p.seed) : base.seed,
  };
  if (typeof p.planForce === 'string' && p.planForce) team.planForce = p.planForce;
  return team;
}

export function loadTeam(slot?: number): TeamState {
  try {
    const raw = localStorage.getItem(storageKey(slot));
    if (!raw) return emptyTeam();
    return normalizeTeam(JSON.parse(raw));
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

// ---------------------------------------------------------------------------
// Share links
//
// The team lives in the URL hash (#team=...) so a link reproduces the exact setup:
// cards, assists, bonds, groups, boss and run settings. The hash, not the query,
// because the page is static and the hash never reaches the server or the CDN cache.
//
// Every setting is written even at its default, so an old link keeps its meaning when
// emptyTeam() changes. Empty slots shrink to 0. The JSON is not compressed: a full
// team is a few hundred characters, and plain base64 decodes in every browser and
// synchronously, so Share can write the clipboard inside the click. The 'j' prefix
// leaves room for another format later.
// ---------------------------------------------------------------------------

export const SHARE_PARAM = 'team';

type CompactSlot = 0 | [string | null, string | null, BondSlot[]?];

function compactTeam(team: TeamState): Record<string, unknown> {
  const out: Record<string, unknown> = {
    groups: team.groups,
    swap: team.swap,
    swapWhen: team.swapWhen,
    scheduler: team.scheduler,
    bossId: team.bossId,
    bossLevel: team.bossLevel,
    iters: team.iters,
    timeLimit: team.timeLimit,
    seed: team.seed,
  };
  if (team.planForce) out.planForce = team.planForce;
  const slots: CompactSlot[] = team.slots.map((s) =>
    !s.cardId && !s.assistId && !s.bonds.length
      ? 0
      : s.bonds.length
        ? [s.cardId, s.assistId, s.bonds]
        : [s.cardId, s.assistId]
  );
  while (slots.length && slots[slots.length - 1] === 0) slots.pop();
  if (slots.length) out.s = slots;
  return out;
}

function expandTeam(raw: Record<string, unknown>): TeamState {
  const { s, ...rest } = raw;
  const slots = Array.isArray(s)
    ? s.map((c) => (Array.isArray(c) ? { cardId: c[0], assistId: c[1], bonds: c[2] } : null))
    : [];
  return normalizeTeam({ ...rest, slots });
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Encode a team for the URL hash. */
export function encodeTeam(team: TeamState): string {
  return 'j' + toBase64Url(new TextEncoder().encode(JSON.stringify(compactTeam(team))));
}

/** Decode a value written by encodeTeam(); null if it is not a team. */
export function decodeTeam(value: string): TeamState | null {
  if (value[0] !== 'j') return null;
  try {
    const raw = JSON.parse(new TextDecoder().decode(fromBase64Url(value.slice(1))));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    return expandTeam(raw as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Nothing worth putting in the URL: the team encodes the same as a fresh one.
 *  Compares encodings, so key order and stray keys (planForce: '') do not matter. */
export function isBlankTeam(team: TeamState): boolean {
  return encodeTeam(team) === encodeTeam(emptyTeam());
}

/** The team value in a location hash ("#team=..."), if there is one. */
export function teamParamFromHash(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, '')).get(SHARE_PARAM);
}

/** The hash with the team param set (or removed, for null) and everything else kept,
 *  so an anchor or another param survives the URL sync. */
export function hashWithTeam(hash: string, value: string | null): string {
  const parts = hash
    .replace(/^#/, '')
    .split('&')
    .filter((p) => p && !p.startsWith(`${SHARE_PARAM}=`));
  if (value) parts.push(`${SHARE_PARAM}=${value}`);
  return parts.length ? `#${parts.join('&')}` : '';
}
