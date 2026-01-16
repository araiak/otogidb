/**
 * Card Selector Component
 * Reusable searchable dropdown for selecting cards
 */

import { useState, useMemo } from 'react';
import type { Card } from '../../types/card';
import { getAndroidImageWithFallback } from '../../lib/images';

interface CardSelectorProps {
  cards: Card[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  label?: string;
  placeholder?: string;
  showClear?: boolean;
}

export function CardSelector({
  cards,
  selectedId,
  onSelect,
  label = 'Select Card',
  placeholder = 'Search by name or ID...',
  showClear = true,
}: CardSelectorProps) {
  const [search, setSearch] = useState('');

  const filteredCards = useMemo(() => {
    if (!search) return cards.slice(0, 50);
    const lower = search.toLowerCase();
    return cards.filter(c =>
      c.name?.toLowerCase().includes(lower) ||
      c.id.includes(lower)
    ).slice(0, 50);
  }, [cards, search]);

  const selectedCard = useMemo(() => {
    if (!selectedId) return null;
    return cards.find(c => c.id === selectedId) || null;
  }, [cards, selectedId]);

  return (
    <div className="mb-3">
      {label && (
        <label className="block text-sm text-secondary mb-1">{label}</label>
      )}
      <input
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-primary mb-2 text-sm"
      />
      <div className="flex gap-2">
        <select
          value={selectedId || ''}
          onChange={(e) => onSelect(e.target.value || null)}
          className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-primary text-sm"
        >
          <option value="">-- None --</option>
          {filteredCards.map(card => (
            <option key={card.id} value={card.id}>
              #{card.id} - {card.name} ({card.stats.rarity}★ {card.stats.attribute_name})
            </option>
          ))}
        </select>
        {showClear && selectedId && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-sm"
            title="Clear selection"
          >
            ✕
          </button>
        )}
      </div>
      {selectedCard && (
        <div className="mt-2 p-2 bg-surface-hover rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <img
              src={getAndroidImageWithFallback(selectedCard)}
              alt={selectedCard.name || ''}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <div className="font-medium text-primary">{selectedCard.name}</div>
              <div className="text-xs text-secondary">
                {selectedCard.stats.type_name} · {selectedCard.stats.attribute_name} · {selectedCard.stats.rarity}★
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Assist Selector - Card selector pre-filtered for assist cards
 */
interface AssistSelectorProps {
  assistCards: Card[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function AssistSelector({ assistCards, selectedId, onSelect }: AssistSelectorProps) {
  return (
    <CardSelector
      cards={assistCards}
      selectedId={selectedId}
      onSelect={onSelect}
      label="Assist Card"
      placeholder="Search assists..."
    />
  );
}
