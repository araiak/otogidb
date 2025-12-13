export interface CardStats {
  attribute: number;
  attribute_name: string; // Can include 'Divina', 'Anima', 'Phantasma', or 'Unknown(N)'
  type: number;
  type_name: string; // Can include 'Melee', 'Ranged', 'Healer', 'Assist'
  rarity: number; // Usually 1-5 but can have other values
  cost: number;
  max_level: number;
  speed: number;
  base_atk: number;
  max_atk: number;
  base_hp: number;
  max_hp: number;
  crit: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  unlock_level?: number;
  tags?: string[];
}

export interface ImagePaths {
  android: string | null;
  icons: string | null;
  sd: string | null;
  team: string | null;
  hd: string | null;
}

export interface ImageUrls {
  android: string | null;
  icons: string | null;
  sd: string | null;
  team: string | null;
  hd: string | null;
}

export interface Bond {
  id: string;
  target_id: string;
  type: string; // 'Attack', 'Skill', 'HP', etc.
  effect: string;
  bonus_percent: number;
  name: string;
}

export interface CardMeta {
  art_id: string | null;
  cv_id: string | null;
  album: boolean;
  generation: number;
  entanglement_ids: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: Record<string, { old: unknown; new: unknown }>;
}

export interface CardHistory {
  first_seen: string;
  first_seen_version: string;
  last_modified: string;
  last_modified_version: string;
  changelog: ChangelogEntry[];
}

export interface Card {
  id: string;
  asset_id: string;
  name: string | null;
  description: string | null;
  stats: CardStats;
  skill: Skill | null;
  abilities: Ability[];
  bonds: Bond[];
  images: ImagePaths;
  image_urls: ImageUrls;
  meta: CardMeta;
  history: CardHistory;
}

export interface CardsData {
  version: string;
  generated_at: string;
  total_cards: number;
  cloudinary_base_url: string;
  cards: Record<string, Card>;
}

// Change notes types
export interface ChangeSummary {
  new_cards: number;
  modified_cards: number;
  removed_cards: number;
  new_images: number;
  modified_images: number;
}

export interface ChangeNotes {
  version: string;
  previous_version: string;
  generated_at: string;
  summary: ChangeSummary;
  new_cards: Card[];
  modified_cards: Array<{
    card: Card;
    changes: Record<string, { old: unknown; new: unknown }>;
  }>;
  removed_cards: string[];
}
