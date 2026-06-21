---
name: ticketbox-frontend-design
description: Build, redesign, or review customer-facing TicketBox frontend features in the repository's premium dark editorial visual language. Use for React and TypeScript work involving event discovery, concert details, ticket selection, checkout, authentication, customer tickets, responsive layouts, reusable components, mock prototypes, or visual consistency with existing TicketBox screens.
---

# TicketBox frontend design

## Establish context

1. Read `frontend/AGENTS.md`.
2. Read `frontend/DESIGN_SYSTEM.md`.
3. Inspect `frontend/src/app/app.css` and the closest existing screen.
4. Reuse current components, data models, formatters, and tokens.

## Build the feature

- Preserve the dark editorial direction, coral action color, cinematic imagery, typographic contrast, fine borders, and restrained motion.
- Keep React, TypeScript, Vite, and the existing Tailwind/CSS setup.
- Compose reusable components instead of duplicating page markup.
- Use mock data when backend integration is outside the request.
- Include responsive layouts and relevant loading, empty, error, disabled, success, sold-out, or expired states.
- Use semantic HTML, labels, keyboard interactions, visible focus, and reduced-motion handling.
- Use `Intl.*` for dates, currency, and numbers.
- Avoid generic SaaS styling, excessive rounded containers, decorative glow, arbitrary colors, emoji icons, and `transition: all`.

## Verify

Run from `frontend/`:

```bash
npm run lint
npm run build
```

When browser control is available:

1. Test the complete feature flow.
2. Inspect at `1440 x 900`, `768 x 1024`, and `390 x 844`.
3. Refine hierarchy, overflow, touch targets, and focus behavior.

Use [references/review-checklist.md](references/review-checklist.md) for the final pass.
