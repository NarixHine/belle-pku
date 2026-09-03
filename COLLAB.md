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
- Treats the `.datagrid` table whose action header is `取消` as the authoritative `已选列表` for conflict detection, without changing its presentation.
- Replaces only the `.datagrid` table whose action header is `预选` with a two-column course list on wide screens and one column on narrower screens.
- Discovers all course columns by Chinese header labels rather than fixed indexes.
- Shows the visual timetable by default, keeps raw schedule and exam text in a disclosure, and visualizes conflicts and demand against capacity.
- Proxies willingness inputs, course links, preselection actions, and pagination to the portal's original controls.
- Supports keyword, category, and availability filters plus availability, demand, and credit sorting.
- Parses only rows currently in the DOM. It does not fetch other result pages or persist its own selected-course state.

## Manual Smoke Check

- Verify unrelated PKU routes do not create `<belle-pku-timetable>`.
- Check keyword/category/availability filters and each sorting option.
- Check single-slot, multi-slot, multi-meeting, and exam-only sections.
- Check conflict styling and capacity progress for under- and over-subscribed courses.
- Replace or append a course row in DevTools and confirm the course list redraws.
- Check back/forward navigation, narrow viewports, and reduced-motion mode.
- Confirm course links, willingness inputs, pagination, and `预选` proxy to the portal controls.
- Confirm there are no console errors in Chromium or Firefox.

## Debugging

Open the page's DevTools Console and filter for `[Belle PKU]`. Debug logging is enabled by default and reports URL gating, table discovery, row parsing, existing lessons, and rendering.

Expected sequence after reloading a selectable list:

```text
[Belle PKU] Row parser: candidate parsed
[Belle PKU] Existing lessons parsed
[Belle PKU] Course cards mounted
```

Disable logs for the current tab with `sessionStorage.setItem('belle-pku-debug', '0')`, or re-enable them with `sessionStorage.removeItem('belle-pku-debug')`, then reload the page.

## Lifecycle

The content script mounts on supported routes, parses the elected schedule, and replaces the selectable table with course cards in an isolated Shadow DOM. Table mutations redraw the card list, route changes tear down the UI and restore the source table, and invalidation cleans up everything.
