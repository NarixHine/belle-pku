# Belle PKU Design System

## Product Character

Belle PKU makes course preselection easier to scan and safer to act on. It should feel immediate, calm, friendly, and lightly human without becoming decorative.

The visual reference is a focused productivity surface: strong typography, generous whitespace, direct manipulation, restrained color, and almost no ornamental UI. The timetable preview is the core product feature and must remain visible by default.

## Core Principles

1. Remove anything that does not help users compare courses, detect conflicts, set willingness values, or preselect a course.
2. Use one narrow, single-column course flow. Keep it wide enough for a legible five-day timetable, but never viewport-wide.
3. Use surface-based course cards to group one course's identity, timetable, demand, and action. Do not nest decorative cards inside cards.
4. Avoid ornamental borders, separators, and shadows. Use surface color, spacing, and typography for hierarchy.
5. Timetable grid lines and progress tracks are functional data encoding and are the exception to the no-divider rule.
6. Avoid eyebrow-plus-heading patterns. Use one direct heading.
7. Keep the timetable visible by default. Collapse only the raw portal class and exam prose.
8. Minimize clicks. Course details, conflicts, capacity, and the primary action must be immediately visible.
9. Preserve the portal's native links, inputs, pagination, and selection behavior as the source of truth.

## Color

### Brand

- Primary: `#94070A`
- Primary foreground: `#FFFFFF`
- Use primary for the preselection action, focus, and small emphasis.

### Neutral Palette

- Page background: `#FFFDFC`
- Primary text: `#1A1A1A`
- Secondary text: `#5D5B54`
- Muted text: `#787671`
- Course surface: `#FFFFFF`
- Subtle surface: `#F7F3F1`
- Secondary surface: `#F5EFED`
- Input border: `#C8C4BE`
- Timetable grid: `#E5E3DF`

### Status Colors

- Blue: informational status only.
- Green: available, synchronized, or completed states only.
- Red: conflicts, oversubscription, destructive states, deadlines, and primary action only.
- Do not use purple, gradients, or decorative pastel collections.

## Typography

- Font family: system default with Chinese system fallbacks.
- Body: 14–16px, regular weight, relaxed line height.
- Page heading: approximately 28px, medium weight, tight tracking.
- Course heading: approximately 20–22px, medium weight.
- Labels: 12px, medium weight.
- Metadata and hints: 11–13px, muted.
- Use tabular numerals for course codes, credits, capacity, and counters.
- Do not use all-caps labels or eyebrow text.

## Layout

- Main flow: approximately 74rem maximum, centered with at least 24px desktop gutters.
- Mobile uses available width with 16px gutters.
- Course cards form two equal columns on wide desktop screens with 12–16px gaps, collapsing to one column when the timetable would become cramped.
- Each course uses one neutral outer border. Do not add internal borders or conflict-colored card borders.
- Course identity and key metrics may use two columns where space permits; mobile collapses to one.
- The timetable spans the card width and remains visible by default.
- Raw portal schedule prose uses one native disclosure below the timetable.
- Keep `已选` before `限数`, with the selected count visually emphasized.

## Shape

- Course and filter surfaces use friendly 12–16px corners.
- Controls use 8–12px corners.
- Status badges may be fully rounded.
- Roundness should make the interface approachable, not turn every element into a card.

## Interaction

- Buttons provide subtle press feedback with `scale(.97)`.
- Keep routine filtering and sorting instant; do not animate list reordering.
- Use visible keyboard focus rings.
- Respect `prefers-reduced-motion`.
- Native disclosure is preferred for raw schedule information.

## Do

- Keep the interface monochrome with restrained `#94070A` emphasis.
- Use whitespace and surface changes instead of borders and separators.
- Keep labels direct and in Chinese.
- Show timetable conflicts with a status badge and the timetable's established conflict treatment. Keep course-link color neutral.
- Keep course links visibly underlined at rest.
- Make the shortest path the default path.
- Preserve the timetable preview as the core course-comparison tool.

## Do Not

- Do not replace the timetable with raw class or exam text.
- Do not add eyebrow text.
- Do not add generic dashboard grids or viewport-wide tables.
- Do not add ornamental borders, divider lines, or shadows.
- Do not add purple branding, navy marketing bands, gradients, or mesh illustrations.
- Do not hide required actions behind menus.
- Do not modify the cancellation table's presentation.
