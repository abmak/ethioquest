import { prisma } from "./prisma";
import { logger } from "./logger";

/** Which leaderboard period a prize belongs to. */
export type PrizePeriod = "DAILY" | "WEEKLY" | "MONTHLY";

export const PRIZE_PERIODS: PrizePeriod[] = ["DAILY", "WEEKLY", "MONTHLY"];

export const PERIOD_KEY_PATTERNS: Record<PrizePeriod, RegExp> = {
  DAILY: /^\d{4}-\d{2}-\d{2}$/,
  WEEKLY: /^\d{4}-W\d{2}$/,
  MONTHLY: /^\d{4}-\d{2}$/,
};

export interface PrizeTierSeed {
  period: PrizePeriod;
  rank: number;
  name: string;
  description: string;
  amountEtb: number;
}

/**
 * The prize table a fresh install starts with. Staff edit it in the console;
 * an existing row is never overwritten.
 */
export const DEFAULT_PRIZE_TIERS: PrizeTierSeed[] = [
  {
    period: "MONTHLY",
    rank: 1,
    name: "Local trip with accommodation",
    description: "One local trip for two with accommodation, or the equivalent value in cash.",
    amountEtb: 100000,
  },
  {
    period: "MONTHLY",
    rank: 2,
    name: "Cash prize",
    description: "Runner-up cash prize for the month.",
    amountEtb: 50000,
  },
  {
    period: "MONTHLY",
    rank: 3,
    name: "Cash prize",
    description: "Third-place cash prize for the month.",
    amountEtb: 30000,
  },
];

/** Creates the default prize tiers on first boot; safe on every start. */
export async function ensurePrizeConfig(): Promise<number> {
  const existing = await prisma.prizeTier.count();
  if (existing > 0) return 0;
  const inserted = await prisma.prizeTier.createMany({ data: DEFAULT_PRIZE_TIERS });
  logger.info({ tiers: inserted.count }, "Prize configuration ready");
  return inserted.count;
}

function isoWeekStart(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const offset = (jan4.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(Date.UTC(year, 0, 4 - offset + (week - 1) * 7));
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The calendar days a period key covers: a single day, the Monday-to-Sunday
 * week, or the whole month. Used to label the board and the staff report, so a
 * week that crosses a month boundary is visible instead of puzzling.
 */
export function periodRange(period: PrizePeriod, key: string): { from: string; to: string } {
  if (period === "DAILY") {
    return { from: key, to: key };
  }
  if (period === "WEEKLY") {
    const [year, week] = key.split("-W").map(Number);
    const start = isoWeekStart(year, week);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    return { from: iso(start), to: iso(end) };
  }
  const [year, month] = key.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { from: iso(start), to: iso(end) };
}

/** Prize period for a leaderboard period. */
export function prizePeriodOf(period: "daily" | "weekly" | "monthly"): PrizePeriod {
  return period === "daily" ? "DAILY" : period === "weekly" ? "WEEKLY" : "MONTHLY";
}

/** Leaderboard period for a prize period, used by the ranking query. */
export function rankPeriodOf(period: PrizePeriod): "daily" | "weekly" | "monthly" {
  return period === "DAILY" ? "daily" : period === "WEEKLY" ? "weekly" : "monthly";
}
