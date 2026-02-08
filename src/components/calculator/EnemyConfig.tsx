/**
 * Enemy Configuration Component
 * Shared enemy settings for damage calculations
 *
 * Updated 2026-01: Added enemy attribute (race bonus) controls per RE audit findings
 * Note: Defense removed from UI as world boss defense is negligible (~5% at most)
 */

import type { EnemyState, EnemyAttribute, RandomTargetMode } from '../../lib/team-calc-types';
import {
  getAdvantageAttribute,
  RANDOM_TARGET_MODE_LABELS,
  RANDOM_TARGET_MODE_DESCRIPTIONS,
} from '../../lib/team-calc-types';

interface EnemyConfigProps {
  enemy: EnemyState;
  onBaseShieldChange: (value: number) => void;
  onAttributeChange: (value: EnemyAttribute) => void;
  onFinalWaveChange: (value: boolean) => void;
  onWaveCountChange: (value: number) => void;
  onIgnoreShieldCapChange: (value: boolean) => void;
  onWorldBossBonusChange: (value: number) => void;
  onHealersDontAttackChange: (value: boolean) => void;
  effectiveShield?: number;
  skillDebuffTotal?: number;
  abilityDebuffTotal?: number;
  raceBonus?: number;
  randomTargetMode?: RandomTargetMode;
  onRandomTargetModeChange?: (mode: RandomTargetMode) => void;
}

export function EnemyConfig({
  enemy,
  onBaseShieldChange,
  onAttributeChange,
  onFinalWaveChange,
  onWaveCountChange,
  onIgnoreShieldCapChange,
  onHealersDontAttackChange,
  effectiveShield,
  skillDebuffTotal = 0,
  abilityDebuffTotal = 0,
  raceBonus = 0,
  randomTargetMode = 'average',
  onRandomTargetModeChange,
}: EnemyConfigProps) {
  const displayPercent = Math.round(enemy.baseShield * 100);
  const effectivePercent = effectiveShield !== undefined
    ? Math.round(effectiveShield * 100)
    : displayPercent;
  const skillDebuffPercent = Math.round(skillDebuffTotal * 100);
  const abilityDebuffPercent = Math.round(abilityDebuffTotal * 100);
  const raceBonusPercent = Math.round(raceBonus * 100);
  const advantageAttr = getAdvantageAttribute(enemy.attribute);

  // Determine color based on shield value
  let shieldColor = 'text-primary';
  if (enemy.baseShield < 0) {
    shieldColor = 'text-red-400'; // Vulnerability
  } else if (enemy.baseShield > 0.5) {
    shieldColor = 'text-yellow-400'; // High shield
  }

  return (
    <div className="space-y-4">
      {/* Enemy Settings Section */}
      <div className="bg-surface-hover rounded-lg p-4">
        <h3 className="text-sm font-medium text-primary mb-3">Enemy Settings</h3>

        <div className="space-y-3">
          {/* Base Shield slider */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-secondary">Base Shield / Vulnerability</span>
              <span className={`font-mono ${shieldColor}`}>
                {displayPercent > 0 ? '+' : ''}{displayPercent}%
              </span>
            </div>
            <input
              type="range"
              min={-100}
              max={85}
              step={5}
              value={displayPercent}
              onChange={(e) => onBaseShieldChange(parseInt(e.target.value, 10) / 100)}
              className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-secondary mt-1">
              <span>-100% (Vulnerable)</span>
              <span>0%</span>
              <span>+85% (Shielded)</span>
            </div>
            {/* Shield presets - positioned below slider */}
            <div className="flex flex-wrap gap-1 mt-2">
              {[
                { label: 'None', value: 0, tip: 'Most content' },
                { label: '30%', value: 0.3, tip: 'Mid Tower' },
                { label: '50%', value: 0.5, tip: 'High Tower' },
                { label: '75%', value: 0.75, tip: 'Tower 67+' },
                { label: '-25%', value: -0.25, tip: 'Vulnerable' },
              ].map(preset => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onBaseShieldChange(preset.value)}
                  title={preset.tip}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    enemy.baseShield === preset.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-surface hover:bg-surface-hover text-secondary'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Enemy Attribute (Race Bonus) - RE Validated: optional feature */}
          <div>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-secondary">Enemy Attribute</span>
              <span className="text-xs text-tertiary">(enables race bonus)</span>
            </div>
            <div className="flex gap-2">
              {(['None', 'Divina', 'Phantasma', 'Anima'] as const).map(attr => {
                const isSelected = enemy.attribute === attr;
                let bgColor = 'bg-surface hover:bg-surface-hover';
                if (isSelected) {
                  switch (attr) {
                    case 'Divina': bgColor = 'bg-blue-600'; break;
                    case 'Phantasma': bgColor = 'bg-purple-600'; break;
                    case 'Anima': bgColor = 'bg-green-600'; break;
                    default: bgColor = 'bg-gray-600';
                  }
                }
                return (
                  <button
                    key={attr}
                    type="button"
                    onClick={() => onAttributeChange(attr)}
                    className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${bgColor} ${
                      isSelected ? 'text-white' : 'text-secondary'
                    }`}
                  >
                    {attr}
                  </button>
                );
              })}
            </div>
            {/* Show which attribute has advantage */}
            {advantageAttr && (
              <div className={`mt-2 p-2 bg-surface rounded border ${
                raceBonusPercent > 0 ? 'border-green-500/30' :
                raceBonusPercent < 0 ? 'border-red-500/30' : 'border-border'
              }`}>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Advantage:</span>
                  <span className={`font-medium ${
                    advantageAttr === 'Divina' ? 'text-blue-400' :
                    advantageAttr === 'Phantasma' ? 'text-purple-400' : 'text-green-400'
                  }`}>
                    {advantageAttr}
                  </span>
                </div>
                {raceBonusPercent !== 0 && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-secondary">
                      {raceBonusPercent > 0 ? 'Team Bonus:' : 'Team Penalty:'}
                    </span>
                    <span className={`font-mono ${
                      raceBonusPercent > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {raceBonusPercent > 0 ? '+' : ''}{raceBonusPercent}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Debuff breakdown */}
          {(skillDebuffTotal > 0 || abilityDebuffTotal > 0) && (
            <div className="p-2 bg-surface rounded border border-green-500/30">
              <div className="text-xs text-secondary mb-1">Enemy Debuffs Applied:</div>
              {skillDebuffTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-purple-300">From Skills:</span>
                  <span className="font-mono text-green-400">
                    +{skillDebuffPercent}% DMG taken
                  </span>
                </div>
              )}
              {abilityDebuffTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-blue-300">From Abilities:</span>
                  <span className="font-mono text-green-400">
                    +{abilityDebuffPercent}% DMG taken
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Effective shield display */}
          {effectiveShield !== undefined && effectiveShield !== enemy.baseShield && (
            <div className="p-2 bg-surface rounded border border-border">
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Effective (after debuffs):</span>
                <span className={`font-mono ${
                  effectivePercent < displayPercent ? 'text-green-400' : 'text-primary'
                }`}>
                  {effectivePercent > 0 ? '+' : ''}{effectivePercent}%
                </span>
              </div>
            </div>
          )}

          {/* Damage multiplier display - shows shield effect */}
          <div className="p-2 bg-surface rounded border border-border">
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Damage Multiplier:</span>
              <span className="font-mono text-primary font-bold">
                {(
                  (1 - (effectiveShield ?? enemy.baseShield)) *
                  100
                ).toFixed(0)}%
              </span>
            </div>
            {enemy.baseShield !== 0 && (
              <div className="text-xs text-tertiary mt-1">
                = 1 - {Math.round((effectiveShield ?? enemy.baseShield) * 100)}% Shield
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulation Settings Section */}
      <div className="bg-surface-hover rounded-lg p-4">
        <h3 className="text-sm font-medium text-primary mb-3">Simulation Settings</h3>

        <div className="space-y-3">
          {/* Wave Settings */}
          <div className="flex gap-3">
            {/* Final Wave checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enemy.isFinalWave}
                onChange={(e) => onFinalWaveChange(e.target.checked)}
                className="w-4 h-4 accent-purple-500"
              />
              <span className="text-sm text-secondary">Final Wave</span>
            </label>

            {/* Wave Counter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary">Wave:</span>
              <input
                type="number"
                min={1}
                max={10}
                value={enemy.waveCount}
                onChange={(e) => onWaveCountChange(parseInt(e.target.value, 10) || 1)}
                className="w-14 px-2 py-1 bg-surface border border-border rounded text-sm text-primary text-center"
              />
            </div>
          </div>

          {/* Checkboxes row */}
          <div className="flex flex-wrap gap-4">
            {/* Ignore Shield Cap checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enemy.ignoreShieldCap}
                onChange={(e) => onIgnoreShieldCapChange(e.target.checked)}
                className="w-4 h-4 accent-orange-500"
              />
              <span className="text-sm text-secondary">Ignore Shield Cap</span>
            </label>

            {/* Healers Don't Attack checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enemy.healersDontAttack}
                onChange={(e) => onHealersDontAttackChange(e.target.checked)}
                className="w-4 h-4 accent-pink-500"
              />
              <span className="text-sm text-secondary">Healers Don't Attack</span>
            </label>
          </div>

          {/* Explanatory notes for enabled options */}
          {enemy.ignoreShieldCap && (
            <p className="text-xs text-orange-400">
              Shield cap (-75% to +85%) disabled. Debuffs can stack beyond 175% damage.
            </p>
          )}
          {enemy.healersDontAttack && (
            <p className="text-xs text-pink-400">
              Healer cards deal 0 damage (simulating them being busy healing).
            </p>
          )}

          {/* Random Targeting Mode */}
          {onRandomTargetModeChange && (
            <div>
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-secondary">Random Ability Targeting</span>
                <span className="text-xs text-tertiary">(for abilities like "2 random allies")</span>
              </div>
              <select
                value={randomTargetMode}
                onChange={(e) => onRandomTargetModeChange(e.target.value as RandomTargetMode)}
                className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-primary focus:outline-none focus:border-blue-500"
              >
                {(Object.keys(RANDOM_TARGET_MODE_LABELS) as RandomTargetMode[]).map(mode => (
                  <option key={mode} value={mode}>
                    {RANDOM_TARGET_MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-tertiary mt-1">
                {RANDOM_TARGET_MODE_DESCRIPTIONS[randomTargetMode]}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
