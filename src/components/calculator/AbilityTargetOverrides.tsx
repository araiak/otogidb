/**
 * Ability Target Overrides Component
 * Allows users to manually select which members receive ranked/random abilities
 */

import type { TeamMemberState } from '../../lib/team-calc-types';
import { MAIN_TEAM_SIZE } from '../../lib/team-calc-types';

interface RandomAbility {
  id: string;
  name: string;
  description: string;
  sourceCardId: string;
  sourceCardName: string;
  sourceMemberIndex: number;
  isFromAssist: boolean;
  targetCount: number;
  attributeFilter: string | null; // 'Divina' | 'Anima' | 'Phantasma'
  currentTargets: number[];
  eligibleTargets: number[]; // Indices of members matching the attribute filter
}

interface AbilityTargetOverridesProps {
  members: TeamMemberState[];
  abilityTargetOverrides: Record<string, number[]>;
  onSetAbilityTargets: (abilityId: string, targets: number[]) => void;
}

export function AbilityTargetOverrides({
  members,
  abilityTargetOverrides,
  onSetAbilityTargets,
}: AbilityTargetOverridesProps) {
  // Find random/attribute-based abilities (NOT deterministic "top N by stat" abilities)
  // These are abilities like "2 random Anima team members" where targets aren't determined by stats
  const randomAbilities: RandomAbility[] = [];

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    if (!member?.card) continue;

    const effectiveLevel = member.computedStats?.effectiveLevel ?? 0;

    // Check card abilities
    for (const ability of member.card.abilities || []) {
      const unlockLevel = ability.unlock_level || 1;
      if (effectiveLevel < unlockLevel) continue;
      if (ability.tags?.includes('On Skill')) continue;

      const parsed = ability.parsed;
      if (!parsed?.target) continue;

      // Only include RANDOM abilities (attribute filter, no stat-based sorting)
      // Skip deterministic "top N by ATK/SPD/HP" abilities
      const target = parsed.target;
      if (target.type === 'ranked' &&
          target.count > 1 &&
          target.attribute &&
          !target.filter) {

        const attrFilter = target.attribute;
        const eligibleTargets = getEligibleTargets(members, attrFilter);
        const currentTargets = abilityTargetOverrides[ability.id] ||
          getDefaultRandomTargets(eligibleTargets, target.count);

        randomAbilities.push({
          id: ability.id,
          name: ability.name,
          description: ability.description,
          sourceCardId: member.card.id,
          sourceCardName: member.card.name ?? 'Unknown',
          sourceMemberIndex: i,
          isFromAssist: false,
          targetCount: target.count,
          attributeFilter: attrFilter,
          currentTargets,
          eligibleTargets,
        });
      }
    }

    // Check assist abilities
    if (member.assistCard) {
      for (const ability of member.assistCard.abilities || []) {
        const unlockLevel = ability.unlock_level || 1;
        if (effectiveLevel < unlockLevel) continue;
        if (ability.tags?.includes('On Skill')) continue;

        const parsed = ability.parsed;
        if (!parsed?.target) continue;

        const target = parsed.target;
        if (target.type === 'ranked' &&
            target.count > 1 &&
            target.attribute &&
            !target.filter) {

          const attrFilter = target.attribute;
          const eligibleTargets = getEligibleTargets(members, attrFilter);
          const currentTargets = abilityTargetOverrides[ability.id] ||
            getDefaultRandomTargets(eligibleTargets, target.count);

          randomAbilities.push({
            id: ability.id,
            name: ability.name,
            description: ability.description,
            sourceCardId: member.assistCard.id,
            sourceCardName: member.assistCard.name ?? 'Unknown',
            sourceMemberIndex: i,
            isFromAssist: true,
            targetCount: target.count,
            attributeFilter: attrFilter,
            currentTargets,
            eligibleTargets,
          });
        }
      }
    }
  }

  // Don't show if no random abilities
  if (randomAbilities.length === 0) {
    return null;
  }

  const handleToggleTarget = (abilityId: string, targetIndex: number, ability: RandomAbility) => {
    // Only allow toggling eligible targets
    if (!ability.eligibleTargets.includes(targetIndex)) return;

    const currentTargets = abilityTargetOverrides[abilityId] || ability.currentTargets;
    let newTargets: number[];

    if (currentTargets.includes(targetIndex)) {
      // Remove target
      newTargets = currentTargets.filter(t => t !== targetIndex);
    } else if (currentTargets.length < ability.targetCount) {
      // Add target (if under limit)
      newTargets = [...currentTargets, targetIndex].sort((a, b) => a - b);
    } else {
      // At limit - replace the last one
      newTargets = [...currentTargets.slice(0, -1), targetIndex].sort((a, b) => a - b);
    }

    onSetAbilityTargets(abilityId, newTargets);
  };

  const handleReset = (abilityId: string) => {
    onSetAbilityTargets(abilityId, []);
  };

  // Get attribute badge color
  const getAttributeColor = (attr: string | null) => {
    switch (attr) {
      case 'Anima': return 'bg-red-500/30 text-red-300';
      case 'Divina': return 'bg-yellow-500/30 text-yellow-300';
      case 'Phantasma': return 'bg-purple-500/30 text-purple-300';
      default: return 'bg-gray-500/30 text-gray-300';
    }
  };

  return (
    <details className="bg-surface rounded-lg">
      <summary className="px-4 py-3 cursor-pointer text-sm text-secondary hover:text-primary">
        Random Ability Targets ({randomAbilities.length} abilities)
      </summary>
      <div className="px-4 pb-4 space-y-3">
        <p className="text-xs text-secondary">
          Assign which members receive random attribute-based abilities. Only members matching the attribute can be selected.
        </p>
        {randomAbilities.map(ability => {
          const hasOverride = abilityTargetOverrides[ability.id] !== undefined;
          const eligibleCount = ability.eligibleTargets.length;
          return (
            <div key={ability.id} className="bg-surface-hover rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-sm font-medium text-primary truncate">
                      {ability.name}
                    </span>
                    <span className={`text-xs px-1 rounded ${getAttributeColor(ability.attributeFilter)}`}>
                      {ability.targetCount} {ability.attributeFilter}
                    </span>
                    {ability.isFromAssist && (
                      <span className="text-xs px-1 bg-purple-500/30 text-purple-300 rounded">
                        Assist
                      </span>
                    )}
                    {hasOverride && (
                      <span className="text-xs px-1 bg-blue-500/30 text-blue-300 rounded">
                        Custom
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-secondary mt-0.5 line-clamp-1">
                    From: {ability.sourceCardName}
                    {eligibleCount < ability.targetCount && (
                      <span className="text-yellow-400 ml-2">
                        ({eligibleCount}/{ability.targetCount} eligible)
                      </span>
                    )}
                  </div>
                </div>
                {hasOverride && (
                  <button
                    type="button"
                    onClick={() => handleReset(ability.id)}
                    className="text-xs px-2 py-1 bg-gray-500/30 text-gray-300 rounded hover:bg-gray-500/50"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: MAIN_TEAM_SIZE }, (_, idx) => {
                  const member = members[idx];
                  const isTarget = (abilityTargetOverrides[ability.id] || ability.currentTargets).includes(idx);
                  const hasCard = member?.card != null;
                  const isEligible = ability.eligibleTargets.includes(idx);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => isEligible && handleToggleTarget(ability.id, idx, ability)}
                      disabled={!hasCard || !isEligible}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        !hasCard
                          ? 'bg-gray-600/30 text-gray-500 cursor-not-allowed'
                          : !isEligible
                          ? 'bg-gray-600/20 text-gray-600 cursor-not-allowed opacity-50'
                          : isTarget
                          ? 'bg-green-500/40 text-green-200 hover:bg-green-500/50'
                          : 'bg-gray-500/30 text-gray-300 hover:bg-gray-500/50'
                      }`}
                      title={
                        !hasCard
                          ? 'Empty slot'
                          : !isEligible
                          ? `${member.card!.name} is not ${ability.attributeFilter}`
                          : (member.card!.name ?? 'Unknown')
                      }
                    >
                      {idx + 1}: {hasCard ? truncateName(member.card!.name ?? 'Unknown', 8) : 'Empty'}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}

/**
 * Get indices of members matching the attribute filter
 */
function getEligibleTargets(members: TeamMemberState[], attributeFilter: string): number[] {
  const eligible: number[] = [];

  for (let i = 0; i < MAIN_TEAM_SIZE; i++) {
    const member = members[i];
    if (!member?.card) continue;

    // Check if member's attribute matches the filter
    const memberAttr = member.card.stats?.attribute_name;
    if (memberAttr === attributeFilter) {
      eligible.push(i);
    }
  }

  return eligible;
}

/**
 * Get default random targets from eligible members
 * By default, selects the first N eligible members
 */
function getDefaultRandomTargets(eligibleTargets: number[], count: number): number[] {
  return eligibleTargets.slice(0, count);
}

function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 1) + '...';
}
