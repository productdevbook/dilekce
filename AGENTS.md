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
`DilekceCheckboxGroup`, `DilekceCheckbox`, `DilekceSwitch`, `DilekceFile`, `DilekceActions`, `DilekceSummary`, `DilekceRepeat`, `DilekceRepeatRemove`, `dilekceMessages`
(`en`, `tr`), and the types `DilekceMode`, `DilekceDensity`, `DilekceMessages`,
`DilekceErrors`, `DilekceOption`, `DilekceValidityKey`, `DilekceMessageKey`,
`DilekceValidator`, `DilekceInvalidField`, `DilekceValues`, `DilekceOutput`,
`DilekceDefaultValues`, `DilekceDefaultValue`, `DilekceEditField`, `DilekceRepeatRow`, `DilekceRepeatProps`, `StandardSchemaV1` (copied from
the spec, no dependency).

- `Dilekce<S>`: `mode`, `density`, `focus`, `messages`, `errors`, `advance`,
  `onDirtyChange`, `warnUnsaved`, `onInvalidSubmit(fields)` (`DilekceInvalidField`:
  `{ name, label, message, element }`; a form-level issue has `name`/`label` ""
  and the form as `element`), `copyable` (default true), `schema`,
  `onValidSubmit(value, event)`, `defaultValues`. Announces the invalid count in
  a polite `role="status"`.
- `DilekceSummary` (`title`): error summary. Reads a small external store
  (`createSummaryStore`) that `Dilekce` fills in `fail()` from each field's
  `Failure` (`validate()` of the field handle resolves to a `Failure`, not
  just a control). Fields report message changes / turning valid
  (`reportField`), so lines go live; only fields invalid at the stop are
  listed. With a summary mounted, focus goes to it (role=group, tabIndex -1,
  aria-labelledby heading, not role=alert), else to the first field.
- `schema` (Standard Schema v1): `runSchema()` builds the values (`readValues`:
  string, `string[]` for same-name checkboxes / checkbox group / multiple
  select, dotted names nest, disabled and `data-anonymous` skipped) and runs it
  once per submit; every field handle's `validate(schemaRun)` takes its issues
  by `pathKey` (path joined by "."). Stage order in `check()`: constraints,
  `validate`, schema. Issues no enabled field `names()` claims are form-level
  (`unclaimed`). A throwing schema doesn't block. Blur/live run the whole
  schema and take the field's issues (pending flag only for a field checked
  alone; a submit shows `data-checking`).
- `defaultValues`: flattened (`flattenDefaults`; a scalar list is kept whole and
  indexed) and written to DOM defaults AND the live value (React assigns value /
  checkedness at mount, which would hide a later default). Applied in a layout
  effect (before the dirty snapshot); fields apply late-mounted controls
  themselves; controls with `data-controlled` (set from `value`/`checked`) are
  skipped; names dropped from a new object are restored from `originals`. New
  contents (compared by flattened JSON, so inline literals don't loop) apply and
  `form.reset()` with `selfReset` set, so the app's `onReset` isn't called.
- `DilekceField`: `validate` (`(value, data) => message | null | undefined |
  false`, may be async; `pending` message, `data-pending`, submit held with
  `data-checking`, newest run wins, a throwing rule doesn't block). Shows a
  `n/max` counter for `maxLength`.
- `DilekceInput`, `DilekceNumber`: `leading`, `trailing` affixes.
- `DilekceCheckbox` / `DilekceSwitch` (one `Toggle`): a native checkbox in
  `div[data-slot=dilekce-toggle]` (`role=group` named by the field label when
  `children` text exists; then `useGroupLabel(true)` makes the label a `<div>`).
  Not `dilekce-choices`, so `valueOf`/`readValues` treat it as a single
  checkbox: its `value` ("on") or absent. Its `value` prop is the submitted
  string, not a controlled value (`useControl` gets `checked` as `value`).
  Switch: track = `MARK` input at `size-full`, thumb a sibling placed with
  `inset-inline-start` (RTL-safe), sized by `--sw` from `--dk-text`.
- `DilekceFile`: native input, `::file-selector-button` as outline button,
  `data-empty` from `useTrackedValue`; in filled mode the input is
  `display:none` and the names span (sr-only in edit, a description for
  `multiple`) shows. Click is prevented read-only (also from the label).
  `readValues`: `File`, or `File[]` for `multiple`, absent when single and
  empty; `valueOf` gives names; `defaultValues` skip files; dirty snapshot
  uses name+size+date.
- Date types (`PICKER_TYPES`) get `data-empty` from the value (no
  `:placeholder-shown` on them), the picker indicator as a token-coloured
  mask (`--dk-picker` icon; CanvasText in forced colors), and the form sets
  `dark:[color-scheme:dark]`. `getComputedStyle` can't see that UA pseudo:
  tests scan the stylesheet (`rulesMentioning`).
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
- `DilekceRepeat` (#19): `keys` state (a counter, never an index) drives
  `div[data-slot=dilekce-repeat-row].contents` wrappers; `row.name(f)` is
  `name.<index>.<f>`, so a removed earlier row renames later rows' controls
  in place (DOM values stay; defaults aren't re-applied on rename). Start
  count: `defaultCount` ?? rows in `defaultValues` (`countRows` over the
  flattened map; `defaultRows` in the form context) ?? `max(min, 1)`, clamped.
  A native `reset` listener on the form puts the default rows back, but
  only remounts when the keys differ from the pristine ones. `measure()` runs
  in a layout effect on every key change (dirty counts rows); the add/remove
  action ref drives focus + `announce`. Add cell is not rendered at `max`;
  `DilekceRepeatRemove` reads `RepeatRowContext`, disabled at `min`, grows to
  full width under 30rem. Both hidden in filled mode and print.
- Check your answers (#20): `Dilekce` `onEdit` (context `canEdit`/`edit`) and
  `DilekceField` `edit` (string = `<a href>`, function = button, `false` =
  none) render `[data-slot=dilekce-change]` in the field's actions span
  (`dilekce-field-actions`, with Copy; copy first). Change is always visible
  (Copy is hover/focus/coarse only); named by `aria-labelledby` "Change <label>".
  `emptyText` is a real `span[data-slot=dilekce-empty]` shown by the same
  `:placeholder-shown`/`data-empty` conditions as the dash, which it
  suppresses (`after:content-none!`); `display:none` elsewhere, so it is
  only in the a11y tree when empty (tested with `toMatchAriaInlineSnapshot`,
  which matches by containment). It does not cover unchecked groups/toggles
  (they never had a dash).
- In tests, never call `cleanup()` mid-test (it breaks later renders in the
  file); use `await screen.unmount()`.
- Message keys beyond validity: `pending`, `invalidOne`, `invalidMany`
  (`{count}`), `copy`, `copied`, `summaryTitle`, `add`, `remove`, `removeRow`,
  `rowAdded`, `rowRemoved` (`{index}`, 1-based), `change`.

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
  The same limit holds for `data-empty` on date/time and file inputs
  (`useTrackedValue`: read after each render, on input/change/focus/blur and
  after a reset; no setter wrap, it would clobber React's value tracker).

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

v0.1. The full gate (`bun run test`) is green: 243 tests, zero lint warnings,
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
covered by a test); ROADMAP #16 (error summary), #17 (Standard Schema) and #18
(`defaultValues`), #19 (`DilekceRepeat`), #20 (`onEdit`/`edit`/`emptyText`) and #21 (checkbox, switch, file, date types) are built; P1 #22 (integration recipes) is open, the a11y P3 items F4, F10, F12
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
