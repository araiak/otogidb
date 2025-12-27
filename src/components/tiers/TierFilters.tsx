import { useState, useRef, useEffect } from 'react';
import type {
  TierMode,
  UnitType,
  Attribute,
  TierFilters,
} from '../../types/tiers';
import { UNIT_TYPE_NAMES, ATTRIBUTE_NAMES, TIER_MODE_NAMES } from '../../types/tiers';

interface TierFiltersProps {
  filters: TierFilters;
  onFiltersChange: (filters: TierFilters) => void;
  totalCards: number;
  version: string;
}

export default function TierFiltersComponent({
  filters,
  onFiltersChange,
  totalCards,
  version,
}: TierFiltersProps) {
  const updateFilter = <K extends keyof TierFilters>(key: K, value: TierFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="card p-4 space-y-4">
      {/* Search input */}
      <div>
        <label className="block text-xs text-secondary mb-2">Search Card</label>
        <div className="relative">
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            placeholder="Type card name to highlight..."
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          {filters.searchQuery && (
            <button
              onClick={() => updateFilter('searchQuery', '')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary hover:text-primary p-1"
              title="Clear search"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mode selection */}
      <div>
        <label className="block text-xs text-secondary mb-2">Test Mode</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TIER_MODE_NAMES) as TierMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => updateFilter('mode', mode)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                filters.mode === mode
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface border-border hover:bg-surface/80'
              }`}
            >
              {TIER_MODE_NAMES[mode]}
            </button>
          ))}
        </div>
      </div>

      {/* Role and Attribute filters */}
      <div className="flex flex-wrap gap-4">
        {/* Role filter */}
        <div>
          <label className="block text-xs text-secondary mb-2">Role</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateFilter('role', null)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                filters.role === null
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface border-border hover:bg-surface/80'
              }`}
            >
              All
            </button>
            {([1, 2, 3, 4] as UnitType[]).map((role) => (
              <button
                key={role}
                onClick={() => updateFilter('role', role)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  filters.role === role
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface border-border hover:bg-surface/80'
                }`}
              >
                {UNIT_TYPE_NAMES[role]}
              </button>
            ))}
          </div>
        </div>

        {/* Attribute filter */}
        <div>
          <label className="block text-xs text-secondary mb-2">Attribute</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateFilter('attribute', null)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                filters.attribute === null
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface border-border hover:bg-surface/80'
              }`}
            >
              All
            </button>
            {([1, 2, 3] as Attribute[]).map((attr) => (
              <button
                key={attr}
                onClick={() => updateFilter('attribute', attr)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  filters.attribute === attr
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface border-border hover:bg-surface/80'
                }`}
              >
                <span className={getAttributeColorClass(attr)}>
                  {ATTRIBUTE_NAMES[attr]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.grayUnavailable}
              onChange={(e) => updateFilter('grayUnavailable', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Gray out unavailable cards</span>
          </label>
        </div>

        <div className="text-xs text-secondary">
          {totalCards} cards | Data version: {version.slice(0, 7)}
        </div>
      </div>
    </div>
  );
}

function getAttributeColorClass(attr: Attribute): string {
  switch (attr) {
    case 1:
      return 'text-yellow-400'; // Divina
    case 2:
      return 'text-purple-400'; // Phantasma
    case 3:
      return 'text-green-400'; // Anima
    default:
      return '';
  }
}
