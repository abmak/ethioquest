/** One place in the visitor catalogue. Image fields are filled in by index.ts. */
export interface DestinationSeed {
  slug: string;
  name: string;
  region: string;
  city: string;
  category: "HISTORY" | "HERITAGE" | "NATURE" | "WILDLIFE" | "ADVENTURE" | "CULTURE" | "CITY" | "FOOD";
  tagline: string;
  summary: string;
  description: string;
  highlights: string[];
  activities: string[];
  bestTime: string;
  gettingThere: string;
  entryFee: string;
  durationDays: number;
  budgetLevel: 1 | 2 | 3;
  lat: number;
  lng: number;
  featured?: boolean;
  tags: string[];
}
