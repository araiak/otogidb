import { describe, it, expect } from 'vitest';
import { computeMlbStats, substituteSkillTemplate, MLB_MAX_LEVELS } from './lb';
import type { CardStats } from '../types/card';

// Helper to build a minimal CardStats-compatible object with LB fields
function makeStats(
  rarity: number,
  base_atk: number,
  max_atk: number,
  base_hp: number,
  max_hp: number,
  max_level: number,
  speed = 1300,
  crit = 750,
  cost = 5
): CardStats & { base_atk: number; base_hp: number; max_level: number } {
  return {
    attribute: 1,
    attribute_name: 'Divina',
    type: 1,
    type_name: 'Melee',
    rarity,
    cost,
    max_level,
    speed,
    base_atk,
    max_atk,
    base_hp,
    max_hp,
    crit,
  };
}

describe('MLB_MAX_LEVELS', () => {
  it('has correct MLB levels per rarity', () => {
    expect(MLB_MAX_LEVELS[5]).toBe(90);
    expect(MLB_MAX_LEVELS[4]).toBe(80);
    expect(MLB_MAX_LEVELS[3]).toBe(70);
    expect(MLB_MAX_LEVELS[2]).toBe(60);
    expect(MLB_MAX_LEVELS[1]).toBe(50);
  });
});

describe('computeMlbStats', () => {
  it('returns null when base stats are missing', () => {
    const stats = {
      attribute: 1, attribute_name: 'Divina',
      type: 1, type_name: 'Melee',
      rarity: 5, cost: 5, max_level: 70,
      speed: 1300, base_atk: 0, max_atk: 8500,
      base_hp: 0, max_hp: 9800, crit: 750,
    } as CardStats;
    expect(computeMlbStats(stats)).toBeNull();
  });

  it('matches formula for Kenshin (5★ fixture)', () => {
    // base_atk=2830, max_atk=8500, max_level=70, rarity=5
    // mlbMax=90, scale=89/69, stat_at_90=2830+(8500-2830)*89/69≈10143.478
    // mlb_atk = round(10143.478) = 10143
    const stats = makeStats(5, 2830, 8500, 3265, 9800, 70);
    const result = computeMlbStats(stats);
    expect(result).not.toBeNull();
    expect(result!.mlb_atk).toBe(10143);
  });

  it('matches in-game MLB ATK and HP for Bisque Doll #1539 (5★ fixture)', () => {
    // base_atk=3830, max_atk=11500, base_hp=4100, max_hp=12300, max_level=70, rarity=5
    // mlbMax=90, scale=89/69
    // mlb_atk = round(3830+(11500-3830)*89/69) = round(13723.188) = 13723 (confirmed in-game)
    // mlb_hp  = round(4100+(12300-4100)*89/69) = round(14676.811) = 14677 (confirmed in-game)
    const stats = makeStats(5, 3830, 11500, 4100, 12300, 70);
    const result = computeMlbStats(stats);
    expect(result).not.toBeNull();
    expect(result!.mlb_atk).toBe(13723);
    expect(result!.mlb_hp).toBe(14677);
  });

  it('matches in-game MLB ATK and HP for Cherry Blossom Front [Black Sakura] #655 (5★ fixture)', () => {
    // base_atk=3830, max_atk=11500, base_hp=3165, max_hp=9500, max_level=70, rarity=5
    // mlb_atk = 13723 (confirmed in-game)
    // mlb_hp  = 11336 (confirmed in-game)
    const stats = makeStats(5, 3830, 11500, 3165, 9500, 70);
    const result = computeMlbStats(stats);
    expect(result).not.toBeNull();
    expect(result!.mlb_atk).toBe(13723);
    expect(result!.mlb_hp).toBe(11336);
  });

  it('matches in-game MLB ATK and HP for Tokarev Pistol [Lunar New Year] #630 (5★ fixture)', () => {
    // base_atk=4500, max_atk=13500, base_hp=3000, max_hp=9000, max_level=70, rarity=5
    // mlbMax=90, scale=89/69
    // mlb_atk = 16109 (confirmed in-game)
    // mlb_hp  = 10739 (confirmed in-game)
    const stats = makeStats(5, 4500, 13500, 3000, 9000, 70);
    const result = computeMlbStats(stats);
    expect(result).not.toBeNull();
    expect(result!.mlb_atk).toBe(16109);
    expect(result!.mlb_hp).toBe(10739);
  });

  it('matches in-game MLB ATK and HP for Okita Soji [3rd anniversary] #733 (5★ fixture)', () => {
    // base_atk=4625, max_atk=13888, base_hp=2960, max_hp=8888, max_level=70, rarity=5
    // mlb_atk = 16573 (confirmed in-game)
    // mlb_hp  = 10606 (confirmed in-game)
    const stats = makeStats(5, 4625, 13888, 2960, 8888, 70);
    const result = computeMlbStats(stats);
    expect(result).not.toBeNull();
    expect(result!.mlb_atk).toBe(16573);
    expect(result!.mlb_hp).toBe(10606);
  });

  it('matches in-game MLB ATK and HP for Tsathoggua #1402 (5★ fixture)', () => {
    // base_atk=4230, max_atk=12700, base_hp=3400, max_hp=10200, max_level=70, rarity=5
    // mlbMax=90, scale=89/69
    // mlb_atk = round(4230+(12700-4230)*89/69) = 15155 (confirmed in-game)
    // mlb_hp  = round(3400+(10200-3400)*89/69) = 12171 (confirmed in-game)
    const stats = makeStats(5, 4230, 12700, 3400, 10200, 70);
    const result = computeMlbStats(stats);
    expect(result).not.toBeNull();
    expect(result!.mlb_atk).toBe(15155);
    expect(result!.mlb_hp).toBe(12171);
  });

  it('matches formula for a 4★ card fixture', () => {
    // 4★: lb0Max=60, mlbMax=80, scale=79/59
    // base_atk=1500, max_atk=6000
    // stat_at_80 = 1500 + (6000-1500)*79/59 ≈ 7525.42
    // mlb_atk = round(7525.42) = 7525
    const stats = makeStats(4, 1500, 6000, 2000, 8000, 60);
    const result = computeMlbStats(stats);
    expect(result).not.toBeNull();
    const expectedAtk = Math.round(1500 + (6000 - 1500) * 79 / 59);
    expect(result!.mlb_atk).toBe(expectedAtk);
  });

  it('matches formula for a 1★ card (edge case low levels)', () => {
    // 1★: lb0Max=30, mlbMax=50, scale=49/29
    // base_atk=500, max_atk=2000
    // stat_at_50 = 500 + 1500*49/29 ≈ 3034.48
    // mlb_atk = round(3034.48) = 3034
    const stats = makeStats(1, 500, 2000, 800, 3000, 30, 1000, 500, 1);
    const result = computeMlbStats(stats);
    expect(result).not.toBeNull();
    const expectedAtk = Math.round(500 + (2000 - 500) * 49 / 29);
    expect(result!.mlb_atk).toBe(expectedAtk);
  });

  it('LB0 max_atk is unchanged by computeMlbStats (it computes separately)', () => {
    // Verify max_atk on the stats object is the LB0 value and is NOT modified
    const stats = makeStats(5, 2830, 8500, 3265, 9800, 70);
    computeMlbStats(stats);
    expect(stats.max_atk).toBe(8500); // LB0 value unchanged
  });
});

describe('substituteSkillTemplate', () => {
  it('substitutes {value} placeholder', () => {
    const result = substituteSkillTemplate('Deals {value} DMG', { value: '1,234' });
    expect(result).toBe('Deals 1,234 DMG');
  });

  it('substitutes {probability} placeholder', () => {
    // Note: the replacement value already includes %, so template has no extra %
    const result = substituteSkillTemplate('{probability} chance to stun', { probability: '45%' });
    expect(result).toBe('45% chance to stun');
  });

  it('substitutes {delay1} placeholder', () => {
    const result = substituteSkillTemplate('Reduces DEF by {delay1}', { delay1: '350' });
    expect(result).toBe('Reduces DEF by 350');
  });

  it('substitutes multiple placeholders', () => {
    const result = substituteSkillTemplate(
      'Deals {value} DMG with {probability} chance',
      { value: '5,000', probability: '60%' }
    );
    expect(result).toBe('Deals 5,000 DMG with 60% chance');
  });

  it('leaves unresolved placeholders intact when value is null', () => {
    const result = substituteSkillTemplate('Deals {value} DMG', { value: null });
    expect(result).toBe('Deals {value} DMG');
  });

  it('leaves template unchanged when no values provided', () => {
    const result = substituteSkillTemplate('Deals {value} DMG', {});
    expect(result).toBe('Deals {value} DMG');
  });
});
