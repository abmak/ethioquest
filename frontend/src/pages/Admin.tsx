import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Ban,
  Banknote,
  CheckCircle2,
  ClipboardList,
  Heart,
  ImagePlus,
  KeyRound,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Plus,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { Button, Card, EmptyState, Modal, PageLoader } from "../components/ui";
import { api, apiError } from "../lib/api";
import { tt } from "../lib/i18n";
import { cn, formatDate, formatDayRange, formatDuration, formatEtb, initials, timeAgo } from "../lib/utils";
import { useAuth } from "../store/auth";
import type {
  AdminDestination,
  AdminOverview,
  AdminUser,
  DestinationCategory,
  DestinationDraft,
  InteractionReport,
  LeaderboardPeriod,
  LeaderboardReport,
  AdminRole,
  AuditResponse,
  PrizeAward,
  PrizeConfigResponse,
  PrizePeriod,
  PrizePeriodResponse,
  PrizeStatus,
  PrizeTier,
  QuizAnswersResponse,
  QuizRetryReport,
  RolesResponse,
} from "../types";

type AdminTab =
  | "overview"
  | "users"
  | "roles"
  | "audit"
  | "leaderboard"
  | "answers"
  | "prizes"
  | "retries"
  | "places";

// Each tab names the capability the API checks for its data, so a role only
// sees the surfaces it can actually open.
const TABS: { value: AdminTab; label: string; icon: typeof LayoutDashboard; permission: string }[] = [
  { value: "overview", label: "Overview", icon: LayoutDashboard, permission: "overview.view" },
  { value: "users", label: "Members", icon: Users, permission: "members.view" },
  { value: "roles", label: "Roles & permissions", icon: KeyRound, permission: "roles.manage" },
  { value: "audit", label: "Audit log", icon: ScrollText, permission: "audit.view" },
  { value: "leaderboard", label: "Leaderboard", icon: Trophy, permission: "quiz.leaderboard" },
  { value: "answers", label: "Answer details", icon: ClipboardList, permission: "quiz.report" },
  { value: "prizes", label: "Prizes", icon: Sparkles, permission: "quiz.prizes" },
  { value: "retries", label: "Retry payments", icon: Banknote, permission: "quiz.payments" },
  { value: "places", label: "Places", icon: MapPin, permission: "places.view" },
];

const INPUT =
  "min-h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";

const CATEGORY_VALUES: DestinationCategory[] = [
  "HISTORY",
  "HERITAGE",
  "NATURE",
  "WILDLIFE",
  "ADVENTURE",
  "CULTURE",
  "CITY",
  "FOOD",
];

const CATEGORY_TONE: Record<DestinationCategory, string> = {
  HISTORY: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  HERITAGE: "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300",
  NATURE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
  WILDLIFE: "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300",
  ADVENTURE: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300",
  CULTURE: "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300",
  CITY: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
  FOOD: "bg-pink-100 text-pink-800 dark:bg-pink-400/15 dark:text-pink-300",
};

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

const TILES: { key: keyof AdminOverview["totals"]; label: string; icon: typeof Users; tone: string }[] = [
  { key: "users", label: "Members", icon: Users, tone: "from-indigo-500 via-indigo-600 to-violet-700" },
  { key: "posts", label: "Stories", icon: MessageCircle, tone: "from-sky-500 via-cyan-600 to-teal-600" },
  { key: "likes", label: "Likes", icon: Heart, tone: "from-rose-500 via-pink-600 to-fuchsia-700" },
  { key: "comments", label: "Comments", icon: MessageCircle, tone: "from-amber-400 via-orange-500 to-rose-500" },
  { key: "follows", label: "Follows", icon: Users, tone: "from-emerald-500 via-emerald-600 to-teal-700" },
  { key: "messages", label: "Messages", icon: MessageCircle, tone: "from-violet-500 via-purple-600 to-indigo-700" },
  { key: "destinations", label: "Places", icon: MapPin, tone: "from-teal-500 via-emerald-600 to-green-700" },
  { key: "attempts", label: "Quiz plays", icon: Trophy, tone: "from-yellow-400 via-amber-500 to-orange-600" },
  { key: "newUsers30d", label: "New in 30d", icon: TrendingUp, tone: "from-fuchsia-500 via-pink-600 to-rose-600" },
  { key: "banned", label: "Suspended", icon: Ban, tone: "from-slate-500 via-slate-600 to-slate-700" },
];

function OverviewPanel() {
  const [totals, setTotals] = useState<AdminOverview["totals"] | null>(null);
  const [report, setReport] = useState<InteractionReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<AdminOverview>("/api/admin/overview"),
      api.get<InteractionReport>("/api/admin/interactions"),
    ])
      .then(([overview, interactions]) => {
        if (cancelled) return;
        setTotals(overview.data.totals);
        setReport(interactions.data);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p role="alert" className="text-sm text-rose-600">{error}</p>;
  if (!totals || !report) return <PageLoader label="Loading the dashboard…" />;

  const maxDaily = Math.max(1, ...report.dailyStories.map((d) => d.count));
  const maxPlace = Math.max(1, ...report.topPlaces.map((p) => p.stories));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TILES.map(({ key, label, icon: Icon, tone }) => (
          <div
            key={key}
            className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-lg", tone)}
          >
            <Icon className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-16 opacity-20" aria-hidden />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">{tt(label)}</p>
            <p className="mt-1.5 text-2xl font-extrabold tabular-nums">{totals[key].toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <TrendingUp className="h-4 w-4 text-teal-600" aria-hidden /> Stories shared, last 14 days
            </h3>
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
              {report.dailyStories.reduce((sum, d) => sum + d.count, 0)} total
            </span>
          </div>
          <div className="flex h-40 items-end gap-1.5">
            {report.dailyStories.map((day) => (
              <div key={day.day} className="flex h-full flex-1 flex-col justify-end gap-1" title={`${day.day}: ${day.count}`}>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-indigo-600 via-violet-500 to-fuchsia-400 transition hover:opacity-80"
                  style={{ height: `${Math.max(5, (day.count / maxDaily) * 100)}%` }}
                />
                <span className="text-center text-[9px] text-muted">{day.day.slice(8)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <MapPin className="h-4 w-4 text-emerald-600" aria-hidden /> Most talked-about places
          </h3>
          {report.topPlaces.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No stories are linked to a place yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {report.topPlaces.map((place) => (
                <li key={place.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{place.name}</span>
                    <span className="shrink-0 text-xs text-muted">{place.stories} stories</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-raised">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      style={{ width: `${Math.max(4, (place.stories / maxPlace) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="flex flex-col gap-3 p-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <Star className="h-4 w-4 text-amber-500" aria-hidden /> Most engaging stories
        </h3>
        {report.topStories.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No stories have been shared yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.topStories.map((story) => (
              <li
                key={story.id}
                className="flex flex-col gap-1 rounded-xl border border-line bg-gradient-to-br from-amber-50 to-rose-50 p-3 dark:from-amber-400/5 dark:to-rose-400/5"
              >
                <p className="line-clamp-2 text-sm font-semibold">{story.title}</p>
                <p className="text-xs text-muted">
                  {story.author.displayName} · {timeAgo(story.createdAt)}
                </p>
                <p className="mt-1 flex items-center gap-3 text-xs font-semibold text-rose-600">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5 fill-current" aria-hidden /> {story.likeCount}
                  </span>
                  <span className="flex items-center gap-1 text-sky-600">
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden /> {story.commentCount}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

const FILTERS = [
  { value: "all", label: "All" },
  { value: "banned", label: "Suspended" },
  { value: "staff", label: "Staff" },
] as const;

const ROLE_TONE: Record<string, string> = {
  ADMIN: "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300",
  MODERATOR: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
  USER: "bg-slate-100 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300",
};

const ROLE_FALLBACK_TONE = "bg-teal-100 text-teal-800 dark:bg-teal-400/15 dark:text-teal-300";

function UsersPanel() {
  const { user: me } = useAuth();
  // Managing members is a separate capability from reading them.
  const canManage = !me?.permissions || me.permissions.includes("members.manage");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({ displayName: "", username: "", email: "", password: "", role: "USER" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    api
      .get<RolesResponse>("/api/admin/roles")
      .then((res) => setRoles(res.data.roles))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api
      .get<{ users: AdminUser[] }>("/api/admin/users", {
        params: { ...(search ? { q: search } : {}), filter },
      })
      .then((res) => {
        if (!cancelled) setUsers(res.data.users);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [search, filter]);

  const patch = async (id: string, body: { role?: string; banned?: boolean }) => {
    setBusyId(id);
    setError(null);
    try {
      // Ban state and role are separate endpoints so each one can be audited.
      const url = body.role ? `/api/admin/users/${id}/role` : `/api/admin/users/${id}/ban`;
      const res = await api.patch<{ user: Partial<AdminUser> }>(url, body);
      setUsers((list) => list?.map((u) => (u.id === id ? { ...u, ...res.data.user } : u)) ?? list);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusyId(null);
    }
  };

  const createMember = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await api.post<{ user: Omit<AdminUser, "region" | "banned" | "avatarUrl" | "stories" | "attempts" | "followers" | "following" | "messagesSent"> }>(
        "/api/admin/users",
        draft,
      );
      const created: AdminUser = {
        ...res.data.user,
        region: null,
        banned: false,
        avatarUrl: null,
        stories: 0,
        attempts: 0,
        followers: 0,
        following: 0,
        messagesSent: 0,
      };
      setUsers((list) => [created, ...(list ?? [])]);
      setCreateOpen(false);
      setDraft({ displayName: "", username: "", email: "", password: "", role: "USER" });
    } catch (err) {
      setCreateError(apiError(err, "Could not create the member."));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <Users className="h-4 w-4 text-indigo-600" aria-hidden /> Member management
        </h3>
        <div className="flex flex-wrap items-center gap-2">
        {canManage && (
          <Button className="min-h-9 px-3 text-xs" onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" aria-hidden /> New member
          </Button>
        )}
        <div className="flex flex-wrap gap-1 rounded-xl bg-subtle p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                filter === f.value ? "bg-surface text-indigo-700 shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              {tt(f.label)}
            </button>
          ))}
        </div>
        </div>
      </div>

      <label className="relative block">
        <span className="sr-only">Search members</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, username or email"
          className={cn(INPUT, "pl-9")}
        />
      </label>

      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {!users && !error && <PageLoader />}

      {users && users.length === 0 && (
        <EmptyState icon={Users} title="No members found" description="Try a different search or filter." />
      )}

      {users && users.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {users.map((member) => {
            const isMe = member.id === me?.id;
            return (
              <li key={member.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-sm",
                      member.banned ? "from-slate-400 to-slate-600" : "from-indigo-500 to-violet-600",
                    )}
                    aria-hidden
                  >
                    {initials(member.displayName)}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-sm font-semibold">
                      {member.displayName}
                      {isMe && <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-800">You</span>}
                      {member.banned && (
                        <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">Suspended</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted">
                      @{member.username} · {member.email}
                      {member.region ? ` · ${member.region}` : ""}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      Joined {formatDate(member.createdAt)} · {member.stories} stories · {member.attempts} quiz plays ·{" "}
                      {member.followers} followers
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      ROLE_TONE[member.role] ?? ROLE_FALLBACK_TONE,
                    )}
                  >
                    {roles.find((role) => role.name === member.role)?.label ?? member.role}
                  </span>
                  <select
                    value={member.role}
                    disabled={isMe || !canManage || busyId === member.id}
                    onChange={(e) => void patch(member.id, { role: e.target.value })}
                    aria-label={`Role for ${member.displayName}`}
                    className={cn(INPUT, "w-auto min-w-[8.5rem] py-1.5 text-xs")}
                  >
                    {roles.length === 0 && <option value={member.role}>{member.role}</option>}
                    {roles.map((role) => (
                      <option key={role.name} value={role.name}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant={member.banned ? "secondary" : "danger"}
                    className="min-h-9 px-3 text-xs"
                    disabled={isMe || !canManage}
                    loading={busyId === member.id}
                    onClick={() => void patch(member.id, { banned: !member.banned })}
                  >
                    {member.banned ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Unban
                      </>
                    ) : (
                      <>
                        <Ban className="h-3.5 w-3.5" aria-hidden /> Ban
                      </>
                    )}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create a member">
        <form onSubmit={(event) => void createMember(event)} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
            Full name
            <input
              required
              value={draft.displayName}
              onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
              className={INPUT}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
            Username
            <input
              required
              value={draft.username}
              onChange={(e) => setDraft({ ...draft, username: e.target.value })}
              className={INPUT}
              placeholder="e.g. selam_t"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
            Email
            <input
              required
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className={INPUT}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
            Temporary password
            <input
              required
              type="text"
              minLength={8}
              value={draft.password}
              onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              className={INPUT}
              placeholder="At least 8 characters"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
            Role
            <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} className={INPUT}>
              {roles.map((role) => (
                <option key={role.name} value={role.name}>
                  {role.label} ({role.name})
                </option>
              ))}
            </select>
          </label>
          {createError && (
            <p role="alert" className="text-sm text-rose-600">
              {createError}
            </p>
          )}
          <Button type="submit" loading={creating} className="w-full">
            <UserPlus className="h-4 w-4" aria-hidden /> Create member
          </Button>
        </form>
      </Modal>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const MEDALS = [
  "bg-gradient-to-br from-amber-400 to-yellow-600 text-white",
  "bg-gradient-to-br from-slate-300 to-slate-500 text-white",
  "bg-gradient-to-br from-orange-400 to-amber-700 text-white",
];

function LeaderboardPanel() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("monthly");
  const [report, setReport] = useState<LeaderboardReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReport(null);
    setError(null);
    api
      .get<LeaderboardReport>("/api/admin/leaderboard-report", { params: { period } })
      .then((res) => {
        if (!cancelled) setReport(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <Trophy className="h-4 w-4 text-amber-500" aria-hidden /> Leaderboard report
        </h3>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex gap-1 rounded-xl bg-subtle p-1" role="tablist" aria-label="Period">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                role="tab"
                aria-selected={period === p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                  period === p.value ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm" : "text-muted hover:text-ink",
                )}
              >
                {tt(p.label)}
              </button>
            ))}
          </div>
          {report && report.period === period && (
            <p className="text-xs font-semibold text-muted">
              {formatDayRange(report.range.from, report.range.to)}
            </p>
          )}
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {!report && !error && <PageLoader />}

      {report && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-3 text-white">
              <p className="text-[11px] uppercase tracking-wide text-white/80">Completed</p>
              <p className="text-lg font-bold">{report.summary.completed}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 p-3 text-white">
              <p className="text-[11px] uppercase tracking-wide text-white/80">Average</p>
              <p className="text-lg font-bold">{report.summary.averageScore}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 p-3 text-white">
              <p className="text-[11px] uppercase tracking-wide text-white/80">Top points</p>
              <p className="text-lg font-bold">{report.summary.topScore}</p>
            </div>
          </div>

          {report.entries.length === 0 ? (
            <EmptyState icon={Trophy} title="No completed attempts" description={`Nothing is recorded for ${report.key} yet.`} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Member</th>
                    <th className="py-2 pr-3">Points</th>
                    <th className="py-2 pr-3">Correct</th>
                    <th className="py-2 pr-3">Total time</th>
                    <th className="py-2 pr-3">Plays</th>
                    <th className="py-2 pr-3">Avg</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.entries.map((entry) => (
                    <tr key={`${entry.userId}-${entry.rank}`} className="border-t border-line">
                      <td className="py-2 pr-3">
                        <span
                          className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                            MEDALS[entry.rank - 1] ?? "bg-subtle text-muted",
                          )}
                        >
                          {entry.rank}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <p className="font-medium">{entry.displayName}</p>
                        <p className="text-xs text-muted">
                          @{entry.username} · {entry.email}
                          {entry.region ? ` · ${entry.region}` : ""}
                        </p>
                      </td>
                      <td className="py-2 pr-3 font-semibold text-indigo-700 dark:text-indigo-300">{entry.points}</td>
                      <td className="py-2 pr-3">
                        {entry.correctCount}/{entry.questions}
                      </td>
                      <td className="py-2 pr-3">{formatDuration(entry.totalTimeMs)}</td>
                      <td className="py-2 pr-3">{entry.plays}</td>
                      <td className="py-2 pr-3">{entry.averageScore}</td>
                      <td className="py-2 pr-3">
                        {entry.banned ? (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Suspended</span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Prizes
// ---------------------------------------------------------------------------

const PRIZE_PERIODS: { value: PrizePeriod; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

const PRIZE_KEY_PATTERN: Record<PrizePeriod, RegExp> = {
  DAILY: /^\d{4}-\d{2}-\d{2}$/,
  WEEKLY: /^\d{4}-W\d{2}$/,
  MONTHLY: /^\d{4}-\d{2}$/,
};

const PRIZE_KEY_TYPE: Record<PrizePeriod, "date" | "week" | "month"> = {
  DAILY: "date",
  WEEKLY: "week",
  MONTHLY: "month",
};

function PrizeKeyInput({
  period,
  value,
  onChange,
}: {
  period: PrizePeriod;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      {period === "DAILY" ? "Day" : period === "WEEKLY" ? "Week" : "Month"}
      <input
        type={PRIZE_KEY_TYPE[period]}
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className={cn(INPUT, "w-auto")}
        aria-label="Prize period"
      />
    </label>
  );
}

/** Optional prize photo, uploaded through the same media route stories use. */
function PrizePhoto({ imageUrl, onChange }: { imageUrl: string | null; onChange: (url: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("files", file);
      const res = await api.post<{ photos: { url: string }[] }>("/api/media", form);
      onChange(res.data.photos[0]?.url ?? null);
    } catch (err) {
      setError(apiError(err, "That photo could not be uploaded."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-muted">Prize photo (optional)</span>
      <div className="flex items-center gap-2">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-14 w-14 rounded-xl border border-line object-cover" />
        ) : (
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-dashed border-line text-muted">
            <ImagePlus className="h-5 w-5" aria-hidden />
          </span>
        )}
        <div className="flex flex-col items-start gap-1">
          <Button type="button" variant="secondary" loading={busy} onClick={() => inputRef.current?.click()}>
            {imageUrl ? "Change photo" : "Attach photo"}
          </Button>
          {imageUrl && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              Remove photo
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={(e) => void pick(e)} className="hidden" />
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

/**
 * One period's winning places. Each row is one winner, so adding and removing
 * rows sets how many members that period rewards.
 */
function PrizeConfigEditor({
  period,
  tiers,
  onSaved,
}: {
  period: PrizePeriod;
  tiers: PrizeTier[];
  onSaved: (tiers: PrizeTier[]) => void;
}) {
  // The parent remounts this editor when the period changes, so the saved
  // configuration seeds the rows once and an own save never wipes the form.
  const [rows, setRows] = useState<PrizeTier[]>(() =>
    tiers.length
      ? tiers.map((tier) => ({ ...tier }))
      : [{ rank: 1, name: "", description: null, amountEtb: null, imageUrl: null }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const patch = (index: number, next: Partial<PrizeTier>) =>
    setRows((list) => list.map((row, i) => (i === index ? { ...row, ...next } : row)));

  const addWinner = () =>
    setRows((list) =>
      list.length >= 20
        ? list
        : [...list, { rank: list.length + 1, name: "", description: null, amountEtb: null, imageUrl: null }],
    );

  const removeWinner = (index: number) =>
    setRows((list) => list.filter((_, i) => i !== index).map((row, i) => ({ ...row, rank: i + 1 })));

  const save = async () => {
    const cleaned = rows.map((row, i) => ({ ...row, rank: i + 1, name: row.name.trim() }));
    if (cleaned.some((row) => row.name.length < 2)) {
      setError("Give every winning place a prize type.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await api.put<{ tiers: PrizeTier[] }>(`/api/admin/prizes/config/${period}`, {
        tiers: cleaned.map((row) => ({
          rank: row.rank,
          name: row.name,
          description: row.description?.trim() || null,
          amountEtb: row.amountEtb ?? null,
          imageUrl: row.imageUrl || null,
        })),
      });
      onSaved(res.data.tiers);
      setSaved(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-raised/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Prize configuration</p>
          <p className="text-xs text-muted">Each row is one winning place with its own prize type.</p>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
          {rows.length} winners
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <li key={index} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-bold">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                    MEDALS[index] ?? "bg-subtle text-muted",
                  )}
                >
                  {index + 1}
                </span>
                Winner #{index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeWinner(index)}
                disabled={rows.length === 1}
                className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Remove winner ${index + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-muted sm:col-span-2">
                Prize type
                <input
                  value={row.name}
                  onChange={(e) => patch(index, { name: e.target.value })}
                  maxLength={120}
                  placeholder="e.g. Trophy, cash prize, local trip"
                  className={INPUT}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                Amount (ETB)
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={row.amountEtb ?? ""}
                  onChange={(e) =>
                    patch(index, { amountEtb: e.target.value === "" ? null : Math.round(Number(e.target.value)) })
                  }
                  placeholder="Optional"
                  className={INPUT}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              Description (optional)
              <input
                value={row.description ?? ""}
                onChange={(e) => patch(index, { description: e.target.value || null })}
                maxLength={500}
                placeholder="What the winner receives"
                className={INPUT}
              />
            </label>

            <PrizePhoto imageUrl={row.imageUrl ?? null} onChange={(url) => patch(index, { imageUrl: url })} />
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={addWinner} disabled={rows.length >= 20}>
          <Plus className="h-4 w-4" aria-hidden /> Add winner
        </Button>
        <Button type="button" loading={saving} onClick={() => void save()}>
          Save configuration
        </Button>
        {saved && <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Configuration saved.</span>}
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}

function PrizeRow({ award, onSaved }: { award: PrizeAward; onSaved: (updated: PrizeAward) => void }) {
  const [status, setStatus] = useState<PrizeStatus>(award.status);
  const [note, setNote] = useState(award.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.patch<{ award: PrizeAward }>(`/api/admin/prizes/award/${award.id}`, {
        status,
        note: note.trim() || null,
      });
      onSaved({ ...award, ...res.data.award });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-line bg-gradient-to-br from-amber-50/80 to-orange-50/40 p-3 dark:from-amber-400/5 dark:to-orange-400/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {award.imageUrl ? (
            <img src={award.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-line object-cover" />
          ) : (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-semibold">
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                  MEDALS[award.rank - 1] ?? "bg-subtle text-muted",
                )}
              >
                {award.rank}
              </span>
              {award.name}
            </p>
            <p className="text-xs text-muted">
              @{award.user.username} · {award.user.displayName}
            </p>
            {award.description && <p className="text-xs text-muted">{award.description}</p>}
          </div>
        </div>
        <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
          {award.amountEtb === null ? "—" : formatEtb(award.amountEtb)}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as PrizeStatus)}
          className={cn(INPUT, "w-auto min-w-[8rem]")}
          aria-label="Prize status"
        >
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="VOID">Void</option>
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="Note (optional)"
          className={cn(INPUT, "flex-1")}
          aria-label="Prize note"
        />
        <Button variant="secondary" loading={saving} onClick={() => void save()}>
          Save
        </Button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </li>
  );
}

interface MemberOption {
  id: string;
  displayName: string;
  username: string;
}

function AwardForm({
  period,
  periodKey,
  tiers,
  onGranted,
}: {
  period: PrizePeriod;
  periodKey: string;
  tiers: PrizeTier[];
  onGranted: () => void;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<MemberOption[]>([]);
  const [picked, setPicked] = useState<MemberOption | null>(null);
  const [rank, setRank] = useState("1");
  const [name, setName] = useState(tiers[0]?.name ?? "Special award");
  const [amount, setAmount] = useState(tiers[0]?.amountEtb === null ? "" : String(tiers[0]?.amountEtb ?? ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const tier = tiers.find((t) => t.rank === Number(rank));
    setName(tier?.name ?? "Special award");
    setAmount(tier?.amountEtb === null || tier?.amountEtb === undefined ? "" : String(tier.amountEtb));
  }, [rank, tiers]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setMatches([]);
      return;
    }
    const timer = window.setTimeout(() => {
      api
        .get<{ people: MemberOption[] }>("/api/social/people", { params: { q: query.trim() } })
        .then((res) => setMatches(res.data.people.slice(0, 5)))
        .catch(() => setMatches([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!picked) {
      setError("Choose a member first.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Name the prize first.");
      return;
    }
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const tier = tiers.find((t) => t.rank === Number(rank));
      await api.post(`/api/admin/prizes/${period}/${periodKey}/award`, {
        rank: Number(rank),
        userId: picked.id,
        name: name.trim(),
        description: tier?.description ?? null,
        amountEtb: amount === "" ? null : Math.round(Number(amount)),
        imageUrl: tier?.imageUrl ?? null,
      });
      setDone(true);
      setPicked(null);
      setQuery("");
      onGranted();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-3 dark:border-amber-400/30 dark:bg-amber-400/5"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
        <Plus className="h-4 w-4" aria-hidden /> Grant a prize by hand
      </p>

      <div className="relative">
        <input
          type="search"
          value={picked ? `${picked.displayName} (@${picked.username})` : query}
          onChange={(e) => {
            setPicked(null);
            setQuery(e.target.value);
          }}
          placeholder="Search a member by name or username"
          className={INPUT}
          aria-label="Search a member"
        />
        {matches.length > 0 && !picked && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lift">
            {matches.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPicked(m);
                    setMatches([]);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-raised"
                >
                  <span>{m.displayName}</span>
                  <span className="text-xs text-muted">@{m.username}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          Rank
          <input type="number" min={1} max={20} value={rank} onChange={(e) => setRank(e.target.value)} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          Amount (ETB)
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          Prize type
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={INPUT} />
        </label>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {done && <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Prize granted.</p>}
      <Button type="submit" loading={busy} className="self-start">
        Grant prize
      </Button>
    </form>
  );
}

function PrizesPanel() {
  const [period, setPeriod] = useState<PrizePeriod>("MONTHLY");
  const [config, setConfig] = useState<PrizeConfigResponse | null>(null);
  const [key, setKey] = useState("");
  const [data, setData] = useState<PrizePeriodResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalising, setFinalising] = useState(false);

  useEffect(() => {
    api
      .get<PrizeConfigResponse>("/api/admin/prizes/config")
      .then((res) => {
        setConfig(res.data);
        setKey(res.data.currentKeys.MONTHLY);
      })
      .catch((err) => setError(apiError(err)));
  }, []);

  const choosePeriod = (next: PrizePeriod) => {
    setPeriod(next);
    if (config) setKey(config.currentKeys[next]);
  };

  const load = async (targetPeriod = period, targetKey = key) => {
    if (!PRIZE_KEY_PATTERN[targetPeriod].test(targetKey)) return;
    setData(null);
    setError(null);
    try {
      const res = await api.get<PrizePeriodResponse>(`/api/admin/prizes/${targetPeriod}/${targetKey}`);
      setData(res.data);
    } catch (err) {
      setError(apiError(err));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, key]);

  const finalise = async () => {
    setFinalising(true);
    setError(null);
    try {
      const res = await api.post<PrizePeriodResponse>(`/api/admin/prizes/${period}/${key}/finalise`);
      setData(res.data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setFinalising(false);
    }
  };

  const replaceAward = (updated: PrizeAward) =>
    setData((current) =>
      current ? { ...current, awards: current.awards.map((a) => (a.id === updated.id ? updated : a)) } : current,
    );

  const savedTiers = (tiers: PrizeTier[]) => {
    setConfig((current) =>
      current
        ? { ...current, tiers: [...current.tiers.filter((tier) => tier.period !== period), ...tiers.map((tier) => ({ ...tier, period }))] }
        : current,
    );
    setData((current) => (current ? { ...current, tiers, winners: tiers.length } : current));
  };

  const periodTiers = config?.tiers.filter((tier) => tier.period === period) ?? [];

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 text-amber-500" aria-hidden /> Prizes
          </h3>
          <p className="text-xs text-muted">Configure what each winning place receives, then snapshot a period's winners.</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-subtle p-1" role="tablist" aria-label="Prize period">
          {PRIZE_PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              role="tab"
              aria-selected={period === p.value}
              onClick={() => choosePeriod(p.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                period === p.value
                  ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm"
                  : "text-muted hover:text-ink",
              )}
            >
              {tt(p.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <PrizeKeyInput period={period} value={key} onChange={setKey} />
        {data && data.range && (
          <p className="text-xs font-semibold text-muted">{formatDayRange(data.range.from, data.range.to)}</p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}

      {config && <PrizeConfigEditor key={period} period={period} tiers={periodTiers} onSaved={savedTiers} />}

      {!data && !error && <PageLoader />}

      {data && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-semibold">Winners &amp; awards</h4>
            <span className="text-xs text-muted">
              {data.winners} configured · {data.awards.length} awarded
            </span>
          </div>

          {data.awards.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted">
                No prizes have been awarded for {formatDayRange(data.range.from, data.range.to)} yet.
              </p>
              {data.winners > 0 ? (
                <Button loading={finalising} onClick={() => void finalise()}>
                  Award the top {data.winners} winners
                </Button>
              ) : (
                <p className="text-sm text-muted">Add at least one winner to the configuration first.</p>
              )}
            </div>
          ) : (
            <>
              <ul className="flex flex-col gap-3">
                {data.awards.map((a) => (
                  <PrizeRow key={a.id} award={a} onSaved={replaceAward} />
                ))}
              </ul>
              <Button variant="secondary" loading={finalising} onClick={() => void finalise()} className="self-start">
                Re-snapshot winners
              </Button>
            </>
          )}
        </div>
      )}

      {data && data.period === period && data.key === key && (
        <AwardForm
          key={`${period}-${key}`}
          period={period}
          periodKey={key}
          tiers={data.tiers}
          onGranted={() => void load()}
        />
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

const EMPTY_DRAFT = {
  name: "",
  region: "",
  city: "",
  category: "HISTORY" as DestinationCategory,
  tagline: "",
  summary: "",
  description: "",
  highlights: "",
  activities: "",
  bestTime: "October to March",
  gettingThere: "",
  entryFee: "",
  durationDays: "2",
  budgetLevel: "2",
  lat: "",
  lng: "",
  imageUrl: "",
  featured: false,
  tags: "",
};

type DraftForm = typeof EMPTY_DRAFT;

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function PlacesPanel() {
  const { user } = useAuth();
  const [places, setPlaces] = useState<AdminDestination[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftForm>(EMPTY_DRAFT);

  const canDelete = user?.role === "ADMIN";

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ destinations: AdminDestination[] }>("/api/admin/destinations")
      .then((res) => {
        if (!cancelled) setPlaces(res.data.destinations);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof DraftForm>(key: K) => (value: DraftForm[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSaved(null);

    const required: [keyof DraftForm, string][] = [
      ["name", "Name"],
      ["region", "Region"],
      ["tagline", "Tagline"],
      ["summary", "Summary"],
      ["description", "Description"],
      ["gettingThere", "Getting there"],
    ];
    for (const [key, label] of required) {
      if (!String(draft[key]).trim()) {
        setFormError(`${label} is required.`);
        return;
      }
    }

    const lat = Number(draft.lat);
    const lng = Number(draft.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setFormError("Latitude must be between -90 and 90.");
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setFormError("Longitude must be between -180 and 180.");
      return;
    }

    const payload: DestinationDraft = {
      name: draft.name.trim(),
      region: draft.region.trim(),
      city: draft.city.trim(),
      category: draft.category,
      tagline: draft.tagline.trim(),
      summary: draft.summary.trim(),
      description: draft.description.trim(),
      highlights: splitList(draft.highlights),
      activities: splitList(draft.activities),
      bestTime: draft.bestTime.trim(),
      gettingThere: draft.gettingThere.trim(),
      entryFee: draft.entryFee.trim(),
      durationDays: Math.max(1, Number(draft.durationDays) || 1),
      budgetLevel: Math.min(3, Math.max(1, Number(draft.budgetLevel) || 2)),
      lat,
      lng,
      imageUrl: draft.imageUrl.trim(),
      featured: draft.featured,
      tags: splitList(draft.tags),
    };

    setBusy(true);
    try {
      const res = await api.post<{ destination: AdminDestination }>("/api/admin/destinations", payload);
      setPlaces((list) => [res.data.destination, ...(list ?? [])]);
      setDraft(EMPTY_DRAFT);
      setSaved(`${payload.name} was added to Places to Visit.`);
    } catch (err) {
      setFormError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setDeleting(id);
    setError(null);
    try {
      await api.delete(`/api/admin/destinations/${id}`);
      setPlaces((list) => list?.filter((p) => p.id !== id) ?? list);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
      <Card className="flex flex-col gap-3 p-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <MapPin className="h-4 w-4 text-emerald-600" aria-hidden /> Places in the catalogue
        </h3>
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        {!places && !error && <PageLoader />}
        {places && places.length === 0 && <p className="text-sm text-muted">No places have been added yet.</p>}
        {places && places.length > 0 && (
          <ul className="flex max-h-[34rem] flex-col divide-y divide-line overflow-y-auto pr-1">
            {places.map((place) => (
              <li key={place.id} className="flex items-center gap-3 py-2.5">
                {place.imageUrl ? (
                  <img src={place.imageUrl} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
                    <MapPin className="h-5 w-5" aria-hidden />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-semibold">
                    {place.name}
                    {place.featured && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">Featured</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {place.region} · {place.stories} stories · {place.rating.toFixed(1)} rating
                  </p>
                  <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold", CATEGORY_TONE[place.category])}>
                    {place.category}
                  </span>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => void remove(place.id)}
                    disabled={deleting === place.id}
                    aria-label={`Delete ${place.name}`}
                    className="rounded-lg p-2 text-muted transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <Plus className="h-4 w-4 text-indigo-600" aria-hidden /> Add a place to visit
        </h3>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              Name
              <input value={draft.name} onChange={(e) => set("name")(e.target.value)} className={INPUT} maxLength={120} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              Region
              <input value={draft.region} onChange={(e) => set("region")(e.target.value)} className={INPUT} maxLength={60} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              City
              <input value={draft.city} onChange={(e) => set("city")(e.target.value)} className={INPUT} maxLength={80} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              Category
              <select
                value={draft.category}
                onChange={(e) => set("category")(e.target.value as DestinationCategory)}
                className={INPUT}
              >
                {CATEGORY_VALUES.map((category) => (
                  <option key={category} value={category}>
                    {category[0] + category.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Tagline
            <input value={draft.tagline} onChange={(e) => set("tagline")(e.target.value)} className={INPUT} maxLength={160} />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Summary
            <textarea value={draft.summary} onChange={(e) => set("summary")(e.target.value)} rows={2} className={cn(INPUT, "py-2")} maxLength={1000} />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Full description
            <textarea
              value={draft.description}
              onChange={(e) => set("description")(e.target.value)}
              rows={4}
              className={cn(INPUT, "py-2")}
              maxLength={4000}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              Highlights (comma separated)
              <input value={draft.highlights} onChange={(e) => set("highlights")(e.target.value)} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              Activities (comma separated)
              <input value={draft.activities} onChange={(e) => set("activities")(e.target.value)} className={INPUT} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              Best time to visit
              <input value={draft.bestTime} onChange={(e) => set("bestTime")(e.target.value)} className={INPUT} maxLength={160} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              Entry fee
              <input value={draft.entryFee} onChange={(e) => set("entryFee")(e.target.value)} className={INPUT} maxLength={160} />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Getting there
            <textarea value={draft.gettingThere} onChange={(e) => set("gettingThere")(e.target.value)} rows={2} className={cn(INPUT, "py-2")} maxLength={2000} />
          </label>

          <div className="grid gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              Days
              <input type="number" min={1} max={30} value={draft.durationDays} onChange={(e) => set("durationDays")(e.target.value)} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              Budget
              <select value={draft.budgetLevel} onChange={(e) => set("budgetLevel")(e.target.value)} className={INPUT}>
                <option value="1">Budget</option>
                <option value="2">Mid-range</option>
                <option value="3">Premium</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              Latitude
              <input value={draft.lat} onChange={(e) => set("lat")(e.target.value)} inputMode="decimal" className={INPUT} placeholder="9.145" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              Longitude
              <input value={draft.lng} onChange={(e) => set("lng")(e.target.value)} inputMode="decimal" className={INPUT} placeholder="40.489" />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Photo URL
            <input value={draft.imageUrl} onChange={(e) => set("imageUrl")(e.target.value)} className={INPUT} placeholder="https://…" />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Tags (comma separated)
            <input value={draft.tags} onChange={(e) => set("tags")(e.target.value)} className={INPUT} />
          </label>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={draft.featured}
              onChange={(e) => set("featured")(e.target.checked)}
              className="h-4 w-4 rounded border-line text-brand-700 focus:ring-brand-500"
            />
            Feature this place on the home list
          </label>

          {formError && <p role="alert" className="text-sm text-rose-600">{formError}</p>}
          {saved && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> {saved}
            </p>
          )}

          <Button type="submit" loading={busy} className="self-start">
            <Plus className="h-4 w-4" aria-hidden /> Add place
          </Button>
        </form>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Roles and permissions
// ---------------------------------------------------------------------------

function PermissionGrid({
  catalogue,
  selected,
  onToggle,
  disabled,
}: {
  catalogue: { key: string; label: string; group: string }[];
  selected: string[];
  onToggle: (key: string) => void;
  disabled?: boolean;
}) {
  const groups = new Map<string, { key: string; label: string; group: string }[]>();
  for (const permission of catalogue) {
    groups.set(permission.group, [...(groups.get(permission.group) ?? []), permission]);
  }

  return (
    <div className="flex flex-col gap-3">
      {[...groups.entries()].map(([group, permissions]) => (
        <div key={group}>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">{group}</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {permissions.map((permission) => {
              const on = selected.includes(permission.key);
              return (
                <button
                  key={permission.key}
                  type="button"
                  disabled={disabled}
                  aria-pressed={on}
                  onClick={() => onToggle(permission.key)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-70",
                    on
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200"
                      : "border-line bg-surface text-muted hover:text-ink",
                  )}
                >
                  {on ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden />
                  )}
                  {permission.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function RolesPanel() {
  const [data, setData] = useState<RolesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", label: "", description: "", permissions: [] as string[] });

  const load = async () => {
    try {
      const res = await api.get<RolesResponse>("/api/admin/roles");
      setData(res.data);
    } catch (err) {
      setError(apiError(err));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updatePermissions = async (role: AdminRole, permissions: string[]) => {
    setBusy(role.name);
    setError(null);
    try {
      await api.patch(`/api/admin/roles/${role.name}`, { permissions });
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(null);
    }
  };

  const toggle = (role: AdminRole, key: string) => {
    const next = role.permissions.includes(key)
      ? role.permissions.filter((permission) => permission !== key)
      : [...role.permissions, key];
    void updatePermissions(role, next);
  };

  const createRole = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.post("/api/admin/roles", {
        ...draft,
        description: draft.description || undefined,
      });
      setDraft({ name: "", label: "", description: "", permissions: [] });
      await load();
    } catch (err) {
      setError(apiError(err, "Could not create the role."));
    } finally {
      setCreating(false);
    }
  };

  const deleteRole = async (role: AdminRole) => {
    if (!window.confirm(`Delete the ${role.label} role?`)) return;
    setBusy(role.name);
    try {
      await api.delete(`/api/admin/roles/${role.name}`);
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(null);
    }
  };

  if (!data && !error) return <PageLoader />;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4 p-5">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <KeyRound className="h-4 w-4 text-violet-600" aria-hidden /> Roles & permissions
          </h3>
          <p className="text-xs text-muted">
            Toggle a capability to grant or remove it. Changes apply on the member's next request. The administrator
            role always keeps every permission.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-rose-600">
            {error}
          </p>
        )}

        {data?.roles.map((role) => (
          <section key={role.id} className="rounded-2xl border border-line p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-ink">
                  {role.label}
                  <span className="rounded-full bg-subtle px-2 py-0.5 text-[10px] font-bold text-muted">{role.name}</span>
                  {role.builtIn && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300">
                      Built-in
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-muted">
                    {role.members} {role.members === 1 ? "member" : "members"}
                  </span>
                </p>
                {role.description && <p className="text-xs text-muted">{role.description}</p>}
              </div>
              {!role.builtIn && (
                <Button
                  variant="danger"
                  className="min-h-8 px-2.5 text-xs"
                  disabled={busy === role.name}
                  onClick={() => void deleteRole(role)}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
                </Button>
              )}
            </div>
            <PermissionGrid
              catalogue={data.permissions}
              selected={role.permissions}
              onToggle={(key) => toggle(role, key)}
              disabled={busy === role.name || role.name === "ADMIN"}
            />
          </section>
        ))}
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <Plus className="h-4 w-4 text-emerald-600" aria-hidden /> New role
        </h3>
        <form onSubmit={(event) => void createRole(event)} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
              Key
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value.toUpperCase() })}
                placeholder="CONTENT_LEAD"
                className={INPUT}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
              Label
              <input
                required
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="Content lead"
                className={INPUT}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
              Description
              <input
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Optional"
                className={INPUT}
              />
            </label>
          </div>
          {data && (
            <PermissionGrid
              catalogue={data.permissions}
              selected={draft.permissions}
              onToggle={(key) =>
                setDraft({
                  ...draft,
                  permissions: draft.permissions.includes(key)
                    ? draft.permissions.filter((permission) => permission !== key)
                    : [...draft.permissions, key],
                })
              }
            />
          )}
          <Button type="submit" loading={creating} className="self-start">
            <Plus className="h-4 w-4" aria-hidden /> Create role
          </Button>
        </form>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

function AuditPanel() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api
      .get<AuditResponse>("/api/admin/audit", { params: { ...(search ? { q: search } : {}), ...(action ? { action } : {}) } })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [search, action]);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <ScrollText className="h-4 w-4 text-sky-600" aria-hidden /> Audit log
          </h3>
          <p className="text-xs text-muted">Every staff action is recorded with the actor, the target and the change.</p>
        </div>
        <span className="rounded-full bg-subtle px-3 py-1 text-xs font-bold text-muted">
          {data ? `${data.total} entries` : "…"}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search the audit log</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by actor, action or target"
            className={cn(INPUT, "pl-9")}
          />
        </label>
        <select value={action} onChange={(e) => setAction(e.target.value)} className={cn(INPUT, "sm:w-56")} aria-label="Filter by action">
          <option value="">All actions</option>
          {data?.actions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
      {!data && !error && <PageLoader />}
      {data && data.entries.length === 0 && (
        <EmptyState icon={ScrollText} title="No audit entries" description="Staff actions will appear here as they happen." />
      )}

      {data && data.entries.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {data.entries.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-1 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">
                  {entry.actorName}{" "}
                  <span className="font-normal text-muted">({entry.actorRole || "member"})</span>{" "}
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:bg-sky-400/15 dark:text-sky-300">
                    {entry.action}
                  </span>
                </p>
                <span className="text-xs text-muted">{timeAgo(entry.createdAt)}</span>
              </div>
              <p className="text-xs text-muted">
                {entry.targetType}
                {entry.targetId ? ` · ${entry.targetId}` : ""}
              </p>
              {entry.detail != null && (
                <pre className="overflow-x-auto rounded-lg bg-subtle px-3 py-2 text-[11px] text-muted">
                  {JSON.stringify(entry.detail, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Per-question answer report
// ---------------------------------------------------------------------------
/** Flattens the loaded answer report into a spreadsheet-friendly CSV. */
function downloadAnswersCsv(data: QuizAnswersResponse): void {
  const header = [
    "Member",
    "Username",
    "Email",
    "Role",
    "Day",
    "Play",
    "Play score",
    "Play correct",
    "Play questions",
    "Question #",
    "Question",
    "Category",
    "Answered",
    "Correct answer",
    "Result",
    "Points",
  ];
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const rows = data.entries.flatMap((entry) => {
    // The quiz awards 100 points spread evenly over the questions in a play.
    const points = entry.totalQuestions ? Math.round(100 / entry.totalQuestions) : 0;
    return entry.answers.map((answer, index) =>
      [
        entry.user.displayName,
        entry.user.username,
        entry.user.email,
        entry.user.role,
        entry.day,
        entry.playIndex + 1,
        entry.score,
        entry.correctCount,
        entry.totalQuestions,
        index + 1,
        answer.prompt,
        answer.category,
        answer.givenText,
        answer.correctText,
        answer.correct ? "correct" : "wrong",
        answer.correct ? points : 0,
      ]
        .map(escape)
        .join(","),
    );
  });
  const csv = [header.map(escape).join(","), ...rows].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `ethio-quest-answers-${data.day || "all-days"}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function AnswersPanel() {
  const [day, setDay] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<QuizAnswersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api
      .get<QuizAnswersResponse>("/api/admin/quiz-answers", {
        params: { ...(day ? { day } : {}), ...(search ? { q: search } : {}) },
      })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [day, search]);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <ClipboardList className="h-4 w-4 text-fuchsia-600" aria-hidden /> Answer details
          </h3>
          <p className="text-xs text-muted">Every scored answer by member, play and question, with the right answer.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Day (East Africa Time)
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={cn(INPUT, "min-h-9")} />
          </label>
          <Button
            variant="secondary"
            className="min-h-9 px-3 text-xs"
            disabled={!data || data.entries.length === 0}
            onClick={() => data && downloadAnswersCsv(data)}
          >
            Download CSV
          </Button>
        </div>
      </div>

      <label className="relative block">
        <span className="sr-only">Search by member</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by member name, username or email"
          className={cn(INPUT, "pl-9")}
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
      {!data && !error && <PageLoader />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-3 text-white">
              <p className="text-[11px] uppercase tracking-wide text-white/80">Plays</p>
              <p className="text-lg font-bold">{data.summary.plays}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 p-3 text-white">
              <p className="text-[11px] uppercase tracking-wide text-white/80">Questions</p>
              <p className="text-lg font-bold">{data.summary.questions}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-3 text-white">
              <p className="text-[11px] uppercase tracking-wide text-white/80">Correct</p>
              <p className="text-lg font-bold">{data.summary.correct}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-500 p-3 text-white">
              <p className="text-[11px] uppercase tracking-wide text-white/80">Accuracy</p>
              <p className="text-lg font-bold">{data.summary.accuracy}%</p>
            </div>
          </div>

          {data.hardest.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-400/20 dark:bg-amber-400/5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                Missed most often
              </p>
              <ul className="flex flex-col gap-1 text-xs">
                {data.hardest.slice(0, 4).map((row) => (
                  <li key={row.questionId} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-ink">{row.prompt}</span>
                    <span className="shrink-0 font-bold text-amber-700 dark:text-amber-300">{row.accuracy}% right</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.entries.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No completed plays"
              description="Finished plays for this day or member will show every answer here."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.entries.map((entry) => {
                const open = openId === entry.id;
                return (
                  <li key={entry.id} className="rounded-2xl border border-line">
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : entry.id)}
                      aria-expanded={open}
                      className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {entry.user.displayName} <span className="font-normal text-muted">@{entry.user.username}</span>
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {entry.day} · play {entry.playIndex + 1} · {entry.user.role}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-sm font-bold text-ink">
                        {entry.score}/100
                        <span className="block text-xs font-medium text-muted">
                          {entry.correctCount}/{entry.totalQuestions} correct · {formatDuration(entry.durationMs)}
                        </span>
                      </span>
                    </button>
                    {open && (
                      <ol className="flex flex-col divide-y divide-line border-t border-line">
                        {entry.answers.map((answer, index) => (
                          <li key={`${entry.id}-${answer.questionId}`} className="flex flex-col gap-1 px-3 py-2 text-xs">
                            <p className="flex items-start gap-2 font-semibold text-ink">
                              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-subtle text-[10px] font-black text-muted">
                                {index + 1}
                              </span>
                              <span className="min-w-0">{answer.prompt}</span>
                            </p>
                            <p className={cn("pl-7", answer.correct ? "text-emerald-700 dark:text-emerald-300" : "text-rose-600")}>
                              Answered: {answer.givenText} {answer.correct ? "✓" : "✗"}
                              <span className="ml-1.5 rounded-full bg-subtle px-1.5 py-0.5 text-[10px] font-bold text-muted">
                                {answer.correct
                                  ? `+${entry.totalQuestions ? Math.round(100 / entry.totalQuestions) : 0}`
                                  : "0"}{" "}
                                pts
                              </span>
                            </p>
                            {!answer.correct && <p className="pl-7 text-muted">Correct: {answer.correctText}</p>}
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Retry payments (3 ETB per extra daily quiz play)
// ---------------------------------------------------------------------------

const RETRY_METHOD_LABELS: Record<string, string> = {
  TELEBIRR: "Telebirr",
  CBE_BIRR: "CBE Birr",
  CASH: "Cash",
};

function RetriesPanel() {
  const [day, setDay] = useState("");
  const [report, setReport] = useState<QuizRetryReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api
      .get<QuizRetryReport>("/api/admin/retry-payments", { params: day ? { day } : {} })
      .then((res) => {
        if (!cancelled) setReport(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [day]);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <Banknote className="h-4 w-4 text-emerald-600" aria-hidden /> Quiz retry payments
          </h3>
          <p className="text-xs text-muted">
            Each extra daily play costs 3 ETB. Members confirm the payment themselves; this log is for review.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          Review day (East Africa Time)
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={cn(INPUT, "min-h-9")} />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
      {!report && !error && <PageLoader />}

      {report && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 text-white">
              <p className="text-[11px] uppercase tracking-wide text-white/80">Collected</p>
              <p className="text-lg font-bold">{formatEtb(report.totalEtb)}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 p-3 text-white">
              <p className="text-[11px] uppercase tracking-wide text-white/80">Retries</p>
              <p className="text-lg font-bold">{report.confirmedCount}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-3 text-white">
              <p className="text-[11px] uppercase tracking-wide text-white/80">Price</p>
              <p className="text-lg font-bold">{report.priceEtb} ETB</p>
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {report.day} · {report.count} recorded
          </p>

          {report.payments.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="No retry payments"
              description="Paid retries for the selected day will appear here as soon as members confirm them."
            />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {report.payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">
                      {payment.user.displayName}{" "}
                      <span className="font-normal text-muted">@{payment.user.username}</span>
                    </p>
                    <p className="truncate text-xs text-muted">
                      {payment.user.email} · play {payment.playIndex + 1}
                      {payment.reference ? ` · ref ${payment.reference}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-400/15 dark:text-violet-300">
                      {RETRY_METHOD_LABELS[payment.method] ?? payment.method}
                    </span>
                    <span className="text-xs text-muted">
                      {payment.attempt?.completedAt ? `score ${payment.attempt.score}` : "not finished"}
                    </span>
                    <span className="font-bold tabular-nums text-ink">{formatEtb(payment.amountEtb)}</span>
                    <span className="text-xs text-muted">{timeAgo(payment.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AdminPage() {
  const { user } = useAuth();
  const permitted = useMemo(() => {
    const keys = user?.permissions;
    // Without a permission list (older session) fall back to the staff roles.
    if (!keys) return TABS;
    return TABS.filter((entry) => keys.includes(entry.permission));
  }, [user?.permissions]);
  const [tab, setTab] = useState<AdminTab>(() => permitted[0]?.value ?? "overview");
  const show = (value: AdminTab) => permitted.some((entry) => entry.value === value);

  return (
    <div className="flex flex-col gap-5">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-6 text-white shadow-lift">
        <ShieldCheck className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 text-white/10" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Ethio Quest · Staff</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold sm:text-4xl">Admin dashboard</h1>
        <p className="mt-1 max-w-xl text-sm text-white/80">
          Member management, engagement reports, the leaderboard, prizes and the places catalogue in one place.
        </p>
        {user && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Signed in as {user.displayName} · {user.role}
          </p>
        )}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar" role="tablist" aria-label="Admin sections">
        {permitted.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
              tab === value
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md"
                : "border border-line bg-surface text-muted hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden /> {tt(label)}
          </button>
        ))}
      </div>

      {tab === "overview" && show("overview") && <OverviewPanel />}
      {tab === "users" && show("users") && <UsersPanel />}
      {tab === "roles" && show("roles") && <RolesPanel />}
      {tab === "audit" && show("audit") && <AuditPanel />}
      {tab === "leaderboard" && show("leaderboard") && <LeaderboardPanel />}
      {tab === "answers" && show("answers") && <AnswersPanel />}
      {tab === "prizes" && show("prizes") && <PrizesPanel />}
      {tab === "retries" && show("retries") && <RetriesPanel />}
      {tab === "places" && show("places") && <PlacesPanel />}
    </div>
  );
}
