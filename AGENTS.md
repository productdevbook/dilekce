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
tsconfig.strict.json        # registry/ only, with exactOptionalPropertyTypes + noUncheckedIndexedAccess
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
- Behaviour worth knowing (each has a test):
  - A newer submit supersedes an async check still running (the older result
    is ignored, so a rule that never settles can't wedge the form); the replay
    goes through once, and re-validates when values changed during the check
    (unnamed controls included). A superseded field run answers with the
    newest outcome, never its own stale message. After an unmount a resolving
    check does nothing (no `onInvalidSubmit`, focus or state).
  - `errors` passed in survive the `reset` React 19 fires after a function
    action (`useActionState`). `onReset` clears the internal copy only if the
    user edited away from the prop, or if a reset button was clicked (also one outside
    the form, `form="id"`: the click is heard on the document).
  - A user `ref` is merged with the internal one (`useMergedRef`) on `Dilekce`,
    `DilekceField`, `DilekceNumber` and `DilekceSelect`. Any new component
    that sets an internal ref and spreads `...props` must do the same.
  - `validate` gets the value read from the field's controls (checked boxes,
    checked radio, first control), so a `name` on the control works; server
    `errors` match the field's name or its control's.
  - Disabled controls (own attribute or a disabled `DilekceSection`) skip
    validation, `advance`, scrub and steppers. Checked at event time with
    `:disabled`, never only from the prop. `valueOf` reads the first enabled
    control. A field's latest props live in an insertion effect, so a
    control's layout-effect `sync()` sees this render's `validate`.
  - `step="any"` steppers move by 1, keeping the value's decimals.
- Message keys beyond validity: `pending`, `invalidOne`, `invalidMany`
  (`{count}`), `copy`, `copied`.

## Build & Scripts

```bash
bun run dev              # vite demo on :5318
bun run test             # lint + typecheck + typecheck:strict + vitest (Chromium)
bun run lint             # oxlint + oxfmt --check
bun run lint:fix         # oxlint --fix + oxfmt
bun run typecheck        # tsc --noEmit
bun run typecheck:strict # registry/ under exactOptionalPropertyTypes + noUncheckedIndexedAccess
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

- **Values written from code.** `data-empty`, the counter, the filled dash and
  dirty are kept in step with: controlled `value` changes (each control calls
  `field.sync()` from a layout effect when its value changes), form reset,
  input/change events, and for a select, code assigning `select.value` or
  `selectedIndex` (both setters are wrapped on the element). Dirty is also
  re-read on `focusin`/`focusout` of the form and on `beforeunload` (with
  `warnUnsaved`). Limits, since there is no polling: `option.selected = true`
  is not seen; an uncontrolled input written from code is picked up at the
  next focus change, reset, submit or page leave, not at once (the counter
  shows only while focused or near the limit, so that is invisible, but
  `data-dirty` can lag until then).

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

v0.1. The full gate (`bun run test`) is green: 92 tests, zero lint warnings,
zero typecheck errors (default and strict). Correctness audit items fixed:
double submit, action errors surviving reset, ref merging, value from
controls, disabled, programmatic writes, `step="any"`, strict TS. Review round 1
(async checks) fixed: a hung rule can't wedge the form (newer submit supersedes,
`signal` passed to rules), stale results don't fail a submit, unnamed controls
count as edits, nothing runs after unmount, an outside reset button clears
server errors, `sync()` sees the current `validate`. Accessibility
audit P1 #12 to #15 and the P2/P3 items fixed (forced colors, opaque tints,
one polite live region per form, checkbox group semantics, named 24px steppers
that also work on click, 24px copy button, affixes in the description, focus
outlines on `--dk-focus`, reduced motion); evidence in `docs/audit/a11y.md`,
tests in the "accessibility" blocks at the end of `test/dilekce.test.tsx`
(forced colors and reduced motion are emulated through `cdp()`). Left open:
`errors` still block a resubmit until the field is edited (a product decision,
covered by a test); P1 #16 to #22 (features), the a11y P3 items F4, F10, F12
(`lang` is the app's job) and F13 (demo). Not yet published: the install URL
points at `public/r/dilekce.json` on the `main` branch of
`github.com/productdevbook/dilekce`, which doesn't exist yet.

### Accessibility notes

- **`outline-none` kills a later `outline-2`** in Tailwind v4 (it sets
  `--tw-outline-style: none`); a part that has both needs `outline-solid` on
  the focus state. The radio/checkbox marks had no outline of their own until
  this was fixed.
- **Translucent tints over the grid.** Never use `bg-x/NN` on a cell: the form's
  `bg-border` shows through. Mix against `--background` with `color-mix`. The
  invalid text color is `--dk-danger` (destructive mixed with foreground).
- **Announcements** are queued and flushed in one timeout, so several fields
  changing at once read as one sentence list; a submit stays quiet per field
  (`check(true)`) because the count and the focus move say it.
