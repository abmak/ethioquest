import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Camera, Heart, ImagePlus, MapPin, MessageCircle, Sparkles, Star, Trash2, X } from "lucide-react";
import { Button, Card, EmptyState, PageLoader, SectionHeading } from "../components/ui";
import { api, apiError } from "../lib/api";
import { cn, timeAgo } from "../lib/utils";
import { useAuth } from "../store/auth";
import { Avatar, FollowButton } from "./Social";
import type { ExperienceComment, ExperienceDetail, ExperiencePost, UploadedPhoto } from "../types";

const FIELD =
  "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-400/10";

function AuthorRow({ author, time }: { author: ExperiencePost["author"]; time: string }) {
  const { user } = useAuth();
  return (
    <div className="flex items-center gap-2.5">
      <Link to={`/u/${author.username}`} className="shrink-0">
        <Avatar name={author.displayName} src={author.avatarUrl} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/u/${author.username}`} className="block truncate text-sm font-bold text-ink hover:text-rose-600">
          {author.displayName}
        </Link>
        <p className="truncate text-xs text-muted">@{author.username} · {time}</p>
      </div>
      {user?.id !== author.id && (
        <FollowButton memberId={author.id} initial={Boolean(author.followedByMe)} compact />
      )}
    </div>
  );
}

function PostCard({ post }: { post: ExperiencePost }) {
  const image = post.imageUrls[0];
  return (
    <Card className="card-interactive flex h-full flex-col overflow-hidden p-0">
      <div className="p-4 pb-3">
        <AuthorRow author={post.author} time={timeAgo(post.createdAt)} />
      </div>

      <Link to={`/experiences/${post.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
        {image ? (
          <div className="relative">
            <img src={image} alt="" loading="lazy" className="aspect-[16/10] w-full object-cover" />
            {post.imageUrls.length > 1 && (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-bold text-white backdrop-blur">
                <Camera className="h-3 w-3" aria-hidden /> {post.imageUrls.length}
              </span>
            )}
          </div>
        ) : (
          <div className="flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br from-rose-400 via-orange-400 to-amber-300">
            <Sparkles className="h-10 w-10 text-white/85" aria-hidden />
          </div>
        )}

        <div className="flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-teal-800 dark:bg-teal-500/10 dark:text-teal-200">
              <MapPin className="h-3 w-3" aria-hidden /> {post.destinationName}
            </span>
            <span className="rounded-full bg-raised px-2 py-1 text-muted">{post.region}</span>
            {post.rating && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                <Star className="h-3 w-3 fill-current" aria-hidden /> {post.rating}/5
              </span>
            )}
          </div>
          <h3 className="font-display text-lg font-bold leading-snug text-ink">{post.title}</h3>
          <p className="line-clamp-3 text-sm text-muted">{post.body}</p>
        </div>
      </Link>

      <div className="mt-auto flex items-center gap-4 border-t border-line px-4 py-3 text-sm text-muted">
        <span className="flex items-center gap-1.5">
          <Heart className={post.likedByMe ? "h-4 w-4 fill-rose-500 text-rose-500" : "h-4 w-4"} aria-hidden />
          {post.likeCount}
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4" aria-hidden />
          {post.commentCount}
        </span>
        <Link
          to={`/messages/${post.author.id}`}
          className="ml-auto flex items-center gap-1.5 text-xs font-bold text-violet-700 hover:underline dark:text-violet-300"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          Message
        </Link>
      </div>
    </Card>
  );
}

export function ExperiencesPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ExperiencePost[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ posts: ExperiencePost[]; nextCursor: string | null }>("/api/experiences")
      .then((res) => {
        if (cancelled) return;
        setPosts(res.data.posts);
        setNextCursor(res.data.nextCursor);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await api.get<{ posts: ExperiencePost[]; nextCursor: string | null }>("/api/experiences", {
        params: { cursor: nextCursor },
      });
      setPosts((current) => [...(current ?? []), ...res.data.posts]);
      setNextCursor(res.data.nextCursor);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="hero-mesh rounded-3xl p-6 text-white shadow-lift sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="kicker text-white/80">Share my experience</p>
            <h1 className="mt-1 font-display text-2xl font-extrabold sm:text-4xl">Stories from the road</h1>
            <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">
              Real trips from real travellers — with photos, ratings and the details that make a place worth the
              journey.
            </p>
          </div>
          {user && (
            <Link to="/experiences/new">
              <Button className="bg-white/95 text-rose-700 shadow-lg hover:bg-white">
                <Camera className="h-4 w-4" aria-hidden />
                Share a trip
              </Button>
            </Link>
          )}
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {!posts && !error && <PageLoader />}

      {posts && posts.length === 0 && (
        <EmptyState icon={Sparkles} title="No experiences yet" description="Be the first to share a trip with photos." />
      )}

      {posts && posts.length > 0 && (
        <>
          <ul className="grid gap-5 sm:grid-cols-2">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
          {nextCursor && (
            <div className="flex justify-center">
              <Button variant="secondary" loading={loadingMore} onClick={() => void loadMore()}>
                Load more stories
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Photo picker that uploads immediately and returns the stored URLs. */
function PhotoPicker({
  photos,
  onChange,
  max = 6,
}: {
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  const pick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    const room = max - photos.length;
    if (room <= 0) {
      setError(`You can attach up to ${max} photos.`);
      return;
    }
    const chosen = files.slice(0, room);
    setPreviews(chosen.map((file) => URL.createObjectURL(file)));
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      for (const file of chosen) form.append("files", file);
      const res = await api.post<{ photos: UploadedPhoto[] }>("/api/media", form);
      onChange([...photos, ...res.data.photos]);
    } catch (err) {
      setError(apiError(err, "That photo could not be uploaded."));
    } finally {
      setBusy(false);
      setPreviews((current) => {
        current.forEach((url) => URL.revokeObjectURL(url));
        return [];
      });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Photos</span>
      <div className="flex flex-wrap gap-2">
        {photos.map((photo) => (
          <span key={photo.url} className="relative h-20 w-24 overflow-hidden rounded-xl border border-line">
            <img src={photo.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(photos.filter((p) => p.url !== photo.url))}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-rose-600"
              aria-label="Remove photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}

        {previews.map((preview) => (
          <span key={preview} className="relative h-20 w-24 overflow-hidden rounded-xl border border-line opacity-70">
            <img src={preview} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-[10px] font-bold text-white">
              Uploading…
            </span>
          </span>
        ))}

        {photos.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex h-20 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-rose-300 bg-rose-50/60 text-[11px] font-bold text-rose-700 transition hover:border-rose-400 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
          >
            <ImagePlus className="h-5 w-5" aria-hidden />
            {busy ? "Uploading" : "Add photo"}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => void pick(e)} />
      <p className="text-xs text-muted">Up to {max} photos · JPEG, PNG, WebP, GIF or AVIF.</p>
      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export function NewExperiencePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    body: "",
    destinationName: "",
    region: "",
    rating: "",
    travelDate: "",
  });
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: e.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ post: ExperiencePost }>("/api/experiences", {
        title: form.title,
        body: form.body,
        destinationName: form.destinationName,
        region: form.region,
        rating: form.rating ? Number(form.rating) : null,
        travelDate: form.travelDate ? new Date(form.travelDate).toISOString() : null,
        imageUrls: photos.map((photo) => photo.url),
      });
      navigate(`/experiences/${res.data.post.id}`);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading title="Share your trip" description="Add your photos, tell the story, and help the next traveller." />

      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="flex flex-col gap-4 p-5">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Title
            <input
              required
              minLength={3}
              maxLength={120}
              value={form.title}
              onChange={set("title")}
              placeholder="Three days in the Simien Mountains"
              className={FIELD}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Place visited
              <input required minLength={2} maxLength={120} value={form.destinationName} onChange={set("destinationName")} className={FIELD} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Region
              <input required minLength={2} maxLength={60} value={form.region} onChange={set("region")} className={FIELD} />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Your experience
            <textarea
              required
              minLength={20}
              maxLength={5000}
              rows={8}
              value={form.body}
              onChange={set("body")}
              placeholder="What did you see, eat, and wish you had known before you went?"
              className={FIELD}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Rating
              <select value={form.rating} onChange={set("rating")} className={FIELD}>
                <option value="">No rating</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Travel date
              <input type="date" value={form.travelDate} onChange={set("travelDate")} className={FIELD} />
            </label>
          </div>

          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}

          <Button type="submit" loading={busy} className="bg-gradient-to-br from-rose-500 to-orange-500">
            <Sparkles className="h-4 w-4" aria-hidden />
            Publish experience
          </Button>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3 border-t-4 border-t-rose-400 p-5">
            <PhotoPicker photos={photos} onChange={setPhotos} />
          </Card>

          <Card className="flex flex-col gap-2 border-t-4 border-t-amber-400 bg-gradient-to-br from-amber-50 to-rose-50 p-5 dark:from-amber-500/10 dark:to-rose-500/10">
            <p className="flex items-center gap-2 font-display text-sm font-bold text-amber-900 dark:text-amber-200">
              <Camera className="h-4 w-4" aria-hidden /> Make it shine
            </p>
            <ul className="flex flex-col gap-1.5 text-xs text-amber-900/80 dark:text-amber-100/80">
              <li>· Add 2–4 photos: the view, the food, the way there.</li>
              <li>· Mention the cost and how you travelled.</li>
              <li>· Say who the place suits: families, hikers, photographers.</li>
            </ul>
          </Card>
        </div>
      </form>
    </div>
  );
}

export function ExperienceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<ExperienceDetail | null>(null);
  const [comments, setComments] = useState<ExperienceComment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPost(null);
    setError(null);
    api
      .get<{ post: ExperienceDetail }>(`/api/experiences/${id}`)
      .then((res) => {
        if (cancelled) return;
        setPost(res.data.post);
        setComments(res.data.post.comments);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const toggleLike = async () => {
    if (!post) return;
    setLikeBusy(true);
    try {
      const res = post.likedByMe
        ? await api.delete<{ liked: boolean; likeCount: number }>(`/api/experiences/${post.id}/like`)
        : await api.post<{ liked: boolean; likeCount: number }>(`/api/experiences/${post.id}/like`);
      setPost({ ...post, likedByMe: res.data.liked, likeCount: res.data.likeCount });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLikeBusy(false);
    }
  };

  const addComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!post || !draft.trim()) return;
    setCommentBusy(true);
    try {
      const res = await api.post<{ comment: ExperienceComment }>(`/api/experiences/${post.id}/comments`, {
        body: draft.trim(),
      });
      setComments((current) => [...current, res.data.comment]);
      setPost({ ...post, commentCount: post.commentCount + 1 });
      setDraft("");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setCommentBusy(false);
    }
  };

  const removeComment = async (commentId: string) => {
    if (!post) return;
    try {
      await api.delete(`/api/experiences/${post.id}/comments/${commentId}`);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
      setPost({ ...post, commentCount: Math.max(0, post.commentCount - 1) });
    } catch (err) {
      setError(apiError(err));
    }
  };

  if (error && !post) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-sm text-rose-600">{error}</p>
        <Link to="/experiences" className="text-sm font-semibold text-rose-600">Back to experiences</Link>
      </div>
    );
  }
  if (!post) return <PageLoader />;

  const canModerate = user && (user.id === post.author.id || user.role === "ADMIN" || user.role === "MODERATOR");

  return (
    <article className="flex flex-col gap-5">
      <Link to="/experiences" className="text-sm font-semibold text-rose-600 dark:text-rose-300">← All experiences</Link>

      <Card className="overflow-hidden p-0">
        {post.imageUrls[0] ? (
          <img src={post.imageUrls[0]} alt="" className="aspect-[16/8] w-full object-cover" />
        ) : (
          <div className="flex aspect-[16/8] w-full items-center justify-center bg-gradient-to-br from-rose-400 via-orange-400 to-amber-300">
            <Sparkles className="h-12 w-12 text-white/85" aria-hidden />
          </div>
        )}

        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-teal-800 dark:bg-teal-500/10 dark:text-teal-200">
              <MapPin className="h-3 w-3" aria-hidden /> {post.destinationName}
            </span>
            <span className="rounded-full bg-raised px-2.5 py-1 text-muted">{post.region}</span>
            {post.travelDate && (
              <span className="rounded-full bg-raised px-2.5 py-1 text-muted">
                Travelled {new Date(post.travelDate).toLocaleDateString()}
              </span>
            )}
            {post.rating && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                <Star className="h-3 w-3 fill-current" aria-hidden /> {post.rating}/5
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl font-extrabold leading-tight text-ink sm:text-4xl">{post.title}</h1>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-raised/60 p-3">
            <AuthorRow author={post.author} time={timeAgo(post.createdAt)} />
            <Link to={`/messages/${post.author.id}`}>
              <Button variant="secondary" className="min-h-9 px-3 text-xs">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                Message
              </Button>
            </Link>
          </div>

          <p className="whitespace-pre-line text-[0.95rem] leading-7 text-ink/90">{post.body}</p>

          {post.imageUrls.length > 1 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {post.imageUrls.slice(1).map((image) => (
                <img key={image} src={image} alt="" loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void toggleLike()}
              disabled={!user || likeBusy}
              aria-pressed={post.likedByMe}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-bold transition disabled:opacity-60",
                post.likedByMe
                  ? "bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white shadow-md"
                  : "border border-line bg-surface text-ink hover:border-rose-300 hover:text-rose-600",
              )}
            >
              <Heart className={post.likedByMe ? "h-4 w-4 fill-white" : "h-4 w-4"} aria-hidden />
              {post.likeCount} {post.likeCount === 1 ? "like" : "likes"}
            </button>
            <span className="text-sm text-muted">{post.commentCount} comments</span>
          </div>
        </div>
      </Card>

      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}

      <section className="flex flex-col gap-3" aria-label="Comments">
        <h2 className="font-display text-lg font-bold">Comments ({post.commentCount})</h2>

        {user ? (
          <form onSubmit={addComment} className="flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Share your thoughts or ask a question"
              className={FIELD}
            />
            <Button type="submit" loading={commentBusy} disabled={!draft.trim()} className="self-end">
              Comment
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted">
            <Link to="/login" className="font-semibold text-rose-600">Sign in</Link> to comment.
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3 rounded-2xl border border-line bg-surface p-3">
              <Avatar name={comment.author.displayName} src={comment.author.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center justify-between gap-2 text-xs text-muted">
                  <span className="font-bold text-ink">{comment.author.displayName}</span>
                  <span className="flex items-center gap-2">
                    {timeAgo(comment.createdAt)}
                    {(user?.id === comment.author.id || canModerate) && (
                      <button
                        type="button"
                        onClick={() => void removeComment(comment.id)}
                        className="text-muted hover:text-rose-600"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-ink/90">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
