// Downloads one photo per destination from Wikimedia Commons, crops it to a
// consistent 1200×800 WebP and writes the slug → photo map used by the seed.
// Run from backend/: node scripts/fetch-destination-images.mjs
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const PLACES = [
  ["lalibela-rock-hewn-churches", "Lalibela rock hewn churches"],
  ["fasil-ghebbi", "Fasil Ghebbi Gondar"],
  ["axum-obelisks", "Axum stelae obelisk"],
  ["harar-jugol", "Harar Jugol walled city"],
  ["debre-damo-monastery", "Debre Damo monastery"],
  ["tiya-stelae", "Tiya stelae Ethiopia"],
  ["adwa-victory-memorial-museum", "Adwa Victory Memorial"],
  ["yeha-temple", "Yeha temple Ethiopia"],
  ["debre-libanos-monastery", "Debre Libanos monastery Ethiopia"],
  ["gedeo-cultural-landscape", "Gedeo cultural landscape Ethiopia"],
  ["simien-mountains", "Simien Mountains Ethiopia"],
  ["bale-mountains", "Bale Mountains Sanetti plateau"],
  ["danakil-depression", "Danakil Depression Ethiopia"],
  ["erta-ale", "Erta Ale volcano Ethiopia"],
  ["awash-national-park", "Awash National Park Ethiopia"],
  ["nechisar-national-park", "Nechisar National Park Ethiopia"],
  ["guassa-conservation-area", "Guassa community conservation area"],
  ["mago-national-park", "Mago National Park Ethiopia"],
  ["babile-elephant-sanctuary", "Babile elephant sanctuary"],
  ["menagesha-suba-forest", "Menagesha Suba forest Ethiopia"],
  ["lake-tana", "Lake Tana Bahir Dar"],
  ["blue-nile-falls", "Blue Nile Falls Tis Issat Ethiopia"],
  ["lake-hawassa", "Lake Hawassa Ethiopia"],
  ["lake-chamo", "Lake Chamo Ethiopia"],
  ["wenchi-crater-lake", "Wenchi crater lake Ethiopia"],
  ["lake-hora", "Lake Hora Bishoftu Ethiopia"],
  ["lake-langano", "Lake Langano Ethiopia"],
  ["abijatta-lake", "Abijatta lake Ethiopia"],
  ["dendi-crater-lake", "Dendi lake Bishoftu"],
  ["omo-valley", "Omo River valley"],
  ["konso-cultural-landscape", "Konso cultural landscape Ethiopia"],
  ["dorze-village", "Dorze village Ethiopia"],
  ["turmi", "Turmi Hamer Ethiopia"],
  ["chencha", "Chencha Ethiopia"],
  ["yirgalem", "Yirga Alem Sidama"],
  ["entoto-mountain", "Entoto mountain Addis Ababa"],
  ["national-museum-ethiopia", "Lucy Dinkinesh National Museum Addis Ababa"],
  ["unity-park", "Unity Park Addis Ababa"],
  ["merkato", "Merkato Addis Ababa market"],
  ["dire-dawa", "Dire Dawa Ethiopia"],
  ["bishoftu", "Bishoftu crater lake Ethiopia"],
  ["arba-minch", "Arba Minch Ethiopia"],
  ["halala-kella", "Halala Kella hot springs"],
  ["sof-omar-caves", "Sof Omar caves Ethiopia"],
  ["abuna-yemata-guh", "Abuna Yemata Guh Tigray"],
  ["mount-zuqualla", "Mount Zuqualla Ethiopia"],
  ["gheralta-mountains", "Gheralta mountains Tigray"],
  ["wenchi-eco-tourism", "Wenchi lake Ethiopia"],
  ["portuguese-bridge", "Portuguese bridge Ethiopia Debre Libanos"],
  ["abijatta-shalla-national-park", "Abijatta Shalla National Park Ethiopia"],
];

const OUT_DIR = path.resolve("../frontend/public/destinations");
const SEARCH = "https://commons.wikimedia.org/w/api.php";
const UA = "EthioQuest/1.0 (destination photo seeding; contact: dev@ethioquest.test)";
const BAD_WORDS = ["map", "logo", "diagram", "flag", "coat of arms", "portrait", "banner", "chart", "graph"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function relevance(title, query) {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const haystack = title.toLowerCase();
  return words.filter((word) => haystack.includes(word)).length;
}

async function findPhoto(query) {
  const url = new URL(SEARCH);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrsearch", `${query} Ethiopia`);
  url.searchParams.set("gsrlimit", "8");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|mime|size|extmetadata");
  url.searchParams.set("iiurlwidth", "1600");

  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`Commons search failed: ${response.status}`);
  const data = await response.json();
  const pages = Object.values(data.query?.pages ?? {});

  const candidates = pages
    .map((page) => ({ page, info: page.imageinfo?.[0] }))
    .filter(({ page, info }) => {
      if (!info?.thumburl) return false;
      if (!/^image\/(jpeg|png|webp)$/.test(info.mime ?? "")) return false;
      if ((info.width ?? 0) < 800) return false;
      const title = page.title.toLowerCase();
      return !BAD_WORDS.some((word) => title.includes(word));
    })
    .map(({ page, info }) => ({ page, info, score: relevance(page.title, query) }))
    .sort((a, b) => b.score - a.score);

  return candidates[0] ?? null;
}

async function download(candidate) {
  const response = await fetch(candidate.info.thumburl, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`download failed: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  return sharp(buffer)
    .rotate()
    .resize(1200, 800, { fit: "cover", position: "centre" })
    .webp({ quality: 78 })
    .toBuffer();
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const map = {};

  for (const [slug, query] of PLACES) {
    try {
      const candidate = await findPhoto(query);
      if (!candidate) {
        console.warn(`skip  ${slug}: no usable photo`);
        continue;
      }
      const webp = await download(candidate);
      await fs.writeFile(path.join(OUT_DIR, `${slug}.webp`), webp);

      const meta = candidate.info.extmetadata ?? {};
      const artist = stripHtml(meta.Artist?.value) || "Wikimedia Commons contributor";
      const license = stripHtml(meta.LicenseShortName?.value) || "free licence";
      map[slug] = {
        url: `/destinations/${slug}.webp`,
        credit: `${artist} / Wikimedia Commons (${license})`,
      };
      console.log(`ok    ${slug} ← ${candidate.page.title} (${Math.round(webp.length / 1024)} kB)`);
    } catch (error) {
      console.warn(`fail  ${slug}: ${error.message}`);
    }
    await sleep(350);
  }

  const body = Object.entries(map)
    .map(([slug, value]) => `  "${slug}": ${JSON.stringify(value)},`)
    .join("\n");

  await fs.writeFile(
    path.resolve("prisma/data/images.ts"),
    `/** slug → bundled photo and its Wikimedia Commons credit. Generated by scripts/fetch-destination-images.mjs. */\nexport const IMAGES: Record<string, { url: string; credit: string | null }> = {\n${body}\n};\n`,
  );
  console.log(`\nWrote ${Object.keys(map).length}/${PLACES.length} photos and prisma/data/images.ts`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
