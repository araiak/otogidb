/**
 * Types for the deployment validation system
 */

export interface ValidationConfig {
  baseUrl: string;
  sampleSize: {
    pages: number;
    images: number;
  };
  timeout: number;
  concurrency: number;
}

export interface CardData {
  version: string;
  total_cards: number;
  cloudinary_base_url: string;
  cards: Record<string, Card>;
}

export interface Card {
  id: string;
  asset_id: string;
  name: string;
  playable: boolean;
  image_urls?: {
    android?: string;
    hd?: string;
  };
}

export interface CloudflareDeployment {
  id: string;
  short_id: string;
  project_name: string;
  environment: string;
  url: string;
  latest_stage: {
    name: string;
    status: 'idle' | 'active' | 'canceled' | 'success' | 'failure';
  };
  deployment_trigger: {
    type: string;
    metadata: {
      branch: string;
      commit_hash: string;
    };
  };
  created_on: string;
}

export interface CloudflareDeploymentsResponse {
  result: CloudflareDeployment[];
  success: boolean;
  errors: unknown[];
  messages: unknown[];
}

export interface ValidationResult {
  url: string;
  status: 'pass' | 'fail' | 'error';
  statusCode?: number;
  error?: string;
  responseTime?: number;
}

export interface ValidationSummary {
  target: string;
  localeRedirects?: {
    total: number;
    passed: number;
    failed: number;
  };
  pages: {
    total: number;
    passed: number;
    failed: number;
    results: ValidationResult[];
  };
  images: {
    total: number;
    passed: number;
    failed: number;
    results: ValidationResult[];
  };
  success: boolean;
  duration: number;
}

export interface UrlSample {
  url: string;
  category: 'card' | 'list' | 'blog' | 'static' | 'image';
  locale?: string;
}

export const LOCALES = ['en', 'ja', 'ko', 'zh-cn', 'zh-tw', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
