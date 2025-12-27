import { useState, useEffect } from 'react';
import type { Card } from '../../types/card';
import { getAndroidImageWithFallback, getPlaceholderMascot } from '../../lib/images';
import { decodeHtmlEntities } from '../../lib/security';
import CardHoverProvider from '../cards/CardHoverProvider';
import { getLocaleFromUrl, type SupportedLocale } from '../../lib/i18n';

// Tier data type
interface TierCardData {
  percentiles: {
    five_round: number;
    one_round: number;
    defense: number;
    individual: number;
    overall: number;
    reserve: number;
  };
  tiers: {
    five_round: string;
    one_round: string;
    defense: string;
    individual: string;
    overall: string;
    reserve: string;
  };
}

interface TierData {
  cards: Record<string, TierCardData>;
}

interface TeamBlockProps {
  cards: Record<string, Card>;
  skills?: Record<string, any>;
  tiers?: TierData | null;
}

interface TeamMember {
  cardId: string;
  required: boolean;
}

/**
 * Parse a team query string into structured team data
 * Format: req=id1,id2&opt=id3,id4
 */
function parseTeamQuery(query: string): TeamMember[] {
  if (!query) return [];

  const members: TeamMember[] = [];

  // Decode HTML entities using single-pass decoding to prevent double-decoding attacks
  const decoded = decodeHtmlEntities(query);

  const params = new URLSearchParams(decoded);

  // Required cards
  const reqIds = params.get('req');
  if (reqIds) {
    reqIds.split(',').forEach(id => {
      const trimmedId = id.trim();
      if (trimmedId) {
        members.push({ cardId: trimmedId, required: true });
      }
    });
  }

  // Optional cards
  const optIds = params.get('opt');
  if (optIds) {
    optIds.split(',').forEach(id => {
      const trimmedId = id.trim();
      if (trimmedId) {
        members.push({ cardId: trimmedId, required: false });
      }
    });
  }

  return members;
}

/**
 * TeamBlock - Hydrates all .team-block containers
 * Renders team compositions with required/optional markers and hover popups
 */
export default function TeamBlock({ cards, skills = {}, tiers = null }: TeamBlockProps) {
  const [locale] = useState<SupportedLocale>(getLocaleFromUrl);
  // Counter to trigger CardHoverProvider re-scan after DOM hydration
  const [hydrationKey, setHydrationKey] = useState(0);

  useEffect(() => {
    // Find all team block containers
    const containers = document.querySelectorAll<HTMLElement>('.team-block');
    if (containers.length === 0) return;

    let hydrated = false;

    containers.forEach((container) => {
      // Skip if already hydrated
      if (container.dataset.hydrated === 'true') return;
      container.dataset.hydrated = 'true';

      const mainQuery = container.dataset.teamMain;
      const reserveQuery = container.dataset.teamReserve;

      if (!mainQuery) return;

      const mainMembers = parseTeamQuery(mainQuery);
      const reserveMembers = reserveQuery ? parseTeamQuery(reserveQuery) : [];

      // Style container
      container.className = 'team-block my-6 p-4 rounded-lg border';
      container.style.borderColor = 'var(--color-border)';
      container.style.backgroundColor = 'var(--color-surface)';

      // Helper to create a team section
      const createTeamSection = (title: string, members: TeamMember[], isReserve: boolean) => {
        if (members.length === 0) return null;

        const section = document.createElement('div');
        section.className = isReserve ? 'mt-4 pt-4 border-t' : '';
        if (isReserve) {
          section.style.borderColor = 'var(--color-border)';
        }

        // Section title
        const titleEl = document.createElement('div');
        titleEl.className = 'text-sm font-medium mb-3 flex items-center gap-2';
        titleEl.innerHTML = `
          <span>${title}</span>
          <span class="text-xs text-secondary">(${members.length} card${members.length !== 1 ? 's' : ''})</span>
        `;
        section.appendChild(titleEl);

        // Cards grid
        const grid = document.createElement('div');
        grid.className = 'flex flex-wrap gap-3';
        section.appendChild(grid);

        members.forEach(member => {
          const card = cards[member.cardId];
          if (!card) {
            // Card not found - show placeholder
            const placeholder = document.createElement('div');
            placeholder.className = 'text-center opacity-50';
            placeholder.innerHTML = `
              <div class="w-14 h-14 rounded-full bg-gray-500/20 flex items-center justify-center mx-auto">
                <span class="text-xs">?</span>
              </div>
              <div class="text-[10px] mt-1 text-secondary">#${member.cardId}</div>
            `;
            grid.appendChild(placeholder);
            return;
          }

          // Card link wrapper
          const link = document.createElement('a');
          link.href = `/${locale}/cards/${card.id}`;
          link.className = 'team-member-card text-center group relative';
          link.dataset.cardId = card.id;

          // Image container (for badge positioning)
          const imgContainer = document.createElement('div');
          imgContainer.className = 'relative inline-block';

          // Card image
          const img = document.createElement('img');
          img.src = getAndroidImageWithFallback(card);
          img.alt = card.name || `Card #${card.id}`;
          img.className = `w-14 h-14 rounded-full mx-auto border-2 transition-colors ${
            member.required
              ? 'border-yellow-500 group-hover:border-yellow-400'
              : 'border-transparent group-hover:border-accent'
          }`;
          img.loading = 'lazy';
          img.onerror = () => { img.src = getPlaceholderMascot(); };
          imgContainer.appendChild(img);

          // Required badge
          if (member.required) {
            const badge = document.createElement('div');
            badge.className = 'absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center';
            badge.innerHTML = `
              <svg class="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            `;
            badge.title = 'Required';
            imgContainer.appendChild(badge);
          }

          link.appendChild(imgContainer);

          // Card name
          const name = document.createElement('div');
          name.className = 'text-[10px] truncate mt-1 text-secondary group-hover:text-primary transition-colors max-w-[60px]';
          name.textContent = card.name || `#${card.id}`;
          link.appendChild(name);

          grid.appendChild(link);
        });

        return section;
      };

      // Create main team section
      const mainSection = createTeamSection('Main Team', mainMembers, false);
      if (mainSection) {
        container.appendChild(mainSection);
      }

      // Create reserve section
      const reserveSection = createTeamSection('Reserve', reserveMembers, true);
      if (reserveSection) {
        container.appendChild(reserveSection);
      }

      // Add legend
      const legend = document.createElement('div');
      legend.className = 'mt-4 pt-3 border-t text-xs text-secondary flex items-center gap-4';
      legend.style.borderColor = 'var(--color-border)';
      legend.innerHTML = `
        <span class="flex items-center gap-1">
          <span class="w-3 h-3 rounded-full bg-yellow-500 inline-flex items-center justify-center">
            <svg class="w-2 h-2 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </span>
          Required
        </span>
        <span>Click/tap card to preview</span>
      `;
      container.appendChild(legend);

      hydrated = true;
    });

    // Trigger CardHoverProvider to re-scan for new elements
    if (hydrated) {
      setHydrationKey(k => k + 1);
    }
  }, [cards, locale]);

  // Use shared CardHoverProvider for hover/tap functionality
  return (
    <CardHoverProvider
      key={hydrationKey}
      cards={cards}
      skills={skills}
      tiers={tiers}
      selector=".team-member-card[data-card-id]"
      placement="top"
      compact={true}
    />
  );
}
