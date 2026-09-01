# Agent Guide

## Project

- Project: Belle PKU Timetable.
- Type: browser extension for PKU elective course pages.
- Framework: WXT `0.21.x` with Vite.
- UI: Preact `10.x` and JSX.
- Language: TypeScript `5.x`, with ES modules enabled.
- Supported browser builds: Chromium Manifest V3 and Firefox Manifest V2.
- Runtime target: `https://elective.pku.edu.cn/elective2008/*`.
- Main feature: preview a selectable PKU course section against the current timetable.
- Source entrypoint: `entrypoints/pku-timetable.content/index.tsx`.
- Generated directories: `.wxt/` and `.output/`; both are ignored and should not be edited manually.

## Package Manager

- Always use Bun. Do not use npm, pnpm, or yarn for project commands.
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

- Follow the existing four-space indentation and trailing-comma style.
- Prefer small, local changes that preserve the current WXT/Preact structure.
- Use explicit TypeScript types for DOM-facing code and parsed timetable data.
- Keep browser-page integration defensive: the page can replace table rows and mutate the DOM independently.
- Use Shadow DOM UI isolation for extension-rendered preview surfaces.
- Preserve normal page interaction. The overlay must not block links, inputs, pagination, or course-selection controls.
- Keep user-visible text consistent with the existing Simplified Chinese labels used by PKU pages.
- Add comments only where they explain non-obvious browser or DOM behavior.

## Architecture

- `entrypoints/pku-timetable.content/index.tsx`: content-script lifecycle, Shadow DOM mounting, badges, positioning, and route handling.
- `entrypoints/pku-timetable.content/hover-controller.ts`: badge hover lifecycle, delayed preview opening, close handling, and layout listeners.
- `entrypoints/pku-timetable.content/parse-course-table.ts`: selectable-course table discovery and row parsing.
- `entrypoints/pku-timetable.content/parse-timetable.ts`: elected/current timetable parsing.
- `entrypoints/pku-timetable.content/visual-model.ts`: conflict calculation and preview model construction.
- `entrypoints/pku-timetable.content/TimetablePreview.tsx` and `PreviewBlock.tsx`: Preact preview rendering.
- `entrypoints/pku-timetable.content/styles.css`: isolated preview styles.
- `wxt.config.ts`: extension manifest and browser-specific configuration.

## Verification

- After source changes, run `bun run typecheck` and the relevant `bun run build*` command.
- For DOM behavior changes, manually smoke-check the PKU page when available: row replacement, badge hover, conflicting and conflict-free courses, navigation, narrow viewports, and unobstructed page controls.
- Check both Chromium and Firefox behavior when changing browser integration or manifest-related code.
- Inspect generated output only as build verification; never edit `.output/` directly.

## Git And Workspace

- Do not commit generated output, `.wxt/`, `node_modules/`, logs, or local editor files.
- Do not reset, discard, or overwrite unrelated user changes.
- Before committing, inspect status and the complete diff, and stage only intended files.
