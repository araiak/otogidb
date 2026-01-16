/**
 * Team Tabs Component
 * Tab navigation for 5 main members + 2 reserve slots
 */

import type { TeamMemberState } from '../../lib/team-calc-types';
import { MAIN_TEAM_SIZE, TOTAL_SLOTS } from '../../lib/team-calc-types';
import { getAndroidImageWithFallback } from '../../lib/images';

interface TeamTabsProps {
  members: TeamMemberState[];
  activeIndex: number;
  onSelectTab: (index: number) => void;
}

export function TeamTabs({
  members,
  activeIndex,
  onSelectTab,
}: TeamTabsProps) {
  return (
    <div className="flex flex-wrap gap-1 mb-4">
      {/* Main team tabs */}
      <div className="flex gap-1">
        {members.slice(0, MAIN_TEAM_SIZE).map((member, index) => (
          <TabButton
            key={index}
            index={index}
            member={member}
            isActive={activeIndex === index}
            isReserve={false}
            onClick={() => onSelectTab(index)}
          />
        ))}
      </div>

      {/* Separator */}
      <div className="w-px bg-border mx-2 self-stretch" />

      {/* Reserve tabs */}
      <div className="flex gap-1">
        {members.slice(MAIN_TEAM_SIZE, TOTAL_SLOTS).map((member, index) => {
          const actualIndex = MAIN_TEAM_SIZE + index;
          return (
            <TabButton
              key={actualIndex}
              index={actualIndex}
              member={member}
              isActive={activeIndex === actualIndex}
              isReserve={true}
              onClick={() => onSelectTab(actualIndex)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface TabButtonProps {
  index: number;
  member: TeamMemberState;
  isActive: boolean;
  isReserve: boolean;
  onClick: () => void;
}

function TabButton({
  index,
  member,
  isActive,
  isReserve,
  onClick,
}: TabButtonProps) {
  const hasCard = !!member.card;
  const hasAssist = !!member.assistCard;

  // Get attribute color for the border/indicator
  const attrColor = getAttributeColor(member.card?.stats.attribute_name);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex flex-col items-center p-2 rounded-lg transition-all min-w-[60px]
        ${isActive
          ? 'bg-blue-500/20 border-2 border-blue-500'
          : 'bg-surface hover:bg-surface-hover border-2 border-transparent'
        }
        ${isReserve ? 'opacity-80' : ''}
      `}
    >
      {/* Reserve indicator */}
      {isReserve && (
        <span className="absolute -top-1 -right-1 text-[10px] px-1 bg-orange-500/80 text-white rounded">
          R
        </span>
      )}

      {/* Card image or placeholder */}
      <div className={`
        w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden
        ${hasCard ? '' : 'bg-surface-hover border border-dashed border-border'}
        ${hasCard && attrColor ? `ring-2 ${attrColor}` : ''}
      `}>
        {hasCard && member.card ? (
          <img
            src={getAndroidImageWithFallback(member.card)}
            alt={member.card.name || ''}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <span className="text-secondary text-lg">+</span>
        )}
      </div>

      {/* Tab number - L for Leader (slot 0) */}
      <span className={`text-xs mt-1 ${index === 0 ? 'text-yellow-400 font-bold' : 'text-secondary'}`}>
        {isReserve ? `R${index - MAIN_TEAM_SIZE + 1}` : index === 0 ? 'L' : index + 1}
      </span>

      {/* Status indicators */}
      <div className="flex gap-0.5 mt-0.5">
        {/* Assist indicator */}
        {hasAssist && (
          <span className="w-2 h-2 rounded-full bg-purple-500" title="Has assist" />
        )}
        {/* Abilities active indicator */}
        {hasCard && getActiveAbilityCount(member) > 0 && (
          <span className="w-2 h-2 rounded-full bg-green-500" title="Abilities active" />
        )}
      </div>
    </button>
  );
}

function getAttributeColor(attribute?: string): string {
  switch (attribute) {
    case 'Divina':
      return 'ring-yellow-500';
    case 'Phantasma':
      return 'ring-purple-500';
    case 'Anima':
      return 'ring-green-500';
    default:
      return '';
  }
}

function getActiveAbilityCount(member: TeamMemberState): number {
  if (!member.card) return 0;

  // Count abilities that would be active based on level
  let count = 0;
  const level = member.computedStats?.effectiveLevel ?? 0;

  for (const ability of member.card.abilities || []) {
    const unlockLevel = ability.unlock_level || 1;
    if (level >= unlockLevel) count++;
  }

  if (member.assistCard) {
    for (const ability of member.assistCard.abilities || []) {
      const unlockLevel = ability.unlock_level || 1;
      if (level >= unlockLevel) count++;
    }
  }

  return count;
}
