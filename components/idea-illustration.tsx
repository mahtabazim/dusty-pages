import { cn } from "@/lib/utils";

/**
 * Decorative flat illustration for the "how it works" hero: a stack of books
 * with coins arcing off it, i.e. books → coins → books.
 *
 * Colors are driven by theme tokens rather than literals so it tracks light and
 * dark mode automatically. It is purely decorative — the surrounding section
 * carries the meaning, so it is hidden from assistive tech.
 */
export function IdeaIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 200"
      fill="none"
      aria-hidden
      focusable="false"
      className={cn("h-auto w-full", className)}
    >
      {/* Ground wash */}
      <ellipse cx="118" cy="172" rx="86" ry="10" className="fill-primary/10" />

      {/* Book stack — each volume is a slab plus a lighter page block, so the
          spine/pages read at small sizes without extra detail. */}
      <g>
        <rect x="42" y="146" width="152" height="20" rx="5" className="fill-primary/25" />
        <rect x="50" y="151" width="136" height="5" rx="2.5" className="fill-primary/40" />

        <rect x="52" y="122" width="132" height="20" rx="5" className="fill-primary" />
        <rect x="60" y="127" width="116" height="5" rx="2.5" className="fill-primary-foreground/40" />

        <rect x="36" y="98" width="146" height="20" rx="5" className="fill-accent" />
        <rect x="44" y="103" width="130" height="5" rx="2.5" className="fill-accent-foreground/25" />
      </g>

      {/* Open book resting on top */}
      <g>
        <path
          d="M60 96C60 96 78 84 100 90V64C78 58 60 70 60 70V96Z"
          className="fill-card stroke-primary/50"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M140 96C140 96 122 84 100 90V64C122 58 140 70 140 70V96Z"
          className="fill-card stroke-primary/50"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M100 90V64" className="stroke-primary/50" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M70 74h20M70 82h18M112 74h20M114 82h18"
          className="stroke-primary/25"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* Coin arc — dashed path implies motion from the books outward */}
      <path
        d="M150 88C176 78 196 64 206 44"
        className="stroke-coin/45"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="5 8"
      />
      <Coin cx={158} cy={92} r={11} />
      <Coin cx={190} cy={66} r={9} />
      <Coin cx={214} cy={36} r={13} />

      {/* Sparkles */}
      <path
        d="M40 56l3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z"
        className="fill-primary/30"
      />
      <path
        d="M228 108l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z"
        className="fill-coin/40"
      />
    </svg>
  );
}

function Coin({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} className="fill-coin" />
      <circle
        cx={cx}
        cy={cy}
        r={r - 3.5}
        className="fill-none stroke-card/50"
        strokeWidth="1.5"
      />
    </g>
  );
}
