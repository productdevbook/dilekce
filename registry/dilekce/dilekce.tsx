"use client"

import * as React from "react"

import { cn } from "cn"

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export type DilekceMode = "edit" | "filled"
export type DilekceDensity = "compact" | "comfortable" | "roomy"
export type DilekceValidityKey = Exclude<keyof ValidityState, "valid">
export type DilekceMessageKey =
  | DilekceValidityKey
  | "pending"
  | "invalidOne"
  | "invalidMany"
  | "copy"
  | "copied"
export type DilekceMessages = Partial<Record<DilekceMessageKey, string>>
/** Errors from outside the browser, such as a server: field name → message. */
export type DilekceErrors = Record<string, string | string[] | null | undefined>

type ValidatorResult = string | null | undefined | false
/**
 * A rule constraint validation can't express: return a message, or nothing
 * when the value is fine. Gets the field's value (an array for a checkbox
 * group) and the whole form's data, for rules that compare fields. May be
 * async; the field shows `pending` while it runs.
 */
export type DilekceValidator = (
  value: string | string[],
  data: FormData,
) => ValidatorResult | Promise<ValidatorResult>

export interface DilekceOption {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

/** Short messages that fit beside a label. Pass `messages` to override. */
export const dilekceMessages = {
  en: {
    valueMissing: "Required",
    typeMismatch: "Check format",
    patternMismatch: "Check format",
    tooShort: "Too short",
    tooLong: "Too long",
    rangeUnderflow: "Too low",
    rangeOverflow: "Too high",
    stepMismatch: "Invalid step",
    badInput: "Invalid",
    pending: "Checking…",
    invalidOne: "1 field needs attention",
    invalidMany: "{count} fields need attention",
    copy: "Copy",
    copied: "Copied",
  },
  tr: {
    valueMissing: "Zorunlu",
    typeMismatch: "Biçimi kontrol et",
    patternMismatch: "Biçimi kontrol et",
    tooShort: "Çok kısa",
    tooLong: "Çok uzun",
    rangeUnderflow: "Çok düşük",
    rangeOverflow: "Çok yüksek",
    stepMismatch: "Geçersiz adım",
    badInput: "Geçersiz",
    pending: "Kontrol ediliyor…",
    invalidOne: "1 alan düzeltilmeli",
    invalidMany: "{count} alan düzeltilmeli",
    copy: "Kopyala",
    copied: "Kopyalandı",
  },
} satisfies Record<string, DilekceMessages>

// The order a control's validity is read in: the first match is the message.
const VALIDITY_KEYS: DilekceValidityKey[] = [
  "valueMissing",
  "badInput",
  "typeMismatch",
  "patternMismatch",
  "tooShort",
  "tooLong",
  "rangeUnderflow",
  "rangeOverflow",
  "stepMismatch",
  "customError",
]

/* -------------------------------------------------------------------------- */
/*                                   Context                                  */
/* -------------------------------------------------------------------------- */

type Check = HTMLElement | null

interface FieldHandle {
  /** Shows the field's message; resolves to the control to focus when invalid. */
  validate: () => Check | Promise<Check>
  reset: () => void
}

interface FormContextValue {
  mode: DilekceMode
  messages: DilekceMessages
  errors: DilekceErrors
  clearError: (name: string) => void
  register: (handle: FieldHandle) => () => void
  copyable: boolean
}

interface FieldContextValue {
  id: string
  labelId: string
  name?: string
  invalid: boolean
  describedBy?: string
  readOnly: boolean
  labelRef: React.RefObject<HTMLElement | null>
  /** Groups (radios, checkboxes) can't be a <label>'s target. */
  setGroup: (group: boolean) => void
}

const NO_ERRORS: DilekceErrors = {}

const FormContext = React.createContext<FormContextValue | null>(null)
const FieldContext = React.createContext<FieldContextValue | null>(null)

const useForm = () => React.useContext(FormContext)
const useField = () => React.useContext(FieldContext)

/** Renders the field's label as a <div> that names the group instead. */
function useGroupLabel() {
  const setGroup = useField()?.setGroup
  React.useLayoutEffect(() => {
    if (!setGroup) return
    setGroup(true)
    return () => setGroup(false)
  }, [setGroup])
}

/**
 * One ref callback for several refs. React 19 hands a component's `ref` over as
 * a prop, and spreading `...props` after our own `ref` would replace it: this
 * keeps both, so react-hook-form's `register` and our own bookkeeping coexist.
 */
function useMergedRef<T>(...refs: Array<React.Ref<T> | undefined>): React.RefCallback<T> {
  return React.useCallback((node: T | null) => {
    const cleanups = refs.map((ref) => {
      if (typeof ref === "function") {
        const cleanup = ref(node)
        return typeof cleanup === "function" ? cleanup : () => ref(null)
      }
      if (ref) {
        ref.current = node
        return () => {
          ref.current = null
        }
      }
      return undefined
    })
    return () => {
      for (const cleanup of cleanups) cleanup?.()
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, refs)
}

const hasContent = (value: React.ReactNode) => value != null && value !== false && value !== ""

const firstOf = (value: DilekceErrors[string]) =>
  Array.isArray(value) ? value[0] : (value ?? undefined)

const CONTROL = "input:not([type=hidden]), select, textarea"

function controlOf(field: HTMLElement | null) {
  return field?.querySelector<HTMLInputElement>(CONTROL) ?? null
}

/** Disabled by its own attribute or by a disabled <fieldset> around it. */
const isDisabled = (control: Element) => control.matches(":disabled")

/** A field whose controls are all disabled is not part of the form: nothing to check. */
function allDisabled(field: HTMLElement) {
  const controls = [...field.querySelectorAll(CONTROL)]
  return controls.length > 0 && controls.every(isDisabled)
}

const isThenable = <T,>(value: unknown): value is PromiseLike<T> =>
  typeof (value as PromiseLike<T> | null)?.then === "function"

const inDocumentOrder = (a: Node, b: Node) =>
  a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1

/** The form's values as a comparable string, for telling dirty from clean. */
function snapshot(form: HTMLFormElement) {
  return JSON.stringify(
    [...new FormData(form)].map(([key, value]) => [
      key,
      typeof value === "string" ? value : value.name,
    ]),
  )
}

/** What a filled-in field says, as text: the value a reader would copy. */
function displayText(field: HTMLElement) {
  const choices = field.querySelector("[data-slot=dilekce-choices]")
  if (choices) {
    return [...choices.querySelectorAll<HTMLInputElement>("input:checked")]
      .map((input) => input.closest("label")?.textContent?.trim() ?? input.value)
      .join(", ")
  }
  const control = field.querySelector<HTMLElement>(CONTROL)
  if (control instanceof HTMLSelectElement) {
    return control.value === "" ? "" : (control.selectedOptions[0]?.textContent?.trim() ?? "")
  }
  const value = (control as HTMLInputElement | null)?.value ?? ""
  if (value === "") return ""
  const affix = (slot: string) =>
    field.querySelector(`[data-slot=dilekce-affix][data-side=${slot}]`)?.textContent?.trim()
  return [affix("leading"), value, affix("trailing")].filter(Boolean).join(" ")
}

/** Input types Enter never advances from (buttons, files, hidden). */
const ADVANCE_SKIP = new Set(["submit", "button", "reset", "file", "image", "hidden"])

const FIELD_SELECTOR = "[data-slot=dilekce-field]"

/** Text-like inputs: the ones whose text `select()` can highlight. */
function isTextLike(el: Element): el is HTMLInputElement {
  return (
    el instanceof HTMLInputElement &&
    !ADVANCE_SKIP.has(el.type) &&
    el.type !== "radio" &&
    el.type !== "checkbox"
  )
}

/** Controls Enter advances from: text-like inputs, radios, checkboxes and selects. */
function canAdvanceFrom(el: Element): el is HTMLInputElement | HTMLSelectElement {
  return (
    el instanceof HTMLSelectElement ||
    (el instanceof HTMLInputElement && !ADVANCE_SKIP.has(el.type))
  )
}

/**
 * The control Enter moves to from `from`, in document order. A radio group and
 * a checkbox group are each one stop; from either, Enter leaves the field.
 */
function nextControl(form: HTMLFormElement, from: HTMLElement) {
  const seenRadios = new Set<string>()
  const seenGroups = new Set<Element>()
  const controls = [...form.querySelectorAll<HTMLInputElement>(CONTROL)].filter((el) => {
    if (isDisabled(el) || el.getClientRects().length === 0) return false
    // A radio group is one stop: its checked radio, or its first.
    if (el.type === "radio") {
      if (seenRadios.has(el.name)) return false
      const checked = form.querySelector<HTMLInputElement>(
        `input[type=radio][name="${CSS.escape(el.name)}"]:checked`,
      )
      if (checked && checked !== el) return false
      seenRadios.add(el.name)
    }
    // A checkbox group is one stop: its first checkbox.
    if (el.type === "checkbox") {
      const group = el.closest(FIELD_SELECTOR) ?? el
      if (seenGroups.has(group)) return false
      seenGroups.add(group)
    }
    return true
  })
  const field = from.closest(FIELD_SELECTOR)
  const grouped =
    from instanceof HTMLInputElement && (from.type === "radio" || from.type === "checkbox")
  if (!grouped) return controls[controls.indexOf(from as HTMLInputElement) + 1] ?? null
  return (
    controls.find(
      (el) =>
        el !== from &&
        from.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING &&
        (!field || !field.contains(el)),
    ) ?? null
  )
}

/**
 * What a field holds, read from its controls: the checked boxes of a checkbox
 * group, the checked radio, or the text of the first control. Disabled
 * controls don't count, like in FormData. Reading the controls rather than the
 * field's `name` means a name that lives on the control works too.
 */
function valueOf(field: HTMLElement): string | string[] {
  const group = field.querySelector("[data-slot=dilekce-choices]")
  const picked = [...field.querySelectorAll<HTMLInputElement>("input:checked:not(:disabled)")]
  if (group?.getAttribute("role") === "group") return picked.map((input) => input.value)
  const control = controlOf(field)
  if (!control || control.type === "file") return ""
  if (control.type === "radio" || control.type === "checkbox") return picked[0]?.value ?? ""
  return control.value
}

/** The message a field's control earns right now, or null when it's valid. */
function readValidity(field: HTMLElement, messages: DilekceMessages): string | null {
  // Native constraint validation has no "at least one" for checkboxes.
  const group = field.querySelector("[data-slot=dilekce-choices]")
  if (
    group?.hasAttribute("data-required") &&
    group.querySelector("input[type=checkbox]") &&
    !group.querySelector("input:checked")
  ) {
    return messages.valueMissing ?? "Required"
  }

  const control = controlOf(field)
  if (!control || isDisabled(control) || control.validity.valid) return null
  for (const key of VALIDITY_KEYS) {
    if (!control.validity[key]) continue
    if (key === "customError") return control.validationMessage
    return messages[key] ?? control.validationMessage
  }
  return null
}

/* -------------------------------------------------------------------------- */
/*                                    Form                                    */
/* -------------------------------------------------------------------------- */

const DENSITY = [
  "[--dk-col:8.5rem] [--dk-px:0.75rem] [--dk-py:0.625rem] [--dk-gap:0.25rem] [--dk-label:0.6875rem] [--dk-text:1rem]",
  "data-[density=compact]:[--dk-col:7.5rem] data-[density=compact]:[--dk-px:0.5625rem] data-[density=compact]:[--dk-py:0.375rem] data-[density=compact]:[--dk-gap:0.125rem] data-[density=compact]:[--dk-label:0.625rem] data-[density=compact]:[--dk-text:0.9375rem]",
  "data-[density=roomy]:[--dk-col:10rem] data-[density=roomy]:[--dk-px:1rem] data-[density=roomy]:[--dk-py:0.875rem] data-[density=roomy]:[--dk-gap:0.375rem] data-[density=roomy]:[--dk-label:0.75rem] data-[density=roomy]:[--dk-text:1.0625rem]",
]

export interface DilekceProps extends React.ComponentProps<"form"> {
  /** `filled` renders the same form read-only, like a completed document. */
  mode?: DilekceMode
  density?: DilekceDensity
  /** The focused cell's indicator: a line along its bottom, or all round. */
  focus?: "line" | "ring"
  /** Replaces the short validation messages, e.g. `dilekceMessages.tr`. */
  messages?: DilekceMessages
  /**
   * Errors from outside the browser, keyed by field name. A field's error
   * clears once it's edited; a new object replaces the set.
   */
  errors?: DilekceErrors
  /**
   * Enter moves to the next field instead of submitting, like filling in a
   * paper form or a spreadsheet. Enter in the last field submits.
   */
  advance?: boolean
  /** Called when the form's values first differ from what it started with, and when they match again. */
  onDirtyChange?: (dirty: boolean) => void
  /** Asks before the page is left while there are unsaved changes. */
  warnUnsaved?: boolean
  /** Called with the names of the invalid fields when a submit is stopped. */
  onInvalidSubmit?: (names: string[]) => void
  /** In filled mode, each value gets a copy button. On by default. */
  copyable?: boolean
}

function Dilekce({
  mode = "edit",
  density = "comfortable",
  focus = "line",
  messages,
  errors: errorsProp,
  advance = false,
  onDirtyChange,
  warnUnsaved = false,
  onInvalidSubmit,
  copyable = true,
  className,
  children,
  onSubmit,
  onReset,
  onChange,
  onKeyDown,
  ref,
  ...props
}: DilekceProps) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const mergedRef = useMergedRef(formRef, ref)
  const supplied = errorsProp ?? NO_ERRORS
  const [errors, setErrors] = React.useState<DilekceErrors>(supplied)
  const [lastProp, setLastProp] = React.useState(errorsProp)
  if (errorsProp !== lastProp) {
    setLastProp(errorsProp)
    setErrors(supplied)
  }
  // React 19 resets the form after a function action, which would wipe the
  // errors the action just returned. A reset only clears errors the user has
  // edited away from, or any when a reset button asked for it.
  const resetButton = React.useRef(false)
  React.useEffect(() => {
    const form = formRef.current
    if (!form) return
    const onClick = (event: Event) => {
      if (!(event.target as Element).closest("button[type=reset], input[type=reset]")) return
      resetButton.current = true
      setTimeout(() => (resetButton.current = false))
    }
    form.addEventListener("click", onClick, true)
    return () => form.removeEventListener("click", onClick, true)
  }, [])

  const clearError = React.useCallback((name: string) => {
    setErrors((current) => {
      if (current[name] == null) return current
      const { [name]: _cleared, ...rest } = current
      return rest
    })
  }, [])

  const fields = React.useRef(new Set<FieldHandle>())
  const register = React.useCallback((handle: FieldHandle) => {
    fields.current.add(handle)
    return () => void fields.current.delete(handle)
  }, [])

  const merged = React.useMemo(() => ({ ...dilekceMessages.en, ...messages }), [messages])
  const context = React.useMemo<FormContextValue>(
    () => ({ mode, messages: merged, errors, clearError, register, copyable }),
    [mode, merged, errors, clearError, register, copyable],
  )

  /*
   * Dirty: the values differ from a snapshot taken at mount, after a reset
   * and after each submit that went through.
   */
  const clean = React.useRef("")
  const [dirty, setDirty] = React.useState(false)
  const dirtyRef = React.useRef(false)
  const dirtyChange = React.useRef(onDirtyChange)
  React.useLayoutEffect(() => {
    dirtyChange.current = onDirtyChange
  })
  const markDirty = React.useCallback((next: boolean) => {
    // Not inside a setState updater: React may run those while rendering, and
    // the callback is the parent's setState.
    if (dirtyRef.current === next) return
    dirtyRef.current = next
    setDirty(next)
    dirtyChange.current?.(next)
  }, [])
  const measure = React.useCallback(() => {
    if (formRef.current) markDirty(snapshot(formRef.current) !== clean.current)
  }, [markDirty])
  const settle = React.useCallback(() => {
    if (formRef.current) clean.current = snapshot(formRef.current)
    markDirty(false)
  }, [markDirty])
  React.useLayoutEffect(settle, [settle])

  React.useEffect(() => {
    if (!warnUnsaved || !dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [warnUnsaved, dirty])

  // A stopped submit is announced once, politely, for screen reader users who
  // can't see the cells turn red.
  const [announcement, setAnnouncement] = React.useState("")
  const [checking, setChecking] = React.useState(false)
  const approved = React.useRef(false)
  // The values the running check was started with: edits made meanwhile get checked again.
  const checkingRef = React.useRef<string | null>(null)

  const fail = (controls: HTMLElement[]) => {
    controls.sort(inDocumentOrder)
    controls[0]?.focus()
    const count = controls.length
    const text =
      count === 1 ? merged.invalidOne : merged.invalidMany?.replace("{count}", String(count))
    // A trailing zero-width space toggles, so a repeat of the same text is read again.
    setAnnouncement((last) => (last === text ? `${text}\u200b` : (text ?? "")))
    onInvalidSubmit?.(
      controls.map((control) => control.getAttribute("name") ?? control.id).filter(Boolean),
    )
  }

  return (
    <FormContext.Provider value={context}>
      <form
        data-slot="dilekce"
        data-mode={mode}
        data-density={density}
        data-focus={focus}
        ref={mergedRef}
        noValidate
        data-dirty={dirty || undefined}
        data-checking={checking || undefined}
        aria-busy={checking || undefined}
        className={cn(
          "group/dilekce @container/dilekce flex flex-col gap-px overflow-clip rounded-lg border bg-border text-foreground [--dk-ink:var(--primary)]",
          "print:rounded-none print:[print-color-adjust:exact]",
          DENSITY,
          className,
        )}
        onSubmit={(event) => {
          // A check is already running; its replay will be the one submit.
          if (checkingRef.current != null) {
            event.preventDefault()
            return
          }
          const done = () => {
            onSubmit?.(event)
            settle()
          }
          // The second pass of an async check: already validated.
          if (approved.current) {
            approved.current = false
            done()
            return
          }

          // Every field shows its message at once; focus goes to the first.
          const results = [...fields.current].map((field) => field.validate())
          if (!results.some(isThenable)) {
            const invalid = results.filter((control): control is HTMLElement => control != null)
            if (invalid.length > 0) {
              event.preventDefault()
              fail(invalid)
              return
            }
            done()
            return
          }

          // Some check is async: hold the submit, then replay it once they pass.
          event.preventDefault()
          const form = event.currentTarget
          const submitter = (event.nativeEvent as SubmitEvent).submitter
          const held = snapshot(form)
          checkingRef.current = held
          setChecking(true)
          void Promise.all(results).then((controls) => {
            checkingRef.current = null
            setChecking(false)
            const invalid = controls.filter((control): control is HTMLElement => control != null)
            if (invalid.length > 0) {
              fail(invalid)
              return
            }
            // Edited while it ran: the replay validates the new values from the start.
            approved.current = snapshot(form) === held
            const button = submitter as HTMLButtonElement | null
            form.requestSubmit(button?.form === form ? button : undefined)
          })
        }}
        onReset={(event) => {
          for (const field of fields.current) field.reset()
          const asked = resetButton.current
          resetButton.current = false
          setErrors((current) => (asked || current !== supplied ? NO_ERRORS : current))
          setAnnouncement("")
          onReset?.(event)
          // The browser restores the values after this event; measure then.
          setTimeout(settle)
        }}
        onChange={(event) => {
          measure()
          onChange?.(event)
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          const target = event.target as HTMLElement
          if (
            !advance ||
            event.defaultPrevented ||
            event.key !== "Enter" ||
            event.shiftKey ||
            event.altKey ||
            event.metaKey ||
            event.ctrlKey ||
            event.nativeEvent.isComposing ||
            !canAdvanceFrom(target)
          ) {
            return
          }
          const next = nextControl(event.currentTarget, target)
          if (!next) {
            // A text input submits natively; the others don't, so do it for them.
            if (!isTextLike(target)) {
              event.preventDefault()
              event.currentTarget.requestSubmit()
            }
            return
          }
          event.preventDefault()
          next.focus()
          if (isTextLike(next)) {
            try {
              next.select()
            } catch {
              // Types without a selection (date, number in some engines).
            }
          }
        }}
        {...props}
      >
        {children}
        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>
      </form>
    </FormContext.Provider>
  )
}

/* -------------------------------------------------------------------------- */
/*                               Section and row                              */
/* -------------------------------------------------------------------------- */

export interface DilekceSectionProps extends React.ComponentProps<"fieldset"> {
  legend?: React.ReactNode
  legendClassName?: string
}

function DilekceSection({
  legend,
  legendClassName,
  className,
  children,
  ...props
}: DilekceSectionProps) {
  return (
    <fieldset
      data-slot="dilekce-section"
      className={cn("m-0 flex min-w-0 flex-col gap-px border-0 p-0", className)}
      {...props}
    >
      {legend != null && (
        // Floated, a <legend> stops being drawn in the border and fills the row.
        <legend
          data-slot="dilekce-legend"
          className={cn(
            "float-left w-full bg-muted px-(--dk-px) py-[calc(var(--dk-py)*0.9)] font-mono text-(length:--dk-label) font-semibold tracking-[0.08em] text-foreground uppercase",
            "print:break-after-avoid",
            legendClassName,
          )}
        >
          {legend}
        </legend>
      )}
      {children}
    </fieldset>
  )
}

/**
 * No breakpoints: a cell asks for `span × --dk-col` and the row wraps when the
 * container can't give it that. Grow and basis both scale with span, so rows
 * with the same total span line up.
 */
function DilekceRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dilekce-row"
      className={cn("flex flex-wrap gap-px print:break-inside-avoid", className)}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*                                    Field                                   */
/* -------------------------------------------------------------------------- */

const FIELD = [
  "group/field relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] content-start gap-x-2 gap-y-(--dk-gap) bg-background px-(--dk-px) py-(--dk-py) cursor-text transition-[background-color,box-shadow] duration-150 ease-out",
  "[grid-template-areas:'label_error'_'control_control'_'description_description']",
  "data-below:[grid-template-areas:'label_label'_'control_control'_'error_error'_'description_description']",
  // The tint alone is too faint for a focus indicator (WCAG 1.4.11), so a 2px
  // line in the focus color carries it.
  "[--dk-focus:var(--primary)] data-invalid:[--dk-focus:var(--destructive)]",
  "hover:bg-accent/50 focus-within:bg-accent focus-within:shadow-[inset_0_-2px_0_var(--dk-focus)]",
  "group-data-[focus=ring]/dilekce:focus-within:shadow-[inset_0_0_0_2px_var(--dk-focus)]",
  "data-invalid:bg-destructive/5 data-invalid:hover:bg-destructive/8 data-invalid:focus-within:bg-destructive/10",
  "has-[select]:cursor-default has-[:is(input,select,textarea):disabled]:cursor-not-allowed has-[:is(input,select,textarea):disabled]:opacity-55",
  // Radios and checkboxes never wrap inside a cell: the cell refuses to shrink
  // below them, so the row wraps the whole cell. Narrow, they stack instead.
  "has-[[data-slot=dilekce-choices]]:min-w-max @max-[30rem]/dilekce:has-[[data-slot=dilekce-choices]]:min-w-0",
  // Filled: a completed document. No chrome, and a dash where nothing was given.
  "group-data-[mode=filled]/dilekce:cursor-default group-data-[mode=filled]/dilekce:hover:bg-background group-data-[mode=filled]/dilekce:focus-within:bg-background group-data-[mode=filled]/dilekce:focus-within:shadow-none",
  "group-data-[mode=filled]/dilekce:has-focus-visible:shadow-[inset_0_0_0_2px_var(--dk-focus)]",
  "after:pointer-events-none after:self-start after:text-(length:--dk-text) after:leading-[1.4] after:text-muted-foreground after:[grid-area:control]",
  "group-data-[mode=filled]/dilekce:has-[:placeholder-shown]:after:content-['—'] group-data-[mode=filled]/dilekce:has-data-empty:after:content-['—']",
  "print:break-inside-avoid print:shadow-none!",
]

export interface DilekceFieldProps extends Omit<React.ComponentProps<"div">, "children"> {
  label: React.ReactNode
  /** Passed to the control when it has no name of its own. */
  name?: string
  /** Relative width within the row. Also sets how early the cell wraps. */
  span?: number
  description?: React.ReactNode
  /**
   * A message from outside the browser's own validation, such as
   * react-hook-form. While set, the field is invalid and shows it.
   */
  error?: React.ReactNode
  /** Override the short messages for this field alone. */
  messages?: DilekceMessages
  /**
   * A rule of your own, run after the browser's constraints pass: on leaving
   * the field after an edit, live once a message shows, and on submit.
   */
  validate?: DilekceValidator
  children: React.ReactNode
}

function DilekceField({
  label,
  name,
  span = 1,
  description,
  error,
  messages,
  validate,
  className,
  style,
  children,
  onBlur,
  onChange,
  onFocus,
  onMouseDown,
  ref,
  ...props
}: DilekceFieldProps) {
  const form = useForm()
  const id = React.useId()
  const fieldRef = React.useRef<HTMLDivElement>(null)
  const mergedRef = useMergedRef(fieldRef, ref)
  const labelRef = React.useRef<HTMLElement>(null)
  // One ref for whichever element the label renders as.
  const setLabel = React.useCallback((node: HTMLElement | null) => {
    labelRef.current = node
  }, [])
  const errorRef = React.useRef<HTMLSpanElement>(null)

  const [group, setGroup] = React.useState(false)
  const [native, setNative] = React.useState<string | null>(null)
  const [dirty, setDirty] = React.useState(false)
  const [below, setBelow] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [count, setCount] = React.useState<{ length: number; max: number } | null>(null)
  const [copied, setCopied] = React.useState(false)

  // The name the field's controls carry, which may be theirs and not the field's.
  const [controlName, setControlName] = React.useState<string>()
  const errorKey = [name, controlName].find((key) => key && form?.errors[key] != null)
  const formError = errorKey ? firstOf(form?.errors[errorKey]) : undefined
  const external = hasContent(error) ? error : formError
  const message: React.ReactNode = hasContent(external) ? external : native
  const invalid = hasContent(message)
  const readOnly = form?.mode === "filled"
  const copyable = readOnly && (form?.copyable ?? true)

  const all = React.useMemo(
    () => ({ ...(form?.messages ?? dilekceMessages.en), ...messages }),
    [form?.messages, messages],
  )

  // Latest values for the handle and checks, which run outside a render.
  const latest = React.useRef({ external, all, validate })
  React.useLayoutEffect(() => {
    latest.current = { external, all, validate }
  })
  React.useLayoutEffect(() => {
    setControlName(controlOf(fieldRef.current)?.name || undefined)
  }, [children, name])

  /*
   * Constraint validation first, then the field's own rule. An async rule
   * shows `pending` and only the newest run may set the message.
   */
  const run = React.useRef(0)
  const check = React.useCallback((): string | null | Promise<string | null> => {
    const field = fieldRef.current
    if (!field) return null
    const { all, validate } = latest.current
    const token = ++run.current
    if (allDisabled(field)) {
      setPending(false)
      setNative(null)
      return null
    }
    const found = readValidity(field, all)
    if (found || !validate) {
      setPending(false)
      setNative(found)
      return found
    }
    const data = new FormData(field.closest("form") ?? undefined)
    const value = valueOf(field)
    const asMessage = (result: ValidatorResult) =>
      typeof result === "string" && result !== "" ? result : null

    const result = validate(value, data)
    if (!isThenable<ValidatorResult>(result)) {
      setPending(false)
      setNative(asMessage(result))
      return asMessage(result)
    }
    setPending(true)
    return Promise.resolve(result).then(
      (resolved) => {
        const message = asMessage(resolved)
        if (token === run.current) {
          setPending(false)
          setNative(message)
        }
        return message
      },
      () => {
        // A rule that throws can't vouch for the value; it doesn't block it either.
        if (token === run.current) setPending(false)
        return null
      },
    )
  }, [])

  const readCount = React.useCallback(() => {
    const control = controlOf(fieldRef.current)
    const max = control?.maxLength ?? -1
    setCount(control && max > 0 ? { length: control.value.length, max } : null)
  }, [])
  React.useLayoutEffect(readCount, [readCount])

  React.useEffect(() => {
    if (!form) return
    return form.register({
      validate: () => {
        const field = fieldRef.current
        if (!field) return null
        const result = check()
        if (allDisabled(field)) return null
        const blocked = (message: string | null) =>
          hasContent(latest.current.external) || message ? controlOf(field) : null
        return isThenable<string | null>(result)
          ? Promise.resolve(result).then(blocked)
          : blocked(result)
      },
      reset: () => {
        run.current++
        setNative(null)
        setPending(false)
        setDirty(false)
        // The browser restores values after the reset event.
        setTimeout(readCount)
      },
    })
  }, [form, check, readCount])

  /*
   * A message that won't fit beside the label (within 60% of the cell) moves
   * to its own line under the control. Measured with canvas text metrics, so
   * there's no hidden copy of the message in the DOM.
   */
  const text = typeof message === "string" ? message : null
  React.useLayoutEffect(() => {
    const field = fieldRef.current
    const node = errorRef.current
    if (!invalid || !field || !node) {
      setBelow(false)
      return
    }
    const check = () => setBelow(overflows(field, node, text))
    check()
    const observer = new ResizeObserver(check)
    observer.observe(field)
    void document.fonts?.ready.then(check)
    return () => observer.disconnect()
  }, [invalid, text])

  const labelId = `${id}-label`
  const descriptionId = `${id}-description`
  const errorId = `${id}-error`
  const copyId = `${id}-copy`
  const describedBy =
    [description != null && descriptionId, invalid && errorId].filter(Boolean).join(" ") ||
    undefined
  const near = count != null && count.length >= count.max * 0.9

  const context = React.useMemo<FieldContextValue>(
    () => ({
      id,
      labelId,
      name,
      invalid,
      describedBy,
      readOnly,
      labelRef,
      setGroup,
    }),
    [id, labelId, name, invalid, describedBy, readOnly],
  )

  const labelClass = cn(
    "min-w-0 cursor-[inherit] overflow-hidden font-mono text-(length:--dk-label) leading-[1.3] font-medium tracking-[0.06em] text-ellipsis whitespace-nowrap text-muted-foreground uppercase select-none [grid-area:label]",
    "group-focus-within/field:text-foreground group-data-invalid/field:text-destructive",
    // Visual only: assistive tech already announces "required".
    "after:text-primary group-has-required/field:after:content-['_*'_/_''] group-has-data-required/field:after:content-['_*'_/_''] group-data-invalid/field:after:text-destructive group-data-[mode=filled]/dilekce:after:content-none!",
    "group-has-data-scrub/field:cursor-ew-resize group-data-[mode=filled]/dilekce:cursor-default",
  )

  return (
    <FieldContext.Provider value={context}>
      <div
        ref={mergedRef}
        data-slot="dilekce-field"
        data-invalid={invalid || undefined}
        data-below={below || undefined}
        data-pending={pending || undefined}
        aria-busy={pending || undefined}
        data-span={span}
        className={cn(FIELD, className)}
        style={{ flex: `${span} 1 calc(${span} * var(--dk-col))`, ...style }}
        onChange={(event) => {
          setDirty(true)
          readCount()
          if (errorKey && hasContent(formError)) form?.clearError(errorKey)
          // Once a message is showing, it follows the value live.
          if (native) void check()
          onChange?.(event)
        }}
        onFocus={(event) => {
          // A controlled value may have changed without an event of its own.
          readCount()
          onFocus?.(event)
        }}
        onBlur={(event) => {
          const field = event.currentTarget
          // Only when focus leaves the cell, and only after an edit.
          if (!field.contains(event.relatedTarget as Node | null) && dirty) void check()
          onBlur?.(event)
        }}
        onMouseDown={(event) => {
          onMouseDown?.(event)
          // Pressing the cell, anywhere but a control or a label, focuses its control.
          const target = event.target as Element
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            target.closest("input, select, textarea, button, a, label, [data-slot=dilekce-choices]")
          ) {
            return
          }
          const control = controlOf(event.currentTarget)
          if (!control || isDisabled(control)) return
          event.preventDefault()
          control.focus()
          if (control instanceof HTMLSelectElement && !readOnly) {
            try {
              control.showPicker()
            } catch {
              // Not supported, or no user activation: focus is enough.
            }
          }
        }}
        {...props}
      >
        {group ? (
          <div ref={setLabel} id={labelId} data-slot="dilekce-label" className={labelClass}>
            {label}
          </div>
        ) : (
          <label
            ref={setLabel}
            id={labelId}
            htmlFor={id}
            data-slot="dilekce-label"
            className={labelClass}
          >
            {label}
          </label>
        )}
        {invalid && (
          <span
            ref={errorRef}
            id={errorId}
            data-slot="dilekce-error"
            className="font-mono text-(length:--dk-label) leading-[1.3] font-medium tracking-[0.02em] whitespace-nowrap text-destructive [grid-area:error] group-data-below/field:text-pretty group-data-below/field:whitespace-normal group-data-below/field:[overflow-wrap:anywhere]"
          >
            {message}
          </span>
        )}
        {!invalid && pending && (
          <span
            data-slot="dilekce-pending"
            className="animate-pulse font-mono text-(length:--dk-label) leading-[1.3] font-medium tracking-[0.02em] whitespace-nowrap text-muted-foreground [grid-area:error]"
          >
            {all.pending}
          </span>
        )}
        {!invalid && !pending && !readOnly && count && (
          // The browser enforces maxLength; this only shows how close it is.
          <span
            data-slot="dilekce-counter"
            data-near={near || undefined}
            aria-hidden="true"
            className="hidden font-mono text-(length:--dk-label) leading-[1.3] tracking-[0.02em] whitespace-nowrap text-muted-foreground tabular-nums [grid-area:error] group-focus-within/field:inline data-near:inline data-near:text-foreground"
          >
            {count.length}/{count.max}
          </span>
        )}
        {copyable && (
          <button
            type="button"
            data-slot="dilekce-copy"
            aria-labelledby={`${copyId} ${labelId}`}
            className={cn(
              "-my-0.5 inline-flex cursor-pointer items-center gap-1 self-start justify-self-end rounded-sm px-1 py-0.5 font-mono text-(length:--dk-label) leading-[1.3] tracking-[0.02em] text-muted-foreground opacity-0 transition-opacity duration-150 [grid-area:error]",
              "group-hover/field:opacity-100 hover:bg-foreground/8 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:opacity-100 data-copied:opacity-100",
              // Nothing to copy: an empty field, or a group with nothing chosen.
              "group-has-[:placeholder-shown]/field:hidden group-has-data-empty/field:hidden group-has-[[data-slot=dilekce-choices]]/field:group-not-has-checked/field:hidden",
              "print:hidden",
            )}
            data-copied={copied || undefined}
            onClick={async (event) => {
              const field = event.currentTarget.closest<HTMLElement>("[data-slot=dilekce-field]")
              if (!field) return
              try {
                await navigator.clipboard.writeText(displayText(field))
                setCopied(true)
                setTimeout(() => setCopied(false), 1200)
              } catch {
                // Clipboard blocked: the value is still there to select.
              }
            }}
          >
            <svg
              viewBox="0 0 10 10"
              aria-hidden="true"
              className="size-2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            >
              {copied ? (
                <path d="M2 5.5 4.2 7.5 8 3" strokeLinecap="round" strokeWidth="1.5" />
              ) : (
                <>
                  <rect x="3.5" y="3.5" width="5" height="5" rx="1" />
                  <path d="M6.5 3.5V2.5a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1" />
                </>
              )}
            </svg>
            <span id={copyId}>{copied ? all.copied : all.copy}</span>
          </button>
        )}
        {children}
        {description != null && (
          <p
            id={descriptionId}
            data-slot="dilekce-description"
            className="m-0 text-[calc(var(--dk-text)*0.78)] leading-snug text-muted-foreground [grid-area:description] group-data-[mode=filled]/dilekce:hidden"
          >
            {description}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  )
}

let canvas: CanvasRenderingContext2D | null | undefined

function overflows(field: HTMLElement, node: HTMLElement, text: string | null) {
  const style = getComputedStyle(field)
  const inner =
    field.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight)
  // Rich messages (not a string) are measured as laid out.
  if (text == null) return node.scrollWidth > inner * 0.6
  canvas ??= document.createElement("canvas").getContext("2d")
  if (!canvas) return node.scrollWidth > inner * 0.6
  const font = getComputedStyle(node)
  canvas.font = font.font
  if ("letterSpacing" in canvas) canvas.letterSpacing = font.letterSpacing
  return canvas.measureText(text).width > inner * 0.6
}

/* -------------------------------------------------------------------------- */
/*                                  Controls                                  */
/* -------------------------------------------------------------------------- */

const CONTROL_CLASS = cn(
  "w-full min-w-0 appearance-none rounded-none border-0 bg-transparent p-0 text-(length:--dk-text) leading-[1.4] text-inherit outline-none [grid-area:control] placeholder:text-muted-foreground",
  "group-data-[mode=filled]/dilekce:text-(--dk-ink) group-data-[mode=filled]/dilekce:placeholder:text-transparent",
  // Autofill keeps the cell's look: the browser's own fill is delayed away.
  "autofill:[-webkit-text-fill-color:currentColor] autofill:[transition:background-color_0s_100000s,color_0s_100000s]",
  "disabled:cursor-not-allowed",
)

/** The props a control takes from its field. */
function useControl(props: {
  id?: string
  name?: string
  readOnly?: boolean
  "aria-describedby"?: string
}) {
  const field = useField()
  return {
    id: props.id ?? field?.id,
    name: props.name ?? field?.name,
    readOnly: props.readOnly || field?.readOnly || undefined,
    "aria-describedby":
      [field?.describedBy, props["aria-describedby"]].filter(Boolean).join(" ") || undefined,
    "aria-invalid": field?.invalid || undefined,
  }
}

export interface DilekceAffixProps {
  /** Shown before the value inside the cell: a currency, `https://`, `+90`. */
  leading?: React.ReactNode
  /** Shown after the value inside the cell: a unit, `kg`, `%`, `.com`. */
  trailing?: React.ReactNode
}

const AFFIX = cn(
  "shrink-0 text-(length:--dk-text) leading-[1.4] whitespace-nowrap text-muted-foreground select-none",
  // A completed form shows a dash for an empty value, without a lone unit.
  "group-data-[mode=filled]/dilekce:group-has-[:placeholder-shown]/field:invisible",
)

function Affix({ side, children }: { side: "leading" | "trailing"; children: React.ReactNode }) {
  if (!hasContent(children)) return null
  return (
    <span data-slot="dilekce-affix" data-side={side} aria-hidden="true" className={AFFIX}>
      {children}
    </span>
  )
}

export interface DilekceInputProps extends React.ComponentProps<"input">, DilekceAffixProps {}

function DilekceInput({
  className,
  placeholder = " ",
  leading,
  trailing,
  ...props
}: DilekceInputProps) {
  const input = (
    <input
      data-slot="dilekce-input"
      // A blank placeholder lets :placeholder-shown mean "empty".
      placeholder={placeholder}
      className={cn(CONTROL_CLASS, (leading != null || trailing != null) && "flex-1", className)}
      {...props}
      {...useControl(props)}
    />
  )
  if (leading == null && trailing == null) return input
  return (
    <div className="flex min-w-0 items-baseline gap-1 [grid-area:control]">
      <Affix side="leading">{leading}</Affix>
      {input}
      <Affix side="trailing">{trailing}</Affix>
    </div>
  )
}

function DilekceTextarea({
  className,
  placeholder = " ",
  rows = 2,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="dilekce-textarea"
      placeholder={placeholder}
      rows={rows}
      className={cn(
        CONTROL_CLASS,
        // Grows with its text where supported, instead of a foreign resize grip.
        "min-h-[calc(var(--dk-text)*2.8)] resize-y supports-[field-sizing:content]:resize-none supports-[field-sizing:content]:field-sizing-content",
        "group-data-[mode=filled]/dilekce:min-h-0 group-data-[mode=filled]/dilekce:resize-none",
        className,
      )}
      {...props}
      {...useControl(props)}
    />
  )
}

export interface DilekceSelectProps extends Omit<
  React.ComponentProps<"select">,
  "children" | "multiple"
> {
  options: DilekceOption[]
  placeholder?: string
}

/**
 * A native <select>. Where the browser supports customizable selects
 * (`appearance: base-select`), its picker is drawn in the theme's popover
 * colors; elsewhere the platform's own menu opens.
 */
function DilekceSelect({
  options,
  placeholder = "Select…",
  className,
  value,
  defaultValue,
  onChange,
  onKeyDown,
  ref,
  ...props
}: DilekceSelectProps) {
  // <select> has no readOnly: filled mode guards it by hand instead.
  const { readOnly, ...selectControl } = useControl(props)
  const [current, setCurrent] = React.useState(String(defaultValue ?? ""))
  const empty = (value === undefined ? current : String(value)) === ""
  const selectRef = React.useRef<HTMLSelectElement>(null)
  const mergedRef = useMergedRef(selectRef, ref)

  // A form reset restores the selection without a change event.
  React.useEffect(() => {
    const form = selectRef.current?.form
    if (!form) return
    const onReset = () => setTimeout(() => setCurrent(selectRef.current?.value ?? ""))
    form.addEventListener("reset", onReset)
    return () => form.removeEventListener("reset", onReset)
  }, [])

  return (
    <div className="relative flex min-w-0 items-center [grid-area:control]">
      <select
        ref={mergedRef}
        data-slot="dilekce-select"
        data-empty={empty || undefined}
        value={value}
        defaultValue={value === undefined ? (defaultValue ?? "") : undefined}
        className={cn(
          CONTROL_CLASS,
          "cursor-[inherit] truncate pe-5 [appearance:none] data-empty:text-muted-foreground",
          "group-data-[mode=filled]/dilekce:pointer-events-none group-data-[mode=filled]/dilekce:data-empty:text-transparent",
          "supports-[appearance:base-select]:[appearance:base-select] [&::picker-icon]:hidden",
          "[&::picker(select)]:[appearance:base-select] [&::picker(select)]:mt-1.5 [&::picker(select)]:rounded-md [&::picker(select)]:border [&::picker(select)]:border-border [&::picker(select)]:bg-popover [&::picker(select)]:p-1 [&::picker(select)]:text-popover-foreground [&::picker(select)]:shadow-md",
          // A required select's placeholder can't be picked again, so it isn't listed.
          "[&_option[value='']:disabled]:hidden",
          "[&_option]:flex [&_option]:items-center [&_option]:rounded-sm [&_option]:px-2 [&_option]:py-1.5 [&_option]:text-sm [&_option]:text-popover-foreground [&_option:checked]:font-medium [&_option:focus-visible]:bg-accent [&_option:hover]:bg-accent [&_option::checkmark]:order-1 [&_option::checkmark]:ms-auto",
          className,
        )}
        onChange={(event) => {
          setCurrent(event.currentTarget.value)
          onChange?.(event)
        }}
        onKeyDown={(event) => {
          // A read-only select still has focus; it just won't change.
          if (readOnly && event.key !== "Tab") event.preventDefault()
          onKeyDown?.(event)
        }}
        {...props}
        {...selectControl}
        aria-readonly={readOnly}
      >
        <option value="" disabled={props.required}>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 10 10"
        aria-hidden="true"
        className="pointer-events-none absolute end-0 size-2.5 text-muted-foreground group-data-[mode=filled]/dilekce:hidden"
      >
        <path
          d="M2.5 4 5 6.5 7.5 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   Number                                   */
/* -------------------------------------------------------------------------- */

const setNativeValue = (input: HTMLInputElement, next: string) => {
  // React tracks `value` through its setter; the prototype's setter skips the
  // tracker, so the input event that follows reads as a real change.
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, next)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

/** How many decimals a number is written with, reading `1e-7` as 7. */
const decimals = (n: number) => {
  const [mantissa = "", exponent = "0"] = String(n).split("e")
  return Math.max(0, (mantissa.split(".")[1] ?? "").length - Number(exponent))
}

export interface DilekceNumberProps
  extends Omit<React.ComponentProps<"input">, "type">, DilekceAffixProps {
  /** Pixels of drag across the label per step, or `false` to turn it off. */
  scrub?: number | false
  decrementLabel?: string
  incrementLabel?: string
}

/**
 * A number input with −/+ steppers that repeat while held. Dragging across the
 * label scrubs the value, like a design tool.
 */
function DilekceNumber({
  className,
  scrub = 6,
  decrementLabel = "Decrease",
  incrementLabel = "Increase",
  placeholder = " ",
  leading,
  trailing,
  ref,
  ...props
}: DilekceNumberProps) {
  const control = useControl(props)
  const field = useField()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const mergedRef = useMergedRef(inputRef, ref)
  const locked = Boolean(control.readOnly || props.disabled)

  const nudge = React.useCallback((direction: 1 | -1) => {
    const input = inputRef.current
    if (!input || input.readOnly || isDisabled(input)) return
    const before = input.value
    try {
      if (direction > 0) input.stepUp()
      else input.stepDown()
    } catch {
      // step="any" has no step to take: move by 1, keeping the value's decimals.
      const current = before === "" ? 0 : Number(before)
      if (Number.isNaN(current)) return
      const min = input.min === "" ? -Infinity : Number(input.min)
      const max = input.max === "" ? Infinity : Number(input.max)
      const moved = Math.min(max, Math.max(min, current + direction))
      if (moved !== current) setNativeValue(input, moved.toFixed(decimals(current)))
      return
    }
    const next = input.value
    // stepUp already changed it; put it back so the change is reported once.
    setNativeValue(input, before)
    if (next !== before) setNativeValue(input, next)
  }, [])

  // Scrub: drag horizontally across the label.
  React.useEffect(() => {
    const label = field?.labelRef.current
    const input = inputRef.current
    if (!label || !input || scrub === false || locked) return

    const onPointerDown = (down: PointerEvent) => {
      // The input may have been disabled since this was attached, e.g. by a fieldset.
      if (down.button !== 0 || input.readOnly || isDisabled(input)) return
      const step = Number(input.step) || 1
      const start = Number(input.value) || 0
      const min = input.min === "" ? -Infinity : Number(input.min)
      const max = input.max === "" ? Infinity : Number(input.max)
      let moved = false
      down.preventDefault()
      label.setPointerCapture(down.pointerId)

      const onMove = (move: PointerEvent) => {
        const dx = move.clientX - down.clientX
        if (!moved && Math.abs(dx) < 3) return
        moved = true
        const raw = start + Math.trunc(dx / scrub) * step
        const next = Math.min(max, Math.max(min, raw))
        const text = next.toFixed(Math.max(decimals(step), decimals(start)))
        if (text !== input.value) setNativeValue(input, text)
      }
      const onUp = () => {
        label.removeEventListener("pointermove", onMove)
        label.removeEventListener("pointerup", onUp)
        label.removeEventListener("pointercancel", onUp)
        if (moved) input.dispatchEvent(new Event("change", { bubbles: true }))
        input.focus()
      }
      label.addEventListener("pointermove", onMove)
      label.addEventListener("pointerup", onUp)
      label.addEventListener("pointercancel", onUp)
    }

    label.addEventListener("pointerdown", onPointerDown)
    return () => label.removeEventListener("pointerdown", onPointerDown)
  }, [field, scrub, locked])

  return (
    <div className="flex min-w-0 items-center gap-0.5 [grid-area:control]">
      <Affix side="leading">{leading}</Affix>
      <input
        ref={mergedRef}
        type="number"
        inputMode="decimal"
        data-slot="dilekce-number"
        data-scrub={(scrub !== false && !locked) || undefined}
        placeholder={placeholder}
        className={cn(
          CONTROL_CLASS,
          "flex-1 tabular-nums [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          className,
        )}
        {...props}
        {...control}
      />
      <Affix side="trailing">{trailing}</Affix>
      {!locked && (
        <>
          <Stepper label={decrementLabel} onStep={() => nudge(-1)}>
            <path d="M2.5 5h5" />
          </Stepper>
          <Stepper label={incrementLabel} onStep={() => nudge(1)}>
            <path d="M2.5 5h5M5 2.5v5" />
          </Stepper>
        </>
      )}
    </div>
  )
}

function Stepper({
  label,
  onStep,
  children,
}: {
  label: string
  onStep: () => void
  children: React.ReactNode
}) {
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const stop = () => clearTimeout(timer.current)
  React.useEffect(() => stop, [])

  return (
    <button
      type="button"
      // The input's own arrow keys step it; the buttons are for pointers.
      tabIndex={-1}
      aria-label={label}
      className="grid size-5.5 shrink-0 place-items-center rounded-sm text-muted-foreground opacity-0 transition-[opacity,background-color,color] duration-150 ease-out group-focus-within/field:opacity-100 group-hover/field:opacity-100 pointer-coarse:opacity-100 hover:bg-foreground/8 hover:text-foreground active:bg-foreground/14"
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        onStep()
        // Held down, it repeats: a pause, then quickly.
        const repeat = (delay: number) => {
          timer.current = setTimeout(() => {
            onStep()
            repeat(60)
          }, delay)
        }
        repeat(400)
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onClick={(event) => {
        // Keyboard or assistive tech activation, with no pointer involved.
        if (event.detail === 0) onStep()
      }}
    >
      <svg
        viewBox="0 0 10 10"
        aria-hidden="true"
        className="size-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      >
        {children}
      </svg>
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*                            Radios and checkboxes                           */
/* -------------------------------------------------------------------------- */

const CHOICES = cn(
  "flex gap-x-4 gap-y-1.5 text-(length:--dk-text) leading-[1.4] whitespace-nowrap [grid-area:control] @max-[30rem]/dilekce:flex-col",
)

const CHOICE = cn(
  "inline-flex cursor-default items-center gap-1.5 has-disabled:opacity-55",
  "group-data-[mode=filled]/dilekce:text-(--dk-ink) group-data-[mode=filled]/dilekce:not-has-checked:text-muted-foreground",
)

const MARK = cn(
  "peer size-3.75 shrink-0 appearance-none border-[1.5px] border-muted-foreground bg-background outline-none transition-[background-color,border-color] duration-150 ease-out",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  "checked:border-primary checked:bg-primary",
  "group-data-[mode=filled]/dilekce:checked:border-(--dk-ink) group-data-[mode=filled]/dilekce:checked:bg-(--dk-ink)",
)

interface GroupProps<V> extends Omit<React.ComponentProps<"div">, "defaultValue" | "onChange"> {
  options: DilekceOption[]
  name?: string
  value?: V
  defaultValue?: V
  onValueChange?: (value: V) => void
  required?: boolean
  disabled?: boolean
}

/** Read-only radios and checkboxes keep focus but ignore changes. */
function useReadOnlyGuard(readOnly: boolean) {
  return {
    onClick: (event: React.MouseEvent<HTMLInputElement>) => {
      if (readOnly) event.preventDefault()
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (readOnly && event.key.startsWith("Arrow")) event.preventDefault()
    },
  }
}

/** A single-choice radio group laid out inline inside a cell. */
function DilekceRadioGroup({
  options,
  name,
  value,
  defaultValue,
  onValueChange,
  required,
  disabled,
  className,
  ...props
}: GroupProps<string>) {
  const field = useField()
  useGroupLabel()
  const control = useControl({ name })
  const guard = useReadOnlyGuard(Boolean(control.readOnly))
  const fallback = React.useId()

  return (
    <div
      role="radiogroup"
      data-slot="dilekce-choices"
      aria-labelledby={field?.labelId}
      aria-describedby={control["aria-describedby"]}
      aria-invalid={control["aria-invalid"]}
      aria-required={required || undefined}
      aria-readonly={control.readOnly}
      className={cn(CHOICES, className)}
      {...props}
    >
      {options.map((option) => (
        <label key={option.value} className={CHOICE}>
          <input
            type="radio"
            name={control.name ?? fallback}
            value={option.value}
            required={required}
            disabled={disabled || option.disabled}
            checked={value === undefined ? undefined : value === option.value}
            defaultChecked={defaultValue === undefined ? undefined : defaultValue === option.value}
            onChange={(event) => {
              if (event.currentTarget.checked) onValueChange?.(option.value)
            }}
            className={cn(MARK, "rounded-full checked:shadow-[inset_0_0_0_3px_var(--background)]")}
            {...guard}
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}

/** A multi-choice checkbox group laid out inline inside a cell. */
function DilekceCheckboxGroup({
  options,
  name,
  value,
  defaultValue,
  onValueChange,
  required,
  disabled,
  className,
  ...props
}: GroupProps<string[]>) {
  const field = useField()
  useGroupLabel()
  const control = useControl({ name })
  const guard = useReadOnlyGuard(Boolean(control.readOnly))

  return (
    <div
      role="group"
      data-slot="dilekce-choices"
      data-required={required || undefined}
      aria-labelledby={field?.labelId}
      aria-describedby={control["aria-describedby"]}
      aria-invalid={control["aria-invalid"]}
      aria-readonly={control.readOnly}
      className={cn(CHOICES, className)}
      {...props}
    >
      {options.map((option) => (
        <label key={option.value} className={CHOICE}>
          <span className="relative grid place-items-center">
            <input
              type="checkbox"
              name={control.name}
              value={option.value}
              disabled={disabled || option.disabled}
              // Uncontrolled unless `value` is given, so a form reset resets it.
              checked={value === undefined ? undefined : value.includes(option.value)}
              defaultChecked={
                value === undefined ? defaultValue?.includes(option.value) : undefined
              }
              onChange={(event) => {
                const group = event.currentTarget.closest("[data-slot=dilekce-choices]")
                const checked = [
                  ...(group?.querySelectorAll<HTMLInputElement>("input:checked") ?? []),
                ]
                // Controlled: report the change the click asked for, from `value`.
                const next =
                  value === undefined
                    ? checked.map((input) => input.value)
                    : event.currentTarget.checked
                      ? [...value, option.value]
                      : value.filter((v) => v !== option.value)
                onValueChange?.(next)
              }}
              className={cn(MARK, "rounded-[3px]")}
              {...guard}
            />
            <svg
              viewBox="0 0 10 10"
              aria-hidden="true"
              className="pointer-events-none absolute hidden size-2.5 text-primary-foreground peer-checked:block"
            >
              <path
                d="M2 5.5 4.2 7.5 8 3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          {option.label}
        </label>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   Actions                                  */
/* -------------------------------------------------------------------------- */

/**
 * The form's last row: buttons sit inside the grid instead of below it. Put
 * shadcn's <Button> here, the primary one last so it lands in the corner.
 */
function DilekceActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dilekce-actions"
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 bg-muted px-(--dk-px) py-(--dk-px) group-data-[mode=filled]/dilekce:hidden print:hidden",
        className,
      )}
      {...props}
    />
  )
}

export {
  Dilekce,
  DilekceActions,
  DilekceCheckboxGroup,
  DilekceField,
  DilekceInput,
  DilekceNumber,
  DilekceRadioGroup,
  DilekceRow,
  DilekceSection,
  DilekceSelect,
  DilekceTextarea,
}
