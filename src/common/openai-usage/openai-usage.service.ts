import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Db, ObjectId } from 'mongodb';
import { MONGODB } from '../mongo/mongo.module';
import {
  OPENAI_USAGE_COLLECTION,
  OPENAI_USAGE_DAILY_MODEL_STATS_COLLECTION,
  OPENAI_USAGE_DAILY_SUMMARY_COLLECTION,
  OpenAiUsageDailyModelStatsDoc,
  OpenAiUsageDailySummaryDoc,
  OpenAiUsageDoc,
} from './openai-usage.schema';

interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

const PRICING: Record<string, ModelPricing> = {
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'gpt-5-mini': { inputPerMillion: 1.1, outputPerMillion: 4.4 },
  'text-embedding-ada-002': { inputPerMillion: 0.1, outputPerMillion: 0.0 },
};

@Injectable()
export class OpenAiUsageService implements OnModuleInit {
  private readonly logger = new Logger(OpenAiUsageService.name);

  constructor(@Inject(MONGODB) private db: Db) {}

  async onModuleInit() {
    await Promise.all([
      this.db
        .collection(OPENAI_USAGE_COLLECTION)
        .createIndex({ userId: 1, createdAt: -1 }),
      this.db
        .collection(OPENAI_USAGE_DAILY_SUMMARY_COLLECTION)
        .createIndex({ userId: 1, date: 1 }, { unique: true }),
      this.db
        .collection(OPENAI_USAGE_DAILY_MODEL_STATS_COLLECTION)
        .createIndex({ userId: 1, date: 1, model: 1 }, { unique: true }),
    ]).catch((err) => this.logger.error('Failed to create usage indexes', err));
  }

  private resolveUserId(userId?: string | ObjectId): ObjectId | undefined {
    if (!userId) return undefined;
    if (userId instanceof ObjectId) return userId;
    return ObjectId.isValid(userId) ? new ObjectId(userId) : undefined;
  }

  private toDateString(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  track(params: {
    userId?: string | ObjectId;
    model: string;
    feature: string;
    inputTokens: number;
    outputTokens: number;
  }): void {
    const { model, feature, inputTokens, outputTokens } = params;
    const resolvedUserId = this.resolveUserId(params.userId);
    const pricing = PRICING[model] ?? {
      inputPerMillion: 0,
      outputPerMillion: 0,
    };
    const totalTokens = inputTokens + outputTokens;
    const costUsd =
      (inputTokens / 1_000_000) * pricing.inputPerMillion +
      (outputTokens / 1_000_000) * pricing.outputPerMillion;
    const now = new Date();
    const date = this.toDateString(now);

    // 1 — per-request log
    const doc: OpenAiUsageDoc = {
      model,
      feature,
      inputTokens,
      outputTokens,
      totalTokens,
      costUsd,
      createdAt: now,
      updatedAt: now,
    };
    if (resolvedUserId) doc.userId = resolvedUserId;

    this.db
      .collection<OpenAiUsageDoc>(OPENAI_USAGE_COLLECTION)
      .insertOne(doc)
      .catch((err) => this.logger.error('Failed to insert usage log', err));

    // 2 — daily summary totals
    const summaryFilter: any = { date };
    if (resolvedUserId) summaryFilter.userId = resolvedUserId;

    this.db
      .collection<OpenAiUsageDailySummaryDoc>(
        OPENAI_USAGE_DAILY_SUMMARY_COLLECTION,
      )
      .updateOne(
        summaryFilter,
        {
          $inc: {
            totalRequests: 1,
            totalInputTokens: inputTokens,
            totalOutputTokens: outputTokens,
            totalTokens: totalTokens,
            totalCostUsd: costUsd,
          },
          $set: { updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      )
      .catch((err) => this.logger.error('Failed to upsert daily summary', err));

    // 3 — daily per-model breakdown
    const modelFilter: any = { date, model };
    if (resolvedUserId) modelFilter.userId = resolvedUserId;

    this.db
      .collection<OpenAiUsageDailyModelStatsDoc>(
        OPENAI_USAGE_DAILY_MODEL_STATS_COLLECTION,
      )
      .updateOne(
        modelFilter,
        {
          $inc: {
            requests: 1,
            inputTokens: inputTokens,
            outputTokens: outputTokens,
            costUsd: costUsd,
          },
          $set: { updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      )
      .catch((err) =>
        this.logger.error('Failed to upsert daily model stats', err),
      );
  }

  async getDailySummary(
    userId: string,
    date: string,
  ): Promise<{
    userId: string;
    date: string;
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    totalCostUsd: number;
    modelBreakdown: Record<
      string,
      {
        requests: number;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        costUsd: number;
      }
    >;
  } | null> {
    const resolvedUserId = this.resolveUserId(userId);
    const filter: any = { date };
    if (resolvedUserId) filter.userId = resolvedUserId;

    const [summary, modelStats] = await Promise.all([
      this.db
        .collection<OpenAiUsageDailySummaryDoc>(
          OPENAI_USAGE_DAILY_SUMMARY_COLLECTION,
        )
        .findOne(filter),
      this.db
        .collection<OpenAiUsageDailyModelStatsDoc>(
          OPENAI_USAGE_DAILY_MODEL_STATS_COLLECTION,
        )
        .find(filter)
        .toArray(),
    ]);

    if (!summary) return null;

    const modelBreakdown: Record<string, any> = {};
    for (const stat of modelStats) {
      modelBreakdown[stat.model] = {
        requests: stat.requests,
        inputTokens: stat.inputTokens,
        outputTokens: stat.outputTokens,
        totalTokens: stat.inputTokens + stat.outputTokens,
        costUsd: stat.costUsd,
      };
    }

    return {
      userId,
      date: summary.date,
      totalRequests: summary.totalRequests,
      totalInputTokens: summary.totalInputTokens,
      totalOutputTokens: summary.totalOutputTokens,
      totalTokens: summary.totalTokens,
      totalCostUsd: summary.totalCostUsd,
      modelBreakdown,
    };
  }

  async getDailyRange(
    userId: string,
    fromDate: string,
    toDate: string,
  ): Promise<any[]> {
    const resolvedUserId = this.resolveUserId(userId);
    const filter: any = {
      date: { $gte: fromDate, $lte: toDate },
    };
    if (resolvedUserId) filter.userId = resolvedUserId;

    const [summaries, modelStats] = await Promise.all([
      this.db
        .collection<OpenAiUsageDailySummaryDoc>(
          OPENAI_USAGE_DAILY_SUMMARY_COLLECTION,
        )
        .find(filter)
        .sort({ date: 1 })
        .toArray(),
      this.db
        .collection<OpenAiUsageDailyModelStatsDoc>(
          OPENAI_USAGE_DAILY_MODEL_STATS_COLLECTION,
        )
        .find(filter)
        .toArray(),
    ]);

    // Group model stats by date
    const statsByDate = new Map<string, OpenAiUsageDailyModelStatsDoc[]>();
    for (const stat of modelStats) {
      const list = statsByDate.get(stat.date) ?? [];
      list.push(stat);
      statsByDate.set(stat.date, list);
    }

    return summaries.map((summary) => {
      const dayStats = statsByDate.get(summary.date) ?? [];
      const modelBreakdown: Record<string, any> = {};
      for (const stat of dayStats) {
        modelBreakdown[stat.model] = {
          requests: stat.requests,
          inputTokens: stat.inputTokens,
          outputTokens: stat.outputTokens,
          totalTokens: stat.inputTokens + stat.outputTokens,
          costUsd: stat.costUsd,
        };
      }
      return {
        userId,
        date: summary.date,
        totalRequests: summary.totalRequests,
        totalInputTokens: summary.totalInputTokens,
        totalOutputTokens: summary.totalOutputTokens,
        totalTokens: summary.totalTokens,
        totalCostUsd: summary.totalCostUsd,
        modelBreakdown,
      };
    });
  }

  async getUsageByModel(
    userId?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<any[]> {
    const match: any = {};
    const resolvedUserId = this.resolveUserId(userId);
    if (resolvedUserId) match.userId = resolvedUserId;
    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = fromDate;
      if (toDate) match.createdAt.$lte = toDate;
    }

    return this.db
      .collection<OpenAiUsageDoc>(OPENAI_USAGE_COLLECTION)
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: '$model',
            totalInputTokens: { $sum: '$inputTokens' },
            totalOutputTokens: { $sum: '$outputTokens' },
            totalTokens: { $sum: '$totalTokens' },
            totalCostUsd: { $sum: '$costUsd' },
            requestCount: { $sum: 1 },
          },
        },
        { $sort: { totalCostUsd: -1 } },
      ])
      .toArray();
  }

  async getAdminUserList(): Promise<
    { _id: string; name: string; email: string }[]
  > {
    const users = await this.db
      .collection('users')
      .find({ role: 'user' }, { projection: { _id: 1, name: 1, email: 1 } })
      .sort({ name: 1 })
      .toArray();

    return users.map((u) => ({
      _id: u._id.toString(),
      name: u.name || u.email,
      email: u.email,
    }));
  }

  // ─── Dashboard helpers ───────────────────────────────────────────────────────

  private getTodayInTimezone(timezone: string): string {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }

  private buildDateRange(
    year?: number,
    month?: number,
  ): { from: string; to: string; groupBy: 'month' | 'day' } {
    const now = new Date();
    const y = year ?? now.getUTCFullYear();

    // No year and no month at all -> default to the current month (days),
    // not the whole current year.
    const effectiveMonth = month ?? (!year ? now.getUTCMonth() + 1 : undefined);

    if (effectiveMonth) {
      const mm = String(effectiveMonth).padStart(2, '0');
      const lastDay = new Date(y, effectiveMonth, 0).getDate();
      return {
        from: `${y}-${mm}-01`,
        to: `${y}-${mm}-${String(lastDay).padStart(2, '0')}`,
        groupBy: 'day',
      };
    }
    return { from: `${y}-01-01`, to: `${y}-12-31`, groupBy: 'month' };
  }

  private monthLabel(period: string): string {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const m = parseInt(period.slice(5, 7), 10);
    return months[m - 1] ?? period;
  }

  // Full list of 'YYYY-MM-DD' periods for every day of the given month, so
  // the overview chart always has one entry per day, even with zero usage.
  private getAllDaysInMonth(yearStr: string, monthStr: string): string[] {
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const lastDay = new Date(year, month, 0).getDate();
    const days: string[] = [];
    for (let d = 1; d <= lastDay; d++) {
      days.push(`${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`);
    }
    return days;
  }

  // Full list of 'YYYY-MM' periods for all 12 months of the given year.
  private getAllMonthsInYear(yearStr: string): string[] {
    const months: string[] = [];
    for (let m = 1; m <= 12; m++) {
      months.push(`${yearStr}-${String(m).padStart(2, '0')}`);
    }
    return months;
  }

  // ─── Dashboard: overview (chart + totals) ────────────────────────────────────

  async getDashboardOverview(params: {
    userId?: string;
    year?: number;
    month?: number;
    timezone: string;
  }): Promise<any> {
    const { userId, year, month, timezone } = params;
    const { from, to, groupBy } = this.buildDateRange(year, month);
    const today = this.getTodayInTimezone(timezone);

    const matchFilter: any = { date: { $gte: from, $lte: to } };
    const resolvedUserId = this.resolveUserId(userId);
    if (resolvedUserId) matchFilter.userId = resolvedUserId;

    // Aggregate model stats across the period, grouped by (period, model)
    const rawStats = await this.db
      .collection(OPENAI_USAGE_DAILY_MODEL_STATS_COLLECTION)
      .aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: {
              period:
                groupBy === 'month' ? { $substr: ['$date', 0, 7] } : '$date',
              model: '$model',
            },
            requests: { $sum: '$requests' },
            inputTokens: { $sum: '$inputTokens' },
            outputTokens: { $sum: '$outputTokens' },
            costUsd: { $sum: '$costUsd' },
          },
        },
        { $sort: { '_id.period': 1, '_id.model': 1 } },
      ])
      .toArray();

    // Build chartData: array of { period, label, models: {}, totalCostUsd }
    const periodMap = new Map<
      string,
      { models: Record<string, any>; totalCostUsd: number }
    >();
    const modelTotalsMap = new Map<
      string,
      { costUsd: number; requests: number }
    >();

    for (const row of rawStats) {
      const period: string = row._id.period;
      const model: string = row._id.model;

      if (!periodMap.has(period)) {
        periodMap.set(period, { models: {}, totalCostUsd: 0 });
      }

      const entry = periodMap.get(period)!;
      entry.models[model] = {
        requests: row.requests,
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        costUsd: row.costUsd,
      };
      entry.totalCostUsd += row.costUsd;

      const mt = modelTotalsMap.get(model) ?? { costUsd: 0, requests: 0 };
      mt.costUsd += row.costUsd;
      mt.requests += row.requests;
      modelTotalsMap.set(model, mt);
    }

    // Every period in the range appears in chartData, even with no usage —
    // periods missing from periodMap are filled with empty models / 0 cost.
    const allPeriods =
      groupBy === 'month'
        ? this.getAllMonthsInYear(from.slice(0, 4))
        : this.getAllDaysInMonth(from.slice(0, 4), from.slice(5, 7));

    const chartData = allPeriods.map((period) => {
      const entry = periodMap.get(period) ?? { models: {}, totalCostUsd: 0 };
      const label =
        groupBy === 'month'
          ? this.monthLabel(period)
          : String(parseInt(period.slice(8, 10), 10));
      return {
        period,
        label,
        models: entry.models,
        totalCostUsd: entry.totalCostUsd,
      };
    });

    const totalSpend = chartData.reduce((s, r) => s + r.totalCostUsd, 0);

    // Today's spend
    const todayFilter: any = { date: today };
    if (resolvedUserId) todayFilter.userId = resolvedUserId;
    const todaySummary = await this.db
      .collection(OPENAI_USAGE_DAILY_SUMMARY_COLLECTION)
      .findOne(todayFilter);
    const todaySpend = (todaySummary as any)?.totalCostUsd ?? 0;

    const modelTotals: Record<string, any> = {};
    for (const [model, v] of modelTotalsMap.entries()) {
      modelTotals[model] = v;
    }

    return {
      groupBy,
      from,
      to,
      totalSpend,
      todaySpend,
      chartData,
      modelTotals,
    };
  }

  // ─── Dashboard: details table (paginated daily rows) ─────────────────────────

  async getDashboardDetails(params: {
    userId?: string;
    year?: number;
    month?: number;
    page: number;
    limit: number;
    timezone: string;
  }): Promise<any> {
    const { userId, year, month, page, limit, timezone } = params;
    const { from, to } = this.buildDateRange(year, month);

    const matchFilter: any = { date: { $gte: from, $lte: to } };
    const resolvedUserId = this.resolveUserId(userId);
    if (resolvedUserId) matchFilter.userId = resolvedUserId;

    // Group per-day model stats: one row per (date, model)
    const allModelStats = await this.db
      .collection(OPENAI_USAGE_DAILY_MODEL_STATS_COLLECTION)
      .aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { date: '$date', model: '$model' },
            requests: { $sum: '$requests' },
            inputTokens: { $sum: '$inputTokens' },
            outputTokens: { $sum: '$outputTokens' },
          },
        },
        { $sort: { '_id.date': -1 } },
      ])
      .toArray();

    // Group by date
    const dateMap = new Map<
      string,
      {
        models: string[];
        requestCount: number;
        inputTokens: number;
        outputTokens: number;
      }
    >();
    for (const row of allModelStats) {
      const date: string = row._id.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          models: [],
          requestCount: 0,
          inputTokens: 0,
          outputTokens: 0,
        });
      }
      const entry = dateMap.get(date)!;
      if (!entry.models.includes(row._id.model))
        entry.models.push(row._id.model);
      entry.requestCount += row.requests;
      entry.inputTokens += row.inputTokens;
      entry.outputTokens += row.outputTokens;
    }

    const sorted = Array.from(dateMap.entries()).sort((a, b) =>
      b[0].localeCompare(a[0]),
    );
    const total = sorted.length;
    const pages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const paged = sorted.slice(skip, skip + limit);

    // Format date for display using timezone
    const formatDisplayDate = (isoDate: string): string => {
      try {
        const [y, m, d] = isoDate.split('-');
        return `${d}/${m}/${y}`;
      } catch {
        return isoDate;
      }
    };

    const data = paged.map(([date, v], i) => ({
      index: skip + i + 1,
      date: formatDisplayDate(date),
      isoDate: date,
      models: v.models,
      requestCount: v.requestCount,
      inputTokens: v.inputTokens,
      outputTokens: v.outputTokens,
    }));

    return { data, total, page, pages, from, to };
  }

  async getAllUsersDailySummary(date: string): Promise<any[]> {
    const [summaries, modelStats] = await Promise.all([
      this.db
        .collection<OpenAiUsageDailySummaryDoc>(
          OPENAI_USAGE_DAILY_SUMMARY_COLLECTION,
        )
        .find({ date })
        .sort({ totalCostUsd: -1 })
        .toArray(),
      this.db
        .collection<OpenAiUsageDailyModelStatsDoc>(
          OPENAI_USAGE_DAILY_MODEL_STATS_COLLECTION,
        )
        .find({ date })
        .toArray(),
    ]);

    const statsByUserId = new Map<string, OpenAiUsageDailyModelStatsDoc[]>();
    for (const stat of modelStats) {
      const key = stat.userId?.toString() ?? 'system';
      const list = statsByUserId.get(key) ?? [];
      list.push(stat);
      statsByUserId.set(key, list);
    }

    return summaries.map((summary) => {
      const key = summary.userId?.toString() ?? 'system';
      const dayStats = statsByUserId.get(key) ?? [];
      const modelBreakdown: Record<string, any> = {};
      for (const stat of dayStats) {
        modelBreakdown[stat.model] = {
          requests: stat.requests,
          inputTokens: stat.inputTokens,
          outputTokens: stat.outputTokens,
          totalTokens: stat.inputTokens + stat.outputTokens,
          costUsd: stat.costUsd,
        };
      }
      return {
        userId: key,
        date: summary.date,
        totalRequests: summary.totalRequests,
        totalInputTokens: summary.totalInputTokens,
        totalOutputTokens: summary.totalOutputTokens,
        totalTokens: summary.totalTokens,
        totalCostUsd: summary.totalCostUsd,
        modelBreakdown,
      };
    });
  }
}
