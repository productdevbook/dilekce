# dilekce correctness and React edge-case audit

Target: `registry/dilekce/dilekce.tsx` (1595 lines, React 19.3.1). Project not modified.
Reproductions: `/tmp/dilekce-audit/audit.test.tsx` (39 vitest browser tests, real Chromium, run in a
copy of the repo at `/tmp/dilekce-audit/repo`). Raw log: `/tmp/dilekce-audit/run4.txt`.
Line numbers refer to the unmodified file. Effort: S = hours, M = a day.

## What works (verified)

- `<Dilekce action={fn}>`: an invalid form does NOT call the action; a valid one does, with the right FormData (A1).
- `useFormStatus()` in a child reports `pending` during the action (A3).
- Async `validate` plus `action`: the requestSubmit replay reaches the action once (A4, single click).
- SSR: `renderToString` in plain Bun (no `window`/`document`) renders with zero warnings (React 19 emits no `useLayoutEffect` server warning). Hydration of radio, select, text and number fields gave 0 mismatches or recoverable errors (K1). `useId` ids are stable.
- StrictMode: radio label flips label->div, submit validation still blocks (G1). Unmount during an async check: no console errors (G2). Adding/removing fields dynamically is fine (G4).
- Controlled `DilekceRadioGroup` / `DilekceCheckboxGroup` with `value` + `onValueChange` track clicks correctly (C5).
- `DilekceInput` forwards `ref` (React 19 ref-as-prop) (B4).

## Findings

### 1. P0 / S - Async-check double submit calls the action twice

`checking` (line 399) only sets `data-checking`/`aria-busy` (lines 425-426); the submit handler (433-474) never refuses a second submit while a check is in flight. Each submit event starts its own `Promise.all(...).then(... approved.current = true; form.requestSubmit())`, and each replay passes. Repro A5: slow async validator, click submit twice -> `action` called 2 times (also true for `onSubmit`). Enter-key repeat or a double click does this in real apps; with a server action that is a duplicate write.
Fix: `if (checkingRef.current) { event.preventDefault(); return }` at the top of onSubmit; set the ref when the hold starts, clear it in the `.then`.

### 2. P0 / S - Server errors from a React 19 action are wiped by the form reset

React 19 resets the form (fires a native `reset` event) after a function action finishes. `onReset` calls `setErrors({})` (line 477), which runs right after `errors={state.errors}` from `useActionState` was applied, so the field shows nothing. Repro A6: action returns `{errors:{email:"Taken"}}`; the error is `null` after the action. With `setErrors({})` removed in the copy, A6 passes ("Taken" shown), proving the cause. So `errors`+`useActionState`, the headline React 19 pattern, shows no server errors. (React also resets the typed values, which is React's behavior, but it makes the wiped error worse: the user sees an emptied form and no message.)
Fix: do not clear the `errors` prop on reset; only clear errors that came from `clearError`/local state (or ignore resets that follow an action: `if (event.nativeEvent.isTrusted === false)` is not reliable, so prefer keeping prop errors). S.

### 3. P1 / S - A user `ref` replaces the internal ref in four components

React 19 passes `ref` inside `props`; the components spread `{...props}` after their own `ref=`:

- `Dilekce` line 422 vs `{...props}` 522: `ref` overrides `formRef`, so `formRef.current` is null. `onDirtyChange` never fires, `data-dirty` never set, `warnUnsaved` dead (B1: user ref called, dirty callbacks `[]`).
- `DilekceNumber` line 1301 vs 1312: `inputRef` null, so the +/- steppers and the label scrub do nothing (B2: value stays 1 after +). This is exactly what react-hook-form `register("qty")` passes.
- `DilekceSelect` 1144 vs 1169: `selectRef` null, so the reset listener never attaches and `data-empty` stays stale after a form reset (B3).
- `DilekceField` 824 vs 875: `fieldRef` null, so `check()`, `readCount`, the counter and validation all silently return (B5: no counter).
  Fix: destructure `ref` and merge (`useMergedRef`/callback ref that sets both). Document that this is the supported way to hook react-hook-form. S.

### 4. P1 / S - `validate` receives the wrong value when the name lives on the control

`check()` (lines 705-710) reads values through the Field's `name` only. Repros:

- F1: `<DilekceField validate><DilekceRadioGroup name="r" defaultValue="b"/></DilekceField>` -> validate gets `"a"` (first radio's value, via `controlOf`) instead of `"b"`.
- F2: same with a checkbox group -> `["x"]` (first checkbox, checked or not) instead of the checked `["y"]`.
- F3: Field `name="a"`, control `name="b"` -> `""`.
  Also `errors={{r:...}}` only matches the Field `name` (line 671), so a name on the control alone never gets server errors.
  Fix: derive the name from the control/radios in the DOM (`controlOf(field)?.name`), and read the group via `[role=radiogroup],[role=group]`, taking `:checked`. S.

### 5. P1 / S - Disabled fields still block submit through `validate`; Enter gets stuck

- `readValidity` (264) and `nextControl` (219) test `control.disabled`, which is false for a control disabled by a `<fieldset disabled>` ancestor (`DilekceSection disabled`). Use `control.matches(":disabled")` or `!control.willValidate`.
- D1/D2: a disabled input (own attribute or section) with a `validate` rule still runs the rule and blocks the submit ("custom bad", submitted 0). `check()` never skips disabled controls; native constraints already do (required in a disabled section correctly gave no error).
- D3: with `advance`, Enter in field A when the next field is in a disabled `DilekceSection`: focus stays on A and `preventDefault` swallows the Enter (nextControl picks the disabled input, `.focus()` is a no-op). User is stuck.
- D4: label scrub on a `DilekceNumber` inside a disabled section changes the value (5 -> 15) because `locked` (line 1238) uses only `props.disabled`. Check `input.matches(":disabled")` in the pointerdown handler.

### 6. P1 / M - `data-empty`, counter, dirty, errors are event-driven and go stale on programmatic writes

This is the react-hook-form `setValue`/`reset(values)` path and any controlled value set from code:

- C1: `select.value = "a"` (what RHF does) leaves `data-empty` on, so the placeholder styling/filled-mode text transparency and copy-button hiding are wrong. `DilekceSelect` tracks `current` only from `onChange` and a reset listener (1128-1139).
- C2: controlled input set from code to "hello": counter still `0/10` (only refreshed on focus/change, lines 738-745, 841-845); `onDirtyChange` never fires and `data-dirty` stays off (form `measure()` only runs in the form's `onChange`, line 483).
- C3: a shown "Required" stays after the value is fixed from code until the next change/blur.
- C4 (informational): controlled `DilekceInput` + `<button type=reset>` keeps the controlled value (React semantics) but clears the native error message; the form snapshot is re-based to the still-modified value.
  Fix: for Select, derive `empty` from the DOM in a layout effect each render (`selectRef.current.value === ""`) rather than state, and add a `MutationObserver`-free option: re-read in `onFocus`/`onBlur`. For counter/dirty, re-run `readCount`/`measure` in a layout effect without deps (cheap) so controlled changes are seen. M.

### 7. P1 / S - Number stepper does nothing with `step="any"`

`nudge()` catches the `InvalidStateError` that `stepUp()/stepDown()` throw for `step="any"` and returns silently (lines 1244-1249). E1: value stays 1.5 after clicking +. Money/measure fields commonly use `step="any"`. Fix: in the catch, fall back to `Number(value||0) +/- 1` clamped to min/max via `setNativeValue`. Scrub uses step 1 for "any" (works, E2). S.

### 8. P2 / S - Async replay submits values changed during the check

G3: with a 200 ms async rule, editing the field to a bad value right after clicking submit still submits the new value (submitted `["bad"]`, rule ran once) because the replay carries `approved=true` without comparing a snapshot. Fix: store `snapshot(form)` when the hold starts and re-validate if it differs at replay (or lock inputs/readOnly while `checking`). S.

### 9. P2 / S - A server error blocks resubmit until the field is edited

Once #2 is fixed: A7 (with the reset-wipe removed) the second submit is blocked (action calls 1) and the message stays, because `validate` treats any `external` error as invalid (line 753). A transient or non-field server error ("Try again later") cannot be retried without editing. Consider re-submitting through when the error came from `errors` (the server decides), keeping only the `error` prop as blocking.

### 10. P2 / S - Next.js App Router: `dilekceMessages.tr` cannot be read from a Server Component

The file starts with `"use client"` and exports the plain object `dilekceMessages`. From a Server Component, `import { dilekceMessages }` is a client reference proxy and any property read throws: "Cannot access ... You cannot dot into a client module from a server component" (react-server-dom-webpack@19.3.1, `cjs/react-server-dom-webpack-server.node.development.js` lines 6192-6226). So `<Dilekce messages={dilekceMessages.tr}>` in a `page.tsx` crashes. Also `validate`, `onInvalidSubmit`, `onDirtyChange` cannot be passed from a Server Component (functions are not serializable); `action={serverAction}` and `errors` can. Fix options: accept `messages="tr"` (a serializable key) as well as an object; document "wrap in your own client component". A separate messages file breaks the one-file rule; say so explicitly if chosen.

### 11. P2 / S - `inputMode="decimal"` blocks negative entry on iOS

`DilekceNumber` hard-codes `inputMode="decimal"` (line 1303). iOS's decimal pad has no minus key, so negative values (min < 0) cannot be typed. Unconfirmed on device (no iOS here). Fix: use `"decimal"` only when `min >= 0`, else omit/`"text"`; allow override (it is currently overridden by `{...props}`, so users can pass it; the default is the issue).

### 12. P2 / S - Safari IME: Enter after composition advances (unconfirmed)

`advance` checks `event.nativeEvent.isComposing` (line 498). Safari fires `compositionend` before the confirming `keydown`, so `isComposing` is false and `keyCode` is 229. M1 simulation: a keydown with `keyCode 229, isComposing false` advances focus. Real Safari behavior not reproduced here; the standard fix is `|| event.keyCode === 229`. Chinese/Japanese/Korean users would skip a field when confirming a candidate.

### 13. P2 / S - Rich (ReactNode) error never returns inline after the container widens

H1: a ReactNode `error` measured in a 240 px container sets `data-below`; after widening to 900 px it stays below. The check (`overflows`, lines 984-996) uses `node.scrollWidth > inner*0.6`, but once below the span is `whitespace-normal` and stretches the full row, so its scrollWidth is always >= 60% of the cell. A string message recovers (H2: false when wide). Fix: for rich nodes, measure with a hidden inline-clone or compare `scrollWidth` of an `inline-block` wrapper around the message. RTL (H3, `dir="rtl"`): below/inline flips correctly, error aligns to the start edge; no RTL-specific bug found.

### 14. P3 / S - Smaller issues

- Number scrub with a tiny step (`step="0.0000001"`): `decimals(1e-7)` is 0 because `String(1e-7)` is "1e-7"; the result rounds back and the scrub has no effect (E3: stays 0.5). Parse exponent notation.
- Number scrub ignores the `min` step base (`min=1 step=2` start 3 -> 5 is fine, but start from empty yields multiples of 2 from 0 and can land in `stepMismatch`).
- Inline `errors={{...}}` object plus any parent re-render re-applies a cleared error (C6: the error persisted after the user edited, because `onDirtyChange -> parent setState` re-rendered with a new object, identity check at line 333). Document "pass a stable object".
- A control outside `<Dilekce>` with `form="id"` is part of FormData but never validated, and `noValidate` means the browser does not stop the submit either (G5: submitted although a `required` outside input was empty). Document.
- SSR HTML for radio and checkbox fields contains `<label for="_R_5_">` pointing at an id that does not exist (the label becomes a `<div>` in a layout effect, `useGroupLabel`, lines 133-140). Harmless after hydration; slightly wrong before. Could render a `<div>` when children are known groups, but that needs a prop.
- `useControl` overrides a user-supplied `aria-invalid` (line 1024).
- A `<DilekceCheckboxGroup validate>` with no `name` anywhere: value is `[firstCheckboxValue]` regardless of state (see #4).
- After a submit, `settle()` marks the form clean (line 436) even when the server action then fails, so `warnUnsaved` stops warning. Document.
- Same `name` on two fields: both show the server error and both clear on either edit (G6, `errors` keyed by name); acceptable, undocumented.
- Not reproduced / fine: `value`+`onChange` on Input/Select; `defaultValue` changes after mount (native semantics, nothing updates; undocumented); keyboard use (arrow keys step the number, stepper buttons are `tabIndex -1` by design, copy button is focusable, read-only select/radio/checkbox guards hold).

## Suggested order

1. #1 double submit, #2 reset wipes server errors (both break the React 19 action story).
2. #3 ref merging, #4 value/name derivation, #5 disabled handling (all S, all hit react-hook-form or `DilekceSection disabled` users).
3. #6 and #7, then #8-#13.
