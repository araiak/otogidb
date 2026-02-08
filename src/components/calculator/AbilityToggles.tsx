/**
 * Ability List and Skill Toggle Component
 * Displays abilities (auto-activated by level) and skill toggle
 */

import type React from 'react';
import type { Ability } from '../../types/card';
import type { TeamMemberState, ParsedSkillEffect } from '../../lib/team-calc-types';
import { getMemberAbilities } from '../../lib/team-calc';

interface AbilityTogglesProps {
  member: TeamMemberState;
  memberIndex: number;
  onToggleSkill: () => void;
}

export function AbilityToggles({
  member,
  memberIndex,
  onToggleSkill,
}: AbilityTogglesProps) {
  const effectiveLevel = member.computedStats?.effectiveLevel ?? 0;
  const isLeader = memberIndex === 0;
  const abilities = getMemberAbilities(member, effectiveLevel);

  // Group abilities and add status info
  const passiveAbilities = abilities.filter(a => !a.isOnSkill);
  const onSkillAbilities = abilities.filter(a => a.isOnSkill);
  const cardAbilities = passiveAbilities.filter(a => !a.isFromAssist);
  const assistAbilities = passiveAbilities.filter(a => a.isFromAssist);

  return (
    <div className="space-y-4">
      {/* Skill Toggle Section - only for main team, not reserve */}
      {member.card && member.skillEffect && !member.isReserve && (
        <SkillToggleSection
          member={member}
          onSkillAbilities={onSkillAbilities}
          onToggle={onToggleSkill}
        />
      )}

      {/* Passive Abilities (auto-activated by level) */}
      {abilities.length === 0 ? (
        <div className="text-sm text-secondary italic">
          No abilities available. Select a card to see abilities.
        </div>
      ) : (
        <>
          {/* Card abilities */}
          {cardAbilities.length > 0 && (
            <div>
              <div className="text-xs text-secondary mb-2 font-medium">
                Passive Abilities (auto-activated)
              </div>
              <div className="space-y-1">
                {cardAbilities.map(({ ability, isActive, sourceCard }) => (
                  <AbilityRow
                    key={`card-${sourceCard.id}-${ability.id}`}
                    ability={ability}
                    isActive={isActive}
                    isLeader={isLeader}
                    effectiveLevel={effectiveLevel}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Assist abilities */}
          {assistAbilities.length > 0 && (
            <div>
              <div className="text-xs text-secondary mb-2 font-medium flex items-center gap-1">
                <span className="text-purple-400">[Assist]</span> Abilities
              </div>
              <div className="space-y-1">
                {assistAbilities.map(({ ability, isActive, sourceCard }) => (
                  <AbilityRow
                    key={`assist-${sourceCard.id}-${ability.id}`}
                    ability={ability}
                    isActive={isActive}
                    isLeader={isLeader}
                    effectiveLevel={effectiveLevel}
                    isAssist
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface SkillToggleSectionProps {
  member: TeamMemberState;
  onSkillAbilities: Array<{
    ability: Ability;
    isFromAssist: boolean;
    isActive: boolean;
  }>;
  onToggle: () => void;
}

function SkillToggleSection({
  member,
  onSkillAbilities,
  onToggle,
}: SkillToggleSectionProps) {
  const skill = member.card?.skill;
  const skillEffect = member.skillEffect;
  const isActive = member.skillActive;

  if (!skill || !skillEffect) return null;

  // Format skill buff description
  const buffDescriptions: string[] = [];
  const buffs = skillEffect.buffs;

  if (buffs.dmgBonus > 0) {
    buffDescriptions.push(`+${(buffs.dmgBonus * 100).toFixed(1)}% DMG dealt`);
  }
  if (buffs.dmgTakenDebuff > 0) {
    buffDescriptions.push(`Target takes +${(buffs.dmgTakenDebuff * 100).toFixed(1)}% DMG`);
  }
  if (buffs.dmgReduction > 0) {
    buffDescriptions.push(`+${(buffs.dmgReduction * 100).toFixed(1)}% DMG reduction`);
  }
  if (buffs.critRateBonus > 0) {
    buffDescriptions.push(`+${(buffs.critRateBonus * 100).toFixed(0)}% Crit Rate`);
  }
  if (buffs.critDmgBonus > 0) {
    buffDescriptions.push(`+${(buffs.critDmgBonus * 100).toFixed(0)}% Crit DMG`);
  }
  if (buffs.speedBonus > 0) {
    buffDescriptions.push(`+${(buffs.speedBonus * 100).toFixed(0)}% ATK Speed`);
  }
  if (buffs.speedDebuff > 0) {
    buffDescriptions.push(`Target -${(buffs.speedDebuff * 100).toFixed(0)}% Speed`);
  }

  // Get target description
  const targetDesc = getSkillTargetDescription(skillEffect);

  return (
    <div className={`p-3 rounded-lg border-2 transition-all ${
      isActive
        ? 'bg-purple-500/20 border-purple-500'
        : 'bg-surface border-border'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-primary">Skill Buff</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              skillEffect.targetType === 'ally'
                ? 'bg-green-500/30 text-green-300'
                : skillEffect.targetType === 'enemy'
                ? 'bg-red-500/30 text-red-300'
                : 'bg-blue-500/30 text-blue-300'
            }`}>
              {targetDesc}
            </span>
            {skillEffect.duration && skillEffect.duration > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/30 text-orange-300">
                {skillEffect.duration}s
              </span>
            )}
          </div>
          <div className="text-xs text-secondary line-clamp-2 mb-2">
            {skill.description}
          </div>
          {buffDescriptions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {buffDescriptions.map((desc, i) => (
                <span
                  key={i}
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-purple-500/40 text-purple-200' : 'bg-surface-hover text-secondary'
                  }`}
                >
                  {desc}
                </span>
              ))}
            </div>
          )}
          {/* Show "On Skill" abilities that modify the skill */}
          {onSkillAbilities.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <div className="text-xs text-secondary mb-1">Skill modifiers:</div>
              {onSkillAbilities.map(({ ability, isActive: abilityActive }) => (
                <div
                  key={ability.id}
                  className={`text-xs ${abilityActive ? 'text-purple-300' : 'text-secondary line-through'}`}
                >
                  {ability.name}: {ability.description}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-all flex-shrink-0 ${
            isActive
              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
              : 'bg-surface-hover text-secondary hover:text-primary hover:bg-surface'
          }`}
        >
          {isActive ? 'Active' : 'Inactive'}
        </button>
      </div>
    </div>
  );
}

function getSkillTargetDescription(skillEffect: ParsedSkillEffect): string {
  const { targetType, targetCount, targetPriority } = skillEffect;

  let target = '';
  if (targetType === 'ally') {
    target = targetCount === 99 ? 'All allies' : `${targetCount} ally`;
  } else if (targetType === 'enemy') {
    target = targetCount === 99 ? 'All enemies' : `${targetCount} enemy`;
  } else {
    target = 'Self';
  }

  if (targetPriority === 'highest_atk') {
    target += ' (highest ATK)';
  } else if (targetPriority === 'lowest_hp') {
    target += ' (lowest HP)';
  }

  return target;
}

interface AbilityRowProps {
  ability: Ability;
  isActive: boolean;
  isLeader: boolean;
  effectiveLevel: number;
  isAssist?: boolean;
}

function AbilityRow({
  ability,
  isLeader,
  effectiveLevel,
  isAssist = false,
}: AbilityRowProps) {
  const tags = ability.tags || [];
  const unlockLevel = ability.unlock_level || 1;
  const requiresLeader = tags.includes('Leader');
  const levelMet = effectiveLevel >= unlockLevel;
  const leaderMet = !requiresLeader || isLeader;

  // Determine why ability is inactive
  let inactiveReason = '';
  if (!levelMet) {
    inactiveReason = `Need Lv.${unlockLevel}`;
  } else if (!leaderMet) {
    inactiveReason = 'Requires Leader slot';
  }

  // Fully active only if all conditions met
  const fullyActive = levelMet && leaderMet;

  // Get effect type
  let effectType = '';
  if (tags.includes('DMG Boost')) effectType = 'DMG';
  else if (tags.includes('Crit Rate')) effectType = 'Crit%';
  else if (tags.includes('Crit DMG')) effectType = 'CritDMG';
  else if (tags.includes('Skill DMG')) effectType = 'SkillDMG';
  else if (tags.includes('ATK Speed')) effectType = 'Speed';
  else if (tags.includes('Level Boost')) effectType = 'Level';
  else if (tags.includes('DMG Reduction')) effectType = 'DEF';

  // Timing/condition badges
  const badges: React.ReactNode[] = [];
  if (tags.includes('Wave Start')) {
    badges.push(<span key="wave" className="text-xs px-1 bg-orange-500/30 text-orange-300 rounded">Wave</span>);
  }
  if (tags.includes('Final Wave')) {
    badges.push(<span key="final" className="text-xs px-1 bg-red-500/30 text-red-300 rounded">Final</span>);
  }
  if (requiresLeader) {
    badges.push(
      <span
        key="leader"
        className={`text-xs px-1 rounded ${
          leaderMet ? 'bg-yellow-500/30 text-yellow-300' : 'bg-gray-500/30 text-gray-400'
        }`}
      >
        Leader
      </span>
    );
  }

  return (
    <div className={`flex items-start gap-2 p-2 rounded transition-colors ${
      fullyActive ? 'bg-surface-hover' : 'bg-surface opacity-60'
    }`}>
      {/* Status indicator */}
      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
        fullyActive ? 'bg-green-500' : levelMet ? 'bg-yellow-500' : 'bg-gray-500'
      }`} title={fullyActive ? 'Active' : inactiveReason} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          <span className={`text-sm font-medium truncate ${
            fullyActive ? 'text-primary' : 'text-secondary'
          }`}>
            {ability.name}
          </span>
          {effectType && (
            <span className="text-xs px-1 bg-blue-500/30 text-blue-300 rounded">
              {effectType}
            </span>
          )}
          {badges}
          {isAssist && (
            <span className="text-xs px-1 bg-purple-500/30 text-purple-300 rounded">
              Assist
            </span>
          )}
        </div>
        <div className="text-xs text-secondary mt-0.5 line-clamp-2">
          {unlockLevel > 1 && (
            <span className={`mr-1 ${levelMet ? 'text-green-400' : 'text-red-400'}`}>
              Lv.{unlockLevel}:
            </span>
          )}
          {ability.description}
        </div>
        {/* Show inactive reason */}
        {!fullyActive && inactiveReason && (
          <div className="text-xs text-red-400 mt-0.5">
            {inactiveReason}
          </div>
        )}
      </div>
    </div>
  );
}
