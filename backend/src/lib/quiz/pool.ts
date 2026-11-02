import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { prisma } from "../prisma";
import { logger } from "../logger";
import { PLACE_QUIZ_ENTRIES } from "../place-quiz-data";

export const POOL_TARGET = 50_000;
const SEED_VERSION = "pool-v2-ethiopian-bank";
const IMPORT_PREFIX = "sheet:";

/**
 * The supplied Ethiopian history, culture and heritage question bank, one JSON
 * row per line: [id, category, prompt, A, B, C, D, correctIndex]. It is stored
 * gzipped in the repository and unpacked on boot, so the API needs no
 * spreadsheet dependency.
 */
const BANK_FILE = path.resolve(__dirname, "../../../prisma/data/quiz/questions.jsonl.gz");

type BankRow = [string, string, string, string, string, string, string, number];

export interface GeneratedQuestion {
  key: string;
  type: "CHOICE" | "TRUE_FALSE" | "MATCHING" | "IMAGE";
  prompt: string;
  category: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  explanation: string | null;
  region: string | null;
  imageUrl: string | null;
  imageCredit: string | null;
  imageLicense: string | null;
  options: string[];
  correctIndex: number | null;
  matchPairs: Array<{ left: string; right: string }> | null;
  matchOptions: string[];
}

/** Small deterministic PRNG so every rebuild produces the same pool. */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rnd: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickDistinct<T>(items: T[], count: number, exclude: number, rnd: () => number): T[] {
  const indices = items.map((_, i) => i).filter((i) => i !== exclude);
  return shuffle(indices, rnd)
    .slice(0, count)
    .map((i) => items[i]);
}

/** Reads the committed question bank. Rows arrive already validated and deduped. */
function loadQuestionBank(): GeneratedQuestion[] {
  const raw = zlib.gunzipSync(fs.readFileSync(BANK_FILE)).toString("utf8");
  const out: GeneratedQuestion[] = [];
  for (const line of raw.split("\n")) {
    if (!line) continue;
    const [id, category, prompt, a, b, c, d, correctIndex] = JSON.parse(line) as BankRow;
    out.push({
      key: `${IMPORT_PREFIX}${id}`,
      type: "CHOICE",
      prompt,
      category,
      difficulty: "MEDIUM",
      explanation: null,
      region: null,
      imageUrl: null,
      imageCredit: null,
      imageLicense: null,
      options: [a, b, c, d],
      correctIndex,
      matchPairs: null,
      matchOptions: [],
    });
  }
  return out;
}

/**
 * "Guess the place" photo questions. Distractors are other places in the same
 * category, so every option is a real site rather than a nonsense answer.
 */
function buildPlaceQuestions(): GeneratedQuestion[] {
  const rnd = makeRng(0x0e71a10);
  const out: GeneratedQuestion[] = [];
  for (const entry of PLACE_QUIZ_ENTRIES) {
    const others = PLACE_QUIZ_ENTRIES.filter((e) => e.category === entry.category && e.key !== entry.key);
    const distractors = pickDistinct(others.map((o) => o.answer), 3, -1, rnd);
    if (distractors.length < 3) continue;
    const correct = entry.answer;
    const shuffled = shuffle([correct, ...distractors], rnd);
    out.push({
      key: `image:${entry.key}`,
      type: "IMAGE",
      prompt: entry.prompt || "Which place is shown in this photo?",
      category: entry.category,
      difficulty: "MEDIUM",
      explanation: entry.description,
      region: entry.region,
      imageUrl: entry.imageUrl,
      imageCredit: entry.imageCredit,
      imageLicense: entry.imageLicense,
      options: shuffled,
      correctIndex: shuffled.indexOf(correct),
      matchPairs: null,
      matchOptions: [],
    });
  }
  return out;
}

async function insertRows(rows: GeneratedQuestion[]): Promise<number> {
  const data = rows.map((q) => ({
    key: q.key,
    type: q.type,
    prompt: q.prompt,
    category: q.category,
    difficulty: q.difficulty,
    explanation: q.explanation,
    region: q.region,
    imageUrl: q.imageUrl,
    imageCredit: q.imageCredit,
    imageLicense: q.imageLicense,
    options: q.options,
    correctIndex: q.correctIndex,
    matchPairs: q.matchPairs ?? undefined,
    matchOptions: q.matchOptions,
    source: q.type === "IMAGE" ? "PLACE" : "IMPORTED",
  }));

  let inserted = 0;
  for (let i = 0; i < data.length; i += 1000) {
    const result = await prisma.quizQuestion.createMany({
      data: data.slice(i, i + 1000),
      skipDuplicates: true,
    });
    inserted += result.count;
  }
  return inserted;
}

/**
 * Brings the pool in line with the current question bank: the photo questions
 * stay, every previously generated question is retired, and the imported bank
 * is filled in. Retired rows keep `active: false` instead of being deleted so
 * past plays and their per-question reports still resolve.
 *
 * Idempotent — safe on every boot.
 */
export async function ensureQuizPool(): Promise<{ inserted: number; deactivated: number; total: number }> {
  const bank = loadQuestionBank();
  const places = buildPlaceQuestions();
  let inserted = 0;

  const legacy = { active: true, type: { not: "IMAGE" as const }, key: { not: { startsWith: IMPORT_PREFIX } } };
  const deactivated = (await prisma.quizQuestion.updateMany({ where: legacy, data: { active: false } })).count;

  const placeCount = await prisma.quizQuestion.count({ where: { type: "IMAGE" } });
  if (placeCount < places.length) {
    inserted += await insertRows(places);
  }

  const bankCount = await prisma.quizQuestion.count({ where: { key: { startsWith: IMPORT_PREFIX } } });
  if (bankCount < bank.length) {
    inserted += await insertRows(bank);
  }

  const total = await prisma.quizQuestion.count({ where: { active: true } });
  if (inserted > 0 || deactivated > 0) {
    logger.info({ inserted, deactivated, total, version: SEED_VERSION }, "Quiz pool ready");
  }
  return { inserted, deactivated, total };
}
