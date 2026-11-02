import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  ImagePlus,
  MessageCircle,
  Mic,
  Search,
  Send,
  Smile,
  Sparkles,
  Square,
  UserPlus,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import { Button, Card, EmptyState, PageLoader, SectionHeading } from "../components/ui";
import { api, apiError } from "../lib/api";
import { cn, initials, timeAgo } from "../lib/utils";
import { useAuth } from "../store/auth";
import type {
  ChatMessage,
  ConversationSummary,
  Member,
  MemberProfile,
  UploadedPhoto,
} from "../types";

// Emoji offered by the composer's picker: the ones a chat in Ethiopia reaches
// for first, not the full Unicode table.
const CHAT_EMOJI = [
  "😀", "😄", "😅", "😂", "🙂", "😉", "😍", "😘",
  "🤗", "🤔", "😎", "🥳", "😢", "😭", "😡", "🙏",
  "👍", "👏", "💪", "🔥", "🎉", "❤️", "💚", "✨",
  "☕", "🍲", "🎬", "🎵", "⚽", "📚", "🌄", "🇪🇹",
];

// Five minutes fits well inside the upload limit and keeps a thread light.
const MAX_VOICE_SECONDS = 300;

const clock = (totalSeconds: number) =>
  `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;

interface PendingVoice {
  url: string;
  previewUrl: string;
  durationMs: number;
}

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
  const hasMedia = Boolean(message.imageUrl || message.audioUrl);
  return (
    <li className={cn("flex", message.mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl text-sm shadow-sm",
          hasMedia ? "p-2" : "px-3.5 py-2",
          message.mine
            ? "rounded-br-md bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white"
            : "rounded-bl-md border border-line bg-surface text-ink",
        )}
      >
        {message.imageUrl && (
          <a href={message.imageUrl} target="_blank" rel="noreferrer" className="block">
            <img
              src={message.imageThumbnailUrl ?? message.imageUrl}
              alt=""
              loading="lazy"
              className="max-h-72 w-full min-w-32 rounded-xl object-cover"
            />
          </a>
        )}
        {message.audioUrl && (
          <audio controls preload="metadata" src={message.audioUrl} className="mt-1 w-64 max-w-full" />
        )}
        {message.body && (
          <p className={cn("whitespace-pre-line break-words", hasMedia && "px-1.5 pt-1.5")}>
            {message.body}
          </p>
        )}
        <p
          className={cn(
            "px-1.5 pb-0.5 pt-1 text-[10px]",
            message.mine ? "text-white/70" : "text-muted",
          )}
        >
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
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [voice, setVoice] = useState<PendingVoice | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const elapsedRef = useRef(0);
  const discardRef = useRef(false);

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

  // A running recording keeps its own clock; the ref lets the stop handler know
  // how long the clip was without re-reading stale state.
  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= MAX_VOICE_SECONDS) {
        setRecording(false);
        recorderRef.current?.stop();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  useEffect(
    () => () => {
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const addEmoji = (emoji: string) => {
    const field = textareaRef.current;
    const start = field?.selectionStart ?? draft.length;
    const end = field?.selectionEnd ?? draft.length;
    setDraft(`${draft.slice(0, start)}${emoji}${draft.slice(end)}`.slice(0, 2000));
    field?.focus();
    const caret = Math.min(start + emoji.length, 2000);
    requestAnimationFrame(() => field?.setSelectionRange(caret, caret));
  };

  const pickPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("files", file);
      const res = await api.post<{ photos: UploadedPhoto[] }>("/api/media", form);
      setPhoto(res.data.photos[0] ?? null);
    } catch (err) {
      setError(apiError(err, "That photo could not be uploaded."));
    } finally {
      setUploading(false);
    }
  };

  const uploadVoice = async (blob: Blob) => {
    if (discardRef.current) {
      discardRef.current = false;
      return;
    }
    const durationMs = elapsedRef.current * 1000;
    setUploading(true);
    setError(null);
    try {
      const extension = blob.type.includes("mp4") ? "m4a" : "webm";
      const form = new FormData();
      form.append(
        "file",
        new File([blob], `voice-${Date.now()}.${extension}`, { type: blob.type || "audio/webm" }),
      );
      const res = await api.post<{ audio: { url: string } }>("/api/media/audio", form);
      setVoice({ url: res.data.audio.url, previewUrl: URL.createObjectURL(blob), durationMs });
    } catch (err) {
      setError(apiError(err, "That voice note could not be uploaded."));
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice notes need HTTPS or a browser with a microphone.");
      return;
    }
    setError(null);
    setShowEmoji(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        void uploadVoice(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
      };
      recorderRef.current = recorder;
      discardRef.current = false;
      elapsedRef.current = 0;
      setElapsed(0);
      setRecording(true);
      recorder.start();
    } catch {
      setError("Allow microphone access to record a voice note.");
    }
  };

  const stopRecording = () => {
    setRecording(false);
    recorderRef.current?.stop();
  };

  const cancelRecording = () => {
    discardRef.current = true;
    setRecording(false);
    recorderRef.current?.stop();
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body && !photo && !voice) return;
    if (uploading || recording) return;
    setBusy(true);
    setError(null);
    try {
      const payload: {
        body?: string;
        imageUrl?: string;
        imageThumbnailUrl?: string;
        audioUrl?: string;
        audioDurationMs?: number;
      } = {};
      if (body) payload.body = body;
      if (photo) {
        payload.imageUrl = photo.url;
        payload.imageThumbnailUrl = photo.thumbnailUrl;
      }
      if (voice) {
        payload.audioUrl = voice.url;
        payload.audioDurationMs = voice.durationMs;
      }
      const res = await api.post<{ message: ChatMessage }>(`/api/social/messages/${userId}`, payload);
      setMessages((current) => [...(current ?? []), res.data.message]);
      setDraft("");
      setPhoto(null);
      if (voice) URL.revokeObjectURL(voice.previewUrl);
      setVoice(null);
      setShowEmoji(false);
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

      <form onSubmit={send} className="border-t border-line p-3">
        {(photo || voice) && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {photo && (
              <span className="relative h-16 w-20 overflow-hidden rounded-xl border border-line">
                <img src={photo.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-rose-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {voice && (
              <span className="flex items-center gap-2 rounded-xl border border-line bg-raised/60 px-2 py-1.5">
                <audio controls src={voice.previewUrl} className="h-8 w-44" />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(voice.previewUrl);
                    setVoice(null);
                  }}
                  aria-label="Remove voice note"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-rose-50 hover:text-rose-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {uploading && <span className="text-xs text-muted">Uploading…</span>}
          </div>
        )}

        {recording ? (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-3 py-2.5 dark:border-rose-400/40 dark:bg-rose-500/10">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-600" aria-hidden />
            <span className="font-mono text-sm font-semibold text-rose-700 dark:text-rose-300">
              {clock(elapsed)}
            </span>
            <span className="text-xs text-rose-700/80 dark:text-rose-200/80">Recording…</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                aria-label="Cancel recording"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-rose-700 hover:bg-rose-100 dark:text-rose-200 dark:hover:bg-rose-500/20"
              >
                <X className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={stopRecording}
                aria-label="Stop recording"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white hover:bg-rose-700"
              >
                <Square className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-1.5">
            <div className="relative">
              {showEmoji && (
                <div className="absolute bottom-12 left-0 z-20 grid w-64 grid-cols-8 gap-0.5 rounded-2xl border border-line bg-surface p-2 shadow-xl">
                  {CHAT_EMOJI.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => addEmoji(emoji)}
                      className="rounded-lg p-1 text-lg leading-none hover:bg-subtle"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowEmoji((open) => !open)}
                aria-label="Emoji"
                aria-expanded={showEmoji}
                className="flex h-11 w-10 items-center justify-center rounded-xl text-muted hover:bg-subtle hover:text-violet-700"
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Photo"
              disabled={uploading || Boolean(photo)}
              className="flex h-11 w-10 items-center justify-center rounded-xl text-muted hover:bg-subtle hover:text-violet-700 disabled:opacity-40"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => void startRecording()}
              aria-label="Record a voice note"
              disabled={uploading || Boolean(voice)}
              className="flex h-11 w-10 items-center justify-center rounded-xl text-muted hover:bg-subtle hover:text-violet-700 disabled:opacity-40"
            >
              <Mic className="h-5 w-5" />
            </button>
            <textarea
              ref={textareaRef}
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
            <Button
              type="submit"
              loading={busy}
              disabled={(!draft.trim() && !photo && !voice) || uploading}
              className="min-h-11 px-4"
            >
              <Send className="h-4 w-4" aria-hidden />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => void pickPhoto(event)}
        />
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
                      {conversation.lastMessage.body ||
                        (conversation.lastMessage.hasVoice
                          ? "Voice note"
                          : conversation.lastMessage.hasPhoto
                            ? "Photo"
                            : "")}
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
