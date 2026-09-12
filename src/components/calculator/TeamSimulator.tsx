/**
 * Team simulator: build a team, group the skill casts, run the real engine.
 *
 * The damage model is `otogi_sim`, running under Pyodide in a worker -- the same code
 * that generates the tier lists. This component has no damage math in it at all.
 *
 * Three columns, each owning one job: the team on the left (with the editor open only
 * for the selected card), the rotation and its output down the middle, the run's
 * headline numbers on the right. The rotation is laid out as rows so it stays short
 * and the timeline underneath gets the height -- that is where the insight lives.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from '../../types/card';
import { getFullCardsData } from '../../lib/cards';
import { createSimClient } from '../../lib/sim/client';
import type { SimClient, SimResult, BondSlot } from '../../lib/sim/client';
import {
  HELPER_INDEX,
  SLOT_LABELS,
  emptyTeam,
  isAssistCard,
  loadTeam,
  saveTeam,
  slotKey,
  toRequest,
  type TeamState,
} from '../../lib/sim/team';
import { CardSelector } from './CardSelector';
import { TeamSlotTabs } from './TeamSlotTabs';
import { BondPicker } from './BondPicker';
import { CardStats } from './CardStats';
import { StatsTable } from './StatsTable';
import { SkillGroups } from './SkillGroups';
import { SimResults } from './SimResults';
import { Timeline } from './Timeline';

const BOSSES: { id: number | null; name: string }[] = [
  { id: null, name: 'Target dummy (immortal)' },
  { id: 1, name: 'World Boss: Kinoe' },
  { id: 2, name: 'World Boss: Hinoto' },
  { id: 3, name: 'World Boss: Mizunoe' },
  { id: 4, name: 'World Boss: Kanoto' },
];

type OutputTab = 'timeline' | 'stats';

/**
 * Below xl the three columns become one, so the page turns into a workflow: pick the
 * team, group the casts, read the number, then read the play-by-play. Each step gets
 * the whole screen. The opening-stats table is desktop-only — seven numeric columns
 * cannot be made useful on a phone, and the per-card line in the team editor already
 * carries the same figures for the card you are looking at.
 */
type Step = 'team' | 'rotation' | 'result' | 'timeline';

const STEPS: { key: Step; label: string }[] = [
  { key: 'team', label: 'Team' },
  { key: 'rotation', label: 'Rotation' },
  { key: 'result', label: 'Result' },
  { key: 'timeline', label: 'Timeline' },
];

export default function TeamSimulator() {
  const [cards, setCards] = useState<Card[]>([]);
  const [team, setTeam] = useState<TeamState>(emptyTeam);
  const [result, setResult] = useState<SimResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState(0);
  const [tab, setTab] = useState<OutputTab>('timeline');
  const [step, setStep] = useState<Step>('team');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [shareNote, setShareNote] = useState<string | null>(null);
  const client = useRef<SimClient | null>(null);

  useEffect(() => {
    setTeam(loadTeam());
    getFullCardsData()
      .then((d) => setCards(Object.values(d.cards) as Card[]))
      .catch((e) => setError(`Could not load card data: ${e}`));
  }, []);

  useEffect(() => {
    saveTeam(team);
  }, [team]);

  const getClient = useCallback(() => {
    if (!client.current) {
      client.current = createSimClient();
      client.current.onProgress((_phase, detail) => setStatus(detail));
    }
    return client.current;
  }, []);

  useEffect(() => () => client.current?.terminate(), []);

  const { battleCards, assistCards } = useMemo(() => {
    const playable = cards.filter((c) => c.playable !== false);
    return {
      battleCards: playable.filter((c) => !isAssistCard(c)),
      assistCards: playable.filter(isAssistCard),
    };
  }, [cards]);

  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const cardOf = useCallback(
    (key: string) => {
      const id = team.slots[Number(key.slice(1)) - 1]?.cardId;
      return (id && byId.get(id)) || null;
    },
    [team.slots, byId]
  );

  const assistOf = useCallback(
    (key: string) => {
      const id = team.slots[Number(key.slice(1)) - 1]?.assistId;
      return (id && byId.get(id)) || null;
    },
    [team.slots, byId]
  );

  const nameOf = useCallback(
    (key: string) => {
      const idx = Number(key.slice(1)) - 1;
      const id = team.slots[idx]?.cardId;
      return (id && byId.get(id)?.name) || SLOT_LABELS[idx] || key;
    },
    [team.slots, byId]
  );

  function patchSlot(i: number, patch: Partial<TeamState['slots'][number]>) {
    setTeam((t) => ({
      ...t,
      slots: t.slots.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    }));
  }

  const filled = team.slots.filter((s) => s.cardId).length;

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const c = getClient();
      await c.warmup();
      setStatus(null);
      setResult(await c.run(toRequest(team)));
      // On a phone the result is off-screen behind a tab, so go there.
      setStep('result');
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setRunning(false);
      setStatus(null);
    }
  }

  async function exportTeam() {
    const text = JSON.stringify(team, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setShareNote('Copied to clipboard');
    } catch {
      // Clipboard needs a secure context and permission; fall back to a file so
      // export still works over plain http and in locked-down browsers.
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'otogi-team.json';
      a.click();
      URL.revokeObjectURL(url);
      setShareNote('Downloaded otogi-team.json');
    }
    setTimeout(() => setShareNote(null), 2500);
  }

  function importTeam() {
    try {
      const parsed = JSON.parse(importText) as Partial<TeamState>;
      if (!Array.isArray(parsed.slots)) throw new Error('no slots in that JSON');
      const base = emptyTeam();
      setTeam({
        ...base,
        ...parsed,
        // Rebuild the slot list at full length: a short or padded array from an
        // edited file would otherwise shift every slot after the gap.
        slots: Array.from(
          { length: base.slots.length },
          (_, i) => parsed.slots?.[i] ?? { cardId: null, assistId: null, bonds: [] }
        ),
        groups: parsed.groups?.length ? parsed.groups : base.groups,
      });
      setImportOpen(false);
      setImportText('');
      setShareNote('Team imported');
      setTimeout(() => setShareNote(null), 2500);
    } catch (e) {
      setShareNote(`Could not import: ${e instanceof Error ? e.message : e}`);
    }
  }

  const available = team.slots
    .map((s, i) => (s.cardId && slotKey(i) ? slotKey(i) : null))
    .filter((x): x is string => x !== null);

  const slot = team.slots[activeSlot];
  const activeStats = result?.stats.find((x) => x.slot === `P${activeSlot + 1}`) ?? null;

  return (
    <div className="flex flex-col gap-3">
      {/* fight bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-background">
        <select
          value={team.bossId === null ? '' : String(team.bossId)}
          onChange={(e) =>
            setTeam((t) => ({ ...t, bossId: e.target.value ? Number(e.target.value) : null }))
          }
          className="px-2 py-1 bg-surface border border-border rounded text-primary text-sm"
        >
          {BOSSES.map((b) => (
            <option key={b.id === null ? 'dummy' : b.id} value={b.id === null ? '' : b.id}>
              {b.name}
            </option>
          ))}
        </select>

        {team.bossId !== null && (
          <label className="flex items-center gap-2 text-xs text-secondary">
            Lv
            <input
              type="number"
              min={1}
              max={30}
              value={team.bossLevel}
              onChange={(e) => setTeam((t) => ({ ...t, bossLevel: Number(e.target.value) }))}
              className="w-14 px-2 py-1 bg-surface border border-border rounded text-primary text-sm"
            />
          </label>
        )}

        <label className="flex items-center gap-2 text-xs text-secondary">
          Runs
          <input
            type="number"
            min={1}
            max={20}
            value={team.iters}
            onChange={(e) =>
              setTeam((t) => ({ ...t, iters: Math.max(1, Number(e.target.value)) }))
            }
            className="w-14 px-2 py-1 bg-surface border border-border rounded text-primary text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-secondary">
          Seconds
          <input
            type="number"
            min={10}
            max={600}
            step={10}
            value={team.timeLimit}
            onChange={(e) =>
              setTeam((t) => ({ ...t, timeLimit: Math.max(10, Number(e.target.value)) }))
            }
            className="w-16 px-2 py-1 bg-surface border border-border rounded text-primary text-sm"
          />
        </label>

        <div className="ml-auto flex items-center gap-2">
          {shareNote && <span className="text-xs text-secondary">{shareNote}</span>}
          <button
            type="button"
            onClick={exportTeam}
            className="px-2 py-1 rounded border border-border text-xs text-secondary hover:text-primary"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => setImportOpen((v) => !v)}
            className="px-2 py-1 rounded border border-border text-xs text-secondary hover:text-primary"
          >
            Import
          </button>
          <button
            type="button"
            onClick={run}
            disabled={running || filled === 0}
            className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50"
          >
            {running ? status || 'Running…' : 'Run'}
          </button>
        </div>
      </div>

      {importOpen && (
        <div className="p-2 rounded-lg border border-border bg-background">
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste exported team JSON here"
            rows={4}
            className="w-full px-2 py-1 bg-surface border border-border rounded text-primary text-xs font-mono"
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={importTeam}
              disabled={!importText.trim()}
              className="px-2 py-1 rounded bg-accent text-white text-xs disabled:opacity-50"
            >
              Load team
            </button>
            <button
              type="button"
              onClick={() => {
                setImportOpen(false);
                setImportText('');
              }}
              className="px-2 py-1 rounded border border-border text-xs text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* step bar — phone and tablet only */}
      <div className="flex xl:hidden border-b border-border">
        {STEPS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setStep(t.key);
              // The sub-tabs do not exist at this width, so the timeline step must
              // put the output panel on the timeline itself.
              if (t.key === 'timeline') setTab('timeline');
            }}
            className={`flex-1 text-sm py-2 -mb-px border-b-2 ${
              step === t.key
                ? 'border-accent text-primary font-medium'
                : 'border-transparent text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[17rem_minmax(0,1fr)_18rem]">
        {/* ---------- team ---------- */}
        <section
          className={`${step === 'team' ? 'flex' : 'hidden'} xl:flex flex-col gap-2`}
        >
          <div className="flex items-center">
            <h2 className="text-sm font-medium text-primary">Team</h2>
            <span className="ml-auto text-xs text-secondary">{filled} / 7</span>
          </div>

          <TeamSlotTabs
            active={activeSlot}
            onSelect={setActiveSlot}
            cardAt={(i) => {
              const id = team.slots[i]?.cardId;
              return (id && byId.get(id)) || null;
            }}
            assistAt={(i) => {
              const id = team.slots[i]?.assistId;
              return (id && byId.get(id)) || null;
            }}
            bondCountAt={(i) => team.slots[i]?.bonds.length || 0}
          />

          <div className="p-3 rounded-lg border border-border bg-background flex flex-col gap-3">
            <div className="flex items-center">
              <span className="text-xs text-secondary">{SLOT_LABELS[activeSlot]}</span>
              {slot?.cardId && (
                <button
                  type="button"
                  onClick={() =>
                    patchSlot(activeSlot, { cardId: null, assistId: null, bonds: [] })
                  }
                  className="ml-auto text-xs text-secondary hover:text-primary"
                >
                  Clear slot
                </button>
              )}
            </div>

            <CardSelector
              cards={battleCards}
              selectedId={slot?.cardId ?? null}
              onSelect={(id) => patchSlot(activeSlot, { cardId: id })}
              label=""
            />
            <CardSelector
              cards={assistCards}
              selectedId={slot?.assistId ?? null}
              onSelect={(id) => patchSlot(activeSlot, { assistId: id })}
              label="Assist"
              placeholder="Search assists..."
            />

            <div>
              <div className="text-xs text-secondary mb-1.5">Bonds — 2 free slots</div>
              <BondPicker
                bonds={slot?.bonds ?? []}
                onChange={(bonds: BondSlot[]) => patchSlot(activeSlot, { bonds })}
              />
              <p className="text-[10px] text-secondary/70 mt-2 leading-relaxed">
                {activeSlot > HELPER_INDEX
                  ? 'Reserves contribute passives only — their bonds do nothing.'
                  : 'An ATK bond raises this card in max-ATK buff targeting — it decides who receives a ranked buff.'}
              </p>
            </div>

            {activeStats && (
              <div className="pt-2 border-t border-border/60">
                <div className="text-xs text-secondary mb-1.5">Opening stats</div>
                <CardStats stats={activeStats} compact />
              </div>
            )}
          </div>
        </section>

        {/* ---------- rotation + output ---------- */}
        <section
          className={`${
            step === 'rotation' || step === 'timeline' ? 'flex' : 'hidden'
          } xl:flex flex-col gap-3 min-w-0`}
        >
          <div className={`${step === 'rotation' ? 'block' : 'hidden'} xl:block`}>
            <h2 className="text-sm font-medium text-primary mb-2 xl:block hidden">
              Rotation
            </h2>
            <SkillGroups
              available={available}
              groups={team.groups}
              onChange={(groups) => setTeam((t) => ({ ...t, groups }))}
              cardOf={cardOf}
              assistOf={assistOf}
              nameOf={nameOf}
            />
            <p className="text-[10px] text-secondary mt-2 leading-relaxed">
              Groups fire in order, and only when the lead card can cast at 1 orb — so a
              group repeats roughly every 20s on its own. Same group means fire together;
              to keep two cards apart, put them in different groups.
            </p>
          </div>

          {/* The sub-tabs are desktop-only: on a phone Timeline is a step of its own
              and Opening stats is not offered at all. */}
          <div className="hidden xl:flex items-center gap-3 border-b border-border">
            <button
              type="button"
              onClick={() => setTab('timeline')}
              className={`text-sm pb-1.5 -mb-px border-b-2 ${
                tab === 'timeline'
                  ? 'border-accent text-primary font-medium'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              Battle timeline
            </button>
            <button
              type="button"
              onClick={() => setTab('stats')}
              className={`text-sm pb-1.5 -mb-px border-b-2 ${
                tab === 'stats'
                  ? 'border-accent text-primary font-medium'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              Opening stats
            </button>
            {result && (
              <span className="ml-auto text-[10px] text-secondary pb-1.5">
                {tab === 'timeline'
                  ? `first run · ${result.timeline?.length ?? 0} events`
                  : 'after abilities, bonds and assists — before anyone acts'}
              </span>
            )}
          </div>

          <div className={`${step === 'timeline' ? 'block' : 'hidden'} xl:block min-w-0`}>
            {!result && (
              <div className="p-3 rounded-lg border border-border bg-background text-sm text-secondary">
                {running ? 'Simulating…' : 'Pick a team and run a simulation.'}
              </div>
            )}
            {result && tab === 'timeline' && (
              <Timeline events={result.timeline} nameOf={nameOf} />
            )}
            {/* Desktop only: the table needs seven columns of room. */}
            {result && tab === 'stats' && (
              <div className="hidden xl:block">
                <StatsTable stats={result.stats} />
              </div>
            )}
          </div>
        </section>

        {/* ---------- results ---------- */}
        <section className={`${step === 'result' ? 'block' : 'hidden'} xl:block min-w-0`}>
          <SimResults result={result} running={running} error={error} nameOf={nameOf} />
        </section>
      </div>
    </div>
  );
}
