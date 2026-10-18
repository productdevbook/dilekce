# Roadmap

From a four-part audit on 2026-10-18: correctness, accessibility, install and distribution, and features
competing libraries have. The full reports, with evidence and reproductions, are in
[`docs/audit/`](docs/audit/). **P0** breaks for real users, **P1** most users hit it, **P2** worth having,
**P3** nice to have. Effort: S hours, M a day, L more.

## P0: fix before anyone installs it

| #   | What                                                                                                                                                                                                              | Effort | Source         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------- |
| 1   | **Double submit during an async check.** A second click while `validate` is pending calls the action twice. Guard while `checking`.                                                                               | S      | correctness #1 |
| 2   | **React 19 actions wipe server errors.** React fires `reset` after a function action; `onReset` clears `errors`, so `useActionState` errors never show. Don't clear `errors` on reset when the prop is unchanged. | S      | correctness #2 |
| 3   | **Install URL is a 404.** The repo isn't published and there's no hosted `/r/*.json`. Publish, or deploy the demo with `public/r` on a stable domain.                                                             | S      | install P0     |

## P1: correctness and integration

| #   | What                                                                                                                                                                                                                                           | Effort | Source         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------- |
| 4   | **A user `ref` replaces the internal one** on `Dilekce`, `DilekceField`, `DilekceNumber`, `DilekceSelect`: dirty tracking, steppers, scrub and `data-empty` stop working, which is exactly what react-hook-form's `register` does. Merge refs. | S      | correctness #3 |
| 5   | **`validate` gets the wrong value** when `name` is on the control, not the field: a radio group passes its first radio, a checkbox group its first box.                                                                                        | S      | correctness #4 |
| 6   | **Disabled is ignored**: `DilekceSection disabled` still runs `validate` and blocks submit; `advance` stops before a disabled field; scrub changes a disabled number.                                                                          | S      | correctness #5 |
| 7   | **Programmatic writes go stale**: `data-empty`, the counter, dirty and errors only follow events, so `setValue`/`reset(values)` from a form library leaves them wrong.                                                                         | M      | correctness #6 |
| 8   | **`step="any"` steppers do nothing.**                                                                                                                                                                                                          | S      | correctness #7 |
| 9   | **Fails `exactOptionalPropertyTypes`** (7 errors in the shipped file).                                                                                                                                                                         | S      | install P1     |
| 10  | **React 19 required, undocumented** (`ref` as a prop). Document it, or add `forwardRef` for 18.                                                                                                                                                | S      | install P1     |
| 11  | **`cn` from the `cn` package** installs a second implementation in older shadcn projects (clsx + tailwind-merge). Decide: `@/lib/utils` + `registryDependencies: ["utils"]`, or document.                                                      | S      | install P1     |

## P1: accessibility

| #   | What                                                                                                                                                                                                                                                                | Effort | Source  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------- |
| 12  | **Forced colors (Windows High Contrast)**: no focus indicator (box-shadow + `outline-none`), grid lines vanish (they're background showing through gaps), checked and unchecked marks look the same. Add `forced-colors:` outlines, borders and `CanvasText` fills. | M      | a11y F1 |
| 13  | **Light-theme contrast**: translucent tints (`bg-destructive/5`, `hover:bg-accent/50`) composite over the grid colour; invalid labels and errors fall to 3.2–3.5:1 at 11px. Mix tints against `--background` with `color-mix`.                                      | S      | a11y F2 |
| 14  | **Errors on blur, "Checking…" and "Copied" aren't announced.** Only a failed submit speaks. Add a polite live region per form for field messages.                                                                                                                   | S      | a11y F3 |
| 15  | **Checkbox group `required` isn't exposed** (only `data-required`; the asterisk has empty alt). `aria-readonly` on `role=group` is invalid; put read-only state on each box.                                                                                        | S      | a11y F5 |

## P1: features users look for first

| #   | What                                                                                                                                                             | Effort | Source                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------- |
| 16  | **Error summary** (GOV.UK style): a list of links to the failing fields at the top, on a stopped submit. Pass `{ name, label, message }[]` to `onInvalidSubmit`. | M      | features 2.1           |
| 17  | **`schema` prop for Standard Schema** (Zod, Valibot, ArkType) — no dependency, the spec is an interface.                                                         | M      | features 2.8           |
| 18  | **`defaultValues` / `values` by name**, restored by reset: drafts, react-hook-form and Conform.                                                                  | M      | features 2.5           |
| 19  | **Repeaters** ("add another": passengers, invoice lines) as `DilekceRepeat` or a documented recipe.                                                              | M      | features 2.2           |
| 20  | **Check-your-answers** from filled mode: a "Change" link per field, configurable empty text. The differentiator.                                                 | M      | features 2.7           |
| 21  | **Missing controls, native**: single consent checkbox, switch (`role="switch"`), file input, tested date/time inputs with locale display in filled mode.         | M      | features 1.1, 1.2, 1.8 |
| 22  | **Integration recipes with tests**: react-hook-form (incl. `Controller` for groups), TanStack Form, Conform, server actions.                                     | M      | features 3             |

## P2

- Async replay submits values edited during the check; snapshot or re-check (correctness #8).
- A server error blocks resubmit until edited; let `errors` be advisory (correctness #9).
- `dilekceMessages.tr` can't be read from a Next Server Component; export per-locale constants (correctness #10).
- `inputMode="decimal"` has no minus key on iOS; use `text` + `pattern` when `min < 0` (correctness #11, unconfirmed).
- Safari IME Enter advances; check `keyCode 229` (correctness #12, unconfirmed).
- A rich (ReactNode) error never returns beside the label after the cell widens (correctness #13).
- Steppers: names don't say what they change ("Decrease Weight"), 22px targets, fire on pointerdown (a11y F6).
- Copy button under 24px and overlapping; its outline 2.55:1 in light (a11y F7, F8).
- Affixes `aria-hidden`: "kg" and "$" are never read; expose them in the description (a11y F9).
- RTL, a print header and signature line, interactive affixes, `<datalist>` options, `mode` per section,
  a form-level error slot (features 4.1, 4.6, 4.4, 1.3, 2.6, 2.9).
- Registry: `docs`, `author`, `categories`, examples as `registry:block` items, a version and update
  story (`add <url> --diff`), a `@dilekce` namespace (install P2).
- CI: `git diff --exit-code` misses untracked files in `public/r`; add an install smoke job (`shadcn add`
  into a fresh project + typecheck); Renovate's `config:base` is deprecated (install CI).

## P3

- A label truncates at 320px while an error shows; reduced motion is ignored; Turkish messages need a
  `lang` (a11y F10–F12).
- Demo: no `<main>`, the segmented controls lack arrow keys, inactive options 4.34:1 (a11y F13).
- Row headers / column alignment, sticky actions, legend styling tokens, a Maskito mask recipe
  (features 4.2, 4.5, 4.7, 1.7).

## Won't build

These fight the rules (native controls, one file, one dense page): slot-based OTP, a popover calendar,
a full combobox, a wizard component. Document the native alternative instead.
