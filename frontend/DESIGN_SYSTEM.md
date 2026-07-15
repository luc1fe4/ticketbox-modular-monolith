# TicketBox Frontend Design System

This is the visual source of truth for customer-facing TicketBox interfaces.

## Collaborator setup

After cloning the repository, the frontend guidance in `frontend/AGENTS.md` is automatically scoped to frontend work in Codex.

To explicitly register the reusable TicketBox skill, link the tracked skill folder into the personal Codex skill directory.

Linux, macOS, or WSL:

```bash
mkdir -p "$HOME/.codex/skills"
ln -sfn "$(realpath skills/ticketbox-frontend-design)" \
  "$HOME/.codex/skills/ticketbox-frontend-design"
```

Windows PowerShell:

```powershell
$source = Resolve-Path ".\skills\ticketbox-frontend-design"
$destination = "$HOME\.codex\skills\ticketbox-frontend-design"

New-Item -ItemType Directory -Path "$HOME\.codex\skills" -Force
New-Item -ItemType Junction -Path $destination -Target $source
```

Restart Codex after creating the link. Then invoke it with:

```text
Use $ticketbox-frontend-design to build [feature] in the existing TicketBox visual language.
```

## Design direction

TicketBox should feel like an editorial guide to Vietnamese live culture: cinematic, energetic, premium, and human.

- Ink-black backgrounds and layered dark surfaces
- Warm coral accents for action and emotion
- Image-led storytelling
- Bold geometric headings with occasional editorial italics
- Spacious compositions with fine borders
- Restrained motion that supports hierarchy

Avoid making it feel like a generic SaaS dashboard, neon gaming interface, or component-library demo.

## Canonical tokens

The implemented tokens live in `src/app/app.css`.

```css
:root {
  --ink: #0b0b0d;
  --surface: #121216;
  --surface-2: #19191f;
  --line: rgba(255, 255, 255, 0.12);
  --muted: #a7a4ad;
  --coral: #ff765f;
  --coral-light: #ff9a86;
  --violet: #8f7aff;
  --cream: #f7f4ee;
}
```

- Use `--ink` as the main canvas.
- Use `--surface` and `--surface-2` for depth.
- Use `--coral` for primary actions, selection, and short emotional accents.
- Use `--violet` sparingly for supporting gradients or ticket zones.
- Use `--line` for quiet structure.
- Do not add a second primary accent without updating this document.

## Typography

| Role | Typeface | Usage |
|---|---|---|
| Display and UI headings | Manrope | Headings, buttons, navigation, prices |
| Body and form copy | DM Sans | Paragraphs, metadata, inputs |
| Editorial accent | Playfair Display Italic | One meaningful phrase within major headings |

- Keep headlines short and balanced.
- Use tight display tracking, approximately `-0.055em`.
- Use uppercase only for small eyebrows and metadata.
- Use editorial italics selectively.
- Prefer sentence case for interface labels.
- Format dates, currency, and numbers with `Intl.*`.

```tsx
<h1>
  Feel it live. <em>Remember it forever.</em>
</h1>
```

## Layout and spacing

- Standard content width: `min(100% - 48px, 1280px)`.
- Mobile horizontal margin: `16px`.
- Major desktop sections use roughly `90–130px` vertical padding.
- Keep marketing pages asymmetrical and spacious.
- Keep transactional pages compact and easy to scan.
- Sticky summaries are desktop-only.

Breakpoints:

- `980px`: tablet layout and simplified navigation
- `700px`: single-column mobile layout

Check every new screen at approximately:

- `1440 x 900`
- `768 x 1024`
- `390 x 844`

## Core patterns

### Buttons

```tsx
<button className="button button-primary">Choose tickets</button>
<button className="button button-secondary">View details</button>
```

- Primary buttons use coral with dark text.
- Secondary buttons use a quiet dark surface and fine border.
- Keep controls at least `48px` high.
- Use specific labels such as “Choose tickets.”
- Disabled buttons must remain legible and must not animate.

### Event cards

Reuse `src/components/EventCard.tsx`.

- Let artwork occupy most of the card.
- Use a small status badge and directional affordance.
- Keep metadata concise.
- Handle long content safely.
- Animate image scale subtly; do not animate every child.

### Forms

- Every input needs a visible label.
- Use correct `type`, `name`, `autocomplete`, and `inputmode`.
- Keep fields at least `50px` high.
- Use coral borders and a soft ring for focus.
- Put validation beside the field.
- Never disable paste.

### Empty, loading, and error states

Every data-driven surface needs:

- A skeleton or clear loading state
- A useful empty state
- An error message with a recovery action

### Tickets and checkout

- Use the progress pattern: Tickets → Checkout → Done.
- Always show the reservation, total price, and next action.
- Show upcoming, used, and expired tickets distinctly.
- Payment failure must state that no charge was made.

## Imagery

- Favor cinematic live-performance photography with deep shadows.
- Preserve dark negative space for text.
- Avoid recognizable celebrities unless licensed.
- Avoid embedded text, logos, and watermarks.
- Always set image dimensions.
- Eager-load only critical above-the-fold images.
- Use overlays to protect text contrast.

## Motion

- Animate `transform` and `opacity` where possible.
- Typical duration: `180–600ms`.
- Use motion for hover, reveal, selection, and focus.
- Never use `transition: all`.
- Honor `prefers-reduced-motion`.

## Accessibility

- Semantic landmarks and heading order
- Keyboard-operable controls
- Visible `:focus-visible` styles
- Labels for form controls
- Accessible names for icon-only buttons
- Decorative images use `alt=""`
- Sufficient contrast
- Touch targets near or above `44px`
- No zoom restrictions
- Reduced-motion support

## Code conventions

- Reuse tokens and components before adding variants.
- Put shared mock data and formatters in `src/data`.
- Put reusable UI in `src/components`.
- Keep pages focused on composition and flow.
- Derive values during render instead of syncing derived state.
- Use functional state updates when based on previous state.
- Keep static arrays and formatters outside components.
- Avoid dependencies for patterns the current stack handles well.

## Avoid

- Generic purple-to-blue SaaS gradients
- Excessive glassmorphism, glow, or rounded cards
- Rounded containers around every content block
- Multiple prominent calls to action in one section
- Tiny low-contrast text
- Arbitrary colors outside the token system
- Emoji as production icons
- Hard-coded currency and date strings
- Desktop-only layouts
- Duplicate visual patterns

## Definition of done

1. Compare the result with the homepage, event details, checkout, and My Tickets.
2. Verify desktop, tablet, and mobile layouts.
3. Test keyboard navigation and focus.
4. Test relevant loading, empty, error, and disabled states.
5. Run:

```bash
npm run lint
npm run build
```

6. Use browser-based visual testing when available.
