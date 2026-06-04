# AI Agent Guide

You are an AI agent continuing this project. Read this first, then the doc matching your
task. This page is the rulebook: conventions, do/don't, and a safe-change checklist.

## Mental model (memorize this)

> **Zustand** = client state · **react-query** = server state · **URL params** = table
> state · **react-hook-form** = form fields.

Pick the tool by that split before writing any state code. Misplacing state (e.g. caching
server data in Zustand, or putting pagination in `useState`) is the most common mistake.

## Where things live

| You're touching… | Go to |
|---|---|
| A URL / page | `src/routes/` (file-based) |
| API call | `src/lib/services/<resource>.service.ts` |
| Server data hook | `src/hooks/use-<resource>.ts` |
| Client UI state | `src/lib/stores/` |
| Validation / search-param schema | `src/lib/schemas/` |
| Modal / table columns / cards | `src/components/features/<resource>/` |
| Layout / shared chrome | `src/components/templates/` |

Full map: [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md). State details:
[STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md). New feature recipe:
[ADDING_FEATURES.md](./ADDING_FEATURES.md).

## Conventions (match the existing code)

- **kebab-case** filenames. Hooks `use-*.ts`; stores `*.store.ts` exporting `use*Store`;
  services `*.service.ts`.
- Write arrays as **`Array<T>`** (eslint `array-type` enforces this).
- Imports are auto-ordered/sorted by eslint — run `bun run check` and let it fix.
- A **page hook** returns prop bundles (`tableProps`, `modalProps`, …); routes spread
  them. Keep routes and presentational components thin.
- Mutations go through **`useAppMutation`** with `invalidateKeys` + `successMessage`.
- Query keys: `['resource']`, `['resource', params]`, `['resource', 'all']`. Invalidate
  by the bare `['resource']`.
- Modals: open/close + entity + selection come from the **feature UI store**
  (`createCrudModalStore`); form fields use **react-hook-form**.

## Do

- Reuse `useAppMutation`, `useDataTable`, `useConfirmation`, `useUserPermission`,
  `createCrudModalStore` instead of re-implementing.
- Add `persist` to a store **only** for real user preferences (theme, sidebar collapse,
  background). Never persist auth or server data.
- Use narrow selectors / `useShallow` when reading stores (see STATE_MANAGEMENT).
- Gate UI by permission with `useUserPermission().hasPermission(...)`.
- Run `bun run build` (this is `vite build && tsc`) and `bun run lint` before declaring done.

## Don't

- **Don't** reintroduce React Context for app state, or recreate the deleted
  `*-provider.tsx` files — there is no `src/lib/providers/` anymore.
- **Don't** cache server responses in Zustand, or put pagination/search/sort in
  `useState` — use react-query and URL params respectively.
- **Don't** make `src/lib/api.ts` read the auth store; cookies are the source of truth.
- **Don't** navigate from inside a store (no `useNavigate` in stores) — return a result
  and navigate in the caller (see `auth.store` + `use-login`).
- **Don't** hand-edit `src/routeTree.gen.ts` — it's generated; run `bun run dev`.
- **Don't** add a new dependency without checking an existing one already does the job.

## Common tasks → exact path

- **Add a CRUD page** → follow [ADDING_FEATURES.md](./ADDING_FEATURES.md) top to bottom.
- **Add client state** → new `*.store.ts` in `src/lib/stores/`, export from `index.ts`.
- **Add a modal to an existing page** → add a modal name to that feature's
  `createCrudModalStore([...])`, open it from the page hook, render it in the route.
- **Change auth/permissions** → [AUTH.md](./AUTH.md). Touch `auth.store`,
  `auth.service`, or `useUserPermission`.
- **Change how data is fetched** → [DATA_FETCHING.md](./DATA_FETCHING.md). Touch the
  service + the hook; don't bypass `api.ts`.
- **Theme / appearance** → `theme.store` / `background.store`; UI in
  `components/features/settings/`.

## Safe-change checklist

1. Located the right layer (route / hook / store / service / component)?
2. Used the correct state tool per the mental model?
3. Reused existing helpers rather than duplicating?
4. Followed naming + `Array<T>` + import conventions?
5. `bun run build` passes (type-check clean)?
6. `bun run lint` passes?
7. For UI changes, clicked through the flow with `bun run dev`?
8. No new Context providers, no server data in Zustand, no edits to generated files?

## Architecture invariants (don't break these)

- No React Context for app state — stores only.
- Cookies are the auth source of truth; the store mirrors them.
- One axios instance (`api.ts`) with the refresh interceptor handles all HTTP.
- Page hooks orchestrate; routes/components stay declarative.
- Table state is in the URL, validated by a Zod schema per route.
