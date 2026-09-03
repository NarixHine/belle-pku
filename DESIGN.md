---
version: alpha
name: Belle-PKU-OpenCode
description: |
  A compact course-selection interface combining OpenCode's terminal-native restraint with Peking University's deep red. Monospaced typography, warm cream canvas, 4px geometry, sparse hairlines, bracket markers, and direct controls organize dense course data without decoration. The timetable remains the core visual instrument.
colors:
  primary: "#94070A"
  primary-hover: "#790609"
  primary-active: "#610406"
  on-primary: "#FDFCFC"
  ink: "#201D1D"
  body: "#424245"
  mute: "#646262"
  ash: "#9A9898"
  canvas: "#FDFCFC"
  surface-soft: "#F8F7F7"
  surface-card: "#F4F1F1"
  hairline: "rgba(15,0,0,0.12)"
  hairline-strong: "#646262"
  danger: "#94070A"
  danger-soft: "#F8E9E6"
  progress: "#646262"
typography:
  family: "Berkeley Mono, IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace"
  heading:
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.25
  course-heading:
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.5
  caption:
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: 0px
  sm: 4px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
---

# Belle PKU Design System

## Product Character

Belle PKU is a course-comparison tool, not a marketing page and not a generic dashboard. It should read like a precise working document: immediate, tidy, calm, and dense only where the academic data requires density.

OpenCode contributes its monospaced voice, warm monochrome palette, square geometry, hairline structure, and bracket notation. PKU contributes `#94070A` as the sole accent. The timetable preview remains the core feature and is always visible.

## Principles

1. Preserve the shortest path from comparison to preselection.
2. Show course identity, demand, conflict state, timetable, willingness value, and `预选` without hidden navigation.
3. Use two course columns on wide screens and one column when either timetable would become cramped.
4. Give each course one hairline outer boundary. Do not nest bordered surfaces inside it.
5. Use whitespace and type weight before adding color or rules.
6. Keep raw portal schedule and exam prose behind one native disclosure below the timetable.
7. Preserve portal links, values, constraints, pagination, events, and actions as the source of truth.
8. Never alter the cancellation table's presentation.
9. If parsing fails, leave the native preselection table available.

## Typography

Use one monospaced family throughout:

```css
font-family: "Berkeley Mono", "IBM Plex Mono", ui-monospace,
    "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
```

Berkeley Mono is optional and may not be installed. The fallback stack must remain fully monospaced and support Chinese through the operating system's glyph fallback.

- Page heading: 28px / 700.
- Course heading: 18px / 700.
- Body and controls: 14px / 400-500.
- Labels: 12px / 500.
- Metadata: 11px / 400.
- Use tabular numerals for course codes, credits, capacity, page counts, and willingness values.
- Do not use eyebrow text, italics, ornamental tracking, or a secondary font.

## Color

- Canvas: `#FDFCFC`.
- Ink: `#201D1D`.
- Body: `#424245`.
- Muted: `#646262`.
- Disabled: `#9A9898`.
- Soft surface: `#F8F7F7`.
- Card surface: `#F4F1F1` only for compact metadata, not broad section bands.
- Hairline: `rgba(15, 0, 0, 0.12)`.
- PKU red: `#94070A`.

PKU red is reserved for the primary `预选` action, keyboard focus, conflicts, and exceeded capacity. Course links remain ink-colored and underlined. Normal enrollment text and progress are neutral.

Do not use blue, purple, gradients, shadows, large dark surfaces, or decorative pastel collections. The established timetable lesson palette is an explicit functional exception and must not be redesigned.

## Geometry

- All application containers and controls use either `0px` or `4px` radius.
- Course surfaces use one 1px hairline border and 0px radius.
- Inputs, buttons, badges, progress bars, and the timetable viewport use 4px radius.
- No drop shadows.
- Timetable grid lines and lesson borders encode data and are exempt from the one-border rule.

## Layout

- Maximum content width: approximately 1180px with 24px desktop gutters.
- Two equal course columns above 980px; one column below.
- Mobile gutters: 16px.
- Course surfaces align to content height rather than stretching to equal heights.
- Course header order: identity, badges, key metrics.
- Preselection course body order: timetable, raw-details disclosure, willingness and preselection action.
- 已选 course body omits the timetable preview; it keeps raw-details disclosure, willingness, and cancellation action.
- Display `已选 / 限数`, emphasizing `已选` first.

## Components

### Filters

- One flat hairline-bounded strip.
- Search begins with the textual marker `[/]`, not a decorative SVG icon.
- Inputs and selects use the canvas or soft surface with 4px radius.
- Focus uses a strong PKU-red border without glow.

### Course Surface

- One outer hairline, no shadow, no internal card border.
- Course name remains visibly underlined at rest and ink-colored in every state.
- Metadata badges are compact square chips with 4px radius.
- Conflict badge uses PKU red text on a restrained red tint.

### Timetable

- Visible by default.
- Header and viewport backgrounds are transparent.
- Preserve the committed lesson-block truth table exactly:
  - clear existing lessons: transparent fill and solid palette border;
  - conflicting existing lessons: 24% palette fill;
  - clear candidates: 26% palette fill and dashed border;
  - conflicting candidates: 30% red fill and red dashed border;
  - exact intersections: separate borderless hatch overlay and conflict label.
- Do not duplicate conflict logic outside the visual model.

### Disclosure

- Native `details`/`summary` only.
- Prefix closed state with `[+]` and open state with `[-]`.
- No chevron SVG, boxed accordion, or animation.

### Actions

- Primary `预选`: PKU-red fill, cream text, 4px radius, 36px minimum height.
- Secondary pagination: canvas fill, ink text, one hairline, 4px radius.
- Press feedback: `scale(.97)`; no movement animation elsewhere.
- Disabled controls use ash text and soft surface.

## Responsive Behavior

- Above 980px: two course columns and one horizontal filter strip.
- 700-980px: one course column; header and filters remain compact.
- Below 700px: identity and metrics stack; filters use two columns.
- Below 420px: filters use one column, page count becomes secondary, and the full five-day timetable remains visible.
- Never introduce horizontal page scrolling.

## Do

- Use monospaced typography everywhere.
- Use bracket markers where they replace an icon or disclosure affordance.
- Keep PKU red scarce and semantic.
- Keep timetable behavior and portal behavior authoritative.
- Prefer fewer components, fewer labels, and shorter copy.
- Leave the native table visible if replacement data is incomplete.

## Do Not

- Do not imitate OpenCode's marketing hero, dark TUI mockup, ASCII logo, or 96px landing-page spacing.
- Do not add extra panels, legends, sidebars, tabs, or decorative status rows.
- Do not add shadows, gradients, pill-shaped controls, large radii, or nonfunctional animation.
- Do not recolor course links red.
- Do not change lesson-block backgrounds, overlap rules, hatching, labels, or geometry without an explicit requirement.
- Do not hide required actions in menus.
