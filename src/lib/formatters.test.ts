import { describe, it, expect } from 'vitest';
import { formatSkillDescription, getSkillPlaceholderValues, type SkillData } from './formatters';

const skill: SkillData = {
  descId: '1',
  ie: 'ATK<1300,38>',
  de: 'STUN<5>;HIT<15.00%,0.43%>',
  ml: 10,
  slv1: 0,
  slvup: 0,
};

describe('getSkillPlaceholderValues', () => {
  it('returns the values the English render substitutes', () => {
    const vals = getSkillPlaceholderValues(skill, 5);
    expect(Object.keys(vals).length).toBeGreaterThan(0);
    const english = formatSkillDescription('{value}|{probability}|{delay1}', skill, 5);
    for (const [k, v] of Object.entries(vals)) {
      expect(english).toContain(v);
      expect(english).not.toContain(`{${k}}`);
    }
  });

  it('returns nothing without skill data', () => {
    expect(getSkillPlaceholderValues(null)).toEqual({});
  });
});
