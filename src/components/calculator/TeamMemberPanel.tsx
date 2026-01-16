/**
 * Team Member Panel Component
 * Complete configuration UI for a single team member slot
 */

import type { Card } from '../../types/card';
import type { TeamMemberState, BondType } from '../../lib/team-calc-types';
import { BOND_VALUES } from '../../lib/team-calc-types';
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
  onSetLevelBonus: (value: number) => void;
  onSetBondType: (bondType: BondType) => void;
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
  onSetLevelBonus,
  onSetBondType,
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

              {/* Level Bonus */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-secondary">Level Bonus</span>
                  <span className="text-primary font-mono">+{member.levelBonus}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={1}
                  value={member.levelBonus}
                  onChange={(e) => onSetLevelBonus(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-surface-hover rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Bond Type */}
              <div>
                <div className="text-sm text-secondary mb-2">Bond Type</div>
                <div className="grid grid-cols-2 gap-1">
                  {(Object.keys(BOND_VALUES) as BondType[]).map(bondType => {
                    const values = BOND_VALUES[bondType];
                    const label = getBondLabel(bondType);
                    return (
                      <button
                        key={bondType}
                        type="button"
                        onClick={() => onSetBondType(bondType)}
                        className={`px-2 py-1.5 text-xs rounded transition-colors ${
                          member.bondType === bondType
                            ? 'bg-blue-500 text-white'
                            : 'bg-surface-hover text-secondary hover:text-primary'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
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
        </div>
      </div>
    </div>
  );
}

function getBondLabel(bondType: BondType): string {
  switch (bondType) {
    case 'none': return 'None';
    case 'atk15': return '+15% ATK';
    case 'skill15': return '+15% Skill';
    case 'atk10': return '+10% ATK';
    case 'skill10': return '+10% Skill';
    case 'atk7': return '+7.5% ATK';
    case 'skill7': return '+7.5% Skill';
    case 'atk5': return '+5% ATK';
    case 'skill5': return '+5% Skill';
    case 'split5': return '+5% / +5%';
    case 'split7': return '+7.5% / +7.5%';
    default: return bondType;
  }
}

interface StatsDisplayProps {
  member: TeamMemberState;
}

function StatsDisplay({ member }: StatsDisplayProps) {
  const stats = member.computedStats;
  if (!stats) return null;

  const formatNum = (n: number) => n.toLocaleString();
  const formatPercent = (n: number) => `${(n * 100).toFixed(1)}%`;

  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <StatRow label="Level" value={stats.effectiveLevel.toString()} />
      <StatRow label="ATK" value={formatNum(Math.round(stats.displayAtk))} />
      <StatRow label="Crit Rate" value={formatPercent(stats.effectiveCritRate)} color={stats.effectiveCritRate >= 1 ? 'text-yellow-400' : undefined} />
      <StatRow label="Crit DMG" value={`${(stats.effectiveCritDmg * 100).toFixed(0)}%`} />
      <StatRow label="DMG%" value={`+${(stats.dmgBonus * 100).toFixed(0)}%`} color="text-green-400" />
      <StatRow label="Skill DMG%" value={`+${(stats.skillDmgBonus * 100).toFixed(0)}%`} color="text-blue-400" />
      <StatRow label="Speed" value={formatNum(Math.round(stats.effectiveSpeed))} />
      <StatRow label="Atk Interval" value={`${stats.attackInterval.toFixed(2)}s`} />
    </div>
  );
}

interface StatRowProps {
  label: string;
  value: string;
  color?: string;
}

function StatRow({ label, value, color }: StatRowProps) {
  return (
    <div className="flex justify-between">
      <span className="text-secondary">{label}:</span>
      <span className={`font-mono ${color || 'text-primary'}`}>{value}</span>
    </div>
  );
}

interface DamageDisplayProps {
  result: NonNullable<TeamMemberState['damageResult']>;
}

function DamageDisplay({ result }: DamageDisplayProps) {
  const formatNum = (n: number) => n.toLocaleString();

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
          </div>
          <div>
            <span className="text-secondary">Crit: </span>
            <span className="font-mono text-green-400">
              {formatNum(result.normalDamageCrit)}
            </span>
          </div>
          <div>
            <span className="text-secondary">Exp: </span>
            <span className="font-mono text-blue-400">
              {formatNum(result.normalDamageExpected)}
            </span>
          </div>
        </div>
        <div className="mt-1">
          <span className="text-secondary text-sm">DPS: </span>
          <span className="font-mono text-lg font-bold text-purple-400">
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
            </div>
            <div>
              <span className="text-secondary">Crit: </span>
              <span className="font-mono text-green-400">
                {formatNum(result.skillDamageCrit)}
              </span>
            </div>
            <div>
              <span className="text-secondary">Exp: </span>
              <span className="font-mono text-blue-400">
                {formatNum(result.skillDamageExpected)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
