/**
 * Card Selector Component
 * Reusable searchable dropdown for selecting cards
 */

import { useState, useMemo, useEffect } from 'react';
import type { Card } from '../../types/card';
import { getAndroidImageWithFallback } from '../../lib/images';
import { getSkillsData } from '../../lib/cards';
import { formatSkillDescription } from '../../lib/formatters';

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
  // skills.json carries the ie/de templates the {value}/{probability} placeholders
  // need; cards.json only has the parsed battle numbers. getSkillsData caches, so
  // the seven selectors on the page share one fetch.
  const [skills, setSkills] = useState<Record<string, any>>({});
  useEffect(() => {
    getSkillsData().then((d) => setSkills(d.skills)).catch(() => {});
  }, []);

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
    <div className="mb-3 min-w-0">
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
      <div className="flex gap-2 min-w-0">
        {/* min-w-0: without it a flex item refuses to shrink below its content, and
            the longest option ("#550 - Ninetails Fox (5-star Phantasma)") sets the
            select's intrinsic width — which overflows a narrow column. */}
        <select
          value={selectedId || ''}
          onChange={(e) => onSelect(e.target.value || null)}
          className="flex-1 min-w-0 px-3 py-2 bg-surface border border-border rounded-lg text-primary text-sm"
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
            className="shrink-0 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-sm"
            title="Clear selection"
          >
            ✕
          </button>
        )}
      </div>
      {selectedCard && (
        <div className="mt-2 p-2 bg-surface-hover rounded-lg text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={getAndroidImageWithFallback(selectedCard)}
              alt={selectedCard.name || ''}
              className="w-10 h-10 shrink-0 rounded-full object-cover"
            />
            <div className="min-w-0">
              <div className="font-medium text-primary truncate">{selectedCard.name}</div>
              <div className="text-xs text-secondary">
                {selectedCard.stats.type_name} · {selectedCard.stats.attribute_name} · {selectedCard.stats.rarity}★
              </div>
            </div>
          </div>
          {selectedCard.skill && (
            <div className="mt-2">
              <div className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
                Skill: {selectedCard.skill.name}
              </div>
              <div
                className="text-xs text-secondary"
                dangerouslySetInnerHTML={{
                  __html: formatSkillDescription(
                    selectedCard.skill.description,
                    skills[selectedCard.skill.id],
                    selectedCard.stats.rarity
                  ),
                }}
              />
            </div>
          )}
          {selectedCard.abilities?.map((ability, idx) => (
            <div key={ability.id || idx} className="mt-2">
              <div className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
                Lv.{ability.unlock_level}: {ability.name}
              </div>
              <div
                className="text-xs text-secondary"
                dangerouslySetInnerHTML={{
                  __html: formatSkillDescription(ability.description, null, selectedCard.stats.rarity),
                }}
              />
            </div>
          ))}
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
