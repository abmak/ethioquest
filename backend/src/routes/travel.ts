import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/async-handler";
import { ApiError } from "../lib/errors";
import { validate } from "../middleware/validate";
import { geocodeLimiter, routeLimiter } from "../lib/rate-limit";

export const travelRouter = Router();

const CATEGORIES = ["HISTORY", "HERITAGE", "NATURE", "WILDLIFE", "ADVENTURE", "CULTURE", "CITY", "FOOD"] as const;

travelRouter.get(
  "/destinations",
  asyncHandler(async (req, res) => {
    const category = CATEGORIES.includes(req.query.category as (typeof CATEGORIES)[number])
      ? (req.query.category as (typeof CATEGORIES)[number])
      : undefined;
    const region = typeof req.query.region === "string" && req.query.region ? req.query.region : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    const rows = await prisma.destination.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(region ? { region } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { region: { contains: q, mode: "insensitive" } },
                { tagline: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ featured: "desc" }, { rating: "desc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        region: true,
        city: true,
        category: true,
        tagline: true,
        imageUrl: true,
        rating: true,
        reviewCount: true,
        featured: true,
        budgetLevel: true,
        durationDays: true,
        lat: true,
        lng: true,
      },
    });
    res.json({ destinations: rows });
  }),
);

travelRouter.get(
  "/destinations/:slug",
  asyncHandler(async (req, res) => {
    const destination = await prisma.destination.findUnique({
      where: { slug: req.params.slug },
      include: {
        experiences: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            rating: true,
            createdAt: true,
            author: { select: { username: true, displayName: true } },
          },
        },
      },
    });
    if (!destination) throw ApiError.notFound("Destination not found");
    res.json({ destination });
  }),
);

/** Great-circle distance between two points, in kilometres. */
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const preferenceSchema = z.object({
  interests: z.array(z.enum(CATEGORIES)).max(8).default([]),
  budgetLevel: z.number().int().min(1).max(3).optional(),
  maxDays: z.number().int().min(1).max(30).optional(),
  region: z.string().trim().max(60).optional(),
  start: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});

/**
 * Scores each destination on interest match, budget fit, trip length and
 * region. Returns the top results with a short reason for each.
 */
travelRouter.post(
  "/recommend",
  validate(preferenceSchema),
  asyncHandler(async (req, res) => {
    const prefs = req.body as z.infer<typeof preferenceSchema>;
    const all = await prisma.destination.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        region: true,
        city: true,
        category: true,
        tagline: true,
        summary: true,
        description: true,
        highlights: true,
        activities: true,
        bestTime: true,
        gettingThere: true,
        entryFee: true,
        imageUrl: true,
        gallery: true,
        budgetLevel: true,
        durationDays: true,
        rating: true,
        reviewCount: true,
        featured: true,
        tags: true,
        lat: true,
        lng: true,
      },
    });

    const scored = all.map((d) => {
      const reasons: string[] = [];
      let score = 0;
      if (prefs.interests.length && prefs.interests.includes(d.category)) {
        score += 40;
        reasons.push(`Matches your interest in ${d.category.toLowerCase()}`);
      }
      if (prefs.budgetLevel !== undefined) {
        const gap = Math.abs(prefs.budgetLevel - d.budgetLevel);
        score += gap === 0 ? 20 : gap === 1 ? 10 : 0;
        if (gap === 0) reasons.push("Fits your budget");
      }
      if (prefs.maxDays !== undefined && d.durationDays <= prefs.maxDays) {
        score += 15;
        reasons.push(`Fits in ${prefs.maxDays} days or fewer`);
      }
      if (prefs.region && d.region.toLowerCase() === prefs.region.toLowerCase()) {
        score += 15;
        reasons.push(`In ${d.region}`);
      }
      score += Math.min(10, d.rating * 2);
      const distanceKm = prefs.start ? Math.round(haversineKm(prefs.start, d)) : null;

      // A readable paragraph for the card: what it is, why it fits, how far.
      const parts = [
        `${d.name} is a ${d.category.toLowerCase()} destination in ${d.region}, best visited ${d.bestTime}.`,
        d.summary,
      ];
      if (reasons.length) parts.push(`Why it fits: ${reasons.join(", ")}.`);
      if (distanceKm !== null) parts.push(`It is about ${distanceKm} km from your start point.`);
      if (d.highlights.length) parts.push(`Highlights include ${d.highlights.slice(0, 3).join(", ")}.`);

      return { ...d, score: Math.round(score), reasons, distanceKm, why: parts.join(" ") };
    });

    // Ties go to the place nearest the customer's start point, when one is given.
    scored.sort(
      (a, b) =>
        b.score - a.score || (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || a.name.localeCompare(b.name),
    );
    res.json({ recommendations: scored.slice(0, 12) });
  }),
);

/**
 * Drivable road route between two points, proxied to the OSRM demo server so
 * the whole navigation map stays inside the app. Responses include the road
 * geometry and turn-by-turn steps.
 */
const routeCache = new Map<string, { at: number; data: unknown }>();
const ROUTE_TTL_MS = 5 * 60 * 1000;

interface OsrmStep {
  distance: number;
  duration: number;
  name?: string;
  maneuver?: { type?: string; modifier?: string };
}

function describeStep(step: OsrmStep): string {
  const type = step.maneuver?.type ?? "continue";
  const modifier = step.maneuver?.modifier ?? "";
  const road = step.name ? ` onto ${step.name}` : "";
  switch (type) {
    case "depart":
      return step.name ? `Start on ${step.name}` : "Start the drive";
    case "arrive":
      return "Arrive at your destination";
    case "turn":
      return `Turn ${modifier}${road}`.replace(/\s+/g, " ");
    case "roundabout":
    case "rotary":
      return `Take the roundabout${road}`;
    case "fork":
      return `Keep ${modifier || "ahead"}${road}`;
    case "merge":
      return `Merge${road}`;
    case "new name":
      return `Continue${road}`;
    case "end of road":
      return `At the end of the road, turn ${modifier}${road}`.replace(/\s+/g, " ");
    default:
      return road ? `Continue${road}` : "Continue straight";
  }
}

travelRouter.get(
  "/route",
  routeLimiter,
  asyncHandler(async (req, res) => {
    const numbers = ["fromLat", "fromLng", "toLat", "toLng"].map((key) => Number(req.query[key]));
    const [fromLat, fromLng, toLat, toLng] = numbers;
    if (numbers.some((n) => !Number.isFinite(n)) || Math.abs(fromLat) > 90 || Math.abs(toLat) > 90 || Math.abs(fromLng) > 180 || Math.abs(toLng) > 180) {
      throw ApiError.badRequest("Give a valid start and destination");
    }

    const key = numbers.map((n) => n.toFixed(4)).join(",");
    const cached = routeCache.get(key);
    if (cached && Date.now() - cached.at < ROUTE_TTL_MS) {
      res.json(cached.data);
      return;
    }

    // Two public OSRM hosts; the second is used if the first is unreachable.
    const ROUTE_HOSTS = ["https://router.project-osrm.org", "https://routing.openstreetmap.de/routed-car"];
    type OsrmResponse = {
      code: string;
      routes?: {
        distance: number;
        duration: number;
        geometry: { coordinates: [number, number][] };
        legs: { steps: OsrmStep[] }[];
      }[];
    };
    let body: OsrmResponse | null = null;
    for (const host of ROUTE_HOSTS) {
      try {
        const url = new URL(`${host}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}`);
        url.searchParams.set("overview", "simplified");
        url.searchParams.set("geometries", "geojson");
        url.searchParams.set("steps", "true");
        const upstream = await fetch(url, {
          headers: { "User-Agent": "EthioQuest/1.0 (travel planner)", Accept: "application/json" },
          signal: AbortSignal.timeout(15000),
        });
        if (!upstream.ok) continue;
        body = (await upstream.json()) as OsrmResponse;
        break;
      } catch {
        // Fall through to the next routing host.
      }
    }
    if (!body) throw new ApiError(502, "Road routing is unavailable right now", "UPSTREAM_ERROR");

    const route = body.routes?.[0];
    if (body.code !== "Ok" || !route) {
      throw new ApiError(422, "No drivable route was found between those points", "NO_ROUTE");
    }

    const data = {
      distanceMeters: Math.round(route.distance),
      distanceKm: Math.round(route.distance / 1000),
      durationSeconds: Math.round(route.duration),
      geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
      steps: route.legs.flatMap((leg) => leg.steps).map((step) => ({
        instruction: describeStep(step),
        road: step.name || "",
        distanceMeters: Math.round(step.distance),
        durationSeconds: Math.round(step.duration),
        type: step.maneuver?.type ?? "continue",
        modifier: step.maneuver?.modifier ?? null,
      })),
    };

    if (routeCache.size > 300) routeCache.clear();
    routeCache.set(key, { at: Date.now(), data });
    res.json(data);
  }),
);

/**
 * Place search for the customer's start point, proxied to OpenStreetMap's
 * Nominatim so the browser never calls it directly. Results are cached briefly
 * in memory to keep lookups rare, as Nominatim's usage policy asks.
 */
const geocodeCache = new Map<string, { at: number; results: unknown[] }>();
const GEOCODE_TTL_MS = 10 * 60 * 1000;

travelRouter.get(
  "/geocode",
  geocodeLimiter,
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q.length < 2 || q.length > 120) throw ApiError.badRequest("Enter at least 2 characters");

    const key = q.toLowerCase();
    const cached = geocodeCache.get(key);
    if (cached && Date.now() - cached.at < GEOCODE_TTL_MS) {
      res.json({ results: cached.results });
      return;
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    url.searchParams.set("countrycodes", "et");
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "EthioQuest/1.0 (travel planner)",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) throw new ApiError(502, "Place search is unavailable right now", "UPSTREAM_ERROR");

    const raw = (await upstream.json()) as { display_name: string; lat: string; lon: string }[];
    const results = raw
      .map((item) => ({ label: item.display_name, lat: Number(item.lat), lng: Number(item.lon) }))
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));

    if (geocodeCache.size > 500) geocodeCache.clear();
    geocodeCache.set(key, { at: Date.now(), results });
    res.json({ results });
  }),
);
