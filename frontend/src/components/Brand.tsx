import { useId } from "react";
import { cn } from "../lib/utils";

/**
 * Ethio Quest mark: a tilted gem badge with a coffee-bean core, a highland
 * sunburst and an orbiting ring. Everything animates gently via CSS so the
 * logo feels alive without a video or image asset.
 */
export function BrandMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" className={cn("brand-mark overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}-badge`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f766e" />
          <stop offset="38%" stopColor="#16a34a" />
          <stop offset="72%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
        <linearGradient id={`${id}-star`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff7d6" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.3" cy="0.2" r="0.8">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft halo behind the badge. */}
      <circle cx="32" cy="32" r="27" fill={`url(#${id}-glow)`} />

      {/* Rotating dashed orbit in the Ethiopian palette. */}
      <g className="brand-orbit">
        <circle
          cx="32"
          cy="32"
          r="29"
          fill="none"
          stroke="#f59e0b"
          strokeOpacity="0.55"
          strokeWidth="1.6"
          strokeDasharray="3 7"
          strokeLinecap="round"
        />
        <circle cx="32" cy="3" r="2.4" fill="#db2777" />
        <circle cx="32" cy="61" r="1.8" fill="#0ea5e9" />
      </g>

      {/* Gem badge: a rounded diamond, rotated a few degrees. */}
      <g transform="rotate(-8 32 32)">
        <rect x="10" y="10" width="44" height="44" rx="15" fill={`url(#${id}-badge)`} />
        <rect x="10" y="10" width="44" height="44" rx="15" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.2" />
        {/* Highlight sliver on the top edge. */}
        <path d="M17 20c4-5 10-7 16-7" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2.2" strokeLinecap="round" fill="none" />

        {/* Highland sunburst behind the core. */}
        <g className="brand-star" opacity="0.9">
          {Array.from({ length: 8 }).map((_, i) => (
            <rect
              key={i}
              x="31"
              y="15"
              width="1.8"
              height="6"
              rx="0.9"
              fill={`url(#${id}-star)`}
              transform={`rotate(${i * 45} 32 32)`}
            />
          ))}
        </g>

        {/* Coffee bean core: the shared table at the heart of the brand. */}
        <ellipse cx="32" cy="32" rx="9.5" ry="12" fill="#3b1f12" />
        <ellipse cx="32" cy="32" rx="9.5" ry="12" fill="none" stroke="#fde68a" strokeOpacity="0.65" strokeWidth="1.2" />
        <path d="M32 22c-4 5-4 15 0 20" stroke="#fde68a" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.85" />
        <circle cx="27.5" cy="26.5" r="2" fill="#ffffff" opacity="0.35" />
      </g>

      {/* Counter-rotating sparkle ring for depth. */}
      <g className="brand-orbit-reverse">
        <circle cx="32" cy="32" r="23" fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="0.8" strokeDasharray="1 6" />
      </g>
    </svg>
  );
}

/**
 * Animated wordmark. "Ethio" stays ink-coloured for contrast, "Quest" carries
 * the moving gradient, with a woven tilet underline beneath.
 */
export function BrandLockup({
  className,
  size = "md",
  tagline = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  tagline?: boolean;
}) {
  const markSize = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-16 w-16" }[size];
  const textSize = { sm: "text-base", md: "text-xl", lg: "text-3xl" }[size];

  return (
    <span className={cn("brand-lockup inline-flex items-center gap-2.5", className)}>
      <BrandMark className={cn(markSize, "brand-float")} />
      <span className="flex flex-col leading-none">
        <span className={cn("font-display font-black tracking-tight", textSize)}>
          <span className="text-ink">Ethio</span>{" "}
          <span className="brand-wordmark">Quest</span>
        </span>
        {tagline && (
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-muted">
            Learn · Explore · Share
          </span>
        )}
        <span className="brand-underline mt-1 h-[3px] w-full rounded-full" aria-hidden />
      </span>
    </span>
  );
}
