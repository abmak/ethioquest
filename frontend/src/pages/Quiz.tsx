import { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Clock,
  Flame,
  Lock,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { Button, Card, Modal, PageLoader } from "../components/ui";
import { QuizLeaderboard } from "./QuizLeaderboard";
import { api, apiError } from "../lib/api";
import { tt, ttp } from "../lib/i18n";
import {
  isMuted,
  playAdvance,
  playAnswer,
  playError,
  playFinish,
  playQuestion,
  playTick,
  setMuted,
} from "../lib/sfx";
import { cn, formatDuration } from "../lib/utils";
import type {
  DailyQuizResponse,
  QuizPaymentSummary,
  QuizPlaySummary,
  QuizQuestion,
  QuizQuota,
  QuizSubmitResponse,
  RetryMethod,
  RetryStartResponse,
} from "../types";

type Answer = number | number[];

interface QuestionTime {
  questionId: string;
  seconds: number;
}

function answeredCount(question: QuizQuestion, answer: Answer | undefined): boolean {
  if (question.type === "MATCHING") return Array.isArray(answer) && answer.length === question.matchLefts.length && answer.every((v) => v >= 0);
  return typeof answer === "number";
}

const CATEGORY_STYLES: Record<string, string> = {
  HISTORY: "bg-amber-100 text-amber-800 ring-amber-200",
  HERITAGE: "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200",
  NATURE: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  WILDLIFE: "bg-lime-100 text-lime-800 ring-lime-200",
  ADVENTURE: "bg-orange-100 text-orange-800 ring-orange-200",
  CULTURE: "bg-violet-100 text-violet-800 ring-violet-200",
  CITY: "bg-sky-100 text-sky-800 ring-sky-200",
  FOOD: "bg-rose-100 text-rose-800 ring-rose-200",
};

function categoryStyle(category: string): string {
  return CATEGORY_STYLES[category.toUpperCase()] ?? "bg-slate-100 text-slate-700 ring-slate-200";
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];
const ADVANCE_DELAY_MS = 420;

export function QuizPage() {
  const [quiz, setQuiz] = useState<DailyQuizResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);
  const [times, setTimes] = useState<QuestionTime[]>([]);
  const [advancing, setAdvancing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState<QuizSubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [muted, setMutedState] = useState(isMuted);
  const [payOpen, setPayOpen] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  /** Resets the play state and starts the clock from the server's start time. */
  const beginPlay = (startedAtIso: string) => {
    setStartedAt(new Date(startedAtIso).getTime());
    setNow(Date.now());
    setIndex(0);
    setTimes([]);
    setAnswers({});
    setResult(null);
    setAdvancing(false);
    setError(null);
  };

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get<DailyQuizResponse>("/api/quiz/daily");
      setQuiz(response.data);
      // Picking up an unfinished play after a refresh resumes it on the clock.
      if (response.data.attempt) beginPlay(response.data.attempt.startedAt);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const sync = async () => {
    const response = await api.get<DailyQuizResponse>("/api/quiz/daily");
    setQuiz(response.data);
    return response.data;
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (startedAt === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const limitMs = (quiz?.timeLimitSeconds ?? 150) * 1000;
  const elapsed = startedAt === null ? 0 : now - startedAt;
  const remaining = Math.max(0, limitMs - elapsed);
  const secondsLeft = Math.ceil(remaining / 1000);

  const inProgress = startedAt !== null && !result;

  // A fresh question gets its chime and its own stopwatch.
  useEffect(() => {
    if (!inProgress) return;
    playQuestion();
    setQuestionStartedAt(Date.now());
  }, [index, inProgress]);

  // Tick for the last fifteen seconds so the pressure is audible.
  useEffect(() => {
    if (!inProgress) return;
    if (secondsLeft > 0 && secondsLeft <= 15) playTick(secondsLeft <= 5);
  }, [secondsLeft, inProgress]);

  const submit = async (finalAnswers: Record<string, Answer> = answers) => {
    if (!quiz || submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError(null);
    try {
      // Unanswered questions are left out; the server grades them as incorrect.
      const payload = {
        answers: quiz.questions
          .filter((q) => answeredCount(q, finalAnswers[q.id]))
          .map((q) => ({ questionId: q.id, answer: finalAnswers[q.id] as Answer })),
      };
      const response = await api.post<QuizSubmitResponse>("/api/quiz/daily/submit", payload);
      playFinish();
      setResult(response.data);
      setStartedAt(null);
      setQuestionStartedAt(null);
      // Refresh the quota and the list of finished plays for this card.
      void sync().catch(() => undefined);
    } catch (err) {
      setError(apiError(err, "Could not submit your answers."));
      playError();
      // Let the member answer again if the submission failed.
      setAdvancing(false);
    } finally {
      setBusy(false);
      submittingRef.current = false;
    }
  };

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await api.post<{ startedAt: string }>("/api/quiz/daily/start");
      beginPlay(response.data.startedAt);
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      // The server asks for the 3 ETB retry payment before a second play.
      if (status === 402) {
        setPayError(null);
        setPayOpen(true);
        return;
      }
      setError(apiError(err, "Could not start the challenge."));
      playError();
    } finally {
      setBusy(false);
    }
  };

  /**
   * Confirms the 3 ETB payment (made in cash or by mobile money) and starts the
   * paid play the server records alongside that confirmation.
   */
  const startRetry = async (method: RetryMethod, reference: string) => {
    setPayBusy(true);
    setPayError(null);
    try {
      const response = await api.post<RetryStartResponse>("/api/quiz/daily/retry", {
        method,
        reference: reference.trim() || undefined,
      });
      playAdvance();
      setPayOpen(false);
      await sync();
      beginPlay(response.data.startedAt);
    } catch (err) {
      setPayError(apiError(err, "Could not unlock the retry."));
      playError();
    } finally {
      setPayBusy(false);
    }
  };

  useEffect(() => {
    if (startedAt !== null && !result && remaining === 0 && quiz) void submit(answers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, startedAt]);

  /**
   * Answers are locked in automatically: once a question is fully answered we
   * record its time, play the confirmation and move to the next one (or submit
   * on the final question). There is no manual Next or Submit button.
   */
  const answerQuestion = (value: Answer) => {
    if (!quiz || advancing || result) return;
    const question = quiz.questions[index];
    const nextAnswers = { ...answers, [question.id]: value };
    setAnswers(nextAnswers);
    playAnswer();

    if (!answeredCount(question, value)) return;

    const seconds = questionStartedAt ? Math.max(1, Math.round((Date.now() - questionStartedAt) / 1000)) : 0;
    setTimes((current) => [...current.filter((t) => t.questionId !== question.id), { questionId: question.id, seconds }]);
    setAdvancing(true);

    window.setTimeout(() => {
      playAdvance();
      if (index >= quiz.questions.length - 1) {
        void submit(nextAnswers);
      } else {
        setIndex((i) => i + 1);
        setAdvancing(false);
      }
    }, ADVANCE_DELAY_MS);
  };

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) playAnswer();
  };

  if (loading) return <PageLoader />;
  if (!quiz) return <p className="text-sm text-rose-700">{error}</p>;

  const scorePercent = result ? Math.max(0, Math.min(100, result.score)) : 0;
  const current = quiz.questions[index];
  const secondsOnQuestion = questionStartedAt ? Math.max(0, Math.floor((now - questionStartedAt) / 1000)) : 0;
  const quota = quiz.quota;
  const plays = quiz.plays;
  const best = quiz.best;

  return (
    <div className="flex flex-col gap-6">
      {/* Hero: the challenge story, its rules and the start action. */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-fuchsia-600 via-orange-500 to-amber-400 p-6 text-white shadow-[0_24px_70px_-30px_rgba(219,39,119,0.85)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-fuchsia-300/40 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute inset-0 opacity-[0.14]" aria-hidden>
          <div className="absolute left-6 top-10 h-2 w-2 rounded-full bg-white" />
          <div className="absolute right-16 top-16 h-3 w-3 rounded-full bg-white" />
          <div className="absolute bottom-12 left-1/3 h-2.5 w-2.5 rounded-full bg-white" />
          <div className="absolute right-1/3 top-8 h-1.5 w-1.5 rounded-full bg-white" />
        </div>

        <div className="relative flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] ring-1 ring-white/30 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Daily challenge
            </span>
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={!muted}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-bold ring-1 ring-white/30 backdrop-blur transition hover:bg-white/30"
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" aria-hidden /> : <Volume2 className="h-3.5 w-3.5" aria-hidden />}
              {muted ? "Sound off" : "Sound on"}
            </button>
          </div>

          <div>
            <h1 className="font-display text-3xl font-black leading-tight sm:text-5xl">
              Let&apos;s Know Ethiopia
            </h1>
            <p className="mt-2 max-w-lg text-sm text-white/90 sm:text-base">
              Ten questions on Ethiopian history, culture and heritage, with photo rounds on the places themselves.
              Pick an answer and the next question comes straight away — answer fast, answer right, and climb the
              monthly prize table.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/25">
              <Target className="h-3.5 w-3.5" aria-hidden /> 10 questions
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/25">
              <Clock className="h-3.5 w-3.5" aria-hidden /> {quiz.timeLimitSeconds / 60} minutes
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/25">
              <Flame className="h-3.5 w-3.5" aria-hidden /> {quota.playsUsed} of {quota.maxPlays} plays today
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/25">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Retry {quota.retryPriceEtb} ETB
            </span>
          </div>

          {!result && !inProgress && !quota.exhausted && (
            <button
              type="button"
              onClick={() => (quota.freeAvailable ? void start() : setPayOpen(true))}
              disabled={busy}
              className="inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-black text-fuchsia-700 shadow-lg shadow-fuchsia-900/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
            >
              {quota.freeAvailable ? <Zap className="h-4 w-4" aria-hidden /> : <RotateCcw className="h-4 w-4" aria-hidden />}
              {busy
                ? "Starting…"
                : quota.freeAvailable
                  ? "Start today's free challenge"
                  : ttp("Retry for {price} ETB", { price: quota.retryPriceEtb })}
            </button>
          )}

          {!inProgress && quota.exhausted && (
            <span className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white/20 px-4 py-2 text-sm font-semibold ring-1 ring-white/30">
              <Lock className="h-4 w-4" aria-hidden /> All {quota.maxPlays} plays used — retries reopen after midnight (EAT)
            </span>
          )}

          {result && !quota.exhausted && (
            <span className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white/20 px-4 py-2 text-sm font-semibold ring-1 ring-white/30">
              <Trophy className="h-4 w-4" aria-hidden /> Best today {best?.score ?? result.score} · retry below for{" "}
              {quota.retryPriceEtb} ETB
            </span>
          )}
        </div>
      </section>

      {result && (
        <Card className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 p-6 text-white shadow-[0_24px_70px_-32px_rgba(5,150,105,0.9)]">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-lime-300/30 blur-2xl" aria-hidden />
          <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ring-1 ring-white/30">
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> Result
              </span>
              <h2 className="font-display text-2xl font-black sm:text-3xl">
                {scorePercent >= 80 ? "Outstanding!" : scorePercent >= 50 ? "Nicely done!" : "Good effort!"}
              </h2>
              <p className="text-sm text-white/90">
                {result.correctCount} of {result.totalQuestions} correct in {formatDuration(result.durationMs)}
                {result.timedOut && " · time ran out, so this attempt is not scored"}
              </p>
            </div>
            <div
              className="grid h-36 w-36 shrink-0 place-items-center rounded-full"
              style={{ background: `conic-gradient(#facc15 ${scorePercent}%, rgba(255,255,255,0.2) 0)` }}
              role="img"
              aria-label={`Score ${result.score} out of 100`}
            >
              <div className="grid h-28 w-28 place-items-center rounded-full bg-emerald-900/45 backdrop-blur">
                <p className="text-3xl font-black leading-none">{result.score}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">of 100</p>
              </div>
            </div>
          </div>

          {times.length > 0 && (
            <div className="relative mt-5 rounded-2xl bg-white/12 p-3 ring-1 ring-white/20">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">
                <Timer className="h-3.5 w-3.5" aria-hidden /> Time per question
              </p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-5">
                {times.map((time, i) => (
                  <li key={time.questionId} className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-2 py-1">
                    <span className="font-semibold text-white/85">Q{i + 1}</span>
                    <span className="font-black tabular-nums">{time.seconds}s</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {!inProgress && (plays.length > 0 || quota.exhausted) && (
        <DailyPlaysCard
          quota={quota}
          plays={plays}
          best={best}
          payments={quiz.payments}
          busy={busy || payBusy}
          onRetry={() => {
            setPayError(null);
            playAnswer();
            setPayOpen(true);
          }}
        />
      )}

      {inProgress && current && (
        <QuestionView
          question={current}
          answer={answers[current.id]}
          position={index}
          total={quiz.questions.length}
          remainingMs={remaining}
          secondsOnQuestion={secondsOnQuestion}
          advancing={advancing}
          onAnswer={answerQuestion}
        />
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}

      <QuizLeaderboard />

      <RetryDialog
        open={payOpen}
        price={quota.retryPriceEtb}
        busy={payBusy}
        error={payError}
        onClose={() => setPayOpen(false)}
        onSubmit={(method, reference) => void startRetry(method, reference)}
      />
    </div>
  );
}

const PAYMENT_METHODS: { value: RetryMethod; label: string; hint: string }[] = [
  { value: "TELEBIRR", label: "Telebirr", hint: "Mobile money transfer" },
  { value: "CBE_BIRR", label: "CBE Birr", hint: "CBE wallet transfer" },
  { value: "CASH", label: "Cash", hint: "Give 3 ETB to the host" },
];

function paymentLabel(method: string): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

/** Today's plays, the best result so far and the paid retry action. */
function DailyPlaysCard({
  quota,
  plays,
  best,
  payments,
  busy,
  onRetry,
}: {
  quota: QuizQuota;
  plays: QuizPlaySummary[];
  best: QuizPlaySummary | null;
  payments: QuizPaymentSummary[];
  busy: boolean;
  onRetry: () => void;
}) {
  const byPlay = new Map(payments.map((p) => [p.playIndex, p]));

  return (
    <Card className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-amber-50 via-white to-fuchsia-50 p-5 ring-1 ring-violet-100 sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-fuchsia-200/40 blur-2xl" aria-hidden />
      <div className="relative flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/25">
              <RotateCcw className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-lg font-black text-slate-900">Today&apos;s plays</h2>
              <p className="text-xs text-slate-500">
                First play free · each retry {quota.retryPriceEtb} ETB · {quota.maxPlays} plays a day
              </p>
            </div>
          </div>
          <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-black text-white">
            {quota.playsUsed} / {quota.maxPlays}
          </span>
        </div>

        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: quota.maxPlays }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 flex-1 rounded-full transition",
                i < quota.playsUsed ? "bg-gradient-to-r from-violet-600 to-fuchsia-500" : "bg-slate-200",
              )}
            />
          ))}
        </div>

        {best && (
          <div className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-amber-200">
            <Trophy className="h-5 w-5 shrink-0 text-amber-500" aria-hidden />
            <p className="text-sm text-slate-700">
              Best today <strong className="font-black text-slate-900">{best.score}/100</strong> · {best.correctCount}/
              {best.totalQuestions} correct · {formatDuration(best.durationMs)}
            </p>
          </div>
        )}

        <ol className="flex flex-col gap-1.5">
          {plays.map((play) => {
            const payment = byPlay.get(play.playIndex);
            return (
              <li
                key={play.playIndex}
                className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-slate-200"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                  Play {play.playIndex + 1}
                  {play.paid ? (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                      {quota.retryPriceEtb} ETB · {payment ? paymentLabel(payment.method) : "paid"}
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      Free
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm font-black tabular-nums text-slate-900">
                  {play.score}
                  <span className="text-xs font-semibold text-slate-500">/100</span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xs text-xs text-slate-500">
            {quota.exhausted
              ? "All 10 plays are used for today. Retries reopen at midnight, East Africa Time."
              : ttp("Pay {price} ETB for a fresh ten-question set, then confirm the payment to start.", { price: quota.retryPriceEtb })}
          </p>
          <Button onClick={onRetry} disabled={quota.exhausted || busy} className="min-h-11 px-4">
            {quota.exhausted ? <Lock className="h-4 w-4" aria-hidden /> : <RotateCcw className="h-4 w-4" aria-hidden />}
            {quota.exhausted
              ? "Daily limit reached"
              : busy
                ? "Starting…"
                : ttp("Retry for {price} ETB", { price: quota.retryPriceEtb })}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** Confirms the manual 3 ETB payment that unlocks one more play. */
function RetryDialog({
  open,
  price,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  price: number;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (method: RetryMethod, reference: string) => void;
}) {
  const [method, setMethod] = useState<RetryMethod>("TELEBIRR");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (open) setReference("");
  }, [open]);

  return (
    <Modal open={open} onClose={busy ? () => undefined : onClose} title={ttp("Unlock a retry — {price} ETB", { price })}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) onSubmit(method, reference);
        }}
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-muted">
          Your first play each day is free. Every extra play costs {price} ETB, and a member can play at most 10 times a
          day.
        </p>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">How did you pay?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {PAYMENT_METHODS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMethod(option.value)}
                aria-pressed={method === option.value}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-2xl border-2 px-3 py-2 text-left transition",
                  method === option.value
                    ? "border-fuchsia-500 bg-fuchsia-50 shadow-sm"
                    : "border-slate-200 hover:border-violet-300",
                )}
              >
                <span className="text-sm font-bold text-slate-900">{tt(option.label)}</span>
                <span className="text-[11px] text-muted">{tt(option.hint)}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          Payment reference (optional)
          <input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            maxLength={80}
            placeholder="e.g. Telebirr transaction ID"
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-ink outline-none focus:border-fuchsia-500"
          />
        </label>

        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
          <Banknote className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Pay before confirming. Your confirmation is saved with the play so the Ethio Quest team can review it.
        </p>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        )}

        <Button type="submit" loading={busy} className="w-full">
          I have paid {price} ETB — start retry
        </Button>
      </form>
    </Modal>
  );
}

interface QuestionViewProps {
  question: QuizQuestion;
  position: number;
  total: number;
  answer: Answer | undefined;
  remainingMs: number;
  secondsOnQuestion: number;
  advancing: boolean;
  onAnswer: (value: Answer) => void;
}

function QuestionView({ question, position, total, answer, remainingMs, secondsOnQuestion, advancing, onAnswer }: QuestionViewProps) {
  const seconds = Math.ceil(remainingMs / 1000);
  const lowOnTime = seconds <= 30;
  const progress = Math.round(((position + 1) / total) * 100);

  return (
    <Card className="relative overflow-hidden rounded-3xl border-violet-100 p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-200/40 blur-2xl" aria-hidden />

      <div className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ring-1", categoryStyle(question.category))}>
            {question.category}
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
              {position + 1} / {total}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold tabular-nums ring-1 transition",
                lowOnTime
                  ? "animate-pulse bg-rose-100 text-rose-700 ring-rose-200"
                  : "bg-emerald-100 text-emerald-700 ring-emerald-200",
              )}
            >
              <Clock className="h-4 w-4" aria-hidden />
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Segmented progress: one block per question. */}
        <div className="flex gap-1" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 flex-1 rounded-full transition-all duration-300",
                i <= position ? "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400" : "bg-slate-200",
              )}
            />
          ))}
        </div>

        {question.imageUrl && (
          <img
            src={question.imageUrl}
            alt="Question image"
            className="max-h-64 w-full rounded-2xl object-cover shadow-sm ring-1 ring-slate-200"
            loading="lazy"
          />
        )}

        <p className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">{question.prompt}</p>

        {question.type === "MATCHING" ? (
          <MatchingInput question={question} answer={Array.isArray(answer) ? answer : []} onChange={onAnswer} disabled={advancing} />
        ) : (
          <div className="grid gap-2.5">
            {question.options.map((option, i) => {
              const selected = answer === i;
              return (
                <button
                  key={`${question.id}-${i}`}
                  type="button"
                  onClick={() => onAnswer(i)}
                  disabled={advancing}
                  aria-pressed={selected}
                  className={cn(
                    "group flex min-h-14 items-center gap-3 rounded-2xl border-2 px-3.5 py-3 text-left text-base font-medium transition-all duration-150 disabled:cursor-default",
                    selected
                      ? "border-transparent bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 text-white shadow-lg shadow-fuchsia-500/25"
                      : "border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50/60 hover:shadow-md",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black",
                      selected
                        ? "bg-white/25 text-white ring-1 ring-white/40"
                        : "bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 group-hover:from-violet-200 group-hover:to-fuchsia-200",
                    )}
                    aria-hidden
                  >
                    {OPTION_LETTERS[i] ?? i + 1}
                  </span>
                  <span className="min-w-0 flex-1">{option}</span>
                  {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-white" aria-hidden />}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
            <Timer className="h-3.5 w-3.5" aria-hidden />
            {secondsOnQuestion}s on this question
          </span>
          <span className={cn("font-semibold", advancing ? "text-fuchsia-700" : "text-muted")}>
            {advancing ? "Moving to the next question…" : "Answers advance automatically"}
          </span>
        </div>
      </div>
    </Card>
  );
}

function MatchingInput({
  question,
  answer,
  onChange,
  disabled,
}: {
  question: QuizQuestion;
  answer: number[];
  onChange: (value: Answer) => void;
  disabled?: boolean;
}) {
  const choices = useMemo(() => question.matchOptions, [question.matchOptions]);
  return (
    <div className="flex flex-col gap-3">
      {question.matchLefts.map((left, i) => (
        <label
          key={`${question.id}-left-${i}`}
          className="flex flex-col gap-1.5 rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-3 text-sm font-semibold text-slate-800 transition focus-within:border-fuchsia-300 focus-within:bg-white"
        >
          <span className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 text-[11px] font-black text-white" aria-hidden>
              {i + 1}
            </span>
            {left}
          </span>
          <select
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-fuchsia-500"
            value={answer[i] ?? -1}
            disabled={disabled}
            onChange={(e) => {
              const next = [...answer];
              next[i] = Number(e.target.value);
              onChange(next);
            }}
          >
            <option value={-1}>Choose…</option>
            {choices.map((choice, j) => (
              <option key={`${question.id}-choice-${j}`} value={j}>
                {choice}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
