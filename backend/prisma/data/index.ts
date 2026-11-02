import type { DestinationSeed } from "./types";
import { heritage } from "./heritage";
import { nature } from "./nature";
import { water } from "./water";
import { villages } from "./villages";
import { cities } from "./cities";
import { adventure } from "./adventure";
import { IMAGES } from "./images";

const GROUPS: DestinationSeed[][] = [heritage, nature, water, villages, cities, adventure];

/**
 * The full Places to Visit catalogue with its bundled photo. Photos live in
 * frontend/public/destinations and are credited to Wikimedia Commons.
 */
export const DESTINATIONS = GROUPS.flat().map((place) => {
  const image = IMAGES[place.slug];
  return {
    ...place,
    imageUrl: image?.url ?? "",
    imageCredit: image?.credit ?? null,
  };
});
