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
  | "summaryTitle"
  | "add"
  | "remove"
  | "removeRow"
  | "rowAdded"
  | "rowRemoved"
  | "change"
  | "checkFailed"
export type DilekceMessages = Partial<Record<DilekceMessageKey, string>>
/** Errors from outside the browser, such as a server: field name → message. */
export type DilekceErrors = Record<string, string | string[] | null | undefined>

/*
 * The Standard Schema v1 interface, copied from https://github.com/standard-schema/standard-schema
 * (MIT) so the registry item needs no dependency. Zod 3.24+, Valibot, ArkType and
 * others implement it: pass any of their schemas as `schema`.
 */
/** The Standard interface. */
export interface StandardTypedV1<Input = unknown, Output = Input> {
  /** The Standard properties. */
  readonly "~standard": StandardTypedV1.Props<Input, Output>
}

export declare namespace StandardTypedV1 {
  /** The Standard properties interface. */
  interface Props<Input = unknown, Output = Input> {
    /** The version number of the standard. */
    readonly version: 1
    /** The vendor name of the schema library. */
    readonly vendor: string
    /** Inferred types associated with the schema. */
    readonly types?: Types<Input, Output> | undefined
  }
  /** The Standard types interface. */
  interface Types<Input = unknown, Output = Input> {
    /** The input type of the schema. */
    readonly input: Input
    /** The output type of the schema. */
    readonly output: Output
  }
  /** Infers the input type of a Standard. */
  type InferInput<Schema extends StandardTypedV1> = NonNullable<
    Schema["~standard"]["types"]
  >["input"]
  /** Infers the output type of a Standard. */
  type InferOutput<Schema extends StandardTypedV1> = NonNullable<
    Schema["~standard"]["types"]
  >["output"]
}

/** The Standard Schema interface. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  /** The Standard Schema properties. */
  readonly "~standard": StandardSchemaV1.Props<Input, Output>
}

export declare namespace StandardSchemaV1 {
  /** The Standard Schema properties interface. */
  interface Props<Input = unknown, Output = Input> extends StandardTypedV1.Props<Input, Output> {
    /** Validates unknown input values. */
    readonly validate: (
      value: unknown,
      options?: StandardSchemaV1.Options | undefined,
    ) => Result<Output> | Promise<Result<Output>>
  }
  /** The result interface of the validate function. */
  type Result<Output> = SuccessResult<Output> | FailureResult
  /** The result interface if validation succeeds. */
  interface SuccessResult<Output> {
    /** The typed output value. */
    readonly value: Output
    /** The absence of issues indicates success. */
    readonly issues?: undefined
  }
  interface Options {
    /** Implicit support for additional vendor-specific parameters, if needed. */
    readonly libraryOptions?: Record<string, unknown> | undefined
  }
  /** The result interface if validation fails. */
  interface FailureResult {
    /** The issues of failed validation. */
    readonly issues: ReadonlyArray<Issue>
  }
  /** The issue interface of the failure output. */
  interface Issue {
    /** The error message of the issue. */
    readonly message: string
    /** The path of the issue, if any. */
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined
  }
  /** The path segment interface of the issue. */
  interface PathSegment {
    /** The key representing a path segment. */
    readonly key: PropertyKey
  }
  /** The Standard types interface. */
  interface Types<Input = unknown, Output = Input> extends StandardTypedV1.Types<Input, Output> {}
  /** Infers the input type of a Standard. */
  type InferInput<Schema extends StandardTypedV1> = StandardTypedV1.InferInput<Schema>
  /** Infers the output type of a Standard. */
  type InferOutput<Schema extends StandardTypedV1> = StandardTypedV1.InferOutput<Schema>
}

/**
 * What `onValidSubmit` gets without a schema: the form's values by name. A
 * name is a string, or a `string[]` for several checkboxes of one name, a
 * checkbox group and a multiple select. Numbers stay strings (`z.coerce`);
 * a dotted name (`passengers.0.name`) nests into objects and arrays. A single
 * checkbox or switch is its `value` ("on" unless set) when checked and absent
 * when not; a file field is a `File` (absent when none was chosen), or a
 * `File[]` with `multiple`.
 */
export type DilekceValues = Record<string, unknown>

/** What `onValidSubmit` gets: the schema's parsed output, else the values. */
export type DilekceOutput<S> = S extends StandardSchemaV1
  ? StandardSchemaV1.InferOutput<S>
  : DilekceValues

/** One field a stopped submit found invalid. A form-level issue has `name` and `label` empty. */
export interface DilekceInvalidField {
  name: string
  /** The field label's text. */
  label: string
  message: string
  /** The control to focus; the form itself for a form-level issue. */
  element: HTMLElement
}

/** The field a "Change" action was pressed on, in a filled form. */
export interface DilekceEditField {
  /** The control's name, else the field's; empty when it has neither. */
  name: string
  /** The field label's text. */
  label: string
  /** The field's first control: switch to edit mode, then focus it. */
  element: HTMLElement
}

type DefaultScalar = string | number | boolean | null | undefined
/** A value `defaultValues` can hold: a scalar, a list, or nested objects and arrays. */
export type DilekceDefaultValue =
  | DefaultScalar
  | DilekceDefaultValue[]
  | { [key: string]: DilekceDefaultValue }
/** Values by field name; dotted names (`passengers.0.name`) and nested objects both work. */
export type DilekceDefaultValues = Record<string, DilekceDefaultValue>

type ValidatorResult = string | null | undefined | false
/**
 * A rule constraint validation can't express: return a message, or nothing
 * when the value is fine. Gets the field's value (an array for a checkbox
 * group) and the whole form's data, for rules that compare fields. May be
 * async; the field shows `pending` while it runs. The optional third argument
 * carries an `AbortSignal`, aborted when a newer check of the field starts,
 * the form resets or the field unmounts: pass it to `fetch` to cancel.
 */
export type DilekceValidator = (
  value: string | string[],
  data: FormData,
  options: { signal: AbortSignal },
) => ValidatorResult | Promise<ValidatorResult>

export interface DilekceOption {
  value: string
  label: React.ReactNode
  disabled?: boolean | undefined
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
    summaryTitle: "There is a problem",
    add: "Add another",
    remove: "Remove",
    removeRow: "Remove row {index}",
    rowAdded: "Row {index} added",
    rowRemoved: "Row {index} removed",
    change: "Change",
    checkFailed: "Couldn't check the form, try again",
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
    summaryTitle: "Bir sorun var",
    add: "Bir tane daha ekle",
    remove: "Kaldır",
    removeRow: "{index}. satırı kaldır",
    rowAdded: "{index}. satır eklendi",
    rowRemoved: "{index}. satır kaldırıldı",
    change: "Değiştir",
    checkFailed: "Form denetlenemedi, tekrar deneyin",
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

/** What a field found wrong when validated, for the summary and `onInvalidSubmit`. */
interface Failure {
  /** The control to focus: the first of a group. */
  control: HTMLElement
  field: HTMLElement
  label: string
  message: string
  /** The field's own rule threw or rejected: nothing is wrong with the value, but it can't be vouched for. */
  broken?: true
}

/** What the schema made of the form's values. */
interface SchemaOutcome {
  /** The schema's parsed output; undefined when it found issues or couldn't run. */
  value: unknown
  issues: Array<{ key: string; message: string }>
  /** The schema threw or rejected: the form can't be checked, so it isn't submitted. */
  failed?: true
  /** The first message for each field name the issues address. */
  messages: Map<string, string>
}

/** `null`: the form has no schema. */
type SchemaRun = SchemaOutcome | Promise<SchemaOutcome> | null

interface FieldHandle {
  /**
   * Shows the field's message; resolves to what's wrong when invalid. A submit
   * hands every field the one schema run it started.
   */
  validate: (schemaRun?: SchemaRun) => Failure | null | Promise<Failure | null>
  reset: () => void
  /** A control's value changed without an event: re-read the counter. */
  sync: () => void
  /** The names an issue's path can address this field by; none while it is disabled. */
  names: () => string[]
}

/** One line of the error summary: a field that was invalid when a submit was stopped. */
interface SummaryItem {
  field: HTMLElement
  control: HTMLElement
  label: string
  message: string
}

interface SummaryState {
  /** Counts stopped submits: the summary takes focus when it changes. */
  stopped: number
  items: SummaryItem[]
  /** Schema issues no field answers for. */
  formLevel: string[]
}

const NO_SUMMARY: SummaryState = { stopped: 0, items: [], formLevel: [] }

/** An external store, so the summary can change without every field re-rendering. */
function createSummaryStore() {
  let state = NO_SUMMARY
  let mounted = 0
  const listeners = new Set<() => void>()
  return {
    /** Whether a `DilekceSummary` is mounted: without one, focus goes to the first field. */
    hasSummary: () => mounted > 0,
    attach() {
      mounted++
      return () => void mounted--
    },
    get: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    update(next: (current: SummaryState) => SummaryState) {
      const value = next(state)
      if (value === state) return
      state = value
      for (const listener of listeners) listener()
    },
  }
}

type SummaryStore = ReturnType<typeof createSummaryStore>

interface FormContextValue {
  mode: DilekceMode
  messages: DilekceMessages
  errors: DilekceErrors
  clearError: (name: string) => void
  register: (handle: FieldHandle) => () => void
  /** Re-reads whether the form differs from where it started. */
  measure: () => void
  copyable: boolean
  /** Says something through the form's one polite live region. */
  announce: (text: string) => void
  /** Runs the schema over the form's values now; null without a schema. */
  runSchema: () => SchemaRun
  /** A field's message changed: the summary follows (null: it's valid now). */
  reportField: (field: HTMLElement | null, message: string | null, label?: string) => void
  /** Applies `defaultValues` to the controls under `root`, e.g. a field that mounted late. */
  applyDefaults: (root: ParentNode) => void
  /** How many rows `defaultValues` holds for a repeater's name; undefined when it says nothing. */
  defaultRows: (name: string) => number | undefined
  /** A "Change" button is wanted on every filled field (the form has `onEdit`). */
  canEdit: boolean
  edit: (field: DilekceEditField) => void
  /** Replaces the dash of an empty field in filled mode. */
  emptyText: string | undefined
  summary: SummaryStore
}

interface FieldContextValue {
  id: string
  labelId: string
  name?: string | undefined
  invalid: boolean
  describedBy?: string | undefined
  readOnly: boolean
  /** The field's messages: the group says "required" with the same word as its error. */
  messages: DilekceMessages
  labelRef: React.RefObject<HTMLElement | null>
  /** Groups (radios, checkboxes) can't be a <label>'s target. */
  setGroup: (group: boolean) => void
  /** A control's value changed without an event: re-read what hangs off it. */
  sync: () => void
}

const NO_ERRORS: DilekceErrors = {}

const FormContext = React.createContext<FormContextValue | null>(null)
const FieldContext = React.createContext<FieldContextValue | null>(null)

const useForm = () => React.useContext(FormContext)
const useField = () => React.useContext(FieldContext)

/** Renders the field's label as a <div> that names the group instead. */
function useGroupLabel(enabled = true) {
  const setGroup = useField()?.setGroup
  React.useLayoutEffect(() => {
    if (!setGroup || !enabled) return
    setGroup(true)
    return () => setGroup(false)
  }, [setGroup, enabled])
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
      // A file by name, size and date, so choosing another one of the same name counts.
      typeof value === "string" ? value : `${value.name}:${value.size}:${value.lastModified}`,
    ]),
  )
}

/**
 * `snapshot` plus the controls without a name, which FormData leaves out: what
 * a check compares to tell that the user edited the form while it ran.
 */
function fingerprint(form: HTMLFormElement) {
  const unnamed = [...form.elements].flatMap<[string, number, string | boolean | string[]]>(
    (el, index) => {
      if (el.matches(":disabled")) return []
      if (el instanceof HTMLSelectElement) {
        return el.name
          ? []
          : [[el.id, index, [...el.selectedOptions].map((option) => option.value)]]
      }
      if (el instanceof HTMLTextAreaElement) return el.name ? [] : [[el.id, index, el.value]]
      if (!(el instanceof HTMLInputElement) || el.name) return []
      if (ADVANCE_SKIP.has(el.type) && el.type !== "file") return []
      const checkable = el.type === "radio" || el.type === "checkbox"
      return [[el.id, index, checkable ? el.checked : el.value]]
    },
  )
  return snapshot(form) + JSON.stringify(unnamed)
}

const fileNames = (input: HTMLInputElement) => [...(input.files ?? [])].map((file) => file.name)

/** What a filled-in field says, as text: the value a reader would copy. */
function displayText(field: HTMLElement) {
  const choices = field.querySelector("[data-slot=dilekce-choices]")
  if (choices) {
    return [...choices.querySelectorAll<HTMLInputElement>("input:checked")]
      .map((input) => input.closest("label")?.textContent?.trim() ?? input.value)
      .join(", ")
  }
  // A single checkbox or switch: its text when on, nothing when off.
  const toggle = field.querySelector("[data-slot=dilekce-toggle]")
  if (toggle) return toggle.querySelector("input:checked") ? (toggle.textContent?.trim() ?? "") : ""
  const control = field.querySelector<HTMLElement>(CONTROL)
  if (control instanceof HTMLSelectElement) {
    return control.value === "" ? "" : (control.selectedOptions[0]?.textContent?.trim() ?? "")
  }
  if (control instanceof HTMLInputElement && control.type === "file")
    return fileNames(control).join(", ")
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
  const control = [...field.querySelectorAll<HTMLInputElement>(CONTROL)].find(
    (el) => !isDisabled(el),
  )
  if (!control) return ""
  // The names; the files themselves are in the `data` a rule gets, and in the schema's values.
  if (control.type === "file") {
    const names = fileNames(control)
    return control.multiple ? names : (names[0] ?? "")
  }
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
/*                       Values, schema issues and defaults                   */
/* -------------------------------------------------------------------------- */

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

const isFormControl = (el: Element): el is FormControl =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLSelectElement ||
  el instanceof HTMLTextAreaElement

/** Input types that carry no value of their own to read or fill. */
const VALUELESS = new Set(["submit", "button", "reset", "image", "file"])

/** Puts `value` at a dotted path, making an array where the next segment is an index. */
function nest(root: Record<string, unknown>, name: string, value: unknown) {
  const parts = name.split(".")
  if (parts.includes("__proto__")) return
  let node = root as Record<string, unknown>
  for (const [index, key] of parts.slice(0, -1).entries()) {
    let child = node[key]
    if (typeof child !== "object" || child === null) {
      child = /^\d+$/.test(parts[index + 1] ?? "") ? [] : {}
      node[key] = child
    }
    node = child as Record<string, unknown>
  }
  node[parts.at(-1) ?? ""] = value
}

/**
 * The form's values by name, for a schema and `onValidSubmit`. Like FormData
 * (disabled controls and unchecked boxes are left out) except that several
 * checkboxes of one name, a checkbox group and a multiple select give a
 * `string[]`, empty when none is ticked, and dotted names nest.
 */
function readValues(form: HTMLFormElement): DilekceValues {
  const controls = [...form.elements].filter(isFormControl)
  const boxes = new Map<string, number>()
  for (const el of controls) {
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      boxes.set(el.name, (boxes.get(el.name) ?? 0) + 1)
    }
  }
  const flat = new Map<string, unknown>()
  for (const el of controls) {
    // A radio group without a name is named by the component to group its radios only.
    if (!el.name || el.hasAttribute("data-anonymous") || isDisabled(el)) continue
    if (el instanceof HTMLSelectElement) {
      flat.set(el.name, el.multiple ? [...el.selectedOptions].map((o) => o.value) : el.value)
    } else if (el instanceof HTMLTextAreaElement) {
      flat.set(el.name, el.value)
    } else if (el.type === "checkbox") {
      const list =
        (boxes.get(el.name) ?? 0) > 1 ||
        el.closest("[data-slot=dilekce-choices]")?.getAttribute("role") === "group"
      if (list) {
        const values = (flat.get(el.name) as string[] | undefined) ?? []
        flat.set(el.name, el.checked ? [...values, el.value] : values)
      } else if (el.checked) {
        flat.set(el.name, el.value)
      }
    } else if (el.type === "radio") {
      if (el.checked) flat.set(el.name, el.value)
    } else if (el.type === "file") {
      // Files, not names: a File, or File[] for `multiple`. A single field with
      // nothing chosen is left out, so the schema sees it missing.
      const files = [...(el.files ?? [])]
      if (el.multiple) flat.set(el.name, files)
      else if (files[0]) flat.set(el.name, files[0])
    } else if (!VALUELESS.has(el.type) && !flat.has(el.name)) {
      flat.set(el.name, el.value)
    }
  }
  // A repeater with no rows has no control to read: it is an empty list, not missing.
  for (const list of form.querySelectorAll<HTMLElement>("[data-slot=dilekce-repeat][data-name]")) {
    const name = list.dataset.name
    if (!name || list.querySelector(":scope > [data-slot=dilekce-repeat-row]")) continue
    if (!list.closest("fieldset:disabled") && !flat.has(name)) flat.set(name, [])
  }
  const values: DilekceValues = {}
  for (const [name, value] of flat) nest(values, name, value)
  return values
}

/** An issue's path as a field name: segments joined with ".", `{ key }` objects unwrapped. */
const pathKey = (path: StandardSchemaV1.Issue["path"]) =>
  (path ?? [])
    .map((segment) => String(typeof segment === "object" ? segment.key : segment))
    .join(".")

type DefaultEntry = DefaultScalar | string[]

/**
 * `defaultValues` as dotted names: `{ passengers: [{ name: "Ada" }] }` becomes
 * `passengers.0.name`. A list of scalars stays whole too (a checkbox group's
 * or multiple select's value) beside its indexed names.
 */
function flattenDefaults(values: DilekceDefaultValues | undefined) {
  const out = new Map<string, DefaultEntry>()
  const walk = (path: string, value: DilekceDefaultValue) => {
    if (Array.isArray(value)) {
      if (value.every((item) => item == null || typeof item !== "object")) {
        out.set(path, value.filter((item) => item != null).map(String))
        for (const [index, item] of value.entries())
          out.set(`${path}.${index}`, item as DefaultScalar)
      } else {
        for (const [index, item] of value.entries()) walk(`${path}.${index}`, item)
      }
    } else if (typeof value === "object" && value !== null) {
      for (const [key, item] of Object.entries(value)) walk(`${path}.${key}`, item)
    } else {
      out.set(path, value)
    }
  }
  for (const [key, value] of Object.entries(values ?? {})) walk(key, value)
  return out
}

/** The rows `defaultValues` holds for a repeater: `passengers.0.name`, … give 1 + the highest index. */
function countRows(defaults: Map<string, DefaultEntry>, name: string) {
  const prefix = `${name}.`
  let rows = 0
  for (const key of defaults.keys()) {
    if (!key.startsWith(prefix)) continue
    const index = /^(\d+)(?:\.|$)/.exec(key.slice(prefix.length))
    if (index?.[1]) rows = Math.max(rows, Number(index[1]) + 1)
  }
  // An empty list is an answer too: no rows.
  return rows > 0 ? rows : defaults.has(name) ? 0 : undefined
}

/** Puts a control's DOM defaults back to what its markup said, to restore later. */
function defaultsOf(el: FormControl): () => void {
  if (el instanceof HTMLSelectElement) {
    const flags = [...el.options].map((option) => option.defaultSelected)
    return () => {
      for (const [index, option] of [...el.options].entries()) {
        option.defaultSelected = flags[index] ?? false
      }
    }
  }
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
    const checked = el.defaultChecked
    return () => {
      el.defaultChecked = checked
    }
  }
  const text = el.defaultValue
  return () => {
    el.defaultValue = text
  }
}

/**
 * Sets the DOM defaults of one control, so a form reset restores them, and
 * shows them now: React assigns a control's value or checkedness when it
 * mounts, which stops later changes to the default from showing.
 */
function setDefault(el: FormControl, value: DefaultEntry) {
  const scalar = Array.isArray(value) || typeof value === "boolean" ? "" : String(value ?? "")
  if (el instanceof HTMLSelectElement) {
    const list = Array.isArray(value) ? value : value == null ? [] : [String(value)]
    for (const option of el.options) {
      option.defaultSelected = list.includes(option.value)
      option.selected = option.defaultSelected
    }
  } else if (el instanceof HTMLTextAreaElement) {
    el.defaultValue = scalar
    el.value = scalar
  } else if (el.type === "checkbox" || el.type === "radio") {
    el.defaultChecked =
      typeof value === "boolean" && el.type === "checkbox"
        ? value
        : Array.isArray(value)
          ? value.includes(el.value)
          : value != null && String(value) === el.value
    el.checked = el.defaultChecked
  } else if (!VALUELESS.has(el.type)) {
    el.defaultValue = scalar
    el.value = scalar
  }
}

/**
 * Fills the controls' DOM defaults from `values` by name. Controls the app
 * controls (`data-controlled`) are left alone, and so is the DOM default of a
 * name `values` doesn't mention, except that a name an earlier call set is
 * put back to its markup.
 */
function applyDefaultValues(
  controls: Iterable<Element>,
  values: Map<string, DefaultEntry>,
  originals: WeakMap<Element, () => void>,
) {
  for (const el of controls) {
    if (!isFormControl(el) || !el.name || el.hasAttribute("data-controlled")) continue
    // A row added later starts empty: its index would otherwise borrow another row's defaults.
    if (el.closest("[data-slot=dilekce-repeat-row]:not([data-initial])")) continue
    // A file input can't be given a file from markup: a default would only pretend one was chosen.
    if (el instanceof HTMLInputElement && el.type === "file") continue
    if (!values.has(el.name)) {
      originals.get(el)?.()
      continue
    }
    if (!originals.has(el)) originals.set(el, defaultsOf(el))
    setDefault(el, values.get(el.name))
  }
}

/* -------------------------------------------------------------------------- */
/*                                    Form                                    */
/* -------------------------------------------------------------------------- */

const DENSITY = [
  "[--dk-col:8.5rem] [--dk-px:0.75rem] [--dk-py:0.625rem] [--dk-gap:0.25rem] [--dk-label:0.6875rem] [--dk-text:1rem]",
  "data-[density=compact]:[--dk-col:7.5rem] data-[density=compact]:[--dk-px:0.5625rem] data-[density=compact]:[--dk-py:0.375rem] data-[density=compact]:[--dk-gap:0.125rem] data-[density=compact]:[--dk-label:0.625rem] data-[density=compact]:[--dk-text:0.9375rem]",
  "data-[density=roomy]:[--dk-col:10rem] data-[density=roomy]:[--dk-px:1rem] data-[density=roomy]:[--dk-py:0.875rem] data-[density=roomy]:[--dk-gap:0.375rem] data-[density=roomy]:[--dk-label:0.75rem] data-[density=roomy]:[--dk-text:1.0625rem]",
]

export interface DilekceProps<
  S extends StandardSchemaV1 | undefined = undefined,
> extends React.ComponentProps<"form"> {
  /** `filled` renders the same form read-only, like a completed document. */
  mode?: DilekceMode | undefined
  density?: DilekceDensity | undefined
  /** The focused cell's indicator: a line along its bottom, or all round. */
  focus?: "line" | "ring" | undefined
  /** Replaces the short validation messages, e.g. `dilekceMessages.tr`. */
  messages?: DilekceMessages | undefined
  /**
   * Errors from outside the browser, keyed by field name. A field's error
   * clears once it's edited; a new object replaces the set.
   */
  errors?: DilekceErrors | undefined
  /**
   * Enter moves to the next field instead of submitting, like filling in a
   * paper form or a spreadsheet. Enter in the last field submits.
   */
  advance?: boolean | undefined
  /** Called when the form's values first differ from what it started with, and when they match again. */
  onDirtyChange?: ((dirty: boolean) => void) | undefined
  /** Asks before the page is left while there are unsaved changes. */
  warnUnsaved?: boolean | undefined
  /**
   * Called with the invalid fields, in document order, when a submit is
   * stopped. A schema issue no field answers for comes last, with `name` empty.
   */
  onInvalidSubmit?: ((fields: DilekceInvalidField[]) => void) | undefined
  /** In filled mode, each value gets a copy button. On by default. */
  copyable?: boolean | undefined
  /**
   * Check your answers: in filled mode, each field gets a "Change" button next
   * to Copy that calls this with the field. Switch to `edit` and focus
   * `element`. A field's own `edit` overrides it (`false` hides it).
   */
  onEdit?: ((field: DilekceEditField) => void) | undefined
  /**
   * What an empty field says in filled mode, in place of the dash: "Not
   * provided". Real text, so assistive technology reads it.
   */
  emptyText?: string | undefined
  /**
   * Any Standard Schema (Zod, Valibot, ArkType, …) run over the form's values
   * once the browser's constraints and the field's own `validate` pass: on
   * submit for every field, on blur and live for the one being edited. An
   * issue's `path` joined with "." names its field. Values are strings, so
   * numbers need the schema to coerce (`z.coerce.number()`).
   */
  schema?: S | undefined
  /**
   * Called when a submit goes through, after `onSubmit`, with the schema's
   * parsed output, or the form's values without a schema.
   */
  onValidSubmit?:
    | ((value: DilekceOutput<S>, event: React.FormEvent<HTMLFormElement>) => void)
    | undefined
  /**
   * Starting values by field name, written to the controls' DOM defaults, so a
   * reset restores them. Dotted names and nested objects and arrays both
   * work. Controlled controls (`value`, `checked`) keep their own. A new
   * object with other contents applies again and resets the form to it.
   */
  defaultValues?: DilekceDefaultValues | undefined
}

function Dilekce<S extends StandardSchemaV1 | undefined = undefined>({
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
  onEdit,
  emptyText,
  schema,
  onValidSubmit,
  defaultValues,
  className,
  children,
  onSubmit,
  onReset,
  onChange,
  onKeyDown,
  ref,
  ...props
}: DilekceProps<S>) {
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
    // On the document: a reset button may sit outside the form (`form="id"`).
    const onClick = (event: Event) => {
      const button = (event.target as Element).closest<HTMLButtonElement | HTMLInputElement>(
        "button[type=reset], input[type=reset]",
      )
      if (button?.form !== form) return
      resetButton.current = true
      setTimeout(() => (resetButton.current = false))
    }
    const doc = form.ownerDocument
    doc.addEventListener("click", onClick, true)
    return () => doc.removeEventListener("click", onClick, true)
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

  /*
   * Dirty: the values differ from a snapshot taken at mount, after a reset
   * and after each submit that went through.
   */
  const clean = React.useRef<string | null>(null)
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
    // Not before the form has taken its first snapshot, at mount.
    if (formRef.current && clean.current != null) {
      markDirty(snapshot(formRef.current) !== clean.current)
    }
  }, [markDirty])
  const settle = React.useCallback(() => {
    if (formRef.current) clean.current = snapshot(formRef.current)
    markDirty(false)
  }, [markDirty])

  /*
   * defaultValues: written to the controls' DOM defaults before paint (and
   * before the first snapshot of dirty), so the browser shows them and a reset
   * restores them. Fields that mount later apply them themselves. Another
   * object with other contents applies again and resets the form, like
   * react-hook-form's reset(values); an equal one, such as an inline literal
   * re-created on every render, changes nothing.
   */
  const flatDefaults = React.useMemo(() => flattenDefaults(defaultValues), [defaultValues])
  const defaultsRef = React.useRef(flatDefaults)
  React.useInsertionEffect(() => {
    defaultsRef.current = flatDefaults
  })
  const originals = React.useRef(new WeakMap<Element, () => void>())
  const appliedDefaults = React.useRef<string | null>(null)
  // Set while the form resets itself, so the app's own onReset isn't told.
  const selfReset = React.useRef(false)
  const applyDefaults = React.useCallback((root: ParentNode) => {
    applyDefaultValues(
      root.querySelectorAll("input, select, textarea"),
      defaultsRef.current,
      originals.current,
    )
  }, [])
  React.useLayoutEffect(() => {
    const form = formRef.current
    if (!form) return
    const signature = JSON.stringify([...flatDefaults])
    if (signature === appliedDefaults.current) return
    const first = appliedDefaults.current === null
    appliedDefaults.current = signature
    applyDefaultValues(form.elements, flatDefaults, originals.current)
    for (const field of fields.current) field.sync()
    if (first) return
    selfReset.current = true
    try {
      form.reset()
    } finally {
      selfReset.current = false
    }
  }, [flatDefaults])

  const defaultRows = React.useCallback((name: string) => countRows(defaultsRef.current, name), [])
  const editRef = React.useRef(onEdit)
  React.useInsertionEffect(() => {
    editRef.current = onEdit
  })
  const edit = React.useCallback((field: DilekceEditField) => editRef.current?.(field), [])
  const canEdit = onEdit != null

  React.useLayoutEffect(settle, [settle])

  // The one polite live region: a stopped submit says how many fields need
  // attention, for screen reader users who can't see the cells turn red.
  const [announcement, setAnnouncement] = React.useState("")

  // Messages fields raise on their own (on blur, live, "Checking…", "Copied") share
  // this one region. Those that land in the same moment are read as one sentence list.
  const queued = React.useRef<string[]>([])
  const flushing = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  React.useEffect(
    () => () => {
      clearTimeout(flushing.current)
      flushing.current = undefined
    },
    [],
  )
  const announce = React.useCallback((text: string) => {
    queued.current.push(text)
    if (flushing.current !== undefined) return
    flushing.current = setTimeout(() => {
      flushing.current = undefined
      const spoken = queued.current.join(". ")
      queued.current = []
      setAnnouncement((last) => (last === spoken ? `${spoken}\u200b` : spoken))
    })
  }, [])

  /*
   * The error summary: what a stopped submit found, kept in a store the
   * DilekceSummary reads. Fields report when one turns valid or changes its
   * message; schema issues no field answers for are the form-level lines.
   */
  const [summary] = React.useState(createSummaryStore)
  const clearSummary = React.useCallback(
    () =>
      summary.update((state) =>
        state.items.length === 0 && state.formLevel.length === 0
          ? state
          : { stopped: state.stopped, items: [], formLevel: [] },
      ),
    [summary],
  )
  const reportField = React.useCallback(
    (field: HTMLElement | null, message: string | null, label?: string) => {
      if (!field) return
      summary.update((state) => {
        const index = state.items.findIndex((item) => item.field === field)
        const item = state.items[index]
        if (!item) return state
        if (message === null) {
          return { ...state, items: state.items.filter((_, at) => at !== index) }
        }
        // The label can change under a line (a repeater renumbering its rows).
        const nextLabel = label ?? item.label
        const nextMessage = message === "" ? item.message : message
        if (nextMessage === item.message && nextLabel === item.label) return state
        return {
          ...state,
          items: state.items.map((it, at) =>
            at === index ? { ...it, message: nextMessage, label: nextLabel } : it,
          ),
        }
      })
    },
    [summary],
  )

  /*
   * The schema runs over the values built from the form. Issues are matched to
   * fields by name; those no enabled field answers for are form-level.
   */
  const merged = React.useMemo(() => ({ ...dilekceMessages.en, ...messages }), [messages])
  const checkFailed = merged.checkFailed ?? dilekceMessages.en.checkFailed
  const schemaRef = React.useRef(schema)
  React.useInsertionEffect(() => {
    schemaRef.current = schema
  })
  // Only the newest run may refresh the summary's form-level lines.
  const schemaRun = React.useRef(0)
  const unclaimed = React.useCallback(
    (outcome: SchemaOutcome) => {
      const claimed = new Set<string>()
      for (const field of fields.current) for (const name of field.names()) claimed.add(name)
      const lines = outcome.issues
        .filter((issue) => !claimed.has(issue.key))
        .map((issue) => issue.message)
      return outcome.failed ? [...lines, checkFailed] : lines
    },
    [checkFailed],
  )
  const runSchema = React.useCallback((): SchemaRun => {
    const standard = schemaRef.current?.["~standard"]
    const form = formRef.current
    if (!standard || !form) return null
    const values = readValues(form)
    const token = ++schemaRun.current
    // A schema that throws or rejects can't vouch for the values: nothing is
    // submitted, as `onValidSubmit` promises the parsed output. The form says so
    // and stays usable for another try.
    const unchecked: SchemaOutcome = {
      value: undefined,
      issues: [],
      failed: true,
      messages: new Map(),
    }
    const outcomeOf = (result: StandardSchemaV1.Result<unknown>): SchemaOutcome => {
      // `issues: []` is a success too, though the spec leaves it out.
      if (!result.issues?.length) {
        const { value } = result as StandardSchemaV1.SuccessResult<unknown>
        return { value, issues: [], messages: new Map() }
      }
      const issues = result.issues.map((issue) => ({
        key: pathKey(issue.path),
        message: issue.message,
      }))
      const messages = new Map<string, string>()
      for (const { key, message } of issues) if (!messages.has(key)) messages.set(key, message)
      return { value: undefined, issues, messages }
    }
    const refresh = (outcome: SchemaOutcome) => {
      if (token === schemaRun.current) {
        const formLevel = unclaimed(outcome)
        summary.update((state) =>
          (state.items.length === 0 && state.formLevel.length === 0) ||
          (state.formLevel.length === formLevel.length &&
            state.formLevel.every((message, at) => message === formLevel[at]))
            ? state
            : { ...state, formLevel },
        )
      }
      return outcome
    }
    let result: ReturnType<typeof standard.validate>
    try {
      result = standard.validate(values)
    } catch {
      return refresh(unchecked)
    }
    if (!isThenable<StandardSchemaV1.Result<unknown>>(result)) return refresh(outcomeOf(result))
    return Promise.resolve(result).then(
      (resolved) => refresh(outcomeOf(resolved)),
      () => refresh(unchecked),
    )
  }, [summary, unclaimed])

  const context = React.useMemo<FormContextValue>(
    () => ({
      mode,
      messages: merged,
      errors,
      clearError,
      register,
      measure,
      copyable,
      announce,
      runSchema,
      reportField,
      applyDefaults,
      defaultRows,
      canEdit,
      edit,
      emptyText,
      summary,
    }),
    [
      mode,
      merged,
      errors,
      clearError,
      register,
      measure,
      copyable,
      announce,
      runSchema,
      reportField,
      applyDefaults,
      defaultRows,
      canEdit,
      edit,
      emptyText,
      summary,
    ],
  )

  React.useEffect(() => {
    if (!warnUnsaved) return
    const warn = (event: BeforeUnloadEvent) => {
      // Values written from code raise no event: look once more, now that it matters.
      measure()
      if (!dirtyRef.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [warnUnsaved, measure])

  /*
   * Values written from code (`input.value = …`, a form library's setValue)
   * raise no event, so dirty is also re-read whenever focus moves in or out
   * of the form: the moment someone is about to see or act on it.
   */
  React.useEffect(() => {
    const form = formRef.current
    if (!form) return
    form.addEventListener("focusin", measure)
    form.addEventListener("focusout", measure)
    return () => {
      form.removeEventListener("focusin", measure)
      form.removeEventListener("focusout", measure)
    }
  }, [measure])

  const [checking, setChecking] = React.useState(false)
  // The second pass of an async check: already validated, with the schema's outcome.
  const approved = React.useRef<{ outcome: SchemaOutcome | null } | null>(null)
  // The values the running check was started with: edits made meanwhile get checked again.
  const checkingRef = React.useRef<string | null>(null)
  // Each submit takes a number; only the newest check may go on to replay or fail.
  const submitRun = React.useRef(0)
  const alive = React.useRef(false)
  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // A schema that found issues or couldn't run stops the submit.
  const stops = (outcome: SchemaOutcome | null) =>
    outcome != null && (outcome.failed === true || outcome.issues.length > 0)

  const fail = (found: Failure[], outcome: SchemaOutcome | null) => {
    // A rule that couldn't run isn't a line of its own: the form says it couldn't check.
    const failures = found.filter((failure) => !failure.broken)
    failures.sort((a, b) => inDocumentOrder(a.control, b.control))
    let formLevel = outcome ? unclaimed(outcome) : []
    const unchecked = found.some((failure) => failure.broken) || outcome?.failed === true
    if (unchecked && !formLevel.includes(checkFailed)) formLevel = [...formLevel, checkFailed]
    // Issues all addressed to fields that showed nothing: still say something.
    if (outcome && failures.length === 0 && formLevel.length === 0) {
      formLevel = outcome.issues.map((issue) => issue.message)
    }
    summary.update((state) => ({
      stopped: state.stopped + 1,
      items: failures.map(({ field, control, label, message }) => ({
        field,
        control,
        label,
        message,
      })),
      formLevel,
    }))
    // With a summary, it takes focus; without one, the first invalid field does.
    if (!summary.hasSummary()) failures[0]?.control.focus()
    const count = failures.length + formLevel.length - (unchecked ? 1 : 0)
    const counted =
      count === 1 ? merged.invalidOne : merged.invalidMany?.replace("{count}", String(count))
    const text = [unchecked && checkFailed, count > 0 && counted].filter(Boolean).join(". ")
    // A trailing zero-width space toggles, so a repeat of the same text is read again.
    setAnnouncement((last) => (last === text ? `${text}\u200b` : (text ?? "")))
    const form = formRef.current
    onInvalidSubmit?.([
      ...failures.map(({ control, label, message }) => ({
        name: control.getAttribute("name") ?? control.id,
        label,
        message,
        element: control,
      })),
      ...(form
        ? formLevel.map((message) => ({ name: "", label: "", message, element: form }))
        : []),
    ])
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
          "group/dilekce @container/dilekce flex flex-col gap-px overflow-clip rounded-lg border bg-border text-foreground [--dk-ink:var(--primary)] forced-colors:gap-0 dark:[color-scheme:dark]",
          "print:rounded-none print:[print-color-adjust:exact]",
          DENSITY,
          className,
        )}
        onSubmit={(event) => {
          const finish = (outcome: SchemaOutcome | null) => {
            onSubmit?.(event)
            onValidSubmit?.(
              (outcome ? outcome.value : readValues(event.currentTarget)) as DilekceOutput<S>,
              event,
            )
            clearSummary()
            settle()
          }
          // The second pass of an async check: already validated.
          if (approved.current) {
            const { outcome } = approved.current
            approved.current = null
            finish(outcome)
            return
          }

          // A check still running is superseded: its result is ignored.
          const token = ++submitRun.current
          if (checkingRef.current != null) {
            checkingRef.current = null
            setChecking(false)
          }

          // The schema runs once; every field takes its own issues from that run.
          // Every field shows its message at once; focus goes to the first.
          const outcome = runSchema()
          const results = [...fields.current].map((field) => field.validate(outcome))
          if (!results.some(isThenable) && !isThenable(outcome)) {
            const invalid = results.filter((failure): failure is Failure => failure != null)
            if (invalid.length > 0 || stops(outcome)) {
              event.preventDefault()
              fail(invalid, outcome)
              return
            }
            finish(outcome)
            return
          }

          // Some check is async: hold the submit, then replay it once they pass.
          event.preventDefault()
          const form = event.currentTarget
          const submitter = (event.nativeEvent as SubmitEvent).submitter
          const held = fingerprint(form)
          checkingRef.current = held
          setChecking(true)
          void Promise.all([Promise.all(results), outcome]).then(([failures, resolved]) => {
            if (token !== submitRun.current || !alive.current) return
            checkingRef.current = null
            setChecking(false)
            const invalid = failures.filter((failure): failure is Failure => failure != null)
            if (invalid.length > 0 || stops(resolved)) {
              fail(invalid, resolved)
              return
            }
            // Edited while it ran: the replay validates the new values from the start.
            approved.current = fingerprint(form) === held ? { outcome: resolved } : null
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
          // A schema run still going must not bring the summary back.
          schemaRun.current++
          clearSummary()
          if (!selfReset.current) onReset?.(event)
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
  legend?: React.ReactNode | undefined
  legendClassName?: string | undefined
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
      className={cn("m-0 flex min-w-0 flex-col gap-px border-0 p-0 forced-colors:gap-0", className)}
      {...props}
    >
      {legend != null && (
        // Floated, a <legend> stops being drawn in the border and fills the row.
        <legend
          data-slot="dilekce-legend"
          className={cn(
            "float-left w-full bg-muted forced-colors:border forced-colors:border-[CanvasText] px-(--dk-px) py-[calc(var(--dk-py)*0.9)] font-mono text-(length:--dk-label) font-semibold tracking-[0.08em] text-foreground uppercase",
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
      className={cn(
        "flex flex-wrap gap-px forced-colors:gap-0 print:break-inside-avoid",
        className,
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*                                  Repeater                                  */
/* -------------------------------------------------------------------------- */

/** What a row of a `DilekceRepeat` is given. */
export interface DilekceRepeatRow {
  /** Where the row is now: 0 for the first. It changes when an earlier row is removed. */
  index: number
  /** Stable for the row's life, whatever its index: a React key for your own lists. */
  key: string
  /** A control's name in this row: `passengers.<index>.<field>`. */
  name: (field: string) => string
  /** Removes this row (not below `min`). */
  remove: () => void
}

interface RepeatRowContextValue {
  index: number
  remove: () => void
  canRemove: boolean
}

const RepeatRowContext = React.createContext<RepeatRowContextValue | null>(null)

export interface DilekceRepeatProps extends Omit<
  React.ComponentProps<"div">,
  "children" | "defaultValue"
> {
  /** The list's name: its rows' controls are named `<name>.<index>.<field>`, so values nest. */
  name: string
  /** Fewest rows; Remove is disabled at it. Default 0. */
  min?: number | undefined
  /** Most rows; the add button goes away at it. Default unlimited. */
  max?: number | undefined
  /**
   * Rows at the start and after a reset. Default: the rows `defaultValues`
   * holds for `name`, else `max(min, 1)`.
   */
  defaultCount?: number | undefined
  /** The add button's text; the `add` message by default. */
  addLabel?: React.ReactNode | undefined
  /** Renders one row: `row.name("field")` names its controls. */
  children: (row: DilekceRepeatRow) => React.ReactNode
  /** Called with the new count when a row is added or removed, and when a reset changes it. */
  onRowsChange?: ((count: number) => void) | undefined
}

const rangeOf = (count: number) => Array.from({ length: count }, (_, index) => index)

/**
 * "Add another", like GOV.UK's pattern: rows of fields with an add button and
 * a remove button per row. Rows keep a stable key, but their names are by
 * position, so after removing the first row the second is `name.0.*` and keeps
 * what was typed in it. Adding focuses the new row's first control and removing
 * the same position's (else the previous row's, else the add button); both are
 * announced. A form reset brings back the default rows.
 */
function DilekceRepeat({
  name,
  min = 0,
  max = Infinity,
  defaultCount,
  addLabel,
  children,
  onRowsChange,
  className,
  ref,
  ...props
}: DilekceRepeatProps) {
  const form = useForm()
  const rootRef = React.useRef<HTMLDivElement>(null)
  const mergedRef = useMergedRef(rootRef, ref)
  const messages = form?.messages ?? dilekceMessages.en

  const startCount = () =>
    Math.min(max, Math.max(min, defaultCount ?? form?.defaultRows(name) ?? Math.max(min, 1)))
  const latest = React.useRef({ startCount, onRowsChange, max, min })
  React.useInsertionEffect(() => {
    latest.current = { startCount, onRowsChange, max, min }
  })

  // The rows' keys, in order: never an index, so a row keeps its DOM when an earlier one goes.
  const [keys, setKeys] = React.useState(() => rangeOf(startCount()))
  const keysRef = React.useRef(keys)
  const nextKey = React.useRef(keys.length)
  // The keys the form started with: a reset that finds them untouched leaves the rows alone.
  const pristine = React.useRef(keys)
  const commit = (next: number[]) => {
    keysRef.current = next
    setKeys(next)
  }

  // What the user just did, for the focus and the announcement once the rows have rendered.
  const action = React.useRef<{ type: "add" | "remove"; index: number } | null>(null)
  const add = () => {
    const current = keysRef.current
    if (current.length >= max) return
    action.current = { type: "add", index: current.length }
    commit([...current, nextKey.current++])
  }
  const removeAt = (key: number) => {
    const current = keysRef.current
    const index = current.indexOf(key)
    if (index < 0 || current.length <= min) return
    action.current = { type: "remove", index }
    commit(current.filter((_, at) => at !== index))
  }

  const announce = form?.announce
  const measure = form?.measure
  React.useLayoutEffect(() => {
    // Rows came or went: dirty follows.
    measure?.()
    const done = action.current
    action.current = null
    const root = rootRef.current
    if (!done || !root) return
    const rows = root.querySelectorAll<HTMLElement>(":scope > [data-slot=dilekce-repeat-row]")
    const focusRow = (row: HTMLElement | undefined) => {
      const control = [...(row?.querySelectorAll<HTMLElement>(CONTROL) ?? [])].find(
        (el) => !isDisabled(el),
      )
      control?.focus()
      return control != null
    }
    if (done.type === "add") {
      focusRow(rows[done.index])
    } else if (!focusRow(rows[Math.min(done.index, rows.length - 1)])) {
      root.querySelector<HTMLElement>("[data-slot=dilekce-repeat-add] button")?.focus()
    }
    const text = done.type === "add" ? messages.rowAdded : messages.rowRemoved
    announce?.((text ?? "").replace("{index}", String(done.index + 1)))
    // Only the rows changing is a reason to run again.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [keys])

  const count = keys.length
  const reported = React.useRef(count)
  React.useEffect(() => {
    if (reported.current === count) return
    reported.current = count
    latest.current.onRowsChange?.(count)
  }, [count])

  // A reset puts the default rows back. Rows left as they started stay as they are.
  React.useEffect(() => {
    const element = rootRef.current?.closest("form")
    if (!element) return
    const onReset = () => {
      const wanted = latest.current.startCount()
      const current = keysRef.current
      if (current.length === wanted && current.every((key, at) => key === pristine.current[at])) {
        return
      }
      const fresh = rangeOf(wanted).map(() => nextKey.current++)
      pristine.current = fresh
      commit(fresh)
    }
    element.addEventListener("reset", onReset)
    return () => element.removeEventListener("reset", onReset)
  }, [])

  return (
    <div
      ref={mergedRef}
      data-slot="dilekce-repeat"
      data-name={name}
      data-count={count}
      className={cn("flex flex-col gap-px forced-colors:gap-0", className)}
      {...props}
    >
      {keys.map((key, index) => (
        <RepeatRowContext.Provider
          key={key}
          value={{ index, remove: () => removeAt(key), canRemove: count > min }}
        >
          <div
            data-slot="dilekce-repeat-row"
            data-index={index}
            // Only the rows the form started (or was reset) with take `defaultValues`.
            data-initial={pristine.current.includes(key) ? "" : undefined}
            className="contents"
          >
            {children({
              index,
              key: String(key),
              name: (field) => `${name}.${index}.${field}`,
              remove: () => removeAt(key),
            })}
          </div>
        </RepeatRowContext.Provider>
      ))}
      {count < max && (
        <div
          data-slot="dilekce-repeat-add"
          className="flex bg-muted px-(--dk-px) py-(--dk-py) group-data-[mode=filled]/dilekce:hidden forced-colors:border forced-colors:border-[CanvasText] print:hidden"
        >
          <button
            type="button"
            onClick={add}
            className="inline-flex min-h-6 cursor-pointer items-center gap-1.5 rounded-sm px-1 font-mono text-(length:--dk-label) leading-[1.3] font-medium tracking-[0.06em] text-foreground uppercase [--dk-focus:var(--primary)] hover:bg-foreground/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--dk-focus)"
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
              <path d="M5 1v8M1 5h8" />
            </svg>
            {addLabel ?? messages.add}
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * The remove cell of a repeater's row: a narrow cell with a button named
 * "Remove row N". Put it last in the `DilekceRow`. Disabled at the repeater's
 * `min`; not shown in filled mode or print.
 */
function DilekceRepeatRemove({ className, ref, ...props }: React.ComponentProps<"div">) {
  const row = React.useContext(RepeatRowContext)
  const messages = useForm()?.messages ?? dilekceMessages.en
  const cellRef = React.useRef<HTMLDivElement>(null)
  const mergedRef = useMergedRef(cellRef, ref)
  const present = row != null

  // The cell is as wide as its button. When the row wraps it onto a line of its
  // own, it grows to fill that line, so no gap of grid color is left beside it.
  // Whether it wrapped is read from the layout, as CSS can't ask.
  React.useLayoutEffect(() => {
    const cell = cellRef.current
    const line = cell?.parentElement
    if (!cell || !line) return
    const read = () => {
      const before = cell.previousElementSibling
      const alone =
        before != null && cell.getBoundingClientRect().top > before.getBoundingClientRect().top + 1
      cell.toggleAttribute("data-alone", alone)
    }
    read()
    const observer = new ResizeObserver(read)
    observer.observe(line)
    observer.observe(cell)
    return () => observer.disconnect()
  }, [present])

  if (!row) return null
  return (
    <div
      ref={mergedRef}
      data-slot="dilekce-repeat-remove"
      className={cn(
        "flex flex-none items-end bg-background px-(--dk-px) py-(--dk-py) group-data-[mode=filled]/dilekce:hidden forced-colors:border forced-colors:border-[CanvasText] data-alone:grow print:hidden",
        className,
      )}
      {...props}
    >
      <button
        type="button"
        data-slot="dilekce-repeat-remove-button"
        disabled={!row.canRemove}
        // The visible word stays inside the name, so voice control can say it.
        aria-label={(messages.removeRow ?? "").replace("{index}", String(row.index + 1))}
        onClick={row.remove}
        className="inline-flex min-h-6 min-w-6 cursor-pointer items-center justify-center gap-1 rounded-sm px-1 font-mono text-(length:--dk-label) leading-[1.3] tracking-[0.02em] text-muted-foreground uppercase [--dk-focus:var(--primary)] hover:bg-foreground/8 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--dk-focus) disabled:cursor-not-allowed disabled:opacity-55"
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
          <path d="m2 2 6 6M8 2 2 8" />
        </svg>
        {messages.remove}
      </button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   Summary                                  */
/* -------------------------------------------------------------------------- */

export interface DilekceSummaryProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** The heading; the `summaryTitle` message by default. */
  title?: React.ReactNode | undefined
}

const noSubscribe = () => () => {}

/**
 * An error summary, like GOV.UK's: once a submit is stopped, a heading and a
 * link to each invalid field ("Label: message") that focuses the control.
 * Focus moves here, instead of to the first field. Lines go as their fields
 * turn valid, and the whole summary hides when none is left or the form
 * resets. Put it anywhere in the form, usually first.
 */
function DilekceSummary({ title, className, ref, ...props }: DilekceSummaryProps) {
  const form = useForm()
  const store = form?.summary
  const state = React.useSyncExternalStore(
    store?.subscribe ?? noSubscribe,
    () => store?.get() ?? NO_SUMMARY,
    () => NO_SUMMARY,
  )
  const titleId = React.useId()
  const rootRef = React.useRef<HTMLDivElement>(null)
  const mergedRef = useMergedRef(rootRef, ref)

  // With a summary in the form, a stopped submit focuses it, not the first field.
  React.useLayoutEffect(() => {
    if (!store) return
    return store.attach()
  }, [store])
  const seen = React.useRef(state.stopped)
  React.useLayoutEffect(() => {
    if (state.stopped === seen.current) return
    seen.current = state.stopped
    rootRef.current?.focus()
  }, [state.stopped])

  if (!form || (state.items.length === 0 && state.formLevel.length === 0)) return null
  return (
    <div
      ref={mergedRef}
      data-slot="dilekce-summary"
      // Focused by script, like GOV.UK's; not role=alert, which would read it twice.
      // A group, so that the name from the heading is valid on it.
      role="group"
      tabIndex={-1}
      aria-labelledby={titleId}
      className={cn(
        "w-full min-w-0 border-l-4 border-destructive bg-[color-mix(in_oklch,var(--destructive)_5%,var(--background))] px-(--dk-px) py-(--dk-py) [--dk-danger:color-mix(in_oklch,var(--destructive)_85%,var(--foreground))] [--dk-focus:var(--destructive)]",
        "focus:outline-3 focus:-outline-offset-3 focus:outline-solid focus:outline-(--dk-focus)",
        "forced-colors:border forced-colors:border-l-4 forced-colors:border-[CanvasText] forced-colors:focus:outline-[Highlight]",
        "group-data-[mode=filled]/dilekce:hidden print:hidden",
        className,
      )}
      {...props}
    >
      <h2
        id={titleId}
        data-slot="dilekce-summary-title"
        className="m-0 text-(length:--dk-text) leading-snug font-semibold text-(--dk-danger)"
      >
        {title ?? form.messages.summaryTitle}
      </h2>
      <ul
        data-slot="dilekce-summary-list"
        className="m-0 mt-(--dk-gap) flex list-none flex-col gap-1 p-0"
      >
        {state.items.map((item, index) => (
          <li key={item.control.id || index} data-slot="dilekce-summary-item">
            <a
              data-slot="dilekce-summary-link"
              href={item.control.id ? `#${item.control.id}` : "#"}
              className="rounded-sm text-(length:--dk-text) leading-snug font-medium text-(--dk-danger) underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-(--dk-focus)"
              onClick={(event) => {
                // Focus the control itself: the hash alone would only scroll.
                event.preventDefault()
                item.field.scrollIntoView({ block: "center" })
                item.control.focus({ preventScroll: true })
              }}
            >
              {[item.label, item.message].filter(Boolean).join(": ")}
            </a>
          </li>
        ))}
        {state.formLevel.map((message, index) => (
          <li
            key={`form-${index}`}
            data-slot="dilekce-summary-item"
            className="text-(length:--dk-text) leading-snug font-medium text-(--dk-danger)"
          >
            {message}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                    Field                                   */
/* -------------------------------------------------------------------------- */

const FIELD = [
  "group/field relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] content-start gap-x-2 gap-y-(--dk-gap) bg-background px-(--dk-px) py-(--dk-py) cursor-text transition-[background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
  "[grid-template-areas:'label_error'_'control_control'_'description_description']",
  "data-below:[grid-template-areas:'label_label'_'control_control'_'error_error'_'description_description']",
  // The tint alone is too faint for a focus indicator (WCAG 1.4.11), so a 2px
  // line in the focus color carries it.
  "[--dk-focus:var(--primary)] data-invalid:[--dk-focus:var(--destructive)]",
  // Tints are mixed against --background, never translucent: a translucent tint
  // lets the grid color show through and drops the small text on it under 4.5:1.
  // The danger color for text is pulled toward the foreground for the same reason.
  "data-invalid:[--dk-danger:color-mix(in_oklch,var(--destructive)_85%,var(--foreground))]",
  "hover:bg-[color-mix(in_oklch,var(--accent)_50%,var(--background))] focus-within:bg-accent focus-within:shadow-[inset_0_-2px_0_var(--dk-focus)]",
  "group-data-[focus=ring]/dilekce:focus-within:shadow-[inset_0_0_0_2px_var(--dk-focus)]",
  // The cell's own background as a token, for the fade behind the filled-mode actions.
  "[--dk-cell:var(--background)] data-invalid:[--dk-cell:color-mix(in_oklch,var(--destructive)_5%,var(--background))]",
  "data-invalid:bg-[color-mix(in_oklch,var(--destructive)_5%,var(--background))] data-invalid:hover:bg-[color-mix(in_oklch,var(--destructive)_8%,var(--background))] data-invalid:focus-within:bg-[color-mix(in_oklch,var(--destructive)_10%,var(--background))]",
  "has-[select]:cursor-default has-[:is(input,select,textarea):disabled]:cursor-not-allowed has-[:is(input,select,textarea):disabled]:opacity-55",
  // Radios and checkboxes never wrap inside a cell: the cell refuses to shrink
  // below them, so the row wraps the whole cell. Narrow, they stack instead.
  "has-[[data-slot=dilekce-choices]]:min-w-max @max-[30rem]/dilekce:has-[[data-slot=dilekce-choices]]:min-w-0",
  // Filled: a completed document. No chrome, and a dash where nothing was given.
  "group-data-[mode=filled]/dilekce:cursor-default group-data-[mode=filled]/dilekce:hover:bg-background group-data-[mode=filled]/dilekce:focus-within:bg-background group-data-[mode=filled]/dilekce:focus-within:shadow-none",
  "group-data-[mode=filled]/dilekce:has-focus-visible:shadow-[inset_0_0_0_2px_var(--dk-focus)]",
  "after:pointer-events-none after:self-start after:text-(length:--dk-text) after:leading-[1.4] after:text-muted-foreground after:[grid-area:control]",
  "group-data-[mode=filled]/dilekce:has-[:placeholder-shown]:after:content-['—'] group-data-[mode=filled]/dilekce:has-data-empty:after:content-['—']",
  // Forced colors (Windows High Contrast) strips backgrounds and shadows: the grid
  // lines, drawn as background showing through the gaps, become real borders, and
  // the focus indicator becomes an outline in a system color.
  "forced-colors:border forced-colors:border-[CanvasText] forced-colors:focus-within:outline-3 forced-colors:focus-within:-outline-offset-3 forced-colors:focus-within:[outline-color:Highlight] forced-colors:focus-within:outline-solid",
  "print:break-inside-avoid print:shadow-none!",
]

export interface DilekceFieldProps extends Omit<React.ComponentProps<"div">, "children"> {
  label: React.ReactNode
  /** Passed to the control when it has no name of its own. */
  name?: string | undefined
  /** Relative width within the row. Also sets how early the cell wraps. */
  span?: number | undefined
  description?: React.ReactNode | undefined
  /**
   * A message from outside the browser's own validation, such as
   * react-hook-form. While set, the field is invalid and shows it.
   */
  error?: React.ReactNode | undefined
  /** Override the short messages for this field alone. */
  messages?: DilekceMessages | undefined
  /**
   * A rule of your own, run after the browser's constraints pass: on leaving
   * the field after an edit, live once a message shows, and on submit.
   */
  validate?: DilekceValidator | undefined
  /**
   * The "Change" action in filled mode (check your answers): a string is a
   * link's `href`, a function a button's handler, `false` hides it. Without
   * this, the form's `onEdit` decides.
   */
  edit?: string | (() => void) | false | undefined
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
  edit,
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
  const changeable = readOnly && edit !== false && (edit != null || form?.canEdit === true)
  const emptyText = readOnly ? form?.emptyText : undefined

  const all = React.useMemo(
    () => ({ ...(form?.messages ?? dilekceMessages.en), ...messages }),
    [form?.messages, messages],
  )

  // Latest values for the handle and checks, which run outside a render. An
  // insertion effect runs before every layout effect, so a control's `sync`
  // (a layout effect of the child) already sees this render's rule.
  const latest = React.useRef({ external, all, validate, native, name })
  React.useInsertionEffect(() => {
    latest.current = { external, all, validate, native, name }
  })
  React.useLayoutEffect(() => {
    setControlName(controlOf(fieldRef.current)?.name || undefined)
  }, [children, name])

  /*
   * Constraint validation first, then the field's own rule. An async rule
   * shows `pending` and only the newest run may set the message.
   */
  const run = React.useRef(0)
  // What the newest check came to (or will): a superseded run answers with this.
  const newest = React.useRef<string | null | Promise<string | null>>(null)
  // Aborts the validator call in flight.
  const controller = React.useRef<AbortController | null>(null)
  const cancel = React.useCallback(() => {
    controller.current?.abort()
    controller.current = null
  }, [])
  // The newest check's rule threw or rejected: the field can't vouch for its value.
  const broken = React.useRef(false)
  // The value the message on show was last worked out for.
  const checked = React.useRef("")
  // Said last through the live region, so a message that stays the same isn't repeated.
  const spoken = React.useRef<string | null>(null)
  /**
   * `quiet` is a submit: the form announces how many fields need attention and
   * focus lands on the first, so the messages themselves aren't read out.
   * `schemaRun` is the submit's one run of the form's schema; a check of the
   * field alone starts its own.
   */
  const runSchema = form?.runSchema
  const check = React.useCallback(
    (quiet = false, schemaRun?: SchemaRun): string | null | Promise<string | null> => {
      const field = fieldRef.current
      if (!field) return null
      const { all, validate } = latest.current
      const token = ++run.current
      broken.current = false
      // A newer check cancels the one still running.
      cancel()
      checked.current = JSON.stringify(valueOf(field))
      if (allDisabled(field)) {
        setPending(false)
        setNative(null)
        return (newest.current = null)
      }
      const show = (message: string | null) => {
        if (quiet) spoken.current = message
        setPending(false)
        setNative(message)
        return message
      }
      const found = readValidity(field, all)
      if (found) return (newest.current = show(found))

      const asMessage = (result: ValidatorResult) =>
        typeof result === "string" && result !== "" ? result : null
      // The last stage: the schema's issues for this field, once nothing earlier objected.
      const bySchema = (own: string | null): string | null | Promise<string | null> => {
        if (own) return show(own)
        const outcome = schemaRun === undefined ? runSchema?.() : schemaRun
        if (!outcome) return show(null)
        const take = (done: SchemaOutcome) => {
          const names = [latest.current.name, controlOf(field)?.name]
          const key = names.find((n) => n != null && done.messages.has(n))
          return show(key == null ? null : (done.messages.get(key) ?? null))
        }
        if (!isThenable<SchemaOutcome>(outcome)) return take(outcome)
        // A submit shows "checking" on the form; a field checked alone shows it itself.
        if (schemaRun === undefined) setPending(true)
        return Promise.resolve(outcome).then((done) =>
          token !== run.current ? newest.current : take(done),
        )
      }

      if (!validate) return (newest.current = bySchema(null))
      const data = new FormData(field.closest("form") ?? undefined)
      const value = valueOf(field)
      const abort = new AbortController()
      controller.current = abort
      let result: ValidatorResult | Promise<ValidatorResult>
      try {
        result = validate(value, data, { signal: abort.signal })
      } catch {
        // A rule that throws can't vouch for the value: the submit stops.
        broken.current = true
        return (newest.current = show(null))
      }
      if (!isThenable<ValidatorResult>(result))
        return (newest.current = bySchema(asMessage(result)))
      setPending(true)
      // A superseded run answers with the newest outcome, never its own stale message.
      return (newest.current = Promise.resolve(result).then(
        (resolved) => (token !== run.current ? newest.current : bySchema(asMessage(resolved))),
        () => {
          // A rule that rejects can't vouch for the value: the submit stops.
          if (token !== run.current) return newest.current
          broken.current = true
          setPending(false)
          return null
        },
      ))
    },
    [cancel, runSchema],
  )

  const readCount = React.useCallback(() => {
    const control = controlOf(fieldRef.current)
    const max = control?.maxLength ?? -1
    const next = control && max > 0 ? { length: control.value.length, max } : null
    setCount((last) => (last?.length === next?.length && last?.max === next?.max ? last : next))
  }, [])
  React.useLayoutEffect(readCount, [readCount])

  /*
   * A control's value changed without an event of its own (a controlled value
   * set from code): the counter, the form's dirty state and a message on show
   * follow it.
   */
  const measure = form?.measure
  const sync = React.useCallback(() => {
    const field = fieldRef.current
    if (!field) return
    readCount()
    measure?.()
    if (latest.current.native && JSON.stringify(valueOf(field)) !== checked.current) void check()
  }, [check, readCount, measure])

  React.useEffect(() => {
    if (!form) return
    return form.register({
      validate: (schemaRun) => {
        const field = fieldRef.current
        if (!field) return null
        const result = check(true, schemaRun)
        if (allDisabled(field)) return null
        const blocked = (message: string | null): Failure | null => {
          const { external } = latest.current
          const control = controlOf(field)
          if (control && broken.current && !(hasContent(external) || message)) {
            return { control, field, label: "", message: "", broken: true }
          }
          if (!control || !(hasContent(external) || message)) return null
          // The message on show: the app's own wins over the field's.
          const shown = hasContent(external) ? external : message
          return {
            control,
            field,
            label: labelRef.current?.textContent?.trim() ?? "",
            message:
              typeof shown === "string"
                ? shown
                : (errorRef.current?.textContent?.trim() ?? String(shown ?? "")),
          }
        }
        return isThenable<string | null>(result)
          ? Promise.resolve(result).then(blocked)
          : blocked(result)
      },
      reset: () => {
        run.current++
        cancel()
        newest.current = null
        setNative(null)
        setPending(false)
        setDirty(false)
        // The browser restores values after the reset event.
        setTimeout(readCount)
      },
      sync: readCount,
      names: () => {
        const field = fieldRef.current
        if (!field || allDisabled(field)) return []
        return [latest.current.name, controlOf(field)?.name].filter((n): n is string => !!n)
      },
    })
  }, [form, check, cancel, readCount])

  // A field that mounts after the form took its values picks up its defaults.
  const applyDefaults = form?.applyDefaults
  React.useLayoutEffect(() => {
    if (!fieldRef.current) return
    applyDefaults?.(fieldRef.current)
    readCount()
  }, [applyDefaults, readCount])

  // Gone: nothing the running check says may touch the field, and its rule is told to stop.
  React.useEffect(
    () => () => {
      run.current++
      newest.current = null
      cancel()
    },
    [cancel],
  )

  /*
   * The error summary follows the field: a message that changes updates its
   * line, a field that turns valid (or goes away) takes it off.
   */
  const reportField = form?.reportField
  // After every render: the label can change on its own (a repeater renumbering
  // its rows), and the summary line follows it.
  React.useLayoutEffect(() => {
    const shown = invalid
      ? typeof message === "string"
        ? message
        : (errorRef.current?.textContent?.trim() ?? "")
      : null
    reportField?.(fieldRef.current, shown, labelRef.current?.textContent?.trim() ?? "")
  })
  React.useLayoutEffect(() => {
    const field = fieldRef.current
    return () => reportField?.(field, null)
  }, [reportField])

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
    const check = () => setBelow(overflows(field, node, text, labelRef.current))
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
  const changeId = `${id}-change`
  const describedBy =
    [description != null && descriptionId, invalid && errorId].filter(Boolean).join(" ") ||
    undefined
  const near = count != null && count.length >= count.max * 0.9

  /*
   * Messages reach screen readers through the form's one live region: the
   * label and the message, when the message appears or changes, never again
   * while it stays the same (live validation re-sets it on every keystroke).
   */
  const announce = form?.announce
  const labelOf = () => labelRef.current?.textContent?.trim() ?? ""
  React.useEffect(() => {
    const shown = invalid
      ? typeof message === "string"
        ? message
        : (errorRef.current?.textContent?.trim() ?? "")
      : pending
        ? (all.pending ?? "")
        : null
    if (!shown) {
      spoken.current = null
      return
    }
    if (shown === spoken.current) return
    spoken.current = shown
    announce?.(`${labelOf()}: ${shown}`)
  })

  const context = React.useMemo<FieldContextValue>(
    () => ({
      id,
      labelId,
      name,
      invalid,
      describedBy,
      readOnly,
      messages: all,
      labelRef,
      setGroup,
      sync,
    }),
    [id, labelId, name, invalid, describedBy, readOnly, all, sync],
  )

  const labelClass = cn(
    "min-w-0 cursor-[inherit] overflow-hidden font-mono text-(length:--dk-label) leading-[1.3] font-medium tracking-[0.06em] text-ellipsis whitespace-nowrap text-muted-foreground uppercase select-none [grid-area:label]",
    "group-focus-within/field:text-foreground group-data-invalid/field:text-(--dk-danger)",
    // Visual only: assistive tech already announces "required".
    "after:text-primary group-has-required/field:after:content-['_*'_/_''] group-has-data-required/field:after:content-['_*'_/_''] group-data-invalid/field:after:text-(--dk-danger) group-data-[mode=filled]/dilekce:after:content-none!",
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
        className={cn(
          FIELD,
          // The empty text stands in for the dash.
          emptyText != null && "group-data-[mode=filled]/dilekce:after:content-none!",
          className,
        )}
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
            className="font-mono text-(length:--dk-label) leading-[1.3] font-medium tracking-[0.02em] whitespace-nowrap text-(--dk-danger) [grid-area:error] group-data-below/field:text-pretty group-data-below/field:whitespace-normal group-data-below/field:[overflow-wrap:anywhere]"
          >
            {message}
          </span>
        )}
        {!invalid && pending && (
          <span
            data-slot="dilekce-pending"
            className="animate-pulse motion-reduce:animate-none font-mono text-(length:--dk-label) leading-[1.3] font-medium tracking-[0.02em] whitespace-nowrap text-muted-foreground [grid-area:error]"
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
            className="hidden font-mono text-(length:--dk-label) leading-[1.3] tracking-[0.02em] whitespace-nowrap text-muted-foreground tabular-nums [grid-area:error] group-focus-within/field:inline group-focus-within/field:text-[color-mix(in_oklch,var(--muted-foreground)_70%,var(--foreground))] data-near:inline data-near:text-foreground"
          >
            {count.length}/{count.max}
          </span>
        )}
        {children}
        {emptyText != null && (
          // Real text, so it is read: shown only where the dash would be.
          <span
            data-slot="dilekce-empty"
            className="pointer-events-none hidden self-start text-(length:--dk-text) leading-[1.4] text-muted-foreground [grid-area:control] group-has-[:placeholder-shown]/field:block group-has-data-empty/field:block"
          >
            {emptyText}
          </span>
        )}
        {description != null && (
          <p
            id={descriptionId}
            data-slot="dilekce-description"
            className="m-0 text-[calc(var(--dk-text)*0.78)] leading-snug text-muted-foreground [grid-area:description] group-data-[mode=filled]/dilekce:hidden"
          >
            {description}
          </p>
        )}
        {/* After the control, so Tab goes control, then its own Copy and Change. */}
        {(copyable || changeable) && (
          <span
            data-slot="dilekce-field-actions"
            className={cn(
              "-mt-1 inline-flex items-start gap-1 self-start justify-self-end [grid-area:error] print:hidden",
              // A fine pointer can hover or focus, so the actions wait out of sight and, when
              // shown, float over the label's end on a fade: the label keeps its width.
              // Touch has no hover, so there they stay visible and in the cell's flow.
              "pointer-fine:absolute pointer-fine:[grid-area:auto] pointer-fine:end-(--dk-px) pointer-fine:top-[max(0px,calc(var(--dk-py)-0.375rem))] pointer-fine:z-1 pointer-fine:m-0 pointer-fine:rounded-sm pointer-fine:bg-[linear-gradient(to_right,transparent,var(--dk-cell)_0.75rem)] pointer-fine:ps-3 pointer-fine:opacity-0 pointer-fine:transition-opacity pointer-fine:duration-150 motion-reduce:pointer-fine:transition-none",
              "pointer-fine:group-hover/field:opacity-100 pointer-fine:group-focus-within/field:opacity-100",
              // Nothing to copy and no Change: no box either.
              NO_ACTIONS,
            )}
          >
            {copyable && (
              <button
                type="button"
                data-slot="dilekce-copy"
                aria-labelledby={`${copyId} ${labelId}`}
                className={cn(
                  "inline-flex min-h-6 min-w-6 cursor-pointer items-center justify-center gap-1 rounded-sm px-1 font-mono text-(length:--dk-label) leading-[1.3] tracking-[0.02em] text-muted-foreground",
                  "hover:bg-foreground/8 hover:text-foreground focus-visible:outline-2 focus-visible:outline-(--dk-focus)",
                  // Nothing to copy: an empty field, or a group with nothing chosen.
                  NOTHING_TO_COPY,
                  "print:hidden",
                )}
                data-copied={copied || undefined}
                onClick={async (event) => {
                  const field = event.currentTarget.closest<HTMLElement>(
                    "[data-slot=dilekce-field]",
                  )
                  if (!field) return
                  try {
                    await navigator.clipboard.writeText(displayText(field))
                    setCopied(true)
                    announce?.(`${labelOf()}: ${all.copied}`)
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
            {changeable &&
              (typeof edit === "string" ? (
                <a
                  data-slot="dilekce-change"
                  href={edit}
                  aria-labelledby={`${changeId} ${labelId}`}
                  className={CHANGE}
                >
                  <span id={changeId}>{all.change}</span>
                </a>
              ) : (
                <button
                  type="button"
                  data-slot="dilekce-change"
                  aria-labelledby={`${changeId} ${labelId}`}
                  className={CHANGE}
                  onClick={() => {
                    if (typeof edit === "function") return edit()
                    const field = fieldRef.current
                    if (!field) return
                    form?.edit({
                      name: controlOf(field)?.name || name || "",
                      label: labelOf(),
                      element: controlOf(field) ?? field,
                    })
                  }}
                >
                  <span id={changeId}>{all.change}</span>
                </button>
              ))}
          </span>
        )}
      </div>
    </FieldContext.Provider>
  )
}

/** Where Copy has nothing to copy: an empty field, or a group or toggle with nothing chosen. */
const NOTHING_TO_COPY =
  "group-has-[:placeholder-shown]/field:hidden group-has-data-empty/field:hidden group-has-[[data-slot=dilekce-choices]]/field:group-not-has-checked/field:hidden group-has-[[data-slot=dilekce-toggle]]/field:group-not-has-checked/field:hidden"

/** The same, with no Change beside it: the actions box has nothing in it. (Literal, so Tailwind sees the classes.) */
const NO_ACTIONS =
  "group-has-[:placeholder-shown]/field:not-has-[[data-slot=dilekce-change]]:hidden group-has-data-empty/field:not-has-[[data-slot=dilekce-change]]:hidden group-has-[[data-slot=dilekce-choices]]/field:group-not-has-checked/field:not-has-[[data-slot=dilekce-change]]:hidden group-has-[[data-slot=dilekce-toggle]]/field:group-not-has-checked/field:not-has-[[data-slot=dilekce-change]]:hidden"

const CHANGE = cn(
  "inline-flex min-h-6 min-w-6 cursor-pointer items-center justify-center rounded-sm px-1 font-mono text-(length:--dk-label) leading-[1.3] tracking-[0.02em] text-muted-foreground underline underline-offset-2",
  "hover:bg-foreground/8 hover:text-foreground focus-visible:outline-2 focus-visible:outline-(--dk-focus)",
)

let canvas: CanvasRenderingContext2D | null | undefined

/** The label's full text width (untruncated, upper-cased, with its required mark). */
function labelWidth(ctx: CanvasRenderingContext2D, label: HTMLElement) {
  const style = getComputedStyle(label)
  const lang = label.closest("[lang]")?.getAttribute("lang") || undefined
  let text = label.textContent ?? ""
  if (style.textTransform === "uppercase") text = text.toLocaleUpperCase(lang)
  // The required mark is generated content: ` *`, or nothing (filled mode).
  const mark = getComputedStyle(label, "::after").content.match(/^"((?:[^"\\]|\\.)*)"/)
  if (mark?.[1]) text += mark[1]
  ctx.font = style.font
  if ("letterSpacing" in ctx) ctx.letterSpacing = style.letterSpacing
  // Letter spacing is added after every character, the last one included.
  return ctx.measureText(text).width
}

/**
 * Whether the message belongs under the control: it takes more than 60% of the
 * cell, or the whole label, the gap and the message don't fit on one line.
 */
function overflows(
  field: HTMLElement,
  node: HTMLElement,
  text: string | null,
  label: HTMLElement | null,
) {
  const style = getComputedStyle(field)
  const inner =
    field.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight)
  canvas ??= document.createElement("canvas").getContext("2d")
  // Rich messages (not a string) are measured as laid out.
  let message = node.scrollWidth
  if (text != null && canvas) {
    const font = getComputedStyle(node)
    canvas.font = font.font
    if ("letterSpacing" in canvas) canvas.letterSpacing = font.letterSpacing
    message = canvas.measureText(text).width
  }
  if (message > inner * 0.6) return true
  if (!label || !canvas) return false
  // Copy and Change share the message's cell where they stay in the flow (touch):
  // the message goes below rather than under them.
  const actions = field.querySelector<HTMLElement>(":scope > [data-slot=dilekce-field-actions]")
  if (actions) {
    const box = getComputedStyle(actions)
    if (box.display !== "none" && box.position !== "absolute") return true
  }
  const gap = Number.parseFloat(style.columnGap) || 0
  return labelWidth(canvas, label) + gap + message > inner
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
  id?: string | undefined
  name?: string | undefined
  readOnly?: boolean | undefined
  "aria-describedby"?: string | undefined
  /** A controlled value; when it changes the field re-reads what depends on it. */
  value?: unknown
  checked?: unknown
}) {
  const field = useField()
  const sync = field?.sync
  const changed = Array.isArray(props.value)
    ? props.value.join("\u0000")
    : String(props.value ?? "")
  React.useLayoutEffect(() => sync?.(), [sync, changed])
  return {
    id: props.id ?? field?.id,
    name: props.name ?? field?.name,
    readOnly: props.readOnly || field?.readOnly || undefined,
    "aria-describedby":
      [field?.describedBy, props["aria-describedby"]].filter(Boolean).join(" ") || undefined,
    "aria-invalid": field?.invalid || undefined,
    // The app sets this control's value: `defaultValues` leaves it alone.
    "data-controlled": props.value !== undefined || props.checked !== undefined ? "" : undefined,
  }
}

export interface DilekceAffixProps {
  /** Shown before the value inside the cell: a currency, `https://`, `+90`. */
  leading?: React.ReactNode | undefined
  /** Shown after the value inside the cell: a unit, `kg`, `%`, `.com`. */
  trailing?: React.ReactNode | undefined
}

/**
 * Filled: the control is only as wide as its value, so a trailing affix sits
 * right after it ("1,5 kg") instead of at the far end of the cell. Where
 * `field-sizing` isn't supported the control keeps filling the cell.
 */
const FILLED_FIT =
  "supports-[field-sizing:content]:group-data-[mode=filled]/dilekce:w-auto supports-[field-sizing:content]:group-data-[mode=filled]/dilekce:flex-none supports-[field-sizing:content]:group-data-[mode=filled]/dilekce:field-sizing-content"

const AFFIX = cn(
  "shrink-0 text-(length:--dk-text) leading-[1.4] whitespace-nowrap text-muted-foreground select-none",
  // A completed form shows a dash for an empty value, without a lone unit.
  "group-data-[mode=filled]/dilekce:group-has-[:placeholder-shown]/field:invisible group-data-[mode=filled]/dilekce:group-has-data-empty/field:invisible",
)

/** Ids for the affixes, so the control can be described by "kg" or "$". */
function useAffixIds(leading: React.ReactNode, trailing: React.ReactNode) {
  const id = React.useId()
  return {
    leading: hasContent(leading) ? `${id}-leading` : undefined,
    trailing: hasContent(trailing) ? `${id}-trailing` : undefined,
  }
}

function Affix({
  side,
  id,
  children,
}: {
  side: "leading" | "trailing"
  id: string | undefined
  children: React.ReactNode
}) {
  if (!hasContent(children)) return null
  return (
    <span data-slot="dilekce-affix" data-side={side} id={id} className={AFFIX}>
      {children}
    </span>
  )
}

const describedWith = (...ids: Array<string | undefined>) =>
  ids.filter(Boolean).join(" ") || undefined

export interface DilekceInputProps extends React.ComponentProps<"input">, DilekceAffixProps {}

/** Types the browser draws its own editor and picker for. */
const PICKER_TYPES = new Set(["date", "time", "datetime-local", "month", "week"])

const pickerIcon = (paths: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`,
  )}")`
const CALENDAR_ICON = pickerIcon(
  '<rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 6.5h12M5.5 1.75v2.5M10.5 1.75v2.5"/>',
)
const CLOCK_ICON = pickerIcon('<circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/>')

const PICKER = cn(
  // The browser's picker button is a bitmap that takes no color. Used as a mask it
  // takes the token's, in light and dark; forced colors get CanvasText.
  "[&::-webkit-calendar-picker-indicator]:size-4 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:rounded-sm [&::-webkit-calendar-picker-indicator]:bg-muted-foreground [&::-webkit-calendar-picker-indicator]:bg-none [&::-webkit-calendar-picker-indicator]:[mask:var(--dk-picker)_center/contain_no-repeat] [&::-webkit-calendar-picker-indicator:hover]:bg-foreground forced-colors:[&::-webkit-calendar-picker-indicator]:bg-[CanvasText]",
  // The editor has no placeholder: an empty one shows the format, muted until it's used.
  "data-empty:text-muted-foreground data-empty:focus:text-foreground",
  // Filled: a read-only value, or nothing (the cell shows the dash).
  "group-data-[mode=filled]/dilekce:[&::-webkit-calendar-picker-indicator]:hidden group-data-[mode=filled]/dilekce:data-empty:text-transparent",
)

/**
 * What an input holds, as a string, for the types `:placeholder-shown` can't
 * tell empty from full (date, time, file: there is no placeholder to show).
 * Read after every render, when the user changes it, when focus moves and after
 * a form reset. Code assigning `value` is picked up at the next of those, like
 * any uncontrolled input. For a file input: the chosen names, joined by NUL.
 */
function useTrackedValue(
  ref: React.RefObject<HTMLInputElement | null>,
  enabled: boolean,
  initial: string,
) {
  const [text, setText] = React.useState(initial)
  const read = React.useCallback(() => {
    const input = ref.current
    if (!input) return
    setText(input.type === "file" ? fileNames(input).join("\u0000") : input.value)
  }, [ref])
  // Controlled values change on a render.
  React.useLayoutEffect(() => {
    if (enabled) read()
  })
  // After the form applied `defaultValues` (a layout effect of its own), and then on events.
  React.useEffect(() => {
    const input = ref.current
    if (!enabled || !input) return
    read()
    const onReset = () => setTimeout(read)
    const form = input.form
    form?.addEventListener("reset", onReset)
    const events = ["input", "change", "focus", "blur"]
    for (const event of events) input.addEventListener(event, read)
    return () => {
      form?.removeEventListener("reset", onReset)
      for (const event of events) input.removeEventListener(event, read)
    }
  }, [enabled, read, ref])
  return text
}

/**
 * A text input of any `type`. `date`, `time`, `datetime-local`, `month` and
 * `week` are first-class: the native editor and picker, the picker button in
 * the theme's colors, `min` and `max` through the usual messages, and a dash
 * in filled mode when empty.
 */
function DilekceInput({
  className,
  style,
  placeholder = " ",
  leading,
  trailing,
  ref,
  ...props
}: DilekceInputProps) {
  const affixes = useAffixIds(leading, trailing)
  const control = useControl({
    ...props,
    "aria-describedby": describedWith(props["aria-describedby"], affixes.leading, affixes.trailing),
  })
  const picker = PICKER_TYPES.has(props.type ?? "")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const mergedRef = useMergedRef(inputRef, ref)
  const text = useTrackedValue(inputRef, picker, String(props.value ?? props.defaultValue ?? ""))
  const input = (
    <input
      data-slot="dilekce-input"
      // A blank placeholder lets :placeholder-shown mean "empty".
      placeholder={placeholder}
      className={cn(
        CONTROL_CLASS,
        picker && PICKER,
        (leading != null || trailing != null) && ["flex-1", FILLED_FIT],
        className,
      )}
      style={
        picker
          ? ({
              "--dk-picker": props.type === "time" ? CLOCK_ICON : CALENDAR_ICON,
              ...style,
            } as React.CSSProperties)
          : style
      }
      {...props}
      {...control}
      ref={mergedRef}
      // Date inputs can't show a placeholder, so emptiness is read from the value.
      data-empty={picker && text === "" ? "" : undefined}
    />
  )
  if (leading == null && trailing == null) return input
  return (
    <div className="flex min-w-0 items-baseline gap-1 [grid-area:control]">
      <Affix side="leading" id={affixes.leading}>
        {leading}
      </Affix>
      {input}
      <Affix side="trailing" id={affixes.trailing}>
        {trailing}
      </Affix>
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

export interface DilekceSelectProps extends Omit<React.ComponentProps<"select">, "children"> {
  options: DilekceOption[]
  placeholder?: string | undefined
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
  const { readOnly, ...selectControl } = useControl({ ...props, value })
  const [current, setCurrent] = React.useState(String(defaultValue ?? ""))
  // A multiple select's default is a list; none is the empty one.
  const fallback = props.multiple ? [] : ""
  const empty = (value === undefined ? current : String(value)) === ""
  const selectRef = React.useRef<HTMLSelectElement>(null)
  const mergedRef = useMergedRef(selectRef, ref)

  /*
   * Uncontrolled, `empty` is read back from the element whenever it can have
   * changed without a change event: a form reset (the browser restores the
   * selection after the event), focus coming or going, and code assigning
   * `select.value` or `select.selectedIndex`, which is caught by wrapping both
   * setters on this element. Not seen: `option.selected = true`, which can't
   * be observed without polling. Controlled, `empty` comes from the prop.
   */
  React.useEffect(() => {
    const select = selectRef.current
    if (!select) return
    const read = () => setCurrent(select.value)
    const onReset = () => setTimeout(read)
    const wrapped = (["value", "selectedIndex"] as const).flatMap((key) => {
      const original = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, key)
      if (!original?.get || !original.set) return []
      const { get, set } = original
      Object.defineProperty(select, key, {
        configurable: true,
        get: () => get.call(select),
        set: (next: never) => {
          set.call(select, next)
          read()
        },
      })
      return [key]
    })
    // `defaultValues` may have chosen an option before this ran.
    read()
    select.form?.addEventListener("reset", onReset)
    select.addEventListener("focus", read)
    select.addEventListener("blur", read)
    return () => {
      for (const key of wrapped) delete select[key]
      select.form?.removeEventListener("reset", onReset)
      select.removeEventListener("focus", read)
      select.removeEventListener("blur", read)
    }
  }, [])

  return (
    <div className="relative flex min-w-0 items-center [grid-area:control]">
      <select
        ref={mergedRef}
        data-slot="dilekce-select"
        data-empty={empty || undefined}
        value={value}
        defaultValue={value === undefined ? (defaultValue ?? fallback) : undefined}
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
  scrub?: number | false | undefined
  decrementLabel?: string | undefined
  incrementLabel?: string | undefined
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
  const affixes = useAffixIds(leading, trailing)
  const control = useControl({
    ...props,
    "aria-describedby": describedWith(props["aria-describedby"], affixes.leading, affixes.trailing),
  })
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
      <Affix side="leading" id={affixes.leading}>
        {leading}
      </Affix>
      <input
        ref={mergedRef}
        type="number"
        inputMode="decimal"
        data-slot="dilekce-number"
        data-scrub={(scrub !== false && !locked) || undefined}
        placeholder={placeholder}
        className={cn(
          CONTROL_CLASS,
          "flex-1 tabular-nums",
          FILLED_FIT,
          "[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          className,
        )}
        {...props}
        {...control}
      />
      <Affix side="trailing" id={affixes.trailing}>
        {trailing}
      </Affix>
      {!locked && (
        <>
          <Stepper label={decrementLabel} labelId={field?.labelId} onStep={() => nudge(-1)}>
            <path d="M2.5 5h5" />
          </Stepper>
          <Stepper label={incrementLabel} labelId={field?.labelId} onStep={() => nudge(1)}>
            <path d="M2.5 5h5M5 2.5v5" />
          </Stepper>
        </>
      )}
    </div>
  )
}

function Stepper({
  label,
  labelId,
  onStep,
  children,
}: {
  label: string
  /** The field's label: the button is named "Decrease" + that, e.g. "Decrease Weight". */
  labelId: string | undefined
  onStep: () => void
  children: React.ReactNode
}) {
  const id = React.useId()
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  // A press already stepped on pointerdown: the click that follows it must not step again.
  const pressed = React.useRef(false)
  const stop = () => clearTimeout(timer.current)
  React.useEffect(() => stop, [])

  return (
    <button
      type="button"
      // The input's own arrow keys step it; the buttons are for pointers.
      tabIndex={-1}
      id={id}
      // Naming itself first: aria-labelledby that includes the button reads its aria-label.
      aria-label={label}
      aria-labelledby={labelId ? `${id} ${labelId}` : undefined}
      className="grid size-6 shrink-0 place-items-center rounded-sm text-muted-foreground opacity-0 transition-[opacity,background-color,color] duration-150 ease-out motion-reduce:transition-none group-focus-within/field:opacity-100 group-hover/field:opacity-100 pointer-coarse:opacity-100 hover:bg-foreground/8 hover:text-foreground active:bg-foreground/14"
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        pressed.current = true
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
      onPointerLeave={() => {
        stop()
        pressed.current = false
      }}
      onPointerCancel={() => {
        stop()
        pressed.current = false
      }}
      onClick={() => {
        // A press stepped already; a click with no press before it (keyboard,
        // assistive tech, voice control, a script) steps here.
        if (pressed.current) pressed.current = false
        else onStep()
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
  "peer size-3.75 shrink-0 appearance-none border-[1.5px] border-muted-foreground bg-background outline-none transition-[background-color,border-color] duration-150 ease-out motion-reduce:transition-none",
  // The cell's focus color (primary, destructive when invalid), not --ring: ring is under 3:1.
  // outline-none above turns the outline style off for good; the focus state turns it back on.
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-(--dk-focus)",
  "checked:border-primary checked:bg-primary",
  // Forced colors drops the fill and the inset shadow: a checked mark is Highlight.
  "forced-colors:border-[CanvasText] forced-colors:checked:border-[Highlight] forced-colors:checked:bg-[Highlight]",
  "group-data-[mode=filled]/dilekce:checked:border-(--dk-ink) group-data-[mode=filled]/dilekce:checked:bg-(--dk-ink)",
)

interface GroupProps<V> extends Omit<React.ComponentProps<"div">, "defaultValue" | "onChange"> {
  options: DilekceOption[]
  name?: string | undefined
  value?: V | undefined
  defaultValue?: V | undefined
  onValueChange?: ((value: V) => void) | undefined
  required?: boolean | undefined
  disabled?: boolean | undefined
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
  const control = useControl({ name, value })
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
      {options.map((option, index) => (
        <label key={option.value} className={CHOICE}>
          <input
            type="radio"
            // The first radio is where the error summary's link lands.
            id={index === 0 ? control.id : undefined}
            name={control.name ?? fallback}
            // Named only to group the radios: not a value of the form.
            data-anonymous={control.name ? undefined : ""}
            data-controlled={control["data-controlled"]}
            value={option.value}
            required={required}
            disabled={disabled || option.disabled}
            checked={value === undefined ? undefined : value === option.value}
            defaultChecked={defaultValue === undefined ? undefined : defaultValue === option.value}
            onChange={(event) => {
              if (event.currentTarget.checked) onValueChange?.(option.value)
            }}
            className={cn(
              MARK,
              "rounded-full checked:shadow-[inset_0_0_0_3px_var(--background)] forced-colors:checked:border-[5px] forced-colors:checked:bg-[Canvas]",
            )}
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
  const control = useControl({ name, value })
  const guard = useReadOnlyGuard(Boolean(control.readOnly))
  const requiredId = React.useId()

  return (
    <div
      role="group"
      data-slot="dilekce-choices"
      data-required={required || undefined}
      aria-labelledby={field?.labelId}
      // aria-required is not allowed on a group, and on each box it would say every
      // one must be ticked: "at least one" is said in words, by the field's message.
      aria-describedby={describedWith(
        required ? requiredId : undefined,
        control["aria-describedby"],
      )}
      aria-invalid={control["aria-invalid"]}
      className={cn(CHOICES, className)}
      {...props}
    >
      {required && (
        <span id={requiredId} className="sr-only">
          {field?.messages.valueMissing ?? dilekceMessages.en.valueMissing}
        </span>
      )}
      {options.map((option, index) => (
        <label key={option.value} className={CHOICE}>
          <span className="relative grid place-items-center">
            <input
              type="checkbox"
              // The first box is where the error summary's link lands.
              id={index === 0 ? control.id : undefined}
              name={control.name}
              data-controlled={control["data-controlled"]}
              value={option.value}
              disabled={disabled || option.disabled}
              // Valid on a checkbox, not on its group.
              aria-readonly={control.readOnly}
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
              className="pointer-events-none absolute hidden size-2.5 text-primary-foreground peer-checked:block forced-colors:text-[HighlightText]"
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
/*                         Checkbox, switch and file input                    */
/* -------------------------------------------------------------------------- */

const TOGGLE = cn(
  "inline-flex w-fit max-w-full cursor-default items-start gap-2 text-(length:--dk-text) leading-[1.4]",
  "group-data-[mode=filled]/dilekce:text-(--dk-ink) group-data-[mode=filled]/dilekce:not-has-checked:text-muted-foreground",
)

// The box (or track) is centered on the text's first line, however long the text runs.
const TOGGLE_MARK = "relative mt-[calc((1lh-var(--box))/2)] shrink-0"

interface ToggleProps extends Omit<React.ComponentProps<"input">, "type" | "children"> {
  /** The control's own text, beside it: what names it. */
  children?: React.ReactNode | undefined
}

function Toggle({
  kind,
  children,
  className,
  onClick,
  onKeyDown,
  ...props
}: ToggleProps & { kind: "checkbox" | "switch" }) {
  const field = useField()
  const text = hasContent(children)
  // With text beside it, the control is named by that text and the field's label
  // names the group around it; without, the field's label names the control.
  useGroupLabel(text)
  // A checkbox's `value` is what it submits, not a controlled value: `checked` is.
  const control = useControl({ ...props, value: props.checked })
  const guard = useReadOnlyGuard(Boolean(control.readOnly))
  const named = text && field != null

  const input = (
    <input
      data-slot={`dilekce-${kind}`}
      {...props}
      type="checkbox"
      role={kind === "switch" ? "switch" : undefined}
      id={control.id}
      name={control.name}
      data-controlled={control["data-controlled"]}
      aria-describedby={control["aria-describedby"]}
      aria-invalid={control["aria-invalid"]}
      // Valid on a checkbox and a switch; read-only choices keep focus but ignore changes.
      aria-readonly={control.readOnly}
      className={cn(
        MARK,
        kind === "switch" ? "absolute inset-0 size-full rounded-full" : "rounded-[3px]",
        "disabled:cursor-not-allowed",
        className,
      )}
      onClick={(event) => {
        guard.onClick(event)
        onClick?.(event)
      }}
      onKeyDown={(event) => {
        guard.onKeyDown(event)
        onKeyDown?.(event)
      }}
    />
  )

  return (
    <div
      data-slot="dilekce-toggle"
      role={named ? "group" : undefined}
      aria-labelledby={named ? field.labelId : undefined}
      className="min-w-0 [grid-area:control]"
    >
      <label className={TOGGLE}>
        {kind === "switch" ? (
          // Sized to the cell's text. The thumb is placed with logical offsets, so it
          // runs the right way round in right-to-left.
          <span
            className={cn(
              TOGGLE_MARK,
              "[--box:var(--sw)] [--sw:calc(var(--dk-text)*1.2)] inline-grid h-(--sw) w-[calc(var(--sw)*1.85)]",
            )}
          >
            {input}
            <span
              aria-hidden="true"
              data-slot="dilekce-switch-thumb"
              className="pointer-events-none absolute start-[3.5px] top-1/2 size-[calc(var(--sw)-7px)] -translate-y-1/2 rounded-full bg-muted-foreground transition-[inset-inline-start,background-color] duration-150 ease-out peer-checked:start-[calc(100%-var(--sw)+3.5px)] peer-checked:bg-background motion-reduce:transition-none forced-colors:bg-[CanvasText] forced-colors:peer-checked:bg-[HighlightText]"
            />
          </span>
        ) : (
          <span className={cn(TOGGLE_MARK, "[--box:0.9375rem] grid place-items-center")}>
            {input}
            <svg
              viewBox="0 0 10 10"
              aria-hidden="true"
              className="pointer-events-none absolute hidden size-2.5 text-primary-foreground peer-checked:block forced-colors:text-[HighlightText]"
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
        )}
        {text && <span className="min-w-0">{children}</span>}
      </label>
    </div>
  )
}

export interface DilekceCheckboxProps extends ToggleProps {}

/**
 * One checkbox: a consent, "same as billing". Its `children` are its text, which
 * names it; the field's label names the group around it. In the form's values
 * it is its `value` ("on" unless set) when ticked, and absent when not: read it
 * with `z.literal("on")` (`.optional()` when it may stay off) or, for a plain
 * boolean, `z.coerce.boolean().default(false)`.
 */
function DilekceCheckbox(props: DilekceCheckboxProps) {
  return <Toggle kind="checkbox" {...props} />
}

export interface DilekceSwitchProps extends ToggleProps {}

/**
 * A native checkbox with `role="switch"`, drawn as a track and a thumb. Same
 * text, value and validation as `DilekceCheckbox`.
 */
function DilekceSwitch(props: DilekceSwitchProps) {
  return <Toggle kind="switch" {...props} />
}

export interface DilekceFileProps extends Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "defaultValue" | "children"
> {}

/**
 * A native file input with the theme's small outline button. Pass `accept` and
 * `multiple` like on any input; `accept` only filters the picker, so check type
 * and size in `validate` or the schema. `required` works through constraint
 * validation. The schema gets a `File` (`File[]` with `multiple`); `defaultValues`
 * don't apply, because a page can't choose a file for the user. In filled mode
 * the control gives way to the file names, or a dash.
 */
function DilekceFile({ className, ref, ...props }: DilekceFileProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const mergedRef = useMergedRef(inputRef, ref)
  const text = useTrackedValue(inputRef, true, "")
  const names = text === "" ? [] : text.split("\u0000")
  const namesId = React.useId()
  // The browser says "3 files" for several: the names are the description.
  const control = useControl({
    ...props,
    "aria-describedby": describedWith(
      props["aria-describedby"],
      props.multiple && names.length > 1 ? namesId : undefined,
    ),
  })
  const guard = useReadOnlyGuard(Boolean(control.readOnly))
  return (
    <div data-slot="dilekce-file-field" className="min-w-0 [grid-area:control]">
      <input
        data-slot="dilekce-file"
        {...props}
        {...control}
        ref={mergedRef}
        type="file"
        data-empty={names.length === 0 ? "" : undefined}
        className={cn(
          CONTROL_CLASS,
          "cursor-[inherit] data-empty:text-muted-foreground",
          // The browser's button, as a small outline button.
          "file:me-3 file:h-6 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-background file:px-2.5 file:[font-family:inherit] file:text-[calc(var(--dk-text)*0.875)] file:font-medium file:text-foreground file:transition-colors motion-reduce:file:transition-none [&::file-selector-button:hover]:bg-accent",
          "forced-colors:file:border-[ButtonText]",
          // Filled: the names below stand in for the control.
          "group-data-[mode=filled]/dilekce:hidden",
          className,
        )}
        onClick={(event) => {
          // A read-only file field must not open the picker, not even from its label.
          guard.onClick(event)
          props.onClick?.(event)
        }}
      />
      {names.length > 0 && (
        <span
          id={namesId}
          data-slot="dilekce-file-names"
          className="sr-only text-(length:--dk-text) leading-[1.4] text-(--dk-ink) [overflow-wrap:anywhere] group-data-[mode=filled]/dilekce:not-sr-only"
        >
          {names.join(", ")}
        </span>
      )}
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
  DilekceCheckbox,
  DilekceCheckboxGroup,
  DilekceField,
  DilekceFile,
  DilekceInput,
  DilekceNumber,
  DilekceRadioGroup,
  DilekceRepeat,
  DilekceRepeatRemove,
  DilekceRow,
  DilekceSection,
  DilekceSelect,
  DilekceSummary,
  DilekceSwitch,
  DilekceTextarea,
}
