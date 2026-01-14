import type { ColumnDef } from '@tanstack/react-table';
import type { Card, AcquisitionSource } from '../../types/card';
import type { SupportedLocale } from '../../lib/i18n';
import { formatNumber, formatSkillDescription } from '../../lib/formatters';
import { AttributeIcon, TypeIcon, RarityStars } from './GameIcon';
import { ImageCell } from './cells';

export interface ColumnOptions {
  getCardUrl: (id: string) => string;
  locale: SupportedLocale;
}

/**
 * Card table column definitions.
 * Extracted from CardTable for maintainability.
 */
export function getCardTableColumns({
  getCardUrl,
  locale,
}: ColumnOptions): ColumnDef<Card>[] {
  return [
    {
      id: 'image',
      header: '',
      size: 50,
      enableSorting: false,
      cell: ({ row }) => <ImageCell card={row.original} skills={{}} locale={locale} />,
    },
    {
      accessorKey: 'id',
      header: 'ID',
      size: 60,
      cell: ({ getValue }) => (
        <span className="text-sm font-mono">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      size: 140,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <a
            href={getCardUrl(row.original.id)}
            className="link font-medium hover:underline"
          >
            {row.original.name || `Card #${row.original.id}`}
          </a>
          {!row.original.playable && (
            <span className="px-1 py-0.5 text-[10px] rounded bg-orange-500/20 text-orange-400 font-medium" title="NPC/Enemy card - not obtainable">
              NPC
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'attribute',
      accessorFn: (row) => row.stats.attribute_name,
      header: 'Attr',
      size: 50,
      cell: ({ row }) => (
        <AttributeIcon value={row.original.stats.attribute_name} size="md" />
      ),
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(row.original.stats.attribute_name);
      },
    },
    {
      id: 'type',
      accessorFn: (row) => row.stats.type_name,
      header: 'Type',
      size: 50,
      cell: ({ row }) => (
        <TypeIcon value={row.original.stats.type_name} size="md" />
      ),
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(row.original.stats.type_name);
      },
    },
    {
      id: 'rarity',
      accessorFn: (row) => row.stats.rarity,
      header: 'Rarity',
      size: 80,
      cell: ({ getValue }) => (
        <RarityStars value={getValue() as number} size="sm" />
      ),
      filterFn: (row, _columnId, filterValue: number[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(row.original.stats.rarity);
      },
    },
    {
      id: 'sources',
      accessorFn: (row) => row.acquisition?.sources || [],
      header: 'Source',
      size: 90,
      cell: ({ row }) => {
        const sources = row.original.acquisition?.sources || [];
        const available = row.original.acquisition?.currently_available || false;
        if (sources.length === 0) return <span className="text-secondary text-sm">-</span>;

        return (
          <div className="flex flex-wrap gap-0.5">
            {sources.map(source => {
              const label = source === 'gacha' ? 'G' :
                           source === 'auction' ? 'A' :
                           source === 'exchange' ? 'E' :
                           source === 'event' ? 'Ev' :
                           source === 'daily' ? 'D' : source;
              const colorClass = source === 'gacha' ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300' :
                                source === 'auction' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                                source === 'exchange' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' :
                                source === 'event' ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
                                source === 'daily' ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300' : 'bg-gray-500/20';
              const title = source === 'gacha' ? 'Gacha' :
                           source === 'auction' ? 'Auction' :
                           source === 'exchange' ? 'Exchange' :
                           source === 'event' ? 'Event' :
                           source === 'daily' ? 'Daily Dungeon' : source;
              return (
                <span
                  key={source}
                  className={`px-1 py-0.5 text-xs rounded ${colorClass} ${available ? '' : 'opacity-50'}`}
                  title={`${title}${available ? '' : ' (not currently available)'}`}
                >
                  {label}
                </span>
              );
            })}
          </div>
        );
      },
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        const cardSources = row.original.acquisition?.sources || [];
        if (cardSources.length === 0) return false;
        // Show card if it has ANY of the selected sources (OR logic)
        return filterValue.some(f => cardSources.includes(f as AcquisitionSource));
      },
    },
    {
      id: 'bonds',
      accessorFn: (row) => row.bonds?.[0]?.type || '',
      header: 'Bond',
      size: 70,
      cell: ({ row }) => {
        const bonds = row.original.bonds || [];
        if (bonds.length === 0) return <span className="text-secondary text-sm">-</span>;
        const bondType = bonds[0]?.type || '-';
        const colorClass = bondType === 'Attack' ? 'text-red-600 dark:text-red-400' :
                          bondType === 'Skill' ? 'text-blue-600 dark:text-blue-400' :
                          bondType === 'HP' ? 'text-green-600 dark:text-green-400' : '';
        return <span className={`text-sm font-medium ${colorClass}`}>{bondType}</span>;
      },
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        const bonds = row.original.bonds || [];
        if (bonds.length === 0) return false;
        // Check if any of the card's bond types match the filter
        return bonds.some(bond => filterValue.includes(bond.type));
      },
    },
    {
      id: 'skillTags',
      accessorFn: (row) => row.skill?.tags || [],
      header: 'Skill Tags',
      size: 0,
      enableSorting: false,
      meta: { hidden: true },
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        const tags = row.original.skill?.tags || [];
        if (tags.length === 0) return false;
        // Check if ALL selected filter tags are present in the card's skill tags
        return filterValue.every(f => tags.includes(f));
      },
    },
    {
      id: 'abilityTags',
      accessorFn: (row) => {
        const allTags: string[] = [];
        row.abilities?.forEach(a => {
          if (a.tags) allTags.push(...a.tags);
        });
        return allTags;
      },
      header: 'Ability Tags',
      size: 0,
      enableSorting: false,
      meta: { hidden: true },
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        const abilities = row.original.abilities || [];
        if (abilities.length === 0) return false;
        // Check if ANY single ability has ALL the selected filter tags
        return abilities.some(ability => {
          const tags = ability.tags || [];
          return filterValue.every(f => tags.includes(f));
        });
      },
    },
    {
      id: 'playable',
      accessorFn: (row) => row.playable,
      header: 'Playable',
      size: 0,
      enableSorting: false,
      meta: { hidden: true },
      filterFn: (row, _columnId, filterValue: boolean) => {
        // When filter is true, only show playable cards
        if (filterValue === true) {
          return row.original.playable === true;
        }
        // When filter is false/undefined, show all cards
        return true;
      },
    },
    {
      id: 'available',
      accessorFn: (row) => row.acquisition?.currently_available || false,
      header: 'Available',
      size: 0,
      enableSorting: false,
      meta: { hidden: true },
      filterFn: (row, _columnId, filterValue: boolean) => {
        // When filter is true, only show currently available cards
        if (filterValue === true) {
          return row.original.acquisition?.currently_available === true;
        }
        return true;
      },
    },
    {
      id: 'skill',
      accessorFn: (row) => row.skill?.description || '',
      header: 'Skill',
      size: 300,
      cell: ({ row }) => {
        const skill = row.original.skill;
        if (!skill) return <span className="text-secondary text-sm">-</span>;
        // Note: skill.description is pre-calculated in cards_index.json, so skillData is not needed
        const formattedDesc = formatSkillDescription(skill.description, null, row.original.stats.rarity);
        return (
          <span
            className="text-sm block max-w-[300px] leading-snug"
            title={skill.name}
            dangerouslySetInnerHTML={{ __html: formattedDesc }}
          />
        );
      },
    },
    {
      id: 'ability1',
      accessorFn: (row) => row.abilities?.[0]?.description || '',
      header: 'Ability 1',
      size: 200,
      cell: ({ row }) => {
        const ability = row.original.abilities?.[0];
        if (!ability) return <span className="text-secondary text-sm">-</span>;
        return (
          <span className="text-sm block max-w-[200px] leading-snug" title={ability.name}>
            {ability.description}
          </span>
        );
      },
    },
    {
      id: 'ability2',
      accessorFn: (row) => row.abilities?.[1]?.description || '',
      header: 'Ability 2',
      size: 200,
      cell: ({ row }) => {
        const ability = row.original.abilities?.[1];
        if (!ability) return <span className="text-secondary text-sm">-</span>;
        return (
          <span className="text-sm block max-w-[200px] leading-snug" title={ability.name}>
            {ability.description}
          </span>
        );
      },
    },
    {
      id: 'max_atk',
      accessorFn: (row) => row.stats.max_atk,
      header: 'ATK',
      size: 70,
      meta: { hideOnSmall: true },
      cell: ({ getValue }) => (
        <span className="text-sm font-mono">{formatNumber(getValue() as number)}</span>
      ),
    },
    {
      id: 'max_hp',
      accessorFn: (row) => row.stats.max_hp,
      header: 'HP',
      size: 70,
      meta: { hideOnSmall: true },
      cell: ({ getValue }) => (
        <span className="text-sm font-mono">{formatNumber(getValue() as number)}</span>
      ),
    },
    {
      id: 'speed',
      accessorFn: (row) => row.stats.speed,
      header: 'SPD',
      size: 60,
      meta: { hideOnSmall: true },
      cell: ({ getValue }) => (
        <span className="text-sm font-mono">{formatNumber(getValue() as number)}</span>
      ),
    },
  ];
}
