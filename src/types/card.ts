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
  synergy_partners?: string[]; // Card IDs that trigger this ability's team bonus
}

export interface ImageUrls {
  android: string | null;
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
  artist_name: string | null;
  artist_name_jp: string | null;
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

// Acquisition source types
export interface GachaBanner {
  start: string;
  end: string;
  pity: number;
  is_current: boolean;
}

export interface GachaAcquisition {
  in_standard_pool: boolean;
  featured_banners: GachaBanner[];
}

export interface ExchangeEntry {
  start: string;
  end: string;
  price: number;
  currency: string;
  limit: number;
  is_current: boolean;
}

export interface ExchangeAcquisition {
  entries: ExchangeEntry[];
}

export interface AuctionAcquisition {
  available: boolean;
  price_min: number | null;
  price_max: number | null;
  currency?: string; // 'gold' = Jewels, 'gApple' = Mochi
  is_time_limited?: boolean;
}

export interface EventRewardTier {
  tier: string;
  quantity: number;
  event_id: string;
  event_name?: string;
  is_current: boolean;
}

export interface EventAcquisition {
  reward_tiers: EventRewardTier[];
}

export interface DailyAcquisition {
  available: boolean;
  drop_rate: number | null;
  schedule: number[]; // Weekday numbers: 1=Mon, 2=Tue, ..., 7=Sun
  battle_id: string | null;
}

export type AcquisitionSource = 'gacha' | 'exchange' | 'auction' | 'event' | 'daily';

export interface CardAcquisition {
  sources: AcquisitionSource[];
  currently_available: boolean;
  availability_summary: string[]; // e.g., ['Standard Gacha', 'Auction']
  gacha: GachaAcquisition;
  exchange: ExchangeAcquisition;
  auction: AuctionAcquisition;
  event: EventAcquisition;
  daily?: DailyAcquisition;
}

export interface Card {
  id: string;
  asset_id: string;
  name: string | null;
  description: string | null;
  playable: boolean; // True for obtainable cards, False for NPC/enemy cards
  stats: CardStats;
  skill: Skill | null;
  abilities: Ability[];
  bonds: Bond[];
  synergies?: string[]; // Card IDs that trigger team bonus abilities
  image_urls: ImageUrls;
  meta: CardMeta;
  history: CardHistory;
  acquisition?: CardAcquisition; // Optional for backwards compatibility
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
