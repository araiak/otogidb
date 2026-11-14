import { describe, expect, it, beforeEach } from 'vitest';

// vitest runs these in the node environment, which has no localStorage. team.ts
// wraps every access in try/catch and degrades to a blank team, so without a stub
// these tests would pass vacuously. A Map is the whole API we use.
const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
});

const { emptyTeam, hasSavedTeam, loadTeam, saveTeam, SAVE_SLOTS } = await import('./team');

describe('named save slots', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips a team through a slot without touching the autosave', () => {
    const autosave = emptyTeam();
    autosave.bossLevel = 1;
    saveTeam(autosave);

    const saved = emptyTeam();
    saved.bossLevel = 30;
    saved.slots[0].cardId = '1650';
    saveTeam(saved, 2);

    expect(loadTeam(2).bossLevel).toBe(30);
    expect(loadTeam(2).slots[0].cardId).toBe('1650');
    // The autosave is a separate key and must not have moved.
    expect(loadTeam().bossLevel).toBe(1);
  });

  it('reports which slots are filled, and empty ones load as a blank team', () => {
    expect(SAVE_SLOTS.filter(hasSavedTeam)).toEqual([]);
    saveTeam(emptyTeam(), 3);
    expect(SAVE_SLOTS.filter(hasSavedTeam)).toEqual([3]);
    expect(loadTeam(1).slots).toHaveLength(emptyTeam().slots.length);
  });

  it('pads a short slot list so an old save cannot shift the reserves', () => {
    localStorage.setItem(
      'otogidb-team-simulator-save1',
      JSON.stringify({ slots: [{ cardId: '1631', assistId: null, bonds: [] }] })
    );
    const team = loadTeam(1);
    expect(team.slots).toHaveLength(emptyTeam().slots.length);
    expect(team.slots[0].cardId).toBe('1631');
    expect(team.slots[6]).toEqual({ cardId: null, assistId: null, bonds: [] });
  });
});

describe('share links', () => {
  it('round-trips a full team through the URL encoding', async () => {
    const { encodeTeam, decodeTeam, teamParamFromHash } = await import('./team');
    const team = emptyTeam();
    team.slots[0] = { cardId: '1650', assistId: '900', bonds: [['atk', 3] as never] };
    team.slots[4].cardId = '1631';
    team.bossId = 2;
    team.bossLevel = 12;
    team.seed = 42;
    team.scheduler = 'group';
    team.groups = [['P1', 'P5'], ['P2']];

    const value = await encodeTeam(team);
    expect(value).toMatch(/^[zj][A-Za-z0-9_-]+$/);
    expect(teamParamFromHash(`#team=${value}`)).toBe(value);
    expect(await decodeTeam(value)).toEqual(team);
  });

  it('keeps a blank team short and rejects garbage', async () => {
    const { encodeTeam, decodeTeam } = await import('./team');
    const value = await encodeTeam(emptyTeam());
    expect(value.length).toBeLessThan(20);
    expect(await decodeTeam(value)).toEqual(emptyTeam());
    expect(await decodeTeam('znot-a-team')).toBeNull();
    expect(await decodeTeam('xabc')).toBeNull();
  });
});
