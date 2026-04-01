import type { Beer } from "../types/drinks";

interface Props {
  beer: Beer;
}

/**
 * Resolves the display URL for a beer image.
 * - S3 URLs and base64 data URLs are used as-is.
 * - Local catalogue filenames are mapped to the pre-generated WebP thumbnails.
 */
export function beerThumbUrl(image: string): string {
  if (image.startsWith("http") || image.startsWith("data:")) {
    return image;
  }
  const filename = image.split("/").pop()!;
  const base = filename.replace(/\.[^.]+$/, "");
  return `/beer_images/thumbs/${base}.webp`;
}

const PALETTES = [
  ["#fde68a", "#d97706", "#92400e"], // golden lager
  ["#fed7aa", "#ea580c", "#7c2d12"], // amber IPA
  ["#d1fae5", "#059669", "#064e3b"], // pale/green hop
  ["#e0e7ff", "#4f46e5", "#1e1b4b"], // hazy/purple
  ["#fce7f3", "#db2777", "#831843"], // sour/fruited
  ["#f5f5f4", "#57534e", "#1c1917"], // stout/dark
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

export function BeerPlaceholder({ beer }: Props) {
  const h = hash(beer.id);
  const [light, mid, dark] = PALETTES[h % PALETTES.length];

  const initials = beer.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <svg
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full rounded-lg"
    >
      {/* background */}
      <rect width="48" height="48" fill={light} rx="8" />

      {/* mid-tone shape — alternates between circle and diamond per beer */}
      {h % 2 === 0
        ? <circle cx="24" cy="24" r="16" fill={mid} opacity="0.6" />
        : <polygon points="24,6 42,24 24,42 6,24" fill={mid} opacity="0.6" />
      }

      {/* initials */}
      <text
        x="24" y="28"
        fill={dark}
        fontSize="13"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
        textAnchor="middle"
      >
        {initials}
      </text>

      {/* ABV pill — wider, bigger text, bottom-right */}
      <rect x="24" y="33" width="20" height="12" rx="5" fill={dark} />
      <text
        x="35" y="43"
        fill={light}
        fontSize="10"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
        textAnchor="middle"
      >
        {beer.abv}
      </text>
    </svg>
  );
}