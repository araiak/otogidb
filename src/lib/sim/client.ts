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

export interface SimRequest {
  /** 7 card ids in slot order: 4 active (0 is leader), helper, then 2 reserves. */
  cards: (number | null)[];
  assists: (number | null)[];
  /** Per-slot bonds, same order as `cards`. */
  bonds?: BondSlot[][];
  /** Ordered cast groups of slot keys ("P1".."P5"); priority left to right. */
  groups: string[][];
  iters: number;
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
  atk: number;
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

export interface SimResult {
  mean: number;
  sd: number;
  per_seed: number[];
  iters: number;
  effective_time: number;
  wiped: boolean;
  deaths: number;
  survival_time: number;
  per_card: { slot: string; damage: number }[];
  /** Cast timestamps per slot, from the seed-0 battle. */
  casts: Record<string, number[]>;
  /** Followable play-by-play of the seed-0 battle. */
  timeline: SimEvent[];
  stats: SimCardStats[];
}

export type SimPhase = 'runtime' | 'engine' | 'data' | 'init';

export interface SimClient {
  /** Start downloading the runtime. Safe to call repeatedly. */
  warmup(): Promise<void>;
  run(req: SimRequest): Promise<SimResult>;
  onProgress(cb: (phase: SimPhase, detail: string) => void): () => void;
  terminate(): void;
}

export function createSimClient(): SimClient {
  // Module worker, not classic: Pyodide 314 refuses to run in a classic worker.
  const worker = new Worker('/sim/worker.js', { type: 'module' });
  const pending = new Map<
    number,
    { resolve: (r: SimResult) => void; reject: (e: Error) => void }
  >();
  const listeners = new Set<(phase: SimPhase, detail: string) => void>();
  let nextId = 1;
  let ready: Promise<void> | null = null;
  let readyResolve: (() => void) | null = null;
  let readyReject: ((e: Error) => void) | null = null;

  worker.onmessage = (e: MessageEvent) => {
    const msg = e.data || {};
    if (msg.type === 'progress') {
      listeners.forEach((cb) => cb(msg.phase, msg.detail));
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

  function run(req: SimRequest): Promise<SimResult> {
    const task = queue.then(() => {
      const id = nextId++;
      return new Promise<SimResult>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.postMessage({ type: 'run', id, payload: JSON.stringify(req) });
      });
    });
    queue = task.catch(() => undefined);
    return task;
  }

  return {
    warmup,
    run,
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
