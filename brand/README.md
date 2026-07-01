# Lumen logo

New brand mark for Lumen. These are standalone SVG assets for review — nothing
in `app/`, `public/`, or `scripts/` has been changed, and none of these files
are wired into the build.

## Concept

Lumen is a *lumen* (a unit of light) for the reproductive life cycle: a
private, offline-first guide that lights the way from period tracking through
fertility, pregnancy, and postpartum, without turning your body into a data
product.

The mark reads two ideas at once:

- **The crescent** — the monthly cycle, phases, the moon. Familiar shorthand
  for cycle-tracking, but drawn soft and rounded rather than clinical.
- **The spark** — a small four-point light, the "lumen" itself: guidance and
  clarity, sitting quietly in the crescent's hollow rather than shouting for
  attention. It stands for the explainable, non-alarmist insights Lumen
  gives back from your own data.

Warm coral-to-berry gradient (`#fb7185 → #be123c`) keeps continuity with the
product's existing rose accent color (`theme_color: #e11d48` in
`app/manifest.ts`). The spark's soft gold (`#fde68a → #f59e0b`) is the one new
note — warmth and reassurance, distinct from the reds so it doesn't read as
just decoration.

The wordmark uses Geist (the app's existing font, `Geist` from
`next/font/google`), set lowercase to match the product's calm, unclinical
tone.

## Files

| File | Use |
|---|---|
| `logo-mark.svg` | Icon alone, transparent background, for light surfaces |
| `logo-icon-tile.svg` | Icon on a rounded square tile — app-icon / favicon style |
| `logo-lockup-horizontal.svg` | Icon + wordmark, for light backgrounds |
| `logo-lockup-horizontal-dark.svg` | Icon + wordmark, for dark backgrounds |
| `logo-monochrome.svg` | Single-color version (uses `currentColor`) for stamps, watermarks, or print |

## Adopting it

If this direction is approved, the actual app assets it would replace are:

- `public/icon.svg`, `public/icon-maskable.svg` and the generated PNGs
  (`public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`,
  `public/apple-touch-icon.png`, `app/favicon.ico`) — regenerate via
  `scripts/generate-icons.mjs`.
- Any header/wordmark usage in the app UI, if one gets added.

That wiring is intentionally not done here — this folder is the proposal.
