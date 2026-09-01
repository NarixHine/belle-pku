# Belle PKU Timetable

A lightweight WXT, Preact, and TypeScript browser extension that previews a PKU elective course section on the current timetable when its result row is hovered.

## Development

```bash
bun install
bun run dev
bun run dev:firefox
bun run typecheck
bun run build
bun run build:firefox
```

Load `.output/chrome-mv3` as an unpacked Chromium extension or `.output/firefox-mv2` as a temporary Firefox add-on.

## Behavior

- Runs only on `https://elective.pku.edu.cn/elective2008/.../electiveWork/` routes.
- Treats the `.datagrid` table whose action header is `取消` as the authoritative `已选列表` and renders its schedules as existing lessons.
- Uses only the `.datagrid` table whose action header is `预选` as the hover source, so rows in `已选列表` never become candidates.
- Discovers schedule and identity columns by Chinese header labels rather than fixed indexes.
- Previews only the hovered section. Existing lessons have solid borders; the candidate has a dashed border and spacious diagonal hatching.
- Marks overlapping candidate meetings as conflicts while leaving the existing block visible below them.
- Uses one pointer-transparent Shadow DOM overlay, so links, inputs, pagination, and `预选` continue to behave normally.
- Parses only rows currently in the DOM. It does not fetch other result pages or persist its own selected-course state.

## Manual Smoke Check

- Verify unrelated PKU routes do not create `<belle-pku-timetable>`.
- Hover the course name, teacher, schedule, and `预选` cells for the same row.
- Check single-slot, multi-slot, and multi-meeting sections.
- Check a conflicting section and a conflict-free section.
- Replace or append a course row in DevTools and hover it.
- Check back/forward navigation, narrow viewports, and reduced-motion mode.
- Confirm portal links, inputs, pagination, and `预选` clicks are unobstructed.
- Confirm there are no console errors in Chromium or Firefox.

## Debugging

Open the page's DevTools Console and filter for `[Belle PKU]`. Debug logging is enabled by default and reports URL gating, table discovery, row parsing, existing lessons, and rendering.

Expected sequence after reloading and hovering a selectable row:

```text
[Belle PKU] Content script loaded
[Belle PKU] Shadow UI mounted
[Belle PKU] Hover controller installed on course badges
[Belle PKU] Hover: capture listener received its first mouseover
[Belle PKU] Hover: selectable row entered
[Belle PKU] Row parser: candidate parsed
[Belle PKU] Existing lessons parsed
[Belle PKU] Preview rendered
```

Disable logs for the current tab with `sessionStorage.setItem('belle-pku-debug', '0')`, or re-enable them with `sessionStorage.removeItem('belle-pku-debug')`, then reload the page.
