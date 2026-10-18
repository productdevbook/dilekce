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

| Component              | Renders                   | Notes                                                                                                          |
| ---------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `Dilekce`              | `<form>`                  | `mode`, `density`, `focus`, `messages`, `errors`, `advance`, `warnUnsaved`, `copyable`                         |
| `DilekceSection`       | `<fieldset>` + `<legend>` | `legend` becomes a full-width band                                                                             |
| `DilekceRow`           | `<div>`                   | Cells share it by `span`                                                                                       |
| `DilekceField`         | One cell                  | `label`, `name`, `span`, `description`, `error`, `messages`, `validate`                                        |
| `DilekceInput`         | `<input>`                 | Any `type`; `leading` and `trailing` affixes                                                                   |
| `DilekceTextarea`      | `<textarea>`              | Grows with its text where `field-sizing` is supported                                                          |
| `DilekceSelect`        | `<select>`                | `options`, `placeholder`                                                                                       |
| `DilekceNumber`        | `<input type="number">`   | −/+ steppers that repeat while held; drag across the label to scrub; `leading`, `trailing`                     |
| `DilekceRadioGroup`    | Native radios             | `options`, `value`, `defaultValue`, `onValueChange`                                                            |
| `DilekceCheckboxGroup` | Native checkboxes         | Same, with `string[]`; `required` means at least one; uncontrolled unless you pass `value`, so reset clears it |
| `DilekceActions`       | `<div>`                   | The form's last row. Put your shadcn `<Button>`s here, primary last                                            |

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
`copy` and `copied`.

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
the newest run sets the message, so a slow answer to an old value is dropped.
A rule that throws doesn't block the field.

```tsx
<DilekceField
  name="username"
  label="Username"
  validate={async (value) => ((await taken(String(value))) ? "Already taken" : null)}
>
  <DilekceInput required />
</DilekceField>
```

### Submit feedback

When a submit is stopped, focus goes to the first invalid field and a polite
`role="status"` line announces how many need attention ("1 field needs
attention", "3 fields need attention"). `onInvalidSubmit` gets their names:

```tsx
<Dilekce onInvalidSubmit={(names) => track("form_invalid", { names })}>…</Dilekce>
```

### Server errors

Pass `errors`, keyed by field name. A field's error clears as soon as the user
edits it, blocks the submit until then, and a new object replaces the set.

```tsx
const [errors, setErrors] = useState<DilekceErrors>()

<Dilekce errors={errors} onSubmit={async (event) => {
  event.preventDefault()
  const result = await save(new FormData(event.currentTarget))
  if (!result.ok) setErrors(result.errors) // { postcode: "We don't collect here yet" }
}}>
```

### react-hook-form, TanStack Form, Zod

Give the field its message with `error`. While it's set the field is invalid,
`aria-invalid` is on the control, and the message is in its
`aria-describedby`.

```tsx
<DilekceField name="email" label="Email" error={formState.errors.email?.message}>
  <DilekceInput {...register("email")} />
</DilekceField>
```

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
