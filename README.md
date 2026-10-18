<p align="center">
  <br>
  <b style="font-size: 2em;">dilekçe</b>
  <br><br>
  Dense, paper-style grid forms for shadcn/ui.
  <br>
  Every field is a cell, errors sit inside it, and the same form renders filled in like a completed document.
  <br>
  Native controls, one file, no headless library.
  <br><br>
  <a href="https://github.com/productdevbook/dilekce/blob/main/LICENSE"><img src="https://img.shields.io/github/license/productdevbook/dilekce?style=flat&colorA=18181B&colorB=F0DB4F" alt="license"></a>
</p>

> [!IMPORTANT]
> **dilekçe is a shadcn/ui registry item, not an npm package.** The CLI copies one
> file into your project and it's yours from then on. It uses your theme's
> tokens (`--background`, `--border`, `--primary`, `--destructive`, `--radius`),
> follows your `.dark` class, and needs nothing beyond React, Tailwind CSS v4
> and [`cn`](https://github.com/shadcn-ui/cn).

> _Dilekçe_ is Turkish for petition: the form you fill out at a government
> counter, every box ruled, every answer in pen.

## Install

```sh
npx shadcn@latest add https://raw.githubusercontent.com/productdevbook/dilekce/main/public/r/dilekce.json
```

That writes `components/ui/dilekce.tsx` and installs `cn`.

## Requirements

- **React 19.** Components take `ref` as a plain prop, which React 18 drops
  silently. There is no `forwardRef` fallback.
- **Tailwind CSS v4.** The classes use v4 syntax (`data-*` variants,
  `has-*`, `@container`, arbitrary properties) and your theme's shadcn tokens.
- **[`cn`](https://github.com/shadcn-ui/cn).** It is what shadcn 4 writes to
  `lib/utils.ts` (`export { cn } from "cn"`), so a project created or migrated
  with the current CLI already has it. A project still on `clsx` +
  `tailwind-merge` gets the `cn` package added as one more dependency and
  works, but ends up with two implementations. Run
  `npx shadcn@latest migrate cn` to move the whole project onto `cn`.

## Usage

```tsx
import {
  Dilekce,
  DilekceActions,
  DilekceField,
  DilekceInput,
  DilekceRow,
  DilekceSection,
  DilekceSelect,
} from "@/components/ui/dilekce"
import { Button } from "@/components/ui/button"

;<Dilekce onSubmit={save}>
  <DilekceSection legend="Sender">
    <DilekceRow>
      <DilekceField name="name" label="Full name" span={2}>
        <DilekceInput required autoComplete="name" />
      </DilekceField>
      <DilekceField name="contents" label="Contents">
        <DilekceSelect required options={contents} />
      </DilekceField>
    </DilekceRow>
  </DilekceSection>
  <DilekceActions>
    <Button type="reset" variant="outline">
      Clear
    </Button>
    <Button type="submit">Book pickup</Button>
  </DilekceActions>
</Dilekce>
```

`onSubmit` only runs once every field is valid. Until then each field shows
its own short message and focus goes to the first one that needs attention.

## Ideas

- **Native controls.** `<input>`, `<select>`, `<textarea>`, real radios and
  checkboxes. No headless library, no portals, nothing to keep in sync with
  the platform. Forms post, autofill fills, password managers find the fields.
- **Container-adaptive, no breakpoints.** A cell asks for `span × --dk-col`; a
  row wraps when its container can't fit it. The same form works in a page, a
  sidebar or a dialog.
- **Errors inside the cell.** Short messages sit beside the label so the layout
  never shifts. A long one moves under the control, measured with canvas text
  metrics instead of a hidden copy in the DOM.
- **Edit and filled.** `mode="filled"` renders the same form read-only, like a
  completed document: values in ink, dashes for empty fields, no chrome.
- **Your own rules.** `validate` takes a function, sync or async, for what
  constraint validation can't say. Affixes, a length counter, Enter-to-advance
  and an unsaved-changes guard come with the form, off until you ask.
- **Your theme, not ours.** Only shadcn tokens. Switch themes, the form follows.
- **Customizable select.** Where the browser supports
  `appearance: base-select`, the `<select>` picker is drawn in your popover
  colors. Elsewhere the platform's own menu opens.

## Components

| Component              | Renders                   | Notes                                                                                                             |
| ---------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `Dilekce`              | `<form>`                  | `mode`, `density`, `focus`, `messages`, `errors`, `schema`, `defaultValues`, `advance`, `warnUnsaved`, `copyable` |
| `DilekceSummary`       | `<div>`                   | The error summary: links to the invalid fields after a stopped submit                                             |
| `DilekceSection`       | `<fieldset>` + `<legend>` | `legend` becomes a full-width band                                                                                |
| `DilekceRow`           | `<div>`                   | Cells share it by `span`                                                                                          |
| `DilekceField`         | One cell                  | `label`, `name`, `span`, `description`, `error`, `messages`, `validate`                                           |
| `DilekceInput`         | `<input>`                 | Any `type`; `leading` and `trailing` affixes                                                                      |
| `DilekceTextarea`      | `<textarea>`              | Grows with its text where `field-sizing` is supported                                                             |
| `DilekceSelect`        | `<select>`                | `options`, `placeholder`                                                                                          |
| `DilekceNumber`        | `<input type="number">`   | −/+ steppers that repeat while held; drag across the label to scrub; `leading`, `trailing`                        |
| `DilekceRadioGroup`    | Native radios             | `options`, `value`, `defaultValue`, `onValueChange`                                                               |
| `DilekceCheckboxGroup` | Native checkboxes         | Same, with `string[]`; `required` means at least one; uncontrolled unless you pass `value`, so reset clears it    |
| `DilekceCheckbox`      | One native checkbox       | A consent, "same as billing": `children` is its text, which names it; `required` works; see below                 |
| `DilekceSwitch`        | `<input role="switch">`   | A checkbox drawn as a track and a thumb; same text, value and rules as `DilekceCheckbox`                          |
| `DilekceFile`          | `<input type="file">`     | `accept`, `multiple`; the browser's button restyled; `required` works; see below                                  |
| `DilekceActions`       | `<div>`                   | The form's last row. Put your shadcn `<Button>`s here, primary last                                               |

## Validation

Constraint validation, the browser's own: `required`, `type="email"`,
`pattern`, `min`, `max`, `minLength` and friends. dilekçe decides _when_ to
show a message:

- On submit, every invalid field at once.
- On leaving a field, only after it was edited. Tabbing through an empty form
  doesn't paint it red.
- Once a message is showing, it follows the value live and clears the moment
  the value is fixed.

Messages are short so they fit beside a label. English and Turkish ship with
it, and any of them can be replaced per form or per field:

```tsx
import { dilekceMessages } from "@/components/ui/dilekce"

;<Dilekce messages={dilekceMessages.tr}>
  <DilekceField name="postcode" label="Posta kodu" messages={{ patternMismatch: "5 hane" }}>
    <DilekceInput required pattern="\d{5}" />
  </DilekceField>
</Dilekce>
```

Beyond the validity keys (`DilekceMessageKey` is the full set), `messages`
also holds `pending`, `invalidOne`, `invalidMany` (write `{count}` in it),
`copy`, `copied` and `summaryTitle`.

### Your own rules

`validate` on a field runs after the browser's constraints pass. Return a
message, or nothing when the value is fine. It gets the field's value (a
`string[]` for a checkbox group) and the form's `FormData`, so a rule can
compare fields. It runs when the user leaves the field after editing it, live
once a message shows, and on submit.

```tsx
<DilekceField
  name="confirm"
  label="Repeat email"
  validate={(value, data) => value !== data.get("email") && "Doesn't match"}
>
  <DilekceInput type="email" required />
</DilekceField>
```

A rule can be async. While it runs the field shows the `pending` message and
carries `data-pending` and `aria-busy`. On submit the form waits
(`data-checking`, `aria-busy`) and submits again once every rule passes. Only
the newest run sets the message, so a slow answer to an old value is dropped,
and a submit uses each field's newest answer. A newer submit supersedes a check
still running, so a rule that never settles can't leave the form stuck. A rule
that throws doesn't block the field.

The rule gets a third argument, `{ signal }`: an `AbortSignal` that is aborted
when a newer check of the field starts, the form resets or the field unmounts.
Pass it on to cancel the work:

```tsx
<DilekceField
  name="username"
  label="Username"
  validate={async (value, _data, { signal }) =>
    (await taken(String(value), { signal })) ? "Already taken" : null
  }
>
  <DilekceInput required />
</DilekceField>
```

### Submit feedback

When a submit is stopped, focus goes to the first invalid field and a polite
`role="status"` line announces how many need attention ("1 field needs
attention", "3 fields need attention"). `onInvalidSubmit` gets the invalid
fields, in document order:

```tsx
<Dilekce
  onInvalidSubmit={(fields) =>
    // [{ name: "email", label: "Email", message: "Required", element: <input> }]
    track("form_invalid", { names: fields.map((field) => field.name) })
  }
>
  …
</Dilekce>
```

### Error summary

Put `DilekceSummary` anywhere in the form, usually first. It renders nothing
until a submit is stopped, then a heading ("There is a problem", the
`summaryTitle` message, or your `title`) and a link per invalid field in
document order, "Label: message", like GOV.UK's error summary. Activating a
link focuses the control (the first radio or checkbox of a group) and scrolls
it into view. Focus moves to the summary instead of the first field, so it is
the first thing a screen reader reads; there is no `role="alert"`.

```tsx
<Dilekce>
  <DilekceSummary />…
</Dilekce>
```

Lines go as their fields become valid, and the summary hides when none is
left, on a reset and after a valid submit. It is a full-width cell in the
grid with a destructive accent, and hidden in filled mode and in print. Style
the parts through `data-slot` (`dilekce-summary`, `dilekce-summary-title`,
`dilekce-summary-list`, `dilekce-summary-link`).

### Schema (Zod, Valibot, ArkType)

`schema` takes any [Standard Schema](https://standardschema.dev). dilekçe
declares the interface itself, so there is no dependency on any of them. The
schema runs once the browser's constraints and the field's own `validate`
pass: on submit for every field, on blur and live for the field being edited
(the whole schema runs, that field's issues are shown).

```tsx
import { z } from "zod"

const Booking = z.object({
  name: z.string().min(2, "Too short"),
  weight: z.coerce.number().min(0.1, "Too light"), // values are strings: coerce
  extras: z.array(z.string()),
  passengers: z.array(z.object({ name: z.string().min(1, "Required") })),
})

<Dilekce
  schema={Booking}
  onValidSubmit={(booking) => save(booking)} // typed as z.output<typeof Booking>
>
  <DilekceSummary />
  <DilekceField name="name" label="Name"><DilekceInput /></DilekceField>
  <DilekceField name="weight" label="Weight"><DilekceNumber /></DilekceField>
  <DilekceField name="extras" label="Extras"><DilekceCheckboxGroup options={extras} /></DilekceField>
  <DilekceField name="passengers.0.name" label="Passenger"><DilekceInput /></DilekceField>
</Dilekce>
```

- **The values** are read from the form by name: a string each, a `string[]`
  for several checkboxes of one name, a checkbox group and a multiple select
  (empty when none is ticked). Numbers stay strings, so use `z.coerce`. A
  dotted name nests: `passengers.0.name` becomes `{ passengers: [{ name }] }`.
  Disabled controls, unchecked single checkboxes and files are left out.
- **Issues** go to the field whose name equals the issue's `path` joined with
  `.` (`{ key }` segments work). An issue no enabled field answers for, such
  as a `refine` on the whole object, is a form-level line in the summary and
  reaches `onInvalidSubmit` with an empty `name` and `label`. Without a
  `DilekceSummary` it only reaches `onInvalidSubmit`.
- An async schema works like an async `validate`: the field shows `pending`,
  the submit is held, and the newest run wins. A schema that throws doesn't
  block, like a rule that throws.
- `onValidSubmit(value, event)` runs after `onSubmit` when the submit goes
  through, with the schema's parsed output (or, without a schema, the values
  object). `onSubmit` works as before.

### Default values

`defaultValues` fills the form by name, for a saved draft or data you loaded.
Keys are field names, dotted names work, and so do nested objects and arrays,
which flatten to dotted names.

```tsx
<Dilekce
  defaultValues={{
    name: "Ada",
    extras: ["signature"], // a checkbox group (or multiple select)
    agree: true, // a single checkbox
    passengers: [{ name: "Ada" }], // passengers.0.name
  }}
>
```

The values are written to the controls' DOM defaults before the first paint,
so the form isn't dirty and a reset restores them. `null` clears a field. They
win over a control's own `defaultValue`, but a control you control (`value`,
`checked`) keeps its value. A field that mounts later picks its values up too.
When a `defaultValues` object with other contents arrives, it is applied again
and the form resets to it (like react-hook-form's `reset(values)`), clearing
dirty and the messages; your `onReset` isn't called for that. An object with
the same contents, such as an inline literal re-created on every render,
changes nothing.

### Server errors

Pass `errors`, keyed by field name. A field's error clears as soon as the user
edits it, blocks the submit until then, and a new object replaces the set.
Errors you pass in survive the form reset React 19 runs after a function
action, so they work with `useActionState`; a reset button still clears them.

```tsx
const [errors, setErrors] = useState<DilekceErrors>()

<Dilekce errors={errors} onSubmit={async (event) => {
  event.preventDefault()
  const result = await save(new FormData(event.currentTarget))
  if (!result.ok) setErrors(result.errors) // { postcode: "We don't collect here yet" }
}}>
```

### react-hook-form, TanStack Form

Give the field its message with `error`. While it's set the field is invalid,
`aria-invalid` is on the control, and the message is in its
`aria-describedby`.

```tsx
<DilekceField name="email" label="Email" error={formState.errors.email?.message}>
  <DilekceInput {...register("email")} />
</DilekceField>
```

`register`'s `ref` and a ref of your own are merged with the ones dilekçe keeps
(on the form, a field, a number and a select), so steppers, scrubbing, dirty
and the empty state keep working. Values written from code, such as
`setValue`, are picked up on the next focus change, reset or submit; a
controlled `value` is followed at once.

## Checkbox, switch, file and dates

**`DilekceCheckbox` and `DilekceSwitch`** are one native checkbox (the switch
has `role="switch"`). Their `children` are the text beside the control and
name it; the field's `label` names the group around it, so a screen reader says
"Consent, group; I agree to the terms, checkbox, required". Without children,
the field's label names the control instead.

```tsx
<DilekceField name="consent" label="Consent">
  <DilekceCheckbox required>I agree to the <a href="/terms">terms</a></DilekceCheckbox>
</DilekceField>
<DilekceField name="sms" label="Alerts">
  <DilekceSwitch>SMS updates</DilekceSwitch>
</DilekceField>
```

- **Value:** the checkbox's `value` (`"on"` unless you set one) when ticked,
  and the name is absent when not. Read it with `z.literal("on")` (add
  `.optional()` if it may stay off) or, for a boolean, with
  `z.coerce.boolean().default(false)`. `defaultValues={{ consent: true }}`
  ticks it. `required` says "Required" until it is ticked.
- **Filled mode:** read-only; the text is muted when off; the copy button
  copies the text, and is hidden when off.
- The switch is sized to the cell's text, and in forced colors keeps a visible
  track edge and a thumb on the side that says on or off.

**`DilekceFile`** is a native `<input type="file">`; pass `accept` and
`multiple` as usual. The browser's button is drawn as a small outline button
in your tokens, with the chosen name (the browser's "3 files" for several; the
names are the control's description). `required` uses constraint validation.

- **Values:** the schema gets a `File` (absent when none was chosen), or a
  `File[]` with `multiple` (empty when none). A field's own `validate` gets the
  names, and the files are in its `data` (`data.get("invoice")`). `accept` only
  filters the picker: check type and size in `validate` or the schema
  (`z.instanceof(File).refine((f) => f.size < 5e6, "Too big")`).
- **`defaultValues` don't apply**: a page can't choose a file for the user, so
  a default would only pretend one was chosen. Show an existing upload next to
  the field instead.
- **Filled mode:** the control gives way to the file names, or a dash; the copy
  button copies the names. A chosen file counts for `onDirtyChange`.

**Date and time:** `DilekceInput type="date" | "time" | "datetime-local" |
"month" | "week"` is first-class. The browser's own editor and picker are
used; the picker button takes `--muted-foreground` (and follows your `.dark`
class, which also sets `color-scheme: dark` on the form). `min` and `max` say
"Too low" and "Too high" like numbers (override them with `messages`). In
filled mode an empty value shows the dash, a value shows as the browser writes
it for the user's locale. Values stay in the browser's ISO form (`2026-03-15`,
`09:30`), so a schema can use `z.iso.date()`.

## Affixes and counter

`DilekceInput` and `DilekceNumber` take `leading` and `trailing`, small
unit marks drawn beside the value. They are `aria-hidden`, so say the unit in
the label too, and they are included when a filled value is copied. On an
empty filled field they hide with the dash.

```tsx
<DilekceField name="weight" label="Weight">
  <DilekceNumber trailing="kg" min={0} />
</DilekceField>
<DilekceField name="price" label="Price">
  <DilekceInput leading="€" inputMode="decimal" />
</DilekceField>
```

A control with `maxLength` shows a `n/max` counter in the cell
(`data-slot="dilekce-counter"`, `aria-hidden`) while it is focused, and always
from 90% on. It never shows in filled mode. The browser still enforces the
limit.

## Flow and unsaved changes

`advance` makes Enter move to the next control instead of submitting, like
filling in a paper form. A radio group is one stop, and Enter in the last field
submits.

`onDirtyChange` fires when the values first differ from what the form started
with, and again when they match. The form carries `data-dirty` meanwhile.
`warnUnsaved` asks before the page is left while it is dirty. Clean is the
state after mount, after a reset and after each submit that goes through.

```tsx
<Dilekce advance warnUnsaved onDirtyChange={setDirty} onSubmit={save}>
  …
</Dilekce>
```

## Filled mode

```tsx
<Dilekce mode="filled">…</Dilekce>
```

Inputs become read-only, selects and choices ignore changes but keep focus,
descriptions and actions disappear, required marks go, and empty fields show
a dash. Each value gets a copy button on hover, labelled "Copy <label>" and
hidden for empty cells; turn it off with `copyable={false}`. Values are drawn in `--dk-ink`, which is your `--primary` unless you
set it:

```tsx
<Dilekce mode="filled" className="[--dk-ink:var(--color-blue-600)]">
```

## Styling

Density sets a handful of custom properties on the form. Override any of them
with a class:

| Property     | What                                    | Comfortable |
| ------------ | --------------------------------------- | ----------- |
| `--dk-col`   | Width one span asks for before wrapping | `8.5rem`    |
| `--dk-px`    | Cell padding, inline                    | `0.75rem`   |
| `--dk-py`    | Cell padding, block                     | `0.625rem`  |
| `--dk-gap`   | Label to control                        | `0.25rem`   |
| `--dk-label` | Label and message size                  | `0.6875rem` |
| `--dk-text`  | Control text size                       | `1rem`      |
| `--dk-ink`   | Values in filled mode                   | `--primary` |

`focus="ring"` draws the focused cell's indicator all round instead of along
its bottom. Every part carries a `data-slot` (`dilekce-field`,
`dilekce-label`, `dilekce-error`, …) for targeting from your own CSS.

## Accessibility

- Every control is named by its label; radio and checkbox groups are named
  groups. A checkbox group's `required` is read as "Required" in its
  description (`aria-required` isn't valid on a group), and read-only is set
  on each checkbox.
- Field messages (on blur, live, "Checking…", "Copied", errors you pass in)
  are read through one polite live region per form, with the field's label,
  once per change. A failed submit says how many fields need attention and
  focuses the first, or the error summary when the form has one.
- Affixes (`kg`, `$`) are part of the control's description. The −/+ steppers
  are named with the field ("Decrease Weight"); the arrow keys step the input.
- Windows High Contrast (`forced-colors`): cells get real borders, the focused
  cell an outline, checked radios and checkboxes the `Highlight` color.
- Tints are mixed against `--background`, so small text on an invalid or
  hovered cell stays at 4.5:1 or more in the stock shadcn neutral theme, light
  and dark. Focus indicators use `--primary` (3:1 or more), not `--ring`.
- `prefers-reduced-motion` turns transitions and the pulse off.
- Turkish messages: set `lang="tr"` on the form, so they're read with the right voice.

## Develop

```sh
bun install
bun run dev              # demo on http://localhost:5318
bun run test             # lint + typecheck + vitest in Chromium
bun run registry:build   # public/r/*.json
bun run build            # registry + static demo
```

The component lives in `registry/dilekce/dilekce.tsx`. The demo imports it
straight from there, so edits hot-reload.

## License

[MIT](./LICENSE)

## Inspiration

dilekçe is its own take on an idea with a long history: forms laid out like
paper, every field a ruled box. It was inspired by FormKeep's
[Gridforms](https://formkeep.com/gridforms) and by Matt Rothenberg's
[Formulaire](https://github.com/mattrothenberg/formulaire), which brought that
idea to React on Base UI. dilekçe goes a different way: shadcn/ui only, native
controls instead of a headless library, Tailwind classes instead of a
stylesheet, and distributed as a registry item you own. It was written from
scratch rather than ported.
