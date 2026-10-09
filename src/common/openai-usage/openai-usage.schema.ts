import { ObjectId } from 'mongodb';

export const OPENAI_USAGE_COLLECTION = 'openAiUsageLogs';
export const OPENAI_USAGE_DAILY_SUMMARY_COLLECTION = 'openAiUsageDailySummary';
export const OPENAI_USAGE_DAILY_MODEL_STATS_COLLECTION =
  'openAiUsageDailyModelStats';

export interface OpenAiUsageDoc {
  _id?: ObjectId;
  userId?: ObjectId | string;
  model: string;
  feature: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  createdAt: Date;
  updatedAt: Date;
}

// One document per (userId, date) — only totals, no embedded arrays
export interface OpenAiUsageDailySummaryDoc {
  _id?: ObjectId;
  userId?: ObjectId;
  date: string; // YYYY-MM-DD
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  createdAt: Date;
  updatedAt: Date;
}

// One document per (userId, date, model)
export interface OpenAiUsageDailyModelStatsDoc {
  _id?: ObjectId;
  userId?: ObjectId;
  date: string; // YYYY-MM-DD
  model: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  createdAt: Date;
  updatedAt: Date;
}
