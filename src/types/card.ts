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

export interface ParsedSkillTarget {
  type: 'self' | 'self_ime' | 'team' | 'attribute' | 'ranked' | 'enemy' | 'current_target' | 'ally';
  count: number;
  attribute?: string;
  filter?: string;
}

export interface ParsedSkillEffect {
  type: string;
  value: number;
  scale?: number;
  duration?: number;  // Duration in seconds for buffs/debuffs/CC
}

export interface ParsedSkillImmediate {
  type: string;
  base: number;
  scale: number;
}

export interface ParsedSkill {
  target?: ParsedSkillTarget;
  effects?: ParsedSkillEffect[];
  immediate?: ParsedSkillImmediate;
  slv1?: number;    // Skill base damage at level 1
  slvup?: number;   // Skill damage increase per level
  ml?: number;      // Max skill level
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  parsed?: ParsedSkill;
  // Skill value fields for damage calculation
  slv1?: number;    // Skill value at level 1
  slvup?: number;   // Skill value increase per level
  ml?: number;      // Max skill level
  de?: string;      // Description template with {value} placeholder
}

export interface ParsedAbilityTarget {
  type: 'self' | 'self_ime' | 'team' | 'attribute' | 'ranked' | 'enemy' | 'current_target' | 'ally';
  count: number;
  attribute?: string;  // 'Divina' | 'Anima' | 'Phantasma'
  filter?: string;     // 'max_atk' | 'max_spd' | 'max_hp' for deterministic targeting
}

export interface ParsedAbilityEffect {
  stat: string;
  type: string;
  value: number;
  scale?: number;
  isPercent: boolean;
}

export interface ParsedAbility {
  target?: ParsedAbilityTarget;
  effects?: ParsedAbilityEffect[];
  trigger?: string;
  conditions?: string[];
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  unlock_level?: number;
  tags?: string[];
  synergy_partners?: string[]; // Card IDs that trigger this ability's team bonus
  stackable?: boolean; // true = stacks, false = once per team
  parsed?: ParsedAbility;
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

export interface AuctionEstimate {
  estimated_date: string; // ISO date format (YYYY-MM-DD)
  event_id: string;
  event_name: string;
  event_date: string;
  confidence: 'high' | 'medium' | 'low';
  note: string; // Explanation of estimation method
}

export interface AuctionAcquisition {
  available: boolean;
  currency?: string; // 'gold' = Jewels, 'gApple' = Mochi
  is_time_limited?: boolean;
  estimate?: AuctionEstimate; // Estimated auction date for un-auctioned event cards
}

export interface EventRewardTier {
  tier: string;
  quantity: number;
  event_id: string;
  event_name?: string;
  is_current: boolean;
}

export interface TowerDrop {
  event_id: string;
  event_name?: string;
  floors: number[];  // Tower floors where this card drops (e.g., [10, 20, 30])
  first_seen?: string;  // Date when this drop was first tracked
  is_current: boolean;
}

export interface DescriptionEvent {
  event_name: string;  // Event name extracted from card description [Event] tag
}

export interface EventAcquisition {
  reward_tiers: EventRewardTier[];
  tower_drops?: TowerDrop[];
  from_description?: DescriptionEvent[];  // Events linked via description text
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
  data_hash?: string;  // Content identity hash for delta versioning
  total_cards: number;
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
