# 浏览助手 (Browser Agent App)

An HCI research prototype: a verification workspace for reviewing work done by browser-use agents. It pairs the agent's final claim with the recorded evidence — step transcripts, Python cells, page states, and browser screenshots — so reviewers can judge accuracy, perceived effort, and completion time.

> Built with React 19, TypeScript, Vite, and Bun.

## What it does

- Split workspace: recorded browser on the left, agent transcript and execution rail on the right.
- Inspect any step, replay previous/next through the run, or return to the final state.
- Zoom screenshots and inspect each step's Python cells, output, and captured page state.
- Accept or reject the result; the decision locks after one choice.
- Bilingual interface (中文 / English) with the matching recorded run and screenshots.
- Desktop-only layout, minimum 1280×720.

Agent runs are loaded from `src/data/agent-run.json` (Chinese) and `src/data/agent-run.en.json` (English), validated at startup against the Zod schema in `src/domain/run-schema.ts`. The header language toggle switches both the interface and the fixture; `?lang=en` / `?lang=zh` overrides the saved choice for a session. On first visit, a Chinese browser language (`zh`, `zh-CN`, `zh-TW`, `zh-Hant`, …) selects Chinese; every other language selects English. Screenshots live in `public/screenshots/` (`en/` holds the English set).

## Getting started

Requires [Bun](https://bun.sh/), Node.js 22.18+ for the screenshot script, and Google Chrome for E2E tests.

```sh
bun install
bun run dev        # http://127.0.0.1:5173
```

## Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the Vite dev server |
| `bun run build` | Typecheck and build production assets |
| `bun run preview` | Preview the production build |
| `bun run screenshots` | Regenerate Chinese and English screenshots |
| `bun run typecheck` | Run `tsc --noEmit` |
| `bun run lint` | Run Biome checks |
| `bun run format` | Format with Biome |
| `bun run test` | Run Vitest unit/component tests |
| `bun run test:e2e` | Run Playwright E2E tests in Chrome |
| `bun run react:doctor` | Run React Doctor diagnostics |

## Project layout

```text
src/
  App.tsx              verification workspace
  showcase.tsx         UI primitives showcase
  components/ui/       presentational components
  data/                recorded agent run fixture
  domain/              replay reducer and run schema
  styles/              design tokens and layout CSS
tests/                 Vitest tests
e2e/                   Playwright tests
scripts/               screenshot fixture generation
public/screenshots/    recorded browser screenshots
DESIGN.md              design system and interaction rules
```

Open `/showcase.html` to view the component primitives.

## Regenerating screenshots

```sh
bun run screenshots
```

This renders the Chinese and English fixture pages from `scripts/fixture-pages.ts` in headless Chrome and writes WebP files to `public/screenshots/` and `public/screenshots/en/`. The script runs under Node.js 22.18+ (direct TypeScript execution); use Node rather than Bun because Playwright's browser launch can hang under Bun.
