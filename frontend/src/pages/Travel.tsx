import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Compass,
  MapPin,
  Mountain,
  Navigation,
  LocateFixed,
  Route,
  Search,
  Sparkles,
  Star,
  Ticket,
} from "lucide-react";
import { Button, Card, EmptyState, PageLoader, SectionHeading } from "../components/ui";
import { api, apiError } from "../lib/api";
import { tt } from "../lib/i18n";
import { budgetLabel } from "../lib/utils";
import { TravelMap, type MapPlace, type MapPoint } from "../components/TravelMap";
import type {
  Destination,
  DestinationCategory,
  DestinationSummary,
  DrivingRoute,
  GeocodeResult,
  Recommendation,
} from "../types";

const CATEGORY_OPTIONS: { value: DestinationCategory | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "HISTORY", label: "History" },
  { value: "HERITAGE", label: "Heritage" },
  { value: "NATURE", label: "Nature" },
  { value: "WILDLIFE", label: "Wildlife" },
  { value: "ADVENTURE", label: "Adventure" },
  { value: "CULTURE", label: "Culture" },
  { value: "CITY", label: "City" },
  { value: "FOOD", label: "Food" },
];

/** Each category keeps its own colour so the catalogue reads at a glance. */
const CATEGORY_STYLES: Record<DestinationCategory, { chip: string; tile: string; label: string }> = {
  HISTORY: { chip: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200", tile: "from-amber-500 to-orange-600", label: "History" },
  HERITAGE: { chip: "bg-rose-100 text-rose-900 dark:bg-rose-500/15 dark:text-rose-200", tile: "from-rose-500 to-fuchsia-600", label: "Heritage" },
  NATURE: { chip: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200", tile: "from-emerald-500 to-teal-600", label: "Nature" },
  WILDLIFE: { chip: "bg-lime-100 text-lime-900 dark:bg-lime-500/15 dark:text-lime-200", tile: "from-lime-500 to-green-600", label: "Wildlife" },
  ADVENTURE: { chip: "bg-orange-100 text-orange-900 dark:bg-orange-500/15 dark:text-orange-200", tile: "from-orange-500 to-red-600", label: "Adventure" },
  CULTURE: { chip: "bg-violet-100 text-violet-900 dark:bg-violet-500/15 dark:text-violet-200", tile: "from-violet-500 to-purple-600", label: "Culture" },
  CITY: { chip: "bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-200", tile: "from-sky-500 to-indigo-600", label: "City" },
  FOOD: { chip: "bg-yellow-100 text-yellow-900 dark:bg-yellow-500/15 dark:text-yellow-200", tile: "from-yellow-400 to-amber-600", label: "Food" },
};

function PlaceImage({
  src,
  name,
  category,
  className,
}: {
  src: string;
  name: string;
  category: DestinationCategory;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        onError={() => setBroken(true)}
        className={className}
      />
    );
  }
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${CATEGORY_STYLES[category].tile} ${className ?? ""}`}>
      <Mountain className="h-10 w-10 text-white/80" aria-hidden />
    </div>
  );
}

function DestinationCard({ destination }: { destination: DestinationSummary }) {
  const style = CATEGORY_STYLES[destination.category];
  return (
    <Link to={`/travel/${destination.slug}`} className="group block h-full rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
      <Card className="card-interactive flex h-full flex-col overflow-hidden p-0">
        <div className="relative">
          <PlaceImage
            src={destination.imageUrl}
            name={destination.name}
            category={destination.category}
            className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
          <div className="photo-tint absolute inset-0" aria-hidden />
          <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${style.chip}`}>
            {tt(style.label)}
          </span>
          {destination.featured && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-[11px] font-bold text-white shadow">
              <Sparkles className="h-3 w-3" aria-hidden /> Featured
            </span>
          )}
          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 text-white">
            <div className="min-w-0">
              <h3 className="truncate font-display text-lg font-bold drop-shadow-sm">{destination.name}</h3>
              <p className="flex items-center gap-1 text-xs text-white/90">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {destination.region}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-xs font-bold text-amber-700">
              {destination.reviewCount > 0 ? (
                <>
                  <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                  {destination.rating.toFixed(1)}
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" aria-hidden /> New
                </>
              )}
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="line-clamp-2 text-sm text-muted">{destination.tagline}</p>
          <div className="mt-auto flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted">
            <span className="rounded-full bg-raised px-2 py-1">{budgetLabel(destination.budgetLevel)}</span>
            <span className="rounded-full bg-raised px-2 py-1">
              {destination.durationDays} {destination.durationDays === 1 ? "day" : "days"}
            </span>
            <span className="ml-auto flex items-center gap-1 font-bold text-brand-700 dark:text-brand-300">
              Explore <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

/** Recommendation card: the full story of why this place suits the traveller. */
function RecommendationCard({ destination }: { destination: Recommendation }) {
  const style = CATEGORY_STYLES[destination.category];
  return (
    <Card className="flex flex-col overflow-hidden p-0">
      <div className="relative">
        <PlaceImage
          src={destination.imageUrl}
          name={destination.name}
          category={destination.category}
          className="aspect-[16/9] w-full object-cover"
        />
        <div className="photo-tint absolute inset-0" aria-hidden />
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${style.chip}`}>
          {style.label}
        </span>
        <div className="absolute inset-x-4 bottom-3 text-white">
          <h3 className="font-display text-xl font-bold">{destination.name}</h3>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/90">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden /> {destination.region}
            </span>
            {destination.reviewCount > 0 ? (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden /> {destination.rating.toFixed(1)}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> New guide
              </span>
            )}
            {destination.distanceKm !== null && (
              <span className="flex items-center gap-1">
                <Route className="h-3.5 w-3.5" aria-hidden /> {destination.distanceKm} km from your start
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm font-semibold text-ink">{destination.tagline}</p>
        <p className="text-sm leading-relaxed text-muted">{destination.why}</p>

        {destination.reasons.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {destination.reasons.map((reason) => (
              <li key={reason} className="rounded-full bg-gradient-to-r from-fuchsia-50 to-amber-50 px-2.5 py-1 text-[11px] font-bold text-fuchsia-800 ring-1 ring-fuchsia-200/70 dark:from-fuchsia-500/10 dark:to-amber-500/10 dark:text-fuchsia-200 dark:ring-fuchsia-400/20">
                {reason}
              </li>
            ))}
          </ul>
        )}

        {destination.highlights.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">What is there</p>
            <p className="mt-1 text-sm text-ink">{destination.highlights.slice(0, 4).join(" · ")}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs text-muted">
          <span className="flex items-start gap-1.5 rounded-xl bg-raised/70 p-2">
            <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" aria-hidden />
            {destination.bestTime}
          </span>
          <span className="flex items-start gap-1.5 rounded-xl bg-raised/70 p-2">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" aria-hidden />
            {destination.durationDays} {destination.durationDays === 1 ? "day" : "days"} · {budgetLabel(destination.budgetLevel)}
          </span>
        </div>

        <Link to={`/travel/${destination.slug}`} className="mt-auto">
          <Button variant="secondary" className="w-full">
            See the full guide
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

const INTEREST_OPTIONS = CATEGORY_OPTIONS.filter((option) => option.value !== "");

interface StartPoint extends MapPoint {
  label: string;
}

function PreferenceFinder() {
  const [interests, setInterests] = useState<DestinationCategory[]>([]);
  const [budgetLevel, setBudgetLevel] = useState<number | "">("");
  const [maxDays, setMaxDays] = useState<number | "">("");
  const [results, setResults] = useState<Recommendation[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [start, setStart] = useState<StartPoint | null>(null);
  const [startQuery, setStartQuery] = useState("");
  const [startMatches, setStartMatches] = useState<GeocodeResult[] | null>(null);
  const [searchingStart, setSearchingStart] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [allPlaces, setAllPlaces] = useState<MapPlace[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ destinations: (DestinationSummary & { lat: number; lng: number })[] }>("/api/travel/destinations")
      .then((res) => {
        if (!cancelled) setAllPlaces(res.data.destinations.map(({ id, name, lat, lng }) => ({ id, name, lat, lng })));
      })
      .catch(() => {
        // The map is an extra; the finder still works without it.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const searchStart = async (event: FormEvent) => {
    event.preventDefault();
    setSearchingStart(true);
    setStartError(null);
    try {
      const res = await api.get<{ results: GeocodeResult[] }>("/api/travel/geocode", {
        params: { q: startQuery.trim() },
      });
      setStartMatches(res.data.results);
    } catch (err) {
      setStartMatches(null);
      setStartError(apiError(err));
    } finally {
      setSearchingStart(false);
    }
  };

  const chooseStart = (point: StartPoint) => {
    setStart(point);
    setStartMatches(null);
    setStartError(null);
  };

  const pickStartOnMap = (point: MapPoint) => {
    chooseStart({ ...point, label: `Map point (${point.lat.toFixed(3)}, ${point.lng.toFixed(3)})` });
  };

  const toggleInterest = (value: DestinationCategory) => {
    setInterests((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ recommendations: Recommendation[] }>("/api/travel/recommend", {
        interests,
        ...(budgetLevel === "" ? {} : { budgetLevel }),
        ...(maxDays === "" ? {} : { maxDays }),
        ...(start ? { start: { lat: start.lat, lng: start.lng } } : {}),
      });
      setResults(res.data.recommendations);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="panel flex flex-col gap-5 p-5 sm:p-6">
      <div>
        <p className="kicker">Tailor your trip</p>
        <h2 className="mt-1 font-display text-xl font-bold sm:text-2xl">Find places for your preferences</h2>
        <p className="mt-1 text-sm text-muted">
          Pick what you enjoy, set your budget and starting point, and we rank the places that fit — with the full
          reason for each match.
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-2 text-sm font-medium">Interests</legend>
          {INTEREST_OPTIONS.map((option) => {
            const value = option.value as DestinationCategory;
            const selected = interests.includes(value);
            const style = CATEGORY_STYLES[value];
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleInterest(value)}
                className={
                  selected
                    ? `inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br ${style.tile} px-3.5 py-2 text-xs font-bold text-white shadow-md`
                    : "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-xs font-medium text-muted transition hover:border-brand-400 hover:text-ink"
                }
              >
                {tt(style.label)}
              </button>
            );
          })}
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Budget
            <select
              value={budgetLevel}
              onChange={(e) => setBudgetLevel(e.target.value ? Number(e.target.value) : "")}
              className="rounded-xl border border-line bg-surface px-3 py-2.5 text-base"
            >
              <option value="">Any</option>
              <option value={1}>{budgetLabel(1)}</option>
              <option value={2}>{budgetLabel(2)}</option>
              <option value={3}>{budgetLabel(3)}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Trip length
            <select
              value={maxDays}
              onChange={(e) => setMaxDays(e.target.value ? Number(e.target.value) : "")}
              className="rounded-xl border border-line bg-surface px-3 py-2.5 text-base"
            >
              <option value="">Any</option>
              <option value={3}>Up to 3 days</option>
              <option value={7}>Up to 7 days</option>
              <option value={14}>Up to 14 days</option>
            </select>
          </label>
        </div>
        <Button type="submit" loading={busy} className="bg-gradient-to-br from-teal-600 to-emerald-700">
          Show matching places
        </Button>
      </form>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-raised/50 p-4">
        <div>
          <h3 className="text-sm font-semibold">Where are you starting from?</h3>
          <p className="text-xs text-muted">Search a town or click the map. We show how far each place is from there.</p>
        </div>
        <form onSubmit={searchStart} className="flex gap-2">
          <label className="sr-only" htmlFor="start-search">Search for a starting place</label>
          <input
            id="start-search"
            type="search"
            value={startQuery}
            onChange={(e) => setStartQuery(e.target.value)}
            placeholder="e.g. Bahir Dar, Hawassa"
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-base outline-none focus:border-brand-500"
          />
          <Button type="submit" variant="secondary" loading={searchingStart} disabled={startQuery.trim().length < 2}>
            Search
          </Button>
        </form>
        {startError && <p role="alert" className="text-sm text-red-600">{startError}</p>}
        {startMatches && startMatches.length === 0 && <p className="text-sm text-muted">No matching places found in Ethiopia.</p>}
        {startMatches && startMatches.length > 0 && (
          <ul className="flex flex-col gap-1">
            {startMatches.map((match) => (
              <li key={`${match.lat},${match.lng}`}>
                <button
                  type="button"
                  onClick={() => chooseStart({ label: match.label, lat: match.lat, lng: match.lng })}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-50 dark:hover:bg-brand-500/10"
                >
                  {match.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        {start && (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">
              <span className="font-semibold">Start:</span> {start.label}
            </span>
            <button type="button" onClick={() => setStart(null)} className="shrink-0 text-xs font-semibold text-brand-700 dark:text-brand-300">
              Clear
            </button>
          </div>
        )}
        <TravelMap
          places={results ? results.slice(0, 6).map(({ id, name, lat, lng }) => ({ id, name, lat, lng })) : allPlaces}
          start={start}
          onPickStart={pickStartOnMap}
        />
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {results && results.length === 0 && <p className="text-sm text-muted">No places matched. Try fewer filters.</p>}
      {results && results.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-bold">Your matches</h3>
            <span className="text-xs text-muted">{results.length} places</span>
          </div>
          <ul className="grid gap-4 lg:grid-cols-2">
            {results.slice(0, 8).map((destination) => (
              <li key={destination.id}>
                <RecommendationCard destination={destination} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function TravelPage() {
  const [destinations, setDestinations] = useState<DestinationSummary[] | null>(null);
  const [category, setCategory] = useState<DestinationCategory | "">("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api
      .get<{ destinations: DestinationSummary[] }>("/api/travel/destinations", {
        params: { ...(category ? { category } : {}), ...(search ? { q: search } : {}) },
      })
      .then((res) => {
        if (!cancelled) setDestinations(res.data.destinations);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [category, search]);

  const regions = destinations ? new Set(destinations.map((d) => d.region)).size : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="hero-mesh rounded-3xl p-6 text-white shadow-lift sm:p-8">
        <div className="relative flex flex-col gap-5">
          <div className="max-w-2xl">
            <p className="kicker text-white/80">Ethiopia · {destinations?.length ?? "—"} destinations and counting</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">Places to Visit</h1>
            <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">
              From the obelisks of Axum to the lava of the Danakil, discover what is there, what to do, the best time
              to go and exactly how to get there.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="glass px-3 py-1.5">{destinations?.length ?? "—"} places</span>
            <span className="glass px-3 py-1.5">{regions || "—"} regions</span>
            <span className="glass px-3 py-1.5">OpenStreetMap guides</span>
          </div>
        </div>
      </div>

      <PreferenceFinder />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-xl font-bold">Browse every place</h2>
          <span className="text-xs text-muted">{destinations?.length ?? 0} shown</span>
        </div>
        <label className="relative block">
          <span className="sr-only">Search destinations</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-teal-500" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by place or region"
            className="w-full rounded-2xl border border-line bg-surface py-3 pl-10 pr-3 text-base outline-none focus:border-teal-500"
          />
        </label>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar" role="group" aria-label="Filter by category">
          {CATEGORY_OPTIONS.map((option) => {
            const style = option.value ? CATEGORY_STYLES[option.value].tile : "from-slate-700 to-slate-900";
            return (
              <button
                key={option.label}
                type="button"
                aria-pressed={category === option.value}
                onClick={() => setCategory(option.value)}
                className={
                  category === option.value
                    ? `shrink-0 rounded-full bg-gradient-to-br ${style} px-4 py-2 text-sm font-bold text-white shadow-md`
                    : "shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-muted transition hover:text-ink"
                }
              >
                {tt(option.label)}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {!destinations && !error && <PageLoader />}

      {destinations && destinations.length === 0 && (
        <EmptyState icon={Compass} title="No places match" description="Try another category or search term." />
      )}

      {destinations && destinations.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((destination) => (
            <li key={destination.id}>
              <DestinationCard destination={destination} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDriveTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${minutes > 0 ? `${minutes} min` : ""}`.trim();
}

/**
 * In-app road navigation: search where the drive starts, then draw the whole
 * route on the OpenStreetMap canvas with turn-by-turn steps. Nothing opens an
 * external mapping site.
 */
function RoutePlanner({ destination }: { destination: Destination }) {
  const [start, setStart] = useState<StartPoint | null>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<GeocodeResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [route, setRoute] = useState<DrivingRoute | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = async (from: StartPoint) => {
    setBusy(true);
    setError(null);
    setRoute(null);
    try {
      const res = await api.get<DrivingRoute>("/api/travel/route", {
        params: { fromLat: from.lat, fromLng: from.lng, toLat: destination.lat, toLng: destination.lng },
      });
      setRoute(res.data);
    } catch (err) {
      setError(apiError(err, "Could not work out a drivable route."));
    } finally {
      setBusy(false);
    }
  };

  const chooseStart = (point: StartPoint) => {
    setStart(point);
    setMatches(null);
    void fetchRoute(point);
  };

  const search = async (event: FormEvent) => {
    event.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const res = await api.get<{ results: GeocodeResult[] }>("/api/travel/geocode", { params: { q: query.trim() } });
      setMatches(res.data.results);
    } catch (err) {
      setMatches(null);
      setError(apiError(err));
    } finally {
      setSearching(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("This browser cannot share your location.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        chooseStart({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: "Your current location",
        });
      },
      () => {
        setLocating(false);
        setError("Location permission was declined. Search for a town instead.");
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  return (
    <Card className="flex flex-col gap-4 border-t-4 border-t-sky-400 p-5">
      <div>
        <p className="kicker">Road navigation</p>
        <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-bold">
          <Navigation className="h-5 w-5 text-sky-600" aria-hidden />
          Plan the whole drive here
        </h2>
        <p className="mt-1 text-sm text-muted">
          Enter your starting town or share your location and the road route is drawn on this map, with the distance,
          driving time and turn-by-turn steps. You never leave the app.
        </p>
      </div>

      <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor={`route-start-${destination.slug}`}>Starting place</label>
        <input
          id={`route-start-${destination.slug}`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Start from… e.g. Addis Ababa"
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-base outline-none focus:border-sky-500"
        />
        <div className="flex gap-2">
          <Button type="submit" variant="secondary" loading={searching} disabled={query.trim().length < 2}>
            <Search className="h-4 w-4" aria-hidden /> Search
          </Button>
          <Button type="button" variant="secondary" loading={locating} onClick={useMyLocation}>
            <LocateFixed className="h-4 w-4" aria-hidden /> My location
          </Button>
        </div>
      </form>

      {matches && matches.length === 0 && <p className="text-sm text-muted">No matching places found.</p>}
      {matches && matches.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl border border-line bg-raised/40 p-1">
          {matches.map((match) => (
            <li key={`${match.lat},${match.lng}`}>
              <button
                type="button"
                onClick={() => chooseStart({ label: match.label, lat: match.lat, lng: match.lng })}
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-sky-50 dark:hover:bg-sky-500/10"
              >
                {match.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {start && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-sky-50 px-3 py-2 text-sm dark:bg-sky-500/10">
          <span className="min-w-0 truncate">
            <span className="font-semibold">From:</span> {start.label}
          </span>
          <button
            type="button"
            onClick={() => {
              setStart(null);
              setRoute(null);
            }}
            className="shrink-0 text-xs font-bold text-sky-700 dark:text-sky-300"
          >
            Clear
          </button>
        </div>
      )}

      {busy && <p className="text-sm text-muted">Working out the road route…</p>}
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}

      {route && (
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="rounded-full bg-sky-100 px-3 py-1.5 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200">
            {route.distanceKm} km
          </span>
          <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
            about {formatDriveTime(route.durationSeconds)}
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
            {route.steps.length} steps
          </span>
        </div>
      )}

      <TravelMap
        places={[]}
        start={start}
        route={route?.geometry}
        routeEnd={{ lat: destination.lat, lng: destination.lng, label: destination.name }}
        className="h-80 w-full overflow-hidden rounded-2xl border border-line sm:h-[26rem]"
        label={`Road route to ${destination.name}`}
      />

      {route && route.steps.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Turn-by-turn</p>
          <ol className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-xl border border-line p-2">
            {route.steps.map((step, i) => (
              <li key={`${i}-${step.instruction}`} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm odd:bg-raised/50">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-600 text-[10px] font-black text-white">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  {step.instruction}
                  {step.distanceMeters > 0 && (
                    <span className="ml-1 text-xs text-muted">
                      · {step.distanceMeters >= 1000 ? `${(step.distanceMeters / 1000).toFixed(1)} km` : `${step.distanceMeters} m`}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <p className="text-[11px] text-muted">Map and routing data © OpenStreetMap contributors.</p>
        </div>
      )}
    </Card>
  );
}

function InfoBlock({ title, children, icon: Icon }: { title: string; children: ReactNode; icon?: typeof MapPin }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
        {Icon && <Icon className="h-4 w-4 text-teal-600" aria-hidden />}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function DestinationPage() {
  const { slug } = useParams<{ slug: string }>();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDestination(null);
    setError(null);
    api
      .get<{ destination: Destination }>(`/api/travel/destinations/${slug}`)
      .then((res) => {
        if (!cancelled) setDestination(res.data.destination);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-sm text-red-600">{error}</p>
        <Link to="/travel" className="text-sm font-semibold text-brand-700">Back to Places to Visit</Link>
      </div>
    );
  }
  if (!destination) return <PageLoader />;

  const style = CATEGORY_STYLES[destination.category];
  const gallery = [destination.imageUrl, ...destination.gallery].filter(Boolean).slice(0, 5);

  return (
    <article className="flex flex-col gap-6">
      <Link to="/travel" className="text-sm font-semibold text-teal-700 dark:text-teal-300">← All places</Link>

      <div className="relative overflow-hidden rounded-3xl">
        <PlaceImage
          src={destination.imageUrl}
          name={destination.name}
          category={destination.category}
          className="aspect-[16/9] w-full object-cover sm:aspect-[21/9]"
        />
        <div className="photo-tint absolute inset-0" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 text-white sm:p-7">
          <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${style.chip}`}>{tt(style.label)}</span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">{destination.name}</h1>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" aria-hidden /> {destination.region}
              {destination.city ? ` · ${destination.city}` : ""}
            </span>
            {destination.reviewCount > 0 ? (
              <span className="flex items-center gap-1 text-amber-200">
                <Star className="h-4 w-4 fill-current" aria-hidden /> {destination.rating.toFixed(1)} ({destination.reviewCount} reviews)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-200">
                <Sparkles className="h-4 w-4" aria-hidden /> New guide
              </span>
            )}
            <span>
              {budgetLabel(destination.budgetLevel)} · {destination.durationDays}{" "}
              {destination.durationDays === 1 ? "day" : "days"}
            </span>
          </p>
        </div>
      </div>

      {gallery.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {gallery.slice(1).map((image) => (
            <img
              key={image}
              src={image}
              alt=""
              loading="lazy"
              className="h-24 w-36 shrink-0 rounded-xl border border-line object-cover"
            />
          ))}
        </div>
      )}

      <p className="text-base leading-relaxed text-ink">{destination.summary}</p>

      {destination.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {destination.tags.map((tag) => (
            <li key={tag} className="rounded-full bg-raised px-2.5 py-1 text-[11px] font-semibold text-muted">
              #{tag}
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="flex flex-col gap-5 p-5">
          <InfoBlock title="Full story" icon={Sparkles}>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink/90">{destination.description}</p>
          </InfoBlock>

          <InfoBlock title="What is there" icon={Mountain}>
            <ul className="flex flex-wrap gap-2">
              {destination.highlights.map((item) => (
                <li key={item} className="rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/70 dark:from-emerald-500/10 dark:to-teal-500/10 dark:text-emerald-200 dark:ring-emerald-400/20">
                  {item}
                </li>
              ))}
            </ul>
          </InfoBlock>

          <InfoBlock title="Things to do" icon={Route}>
            <ul className="flex flex-col gap-2">
              {destination.activities.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-ink/90">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-500" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </InfoBlock>
        </Card>

        <div className="flex flex-col gap-3">
          <Card className="flex flex-col gap-3 border-t-4 border-t-amber-400 p-4">
            <InfoBlock title="Best time to visit" icon={CalendarDays}>
              <p className="text-sm font-medium text-ink">{destination.bestTime}</p>
            </InfoBlock>
            <InfoBlock title="Entry fee" icon={Ticket}>
              <p className="text-sm font-medium text-ink">{destination.entryFee ?? "Free or varies"}</p>
            </InfoBlock>
            <InfoBlock title="Trip length" icon={Clock}>
              <p className="text-sm font-medium text-ink">
                {destination.durationDays} {destination.durationDays === 1 ? "day" : "days"} · {budgetLabel(destination.budgetLevel)}
              </p>
            </InfoBlock>
          </Card>

          <Card className="flex flex-col gap-3 border-t-4 border-t-teal-400 p-4">
            <InfoBlock title="Getting there" icon={Route}>
              <p className="text-sm text-ink/90">{destination.gettingThere}</p>
            </InfoBlock>
            <p className="text-sm text-muted">
              Plan the full drive on the OpenStreetMap canvas below — no need to leave Ethio Quest.
            </p>
          </Card>

          <Link to="/experiences/new">
            <Button className="w-full">
              <Sparkles className="h-4 w-4" aria-hidden />
              Share your visit
            </Button>
          </Link>
        </div>
      </div>

      <RoutePlanner destination={destination} />

      {destination.imageCredit && (
        <p className="text-[11px] text-muted">Photo: {destination.imageCredit}</p>
      )}

      {destination.experiences.length > 0 && (
        <InfoBlock title="Travellers' experiences">
          <ul className="grid gap-2 sm:grid-cols-2">
            {destination.experiences.map((experience) => (
              <li key={experience.id} className="rounded-2xl border border-line bg-surface p-3">
                <Link to={`/experiences/${experience.id}`} className="font-semibold text-brand-700 dark:text-brand-300">
                  {experience.title}
                </Link>
                <p className="text-xs text-muted">by {experience.author.displayName}</p>
              </li>
            ))}
          </ul>
        </InfoBlock>
      )}
    </article>
  );
}
