/**
 * Talks to the Pyodide worker that runs the real battle simulator.
 *
 * There is deliberately no damage math on this side of the boundary. The site used
 * to have its own, and it drifted from the engine on defense, the attribute triangle,
 * LB exceed and most effect types. This module marshals JSON and nothing else.
 */

/** One card's free (non-assist) bond slots. Matches lifecycle.STAT_BOND_TYPES. */
export type BondKind = 'normal' | 'skill' | 'hp';
export type BondSlot = [BondKind, number];

export type Scheduler = 'group' | 'cadence';

/** When a retire-and-replace fires. Autos cap at 99,999 and skills at 999,999, and
 *  they saturate independently, so a card feeding only one channel is spent as soon
 *  as THAT one caps -- which is why this is a choice and not a constant. */
export type SwapWhen = 'autos' | 'skills' | 'either' | 'both';

export const SWAP_WHEN_LABELS: Record<SwapWhen, string> = {
  autos: 'auto attacks cap',
  skills: 'skill hits cap',
  either: 'autos or skills cap',
  both: 'autos and skills cap',
};

export interface SimRequest {
  /** 7 card ids in slot order: 4 active (0 is leader), helper, then 2 reserves. */
  cards: (number | null)[];
  assists: (number | null)[];
  /** Per-slot bonds, same order as `cards`. */
  bonds?: BondSlot[][];
  /** Ordered cast groups of slot keys ("P1".."P5"); priority left to right. */
  groups: string[][];
  /**
   * Player-authored retire-and-replace, {retiring: replacement}. The retiring slot
   * stops casting once a carry's auto attacks reach the damage cap, and the named
   * replacement starts. Deliberately the player's call, not something the engine
   * infers: retiring a card whose skill still carries an unsaturated buff measured
   * -1.8% on the team the mechanism was written for.
   */
  swap?: Record<string, string>;
  /** Which damage channel must saturate before the swap fires. */
  swap_when?: SwapWhen;
  /**
   * Cast policy. 'group' executes the rotation above; 'cadence' ignores it and lets
   * the engine pick its own (what the tier lists run). Groups are sent either way so
   * toggling does not lose them.
   */
  scheduler?: Scheduler;
  iters: number;
  /**
   * Base seed. A battle is deterministic in (team, scenario, seed), so this is the
   * run's identity: pass one to reproduce a result exactly, omit it for a fresh
   * random sample. The seed actually used always comes back on the result.
   */
  seed?: number | null;
  time_limit: number;
  /** 1-4 for a world boss; omit for the immortal dummy. */
  boss_id?: number | null;
  boss_level?: number;
  level?: number;
  lb?: number;
}

/**
 * A card's stats at the OPENING of the fight: after entry/wave/reserve abilities,
 * bonds and assists have landed, before anyone acts. Percentages are modifier totals
 * -- `dmg: 145` means the `(1 + DamageModifer)` stage runs at 2.45.
 */
export interface SimCardStats {
  slot: string;
  card_id: number;
  name: string;
  alive: boolean;
  /** Display ATK (internal x10), the number the site shows elsewhere. */
  /**
   * Display ATK including the Attack-bond contribution -- the same value the
   * engine ranks `max_atk` on, so the order shown here is the order a ranked buff
   * (Orihime's top-2, Tsukuyomi's top-3) actually targets.
   */
  atk: number;
  /** The card's ATK before bonds, for reference. */
  atk_base: number;
  hp: number;
  /** Resolved crit rate as a percentage, capped the way the battle caps it. */
  crit_rate: number;
  crit_dmg: number;
  dmg: number;
  normal_dmg: number;
  skill_dmg: number;
  /** Multiplicative skill-bond factor (1.15 = +15% skill damage). */
  skill_bond: number;
  shield: number;
  /** Raw speed stat. INVERTED — higher is slower — so show `interval` to a player. */
  speed: number;
  /** Speed modifier as a percentage. Buffs count half toward the interval. */
  speed_mod: number;
  /** True once the modifier hits the +/-100% clamp: more speed buys nothing. */
  speed_capped: boolean;
  /** Seconds between auto-attacks, after the modifier and its clamp. */
  interval: number;
}

/** One thing that happened in the battle, in the order a player would see it. */
export interface SimEvent {
  /** Seconds since the wave started. */
  t: number;
  kind: 'cast' | 'buff' | 'debuff' | 'cc' | 'death' | 'boss_cast' | 'wave_start';
  actor: string | null;
  target: string | null;
  /** Modifier name (DAMAGE, SHIELD, ...) or the CC type (STUN, SILENCE, ...). */
  stat?: string | null;
  value?: number | null;
  /** Seconds the effect lasts. 0 with `permanent` means it never lapses. */
  duration?: number;
  permanent?: boolean;
  damage?: number | null;
  crit?: boolean;
  /** Orbs this cast cost. The group policy holds every cast to 1. */
  cost?: number;
  /** Modifier total before / after this effect landed (buff and debuff only). */
  before?: number | null;
  after?: number | null;
  /** The recipient's full stat line the instant the effect landed. */
  snapshot?: Partial<SimCardStats> | null;
}

/** Damage a card dealt with one kind of hit, over the traced (seed 0) battle. */
export interface DamageSpread {
  n: number;
  total: number;
  min: number;
  max: number;
  mean: number;
}

export interface SimResult {
  mean: number;
  sd: number;
  /** The base seed this run used -- echoed back whether you chose it or not. */
  seed: number;
  per_seed: number[];
  iters: number;
  effective_time: number;
  wiped: boolean;
  deaths: number;
  survival_time: number;
  per_card: {
    slot: string;
    damage: number;
    /** Absent when the card never landed that kind of hit. */
    auto?: DamageSpread;
    skill?: DamageSpread;
  }[];
  /** Cast timestamps per slot, from the seed-0 battle. */
  casts: Record<string, number[]>;
  /** Followable play-by-play of the seed-0 battle. */
  timeline: SimEvent[];
  stats: SimCardStats[];
}

/** One step of the greedy group search, in the order it was decided. */
export interface SuggestStep {
  /** The group after this step, or null when the step was a rejection. */
  group: string[] | null;
  score: number;
  /** The slot this step added. */
  added?: string | null;
  /** The slot considered and turned down, which is why the search stopped. */
  rejected?: string;
  /** A ramp swap that beat the plain group. */
  swap?: Record<string, string>;
  /** Which damage channel must saturate before the swap fires. */
  swap_when?: SwapWhen;
}

export interface SuggestResult {
  groups: string[][];
  /** {retiring: replacement} -- a permanent-stack buffer vacating once it caps. */
  swap: Record<string, string>;
  /** The condition the suggested swap was measured under. */
  swap_when: SwapWhen;
  score: number;
  /** Members the orb budget allows: cost decay / orb regen. */
  cap: number;
  /** Castable slots the search left out. */
  dropped: string[];
  info: Record<string, { name: string; damage: boolean; ramp: boolean }>;
  /** Caveats the groups cannot express -- a ramp buffer's retire-at-cap, say. */
  notes: string[];
  trace: SuggestStep[];
  seed: number;
}

export type SimPhase =
  | 'runtime'
  | 'engine'
  | 'data'
  | 'init'
  | 'run'
  | 'suggest';

export interface SimClient {
  /** Start downloading the runtime. Safe to call repeatedly. */
  warmup(): Promise<void>;
  run(req: SimRequest): Promise<SimResult>;
  /** Pick the cast group for this team. Ignores `req.groups`; returns new ones. */
  suggest(req: SimRequest): Promise<SuggestResult>;
  onProgress(
    cb: (phase: SimPhase, detail: string, done?: number, total?: number) => void
  ): () => void;
  terminate(): void;
}

export function createSimClient(): SimClient {
  // Module worker, not classic: Pyodide 314 refuses to run in a classic worker.
  const worker = new Worker('/sim/worker.js', { type: 'module' });
  // Untyped payload: the same request/response plumbing carries both a scored run
  // and a group suggestion, and only the caller knows which it asked for.
  const pending = new Map<
    number,
    { resolve: (r: unknown) => void; reject: (e: Error) => void }
  >();
  const listeners = new Set<
    (phase: SimPhase, detail: string, done?: number, total?: number) => void
  >();
  let nextId = 1;
  let ready: Promise<void> | null = null;
  let readyResolve: (() => void) | null = null;
  let readyReject: ((e: Error) => void) | null = null;

  worker.onmessage = (e: MessageEvent) => {
    const msg = e.data || {};
    if (msg.type === 'progress') {
      listeners.forEach((cb) => cb(msg.phase, msg.detail, msg.done, msg.total));
      return;
    }
    if (msg.type === 'ready') {
      readyResolve?.();
      return;
    }
    if (msg.type === 'result') {
      pending.get(msg.id)?.resolve(msg.data);
      pending.delete(msg.id);
      return;
    }
    if (msg.type === 'error') {
      const err = new Error(msg.message);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)!.reject(err);
        pending.delete(msg.id);
      } else {
        readyReject?.(err);
        ready = null; // allow a retry after a failed download
      }
    }
  };

  worker.onerror = (e) => {
    const err = new Error(e.message || 'simulator worker failed');
    pending.forEach((p) => p.reject(err));
    pending.clear();
    readyReject?.(err);
    ready = null;
  };

  function warmup(): Promise<void> {
    if (!ready) {
      ready = new Promise<void>((resolve, reject) => {
        readyResolve = resolve;
        readyReject = reject;
      });
      worker.postMessage({ type: 'init' });
    }
    return ready;
  }

  // One battle at a time: the engine seeds a module-global RNG and installs the cast
  // policy on a process-wide singleton, so concurrent runs would interleave state.
  let queue: Promise<unknown> = Promise.resolve();

  function ask<T>(type: 'run' | 'suggest', req: SimRequest): Promise<T> {
    const task = queue.then(() => {
      const id = nextId++;
      return new Promise<T>((resolve, reject) => {
        pending.set(id, { resolve: resolve as (r: unknown) => void, reject });
        worker.postMessage({ type, id, payload: JSON.stringify(req) });
      });
    });
    queue = task.catch(() => undefined);
    return task;
  }

  return {
    warmup,
    run: (req) => ask<SimResult>('run', req),
    suggest: (req) => ask<SuggestResult>('suggest', req),
    onProgress(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    terminate() {
      worker.terminate();
      pending.forEach((p) => p.reject(new Error('simulator terminated')));
      pending.clear();
    },
  };
}
