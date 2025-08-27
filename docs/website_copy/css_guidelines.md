# CSS — Consolidation & Performance

## Consolidation
- Move inline CSS into shared stylesheets under `/docs/css/`
- Reuse variables for colors, spacing, and typography
- Avoid duplicating component styles across pages

## Performance
- Minimize critical CSS; defer non‑critical styles
- Use `preconnect` and `preload` for font performance as needed
- Keep animation usage moderate; avoid layout thrash

## Theming & Accessibility
- Ensure sufficient color contrast
- Respect reduced‑motion preferences where applicable

## Testing
- Validate across breakpoints; avoid layout shifts
- Test in light/dark backgrounds if applicable
