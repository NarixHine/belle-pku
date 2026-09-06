# Agent Guide

## Project

- Project: Belle PKU Timetable.
- Type: browser extension for PKU elective course pages.
- Framework: WXT `0.21.x` with Bun & Vite.
- UI: Preact `10.x` and JSX.
- Language: TypeScript `5.x`, with ES modules enabled.
- Supported browser builds: Chromium Manifest V3 and Firefox Manifest V2.
- Runtime target: `https://elective.pku.edu.cn/elective2008/*`.
- Source entrypoint: `entrypoints/pku-timetable.content/index.tsx`.

## Package Manager

- Always use Bun.
- The repository lockfile is `bun.lock`; keep it in sync with dependency changes.
- Install dependencies with `bun install`.
- Run package scripts with `bun run <script>`.
- Run one-off executables with `bunx <command>` when needed.

## Commands

```sh
bun install
bun run dev
bun run dev:firefox
bun run dev:zen
bun run typecheck
bun run build
bun run build:firefox
bun run zip
bun run zip:firefox
```

- `bun run typecheck` runs TypeScript without emitting files.
- `bun run build` creates the Chromium build in `.output/chrome-mv3`.
- `bun run build:firefox` creates the Firefox build in `.output/firefox-mv2`.
- There are currently no project-defined test or lint scripts. Do not claim tests passed when only typechecking or building was run.

## Code Conventions

- IMPORTANT: Find existing/duplicate logic before you build and try refactor and reuse as much as possible to maximize maintainability and ensure consistency in user experience.
- Follow the existing four-space indentation and trailing-comma style.
- Prefer small, local changes that preserve the current WXT/Preact structure.
- Use explicit TypeScript types for DOM-facing code and parsed timetable data.
- Keep browser-page integration defensive: the page can replace table rows and mutate the DOM independently.
- Use Shadow DOM UI isolation for extension-rendered preview surfaces.
- Preserve normal page interaction. The overlay must not block links, inputs, pagination, or course-selection controls.
- Keep user-visible text consistent with the existing Simplified Chinese labels used by PKU pages.
- Add comments only where they explain non-obvious browser or DOM behavior.

## Verification

- After source changes, run `bun run typecheck` and the relevant `bun run build*` command.
- For DOM behavior changes, manually smoke-check the PKU page when available: row replacement, badge hover, conflicting and conflict-free courses, navigation, narrow viewports, and unobstructed page controls.
- Check both Chromium and Firefox behavior when changing browser integration or manifest-related code.
- Inspect generated output only as build verification; never edit `.output/` directly.

## Git And Workspace

- Do not commit generated output, `.wxt/`, `node_modules/`, logs, or local editor files.
- Do not reset, discard, or overwrite unrelated user changes.
- Before committing, inspect status and the complete diff, and stage only intended files.

## Lifecycle

The content script mounts on supported routes, parses the elected schedule, and replaces the selectable table with course cards in an isolated Shadow DOM. Table mutations redraw the card list, route changes tear down the UI and restore the source table, and invalidation cleans up everything.

## URL Map

- `/electiveWork/ElectiveWorkController.jpf`: 预选 candidate table and live 已选列表; refreshes the schedule cache.
- `/electiveWork/showResults.do`: 选课结果 history; valid `已选上` rows refresh the schedule cache, while `未选上` rows are excluded.
- `/courseQuery/getCurriculmByForm.do`: 加入选课计划 candidate table; supports optional/query-specific fields and cached schedule fallback.
- `/supplement/SupplyCancel.do?xh=<student-id>`: 补退选 candidate table plus 已选上列表; supports native `补选`/`刷新`, captcha gating, flexible capacity schemas, and schedule-cache refresh.

## Behavior

- Runs on supported `https://elective.pku.edu.cn/elective2008/...` elective-work, course-query, and supplement (`补退选`) routes.
- Replaces actionable tables with shared course cards in an isolated Shadow DOM while preserving native course details, actions, inputs, and pagination links. Mutation redraws are defensive because the portal replaces table DOM independently.
- `预选`, `加入选课计划`, and `补选` candidate tables share parsing and rendering. Optional/query-specific fields are tolerated; unknown non-core fields become badges.
- `补退选` candidate cards require a non-empty lowercase captcha before enabling the native action; each row preserves its native `补选` or full-course `刷新` label and destination. Extension captcha inputs, portal `validCode` inputs, and the captcha image stay synchronized.
- Candidate metrics are route-specific: 预选 uses `已选 / 限数`; 补退选 uses `候补 / 空缺`, with `空缺 = max(0, 限数 - 已选)`. Supplement progress is `候补 / 空缺`, capped at 100%, and shows red `溢出 n 人` when `候补 >= 空缺`.
- Candidate pagination uses the native `First`, `Previous`, `Next`, and `Last` links. 首页 triggers native `First` and appears for candidate tables, including 加入选课计划; selected-course pagination omits 首页.
- 已选列表 and 补退选的已选上列表 share the selected-course renderer. Supplement selected metrics use `候补 / 空缺`; 预选 selected metrics retain `已选 / 限数`.
- Selected-table courses whose status contains `候补` use a neutral dashed border and translucent neutral background. Red styling is reserved for capacity overflow.
- The current schedule is persisted as plain, versioned local-storage data and refreshed from valid selected data on `ElectiveWorkController.jpf`, `showResults.do`, and `SupplyCancel.do`. Other pages use a live selected table when available and otherwise fall back to the cache.
