/**
 * Team Summary Component
 * Displays aggregate damage for all team members
 */

import type { TeamMemberState } from '../../lib/team-calc-types';
import { MAIN_TEAM_SIZE } from '../../lib/team-calc-types';
import { getAndroidImageWithFallback } from '../../lib/images';

interface TeamSummaryProps {
  members: TeamMemberState[];
  onSelectMember: (index: number) => void;
  activeIndex: number;
}

export function TeamSummary({
  members,
  onSelectMember,
  activeIndex,
}: TeamSummaryProps) {
  // Only show main team (not reserves)
  const mainTeam = members.slice(0, MAIN_TEAM_SIZE);

  // Calculate totals
  let totalDps = 0;
  let totalSkillDamage = 0;
  let maxDps = 0;

  for (const member of mainTeam) {
    if (member.damageResult) {
      totalDps += member.damageResult.normalDps;
      totalSkillDamage += member.damageResult.skillDamageExpected;
      maxDps = Math.max(maxDps, member.damageResult.normalDps);
    }
  }

  const formatNum = (n: number) => n.toLocaleString();

  return (
    <div className="bg-surface-hover rounded-lg p-4">
      <h3 className="text-sm font-medium text-primary mb-3">Team Damage Summary</h3>

      {/* Member breakdown */}
      <div className="space-y-2 mb-4">
        {mainTeam.map((member, index) => {
          const hasCard = !!member.card;
          const dps = member.damageResult?.normalDps || 0;
          const dpsPercent = maxDps > 0 ? (dps / maxDps) * 100 : 0;
          const isActive = index === activeIndex;

          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelectMember(index)}
              className={`w-full text-left p-2 rounded transition-colors ${
                isActive
                  ? 'bg-blue-500/20 border border-blue-500/50'
                  : 'bg-surface hover:bg-surface-hover border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary">#{index + 1}</span>
                  {hasCard ? (
                    <>
                      <img
                        src={getAndroidImageWithFallback(member.card!)}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-sm text-primary truncate max-w-[120px]">
                        {member.card!.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-secondary italic">Empty</span>
                  )}
                </div>
                <span className={`font-mono text-sm ${
                  dps === maxDps && dps > 0 ? 'text-green-400' : 'text-primary'
                }`}>
                  {formatNum(dps)}/s
                </span>
              </div>

              {/* DPS bar */}
              {hasCard && (
                <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      dps === maxDps && dps > 0 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${dpsPercent}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Totals */}
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex justify-between">
          <span className="text-secondary">Total DPS:</span>
          <span className="font-mono text-lg font-bold text-green-400">
            {formatNum(totalDps)}/s
          </span>
        </div>

        {/* Skill Damage Breakdown */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-secondary">Skill Damage:</span>
            <span className="font-mono text-primary font-bold">
              {formatNum(totalSkillDamage)}
            </span>
          </div>

          {/* Per-character skill damage */}
          <div className="pl-2 space-y-1 text-xs">
            {mainTeam.map((member, index) => {
              if (!member.card || !member.damageResult) return null;

              // Check if skill is a DAMAGE skill (not buff/heal/debuff)
              // A skill deals damage if it has:
              // 1. immediate.type === 'ATK' (primary damage effect)
              // 2. OR the 'DMG' tag
              // Note: slv1 is NOT a reliable indicator - buff skills also have slv1 for scaling
              const skill = member.card.skill;
              const isDamagingSkill = skill?.parsed?.immediate?.type === 'ATK' ||
                skill?.tags?.includes('DMG');

              // Also skip if calculated damage is 0 (safety check)
              const skillDmg = member.damageResult.skillDamageExpected;
              if (!isDamagingSkill || skillDmg === 0) return null;

              const skillName = skill?.name || 'Skill';

              return (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center gap-1 text-secondary truncate max-w-[160px]">
                    <img
                      src={getAndroidImageWithFallback(member.card)}
                      alt=""
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span className="truncate" title={skillName}>{skillName}</span>
                  </div>
                  <span className="font-mono text-purple-300">
                    {formatNum(skillDmg)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team composition info */}
      <div className="mt-3 pt-3 border-t border-border">
        <div className="text-xs text-secondary">
          Team Composition
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {getAttributeCounts(mainTeam).map(({ attribute, count }) => (
            <span
              key={attribute}
              className={`text-xs px-2 py-0.5 rounded ${getAttributeColor(attribute)}`}
            >
              {attribute}: {count}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function getAttributeCounts(members: TeamMemberState[]): Array<{ attribute: string; count: number }> {
  const counts: Record<string, number> = {};

  for (const member of members) {
    if (member.card) {
      const attr = member.card.stats.attribute_name;
      counts[attr] = (counts[attr] || 0) + 1;
    }
  }

  return Object.entries(counts)
    .map(([attribute, count]) => ({ attribute, count }))
    .sort((a, b) => b.count - a.count);
}

function getAttributeColor(attribute: string): string {
  switch (attribute) {
    case 'Divina':
      return 'bg-yellow-500/30 text-yellow-300';
    case 'Phantasma':
      return 'bg-purple-500/30 text-purple-300';
    case 'Anima':
      return 'bg-green-500/30 text-green-300';
    default:
      return 'bg-gray-500/30 text-gray-300';
  }
}
