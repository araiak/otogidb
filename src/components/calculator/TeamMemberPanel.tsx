/**
 * Team Member Panel Component
 * Complete configuration UI for a single team member slot
 */

import type { Card } from '../../types/card';
import type { TeamMemberState, BondSlotType, DamageBreakdown } from '../../lib/team-calc-types';
import { BOND_SLOT_VALUES, BOND_SLOT_LABELS } from '../../lib/team-calc-types';
import { CardSelector, AssistSelector } from './CardSelector';
import { AbilityToggles } from './AbilityToggles';

interface TeamMemberPanelProps {
  member: TeamMemberState;
  memberIndex: number;
  nonAssistCards: Card[];
  assistCards: Card[];
  onSetCard: (cardId: string | null) => void;
  onSetAssist: (cardId: string | null) => void;
  onSetLimitBreak: (value: number) => void;
  onSetBondSlot: (slot: 1 | 2 | 3, value: BondSlotType) => void;
  onToggleSkill: () => void;
  onClear: () => void;
}

export function TeamMemberPanel({
  member,
  memberIndex,
  nonAssistCards,
  assistCards,
  onSetCard,
  onSetAssist,
  onSetLimitBreak,
  onSetBondSlot,
  onToggleSkill,
  onClear,
}: TeamMemberPanelProps) {
  const isReserve = member.isReserve;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-primary">
          {isReserve
            ? `Reserve ${memberIndex - 4}`
            : memberIndex === 0
            ? 'Team Leader'
            : memberIndex === 4
            ? 'Helper'
            : `Team Member ${memberIndex + 1}`}
        </h3>
        {member.card && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
          >
            Clear Slot
          </button>
        )}
      </div>

      {isReserve && (
        <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded text-sm text-orange-300">
          Reserve slots provide abilities only - they don't contribute to damage calculations.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column: Card selection and config */}
        <div className="space-y-4">
          {/* Card selector */}
          <div className="bg-surface rounded-lg p-4">
            <CardSelector
              cards={nonAssistCards}
              selectedId={member.cardId}
              onSelect={onSetCard}
              label="Main Card"
              placeholder="Search cards..."
            />
          </div>

          {/* Assist selector */}
          <div className="bg-surface rounded-lg p-4">
            <AssistSelector
              assistCards={assistCards}
              selectedId={member.assistCardId}
              onSelect={onSetAssist}
            />
          </div>

          {/* Level and Bond config */}
          {member.card && (
            <div className="bg-surface rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-medium text-primary">Build Settings</h4>

              {/* Limit Break */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-secondary">Limit Break</span>
                  <span className="text-primary font-mono">LB{member.limitBreak}</span>
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map(lb => (
                    <button
                      key={lb}
                      type="button"
                      onClick={() => onSetLimitBreak(lb)}
                      className={`flex-1 py-1 text-sm rounded transition-colors ${
                        member.limitBreak === lb
                          ? 'bg-blue-500 text-white'
                          : 'bg-surface-hover text-secondary hover:text-primary'
                      }`}
                    >
                      {lb}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bond Slots */}
              <div>
                <div className="text-sm text-secondary mb-2">Bond Slots</div>
                <div className="space-y-2">
                  {/* Bond Slot 1 */}
                  <div className="flex gap-1">
                    {(Object.keys(BOND_SLOT_VALUES) as BondSlotType[]).map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => onSetBondSlot(1, slot)}
                        className={`flex-1 px-1 py-1 text-xs rounded transition-colors ${
                          member.bond1 === slot
                            ? 'bg-blue-500 text-white'
                            : 'bg-surface-hover text-secondary hover:text-primary'
                        }`}
                      >
                        {BOND_SLOT_LABELS[slot]}
                      </button>
                    ))}
                  </div>
                  {/* Bond Slot 2 */}
                  <div className="flex gap-1">
                    {(Object.keys(BOND_SLOT_VALUES) as BondSlotType[]).map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => onSetBondSlot(2, slot)}
                        className={`flex-1 px-1 py-1 text-xs rounded transition-colors ${
                          member.bond2 === slot
                            ? 'bg-blue-500 text-white'
                            : 'bg-surface-hover text-secondary hover:text-primary'
                        }`}
                      >
                        {BOND_SLOT_LABELS[slot]}
                      </button>
                    ))}
                  </div>
                  {/* Bond Slot 3 - locked to 'none' if assist selected */}
                  <div className="flex gap-1">
                    {(Object.keys(BOND_SLOT_VALUES) as BondSlotType[]).map(slot => {
                      const hasAssist = !!member.assistCardId;
                      const isDisabled = hasAssist && slot !== 'none';
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => !isDisabled && onSetBondSlot(3, slot)}
                          disabled={isDisabled}
                          className={`flex-1 px-1 py-1 text-xs rounded transition-colors ${
                            member.bond3 === slot
                              ? 'bg-blue-500 text-white'
                              : isDisabled
                              ? 'bg-surface-hover text-tertiary cursor-not-allowed opacity-50'
                              : 'bg-surface-hover text-secondary hover:text-primary'
                          }`}
                          title={hasAssist && slot !== 'none' ? 'Locked when assist is equipped' : undefined}
                        >
                          {BOND_SLOT_LABELS[slot]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Abilities and Stats */}
        <div className="space-y-4">
          {/* Skill & Abilities */}
          <div className="bg-surface rounded-lg p-4">
            <h4 className="text-sm font-medium text-primary mb-3">Skill & Abilities</h4>
            <AbilityToggles
              member={member}
              memberIndex={memberIndex}
              onToggleSkill={onToggleSkill}
            />
          </div>

          {/* Stats display (only for cards with computed stats) */}
          {member.computedStats && (
            <div className="bg-surface rounded-lg p-4">
              <h4 className="text-sm font-medium text-primary mb-3">Computed Stats</h4>
              <StatsDisplay member={member} />
            </div>
          )}

          {/* Damage display (only for main team) */}
          {!isReserve && member.damageResult && (
            <div className="bg-surface rounded-lg p-4">
              <h4 className="text-sm font-medium text-primary mb-3">Damage Output</h4>
              <DamageDisplay result={member.damageResult} />
            </div>
          )}

          {/* Stat Value Comparison (only for main team with damage) */}
          {!isReserve && member.damageResult && member.computedStats && (
            <div className="bg-surface rounded-lg p-4">
              <div className="flex items-baseline justify-between mb-3">
                <h4 className="text-sm font-medium text-primary">Stat Value Comparison</h4>
              </div>
              <div className="space-y-4">
                <DpsStatComparison member={member} />
                <SkillStatComparison member={member} />
              </div>
              <p className="text-xs text-tertiary mt-3 italic">
                These estimates help identify cards you may want to test in the calculator. Not accurate near breakpoints or caps.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatsDisplayProps {
  member: TeamMemberState;
}

function StatsDisplay({ member }: StatsDisplayProps) {
  const stats = member.computedStats;
  if (!stats) return null;

  const formatNum = (n: number) => n.toLocaleString();
  const formatPercent = (n: number) => `${(n * 100).toFixed(1)}%`;
  const breakdown = stats.breakdown;

  // Build tooltip for each stat showing breakdown from abilities
  const contributions = member.abilityContributions || [];

  const getStatTooltip = (stat: string, baseInfo?: string): string | undefined => {
    const statContributions = contributions
      .filter(c => c.effects.some(e => e.stat === stat))
      .map(c => {
        const effect = c.effects.find(e => e.stat === stat);
        if (!effect) return null;
        const value = effect.value * 100;
        return `${c.abilityName}: +${value.toFixed(1)}%`;
      })
      .filter(Boolean);

    const parts: string[] = [];
    if (baseInfo) parts.push(baseInfo);
    if (statContributions.length > 0) {
      if (parts.length > 0) parts.push('');
      parts.push('Ability Buffs:');
      parts.push(...statContributions as string[]);
    }

    if (parts.length === 0) return undefined;
    return parts.join('\n');
  };

  // Level tooltip
  const levelParts: string[] = [`Base: ${breakdown.level.base}`];
  if (breakdown.level.limitBreak > 0) levelParts.push(`Limit Break: +${breakdown.level.limitBreak}`);
  if (breakdown.level.bonus > 0) levelParts.push(`Level Bonus: +${breakdown.level.bonus}`);
  if (breakdown.level.abilities > 0) levelParts.push(`Abilities: +${breakdown.level.abilities}`);
  const levelTooltip = levelParts.join('\n');

  // ATK tooltip
  const atkParts: string[] = [`Base: ${formatNum(Math.round(breakdown.atk.base))}`];
  if (breakdown.atk.bond > 0) atkParts.push(`Bond: +${formatNum(Math.round(breakdown.atk.bond))}`);
  if (breakdown.atk.assist > 0) atkParts.push(`Assist: +${formatNum(Math.round(breakdown.atk.assist))}`);
  if (breakdown.atk.abilities > 0) atkParts.push(`Abilities: +${formatNum(Math.round(breakdown.atk.abilities))}`);
  const atkTooltip = atkParts.join('\n');

  // Crit Rate tooltip with base
  const critRateBase = `Base: ${(breakdown.critRate.base * 100).toFixed(1)}%`;
  const critRateBond = breakdown.critRate.bond > 0 ? `\nBond: +${(breakdown.critRate.bond * 100).toFixed(1)}%` : '';
  const critRateAssist = breakdown.critRate.assist > 0 ? `\nAssist: +${(breakdown.critRate.assist * 100).toFixed(1)}%` : '';
  const critRateBaseInfo = critRateBase + critRateBond + critRateAssist;
  const critRateTooltip = getStatTooltip('critRate', critRateBaseInfo);

  // Crit DMG tooltip with base
  const critDmgBase = `Base: ${(breakdown.critDmg.base * 100).toFixed(0)}%`;
  const critDmgBond = breakdown.critDmg.bond > 0 ? `\nBond: +${(breakdown.critDmg.bond * 100).toFixed(0)}%` : '';
  const critDmgAssist = breakdown.critDmg.assist > 0 ? `\nAssist: +${(breakdown.critDmg.assist * 100).toFixed(0)}%` : '';
  const critDmgBaseInfo = critDmgBase + critDmgBond + critDmgAssist;
  const critDmgTooltip = getStatTooltip('critDmg', critDmgBaseInfo);

  // DMG% tooltip with base (always 0)
  const dmgBaseInfo = 'Base: 0%';
  const dmgTooltip = getStatTooltip('dmg', dmgBaseInfo);

  // Skill DMG% tooltip with base
  const skillDmgParts: string[] = ['Base: 0%'];
  if (breakdown.skillDmg.bond > 0) skillDmgParts.push(`Bond: +${(breakdown.skillDmg.bond * 100).toFixed(0)}%`);
  if (breakdown.skillDmg.assist > 0) skillDmgParts.push(`Assist: +${(breakdown.skillDmg.assist * 100).toFixed(0)}%`);
  const skillDmgBaseInfo = skillDmgParts.join('\n');
  const skillDmgTooltip = getStatTooltip('skillDmg', skillDmgBaseInfo);

  // Speed tooltip with base
  const speedBase = `Base: ${formatNum(Math.round(breakdown.speed.base))}`;
  const speedBond = breakdown.speed.bond > 0 ? `\nBond: +${formatNum(Math.round(breakdown.speed.bond))}` : '';
  const speedAssist = breakdown.speed.assist > 0 ? `\nAssist: +${formatNum(Math.round(breakdown.speed.assist))}` : '';
  const speedBaseInfo = speedBase + speedBond + speedAssist + '\n\nSpeed buffs affect Attack Interval';
  const speedTooltip = getStatTooltip('speed', speedBaseInfo) || speedBaseInfo;

  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <StatRow label="Level" value={stats.effectiveLevel.toString()} tooltip={levelTooltip} />
      <StatRow label="ATK" value={formatNum(Math.round(stats.displayAtk))} tooltip={atkTooltip} />
      <StatRow label="Crit Rate" value={formatPercent(stats.effectiveCritRate)} color={stats.effectiveCritRate >= 1 ? 'text-yellow-400' : undefined} tooltip={critRateTooltip} />
      <StatRow label="Crit DMG" value={`${(stats.effectiveCritDmg * 100).toFixed(0)}%`} tooltip={critDmgTooltip} />
      <StatRow label="DMG%" value={`+${(stats.dmgBonus * 100).toFixed(0)}%`} color="text-green-400" tooltip={dmgTooltip} />
      <StatRow label="Skill DMG%" value={`+${(stats.skillDmgBonus * 100).toFixed(0)}%`} color="text-blue-400" tooltip={skillDmgTooltip} />
      <StatRow label="Speed" value={formatNum(Math.round(stats.effectiveSpeed))} tooltip={speedTooltip} />
      <StatRow label="Atk Interval" value={`${stats.attackInterval.toFixed(2)}s`} />
    </div>
  );
}

interface StatRowProps {
  label: string;
  value: string;
  color?: string;
  tooltip?: string;
}

function StatRow({ label, value, color, tooltip }: StatRowProps) {
  return (
    <div className="flex justify-between" title={tooltip}>
      <span className="text-secondary">{label}:</span>
      <span className={`font-mono ${color || 'text-primary'} ${tooltip ? 'cursor-help underline decoration-dotted' : ''}`}>
        {value}
      </span>
    </div>
  );
}

interface DamageDisplayProps {
  result: NonNullable<TeamMemberState['damageResult']>;
}

function buildDpsTooltip(bd: DamageBreakdown): string {
  const f = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const lines = [
    `ATK: ${f(bd.effectiveAtk)} (internal)`,
    `x LB Exceed: ${f(bd.exceedMult)}`,
    `x DMG%: ${f(bd.dmgMult)}`,
    `x Normal DMG%: ${f(bd.normalDmgMult)}`,
    `x Race: ${f(bd.raceMult)}`,
    `x Defense: ${f(bd.defenseMult)}`,
    `x Shield: ${f(bd.shieldMult)}`,
    `x World Boss: ${f(bd.worldBossMult)}`,
    `= Base: ${f(bd.normalBaseRaw)}`,
    `x Crit (expected): ${f(bd.expectedCritMult)}`,
    `= Expected: ${f(bd.normalBaseRaw * bd.expectedCritMult)}`,
    `/ Interval: ${bd.attackInterval.toFixed(2)}s`,
    `= DPS: ${f(bd.normalBaseRaw * bd.expectedCritMult / bd.attackInterval)}/s`,
  ];
  return lines.join('\n');
}

function buildSkillTooltip(bd: DamageBreakdown): string {
  const f = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const lines = [
    `Skill Base: ${f(bd.skillBaseDamage)}`,
    `x LB Exceed: ${f(bd.exceedMult)}`,
    `x DMG%: ${f(bd.dmgMult)}`,
    `x Skill DMG%: ${f(bd.skillDmgMult)}`,
    `x Race: ${f(bd.raceMult)}`,
    `x Defense: ${f(bd.defenseMult)}`,
    `x Shield: ${f(bd.shieldMult)}`,
    `x World Boss: ${f(bd.worldBossMult)}`,
    `= Base: ${f(bd.skillBaseRaw)}`,
    `x Crit (expected): ${f(bd.expectedCritMult)}`,
    `= Expected: ${f(bd.skillBaseRaw * bd.expectedCritMult)}`,
  ];
  return lines.join('\n');
}

function BreakdownRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-secondary">{label}</span>
      <span className={`font-mono ${highlight ? 'text-yellow-400' : 'text-primary'}`}>{value}</span>
    </div>
  );
}

function DamageBreakdownSection({ bd, type }: { bd: DamageBreakdown; type: 'normal' | 'skill' }) {
  const f = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const fp = (n: number) => `${(n * 100).toFixed(1)}%`;
  const isNonDefault = (n: number) => Math.abs(n - 1) > 0.0001;

  const inputLabel = type === 'normal' ? 'ATK (internal)' : 'Skill Base Damage';
  const inputValue = type === 'normal' ? bd.effectiveAtk : bd.skillBaseDamage;
  const typeDmgLabel = type === 'normal' ? 'Normal DMG%' : 'Skill DMG%';
  const typeDmgMult = type === 'normal' ? bd.normalDmgMult : bd.skillDmgMult;
  const baseRaw = type === 'normal' ? bd.normalBaseRaw : bd.skillBaseRaw;

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-primary mb-1">
        {type === 'normal' ? 'Normal Attack Chain' : 'Skill Attack Chain'}
      </div>
      <BreakdownRow label={inputLabel} value={f(inputValue)} />
      <BreakdownRow label="x LB Exceed" value={f(bd.exceedMult)} highlight={isNonDefault(bd.exceedMult)} />
      <BreakdownRow label="x DMG%" value={f(bd.dmgMult)} highlight={isNonDefault(bd.dmgMult)} />
      <BreakdownRow label={`x ${typeDmgLabel}`} value={f(typeDmgMult)} highlight={isNonDefault(typeDmgMult)} />
      <BreakdownRow label="x Race" value={f(bd.raceMult)} highlight={isNonDefault(bd.raceMult)} />
      <BreakdownRow label="x Defense" value={f(bd.defenseMult)} highlight={isNonDefault(bd.defenseMult)} />
      <BreakdownRow label="x Shield" value={f(bd.shieldMult)} highlight={isNonDefault(bd.shieldMult)} />
      <BreakdownRow label="x World Boss" value={f(bd.worldBossMult)} highlight={isNonDefault(bd.worldBossMult)} />
      <div className="border-t border-border my-1" />
      <BreakdownRow label="= Pre-crit base" value={f(baseRaw)} />
      <BreakdownRow label="Crit Rate" value={fp(bd.effectiveCritRate)} />
      <BreakdownRow label="Crit DMG" value={`${(bd.effectiveCritDmg * 100).toFixed(0)}%`} />
      <BreakdownRow label="x Expected Crit" value={f(bd.expectedCritMult)} />
      <BreakdownRow label="= Expected Damage" value={f(baseRaw * bd.expectedCritMult)} />
      {type === 'normal' && (
        <>
          <BreakdownRow label="/ Interval" value={`${bd.attackInterval.toFixed(2)}s`} />
          <BreakdownRow label="= DPS" value={`${f(baseRaw * bd.expectedCritMult / bd.attackInterval)}/s`} />
        </>
      )}
    </div>
  );
}

function DamageDisplay({ result }: DamageDisplayProps) {
  const formatNum = (n: number) => n.toLocaleString();
  const bd = result.breakdown;

  // Check if there's a damage range (min != max means LB exceed variance)
  const hasNormalRange = result.normalDamageMin !== result.normalDamageMax;
  const hasSkillRange = result.skillDamageMin !== result.skillDamageMax;

  const dpsTooltip = bd ? buildDpsTooltip(bd) : undefined;
  const skillTooltip = bd && result.skillBaseDamage > 0 ? buildSkillTooltip(bd) : undefined;

  return (
    <div className="space-y-3">
      {/* Normal Attack */}
      <div>
        <div className="text-xs text-secondary mb-1">Normal Attack</div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-secondary">Base: </span>
            <span className={`font-mono ${result.normalDamageCapped ? 'text-yellow-400' : 'text-primary'}`}>
              {formatNum(result.normalDamage)}
            </span>
            {hasNormalRange && (
              <div className="text-xs text-tertiary">
                {formatNum(result.normalDamageMin)}-{formatNum(result.normalDamageMax)}
              </div>
            )}
          </div>
          <div>
            <span className="text-secondary">Crit: </span>
            <span className="font-mono text-green-400">
              {formatNum(result.normalDamageCrit)}
            </span>
            {hasNormalRange && (
              <div className="text-xs text-tertiary">
                {formatNum(result.normalDamageCritMin)}-{formatNum(result.normalDamageCritMax)}
              </div>
            )}
          </div>
          <div title="Expected: Average damage per hit accounting for crit rate. Formula: Base x (1 + CritRate x (CritDmg - 1))">
            <span className="text-secondary cursor-help underline decoration-dotted">Exp: </span>
            <span className="font-mono text-blue-400">
              {formatNum(result.normalDamageExpected)}
            </span>
          </div>
        </div>
        <div className="mt-1" title={dpsTooltip}>
          <span className="text-secondary text-sm">DPS: </span>
          <span className={`font-mono text-lg font-bold text-purple-400 ${dpsTooltip ? 'cursor-help underline decoration-dotted' : ''}`}>
            {formatNum(result.normalDps)}/s
          </span>
        </div>
      </div>

      {/* Skill Attack */}
      {result.skillBaseDamage > 0 && (
        <div className="border-t border-border pt-2">
          <div className="text-xs text-secondary mb-1">Skill Attack</div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-secondary">Base: </span>
              <span className={`font-mono ${result.skillDamageCapped ? 'text-yellow-400' : 'text-primary'}`}>
                {formatNum(result.skillDamage)}
              </span>
              {hasSkillRange && (
                <div className="text-xs text-tertiary">
                  {formatNum(result.skillDamageMin)}-{formatNum(result.skillDamageMax)}
                </div>
              )}
            </div>
            <div>
              <span className="text-secondary">Crit: </span>
              <span className="font-mono text-green-400">
                {formatNum(result.skillDamageCrit)}
              </span>
              {hasSkillRange && (
                <div className="text-xs text-tertiary">
                  {formatNum(result.skillDamageCritMin)}-{formatNum(result.skillDamageCritMax)}
                </div>
              )}
            </div>
            <div title={skillTooltip || "Expected: Average damage per hit accounting for crit rate."}>
              <span className="text-secondary cursor-help underline decoration-dotted">Exp: </span>
              <span className="font-mono text-blue-400">
                {formatNum(result.skillDamageExpected)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Damage Breakdown */}
      {bd && (
        <details className="border-t border-border pt-2">
          <summary className="text-xs text-secondary cursor-pointer hover:text-primary select-none">
            Damage Breakdown
          </summary>
          <div className="mt-2 space-y-3 bg-surface-hover rounded p-2">
            <DamageBreakdownSection bd={bd} type="normal" />
            {result.skillBaseDamage > 0 && (
              <>
                <div className="border-t border-border my-1" />
                <DamageBreakdownSection bd={bd} type="skill" />
              </>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

// ============================================================================
// Stat Value Comparison Widgets
// ============================================================================

interface StatComparisonProps {
  member: TeamMemberState;
}

/**
 * Shows how +10% of various stats would affect DPS
 */
function DpsStatComparison({ member }: StatComparisonProps) {
  const stats = member.computedStats;
  const damage = member.damageResult;
  if (!stats || !damage) return null;

  const currentDps = damage.normalDps;
  if (currentDps === 0) return null;

  const formatNum = (n: number) => n.toLocaleString();
  const formatPercent = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

  // Current values
  const critRate = stats.effectiveCritRate;
  const critDmg = stats.effectiveCritDmg;
  const attackInterval = stats.attackInterval;

  // Helper to calculate expected crit multiplier
  const calcExpectedCritMult = (rate: number, dmg: number) => {
    const cappedRate = Math.min(rate, 1.0); // Cap at 100%
    return 1 + cappedRate * (dmg - 1);
  };

  // Current expected crit multiplier
  const currentExpectedCritMult = calcExpectedCritMult(critRate, critDmg);

  // Calculate DPS with +10% crit rate
  const newCritRate = critRate + 0.10;
  const newExpectedCritMultCR = calcExpectedCritMult(newCritRate, critDmg);
  const dpsCritRate = Math.round(currentDps * (newExpectedCritMultCR / currentExpectedCritMult));
  const dpsCritRateGain = dpsCritRate - currentDps;
  const dpsCritRatePercent = (dpsCritRateGain / currentDps) * 100;

  // Calculate DPS with +10% DMG (multiplicative with base)
  // DMG bonus is additive, so +10% DMG means dmgMult goes from (1+current) to (1+current+0.10)
  // This is roughly a 10%/(1+current) relative increase
  const currentDmgBonus = stats.dmgBonus;
  const newDmgMult = (1 + currentDmgBonus + 0.10) / (1 + currentDmgBonus);
  const dpsDmg = Math.round(currentDps * newDmgMult);
  const dpsDmgGain = dpsDmg - currentDps;
  const dpsDmgPercent = (dpsDmgGain / currentDps) * 100;

  // Calculate DPS with +10% attack speed
  // Speed buff is halved: effectiveInterval = baseInterval * (1 - speedBonus / 2)
  // Adding 10% speed buff means interval decreases
  // For simplicity, approximate as 5% faster attacks (since speed buff is halved)
  const newAttackInterval = attackInterval * (1 - 0.05); // 10% speed = 5% faster
  const newAttacksPerSecond = 1 / newAttackInterval;
  const currentAttacksPerSecond = 1 / attackInterval;
  const dpsSpeed = Math.round(currentDps * (newAttacksPerSecond / currentAttacksPerSecond));
  const dpsSpeedGain = dpsSpeed - currentDps;
  const dpsSpeedPercent = (dpsSpeedGain / currentDps) * 100;

  // Calculate DPS with +10% crit damage
  const newCritDmg = critDmg + 0.10;
  const newExpectedCritMultCD = calcExpectedCritMult(critRate, newCritDmg);
  const dpsCritDmg = Math.round(currentDps * (newExpectedCritMultCD / currentExpectedCritMult));
  const dpsCritDmgGain = dpsCritDmg - currentDps;
  const dpsCritDmgPercent = (dpsCritDmgGain / currentDps) * 100;

  // Sort by gain to highlight best option
  const comparisons = [
    { label: '+10% Crit Rate', gain: dpsCritRateGain, percent: dpsCritRatePercent, newValue: dpsCritRate },
    { label: '+10% DMG', gain: dpsDmgGain, percent: dpsDmgPercent, newValue: dpsDmg },
    { label: '+10% Atk Speed', gain: dpsSpeedGain, percent: dpsSpeedPercent, newValue: dpsSpeed },
    { label: '+10% Crit DMG', gain: dpsCritDmgGain, percent: dpsCritDmgPercent, newValue: dpsCritDmg },
  ].sort((a, b) => b.gain - a.gain);

  return (
    <div className="space-y-2">
      <div className="text-xs text-secondary mb-1">DPS with +10% stat</div>
      <div className="space-y-1">
        {comparisons.map((c, i) => (
          <div key={c.label} className="flex justify-between text-sm">
            <span className={`${i === 0 ? 'text-primary font-medium' : 'text-secondary'}`}>
              {c.label}
            </span>
            <span className="font-mono">
              <span className={`${i === 0 ? 'text-green-400' : 'text-tertiary'}`}>
                +{formatNum(c.gain)}
              </span>
              <span className="text-tertiary ml-2">
                ({formatPercent(c.percent)})
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Shows how +10% of various stats would affect skill damage
 */
function SkillStatComparison({ member }: StatComparisonProps) {
  const stats = member.computedStats;
  const damage = member.damageResult;
  if (!stats || !damage || damage.skillBaseDamage === 0) return null;

  const currentSkillDmg = damage.skillDamageExpected;
  if (currentSkillDmg === 0) return null;

  const formatNum = (n: number) => n.toLocaleString();
  const formatPercent = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

  // Current values
  const critRate = stats.effectiveCritRate;
  const critDmg = stats.effectiveCritDmg;

  // Helper to calculate expected crit multiplier
  const calcExpectedCritMult = (rate: number, dmg: number) => {
    const cappedRate = Math.min(rate, 1.0);
    return 1 + cappedRate * (dmg - 1);
  };

  const currentExpectedCritMult = calcExpectedCritMult(critRate, critDmg);

  // Calculate skill damage with +10% crit rate
  const newCritRate = critRate + 0.10;
  const newExpectedCritMultCR = calcExpectedCritMult(newCritRate, critDmg);
  const skillCritRate = Math.round(currentSkillDmg * (newExpectedCritMultCR / currentExpectedCritMult));
  const skillCritRateGain = skillCritRate - currentSkillDmg;
  const skillCritRatePercent = (skillCritRateGain / currentSkillDmg) * 100;

  // Calculate skill damage with +10% DMG
  const currentDmgBonus = stats.dmgBonus;
  const newDmgMult = (1 + currentDmgBonus + 0.10) / (1 + currentDmgBonus);
  const skillDmg = Math.round(currentSkillDmg * newDmgMult);
  const skillDmgGain = skillDmg - currentSkillDmg;
  const skillDmgPercent = (skillDmgGain / currentSkillDmg) * 100;

  // Calculate skill damage with +10% crit damage
  const newCritDmg = critDmg + 0.10;
  const newExpectedCritMultCD = calcExpectedCritMult(critRate, newCritDmg);
  const skillCritDmgValue = Math.round(currentSkillDmg * (newExpectedCritMultCD / currentExpectedCritMult));
  const skillCritDmgGain = skillCritDmgValue - currentSkillDmg;
  const skillCritDmgPercent = (skillCritDmgGain / currentSkillDmg) * 100;

  // Calculate skill damage with +10% Skill DMG
  const currentSkillDmgBonus = stats.skillDmgBonus;
  const newSkillDmgMult = (1 + currentSkillDmgBonus + 0.10) / (1 + currentSkillDmgBonus);
  const skillSkillDmg = Math.round(currentSkillDmg * newSkillDmgMult);
  const skillSkillDmgGain = skillSkillDmg - currentSkillDmg;
  const skillSkillDmgPercent = (skillSkillDmgGain / currentSkillDmg) * 100;

  // Sort by gain to highlight best option
  const comparisons = [
    { label: '+10% Crit Rate', gain: skillCritRateGain, percent: skillCritRatePercent },
    { label: '+10% DMG', gain: skillDmgGain, percent: skillDmgPercent },
    { label: '+10% Crit DMG', gain: skillCritDmgGain, percent: skillCritDmgPercent },
    { label: '+10% Skill DMG', gain: skillSkillDmgGain, percent: skillSkillDmgPercent },
  ].sort((a, b) => b.gain - a.gain);

  return (
    <div className="space-y-2">
      <div className="text-xs text-secondary mb-1">Skill Damage with +10% stat</div>
      <div className="space-y-1">
        {comparisons.map((c, i) => (
          <div key={c.label} className="flex justify-between text-sm">
            <span className={`${i === 0 ? 'text-primary font-medium' : 'text-secondary'}`}>
              {c.label}
            </span>
            <span className="font-mono">
              <span className={`${i === 0 ? 'text-green-400' : 'text-tertiary'}`}>
                +{formatNum(c.gain)}
              </span>
              <span className="text-tertiary ml-2">
                ({formatPercent(c.percent)})
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
