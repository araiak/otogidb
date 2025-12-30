import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import type { Card, AcquisitionSource } from '../../types/card';
import { getCardsData, type CardLocale } from '../../lib/cards';
import { fetchWithCache } from '../../lib/cache';
import { getThumbnailUrl, PLACEHOLDER_IMAGE } from '../../lib/images';
import { formatNumber, formatSkillDescription } from '../../lib/formatters';
import Fuse from 'fuse.js';
import { AttributeIcon, TypeIcon, RarityStars } from './GameIcon';
import CardPreviewContent from './CardPreviewContent';
import TableSkeleton from './TableSkeleton';
import { FilterInfoTooltip, FilterDropdown, GroupedTagDropdown, type TagCategory } from './filters';
import { ImageCell } from './cells';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import {
  extractLocaleFromPath,
  getStoredLocale,
  LOCALE_STORAGE_KEY,
  type SupportedLocale
} from '../../lib/i18n';
import {
  sanitizeSearchQuery,
  parseAndValidateStringParam,
  parseAndValidateNumberParam,
  validateSortColumn,
  validateSortDirection,
  validateBooleanParam,
  ALLOWED_FILTER_VALUES,
} from '../../lib/security';

interface CardTableProps {
  initialCards?: Card[];
}

// Fuse.js configuration for search
const FUSE_OPTIONS = {
  keys: [
    { name: 'id', weight: 2 },
    { name: 'name', weight: 3 },
    { name: 'description', weight: 0.5 },
    { name: 'skill.name', weight: 2 },
    { name: 'skill.description', weight: 1 },
    { name: 'abilities.name', weight: 2 },
    { name: 'abilities.description', weight: 1 },
    { name: 'stats.attribute_name', weight: 1.5 },
    { name: 'stats.type_name', weight: 1.5 }
  ],
  threshold: 0.3,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2
};

export default function CardTable({ initialCards }: CardTableProps) {
  // Detect locale from URL path first, then fall back to stored preference
  const detectLocale = useCallback((): SupportedLocale => {
    if (typeof window === 'undefined') return 'en';

    // Check URL path first (e.g., /ja/cards/...)
    const pathLocale = extractLocaleFromPath(window.location.pathname);
    if (pathLocale !== 'en') return pathLocale;

    // Fall back to stored preference
    return getStoredLocale() || 'en';
  }, []);

  const [locale, setLocale] = useState<SupportedLocale>('en');

  // Lazy search index - only created when user starts searching
  const searchIndexRef = useRef<Fuse<Card> | null>(null);

  // Helper to generate locale-aware card URLs
  const getCardUrl = useCallback((cardId: string) => {
    return `/${locale}/cards/${cardId}`;
  }, [locale]);

  const [cards, setCards] = useState<Card[]>(initialCards || []);
  const [loading, setLoading] = useState(!initialCards);
  const [error, setError] = useState<string | null>(null);

  // Detect locale on mount
  useEffect(() => {
    setLocale(detectLocale());
  }, [detectLocale]);

  // Listen for locale changes (when user switches language)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCALE_STORAGE_KEY && e.newValue) {
        const newLocale = e.newValue as SupportedLocale;
        if (newLocale !== locale) {
          setLocale(newLocale);
        }
      }
    };

    // Also listen for custom event (for same-tab changes)
    const handleLocaleChange = (e: CustomEvent<{ locale: SupportedLocale }>) => {
      if (e.detail.locale !== locale) {
        setLocale(e.detail.locale);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('otogidb-locale-change' as any, handleLocaleChange as any);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('otogidb-locale-change' as any, handleLocaleChange as any);
    };
  }, [locale]);

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
  const [sourceFilter, setSourceFilter] = useState<string[]>([]); // Acquisition sources: gacha, auction, exchange, event
  const [availableOnly, setAvailableOnly] = useState(false); // Only show currently available cards
  const [hideNonPlayable, setHideNonPlayable] = useState(true); // Hide NPC/enemy cards by default

  // Track if we're initializing from URL to prevent double-updates
  const isInitializing = useRef(true);
  const [shareTooltip, setShareTooltip] = useState<string | null>(null);

  // Mobile preview state
  const [mobilePreviewCard, setMobilePreviewCard] = useState<Card | null>(null);
  const closeMobilePreview = useCallback(() => setMobilePreviewCard(null), []);
  const mobilePreviewRef = useFocusTrap<HTMLDivElement>({
    isActive: mobilePreviewCard !== null,
    onEscape: closeMobilePreview,
  });

  // Tier data state
  const [tierData, setTierData] = useState<Record<string, any> | null>(null);
  const [tierLoading, setTierLoading] = useState(true);
  const [tierError, setTierError] = useState(false);

  // Sort dropdown state
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [focusedSortIndex, setFocusedSortIndex] = useState(-1);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const sortOptionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Read URL params on mount with input validation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);

    // Search query - sanitize to prevent XSS
    const q = sanitizeSearchQuery(params.get('q'));
    if (q) setGlobalFilter(q);

    // Attribute filter - validate against allowed values
    const attrValues = parseAndValidateStringParam(params.get('attr'), ALLOWED_FILTER_VALUES.attributes);
    if (attrValues.length > 0) setAttributeFilter(attrValues);

    // Type filter - validate against allowed values
    const typeValues = parseAndValidateStringParam(params.get('type'), ALLOWED_FILTER_VALUES.types);
    if (typeValues.length > 0) setTypeFilter(typeValues);

    // Rarity filter - validate against allowed values
    const rarityValues = parseAndValidateNumberParam(params.get('rarity'), ALLOWED_FILTER_VALUES.rarities);
    if (rarityValues.length > 0) setRarityFilter(rarityValues);

    // Bond filter - validate against allowed values
    const bondValues = parseAndValidateStringParam(params.get('bond'), ALLOWED_FILTER_VALUES.bonds);
    if (bondValues.length > 0) setBondFilter(bondValues);

    // Skill tag filter - sanitize each value (dynamic tags from data)
    const skill = params.get('skill');
    if (skill) {
      const skillTags = skill.split(',')
        .map(s => s.trim().slice(0, 50))
        .filter(s => s && /^[a-zA-Z0-9\s]+$/.test(s));
      if (skillTags.length > 0) setSkillTagFilter(skillTags);
    }

    // Ability tag filter - sanitize each value (dynamic tags from data)
    const ability = params.get('ability');
    if (ability) {
      const abilityTags = ability.split(',')
        .map(s => s.trim().slice(0, 50))
        .filter(s => s && /^[a-zA-Z0-9\s]+$/.test(s));
      if (abilityTags.length > 0) setAbilityTagFilter(abilityTags);
    }

    // Source filter - validate against allowed values
    const sourceValues = parseAndValidateStringParam(params.get('source'), ALLOWED_FILTER_VALUES.sources);
    if (sourceValues.length > 0) setSourceFilter(sourceValues);

    // Available only filter - validate boolean
    if (validateBooleanParam(params.get('available'))) {
      setAvailableOnly(true);
    }

    // Sorting - validate column and direction
    const sortColumn = validateSortColumn(params.get('sort'));
    const sortDir = validateSortDirection(params.get('dir'));
    if (sortColumn) {
      setSorting([{ id: sortColumn, desc: sortDir === 'desc' }]);
    }

    // Playable filter - validate boolean
    if (validateBooleanParam(params.get('npc'))) {
      setHideNonPlayable(false);
    }

    // Mark initialization complete after a tick
    setTimeout(() => {
      isInitializing.current = false;
    }, 100);
  }, []);

  // Update URL when filters change (debounced to reduce history API calls)
  useEffect(() => {
    if (typeof window === 'undefined' || isInitializing.current) return;

    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();

      if (globalFilter) params.set('q', globalFilter);
      if (attributeFilter.length > 0) params.set('attr', attributeFilter.join(','));
      if (typeFilter.length > 0) params.set('type', typeFilter.join(','));
      if (rarityFilter.length > 0) params.set('rarity', rarityFilter.join(','));
      if (bondFilter.length > 0) params.set('bond', bondFilter.join(','));
      if (skillTagFilter.length > 0) params.set('skill', skillTagFilter.join(','));
      if (abilityTagFilter.length > 0) params.set('ability', abilityTagFilter.join(','));
      if (sourceFilter.length > 0) params.set('source', sourceFilter.join(','));
      if (availableOnly) params.set('available', '1');
      if (sorting.length > 0) {
        params.set('sort', sorting[0].id);
        params.set('dir', sorting[0].desc ? 'desc' : 'asc');
      }
      if (!hideNonPlayable) params.set('npc', '1');

      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;

      window.history.replaceState({}, '', newUrl);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [globalFilter, attributeFilter, typeFilter, rarityFilter, bondFilter, skillTagFilter, abilityTagFilter, sourceFilter, availableOnly, sorting, hideNonPlayable]);

  // Load tier data on mount (uses IndexedDB cache with hashed path for cache busting)
  // Tier list is currently disabled - skip loading silently
  const loadTierData = useCallback(async () => {
    // Check if tiers are enabled in data paths
    const dataPaths = (window as any).OTOGIDB_DATA_PATHS || {};
    if (!dataPaths.tiers) {
      // Tiers disabled - skip loading silently
      setTierLoading(false);
      return;
    }

    setTierLoading(true);
    setTierError(false);
    try {
      const tiersPath = dataPaths.tiers.path || '/data/tiers.json';
      const data = await fetchWithCache<{ cards: Record<string, any> }>(tiersPath);
      if (data?.cards) {
        setTierData(data.cards);
      }
    } catch {
      setTierError(true);
    } finally {
      setTierLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTierData();
  }, [loadTierData]);

  // Close mobile preview when clicking outside
  useEffect(() => {
    if (!mobilePreviewCard) return;

    function handleClickOutside(event: MouseEvent) {
      if (mobilePreviewRef.current && !mobilePreviewRef.current.contains(event.target as Node)) {
        closeMobilePreview();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobilePreviewCard, closeMobilePreview]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    if (!sortDropdownOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sortDropdownOpen]);

  // Sortable column options for the dropdown
  const sortableColumns = useMemo(() => [
    { id: 'id', label: 'ID' },
    { id: 'name', label: 'Name' },
    { id: 'max_atk', label: 'ATK' },
    { id: 'max_hp', label: 'HP' },
    { id: 'speed', label: 'Speed' },
    { id: 'rarity', label: 'Rarity' },
    { id: 'attribute', label: 'Attribute' },
    { id: 'type', label: 'Type' },
  ], []);

  // Get current sort info for display
  const currentSort = useMemo(() => {
    if (sorting.length === 0) return { column: null, label: 'Default', desc: false };
    const col = sortableColumns.find(c => c.id === sorting[0].id);
    return {
      column: sorting[0].id,
      label: col?.label || sorting[0].id,
      desc: sorting[0].desc
    };
  }, [sorting, sortableColumns]);

  // Handle sort selection
  const handleSortSelect = useCallback((columnId: string) => {
    if (sorting.length > 0 && sorting[0].id === columnId) {
      // Same column - toggle direction
      setSorting([{ id: columnId, desc: !sorting[0].desc }]);
    } else {
      // Different column - default to descending for stats/ID (newer cards first), ascending for text
      const defaultDescending = ['id', 'max_atk', 'max_hp', 'speed', 'rarity'].includes(columnId);
      setSorting([{ id: columnId, desc: defaultDescending }]);
    }
    setSortDropdownOpen(false);
  }, [sorting]);

  // Clear sort
  const handleClearSort = useCallback(() => {
    setSorting([]);
    setSortDropdownOpen(false);
  }, []);

  // Reset focused sort index when dropdown opens/closes
  useEffect(() => {
    if (sortDropdownOpen) {
      setFocusedSortIndex(0);
    } else {
      setFocusedSortIndex(-1);
    }
  }, [sortDropdownOpen]);

  // Focus sort option when index changes
  useEffect(() => {
    if (sortDropdownOpen && focusedSortIndex >= 0 && sortOptionRefs.current[focusedSortIndex]) {
      sortOptionRefs.current[focusedSortIndex]?.focus();
    }
  }, [focusedSortIndex, sortDropdownOpen]);

  // Keyboard handler for sort dropdown
  const handleSortKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!sortDropdownOpen) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setSortDropdownOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setSortDropdownOpen(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        setFocusedSortIndex(prev => Math.min(prev + 1, sortableColumns.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedSortIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedSortIndex >= 0 && focusedSortIndex < sortableColumns.length) {
          handleSortSelect(sortableColumns[focusedSortIndex].id);
        }
        break;
      case 'Home':
        event.preventDefault();
        setFocusedSortIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedSortIndex(sortableColumns.length - 1);
        break;
    }
  }, [sortDropdownOpen, focusedSortIndex, sortableColumns, handleSortSelect]);

  // Copy share link to clipboard
  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareTooltip('Link copied!');
      setTimeout(() => setShareTooltip(null), 2000);
    } catch {
      setShareTooltip('Failed to copy');
      setTimeout(() => setShareTooltip(null), 2000);
    }
  }, []);

  // Load cards - reload when locale changes
  // Note: skills.json is NOT loaded at runtime - skill descriptions in cards_index.json
  // are pre-calculated at build time with {value}, {probability}, {delay1} substituted
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const cardsData = initialCards
          ? { cards: Object.fromEntries(initialCards.map(c => [c.id, c])) }
          : await getCardsData({ locale: locale as CardLocale });

        if (!initialCards) {
          const cardList = Object.values(cardsData.cards);
          setCards(cardList);
          // Clear search index when cards change - will be rebuilt lazily on first search
          searchIndexRef.current = null;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cards');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [initialCards, locale]);

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
    if (sourceFilter.length > 0) {
      filters.push({ id: 'sources', value: sourceFilter });
    }
    if (availableOnly) {
      filters.push({ id: 'available', value: true });
    }
    if (hideNonPlayable) {
      filters.push({ id: 'playable', value: true });
    }
    setColumnFilters(filters);
  }, [attributeFilter, typeFilter, rarityFilter, bondFilter, skillTagFilter, abilityTagFilter, sourceFilter, availableOnly, hideNonPlayable]);

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
    const abilityTagOrder = ['DMG Boost', 'Crit Rate', 'Crit DMG', 'ATK Speed', 'Skill DMG', 'Max HP', 'DMG Reduction', 'Lifesteal', 'Heal', 'Slow', 'DMG Amp', 'Enemy DMG Down', 'Stun', 'Poison', 'Burn', 'Freeze', 'Sleep', 'Silence', 'Paralysis', 'Petrify', 'Immunity', 'Team', 'Divina', 'Anima', 'Phantasma', 'Melee', 'Ranged', 'Healer', 'Leader', 'Wave Start', 'Final Wave', 'Drop Rate', 'Time Limit', 'EXP Boost', 'Soulstone Boost'];
    const sortedAbilityTags = Array.from(abilityTags).sort((a, b) => {
      const aIndex = abilityTagOrder.indexOf(a);
      const bIndex = abilityTagOrder.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });

    // Collect acquisition sources
    const sources = new Set<string>();
    cards.forEach(card => {
      if (card.acquisition?.sources) {
        card.acquisition.sources.forEach(s => sources.add(s));
      }
    });
    // Define source order
    const sourceOrder = ['gacha', 'auction', 'exchange', 'event', 'daily'];
    const sortedSources = Array.from(sources).sort((a, b) => {
      const aIndex = sourceOrder.indexOf(a);
      const bIndex = sourceOrder.indexOf(b);
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
      sources: sortedSources,
    };
  }, [cards]);

  // Build skill tag categories for grouped dropdown
  const skillTagCategories = useMemo<TagCategory[]>(() => {
    const available = new Set(filterOptions.skillTags);
    return [
      {
        name: 'Effect',
        tags: ['DMG', 'Heal', 'DMG Boost', 'Debuff'].filter(t => available.has(t)),
        colorClass: 'text-yellow-500'
      },
      {
        name: 'Target',
        tags: ['Self', 'Single', 'Multi', 'AoE'].filter(t => available.has(t)),
        colorClass: 'text-blue-600 dark:text-blue-400'
      },
      {
        name: 'Status',
        tags: ['Stun', 'Poison', 'Burn', 'Freeze', 'Sleep', 'Silence', 'Paralysis', 'Petrify'].filter(t => available.has(t)),
        colorClass: 'text-red-600 dark:text-red-400'
      },
      {
        name: 'Buffs',
        tags: ['DEF Up', 'Speed Up', 'Crit Rate', 'DMG Reduction', 'Cleanse'].filter(t => available.has(t)),
        colorClass: 'text-green-600 dark:text-green-400'
      },
      {
        name: 'Debuffs',
        tags: ['Slow', 'DEF Down', 'DMG Up', 'DMG Down', 'Dispel'].filter(t => available.has(t)),
        colorClass: 'text-purple-600 dark:text-purple-400'
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
        tags: ['Max HP', 'DMG Reduction', 'Lifesteal', 'Heal', 'Immunity', 'Counter'].filter(t => available.has(t)),
        colorClass: 'text-green-600 dark:text-green-400'
      },
      {
        name: 'Debuffs',
        tags: ['Slow', 'DMG Amp', 'Enemy DMG Down'].filter(t => available.has(t)),
        colorClass: 'text-purple-600 dark:text-purple-400'
      },
      {
        name: 'Status',
        tags: ['Stun', 'Poison', 'Burn', 'Freeze', 'Sleep', 'Silence', 'Paralysis', 'Petrify'].filter(t => available.has(t)),
        colorClass: 'text-red-600 dark:text-red-400'
      },
      {
        name: 'Target',
        tags: ['Self', 'Single', 'Multi', 'AoE', 'Team'].filter(t => available.has(t)),
        colorClass: 'text-blue-600 dark:text-blue-400'
      },
      {
        name: 'Scope',
        tags: ['Divina', 'Anima', 'Phantasma', 'Neutral', 'Melee', 'Ranged', 'Leader'].filter(t => available.has(t)),
        colorClass: 'text-teal-600 dark:text-teal-400'
      },
      {
        name: 'Timing',
        tags: ['Wave Start', 'Final Wave', 'On Skill', 'On Attack', 'Conditional'].filter(t => available.has(t)),
        colorClass: 'text-orange-400'
      },
      {
        name: 'Special',
        tags: ['Drop Rate', 'Time Limit', 'EXP Boost', 'Soulstone Boost', 'Level Boost'].filter(t => available.has(t)),
        colorClass: 'text-cyan-400'
      },
    ];
  }, [filterOptions.abilityTags]);

  // Filter data based on global search - lazily creates search index on first search
  const filteredData = useMemo(() => {
    if (!globalFilter.trim()) return cards;

    // Lazily create search index on first search
    if (!searchIndexRef.current && cards.length > 0) {
      searchIndexRef.current = new Fuse(cards, FUSE_OPTIONS);
    }

    if (!searchIndexRef.current) return cards;

    const results = searchIndexRef.current.search(globalFilter);
    return results.map(result => result.item);
  }, [cards, globalFilter]);

  // Column definitions
  const columns = useMemo<ColumnDef<Card>[]>(() => [
    {
      id: 'image',
      header: '',
      size: 50,
      enableSorting: false,
      cell: ({ row }) => <ImageCell card={row.original} skills={{}} tierData={tierData?.[row.original.id]} locale={locale} />,
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
  ], [locale, tierData]);

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

  // Loading state - use skeleton loader for better UX
  if (loading) {
    return <TableSkeleton rows={10} />;
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
        <div>
          <label htmlFor="card-search" className="sr-only">Search cards</label>
          <input
            id="card-search"
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search cards..."
            className="w-full px-4 py-2 rounded-md border bg-primary"
            style={{ borderColor: 'var(--color-border)' }}
          />
        </div>

        {/* Filter Dropdowns - wrap on small screens */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-secondary hidden sm:inline">Filters:</span>

          {/* Sort Dropdown */}
          <div className="relative" ref={sortDropdownRef} onKeyDown={handleSortKeyDown}>
            <button
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded border cursor-pointer hover:bg-surface transition-colors"
              style={{ borderColor: sorting.length > 0 ? 'var(--color-accent)' : 'var(--color-border)' }}
              aria-expanded={sortDropdownOpen}
              aria-haspopup="listbox"
            >
              <span>Sort: {currentSort.label}</span>
              {sorting.length > 0 && (
                <span className="text-accent">{currentSort.desc ? '↓' : '↑'}</span>
              )}
              <svg className="w-3 h-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {sortDropdownOpen && (
              <div
                className="absolute z-50 mt-1 p-1 rounded-md shadow-lg border bg-primary min-w-[140px]"
                style={{ borderColor: 'var(--color-border)' }}
                role="listbox"
              >
                {sorting.length > 0 && (
                  <>
                    <button
                      onClick={handleClearSort}
                      className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface transition-colors text-secondary"
                    >
                      Clear sort
                    </button>
                    <div className="border-b my-1" style={{ borderColor: 'var(--color-border)' }} />
                  </>
                )}
                {sortableColumns.map((col, index) => (
                  <button
                    key={col.id}
                    ref={el => { sortOptionRefs.current[index] = el; }}
                    onClick={() => handleSortSelect(col.id)}
                    tabIndex={focusedSortIndex === index ? 0 : -1}
                    role="option"
                    aria-selected={currentSort.column === col.id}
                    onMouseEnter={() => setFocusedSortIndex(index)}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors flex items-center justify-between outline-none ${
                      currentSort.column === col.id ? 'text-accent font-medium' : ''
                    } ${focusedSortIndex === index ? 'bg-surface ring-2 ring-accent' : 'hover:bg-surface'}`}
                  >
                    <span>{col.label}</span>
                    {currentSort.column === col.id && (
                      <span>{currentSort.desc ? '↓' : '↑'}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border cursor-pointer hover:bg-surface transition-colors"
                 style={{ borderColor: hideNonPlayable ? 'var(--color-accent)' : 'var(--color-border)' }}>
            <input
              type="checkbox"
              checked={hideNonPlayable}
              onChange={(e) => setHideNonPlayable(e.target.checked)}
              className="rounded"
            />
            <span>Hide NPCs</span>
          </label>
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
              const colorClass = opt === 'Attack' ? 'text-red-600 dark:text-red-400' :
                                opt === 'Skill' ? 'text-blue-600 dark:text-blue-400' :
                                opt === 'HP' ? 'text-green-600 dark:text-green-400' : '';
              return <span className={`text-sm font-medium ${colorClass}`}>{opt}</span>;
            }}
          />
          <GroupedTagDropdown
            categories={skillTagCategories}
            value={skillTagFilter}
            onChange={setSkillTagFilter}
            placeholder="Skill Tags"
          />
          <div className="flex items-center">
            <GroupedTagDropdown
              categories={abilityTagCategories}
              value={abilityTagFilter}
              onChange={setAbilityTagFilter}
              placeholder="Ability Tags"
            />
            <FilterInfoTooltip text="Ability Tags: Finds cards where one ability has all selected tags." />
          </div>
          <FilterDropdown
            options={filterOptions.sources}
            value={sourceFilter}
            onChange={(v) => setSourceFilter(v as string[])}
            placeholder="Source"
            dropdownClassName="min-w-[130px]"
            renderOption={(opt) => {
              const label = opt === 'gacha' ? 'Gacha' :
                           opt === 'auction' ? 'Auction' :
                           opt === 'exchange' ? 'Exchange' :
                           opt === 'event' ? 'Event' :
                           opt === 'daily' ? 'Daily Dungeon' : String(opt);
              const colorClass = opt === 'gacha' ? 'text-purple-600 dark:text-purple-400' :
                                opt === 'auction' ? 'text-yellow-600 dark:text-yellow-400' :
                                opt === 'exchange' ? 'text-blue-600 dark:text-blue-400' :
                                opt === 'event' ? 'text-green-600 dark:text-green-400' :
                                opt === 'daily' ? 'text-cyan-600 dark:text-cyan-400' : '';
              return <span className={`text-sm font-medium ${colorClass}`}>{label}</span>;
            }}
          />
          <div className="flex items-center">
            <label className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border cursor-pointer hover:bg-surface transition-colors"
                   style={{ borderColor: availableOnly ? 'var(--color-accent)' : 'var(--color-border)' }}>
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="rounded"
              />
              <span>Available Now</span>
            </label>
            <FilterInfoTooltip text="Available Now: Some cards are day-limited or may be out of stock." />
          </div>
        </div>
      </div>

      {/* Tier data loading/error notice */}
      {tierLoading && (
        <div className="flex items-center gap-2 text-sm text-secondary">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading tier data...</span>
        </div>
      )}
      {tierError && !tierLoading && (
        <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Tier data unavailable</span>
          <button
            onClick={loadTierData}
            className="underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results count and actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-secondary">
        <div aria-live="polite" aria-atomic="true">
          Showing {table.getRowModel().rows.length} of {cards.length} cards
          {(attributeFilter.length > 0 || typeFilter.length > 0 || rarityFilter.length > 0 || bondFilter.length > 0 || skillTagFilter.length > 0 || abilityTagFilter.length > 0 || sourceFilter.length > 0 || availableOnly || !hideNonPlayable) && (
            <button
              onClick={() => {
                setAttributeFilter([]);
                setTypeFilter([]);
                setRarityFilter([]);
                setBondFilter([]);
                setSkillTagFilter([]);
                setAbilityTagFilter([]);
                setSourceFilter([]);
                setAvailableOnly(false);
                setHideNonPlayable(true);
              }}
              className="ml-2 text-accent hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Share button */}
        {(globalFilter || attributeFilter.length > 0 || typeFilter.length > 0 || rarityFilter.length > 0 || bondFilter.length > 0 || skillTagFilter.length > 0 || abilityTagFilter.length > 0 || sourceFilter.length > 0 || availableOnly || sorting.length > 0 || !hideNonPlayable) && (
          <div className="relative">
            <button
              onClick={handleShare}
              className="btn-secondary text-xs px-2 py-1 rounded inline-flex items-center gap-1"
              title="Copy link to current view"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
            {shareTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs rounded whitespace-nowrap"
                   style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                {shareTooltip}
              </div>
            )}
          </div>
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
                      scope="col"
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
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.filter(c => !(c.meta as any)?.hidden).length} className="text-center py-8">
                  <div className="text-secondary">
                    <p className="text-lg font-medium">No cards found</p>
                    <p className="text-sm mt-1">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Empty State */}
      {table.getRowModel().rows.length === 0 && (
        <div className="md:hidden text-center py-8">
          <div className="text-secondary">
            <p className="text-lg font-medium">No cards found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        </div>
      )}

      {/* Extra-Small Mobile (360-480px) - Minimal: Image + Name only */}
      <div className="xs:hidden md:hidden grid grid-cols-1 gap-2">
        {table.getRowModel().rows.map(row => {
          const card = row.original;
          const imgUrl = getThumbnailUrl(card);
          return (
            <div key={row.id} className="card-grid-item flex items-center gap-3 py-2">
              <a href={getCardUrl(card.id)} className="flex-shrink-0">
                <img
                  src={imgUrl || PLACEHOLDER_IMAGE}
                  alt={card.name || `Card #${card.id}`}
                  className="w-10 h-10 rounded object-cover"
                  loading="lazy"
                />
              </a>
              <a href={getCardUrl(card.id)} className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium truncate text-sm">{card.name || `Card #${card.id}`}</span>
                  {!card.playable && (
                    <span className="px-1 py-0.5 text-[10px] rounded bg-orange-500/20 text-orange-400 font-medium flex-shrink-0">NPC</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <AttributeIcon value={card.stats.attribute_name} size="sm" />
                  <TypeIcon value={card.stats.type_name} size="sm" />
                  <RarityStars value={card.stats.rarity} size="sm" />
                </div>
              </a>
              <button
                onClick={() => setMobilePreviewCard(card)}
                className="p-2 rounded-full flex-shrink-0 touch-target"
                style={{ backgroundColor: 'var(--color-surface)' }}
                aria-label="Preview card"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Small-Medium Mobile (480-768px) - More detail */}
      <div className="hidden xs:grid md:hidden grid-cols-1 gap-3">
        {table.getRowModel().rows.map(row => {
          const card = row.original;
          const imgUrl = getThumbnailUrl(card);
          return (
            <div key={row.id} className="card-grid-item flex items-center gap-3">
              <a href={getCardUrl(card.id)} className="flex-shrink-0">
                <img
                  src={imgUrl || PLACEHOLDER_IMAGE}
                  alt={card.name || `Card #${card.id}`}
                  className="w-12 h-12 rounded object-cover"
                  loading="lazy"
                />
              </a>
              <a href={getCardUrl(card.id)} className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium truncate">{card.name || `Card #${card.id}`}</span>
                  {!card.playable && (
                    <span className="px-1 py-0.5 text-[10px] rounded bg-orange-500/20 text-orange-400 font-medium flex-shrink-0">NPC</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AttributeIcon value={card.stats.attribute_name} size="sm" />
                  <TypeIcon value={card.stats.type_name} size="sm" />
                  <RarityStars value={card.stats.rarity} size="sm" />
                </div>
                {card.skill && (
                  <div className="text-xs text-secondary truncate">{card.skill.name}</div>
                )}
              </a>
              <div className="text-right text-sm mr-2">
                <div>ATK: {formatNumber(card.stats.max_atk)}</div>
                <div className="text-secondary">HP: {formatNumber(card.stats.max_hp)}</div>
              </div>
              <button
                onClick={() => setMobilePreviewCard(card)}
                className="p-2 rounded-full flex-shrink-0 touch-target"
                style={{ backgroundColor: 'var(--color-surface)' }}
                aria-label="Preview card"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
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

      {/* Mobile Preview Modal */}
      {mobilePreviewCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-preview-title"
        >
          <div
            ref={mobilePreviewRef}
            className="w-full max-w-sm rounded-lg shadow-xl overflow-hidden"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2 min-w-0">
                <h3 id="mobile-preview-title" className="font-bold truncate">{mobilePreviewCard.name || `Card #${mobilePreviewCard.id}`}</h3>
                {!mobilePreviewCard.playable && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-orange-500/20 text-orange-400 font-medium flex-shrink-0">NPC</span>
                )}
              </div>
              <button
                onClick={closeMobilePreview}
                className="p-1 rounded"
                aria-label="Close preview"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content - using shared CardPreviewContent */}
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <CardPreviewContent
                card={mobilePreviewCard}
                skills={{}}
                tierData={tierData?.[mobilePreviewCard.id]}
                compact={false}
                showDetailsLink={true}
                locale={locale}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
