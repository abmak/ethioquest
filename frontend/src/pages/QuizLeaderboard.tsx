import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Crown, Gift, TrendingUp, Trophy } from "lucide-react";
import { Card, EmptyState } from "../components/ui";
import { api, apiError } from "../lib/api";
import { cn, formatDayRange, formatDuration, formatEtb, initials } from "../lib/utils";
import { tt, ttp } from "../lib/i18n";
import { useAuth } from "../store/auth";
import type { LeaderboardPeriod, LeaderboardResponse, PrizePeriod, PrizeTypesResponse } from "../types";

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This week" },
  { value: "monthly", label: "This month" },
];

const VIEWS: { value: "ranking" | "prizes"; label: string }[] = [
  { value: "ranking", label: "Ranking" },
  { value: "prizes", label: "Prize types" },
];

const PRIZE_PERIOD_OF: Record<LeaderboardPeriod, PrizePeriod> = {
  daily: "DAILY",
  weekly: "WEEKLY",
  monthly: "MONTHLY",
};

function medalClass(rank: number): string {
  if (rank === 1) return "bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-950 shadow-md shadow-amber-400/40";
  if (rank === 2) return "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 shadow-sm";
  if (rank === 3) return "bg-gradient-to-br from-orange-300 to-amber-600 text-white shadow-sm shadow-orange-400/40";
  return "bg-white text-slate-500 ring-1 ring-slate-200";
}

function rowClass(rank: number, isMe: boolean): string {
  const base = "relative flex items-center justify-between gap-3 rounded-2xl px-3 py-3 transition";
  if (isMe) return cn(base, "bg-gradient-to-r from-fuchsia-50 via-violet-50 to-sky-50 ring-2 ring-fuchsia-400");
  if (rank === 1) return cn(base, "bg-gradient-to-r from-amber-50 to-yellow-50/60 ring-1 ring-amber-200");
  if (rank === 2) return cn(base, "bg-slate-50/80 ring-1 ring-slate-200");
  if (rank === 3) return cn(base, "bg-orange-50/70 ring-1 ring-orange-200");
  return cn(base, "hover:bg-slate-50");
}

function avatarClass(rank: number): string {
  if (rank === 1) return "bg-gradient-to-br from-amber-400 to-orange-500";
  if (rank === 2) return "bg-gradient-to-br from-sky-400 to-indigo-500";
  if (rank === 3) return "bg-gradient-to-br from-rose-400 to-fuchsia-500";
  return "bg-gradient-to-br from-teal-400 to-emerald-500";
}

export function QuizLeaderboard() {
  const { user } = useAuth();
  const [view, setView] = useState<"ranking" | "prizes">("ranking");
  const [period, setPeriod] = useState<LeaderboardPeriod>("daily");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prizes, setPrizes] = useState<PrizeTypesResponse | null>(null);
  const [prizeError, setPrizeError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);
    api
      .get<LeaderboardResponse>("/api/quiz/leaderboard", { params: { period } })
      .then((response) => {
        if (active) setData(response.data);
      })
      .catch((err) => {
        if (active) setError(apiError(err, "Could not load the leaderboard."));
      });
    return () => {
      active = false;
    };
  }, [period]);

  useEffect(() => {
    let active = true;
    api
      .get<PrizeTypesResponse>("/api/quiz/prizes")
      .then((response) => {
        if (active) setPrizes(response.data);
      })
      .catch((err) => {
        if (active) setPrizeError(apiError(err, "Could not load the prize list."));
      });
    return () => {
      active = false;
    };
  }, []);

  const prizePeriod = PRIZE_PERIOD_OF[period];
  const periodPrizes = prizes?.tiers.filter((tier) => tier.period === prizePeriod) ?? [];
  const range = prizes?.ranges[prizePeriod];

  return (
    <Card className="relative overflow-hidden rounded-3xl border-0 bg-white p-5 shadow-[0_18px_50px_-32px_rgba(79,70,229,0.55)] ring-1 ring-violet-100 sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-fuchsia-200/50 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-amber-200/50 blur-3xl" aria-hidden />

      <div className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-600 to-orange-500 text-white shadow-lg shadow-fuchsia-500/30">
              <Trophy className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-lg font-black text-slate-900">Leaderboard</h2>
              <p className="text-xs text-slate-500">
                Ranked by the points earned from answered questions; ties go to the faster total time.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div role="tablist" className="flex rounded-2xl bg-slate-100 p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  role="tab"
                  aria-selected={period === p.value}
                  onClick={() => setPeriod(p.value)}
                  className={cn(
                    "min-h-9 rounded-xl px-3 text-xs font-bold transition",
                    period === p.value
                      ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-fuchsia-500/30"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {tt(p.label)}
                </button>
              ))}
            </div>
            {data && data.period === period && (
              <p className="text-[11px] font-semibold text-slate-500">
                {formatDayRange(data.range.from, data.range.to)}
              </p>
            )}
          </div>
        </div>

        <div role="tablist" aria-label="Leaderboard view" className="flex w-full gap-1 rounded-2xl bg-slate-100 p-1">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              role="tab"
              aria-selected={view === v.value}
              onClick={() => setView(v.value)}
              className={cn(
                "flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition",
                view === v.value
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              {v.value === "prizes" && <Gift className="h-3.5 w-3.5" aria-hidden />}
              {tt(v.label)}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-rose-700">{error}</p>}

        {view === "ranking" && (
          <>
            {!error && data && data.entries.length === 0 && (
              <EmptyState
                icon={Trophy}
                title="No scores yet"
                description="Finish today's challenge and take the first place on this board."
              />
            )}

            {data && data.entries.length > 0 && (
              <ol className="relative flex flex-col gap-1.5">
                {data.entries.map((entry) => {
                  const isMe = user?.id === entry.userId;
                  return (
                    <li key={entry.userId} className={rowClass(entry.rank, isMe)}>
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black", medalClass(entry.rank))}
                          aria-label={`Rank ${entry.rank}`}
                        >
                          {entry.rank === 1 ? <Crown className="h-4 w-4" aria-hidden /> : entry.rank}
                        </span>
                        <span
                          className={cn(
                            "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-black text-white ring-2 ring-white",
                            avatarClass(entry.rank),
                          )}
                          aria-hidden
                        >
                          {initials(entry.displayName)}
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 truncate text-sm font-bold text-slate-900">
                            {entry.displayName}
                            {isMe && (
                              <span className="rounded-full bg-fuchsia-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                                You
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            @{entry.username} · {entry.correctCount}/{entry.questions} correct · {entry.plays}{" "}
                            {entry.plays === 1 ? "play" : "plays"}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="flex items-center justify-end gap-1 text-sm font-black text-slate-900">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                          {entry.points} pts
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDuration(entry.totalTimeMs)} {tt("total")}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}

        {view === "prizes" && (
          <div className="flex flex-col gap-3">
            {range && (
              <p className="text-xs font-semibold text-slate-500">
                {ttp("Prizes awarded for {period}", { period: formatDayRange(range.from, range.to) })}
              </p>
            )}

            {prizeError && <p className="text-sm text-rose-700">{prizeError}</p>}

            {!prizeError && !prizes && <p className="text-sm text-slate-500">{tt("Loading prizes…")}</p>}

            {!prizeError && prizes && periodPrizes.length === 0 && (
              <EmptyState
                icon={Gift}
                title="No prize types announced yet"
                description="The prize table for this period has not been published. Keep playing — it will appear here."
              />
            )}

            {periodPrizes.length > 0 && (
              <ul className="flex flex-col gap-2">
                {periodPrizes.map((tier) => (
                  <li
                    key={tier.rank}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-gradient-to-r from-amber-50/70 to-orange-50/40 p-3"
                  >
                    <span
                      className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black", medalClass(tier.rank))}
                      aria-label={`Rank ${tier.rank}`}
                    >
                      {tier.rank === 1 ? <Crown className="h-4 w-4" aria-hidden /> : tier.rank}
                    </span>
                    {tier.imageUrl && (
                      <img
                        src={tier.imageUrl}
                        alt=""
                        loading="lazy"
                        className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{tier.name}</p>
                      {tier.description && <p className="text-xs text-slate-600">{tier.description}</p>}
                      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {tt("Place")} {tier.rank}
                      </p>
                    </div>
                    {tier.amountEtb ? (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-900">
                        {formatEtb(tier.amountEtb)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <p className="text-sm font-bold text-slate-900">{tt("Prize terms & conditions")}</p>
              <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 text-xs text-slate-600">
                <li>
                  Winners are the members at the top of this board when the period closes; equal points go to the
                  faster total answering time.
                </li>
                <li>
                  Claim within 30 days of the period closing, from the same account you played on, with a valid ID.
                </li>
                <li>Only completed attempts count. Each retry costs ETB 3 and is not refundable.</li>
                <li>Bots, shared accounts, answer sharing or more than one account per person void the prize.</li>
                <li>Prizes are handed over as described, or as the cash equivalent where an item cannot be arranged.</li>
              </ul>
              <Link
                to="/terms"
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-violet-700 hover:underline"
              >
                {tt("Read the full terms & conditions")}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
