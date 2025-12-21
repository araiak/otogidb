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
  is_skipped: boolean;
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

export interface ValidationCategorySummary {
  total: number;
  passed: number;
  failed: number;
}

export interface ValidationSummary {
  target: string;
  localeRedirects?: ValidationCategorySummary;
  pages: ValidationCategorySummary & { results: ValidationResult[] };
  htmlChecks?: ValidationCategorySummary;
  jsBundles?: ValidationCategorySummary;
  linkChecks?: ValidationCategorySummary;
  images: ValidationCategorySummary & { results: ValidationResult[] };
  // New validation categories
  seoChecks?: ValidationCategorySummary;
  accessibilityChecks?: ValidationCategorySummary;
  apiEndpoints?: ValidationCategorySummary;
  performanceChecks?: ValidationCategorySummary & { warned: number };
  errorPages?: ValidationCategorySummary;
  // Success tracking
  success: boolean;
  hardFailures: number;
  softFailures: number;
  duration: number;
}

export interface UrlSample {
  url: string;
  category: 'card' | 'list' | 'blog' | 'static' | 'image';
  locale?: string;
}

export const LOCALES = ['en', 'ja', 'ko', 'zh-cn', 'zh-tw', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
