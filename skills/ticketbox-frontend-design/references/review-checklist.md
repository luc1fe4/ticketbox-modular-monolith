# TicketBox frontend review checklist

## Visual language

- Uses canonical color tokens
- Uses the intended typography roles
- Has one clear primary action per section
- Uses cinematic imagery with adequate contrast
- Matches existing border, radius, and spacing conventions
- Avoids generic SaaS styling

## Responsive behavior

- Works at desktop, tablet, and mobile widths
- Has no horizontal overflow
- Preserves reading order when stacked
- Sticky elements return to normal flow where necessary
- Touch targets remain usable

## States

- Loading
- Empty
- Error with recovery
- Disabled or sold out
- Success or confirmation
- Long-content behavior

Only include states relevant to the feature.

## Accessibility

- Semantic landmarks and heading hierarchy
- Form labels and correct input attributes
- Accessible names for icon-only controls
- Visible keyboard focus
- Decorative images have empty alt text
- Reduced-motion behavior
- Live regions for asynchronous status where needed

## Engineering

- Reuses existing components and tokens
- Shared values live outside page components
- Derived state is computed rather than synchronized in effects
- No unnecessary dependency
- `npm run lint` passes
- `npm run build` passes

