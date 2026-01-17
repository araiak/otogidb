import { useState, useEffect, useMemo } from 'react';
import type { Card, CardsData } from '../../types/card';
import { getFullCardsData } from '../../lib/cards';
import { isDevEnvironment } from '../../lib/features';
import {
  calculateDamage,
  compareStatIncrements,
  createInputFromCard,
  DAMAGE_CAPS,
  type DamageCalcInput,
  type DamageCalcResult,
  type StatComparison,
} from '../../lib/damage-calc';
import { HeatmapSection } from './StatHeatmap';

// Slider component for stat adjustment
interface StatSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  isPercent?: boolean;
}

function StatSlider({ label, value, min, max, step, unit, onChange, isPercent = true }: StatSliderProps) {
  const displayValue = isPercent ? (value * 100).toFixed(0) : value.toFixed(0);

  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-secondary">{label}</span>
        <span className="font-mono text-primary">{displayValue}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-surface-hover rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  );
}

// Card selector component
interface CardSelectorProps {
  cards: Card[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function CardSelector({ cards, selectedId, onSelect }: CardSelectorProps) {
  const [search, setSearch] = useState('');

  const filteredCards = useMemo(() => {
    if (!search) return cards.slice(0, 50); // Show first 50 by default
    const lower = search.toLowerCase();
    return cards.filter(c =>
      c.name?.toLowerCase().includes(lower) ||
      c.id.includes(lower)
    ).slice(0, 50);
  }, [cards, search]);

  return (
    <div className="mb-4">
      <label className="block text-sm text-secondary mb-1">Select Card</label>
      <input
        type="text"
        placeholder="Search by name or ID..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-primary mb-2"
      />
      <select
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-primary"
      >
        <option value="">Select a card...</option>
        {filteredCards.map(card => (
          <option key={card.id} value={card.id}>
            #{card.id} - {card.name} ({card.stats.rarity}★)
          </option>
        ))}
      </select>
    </div>
  );
}

// Damage display component
interface DamageDisplayProps {
  result: DamageCalcResult;
  skillBaseDamage: number;
  isDamageSkill: boolean;
  skillDmgPercent: number;
  skillBondPercent: number; // Skill bond multiplier (multiplicative to base)
}

function DamageDisplay({ result, skillBaseDamage, isDamageSkill, skillDmgPercent, skillBondPercent }: DamageDisplayProps) {
  const formatNum = (n: number) => n.toLocaleString();

  // Calculate actual skill damage using skill base damage
  // Skill bond is multiplicative to base skill damage
  const bondedSkillDamage = Math.round(skillBaseDamage * (1 + skillBondPercent));
  const skillDmgMult = 1 + skillDmgPercent;

  // Use skill-specific crit stats from result (includes skill-triggered ability bonuses)
  const actualSkillDamage = Math.round(bondedSkillDamage * skillDmgMult);
  const actualSkillCrit = Math.round(bondedSkillDamage * skillDmgMult * result.skillCritMult);
  const actualSkillExpected = Math.round(bondedSkillDamage * skillDmgMult * result.skillExpectedCritMult);
  const skillCapped = actualSkillCrit >= DAMAGE_CAPS.skill;

  // Check if skill has different crit stats (from skill-triggered abilities)
  const hasSkillCritBonus = result.skillCritRate !== result.effectiveCritRate ||
                           result.skillCritMult !== result.effectiveCritMult;

  return (
    <div className="grid grid-cols-2 gap-4 mb-4">
      {/* Normal Attack */}
      <div className="bg-surface-hover rounded-lg p-4">
        <h4 className="text-sm text-secondary mb-2">Normal Attack</h4>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-secondary text-sm">Base:</span>
            <span className={`font-mono ${result.normalDamageCapped ? 'text-yellow-400' : 'text-primary'}`}>
              {formatNum(result.normalDamage)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary text-sm">Crit:</span>
            <span className={`font-mono ${result.normalDamageCapped ? 'text-yellow-400' : 'text-green-400'}`}>
              {formatNum(result.normalDamageCrit)}
            </span>
          </div>
          <div className="flex justify-between border-t border-border pt-1 mt-1">
            <span className="text-secondary text-sm">Expected:</span>
            <span className="font-mono text-blue-400 font-bold">
              {formatNum(result.normalDamageExpected)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary text-sm">DPS:</span>
            <span className="font-mono text-purple-400">
              {formatNum(result.normalDps)}/s
            </span>
          </div>
        </div>
        {result.normalDamageCapped && (
          <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
            Hitting cap ({formatNum(DAMAGE_CAPS.normal)})
          </div>
        )}
      </div>

      {/* Skill Attack */}
      <div className="bg-surface-hover rounded-lg p-4">
        <h4 className="text-sm text-secondary mb-2">Skill Attack</h4>
        {isDamageSkill && skillBaseDamage > 0 ? (
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-secondary text-sm">Base (Lv):</span>
              <span className="font-mono text-secondary">
                {formatNum(skillBaseDamage)}
              </span>
            </div>
            {skillBondPercent > 0 && (
              <div className="flex justify-between">
                <span className="text-secondary text-sm">w/ Bond:</span>
                <span className="font-mono text-secondary">
                  {formatNum(bondedSkillDamage)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-secondary text-sm">w/ Skill%:</span>
              <span className={`font-mono ${skillCapped ? 'text-yellow-400' : 'text-primary'}`}>
                {formatNum(actualSkillDamage)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary text-sm">Crit:</span>
              <span className={`font-mono ${skillCapped ? 'text-yellow-400' : 'text-green-400'}`}>
                {formatNum(Math.min(actualSkillCrit, DAMAGE_CAPS.skill))}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 mt-1">
              <span className="text-secondary text-sm">Expected:</span>
              <span className="font-mono text-blue-400 font-bold">
                {formatNum(Math.min(actualSkillExpected, DAMAGE_CAPS.skill))}
              </span>
            </div>
            {hasSkillCritBonus && (
              <div className="mt-2 pt-2 border-t border-border">
                <div className="text-xs text-cyan-400 mb-1">Skill-triggered ability bonus:</div>
                <div className="flex justify-between text-xs">
                  <span className="text-secondary">Skill Crit Rate:</span>
                  <span className="font-mono text-cyan-400">{(result.skillCritRate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-secondary">Skill Crit DMG:</span>
                  <span className="font-mono text-cyan-400">{(result.skillCritMult * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-secondary text-sm italic">
            Not a damage skill
          </div>
        )}
        {skillCapped && isDamageSkill && (
          <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
            Hitting cap ({formatNum(DAMAGE_CAPS.skill)})
          </div>
        )}
      </div>
    </div>
  );
}

// Stat comparison table
interface StatComparisonTableProps {
  comparisons: StatComparison[];
  mode: 'dps' | 'skill';
}

function StatComparisonTable({ comparisons, mode }: StatComparisonTableProps) {
  // Sort by gain (descending)
  const sorted = [...comparisons].sort((a, b) =>
    mode === 'dps'
      ? b.dpsGainPercent - a.dpsGainPercent
      : b.skillGainPercent - a.skillGainPercent
  );

  const maxGain = mode === 'dps'
    ? Math.max(...comparisons.map(c => c.dpsGainPercent))
    : Math.max(...comparisons.map(c => c.skillGainPercent));

  return (
    <div className="bg-surface-hover rounded-lg p-4">
      <h4 className="text-sm text-secondary mb-3">
        What should I add next? ({mode === 'dps' ? 'Normal DPS' : 'Skill Damage'})
      </h4>
      <div className="space-y-2">
        {sorted.map((comp) => {
          const gain = mode === 'dps' ? comp.dpsGainPercent : comp.skillGainPercent;
          const barWidth = maxGain > 0 ? (gain / maxGain) * 100 : 0;
          const isTop = gain === maxGain && gain > 0;

          return (
            <div key={comp.stat.stat} className="relative">
              <div
                className={`absolute inset-0 rounded ${isTop ? 'bg-green-500/20' : 'bg-blue-500/10'}`}
                style={{ width: `${barWidth}%` }}
              />
              <div className="relative flex justify-between items-center py-1 px-2">
                <span className={`text-sm ${isTop ? 'text-green-400 font-medium' : 'text-primary'}`}>
                  {comp.stat.label}
                </span>
                <span className={`font-mono text-sm ${isTop ? 'text-green-400' : 'text-secondary'}`}>
                  +{gain.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Stat summary component with breakdown
interface StatSummaryProps {
  result: DamageCalcResult;
  card: Card;
  breakdown: {
    atkBonus: { bond: number; assist: number };
    skillBonus: { bond: number; assist: number };
    dmg: { slider: number; skills: number };
    critRate: { slider: number; skills: number };
    critDmg: { slider: number; skills: number };
    skillDmg: { slider: number; skills: number };
    speed: { slider: number; skills: number };
  };
  baseCritRate: number;
  limitBreak: number;
}

function StatSummary({ result, card, breakdown, baseCritRate, limitBreak }: StatSummaryProps) {
  const formatPct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const formatSource = (val: number, label: string) => val > 0 ? `+${formatPct(val)} ${label}` : null;

  const renderBreakdown = (
    label: string,
    total: string,
    base: number | null,
    sources: { slider: number; skills: number }
  ) => {
    const parts = [
      base !== null ? `${formatPct(base)} base` : null,
      formatSource(sources.slider, 'buffs'),
      formatSource(sources.skills, 'skills'),
    ].filter(Boolean);

    return (
      <div className="bg-surface-hover rounded p-2">
        <div className="text-secondary text-xs">{label}</div>
        <div className="font-mono text-primary font-bold">{total}</div>
        {parts.length > 0 && (
          <div className="text-xs text-secondary mt-1 space-y-0.5">
            {parts.map((p, i) => <div key={i}>{p}</div>)}
          </div>
        )}
      </div>
    );
  };

  // Calculate ATK and Skill bond multipliers
  const atkBondTotal = breakdown.atkBonus.bond + breakdown.atkBonus.assist;
  const skillBondTotal = breakdown.skillBonus.bond + breakdown.skillBonus.assist;
  const baseAtk = card.stats.max_atk;

  // Calculate limit break bonus (5 levels per LB)
  const lbBonus = limitBreak * 5;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4 text-sm">
      <div className="bg-surface-hover rounded p-2">
        <div className="text-secondary text-xs">Level</div>
        <div className="font-mono text-primary font-bold">{result.effectiveLevel}</div>
        <div className="text-xs text-secondary mt-1 space-y-0.5">
          <div>Base {card.stats.max_level}</div>
          {lbBonus > 0 && (
            <div>+{lbBonus} limit break</div>
          )}
        </div>
      </div>
      <div className="bg-surface-hover rounded p-2">
        <div className="text-secondary text-xs">ATK</div>
        <div className="font-mono text-primary font-bold">{result.displayAtk.toLocaleString()}</div>
        <div className="text-xs text-secondary mt-1 space-y-0.5">
          <div>Base {baseAtk.toLocaleString()}</div>
          {breakdown.atkBonus.bond > 0 && (
            <div>+{formatPct(breakdown.atkBonus.bond)} bond</div>
          )}
          {breakdown.atkBonus.assist > 0 && (
            <div>+{formatPct(breakdown.atkBonus.assist)} assist</div>
          )}
        </div>
      </div>
      <div className="bg-surface-hover rounded p-2">
        <div className="text-secondary text-xs">Skill Bond</div>
        <div className="font-mono text-primary font-bold">{skillBondTotal > 0 ? `+${formatPct(skillBondTotal)}` : 'None'}</div>
        <div className="text-xs text-secondary mt-1 space-y-0.5">
          {breakdown.skillBonus.bond > 0 && (
            <div>+{formatPct(breakdown.skillBonus.bond)} bond</div>
          )}
          {breakdown.skillBonus.assist > 0 && (
            <div>+{formatPct(breakdown.skillBonus.assist)} assist</div>
          )}
        </div>
      </div>
      {renderBreakdown(
        'Crit Rate',
        formatPct(result.effectiveCritRate),
        baseCritRate,
        breakdown.critRate
      )}
      {renderBreakdown(
        'Crit DMG',
        `${(result.effectiveCritMult * 100).toFixed(0)}%`,
        2.0,
        breakdown.critDmg
      )}
      {renderBreakdown(
        'DMG %',
        formatPct(breakdown.dmg.slider + breakdown.dmg.skills),
        null,
        breakdown.dmg
      )}
      {renderBreakdown(
        'Skill DMG %',
        formatPct(breakdown.skillDmg.slider + breakdown.skillDmg.skills),
        null,
        breakdown.skillDmg
      )}
      {renderBreakdown(
        'Speed',
        formatPct(breakdown.speed.slider + breakdown.speed.skills),
        null,
        breakdown.speed
      )}
    </div>
  );
}

// Main calculator component
export function DamageCalculator() {
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDev, setIsDev] = useState(false);

  // Build state
  const [limitBreak, setLimitBreak] = useState(0);
  const [dmgPercent, setDmgPercent] = useState(0);
  const [critRateBonus, setCritRateBonus] = useState(0);
  const [critDmgBonus, setCritDmgBonus] = useState(0);
  const [skillDmgPercent, setSkillDmgPercent] = useState(0);
  const [speedBonus, setSpeedBonus] = useState(0);
  const [enemyDebuff, setEnemyDebuff] = useState(0);
  const [ignoreShieldCap, setIgnoreShieldCap] = useState(false);

  // UI state
  const [comparisonMode, setComparisonMode] = useState<'dps' | 'skill'>('dps');

  // Bond settings
  const [bondType, setBondType] = useState<'none' | 'atk15' | 'skill15' | 'atk10' | 'skill10' | 'split5' | 'split7'>('none');
  const [assistCard, setAssistCard] = useState<string>('none');

  // Assist card definitions (bond bonuses - multiplicative to base stats)
  // attribute: 1=Divina, 2=Phantasma, 3=Anima, 4=Healer
  const ASSIST_CARDS: Record<string, {
    name: string;
    id: string;
    atkBond?: number;      // Base ATK multiplier
    skillBond?: number;    // Skill DMG bond (multiplicative)
    bonusAttribute?: number; // Attribute that gets 7.5% instead of 5%
  }> = {
    'none': { name: 'None', id: '' },
    'cheshire': { name: 'Cheshire Cat', id: '15', atkBond: 0.05, bonusAttribute: 2 }, // +5% ATK, +7.5% for Phantasma
    'ninetails': { name: 'Ninetails Fox', id: '733', skillBond: 0.05, bonusAttribute: 2 }, // +5% Skill, +7.5% for Phantasma
    'okita': { name: 'Okita Souji [1st Unit]', id: '269', skillBond: 0.05, bonusAttribute: 1 }, // +5% Skill, +7.5% for Divina
    'theurgia': { name: 'Theurgia Goetia', id: '538', skillBond: 0.05, bonusAttribute: 3 }, // +5% Skill, +7.5% for Anima
    'toyouke': { name: 'Toyouke-Omikami', id: '509', skillBond: 0.05, bonusAttribute: 1 }, // +5% Skill, +7.5% for Divina
    'mary': { name: 'Mary Magdalene', id: '658', atkBond: 0.05, bonusAttribute: 1 }, // +5% ATK, +7.5% for Divina
  };

  // Load cards (skill data is embedded in cards via card.skill.parsed)
  useEffect(() => {
    setIsDev(isDevEnvironment());
    getFullCardsData().then((cardsData) => {
      const playableCards = Object.values(cardsData.cards)
        .filter(c => c.playable && c.stats.rarity >= 3)
        .sort((a, b) => parseInt(b.id) - parseInt(a.id)); // Newest first
      setCards(playableCards);
      setLoading(false);
    });
  }, []);

  // Get selected card
  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return cards.find(c => c.id === selectedCardId) || null;
  }, [cards, selectedCardId]);

  // Get skill data for selected card (embedded in card.skill.parsed)
  const skillParsedData = useMemo(() => {
    if (!selectedCard?.skill?.parsed) return null;
    return selectedCard.skill.parsed;
  }, [selectedCard]);

  // Check if skill is a damage skill
  const isDamageSkill = useMemo(() => {
    if (!selectedCard?.skill?.tags) return false;
    return selectedCard.skill.tags.includes('DMG');
  }, [selectedCard]);

  // Calculate total buffs with source tracking
  const buffBreakdown = useMemo(() => {
    const sources: {
      atkBonus: { bond: number; assist: number }; // ATK bonds multiply base ATK
      skillBonus: { bond: number; assist: number }; // Skill bonds multiply skill damage
      dmg: { slider: number; skills: number };
      critRate: { slider: number; skills: number };
      critDmg: { slider: number; skills: number };
      skillDmg: { slider: number; skills: number };
      speed: { slider: number; skills: number };
    } = {
      atkBonus: { bond: 0, assist: 0 },
      skillBonus: { bond: 0, assist: 0 },
      dmg: { slider: dmgPercent, skills: 0 },
      critRate: { slider: critRateBonus, skills: 0 },
      critDmg: { slider: critDmgBonus, skills: 0 },
      skillDmg: { slider: skillDmgPercent, skills: 0 },
      speed: { slider: speedBonus, skills: 0 },
    };

    // Bond bonuses - ATK bonds multiply base ATK, skill bonds multiply skill damage
    switch (bondType) {
      case 'atk15': sources.atkBonus.bond += 0.15; break;
      case 'skill15': sources.skillBonus.bond += 0.15; break;
      case 'atk10': sources.atkBonus.bond += 0.10; break;
      case 'skill10': sources.skillBonus.bond += 0.10; break;
      case 'split5': sources.atkBonus.bond += 0.05; sources.skillBonus.bond += 0.05; break;
      case 'split7': sources.atkBonus.bond += 0.075; sources.skillBonus.bond += 0.075; break;
    }

    // Assist card bond bonuses (additive with main bond)
    const assist = ASSIST_CARDS[assistCard];
    if (assist && selectedCard) {
      // Check if card matches bonus attribute for 7.5%, otherwise 5%
      const matchesAttribute = assist.bonusAttribute === selectedCard.stats.attribute;
      const bondAmount = matchesAttribute ? 0.075 : 0.05;

      if (assist.atkBond) {
        sources.atkBonus.assist += bondAmount;
      }
      if (assist.skillBond) {
        sources.skillBonus.assist += bondAmount;
      }
    }

    return sources;
  }, [dmgPercent, critRateBonus, critDmgBonus, skillDmgPercent, speedBonus, bondType, assistCard, selectedCard]);

  // Calculate totals from breakdown
  const totalBuffs = useMemo(() => ({
    atkBonus: buffBreakdown.atkBonus.bond + buffBreakdown.atkBonus.assist, // ATK multiplier from bonds
    skillBonus: buffBreakdown.skillBonus.bond + buffBreakdown.skillBonus.assist, // Skill multiplier from bonds
    dmg: buffBreakdown.dmg.slider + buffBreakdown.dmg.skills,
    critRate: buffBreakdown.critRate.slider + buffBreakdown.critRate.skills,
    critDmg: buffBreakdown.critDmg.slider + buffBreakdown.critDmg.skills,
    skillDmg: buffBreakdown.skillDmg.slider + buffBreakdown.skillDmg.skills,
    speed: buffBreakdown.speed.slider + buffBreakdown.speed.skills,
  }), [buffBreakdown]);

  // Calculate damage
  const { result, comparisons, calcInput, skillBaseDamage } = useMemo(() => {
    if (!selectedCard) return { result: null, comparisons: [], calcInput: null, skillBaseDamage: 0 };

    const baseInput = createInputFromCard(selectedCard, limitBreak);

    // Apply ATK bond bonus to base ATK stats (multiplicative)
    const atkMultiplier = 1 + totalBuffs.atkBonus;

    const input: DamageCalcInput = {
      ...baseInput,
      baseAtk: Math.round(baseInput.baseAtk * atkMultiplier),
      maxAtk: Math.round(baseInput.maxAtk * atkMultiplier),
      dmgPercent: totalBuffs.dmg,
      critRateBonus: totalBuffs.critRate,
      critDmgBonus: totalBuffs.critDmg,
      skillDmgPercent: totalBuffs.skillDmg,
      speedBonus: totalBuffs.speed,
      levelBonus: 0, // Level bonuses now come from team abilities
      enemyShieldDebuff: -enemyDebuff, // Convert to negative for vulnerability
      ignoreShieldCap: ignoreShieldCap, // World boss testing flag
    };

    const calcResult = calculateDamage(input);
    const statComparisons = compareStatIncrements(input, calcResult);

    // Skill base damage is now calculated in damage-calc.ts (RE Validated 2026-01-17)
    // Uses: slv1 + (effectiveSkillLevel - 1) * slvup, capped at skillMaxLevel
    return { result: calcResult, comparisons: statComparisons, calcInput: input, skillBaseDamage: calcResult.skillBaseDamage };
  }, [selectedCard, skillParsedData, limitBreak, totalBuffs, enemyDebuff, ignoreShieldCap]);

  // Feature flag check
  if (!isDev) {
    return (
      <div className="bg-surface border border-border rounded-lg p-8 text-center">
        <h2 className="text-lg font-bold text-primary mb-2">Damage Calculator</h2>
        <p className="text-secondary">
          This feature is currently in development and only available on localhost.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-lg p-8 text-center">
        <div className="animate-pulse text-secondary">Loading cards...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card Selection */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <h3 className="text-lg font-bold text-primary mb-4">Card Selection</h3>
        <CardSelector
          cards={cards}
          selectedId={selectedCardId}
          onSelect={setSelectedCardId}
        />

        {/* Limit Break Selector */}
        {selectedCard && (
          <div className="mt-4">
            <label className="block text-sm text-secondary mb-2">Limit Break Level</label>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map(lb => (
                <button
                  key={lb}
                  onClick={() => setLimitBreak(lb)}
                  className={`px-4 py-2 rounded-lg font-mono transition-colors ${
                    limitBreak === lb
                      ? 'bg-blue-500 text-white'
                      : 'bg-surface-hover text-secondary hover:text-primary'
                  }`}
                >
                  {lb === 4 ? 'MLB' : `LB${lb}`}
                </button>
              ))}
            </div>
            <div className="text-xs text-secondary mt-1">
              Base Level: {selectedCard.stats.max_level} → Effective: {selectedCard.stats.max_level + limitBreak * 5}
            </div>
          </div>
        )}

        {/* Bond Selection */}
        {selectedCard && (
          <div className="mt-4">
            <label className="block text-sm text-secondary mb-2">Bond Type</label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'none', label: 'None' },
                { key: 'atk15', label: '+15% ATK' },
                { key: 'skill15', label: '+15% Skill' },
                { key: 'atk10', label: '+10% ATK' },
                { key: 'skill10', label: '+10% Skill' },
                { key: 'split5', label: '+5%/5%' },
                { key: 'split7', label: '+7.5%/7.5%' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setBondType(key as typeof bondType)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    bondType === key
                      ? 'bg-blue-500 text-white'
                      : 'bg-surface-hover text-secondary hover:text-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Assist Card Selection */}
        {selectedCard && (
          <div className="mt-4">
            <label className="block text-sm text-secondary mb-2">Assist Card (Bond Bonus)</label>
            <select
              value={assistCard}
              onChange={(e) => setAssistCard(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-primary"
            >
              {Object.entries(ASSIST_CARDS).map(([key, card]) => {
                const attrNames: Record<number, string> = { 1: 'Divina', 2: 'Phantasma', 3: 'Anima' };
                const bonusAttr = card.bonusAttribute ? attrNames[card.bonusAttribute] : '';
                const matchesAttr = card.bonusAttribute === selectedCard.stats.attribute;
                const bondPct = matchesAttr ? '7.5%' : '5%';

                return (
                  <option key={key} value={key}>
                    {card.name}
                    {key !== 'none' && ` #${card.id}`}
                    {card.atkBond && ` (+${bondPct} ATK${bonusAttr ? `, 7.5% for ${bonusAttr}` : ''})`}
                    {card.skillBond && ` (+${bondPct} Skill${bonusAttr ? `, 7.5% for ${bonusAttr}` : ''})`}
                  </option>
                );
              })}
            </select>
            {assistCard !== 'none' && (
              <div className="text-xs text-secondary mt-1">
                {(() => {
                  const assist = ASSIST_CARDS[assistCard];
                  const matchesAttr = assist.bonusAttribute === selectedCard.stats.attribute;
                  const attrNames: Record<number, string> = { 1: 'Divina', 2: 'Phantasma', 3: 'Anima' };
                  return matchesAttr
                    ? `✓ ${selectedCard.name} is ${attrNames[selectedCard.stats.attribute]} - getting 7.5% bonus`
                    : `${selectedCard.name} is not ${attrNames[assist.bonusAttribute || 0]} - getting 5% bonus`;
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedCard && result && (
        <>
          {/* Stat Summary */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="text-lg font-bold text-primary mb-4">
              {selectedCard.name}
              <span className="text-secondary text-sm font-normal ml-2">#{selectedCard.id}</span>
            </h3>
            <StatSummary
              result={result}
              card={selectedCard}
              breakdown={buffBreakdown}
              baseCritRate={selectedCard.stats.crit / 10000}
              limitBreak={limitBreak}
            />
          </div>

          {/* Damage Output */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="text-lg font-bold text-primary mb-4">Damage Output</h3>
            <DamageDisplay
              result={result}
              skillBaseDamage={skillBaseDamage}
              isDamageSkill={isDamageSkill}
              skillDmgPercent={totalBuffs.skillDmg}
              skillBondPercent={totalBuffs.skillBonus}
            />
          </div>

          {/* Stat Adjustments */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="text-lg font-bold text-primary mb-1">Buff Settings</h3>
            <p className="text-xs text-secondary mb-4">Include external abilities, team assists, and additive buffs here</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <StatSlider
                label="DMG %"
                value={dmgPercent}
                min={0}
                max={3}
                step={0.05}
                unit="%"
                onChange={setDmgPercent}
              />
              <StatSlider
                label="Crit Rate Bonus"
                value={critRateBonus}
                min={0}
                max={1}
                step={0.05}
                unit="%"
                onChange={setCritRateBonus}
              />
              <StatSlider
                label="Crit DMG Bonus"
                value={critDmgBonus}
                min={0}
                max={3}
                step={0.05}
                unit="%"
                onChange={setCritDmgBonus}
              />
              <StatSlider
                label="Skill DMG %"
                value={skillDmgPercent}
                min={0}
                max={3}
                step={0.05}
                unit="%"
                onChange={setSkillDmgPercent}
              />
              <StatSlider
                label="Speed Bonus"
                value={speedBonus}
                min={0}
                max={1}
                step={0.05}
                unit="%"
                onChange={setSpeedBonus}
              />
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <StatSlider
                label="Enemy Vulnerability (-SHIELD)"
                value={enemyDebuff}
                min={0}
                max={2.0}
                step={0.05}
                unit="%"
                onChange={setEnemyDebuff}
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="ignoreShieldCap"
                  checked={ignoreShieldCap}
                  onChange={(e) => setIgnoreShieldCap(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-surface"
                />
                <label htmlFor="ignoreShieldCap" className="text-sm text-secondary">
                  Ignore Shield Cap (World Boss mode)
                </label>
              </div>
              {!ignoreShieldCap && enemyDebuff > 0.75 && (
                <p className="text-xs text-yellow-500 mt-1">
                  Note: Shield debuff capped at 75% (175% damage). Enable "Ignore Shield Cap" to test higher values.
                </p>
              )}
            </div>
          </div>

          {/* Stat Comparison */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-primary">Next Stat Recommendation</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setComparisonMode('dps')}
                  className={`px-3 py-1 text-sm rounded ${
                    comparisonMode === 'dps'
                      ? 'bg-blue-500 text-white'
                      : 'bg-surface-hover text-secondary'
                  }`}
                >
                  Normal DPS
                </button>
                <button
                  onClick={() => setComparisonMode('skill')}
                  className={`px-3 py-1 text-sm rounded ${
                    comparisonMode === 'skill'
                      ? 'bg-blue-500 text-white'
                      : 'bg-surface-hover text-secondary'
                  }`}
                >
                  Skill Damage
                </button>
              </div>
            </div>
            <StatComparisonTable comparisons={comparisons} mode={comparisonMode} />
            <p className="text-xs text-secondary mt-3">
              Shows the % damage increase from adding each stat increment to your current build.
              Green = best option for your current stats.
            </p>
          </div>

          {/* Stat Interaction Heatmap */}
          {calcInput && (
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="text-lg font-bold text-primary mb-4">Stat Interaction Heatmap</h3>
              <p className="text-sm text-secondary mb-4">
                Visualize how different combinations of two stats affect your damage output.
                Yellow cells indicate damage cap is being hit.
              </p>
              <HeatmapSection baseInput={calcInput} />
            </div>
          )}

          {/* Formula Info */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="text-lg font-bold text-primary mb-2">Formula Reference</h3>
            <div className="text-sm text-secondary font-mono space-y-1">
              <div>Normal: ATK × (1+DMG%) × (1-EnemyShield) × CritMult</div>
              <div>Skill: ATK × (1+DMG%) × (1+SkillDMG%) × (1-EnemyShield) × CritMult</div>
              <div>Expected Crit: 1 + CritRate × (CritMult - 1)</div>
              <div className="pt-2 border-t border-border mt-2">
                Caps: Normal {DAMAGE_CAPS.normal.toLocaleString()}, Skill {DAMAGE_CAPS.skill.toLocaleString()}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DamageCalculator;
