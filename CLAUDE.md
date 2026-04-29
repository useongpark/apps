# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

No build step. Open any `.html` file directly in a browser via `file://`, or serve locally:

```bash
npx serve .          # simple static server
```

## Running tests

```bash
node e2e.test.js     # runs all 43 Playwright E2E tests
```

No npm test script is configured. Tests use a custom `test()` / `expect()` harness (not Jest/Vitest).

## Architecture

All pages are self-contained HTML files with inline CSS and JS. No frameworks, no bundler.

### Supabase (persistence layer)

Every page loads the Supabase JS client via CDN and initializes the same client:

```js
const { createClient } = supabase;
const sb = createClient('https://xgumdnnlikiksdhedllz.supabase.co', '<anon-key>');
```

No user auth — anonymous access via public RLS policies. Pages load all data on init into in-memory JS variables, then sync writes to Supabase immediately on mutation. There is no re-fetch after init.

**Field name gotchas** (DB columns differ from local variable names):
- `desc` → `description` (reserved word in PostgreSQL)
- `dueDate` → `due_date`
- `projectId` → `project_id`
- `listId` → `list_id`

**Tables:** `reviews`, `todo_lists`, `todo_tasks` (FK→todo_lists, CASCADE), `habits`, `habit_logs` (composite PK: habit_id+date, FK→habits, CASCADE), `projects`, `milestones` (FK→projects, CASCADE), `calendar_events`

### In-memory data pattern (multi-table pages)

Pages like `planner.html` load 6 tables in parallel, then expose accessor objects:

```js
let listsData=[], tasksData=[], habitsData=[], logSet=new Set(), projectsData=[], milestonesData=[];
// parallel fetch on init, then read from memory, write to both memory + DB on mutation
```

`habits.html` uses `logSet = new Set()` of `"habitId:date"` strings for O(1) streak calculation.

### Korean holiday calendar (`calendar.html`)

Holidays are stored in two JS objects:
- `KR_FIXED` — keyed by `MM-DD` (e.g. `'05-05': '어린이날'`)
- `KR_LUNAR` — keyed by full `YYYY-MM-DD` (lunar holidays with pre-computed Gregorian dates, covering 2024–2028)

**대체공휴일 rules:**
- Applies to: 삼일절, 광복절, 개천절, 한글날, 어린이날, 부처님오신날, 크리스마스 — when Saturday **or** Sunday
- Applies to: 설날/추석 연휴 — only when a day falls on **Sunday** (Saturday does NOT trigger)
- Does **not** apply to: 현충일, 신정, 노동절 (노동절 is under a separate law)

### Shared utilities (defined in each page inline)

```js
function genId() { return Date.now().toString(36)+Math.random().toString(36).slice(2); }
function todayStr() { /* returns YYYY-MM-DD */ }
```

### localStorage usage

Only retained for: anonymous reviewer name/color in `comments.html`, "helpful" liked state per review, and submitted review IDs.

## Deployment

- **GitHub:** https://github.com/useongpark/apps
- **Vercel:** https://apps-liard-zeta.vercel.app
- Deploy: `npx vercel deploy` from the project root (`.vercel/` config already linked)
