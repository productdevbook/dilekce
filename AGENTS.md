# dilekce

Dense, paper-style grid forms for shadcn/ui. Native controls, one registry item, no headless library. Pure TypeScript.

> [!IMPORTANT]
> Keep `AGENTS.md` updated with project status.

## Project Structure

```
registry/
  dilekce/
    dilekce.tsx             # The registry item: every component, one file
registry.json               # shadcn registry manifest (source of public/r)
public/r/                   # Built registry JSON (bun run registry:build)
src/
  app.tsx                   # Demo page
  main.tsx                  # Demo entry
  index.css                 # Tailwind v4 + the stock shadcn neutral theme
  components/ui/button.tsx  # shadcn Button, added by the CLI for the demo
test/
  dilekce.test.tsx          # vitest browser mode, real Chromium
components.json             # shadcn config for the demo project
.claude/agents/             # Agent briefs: web-engineer, localizer, browser-tester
```

## Public API

One file, copied into the user's project by `npx shadcn add`. Exports:
`Dilekce`, `DilekceSection`, `DilekceRow`, `DilekceField`, `DilekceInput`,
`DilekceTextarea`, `DilekceSelect`, `DilekceNumber`, `DilekceRadioGroup`,
`DilekceCheckboxGroup`, `DilekceActions`, `dilekceMessages` (`en`, `tr`), and
the types `DilekceMode`, `DilekceDensity`, `DilekceMessages`, `DilekceErrors`,
`DilekceOption`, `DilekceValidityKey`, `DilekceMessageKey`, `DilekceValidator`.

- `Dilekce`: `mode`, `density`, `focus`, `messages`, `errors`, `advance`,
  `onDirtyChange`, `warnUnsaved`, `onInvalidSubmit(names)`, `copyable`
  (default true). Announces the invalid count in a polite `role="status"`.
- `DilekceField`: `validate` (`(value, data) => message | null | undefined |
  false`, may be async; `pending` message, `data-pending`, submit held with
  `data-checking`, newest run wins, a throwing rule doesn't block). Shows a
  `n/max` counter for `maxLength`.
- `DilekceInput`, `DilekceNumber`: `leading`, `trailing` affixes.
- `DilekceCheckboxGroup` is uncontrolled unless `value` is passed.
- Message keys beyond validity: `pending`, `invalidOne`, `invalidMany`
  (`{count}`), `copy`, `copied`.

## Build & Scripts

```bash
bun run dev              # vite demo on :5318
bun run test             # lint + typecheck + vitest (Chromium)
bun run lint             # oxlint + oxfmt --check
bun run lint:fix         # oxlint --fix + oxfmt
bun run typecheck        # tsc --noEmit
bun run registry:build   # shadcn build → public/r
bun run build            # registry + static demo
```

## Code Conventions

- **shadcn only.** Colors, radius and borders come from shadcn tokens
  (`bg-background`, `border`, `text-muted-foreground`, `bg-primary`,
  `text-destructive`). Never a hard-coded color. Dark mode is the user's
  `.dark` class, nothing else.
- **Tailwind classes, no stylesheet.** The registry item ships no CSS; layout
  tokens are `--dk-*` custom properties set by classes on the form.
- **`cn` from the `cn` package**, as the shadcn CLI now writes it. Not
  `@/lib/utils`, not clsx + tailwind-merge.
- **Native controls.** No Radix, no Base UI. A behaviour the platform has
  (labels, radio groups, constraint validation, form submission, autofill) is
  used, not rebuilt.
- **`data-slot`** on every part, like shadcn's own components.
- **TypeScript strict**, TypeScript 7 (`tsc`)
- **Formatter:** oxfmt (double quotes, no semicolons)
- **Linter:** oxlint (unicorn, typescript, oxc, react)
- **Commits:** semantic lowercase (`feat:`, `fix:`, `chore:`, `docs:`)

## Testing

- vitest browser mode with Playwright Chromium. Layout, focus, `:has()`,
  constraint validation and the error measurement are all real-browser
  behaviour; jsdom would pass tests the browser fails.
- Tests import `src/index.css`, so Tailwind classes are live and assertions on
  computed style (the filled-mode dash, hidden actions) mean something.
- Run all: `bun run test`. Single: `bunx vitest run test/dilekce.test.tsx`.

### Notes

- **Number inputs and React.** Setting `input.value` from code goes through
  React's value tracker and the following `input` event is swallowed.
  `setNativeValue` calls the prototype's setter so scrubbing and steppers
  reach `onChange`.
- **Tailwind's `after:` utilities** give every field an empty `::after`
  (`content: ""`). The filled-mode dash replaces that content; tests check for
  the dash, not for `none`.
- **Focus line uses `--primary`, not `--ring`.** shadcn's default ring is a
  light grey, under the 3:1 a focus indicator needs (WCAG 1.4.11).

## Project Status

v0.1. The full gate (`bun run test`) is green: 33 tests, zero lint warnings,
zero typecheck errors. Not yet published: the install URL points at
`public/r/dilekce.json` on the `main` branch of
`github.com/productdevbook/dilekce`, which doesn't exist yet.
