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

const {
  decodeTeam,
  emptyTeam,
  encodeTeam,
  hashWithTeam,
  hasSavedTeam,
  isBlankTeam,
  loadTeam,
  saveTeam,
  SAVE_SLOTS,
  teamParamFromHash,
  toRequest,
} = await import('./team');
type TeamState = import('./team').TeamState;

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
      JSON.stringify({
        slots: [{ cardId: '1631', assistId: null, bonds: [] }],
      })
    );
    const team = loadTeam(1);
    expect(team.slots).toHaveLength(emptyTeam().slots.length);
    expect(team.slots[0].cardId).toBe('1631');
    expect(team.slots[6]).toEqual({ cardId: null, assistId: null, bonds: [] });
  });
});

describe('share links', () => {
  // Builds a link from an arbitrary payload, the way a hand-made or corrupted one would.
  const linkFor = (payload: unknown) =>
    'j' +
    Buffer.from(JSON.stringify(payload))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  it('round-trips a full team through the URL encoding', () => {
    const team = emptyTeam();
    team.slots[0] = { cardId: '1650', assistId: '900', bonds: [['skill', 3]] };
    team.slots[4].cardId = '1631';
    team.bossId = 2;
    team.bossLevel = 12;
    team.seed = 42;
    team.scheduler = 'group';
    team.groups = [['P1', 'P5'], ['P2']];

    const value = encodeTeam(team);
    expect(value).toMatch(/^j[A-Za-z0-9_-]+$/);
    expect(teamParamFromHash(`#team=${value}`)).toBe(value);
    expect(decodeTeam(value)).toEqual(team);
  });

  it('round-trips a blank team and rejects garbage', () => {
    expect(decodeTeam(encodeTeam(emptyTeam()))).toEqual(emptyTeam());
    expect(decodeTeam('jnot-a-team')).toBeNull();
    expect(decodeTeam('xabc')).toBeNull();
    expect(decodeTeam(linkFor([1, 2]))).toBeNull();
  });

  // Regression: a malformed link used to reach toRequest and crash it, and the bad
  // team was autosaved, so every reload stayed broken.
  it('sanitises every field of a malformed link', () => {
    const team = decodeTeam(
      linkFor({
        groups: 'P1',
        swap: null,
        swapWhen: 'never',
        scheduler: 42,
        bossId: 'x',
        bossLevel: 'abc',
        iters: 1e9,
        timeLimit: -5,
        seed: 'y',
        junk: true,
        s: [['1650', null, 'x'], 'bad', [7, 8, [['skill', 2], ['bogus', 1], 'z']]],
      })
    );
    expect(team).not.toBeNull();
    const t = team!;
    expect(t.groups).toEqual(emptyTeam().groups);
    expect(t.swap).toEqual({});
    expect(t.swapWhen).toBe('autos');
    expect(t.scheduler).toBe('auto');
    expect(t.bossId).toBeNull();
    expect(t.bossLevel).toBe(30);
    expect(t.iters).toBe(20);
    expect(t.timeLimit).toBe(10);
    expect(t.seed).toBeNull();
    expect('junk' in t).toBe(false);
    expect(t.slots[0]).toEqual({ cardId: '1650', assistId: null, bonds: [] });
    expect(t.slots[1]).toEqual({ cardId: null, assistId: null, bonds: [] });
    expect(t.slots[2]).toEqual({
      cardId: '7',
      assistId: '8',
      bonds: [['skill', 2]],
    });
    // The point of all of the above: the engine request builds without throwing.
    expect(() => toRequest(t)).not.toThrow();
  });

  it('drops group keys and swap ends that are not battle slots', () => {
    const t = decodeTeam(
      linkFor({
        groups: [['P1', 'P9', 3], 'P2'],
        swap: { P1: 'P2', P3: 5, R1: 'P2' },
      })
    )!;
    expect(t.groups).toEqual([['P1']]);
    expect(t.swap).toEqual({ P1: 'P2' });
  });

  // Regression: defaults were left out of the link, so changing emptyTeam() would
  // silently change what every old link runs.
  it('writes run settings even when they equal the defaults', () => {
    const raw = JSON.parse(
      Buffer.from(encodeTeam(emptyTeam()).slice(1), 'base64url').toString('utf-8')
    );
    for (const k of ['bossLevel', 'iters', 'timeLimit', 'scheduler', 'swapWhen', 'groups']) {
      expect(raw).toHaveProperty(k);
    }
  });

  // Regression: links were deflate-raw, unreadable where DecompressionStream is missing.
  it('needs no compression API to encode or decode', () => {
    const saved = [globalThis.CompressionStream, globalThis.DecompressionStream];
    // @ts-expect-error -- simulating an older browser
    delete globalThis.CompressionStream;
    // @ts-expect-error -- simulating an older browser
    delete globalThis.DecompressionStream;
    try {
      const team = emptyTeam();
      team.slots[0].cardId = '1650';
      expect(decodeTeam(encodeTeam(team))?.slots[0].cardId).toBe('1650');
    } finally {
      [globalThis.CompressionStream, globalThis.DecompressionStream] = saved;
    }
  });

  // Regression: a team with every group cleared came back with the default group.
  it('keeps an explicitly empty group list', () => {
    const team = emptyTeam();
    team.groups = [];
    expect(decodeTeam(encodeTeam(team))?.groups).toEqual([]);
  });

  // Regression: blank was JSON.stringify equality, broken by key order or stray keys.
  it('treats key order and an empty planForce as still blank', () => {
    const { seed, ...rest } = emptyTeam();
    const reordered = { seed, ...rest, planForce: '' } as TeamState;
    expect(isBlankTeam(reordered)).toBe(true);
    const edited = emptyTeam();
    edited.slots[5].cardId = '1720';
    expect(isBlankTeam(edited)).toBe(false);
  });

  // Regression: the URL sync replaced the whole hash, wiping anchors and other params.
  it('sets and clears the team param without touching the rest of the hash', () => {
    expect(hashWithTeam('', 'jabc')).toBe('#team=jabc');
    expect(hashWithTeam('#rotation', 'jabc')).toBe('#rotation&team=jabc');
    expect(hashWithTeam('#a=1&team=jold', 'jnew')).toBe('#a=1&team=jnew');
    expect(hashWithTeam('#a=1&team=jold', null)).toBe('#a=1');
    expect(hashWithTeam('#team=jold', null)).toBe('');
    expect(teamParamFromHash(hashWithTeam('#rotation', 'jabc'))).toBe('jabc');
  });

  it('rejects malformed fields in a stored autosave too', () => {
    localStorage.setItem('otogidb-team-simulator', JSON.stringify({ groups: 'P1', iters: 'x' }));
    const t = loadTeam();
    expect(t.groups).toEqual(emptyTeam().groups);
    expect(t.iters).toBe(5);
  });
});
