import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Search,
  Send,
  Sparkles,
  UserPlus,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { Button, Card, EmptyState, PageLoader, SectionHeading } from "../components/ui";
import { api, apiError } from "../lib/api";
import { cn, initials, timeAgo } from "../lib/utils";
import { useAuth } from "../store/auth";
import type { ChatMessage, ConversationSummary, Member, MemberProfile } from "../types";

/** Circular avatar with a vivid gradient ring and initials fallback. */
export function Avatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const dimensions = {
    sm: "h-9 w-9 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-16 w-16 text-lg",
    xl: "h-24 w-24 text-2xl",
  }[size];

  return (
    <span className="avatar-ring inline-flex shrink-0 rounded-full">
      <span
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-full bg-surface font-bold text-ink",
          dimensions,
        )}
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          initials(name)
        )}
      </span>
    </span>
  );
}

/** Follow/Unfollow toggle that talks to /api/social/follow/:id. */
export function FollowButton({
  memberId,
  initial,
  onChange,
  compact,
}: {
  memberId: string;
  initial: boolean;
  onChange?: (followed: boolean, followers: number) => void;
  compact?: boolean;
}) {
  const [followed, setFollowed] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setFollowed(initial), [initial]);

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = followed
        ? await api.delete<{ followedByMe: boolean; followers: number }>(`/api/social/follow/${memberId}`)
        : await api.post<{ followedByMe: boolean; followers: number }>(`/api/social/follow/${memberId}`);
      setFollowed(res.data.followedByMe);
      onChange?.(res.data.followedByMe, res.data.followers);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        aria-pressed={followed}
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition disabled:opacity-60",
          compact && "min-h-8 px-2.5",
          followed
            ? "border border-violet-300 bg-violet-50 text-violet-700 hover:border-rose-300 hover:text-rose-600 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-200"
            : "bg-gradient-to-br from-fuchsia-600 to-orange-500 text-white shadow-sm hover:shadow-md",
        )}
      >
        {followed ? <UserRoundCheck className="h-3.5 w-3.5" aria-hidden /> : <UserPlus className="h-3.5 w-3.5" aria-hidden />}
        {followed ? "Following" : "Follow"}
      </button>
      {error && <span className="text-[11px] text-rose-600">{error}</span>}
    </span>
  );
}

function MemberCard({ member, onChanged }: { member: Member; onChanged: (member: Member) => void }) {
  const navigate = useNavigate();
  return (
    <Card className="card-interactive flex flex-col gap-3 border-t-4 border-t-fuchsia-400 p-4">
      <div className="flex items-start gap-3">
        <Link to={`/u/${member.username}`} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500">
          <Avatar name={member.displayName} src={member.avatarUrl} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/u/${member.username}`} className="block truncate font-bold text-ink hover:text-fuchsia-700">
            {member.displayName}
          </Link>
          <p className="truncate text-xs text-muted">
            @{member.username}
            {member.region ? ` · ${member.region}` : ""}
          </p>
        </div>
      </div>
      {member.bio && <p className="line-clamp-2 text-sm text-muted">{member.bio}</p>}
      <div className="flex items-center gap-3 text-xs font-semibold text-muted">
        <span className="text-fuchsia-700">{member.followers} followers</span>
        <span className="text-teal-700">{member.stories} stories</span>
      </div>
      <div className="mt-auto flex items-center gap-2">
        <FollowButton
          memberId={member.id}
          initial={member.followedByMe}
          onChange={(followed, followers) => onChanged({ ...member, followedByMe: followed, followers })}
        />
        <Button
          variant="secondary"
          className="min-h-9 px-3 text-xs"
          onClick={() => navigate(`/messages/${member.id}`)}
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          Message
        </Button>
      </div>
    </Card>
  );
}

export function PeoplePage() {
  const [people, setPeople] = useState<Member[] | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setPeople(null);
    setError(null);
    api
      .get<{ people: Member[] }>("/api/social/people", { params: { ...(search ? { q: search } : {}) } })
      .then((res) => {
        if (!cancelled) setPeople(res.data.people);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [search]);

  const update = (member: Member) =>
    setPeople((list) => (list ? list.map((m) => (m.id === member.id ? member : m)) : list));

  return (
    <div className="flex flex-col gap-5">
      <div className="hero-mesh rounded-3xl p-6 text-white shadow-lift sm:p-8">
        <div className="flex flex-col gap-2">
          <p className="kicker text-white/80">Community</p>
          <h1 className="font-display text-2xl font-extrabold sm:text-4xl">Travellers to meet</h1>
          <p className="max-w-xl text-sm text-white/85 sm:text-base">
            Follow the people whose journeys you enjoy, and send them a direct message.
          </p>
        </div>
      </div>

      <label className="relative block">
        <span className="sr-only">Search members</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-500" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, username or region"
          className="w-full rounded-2xl border border-line bg-surface py-3 pl-10 pr-3 text-base outline-none focus:border-violet-500"
        />
      </label>

      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {!people && !error && <PageLoader label="Finding travellers…" />}
      {people && people.length === 0 && (
        <EmptyState icon={Users} title="No members found" description="Try a different name or region." />
      )}
      {people && people.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((member) => (
            <li key={member.id}>
              <MemberCard member={member} onChanged={update} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  return (
    <li className={cn("flex", message.mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
          message.mine
            ? "rounded-br-md bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white"
            : "rounded-bl-md border border-line bg-surface text-ink",
        )}
      >
        <p className="whitespace-pre-line break-words">{message.body}</p>
        <p className={cn("mt-1 text-[10px]", message.mine ? "text-white/70" : "text-muted")}>
          {timeAgo(message.createdAt)}
        </p>
      </div>
    </li>
  );
}

function Thread({ userId }: { userId: string }) {
  const [member, setMember] = useState<(MemberProfile | { id: string; displayName: string; username: string; avatarUrl: string | null; followedByMe: boolean }) | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMessages(null);
    setError(null);
    api
      .get<{ member: typeof member; messages: ChatMessage[] }>(`/api/social/messages/${userId}`)
      .then((res) => {
        if (cancelled) return;
        setMember(res.data.member);
        setMessages(res.data.messages);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ message: ChatMessage }>(`/api/social/messages/${userId}`, { body });
      setMessages((current) => [...(current ?? []), res.data.message]);
      setDraft("");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  if (error && !member) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-sm text-rose-600">{error}</p>
        <Link to="/messages" className="text-sm font-semibold text-violet-700">Back to messages</Link>
      </div>
    );
  }
  if (!member || !messages) return <PageLoader label="Opening the conversation…" />;

  return (
    <div className="flex h-full min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="flex items-center gap-3 border-b border-line bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50 px-4 py-3 dark:from-violet-500/10 dark:via-fuchsia-500/10 dark:to-sky-500/10">
        <Link
          to="/messages"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface/80 text-muted hover:text-violet-700 lg:hidden"
          aria-label="Back to messages"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link to={`/u/${member.username}`} className="flex min-w-0 items-center gap-2.5">
          <Avatar name={member.displayName} src={member.avatarUrl} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-bold text-ink">{member.displayName}</span>
            <span className="block truncate text-xs text-muted">@{member.username}</span>
          </span>
        </Link>
        <div className="ml-auto">
          <FollowButton memberId={member.id} initial={Boolean(member.followedByMe)} compact />
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-2 overflow-y-auto bg-raised/30 p-4">
        {messages.length === 0 && (
          <li className="mx-auto my-auto max-w-xs text-center text-sm text-muted">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-fuchsia-500" aria-hidden />
            Say hello and ask about their favourite Ethiopian place.
          </li>
        )}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </ul>

      {error && <p role="alert" className="px-4 pt-2 text-xs text-rose-600">{error}</p>}

      <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(event);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Write a message…"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface px-3 py-2.5 text-base outline-none focus:border-violet-500"
        />
        <Button type="submit" loading={busy} disabled={!draft.trim()} className="min-h-11 px-4">
          <Send className="h-4 w-4" aria-hidden />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}

function ConversationList({ activeId }: { activeId?: string }) {
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ conversations: ConversationSummary[] }>("/api/social/messages")
      .then((res) => {
        if (!cancelled) setConversations(res.data.conversations);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  return (
    <div className="flex flex-col gap-2">
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {!conversations && !error && <PageLoader label="Loading conversations…" />}
      {conversations && conversations.length === 0 && (
        <EmptyState
          icon={MessageCircle}
          title="No messages yet"
          description="Find a traveller you follow and say hello."
          action={
            <Link to="/people">
              <Button variant="secondary">Find people</Button>
            </Link>
          }
        />
      )}
      {conversations && conversations.length > 0 && (
        <ul className="flex flex-col gap-1">
          {conversations.map((conversation) => (
            <li key={conversation.member.id}>
              <Link
                to={`/messages/${conversation.member.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition",
                  activeId === conversation.member.id
                    ? "border-violet-300 bg-violet-50 dark:border-violet-400/30 dark:bg-violet-500/10"
                    : "border-transparent hover:border-line hover:bg-raised",
                )}
              >
                <Avatar name={conversation.member.displayName} src={conversation.member.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold text-ink">
                      {conversation.member.displayName}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted">{timeAgo(conversation.lastMessage.createdAt)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted">
                      {conversation.lastMessage.mine ? "You: " : ""}
                      {conversation.lastMessage.body}
                    </span>
                    {conversation.unread > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                        {conversation.unread}
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MessagesPage() {
  const { userId } = useParams<{ userId: string }>();

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading
        title="Direct messages"
        description="Private conversations with other travellers."
        action={
          <Link to="/people" className="hidden sm:block">
            <Button variant="secondary" className="min-h-10 px-3 text-xs">
              <Users className="h-4 w-4" aria-hidden />
              Find people
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <div className={cn("min-w-0", userId && "hidden lg:block")}>
          <Card className="p-3">
            <ConversationList activeId={userId} />
          </Card>
        </div>
        <div className={cn("min-w-0", !userId && "hidden lg:block")}>
          {userId ? (
            <Thread userId={userId} />
          ) : (
            <Card className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 border-dashed text-center">
              <MessageCircle className="h-8 w-8 text-violet-500" aria-hidden />
              <p className="font-semibold text-ink">Choose a conversation</p>
              <p className="max-w-xs text-sm text-muted">Your messages stay private between you and the traveller.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setError(null);
    api
      .get<{ profile: MemberProfile }>(`/api/social/profile/${username}`)
      .then((res) => {
        if (!cancelled) setProfile(res.data.profile);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-sm text-rose-600">{error}</p>
        <Link to="/people" className="text-sm font-semibold text-violet-700">Back to people</Link>
      </div>
    );
  }
  if (!profile) return <PageLoader />;

  return (
    <div className="flex flex-col gap-5">
      <div className="hero-mesh rounded-3xl p-6 text-white shadow-lift sm:p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Avatar name={profile.displayName} src={profile.avatarUrl} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{profile.displayName}</h1>
            <p className="text-sm text-white/80">
              @{profile.username}
              {profile.region ? ` · ${profile.region}` : ""}
            </p>
            {profile.bio && <p className="mt-2 max-w-lg text-sm text-white/90">{profile.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
              <span className="glass px-3 py-1.5">{profile.followers} followers</span>
              <span className="glass px-3 py-1.5">{profile.following} following</span>
              <span className="glass px-3 py-1.5">{profile.stories.length} stories</span>
            </div>
          </div>
          {!profile.isMe && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/95 p-0.5">
                <FollowButton
                  memberId={profile.id}
                  initial={profile.followedByMe}
                  onChange={(followed, followers) =>
                    setProfile((current) => (current ? { ...current, followedByMe: followed, followers } : current))
                  }
                />
              </span>
              <Link to={`/messages/${profile.id}`}>
                <Button className="min-h-9 bg-white/95 px-3 text-xs text-violet-800 hover:bg-white">
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                  Message
                </Button>
              </Link>
            </div>
          )}
          {profile.isMe && user && (
            <Link to="/experiences/new">
              <Button className="min-h-9 bg-white/95 px-3 text-xs text-violet-800 hover:bg-white">Share a story</Button>
            </Link>
          )}
        </div>
      </div>

      <h2 className="font-display text-lg font-bold">Latest stories</h2>
      {profile.stories.length === 0 ? (
        <EmptyState icon={Sparkles} title="No stories yet" description={`${profile.displayName} has not shared a trip yet.`} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profile.stories.map((story) => (
            <li key={story.id}>
              <Link to={`/experiences/${story.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500">
                <Card className="card-interactive overflow-hidden p-0">
                  {story.imageUrls[0] ? (
                    <img src={story.imageUrls[0]} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-rose-400 via-orange-400 to-amber-300">
                      <Sparkles className="h-8 w-8 text-white/80" aria-hidden />
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="line-clamp-2 font-semibold text-ink">{story.title}</h3>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" aria-hidden /> {story.likeCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden /> {story.commentCount}
                      </span>
                      <span className="ml-auto">{timeAgo(story.createdAt)}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
