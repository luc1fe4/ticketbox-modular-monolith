# Frontend agent instructions

These instructions apply to all files under `frontend/`.

## Before editing

1. Read `DESIGN_SYSTEM.md`.
2. Inspect the closest existing page and reusable components.
3. Review the tokens and patterns in `src/app/app.css`.

## Implementation rules

- Preserve the TicketBox visual language: editorial dark surfaces, coral accents, cinematic imagery, strong typography, fine borders, and restrained motion.
- Keep React, TypeScript, Vite, and the existing Tailwind setup.
- Reuse design tokens and existing components before introducing new patterns.
- Keep shared data and formatters in `src/data`; keep reusable UI in `src/components`.
- Use semantic HTML, visible focus, accessible labels, and keyboard-operable controls.
- Support desktop, tablet, and mobile layouts.
- Include relevant loading, empty, error, disabled, and success states.
- Format locale-sensitive values with `Intl.*`.
- Do not modify the backend for mock-prototype frontend tasks.
- Avoid generic dashboard styling, excessive rounded cards, arbitrary gradients, emoji icons, and `transition: all`.

## Verification

Run from `frontend/`:

```bash
npm run lint
npm run build
```

When browser testing is available, verify at `1440 x 900`, `768 x 1024`, and `390 x 844`.

## Useful prompt

```text
Read frontend/AGENTS.md and frontend/DESIGN_SYSTEM.md. Build [feature] using the existing TicketBox visual language. Reuse current components and tokens, include responsive and accessibility states, then run lint and build.
```
