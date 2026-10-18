# dilekce: feature gap research

Scope: what Formulaire, shadcn/ui, form-state libraries and government design systems offer that dilekce
(registry/dilekce/dilekce.tsx, 1595 lines, README read) lacks. Sources were read this session (Formulaire
from /tmp/formulaire-src/formulaire source, the rest via WebFetch). Anything not confirmed is marked
"unconfirmed".

Fit key: OK = fits the rules (native controls, shadcn tokens, one file). STRETCH = fits only with a
compromise. CONFLICT = fights a rule (said explicitly). Priority P0..P3, effort S/M/L as in reviewer.md.

## Summary: Formulaire vs dilekce

Formulaire 0.4.0 (packages/formulaire/src/index.tsx) exports Root, Section, Row, Field, Input, Textarea,
Number, Select, Choice, Checks, Actions, Button. dilekce already has the same set plus: validate (async),
server `errors`, i18n messages, affixes, counter, advance, warnUnsaved, copy buttons, invalid-count
announcement, no headless dependency. Formulaire has things dilekce lacks only in these areas: a plain-HTML
CSS-only mode, a documented Maskito recipe (README "Input masks"), `legendProps` and legend styling tokens
(CHANGELOG 0.4.0), a `Button` export, a separate shadcn bridge stylesheet, a docs `styles.html` page with
alternative looks and a `playground.html`. Formulaire has NO error summary, repeaters, date/file/switch
controls, wizard, or schema adapter. So dilekce is already ahead of its direct competitor; the real gaps
are against the wider field below.

---

## (1) Control types

### 1.1 Date, time, datetime-local, month, week: native inputs need first-class treatment

- Competitors: shadcn Date Picker composes Popover + Calendar, with DOB, range, time, natural-language
  variants (https://ui.shadcn.com/docs/components/date-picker). GOV.UK Date input is three text fields in a
  fieldset with per-part errors (https://design-system.service.gov.uk/components/date-input/). USWDS has
  date picker, date range, memorable date, time picker (https://designsystem.digital.gov/templates/form-templates/).
- dilekce: `DilekceInput` accepts any `type` (README), so `type="date"` works today. Unconfirmed: how
  filled mode renders it (ISO string vs locale), how the empty state and `min`/`max` messages read, and
  whether the cell chrome (calendar icon in WebKit) looks right. No test covers it (test/dilekce.test.tsx).
- Fit: OK for native `<input type=date|time>`. A popover calendar CONFLICTS (headless/portal). GOV.UK-style
  three-field `DilekceDate` (day/month/year in one cell, one value `YYYY-MM-DD`) is OK and is the
  best fit for a paper-form look.
- Priority P1 (verify and document native types, locale display in filled mode). Effort S.
  `DilekceDate` three-part: P2, M.

### 1.2 Switch

- shadcn Switch (Base UI based, `aria-invalid`, choice-card use) https://ui.shadcn.com/docs/components/switch.
- dilekce: nothing. A native `<input type=checkbox role=switch>` styled with tokens is OK and posts as a
  checkbox. Single boolean checkbox is also not offered: `DilekceCheckboxGroup` is for `string[]` only
  (a lone "I agree" needs a one-option group, unconfirmed whether `required` works as a consent box).
- Priority P1 (single checkbox / consent is a very common field), Switch P2. Effort S.

### 1.3 Combobox / autocomplete

- shadcn Combobox: `multiple`, chips, groups, `showClear`, Base UI
  (https://ui.shadcn.com/docs/components/combobox). USWDS combo box.
- dilekce: native `<select>` with `appearance: base-select`. Native alternative that fits: `<input list>` +
  `<datalist>` (no JS, posts the value, autofill-friendly). Unconfirmed: datalist styling is limited and
  differs per browser. A real combobox with filtering popover CONFLICTS (headless library, portals).
- Priority P2 for `DilekceInput` with `options` -> `<datalist>`. Effort S. Full combobox: do not build.

### 1.4 Multi-select

- shadcn Combobox `multiple` + chips. dilekce already covers small sets via `DilekceCheckboxGroup`.
  `<select multiple>` is native but poor UX; skip. Priority P3 (document checkbox group as the answer).

### 1.5 OTP / verification code

- shadcn Input OTP (input-otp lib; `pattern`, groups, separator, paste)
  https://ui.shadcn.com/docs/components/input-otp. Single native input with
  `inputmode=numeric autocomplete=one-time-code pattern` plus letter-spacing already works in dilekce and
  autofills from SMS, which the slot-per-digit design does not do reliably. Fit: OK as a README recipe, a
  slot component CONFLICTS. Priority P3. Effort S (docs only).

### 1.6 Slider / range

- USWDS range slider; shadcn Slider (Radix/Base). Native `<input type=range>` is OK and posts. Not a
  paper-form control; filled mode needs to show the value as text (currently unconfirmed).
  Priority P3. Effort S.

### 1.7 Masked input, phone, currency

- Formulaire documents Maskito via ref (README "Input masks"). USWDS input mask: placeholder + `pattern`
  - `inputmode`, no JS mask library (https://designsystem.digital.gov/components/input-mask/); USWDS notes the
    component fails 1 of 9 WCAG tests, so avoid live masking.
- dilekce: `pattern` + `inputMode` + `leading` affix already cover most of it (README: price with
  `leading="€"`). Gap is documentation: no phone/postcode/IBAN/currency recipe, no ref-forwarding statement
  (unconfirmed whether `DilekceInput` forwards a ref to the `<input>`; React 19 `ref` as prop would make it
  work, check). Fit: OK as docs plus a Maskito example. Priority P2. Effort S.

### 1.8 File upload

- GOV.UK File upload (multiple, drag-drop enhancement, specific error per state: type, size, empty, count)
  https://design-system.service.gov.uk/components/file-upload/. USWDS file input.
- dilekce: `file` is in ADVANCE_SKIP (line 189) so file inputs are anticipated, but there is no styled
  `DilekceFile`, no `accept`/size message keys, no filled-mode rendering (file names). Native
  `<input type=file>` is OK. Message keys for size/type would be custom `validate` today.
- Priority P1 (forms with attachments are the paper-form use case: petitions). Effort M.

### 1.9 Other controls seen

- Search, Password reveal: P3. Color: skip. Rating/choice cards (shadcn "choice card", FieldLabel wrapping
  a Field): STRETCH; radio/checkbox options as bordered cells could be a `variant`. P3, S.

---

## (2) Form-level features

### 2.1 Error summary list linking to fields

- GOV.UK Error summary: at top of main, focus moved to it, `role=alert`, list of links to each failing
  answer (first option for radios, first part for dates), same wording as inline messages; always shown even
  for one error https://design-system.service.gov.uk/components/error-summary/.
- dilekce: focuses the first invalid control and announces only a count in a `role=status` (AGENTS.md,
  README "Submit feedback"). `onInvalidSubmit(names)` gives names but no labels/messages, so building a
  summary needs DOM queries. No summary component.
- Fit: OK. An opt-in `summary` prop or `<DilekceSummary />` rendering label + message links
  (`<a href="#id">`). Keep focus-first-field default; summary mode moves focus to the summary like GOV.UK.
- Priority P1. Effort M. Also pass `{name, label, message}[]` to `onInvalidSubmit` (P2, S).

### 2.2 Field arrays / repeaters ("add another")

- shadcn RHF guide: `useFieldArray`, one Controller per row `emails.${i}.address`
  https://ui.shadcn.com/docs/forms/react-hook-form. TanStack: `mode="array"`, `pushValue`
  https://tanstack.com/form/latest/docs/framework/react/guides/arrays (remove/swap/move not documented on
  that page; unconfirmed). Conform: `getFieldsetProps`/`getCollectionProps` (https://conform.guide/).
  GOV.UK "add another" was not found on the pages fetched (unconfirmed).
- dilekce: no repeater. Users render `.map()` rows with `name="items[0].qty"`, which works for plain
  FormData but the `validate` `data: FormData` is flat and `errors` is keyed by name; unconfirmed whether
  bracket/dotted names are handled. No add/remove buttons, no row-level legend ("Item 2 of 3").
- Fit: OK as a recipe plus a small `DilekceRepeat` (render prop, add/remove, re-keyed names). Do not add
  state-lib semantics. Priority P1 (invoices, passengers, dependants all need it). Effort M.

### 2.3 Conditional fields

- GOV.UK conditional reveal on radios; documented accessibility problem: reveal is not always announced
  (fails WCAG 4.1.2 per the page) https://design-system.service.gov.uk/components/radios/.
- dilekce: radio `onValueChange` exists, so users can render conditionally, but nothing handles a hidden
  field being excluded from validation (an unmounted control is not validated, which is fine) or the dirty
  baseline changing (unconfirmed how `onDirtyChange` baseline treats late-mounted fields).
- Fit: OK as a recipe; a `when`/`DilekceReveal` is optional. Priority P2. Effort S (docs + test), M for
  a component with `aria-live` announcement.

### 2.4 Multi-step / wizard

- GOV.UK: one question per page, progress indicator advice, "Check answers"
  https://design-system.service.gov.uk/patterns/question-pages/. USWDS step indicator. dilekce is
  explicitly one dense page; a wizard is the opposite of the grid idea.
- Fit: STRETCH. Provide a recipe: several `<Dilekce>` sections, `mode="filled"` as the summary. Not a
  component. Priority P3. Effort S (docs).

### 2.5 Autosave drafts

- Not offered by Formulaire or shadcn; USWDS none found. dilekce has `onDirtyChange` and `warnUnsaved`.
  Missing: a hook-free way to serialise/restore values (`FormData` -> object -> back), i.e. `defaultValues`
  by name for uncontrolled fields. Unconfirmed whether a `defaultValues` prop exists on `Dilekce`
  (not in the README props table; users set `defaultValue` per control).
- Fit: OK. A `values`/`defaultValues` object on `Dilekce` that fills controls by name after mount
  (and `reset` restoring them) is the integration point RHF/Conform users expect. Priority P1. Effort M.

### 2.6 Read-only / disabled sections

- shadcn Field uses `data-disabled`; native `<fieldset disabled>` disables all descendants. dilekce
  `DilekceSection` renders a `<fieldset>`, so `disabled` should pass through (it extends
  `React.ComponentProps<"fieldset">`, line 537) but styling hooks are unconfirmed: line 602 styles
  `has-[:is(input,select,textarea):disabled]` per control only, and RadioGroup/CheckboxGroup take a
  `disabled` prop. No per-section `mode="filled"` (a section read-only inside an editable form, e.g. the
  prefilled sender). Disabled controls are also omitted from FormData and skipped in validation, which is
  correct but worth a note.
- Priority P2 (`mode` on Section, or documented `disabled` fieldset styling). Effort S.

### 2.7 Review page from filled mode ("check your answers")

- GOV.UK Check answers: label/value rows per section, "Change" link per row with hidden text, prefilled
  edit, "Not provided" for skipped, statement that nothing is complete until confirmed
  https://design-system.service.gov.uk/patterns/check-answers/.
- dilekce: `mode="filled"` already is the review view, with dashes for empty. Missing: per-field "Change"
  affordance (a `onChange`/`href` per cell that flips back to edit and focuses that field), a "Not
  provided" text option (dash is hard-coded; check whether `messages` has an `empty` key, it does not
  per the README key list), and carrying edit-mode values into filled mode without remounting
  (unconfirmed: `mode` is a prop on the same tree, so values persist, which is promising; add a test).
- Fit: OK. Priority P1 (it is the project's differentiator). Effort M.

### 2.8 Schema validation adapter (Zod / Standard Schema)

- shadcn FieldError takes issues from any Standard Schema lib
  (https://ui.shadcn.com/docs/components/field); Standard Schema returns `{issues: [{message, path}]}`
  (https://standardschema.dev/). TanStack accepts Standard Schema at field and form level
  (https://tanstack.com/form/latest/docs/framework/react/guides/validation). Conform `parseWithZod`.
- dilekce: README tells users to feed `error`/`errors` from RHF or the server. No built-in `schema` prop.
  A tiny `schema` prop on `Dilekce` (run `~standard.validate` on `Object.fromEntries(FormData)`, map
  `issues[].path[0]` to field names, feed the existing `errors` mechanism) is under 40 lines, adds no
  dependency, and gives validation without any form library.
- Fit: OK (Standard Schema is just an interface). Caveat: FormData is strings, coercion is the schema's job
  (`z.coerce`); nested paths need a name convention. Priority P1. Effort M.

### 2.9 Other form-level items

- Form-level error (Conform `form.errors`, `submission.reply({formErrors})`): a non-field "submit failed"
  banner slot. dilekce `errors` is field-keyed only. Priority P2, S (e.g. reserved key or `formError`).
- Submitting/pending state: `data-checking` exists for async rules; no `data-submitting` while `onSubmit`
  awaits, and no double-submit guard (unconfirmed). Priority P2, S.
- Validation timing option (RHF `mode`, TanStack onChange/onBlur/onSubmit, `asyncDebounceMs`): dilekce
  has fixed blur-after-edit then live; async `validate` has no debounce (unconfirmed). P2, S.
- `canSubmit`-style disabled submit: intentionally absent (GOV.UK also advises against it). Skip.

---

## (3) Integration

| Target                                            | What it expects                                                                                                                                                                                                                                                             | dilekce today                                              | Gap / recipe                                                                                                                                                                                                                                                                                                                            | Prio / effort          |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| react-hook-form                                   | `register()` gives `ref/name/onChange/onBlur`, uncontrolled; shadcn uses `Controller` + `data-invalid` + `aria-invalid` (https://ui.shadcn.com/docs/forms/react-hook-form). RHF register docs returned 403, so details of `valueAsNumber`/`setValueAs` are unconfirmed here | README shows `{...register("email")}` and `error=`         | Controls must forward `ref` (verify, esp. `DilekceNumber` which wraps steppers, `RadioGroup`/`CheckboxGroup` which need Controller). RHF `onChange` for native inputs is fired by DOM events; the stepper buttons and drag-scrub must dispatch real `input` events (unconfirmed). No tested example, no `Controller` recipe for groups. | P1, M (tests + recipe) |
| TanStack Form                                     | `field.handleChange`, `field.state.meta.errors`, Standard Schema validators, `canSubmit`                                                                                                                                                                                    | README names it, no example                                | Recipe with `form.Field` and `error={field.state.meta.errors[0]}`; pass `noValidate`-like switch so two validators don't fight                                                                                                                                                                                                          | P2, S                  |
| Conform                                           | Native FormData, `getFormProps`, `getInputProps` give `id`, `name`, `form`, `aria-describedby`, `aria-invalid`; server `submission.reply()` (https://conform.guide/). The page did not confirm the metadata names; unconfirmed                                              | `errors` prop accepts a record, so `lastResult.error` maps | Conform emits ids/`aria-describedby` that may collide with dilekce's own `useId` ids and `aria-describedby` merging (line 1022 merges, good). Needs a recipe and a test.                                                                                                                                                                | P2, S                  |
| Server actions (Next/React Router)                | `<form action={fn}>`, `useActionState`, `useFormStatus`                                                                                                                                                                                                                     | `onSubmit` + `errors`                                      | Document `action=` usage: does dilekce `preventDefault` always? If it only prevents on invalid, action works; unconfirmed. `errors` prop pattern with `useActionState` is the natural fit. Add pending state (see 2.9).                                                                                                                 | P1, S docs + test      |
| Zod / Standard Schema                             | see 2.8                                                                                                                                                                                                                                                                     | none                                                       | built-in `schema` prop                                                                                                                                                                                                                                                                                                                  | P1, M                  |
| Native `form` attribute / external submit buttons | `<button form="id">`                                                                                                                                                                                                                                                        | unconfirmed                                                | test it (Actions outside the form, e.g. in a dialog footer is common)                                                                                                                                                                                                                                                                   | P2, S                  |

---

## (4) Layout and visual

### 4.1 RTL

- shadcn Field/Input Group/Input OTP list RTL support through its RTL config; Input Group page has RTL
  examples. dilekce already uses some logical utilities (`pe-5`, `ms-auto`, lines 1151-1157) and no
  `left/right/ml/mr/pl/pr/border-l/border-r` matched my grep, which is good. Unconfirmed: the number
  stepper order, affix placement, the hand-drawn `grid-area` layouts and the scrub gesture direction
  in `dir=rtl`; the canvas error measurement is direction-agnostic. No RTL test or demo.
- Fit: OK. Priority P2 (cheap, and the project already ships Turkish; Arabic/Hebrew is the obvious next).
  Effort S (demo toggle + test).

### 4.2 Column alignment / row headers

- Gridforms: grid fields, field widths hint at value size, each field wraps on mobile
  (https://formkeep.com/gridforms). dilekce uses `span x --dk-col` with flex wrap, so cells in different
  rows do not align to a common column grid when widths differ (inherent to "wraps when it can't fit").
  A table-like record form (row header on the left, e.g. "Passenger 1") is not offered; shadcn Field has
  `orientation="horizontal|responsive"` and FieldContent for label-beside-control
  (https://ui.shadcn.com/docs/components/field).
- Fit: STRETCH. `orientation="horizontal"` per field is possible with grid-area. Row header: a
  `DilekceRow` `label` prop spanning a narrow header cell is OK. Priority P3. Effort M.

### 4.3 Inline help popovers / descriptions

- shadcn FieldDescription, balanced text; Input Group addons can hold a button/tooltip. dilekce has
  `description` (hidden in filled mode). No help affordance for long guidance without breaking density.
  A native `popover` attribute button is OK (no portal library), but anchor positioning support varies.
  Priority P3. Effort M.

### 4.4 Icons in labels / addons

- shadcn Input Group `InputGroupAddon align=inline-start|inline-end|block-start|block-end`, buttons, Kbd,
  spinner. dilekce `leading`/`trailing` are `ReactNode`? README says "small unit marks", they are
  `aria-hidden` so an icon is fine, but interactive affixes (clear, show-password, copy) are impossible
  because of `aria-hidden`. Unconfirmed type of the affix prop. Priority P2: allow an interactive
  `trailing` (not aria-hidden when it contains a button) or a `DilekceInput` `clearable`/password reveal.
  Effort S-M. Block-level addon on textarea (send button): P3.

### 4.5 Sticky actions

- `DilekceActions` is the last row. A `position: sticky; bottom: 0` variant for long forms in dialogs is
  one class (`sticky bottom-0`), but it is hidden in filled mode and print already. Priority P3. Effort S.

### 4.6 Print header, signature lines

- Formulaire's print stylesheet (styles.css, "print" block): forces black ink, no radius, keeps
  rows whole, hides actions, hides select icon and placeholders. dilekce has the equivalent subset
  (`print:break-inside-avoid`, `print:break-after-avoid`, `print:[print-color-adjust:exact]`, `print:hidden`
  actions and copy button). Missing versus Formulaire: forcing black/white tokens in print and hiding
  placeholders/select icon (unconfirmed whether dilekce does; no grep hit for `placeholder` print rules).
  Neither has a signature line, date line, header (title/logo/reference number) or page-break control per
  section. The product is literally a petition form, so `DilekceSignature` (ruled cell with a label,
  blank in edit, visible only in filled/print) and a `DilekceHeader` slot are on-brand.
  Priority P2. Effort S-M.

### 4.7 Legend styling tokens

- Formulaire 0.4.0: `--gf-legend-*` tokens and `legendProps` (CHANGELOG). dilekce legend is a fixed band;
  `className` on the section only. Add `--dk-legend-*` or `legendClassName`. Priority P3. Effort S.

### 4.8 Filled-mode content

- "Not provided" wording (GOV.UK) and a per-cell "Change" link: see 2.7.
- Rich values (multi-line textarea in filled mode, long text wrapping, boolean as Yes/No instead of dash or
  tick, select shows label not value): unconfirmed; add tests.

---

## (5) DX and docs

- **Examples / recipes**: README has no section for field arrays, conditional fields, date, file, masks,
  RHF `Controller` for groups, TanStack, Conform, server actions, Zod. Formulaire documents masks. This
  is the cheapest gap to close. P1, S-M.
- **Playground / live demo**: Formulaire has `apps/docs/playground.html` and `styles.html` (alternative
  looks, Gridforms-style recipe). dilekce has `src/app.tsx` as a single demo page. A site with live
  examples per feature, a theme switcher and a copy-the-code panel is P2, M. (Recent commit "new lined
  home page" suggests a site exists under public/ or dist/; not audited here.)
- **Storybook**: not needed; vitest browser tests plus a demo page match the one-file ethos. Skip or P3.
- **Types**: `DilekceMessageKey`, `DilekceValidator`, `DilekceErrors` are exported (good). Gaps: no
  generic `Dilekce<Values>` typing of field names (errors keyed by `string`), no type for the `data`
  param beyond FormData. Typed names via a `Dilekce<T>` generic or a `name` helper is a nice-to-have.
  P3, M.
- **Tests**: 38 tests in test/dilekce.test.tsx, none confirmed for date/file/RTL/RHF integration.
  Adding an integration test file that mounts RHF, TanStack and a server action pattern would make the
  README claims verifiable. P1, M.
- **Registry distribution**: Formulaire ships `shadcn.css` bridge and npm; dilekce is a registry item,
  which is a stronger shadcn fit. Gap: split optional parts into separate registry items
  (`dilekce-date`, `dilekce-file`, `dilekce-summary`) so the base file stays lean? That would break the
  "one file" rule: CONFLICT, so say it explicitly in AGENTS.md or keep everything in one file.

---

## Recommended order

1. Error summary list with links (2.1), `schema` prop for Standard Schema (2.8), `defaultValues` /
   `values` by name (2.5): the three things RHF/Conform/GOV.UK users look for first. P1, M each.
2. Single checkbox/consent and Switch (1.2), file input (1.8), date handling and tests (1.1). P1, S-M.
3. Repeater recipe plus `DilekceRepeat` (2.2); check-answers affordances: "Change", empty text (2.7). P1, M.
4. README recipes and integration tests: RHF, TanStack, Conform, server actions, masks, RTL (3, 5, 4.1).
5. Print header/signature (4.6), interactive affixes (4.4), datalist option (1.3), section `mode` (2.6).

Do not build: slot-based OTP, popover calendar, full combobox, wizard component (headless/portal or
against the single dense page idea). Document native alternatives instead.

## Caveats

- react-hook-form docs (register) and the GOV.UK/Conform internals were partly unavailable (403 or the
  page didn't list names); claims about those are marked unconfirmed.
- I did not execute dilekce; statements about its behavior come from README, AGENTS.md and greps of
  registry/dilekce/dilekce.tsx. Items marked "unconfirmed" need a quick test.
