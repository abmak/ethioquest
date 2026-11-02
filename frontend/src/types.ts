export type Role = "USER" | "MODERATOR" | "ADMIN";

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: Role;
  region: string | null;
  bio: string | null;
  avatarUrl?: string | null;
  /** Capabilities of the user's role, sent by the API for staff accounts. */
  permissions?: string[];
}

export type QuestionType = "CHOICE" | "TRUE_FALSE" | "MATCHING" | "IMAGE";

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  category: string;
  options: string[];
  imageUrl: string | null;
  matchLefts: string[];
  matchOptions: string[];
}

export interface QuizPlaySummary {
  playIndex: number;
  paid: boolean;
  score: number;
  correctCount: number;
  totalQuestions: number;
  durationMs: number | null;
  completedAt: string | null;
}

export interface QuizQuota {
  maxPlays: number;
  playsUsed: number;
  playsRemaining: number;
  freeAvailable: boolean;
  retryPriceEtb: number;
  exhausted: boolean;
}

export type RetryMethod = "TELEBIRR" | "CBE_BIRR" | "CASH";

export interface QuizPaymentSummary {
  playIndex: number;
  amountEtb: number;
  method: string;
  reference: string | null;
  status: string;
  createdAt: string;
}

export interface DailyQuizResponse {
  day: string;
  timeLimitSeconds: number;
  questions: QuizQuestion[];
  quota: QuizQuota;
  // Only an unfinished play; finished plays are listed in `plays`.
  attempt: { startedAt: string; playIndex: number; paid: boolean } | null;
  plays: QuizPlaySummary[];
  best: QuizPlaySummary | null;
  payments: QuizPaymentSummary[];
}

export interface RetryStartResponse {
  startedAt: string;
  playIndex: number;
  payment: { amountEtb: number; method: RetryMethod; status: string; createdAt: string };
}

export interface QuizRetryPayment {
  id: string;
  day: string;
  playIndex: number;
  amountEtb: number;
  method: RetryMethod;
  reference: string | null;
  status: string;
  createdAt: string;
  user: { username: string; displayName: string; email: string; region: string | null };
  attempt: { score: number; correctCount: number; completedAt: string | null } | null;
}

export interface QuizRetryReport {
  day: string;
  priceEtb: number;
  count: number;
  totalEtb: number;
  confirmedCount: number;
  payments: QuizRetryPayment[];
}

export interface QuizSubmitResponse {
  score: number;
  correctCount: number;
  totalQuestions: number;
  durationMs: number;
  timedOut: boolean;
  results: { questionId: string; correct: boolean }[];
}

export type LeaderboardPeriod = "daily" | "weekly" | "monthly";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  /** Points earned by every answered question in the period. */
  points: number;
  correctCount: number;
  questions: number;
  plays: number;
  /** Time spent answering all of those questions. */
  totalTimeMs: number;
  lastCompletedAt: string;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  key: string;
  range: DateRange;
  entries: LeaderboardEntry[];
}

export type DestinationCategory =
  | "HISTORY"
  | "HERITAGE"
  | "NATURE"
  | "WILDLIFE"
  | "ADVENTURE"
  | "CULTURE"
  | "CITY"
  | "FOOD";

export interface DestinationSummary {
  id: string;
  slug: string;
  name: string;
  region: string;
  city: string | null;
  category: DestinationCategory;
  tagline: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  featured: boolean;
  budgetLevel: number;
  durationDays: number;
}

export interface Destination extends DestinationSummary {
  summary: string;
  description: string;
  imageCredit: string | null;
  tags: string[];
  highlights: string[];
  activities: string[];
  bestTime: string;
  gettingThere: string;
  entryFee: string | null;
  lat: number;
  lng: number;
  gallery: string[];
  experiences: {
    id: string;
    title: string;
    rating: number | null;
    createdAt: string;
    author: { username: string; displayName: string };
  }[];
}

export interface Recommendation extends DestinationSummary {
  summary: string;
  description: string;
  highlights: string[];
  activities: string[];
  bestTime: string;
  gettingThere: string;
  entryFee: string | null;
  tags: string[];
  lat: number;
  lng: number;
  score: number;
  reasons: string[];
  why: string;
  distanceKm: number | null;
}

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

export interface RouteStep {
  instruction: string;
  road: string;
  distanceMeters: number;
  durationSeconds: number;
  type: string;
  modifier: string | null;
}

export interface DrivingRoute {
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  geometry: [number, number][];
  steps: RouteStep[];
}

export interface ExperienceAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  followedByMe?: boolean;
}

export interface ExperiencePost {
  id: string;
  title: string;
  body: string;
  destinationId: string | null;
  destinationName: string;
  region: string;
  rating: number | null;
  travelDate: string | null;
  imageUrls: string[];
  likeCount: number;
  commentCount: number;
  createdAt: string;
  author: ExperienceAuthor;
  likedByMe: boolean;
}

export interface ExperienceComment {
  id: string;
  body: string;
  createdAt: string;
  author: ExperienceAuthor;
}

export interface ExperienceDetail extends ExperiencePost {
  comments: ExperienceComment[];
}

export interface LeaderboardReportEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  email: string;
  region: string | null;
  banned: boolean;
  points: number;
  correctCount: number;
  questions: number;
  plays: number;
  totalTimeMs: number;
  lastCompletedAt: string | null;
  attemptsAllTime: number;
  averageScore: number;
}

export interface DateRange {
  /** Calendar day or first day, as YYYY-MM-DD. */
  from: string;
  /** Calendar day or last day, as YYYY-MM-DD. */
  to: string;
}

export interface LeaderboardReport {
  period: LeaderboardPeriod;
  key: string;
  range: DateRange;
  summary: { completed: number; averageScore: number; topScore: number };
  entries: LeaderboardReportEntry[];
}

export type PrizeStatus = "PENDING" | "PAID" | "VOID";

/** Which leaderboard period a prize is won for. */
export type PrizePeriod = "DAILY" | "WEEKLY" | "MONTHLY";

/** One configured winning place: its rank, prize and optional photo. */
export interface PrizeTier {
  id?: string;
  period?: PrizePeriod;
  rank: number;
  name: string;
  description: string | null;
  amountEtb: number | null;
  imageUrl: string | null;
}

export interface PrizeAward {
  id: string;
  period: PrizePeriod;
  periodKey: string;
  rank: number;
  userId: string;
  name: string;
  description: string | null;
  amountEtb: number | null;
  imageUrl: string | null;
  status: PrizeStatus;
  note: string | null;
  awardedAt: string;
  user: { username: string; displayName: string; email: string };
}

export interface PrizeConfigResponse {
  periods: PrizePeriod[];
  currentKeys: Record<PrizePeriod, string>;
  tiers: PrizeTier[];
}

/** A configured prize with the period it is awarded for, as members see it. */
export interface PublicPrizeTier extends PrizeTier {
  period: PrizePeriod;
}

export interface PrizeTypesResponse {
  periods: PrizePeriod[];
  currentKeys: Record<PrizePeriod, string>;
  ranges: Record<PrizePeriod, DateRange>;
  tiers: PublicPrizeTier[];
}

export interface PrizePeriodResponse {
  period: PrizePeriod;
  key: string;
  range: DateRange;
  winners: number;
  tiers: PrizeTier[];
  awards: PrizeAward[];
}

// ---------------------------------------------------------------------------
// Community: people, follows and direct messages
// ---------------------------------------------------------------------------

export interface Member {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  region: string | null;
  bio: string | null;
  followers: number;
  stories: number;
  followedByMe: boolean;
}

export interface MemberProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  region: string | null;
  bio: string | null;
  followers: number;
  following: number;
  followedByMe: boolean;
  isMe: boolean;
  stories: {
    id: string;
    title: string;
    imageUrls: string[];
    createdAt: string;
    likeCount: number;
    commentCount: number;
  }[];
}

export interface ConversationSummary {
  member: Omit<Member, "followers" | "stories" | "followedByMe">;
  lastMessage: { body: string; createdAt: string; mine: boolean };
  unread: number;
}

export interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
}

export interface UploadedPhoto {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface AdminOverview {
  totals: {
    users: number;
    banned: number;
    posts: number;
    comments: number;
    likes: number;
    follows: number;
    messages: number;
    destinations: number;
    attempts: number;
    newUsers30d: number;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  /** Role name: USER, MODERATOR, ADMIN or a custom role. */
  role: string;
  region: string | null;
  banned: boolean;
  avatarUrl: string | null;
  createdAt: string;
  stories: number;
  attempts: number;
  followers: number;
  following: number;
  messagesSent: number;
}

export interface AdminPermission {
  key: string;
  label: string;
  group: string;
}

export interface AdminRole {
  id: string;
  name: string;
  label: string;
  description: string | null;
  permissions: string[];
  builtIn: boolean;
  members: number;
  createdAt: string;
  updatedAt: string;
}

export interface RolesResponse {
  permissions: AdminPermission[];
  roles: AdminRole[];
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  detail: unknown;
  createdAt: string;
}

export interface AuditResponse {
  entries: AuditLogEntry[];
  total: number;
  actions: string[];
}

export interface QuizAnswerRow {
  questionId: string;
  prompt: string;
  category: string;
  type: string;
  givenText: string;
  correctText: string;
  correct: boolean;
}

export interface QuizAnswerEntry {
  id: string;
  userId: string;
  user: { username: string; displayName: string; email: string; role: string };
  day: string;
  playIndex: number;
  score: number;
  correctCount: number;
  totalQuestions: number;
  durationMs: number | null;
  completedAt: string;
  answers: QuizAnswerRow[];
}

export interface QuizAnswersResponse {
  day: string;
  filters: { userId: string; q: string };
  summary: { plays: number; questions: number; correct: number; accuracy: number };
  hardest: { questionId: string; prompt: string; category: string; wrong: number; total: number; accuracy: number }[];
  entries: QuizAnswerEntry[];
}

export interface InteractionReport {
  topPlaces: { id: string; name: string; region: string; stories: number }[];
  topStories: {
    id: string;
    title: string;
    likeCount: number;
    commentCount: number;
    createdAt: string;
    author: { displayName: string; username: string };
  }[];
  dailyStories: { day: string; count: number }[];
}

export interface AdminDestination {
  id: string;
  slug: string;
  name: string;
  region: string;
  category: DestinationCategory;
  imageUrl: string;
  featured: boolean;
  rating: number;
  createdAt: string;
  stories: number;
}

export interface DestinationDraft {
  name: string;
  region: string;
  city: string;
  category: DestinationCategory;
  tagline: string;
  summary: string;
  description: string;
  highlights: string[];
  activities: string[];
  bestTime: string;
  gettingThere: string;
  entryFee: string;
  durationDays: number;
  budgetLevel: number;
  lat: number;
  lng: number;
  imageUrl: string;
  featured: boolean;
  tags: string[];
}
