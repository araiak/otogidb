import { useState, useEffect, useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  flexRender,
} from '@tanstack/react-table';
import type { Card } from '../../types/card';
import { getCardsData, getSkillsData } from '../../lib/cards';
import { getThumbnailUrl, getPopupImageUrl, PLACEHOLDER_IMAGE } from '../../lib/images';
import { formatNumber, formatSkillDescription, type SkillData } from '../../lib/formatters';
import { createSearchIndex, searchCards } from '../../lib/search';
import { AttributeIcon, TypeIcon, RarityStars } from './GameIcon';
import CardPopup from './CardPopup';

interface CardTableProps {
  initialCards?: Card[];
}

// Filter dropdown component
function FilterDropdown({
  options,
  value,
  onChange,
  renderOption,
  placeholder,
  dropdownClassName = ''
}: {
  options: string[] | number[];
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  renderOption?: (opt: string | number) => React.ReactNode;
  placeholder: string;
  dropdownClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (opt: string | number) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 text-xs rounded border bg-primary hover:bg-surface transition-colors"
        style={{ borderColor: value.length > 0 ? 'var(--color-accent)' : 'var(--color-border)' }}
      >
        {value.length > 0 ? `${value.length} selected` : placeholder}
      </button>
      {isOpen && (
        <div
          className={`absolute z-50 mt-1 p-2 rounded-md shadow-lg border bg-primary min-w-[120px] ${dropdownClassName}`}
          style={{ borderColor: 'var(--color-border)' }}
        >
          {options.map((opt) => (
            <label key={String(opt)} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-surface px-2 rounded">
              <input
                type="checkbox"
                checked={value.includes(opt)}
                onChange={() => toggleOption(opt)}
                className="rounded"
              />
              {renderOption ? renderOption(opt) : String(opt)}
            </label>
          ))}
          {value.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="mt-2 text-xs text-secondary hover:text-primary w-full text-left px-2"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Grouped tag filter dropdown with categories
interface TagCategory {
  name: string;
  tags: string[];
  colorClass: string;
}

function GroupedTagDropdown({
  categories,
  value,
  onChange,
  placeholder,
}: {
  categories: TagCategory[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (tag: string) => {
    if (value.includes(tag)) {
      onChange(value.filter(v => v !== tag));
    } else {
      onChange([...value, tag]);
    }
  };

  // Filter to only show categories that have tags
  const visibleCategories = categories.filter(cat => cat.tags.length > 0);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 text-xs rounded border bg-primary hover:bg-surface transition-colors"
        style={{ borderColor: value.length > 0 ? 'var(--color-accent)' : 'var(--color-border)' }}
      >
        {value.length > 0 ? `${value.length} selected` : placeholder}
      </button>
      {isOpen && (
        <div
          className="absolute z-50 mt-1 rounded-md shadow-lg border bg-primary min-w-[200px] max-h-[400px] overflow-y-auto"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {visibleCategories.map((category, idx) => (
            <div key={category.name}>
              {idx > 0 && <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }} />}
              <div className="px-3 py-1.5 text-xs font-semibold text-secondary uppercase tracking-wide">
                {category.name}
              </div>
              <div className="px-2 pb-1">
                {category.tags.map(tag => (
                  <label
                    key={tag}
                    className="flex items-center gap-2 py-1 cursor-pointer hover:bg-surface px-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={value.includes(tag)}
                      onChange={() => toggleOption(tag)}
                      className="rounded"
                    />
                    <span className={`text-sm ${category.colorClass}`}>{tag}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {value.length > 0 && (
            <div className="border-t px-2 py-2" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => onChange([])}
                className="text-xs text-secondary hover:text-primary w-full text-left px-2"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Image cell with hover popup and link to card page
function ImageCell({ card, skillData }: { card: Card; skillData?: SkillData | null }) {
  const [isHovered, setIsHovered] = useState(false);
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);
  const url = getThumbnailUrl(card);

  return (
    <>
      <a
        href={`/cards/${card.id}`}
        ref={setReferenceElement}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={url || PLACEHOLDER_IMAGE}
          alt={card.name || `Card #${card.id}`}
          className="w-10 h-10 rounded object-cover cursor-pointer hover:ring-2 hover:ring-accent transition-all"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
          }}
        />
      </a>
      <CardPopup card={card} isOpen={isHovered} referenceElement={referenceElement} skillData={skillData} />
    </>
  );
}

export default function CardTable({ initialCards }: CardTableProps) {
  const [cards, setCards] = useState<Card[]>(initialCards || []);
  const [skills, setSkills] = useState<Record<string, SkillData>>({});
  const [loading, setLoading] = useState(!initialCards);
  const [error, setError] = useState<string | null>(null);

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Filter values
  const [attributeFilter, setAttributeFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [rarityFilter, setRarityFilter] = useState<number[]>([]);
  const [bondFilter, setBondFilter] = useState<string[]>([]);
  const [skillTagFilter, setSkillTagFilter] = useState<string[]>([]);
  const [abilityTagFilter, setAbilityTagFilter] = useState<string[]>([]);

  // Load cards and skills
  useEffect(() => {
    async function loadData() {
      try {
        const [cardsData, skillsData] = await Promise.all([
          initialCards ? Promise.resolve({ cards: Object.fromEntries(initialCards.map(c => [c.id, c])) }) : getCardsData(),
          getSkillsData()
        ]);

        if (!initialCards) {
          const cardList = Object.values(cardsData.cards);
          setCards(cardList);
          createSearchIndex(cardList);
        }
        setSkills(skillsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cards');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [initialCards]);

  // Update column filters when filter values change
  useEffect(() => {
    const filters: ColumnFiltersState = [];
    if (attributeFilter.length > 0) {
      filters.push({ id: 'attribute', value: attributeFilter });
    }
    if (typeFilter.length > 0) {
      filters.push({ id: 'type', value: typeFilter });
    }
    if (rarityFilter.length > 0) {
      filters.push({ id: 'rarity', value: rarityFilter });
    }
    if (bondFilter.length > 0) {
      filters.push({ id: 'bonds', value: bondFilter });
    }
    if (skillTagFilter.length > 0) {
      filters.push({ id: 'skillTags', value: skillTagFilter });
    }
    if (abilityTagFilter.length > 0) {
      filters.push({ id: 'abilityTags', value: abilityTagFilter });
    }
    setColumnFilters(filters);
  }, [attributeFilter, typeFilter, rarityFilter, bondFilter, skillTagFilter, abilityTagFilter]);

  // Get unique filter options
  const filterOptions = useMemo(() => {
    const attributes = new Set<string>();
    const types = new Set<string>();
    const rarities = new Set<number>();
    const bondTypes = new Set<string>();
    const skillTags = new Set<string>();
    const abilityTags = new Set<string>();

    cards.forEach(card => {
      if (card.stats.attribute_name) attributes.add(card.stats.attribute_name);
      if (card.stats.type_name) types.add(card.stats.type_name);
      if (card.stats.rarity) rarities.add(card.stats.rarity);
      if (card.bonds && card.bonds.length > 0) {
        card.bonds.forEach(bond => {
          if (bond.type) bondTypes.add(bond.type);
        });
      }
      if (card.skill?.tags) {
        card.skill.tags.forEach(tag => skillTags.add(tag));
      }
      if (card.abilities) {
        card.abilities.forEach(ability => {
          if (ability.tags) {
            ability.tags.forEach(tag => abilityTags.add(tag));
          }
        });
      }
    });

    // Sort attributes: known attributes first (Divina, Anima, Phantasma), then others/unknown at bottom
    const knownAttributes = ['Divina', 'Anima', 'Phantasma'];
    const sortedAttributes = Array.from(attributes).sort((a, b) => {
      const aKnown = knownAttributes.indexOf(a);
      const bKnown = knownAttributes.indexOf(b);
      // Both known: sort by predefined order
      if (aKnown !== -1 && bKnown !== -1) return aKnown - bKnown;
      // Only a is known: a comes first
      if (aKnown !== -1) return -1;
      // Only b is known: b comes first
      if (bKnown !== -1) return 1;
      // Neither known: alphabetical (Unknown, Neutral, etc. at end)
      return a.localeCompare(b);
    });

    // Sort bond types: Attack, Skill, HP first, then others
    const knownBondTypes = ['Attack', 'Skill', 'HP'];
    const sortedBondTypes = Array.from(bondTypes).sort((a, b) => {
      const aKnown = knownBondTypes.indexOf(a);
      const bKnown = knownBondTypes.indexOf(b);
      if (aKnown !== -1 && bKnown !== -1) return aKnown - bKnown;
      if (aKnown !== -1) return -1;
      if (bKnown !== -1) return 1;
      return a.localeCompare(b);
    });

    // Sort skill tags: effect types first, then status effects, then secondary effects
    const tagOrder = ['DMG', 'Heal', 'Buff', 'Debuff', 'Single', 'Multi', 'AoE', 'Stun', 'Poison', 'Burn', 'Freeze', 'Sleep', 'Silence', 'Paralysis', 'Petrify', 'Slow', 'DEF Down', 'DMG Up', 'DMG Down', 'Cleanse'];
    const sortedSkillTags = Array.from(skillTags).sort((a, b) => {
      const aIndex = tagOrder.indexOf(a);
      const bIndex = tagOrder.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });

    // Sort ability tags: buff effects first, then defensive, then status, then scope
    const abilityTagOrder = ['DMG Boost', 'Crit Rate', 'Crit DMG', 'ATK Speed', 'Skill DMG', 'Max HP', 'DMG Reduction', 'Lifesteal', 'Heal', 'Slow', 'DMG Amp', 'Enemy DMG Down', 'Stun', 'Poison', 'Burn', 'Freeze', 'Sleep', 'Silence', 'Paralysis', 'Petrify', 'Immunity', 'Team', 'Divina', 'Anima', 'Phantasma', 'Melee', 'Ranged', 'Healer', 'Leader', 'Wave Start', 'Final Wave', 'Drop Rate', 'Time Limit'];
    const sortedAbilityTags = Array.from(abilityTags).sort((a, b) => {
      const aIndex = abilityTagOrder.indexOf(a);
      const bIndex = abilityTagOrder.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });

    return {
      attributes: sortedAttributes,
      types: Array.from(types).sort(),
      rarities: Array.from(rarities).sort((a, b) => b - a), // Descending
      bondTypes: sortedBondTypes,
      skillTags: sortedSkillTags,
      abilityTags: sortedAbilityTags,
    };
  }, [cards]);

  // Build skill tag categories for grouped dropdown
  const skillTagCategories = useMemo<TagCategory[]>(() => {
    const available = new Set(filterOptions.skillTags);
    return [
      {
        name: 'Effect',
        tags: ['DMG', 'Heal', 'Buff', 'Debuff'].filter(t => available.has(t)),
        colorClass: 'text-yellow-500'
      },
      {
        name: 'Target',
        tags: ['Single', 'Multi', 'AoE'].filter(t => available.has(t)),
        colorClass: 'text-blue-400'
      },
      {
        name: 'Status',
        tags: ['Stun', 'Poison', 'Burn', 'Freeze', 'Sleep', 'Silence', 'Paralysis', 'Petrify'].filter(t => available.has(t)),
        colorClass: 'text-red-400'
      },
      {
        name: 'Secondary',
        tags: ['Slow', 'DEF Down', 'DMG Up', 'DMG Down', 'Cleanse'].filter(t => available.has(t)),
        colorClass: 'text-green-400'
      },
    ];
  }, [filterOptions.skillTags]);

  // Build ability tag categories for grouped dropdown
  const abilityTagCategories = useMemo<TagCategory[]>(() => {
    const available = new Set(filterOptions.abilityTags);
    return [
      {
        name: 'Offensive',
        tags: ['DMG Boost', 'Crit Rate', 'Crit DMG', 'ATK Speed', 'Skill DMG'].filter(t => available.has(t)),
        colorClass: 'text-yellow-500'
      },
      {
        name: 'Defensive',
        tags: ['Max HP', 'DMG Reduction', 'Lifesteal', 'Heal', 'Immunity'].filter(t => available.has(t)),
        colorClass: 'text-green-400'
      },
      {
        name: 'Debuffs',
        tags: ['Slow', 'DMG Amp', 'Enemy DMG Down'].filter(t => available.has(t)),
        colorClass: 'text-purple-400'
      },
      {
        name: 'Status',
        tags: ['Stun', 'Poison', 'Burn', 'Freeze', 'Sleep', 'Silence', 'Paralysis', 'Petrify'].filter(t => available.has(t)),
        colorClass: 'text-red-400'
      },
      {
        name: 'Scope',
        tags: ['Team', 'Divina', 'Anima', 'Phantasma', 'Melee', 'Ranged', 'Healer', 'Leader'].filter(t => available.has(t)),
        colorClass: 'text-blue-400'
      },
      {
        name: 'Timing',
        tags: ['Wave Start', 'Final Wave'].filter(t => available.has(t)),
        colorClass: 'text-orange-400'
      },
      {
        name: 'Special',
        tags: ['Drop Rate', 'Time Limit'].filter(t => available.has(t)),
        colorClass: 'text-cyan-400'
      },
    ];
  }, [filterOptions.abilityTags]);

  // Filter data based on global search
  const filteredData = useMemo(() => {
    if (!globalFilter.trim()) return cards;
    return searchCards(globalFilter, cards);
  }, [cards, globalFilter]);

  // Column definitions
  const columns = useMemo<ColumnDef<Card>[]>(() => [
    {
      id: 'image',
      header: '',
      size: 50,
      enableSorting: false,
      cell: ({ row }) => <ImageCell card={row.original} skillData={row.original.skill ? skills[row.original.skill.id] : null} />,
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
        <a
          href={`/cards/${row.original.id}`}
          className="link font-medium hover:underline"
        >
          {row.original.name || `Card #${row.original.id}`}
        </a>
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
      filterFn: (row, columnId, filterValue: string[]) => {
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
      filterFn: (row, columnId, filterValue: string[]) => {
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
      filterFn: (row, columnId, filterValue: number[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(row.original.stats.rarity);
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
        const colorClass = bondType === 'Attack' ? 'text-red-400' :
                          bondType === 'Skill' ? 'text-blue-400' :
                          bondType === 'HP' ? 'text-green-400' : '';
        return <span className={`text-sm font-medium ${colorClass}`}>{bondType}</span>;
      },
      filterFn: (row, columnId, filterValue: string[]) => {
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
      filterFn: (row, columnId, filterValue: string[]) => {
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
      filterFn: (row, columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        const abilities = row.original.abilities || [];
        if (abilities.length === 0) return false;
        // Collect all ability tags from all abilities
        const allAbilityTags: string[] = [];
        abilities.forEach(ability => {
          if (ability.tags) allAbilityTags.push(...ability.tags);
        });
        // Check if ALL selected filter tags are present across the card's abilities
        return filterValue.every(f => allAbilityTags.includes(f));
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
        const skillData = skills[skill.id];
        const formattedDesc = formatSkillDescription(skill.description, skillData, row.original.stats.rarity);
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
  ], [skills]);

  // Create table instance
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  // Loading state
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-current border-t-transparent" style={{ color: 'var(--color-accent)' }}></div>
        <p className="mt-4 text-secondary">Loading card data...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 btn btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search bar - full width on mobile */}
        <input
          type="text"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search cards..."
          className="w-full px-4 py-2 rounded-md border bg-primary"
          style={{ borderColor: 'var(--color-border)' }}
        />

        {/* Filter Dropdowns - wrap on small screens */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-secondary hidden sm:inline">Filters:</span>
          <FilterDropdown
            options={filterOptions.attributes}
            value={attributeFilter}
            onChange={(v) => setAttributeFilter(v as string[])}
            placeholder="Attr"
            dropdownClassName="min-w-[160px]"
            renderOption={(opt) => (
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <AttributeIcon value={opt as string} size="lg" />
                </span>
                <span className="text-sm">{opt}</span>
              </span>
            )}
          />
          <FilterDropdown
            options={filterOptions.types}
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as string[])}
            placeholder="Type"
            dropdownClassName="min-w-[140px]"
            renderOption={(opt) => (
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <TypeIcon value={opt as string} size="lg" />
                </span>
                <span className="text-sm">{opt}</span>
              </span>
            )}
          />
          <FilterDropdown
            options={filterOptions.rarities}
            value={rarityFilter}
            onChange={(v) => setRarityFilter(v as number[])}
            placeholder="Rarity"
            renderOption={(opt) => (
              <RarityStars value={opt as number} size="sm" />
            )}
          />
          <FilterDropdown
            options={filterOptions.bondTypes}
            value={bondFilter}
            onChange={(v) => setBondFilter(v as string[])}
            placeholder="Bond"
            dropdownClassName="min-w-[120px]"
            renderOption={(opt) => {
              const colorClass = opt === 'Attack' ? 'text-red-400' :
                                opt === 'Skill' ? 'text-blue-400' :
                                opt === 'HP' ? 'text-green-400' : '';
              return <span className={`text-sm font-medium ${colorClass}`}>{opt}</span>;
            }}
          />
          <GroupedTagDropdown
            categories={skillTagCategories}
            value={skillTagFilter}
            onChange={setSkillTagFilter}
            placeholder="Skill Tags"
          />
          <GroupedTagDropdown
            categories={abilityTagCategories}
            value={abilityTagFilter}
            onChange={setAbilityTagFilter}
            placeholder="Ability Tags"
          />
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-secondary">
        Showing {table.getRowModel().rows.length} of {cards.length} cards
        {(attributeFilter.length > 0 || typeFilter.length > 0 || rarityFilter.length > 0 || bondFilter.length > 0 || skillTagFilter.length > 0 || abilityTagFilter.length > 0) && (
          <button
            onClick={() => {
              setAttributeFilter([]);
              setTypeFilter([]);
              setRarityFilter([]);
              setBondFilter([]);
              setSkillTagFilter([]);
              setAbilityTagFilter([]);
            }}
            className="ml-2 text-accent hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  const meta = header.column.columnDef.meta as any;
                  // Skip completely hidden columns (used for filtering only)
                  if (meta?.hidden) return null;
                  const hideOnSmall = meta?.hideOnSmall;
                  return (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ width: header.getSize() }}
                      className={`${header.column.getCanSort() ? 'cursor-pointer select-none' : ''} ${hideOnSmall ? 'hidden xl:table-cell' : ''}`}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' && ' ↑'}
                        {header.column.getIsSorted() === 'desc' && ' ↓'}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-surface transition-colors">
                {row.getVisibleCells().map(cell => {
                  const meta = cell.column.columnDef.meta as any;
                  // Skip completely hidden columns
                  if (meta?.hidden) return null;
                  const hideOnSmall = meta?.hideOnSmall;
                  return (
                    <td key={cell.id} className={hideOnSmall ? 'hidden xl:table-cell' : ''}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Extra-Small Mobile (360-480px) - Minimal: Image + Name only */}
      <div className="xs:hidden md:hidden grid grid-cols-1 gap-2">
        {table.getRowModel().rows.map(row => {
          const card = row.original;
          const imgUrl = getThumbnailUrl(card);
          return (
            <a
              key={row.id}
              href={`/cards/${card.id}`}
              className="card-grid-item flex items-center gap-3 py-2"
            >
              <img
                src={imgUrl || PLACEHOLDER_IMAGE}
                alt={card.name || `Card #${card.id}`}
                className="w-10 h-10 rounded object-cover flex-shrink-0"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-sm">{card.name || `Card #${card.id}`}</div>
                <div className="flex items-center gap-1.5">
                  <AttributeIcon value={card.stats.attribute_name} size="sm" />
                  <TypeIcon value={card.stats.type_name} size="sm" />
                  <RarityStars value={card.stats.rarity} size="sm" />
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {/* Small-Medium Mobile (480-768px) - More detail */}
      <div className="hidden xs:grid md:hidden grid-cols-1 gap-3">
        {table.getRowModel().rows.map(row => {
          const card = row.original;
          const imgUrl = getThumbnailUrl(card);
          return (
            <a
              key={row.id}
              href={`/cards/${card.id}`}
              className="card-grid-item flex items-center gap-3"
            >
              <img
                src={imgUrl || PLACEHOLDER_IMAGE}
                alt={card.name || `Card #${card.id}`}
                className="w-12 h-12 rounded object-cover"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{card.name || `Card #${card.id}`}</div>
                <div className="flex items-center gap-2 text-sm">
                  <AttributeIcon value={card.stats.attribute_name} size="sm" />
                  <TypeIcon value={card.stats.type_name} size="sm" />
                  <RarityStars value={card.stats.rarity} size="sm" />
                </div>
                {card.skill && (
                  <div className="text-xs text-secondary truncate">{card.skill.name}</div>
                )}
              </div>
              <div className="text-right text-sm">
                <div>ATK: {formatNumber(card.stats.max_atk)}</div>
                <div className="text-secondary">HP: {formatNumber(card.stats.max_hp)}</div>
              </div>
            </a>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-secondary">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="btn-secondary px-3 py-1 touch-target disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="btn-secondary px-3 py-1 touch-target disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
