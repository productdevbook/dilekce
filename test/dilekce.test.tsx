import * as React from "react"
import { flushSync } from "react-dom"
import { afterEach, beforeAll, describe, expect, expectTypeOf, test, vi } from "vitest"
import { cdp, userEvent } from "vitest/browser"
import { cleanup, render } from "vitest-browser-react"
import { z } from "zod"

import "../src/index.css"
import {
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
  dilekceMessages,
  type DilekceErrors,
  type DilekceInvalidField,
  type DilekceMode,
  type StandardSchemaV1,
} from "../registry/dilekce/dilekce"

afterEach(() => cleanup())

const tick = () => new Promise((r) => requestAnimationFrame(() => r(null)))
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!

const errorOf = (name: string) =>
  document
    .querySelector(`[name="${name}"]`)
    ?.closest("[data-slot=dilekce-field]")
    ?.querySelector("[data-slot=dilekce-error]")?.textContent ?? null

const describedText = (element: Element) =>
  (element.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ")
    .trim()

function Basic({
  onSubmit = (event: React.FormEvent) => event.preventDefault(),
  errors,
  mode,
}: {
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void
  errors?: DilekceErrors
  mode?: DilekceMode
}) {
  return (
    <Dilekce onSubmit={onSubmit} errors={errors} mode={mode}>
      <DilekceSection legend="Customer">
        <DilekceRow>
          <DilekceField name="name" label="Full name" span={2}>
            <DilekceInput required />
          </DilekceField>
          <DilekceField name="email" label="Email" description="We never share it">
            <DilekceInput type="email" />
          </DilekceField>
        </DilekceRow>
      </DilekceSection>
      <DilekceActions>
        <button type="submit">Save</button>
        <button type="reset">Reset</button>
      </DilekceActions>
    </Dilekce>
  )
}

describe("structure", () => {
  test("each label names its control, and a section is a named group", async () => {
    const screen = await render(<Basic />)
    await expect.element(screen.getByRole("textbox", { name: /Full name/ })).toBeVisible()
    await expect.element(screen.getByRole("group", { name: "Customer" })).toBeVisible()
  })

  test("the description is part of the control's description", async () => {
    await render(<Basic />)
    expect(describedText($("[name=email]"))).toBe("We never share it")
  })

  test("cells share a row by span, and wrap when the form is narrow", async () => {
    await render(
      <div style={{ width: 900 }}>
        <Basic />
      </div>,
    )
    const name = $("[name=name]").closest("[data-slot=dilekce-field]")!
    const email = $("[name=email]").closest("[data-slot=dilekce-field]")!
    const a = name.getBoundingClientRect()
    const b = email.getBoundingClientRect()
    expect(a.top).toBe(b.top)
    expect(a.width / b.width).toBeCloseTo(2, 1)

    $("[data-slot=dilekce]").parentElement!.style.width = "300px"
    await tick()
    expect(email.getBoundingClientRect().top).toBeGreaterThan(name.getBoundingClientRect().top)
  })
})

describe("validation", () => {
  test("submitting shows every message, focuses the first, and stops the submit", async () => {
    const onSubmit = vi.fn()
    const screen = await render(
      <Dilekce onSubmit={onSubmit}>
        <DilekceRow>
          <DilekceField name="a" label="A">
            <DilekceInput required />
          </DilekceField>
          <DilekceField name="b" label="B">
            <DilekceInput type="email" defaultValue="nope" />
          </DilekceField>
        </DilekceRow>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Save" }).click()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(errorOf("a")).toBe("Required")
    expect(errorOf("b")).toBe("Check format")
    expect(document.activeElement).toBe($("[name=a]"))
    expect($("[name=a]").getAttribute("aria-invalid")).toBe("true")
    expect(describedText($("[name=a]"))).toBe("Required")
  })

  test("a valid form submits", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    const screen = await render(<Basic onSubmit={onSubmit} />)
    await screen.getByRole("textbox", { name: /Full name/ }).fill("Ada")
    await screen.getByRole("button", { name: "Save" }).click()
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  test("leaving a field checks it only after an edit", async () => {
    const screen = await render(<Basic />)
    const name = screen.getByRole("textbox", { name: /Full name/ })
    const email = screen.getByRole("textbox", { name: /Email/ })

    await name.click()
    await email.click()
    expect(errorOf("name")).toBeNull()

    await email.fill("not-an-email")
    await name.click()
    expect(errorOf("email")).toBe("Check format")
  })

  test("once showing, a message follows the value live", async () => {
    const screen = await render(<Basic />)
    await screen.getByRole("button", { name: "Save" }).click()
    expect(errorOf("name")).toBe("Required")
    await userEvent.keyboard("A")
    expect(errorOf("name")).toBeNull()
  })

  test("messages can be replaced per form and per field", async () => {
    const screen = await render(
      <Dilekce messages={dilekceMessages.tr}>
        <DilekceField name="a" label="A">
          <DilekceInput required />
        </DilekceField>
        <DilekceField name="b" label="B" messages={{ valueMissing: "Name, please" }}>
          <DilekceInput required />
        </DilekceField>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Save" }).click()
    expect(errorOf("a")).toBe("Zorunlu")
    expect(errorOf("b")).toBe("Name, please")
  })

  test("reset clears the messages", async () => {
    const screen = await render(<Basic />)
    await screen.getByRole("button", { name: "Save" }).click()
    expect(errorOf("name")).toBe("Required")
    await screen.getByRole("button", { name: "Reset" }).click()
    expect(errorOf("name")).toBeNull()
  })
})

describe("external errors", () => {
  test("a server error shows, blocks the submit, and clears on edit", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    const screen = await render(<Basic onSubmit={onSubmit} errors={{ name: "Already taken" }} />)
    expect(errorOf("name")).toBe("Already taken")

    await screen.getByRole("button", { name: "Save" }).click()
    expect(onSubmit).not.toHaveBeenCalled()

    await screen.getByRole("textbox", { name: /Full name/ }).fill("Grace")
    expect(errorOf("name")).toBeNull()
    await screen.getByRole("button", { name: "Save" }).click()
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  test("errors from a React 19 action survive the reset React runs after it", async () => {
    function Page() {
      const [state, act] = React.useActionState(
        async (_previous: { errors: DilekceErrors }, _data: FormData) => ({
          errors: { email: "Taken" } as DilekceErrors,
        }),
        { errors: {} as DilekceErrors },
      )
      return (
        <Dilekce action={act} errors={state.errors}>
          <DilekceField name="email" label="Email">
            <DilekceInput defaultValue="a@b.c" />
          </DilekceField>
          <button type="submit">Save</button>
          <button type="reset">Reset</button>
        </Dilekce>
      )
    }
    const screen = await render(<Page />)
    await screen.getByRole("button", { name: "Save" }).click()
    await expect.poll(() => errorOf("email")).toBe("Taken")
    await sleep(100)
    expect(errorOf("email")).toBe("Taken")
    // The user asking for a reset still clears it.
    await screen.getByRole("button", { name: "Reset" }).click()
    expect(errorOf("email")).toBeNull()
  })

  test("a programmatic reset keeps unedited server errors, and drops edited ones", async () => {
    await render(
      <Dilekce errors={{ a: "Taken", b: "Taken" }}>
        <DilekceField name="a" label="A">
          <DilekceInput />
        </DilekceField>
        <DilekceField name="b" label="B">
          <DilekceInput />
        </DilekceField>
      </Dilekce>,
    )
    $<HTMLFormElement>("form").reset()
    await sleep(20)
    expect(errorOf("a")).toBe("Taken")
    await userEvent.type($("[name=a]"), "x")
    expect(errorOf("a")).toBeNull()
    expect(errorOf("b")).toBe("Taken")
    $<HTMLFormElement>("form").reset()
    await sleep(20)
    expect(errorOf("b")).toBeNull()
  })

  test("a field's own error prop wins, for react-hook-form and friends", async () => {
    await render(
      <Dilekce>
        <DilekceField name="a" label="A" error="From the resolver">
          <DilekceInput />
        </DilekceField>
      </Dilekce>,
    )
    expect(errorOf("a")).toBe("From the resolver")
    expect($("[name=a]").getAttribute("aria-invalid")).toBe("true")
  })

  test("a message too long for the label row moves under the control", async () => {
    await render(
      <div style={{ width: 600 }}>
        <Dilekce
          errors={{
            short: "Taken",
            long: "We don't deliver to this postcode yet, try a pickup point",
          }}
        >
          <DilekceRow>
            <DilekceField name="short" label="Short">
              <DilekceInput />
            </DilekceField>
            <DilekceField name="long" label="Long">
              <DilekceInput />
            </DilekceField>
          </DilekceRow>
        </Dilekce>
      </div>,
    )
    await tick()
    const field = (name: string) => $(`[name=${name}]`).closest("[data-slot=dilekce-field]")!
    expect(field("short").hasAttribute("data-below")).toBe(false)
    expect(field("long").hasAttribute("data-below")).toBe(true)

    const error = field("long").querySelector("[data-slot=dilekce-error]")!
    const input = field("long").querySelector("input")!
    expect(error.getBoundingClientRect().top).toBeGreaterThan(input.getBoundingClientRect().top)
  })
})

describe("controls", () => {
  test("a required select starts invalid and reads its placeholder as empty", async () => {
    const screen = await render(
      <Dilekce>
        <DilekceField name="kind" label="Kind">
          <DilekceSelect
            required
            options={[
              { value: "a", label: "Alpha" },
              { value: "b", label: "Beta" },
            ]}
          />
        </DilekceField>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    expect($("select").hasAttribute("data-empty")).toBe(true)
    await screen.getByRole("button", { name: "Save" }).click()
    expect(errorOf("kind")).toBe("Required")

    await screen.getByRole("combobox", { name: /Kind/ }).selectOptions("b")
    expect($("select").hasAttribute("data-empty")).toBe(false)
    expect(errorOf("kind")).toBeNull()
  })

  test("radios are named by the field's label, and keep native semantics", async () => {
    const screen = await render(
      <Dilekce>
        <DilekceField name="size" label="Size">
          <DilekceRadioGroup
            defaultValue="m"
            options={[
              { value: "s", label: "Small" },
              { value: "m", label: "Medium" },
            ]}
          />
        </DilekceField>
      </Dilekce>,
    )
    await expect.element(screen.getByRole("radiogroup", { name: "Size" })).toBeVisible()
    await expect.element(screen.getByRole("radio", { name: "Medium" })).toBeChecked()
    await screen.getByRole("radio", { name: "Small" }).click()
    await expect.element(screen.getByRole("radio", { name: "Small" })).toBeChecked()
    expect(new FormData($<HTMLFormElement>("form")).get("size")).toBe("s")
  })

  test("a required checkbox group needs at least one", async () => {
    const onValueChange = vi.fn()
    const screen = await render(
      <Dilekce onSubmit={(event) => event.preventDefault()}>
        <DilekceField name="extras" label="Extras">
          <DilekceCheckboxGroup
            required
            onValueChange={onValueChange}
            options={[
              { value: "x", label: "Ex" },
              { value: "y", label: "Why" },
            ]}
          />
        </DilekceField>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Save" }).click()
    expect(errorOf("extras")).toBe("Required")
    await screen.getByRole("checkbox", { name: "Why" }).click()
    expect(onValueChange).toHaveBeenLastCalledWith(["y"])
    expect(errorOf("extras")).toBeNull()
  })

  test("steppers step within min and max, and report the change", async () => {
    const onChange = vi.fn()
    const screen = await render(
      <Dilekce>
        <DilekceField name="qty" label="Qty">
          <DilekceNumber min={0} max={2} defaultValue={1} onChange={onChange} />
        </DilekceField>
      </Dilekce>,
    )
    const input = $<HTMLInputElement>("[name=qty]")
    await screen.getByRole("button", { name: "Increase Qty" }).click()
    expect(input.value).toBe("2")
    await screen.getByRole("button", { name: "Increase Qty" }).click()
    expect(input.value).toBe("2")
    expect(onChange).toHaveBeenCalledOnce()
    await screen.getByRole("button", { name: "Decrease Qty" }).click()
    expect(input.value).toBe("1")
  })

  test('step="any" steppers move by 1 and keep the decimals', async () => {
    const onChange = vi.fn()
    const screen = await render(
      <Dilekce>
        <DilekceField name="price" label="Price">
          <DilekceNumber step="any" min={0} max={3} defaultValue={1.25} onChange={onChange} />
        </DilekceField>
      </Dilekce>,
    )
    const input = $<HTMLInputElement>("[name=price]")
    await screen.getByRole("button", { name: "Increase Price" }).click()
    expect(input.value).toBe("2.25")
    await screen.getByRole("button", { name: "Increase Price" }).click()
    expect(input.value).toBe("3.00")
    await screen.getByRole("button", { name: "Increase Price" }).click()
    expect(input.value).toBe("3.00")
    expect(onChange).toHaveBeenCalledTimes(2)
    await userEvent.clear(input)
    await screen.getByRole("button", { name: "Increase Price" }).click()
    expect(input.value).toBe("1")
  })

  test('step="any" scrubs by 1', async () => {
    await render(
      <Dilekce>
        <DilekceField name="w" label="Weight">
          <DilekceNumber step="any" min={-10} defaultValue={-2.5} scrub={10} />
        </DilekceField>
      </Dilekce>,
    )
    const label = $("label")
    const box = label.getBoundingClientRect()
    const at = (x: number, type: string) =>
      label.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          pointerId: 1,
          clientX: box.left + x,
          clientY: box.top + 4,
        }),
      )
    at(5, "pointerdown")
    at(35, "pointermove")
    at(35, "pointerup")
    expect($<HTMLInputElement>("[name=w]").value).toBe("0.5")
  })

  test("dragging across a number's label scrubs it", async () => {
    await render(
      <Dilekce>
        <DilekceField name="w" label="Weight">
          <DilekceNumber step={0.5} min={0} defaultValue={1} scrub={10} />
        </DilekceField>
      </Dilekce>,
    )
    const label = $("label")
    const box = label.getBoundingClientRect()
    const at = (x: number, type: string) =>
      label.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          pointerId: 1,
          clientX: box.left + x,
          clientY: box.top + 4,
        }),
      )
    at(5, "pointerdown")
    at(45, "pointermove")
    at(45, "pointerup")
    expect($<HTMLInputElement>("[name=w]").value).toBe("3.0")
  })

  test("a textarea is a control like any other", async () => {
    const screen = await render(
      <Dilekce>
        <DilekceField name="notes" label="Notes">
          <DilekceTextarea />
        </DilekceField>
      </Dilekce>,
    )
    await expect.element(screen.getByRole("textbox", { name: "Notes" })).toBeVisible()
  })
})

describe("filled mode", () => {
  test("controls are read-only and choices don't change", async () => {
    const screen = await render(
      <Dilekce mode="filled">
        <DilekceField name="name" label="Name">
          <DilekceInput defaultValue="Ada" />
        </DilekceField>
        <DilekceField name="size" label="Size">
          <DilekceRadioGroup
            defaultValue="m"
            options={[
              { value: "s", label: "Small" },
              { value: "m", label: "Medium" },
            ]}
          />
        </DilekceField>
        <DilekceActions>
          <button type="submit">Save</button>
        </DilekceActions>
      </Dilekce>,
    )
    expect($<HTMLInputElement>("[name=name]").readOnly).toBe(true)
    await screen.getByRole("radio", { name: "Small" }).click({ force: true })
    await expect.element(screen.getByRole("radio", { name: "Medium" })).toBeChecked()
    expect(getComputedStyle($("[data-slot=dilekce-actions]")).display).toBe("none")
  })

  test("an empty field shows a dash, a filled one doesn't", async () => {
    await render(
      <Dilekce mode="filled">
        <DilekceRow>
          <DilekceField name="a" label="A">
            <DilekceInput />
          </DilekceField>
          <DilekceField name="b" label="B">
            <DilekceInput defaultValue="Here" />
          </DilekceField>
          <DilekceField name="c" label="C">
            <DilekceSelect options={[{ value: "x", label: "X" }]} />
          </DilekceField>
        </DilekceRow>
      </Dilekce>,
    )
    const dash = (name: string) =>
      getComputedStyle($(`[name=${name}]`).closest("[data-slot=dilekce-field]")!, "::after").content
    expect(dash("a")).toContain("—")
    expect(dash("b")).not.toContain("—")
    expect(dash("c")).toContain("—")
  })

  test("required marks are hidden on a completed form", async () => {
    await render(<Basic mode="filled" />)
    expect(getComputedStyle($("label"), "::after").content).toBe("none")
  })
})

describe("custom rules", () => {
  test("a sync rule can compare fields, and runs after the constraints pass", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    const screen = await render(
      <Dilekce onSubmit={onSubmit}>
        <DilekceField name="email" label="Email">
          <DilekceInput type="email" required />
        </DilekceField>
        <DilekceField
          name="confirm"
          label="Confirm"
          validate={(value, data) => value !== data.get("email") && "Doesn't match"}
        >
          <DilekceInput type="email" required />
        </DilekceField>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Save" }).click()
    expect(errorOf("confirm")).toBe("Required")

    await screen.getByRole("textbox", { name: "Email" }).fill("a@b.co")
    await screen.getByRole("textbox", { name: /Confirm/ }).fill("x@y.co")
    await screen.getByRole("button", { name: "Save" }).click()
    expect(errorOf("confirm")).toBe("Doesn't match")
    expect(onSubmit).not.toHaveBeenCalled()

    await screen.getByRole("textbox", { name: /Confirm/ }).fill("a@b.co")
    expect(errorOf("confirm")).toBeNull()
    await screen.getByRole("button", { name: "Save" }).click()
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  test("an async rule shows pending, holds the submit, then replays it", async () => {
    let finish!: (message: string | null) => void
    const validate = vi.fn(() => new Promise<string | null>((resolve) => (finish = resolve)))
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    const screen = await render(
      <Dilekce onSubmit={onSubmit}>
        <DilekceField name="user" label="Username" validate={validate}>
          <DilekceInput defaultValue="ada" />
        </DilekceField>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Save" }).click()
    expect(validate).toHaveBeenCalledWith("ada", expect.any(FormData), {
      signal: expect.any(AbortSignal),
    })
    expect($("[data-slot=dilekce-pending]").textContent).toBe("Checking…")
    expect($("form").getAttribute("aria-busy")).toBe("true")
    expect(onSubmit).not.toHaveBeenCalled()

    finish("Taken")
    await expect.poll(() => errorOf("user")).toBe("Taken")
    expect(onSubmit).not.toHaveBeenCalled()

    await screen.getByRole("button", { name: "Save" }).click()
    finish(null)
    await expect.poll(() => onSubmit.mock.calls.length).toBe(1)
    expect(errorOf("user")).toBeNull()
  })

  test("a newer submit supersedes the running check, and the replay goes through once", async () => {
    const finishers: Array<(message: string | null) => void> = []
    const validate = vi.fn(() => new Promise<string | null>((resolve) => finishers.push(resolve)))
    const action = vi.fn()
    const screen = await render(
      <Dilekce action={action}>
        <DilekceField name="user" label="Username" validate={validate}>
          <DilekceInput defaultValue="ada" />
        </DilekceField>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    const save = screen.getByRole("button", { name: "Save" })
    await save.click()
    await save.click()
    await save.click()
    expect(validate).toHaveBeenCalledTimes(3)
    // The older runs answer late, and are ignored.
    finishers[0]!(null)
    finishers[1]!(null)
    await sleep(50)
    expect(action).not.toHaveBeenCalled()
    finishers[2]!(null)
    await expect.poll(() => action.mock.calls.length).toBe(1)
    await sleep(100)
    expect(action).toHaveBeenCalledOnce()
    expect(validate).toHaveBeenCalledTimes(3)
  })

  test("values edited while the check runs are checked again before the submit", async () => {
    const seen: string[] = []
    const validate = vi.fn(async (value: string | string[]) => {
      seen.push(String(value))
      await sleep(80)
      return value === "bad" ? "Not that one" : null
    })
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    const screen = await render(
      <Dilekce onSubmit={onSubmit}>
        <DilekceField name="user" label="Username" validate={validate}>
          <DilekceInput defaultValue="ada" />
        </DilekceField>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Save" }).click()
    $<HTMLInputElement>("[name=user]").value = "bad"
    await expect.poll(() => errorOf("user")).toBe("Not that one")
    expect(seen).toEqual(["ada", "bad"])
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test("a checkbox group's rule gets every checked value", async () => {
    const validate = vi.fn((value: string | string[]) =>
      value.length > 1 ? "Pick one at most" : null,
    )
    const screen = await render(
      <Dilekce>
        <DilekceField name="x" label="X" validate={validate}>
          <DilekceCheckboxGroup
            defaultValue={["a", "b"]}
            options={[
              { value: "a", label: "A" },
              { value: "b", label: "B" },
            ]}
          />
        </DilekceField>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Save" }).click()
    expect(validate).toHaveBeenCalledWith(["a", "b"], expect.any(FormData), {
      signal: expect.any(AbortSignal),
    })
    expect(errorOf("x")).toBe("Pick one at most")
  })
})

describe("a name on the control, not the field", () => {
  const options = [
    { value: "a", label: "A" },
    { value: "b", label: "B" },
  ]

  const prevent = (event: React.FormEvent) => event.preventDefault()

  test("a radio group's rule gets the checked radio", async () => {
    const validate = vi.fn(() => null)
    const screen = await render(
      <Dilekce onSubmit={prevent}>
        <DilekceField label="Pick" validate={validate}>
          <DilekceRadioGroup name="pick" defaultValue="b" options={options} />
        </DilekceField>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Save" }).click()
    expect(validate).toHaveBeenCalledWith("b", expect.any(FormData), expect.anything())
  })

  test("a checkbox group's rule gets only the checked boxes", async () => {
    const validate = vi.fn(() => null)
    const screen = await render(
      <Dilekce onSubmit={prevent}>
        <DilekceField label="Pick" validate={validate}>
          <DilekceCheckboxGroup name="pick" defaultValue={["b"]} options={options} />
        </DilekceField>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Save" }).click()
    expect(validate).toHaveBeenCalledWith(["b"], expect.any(FormData), expect.anything())
  })

  test("a field and its control may carry different names", async () => {
    const validate = vi.fn(() => null)
    const screen = await render(
      <Dilekce onSubmit={prevent} errors={{ control: "Taken" }}>
        <DilekceField name="field" label="Pick" validate={validate}>
          <DilekceInput name="control" defaultValue="hello" />
        </DilekceField>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    // Server errors find the field by the control's name as well.
    expect(errorOf("control")).toBe("Taken")
    await userEvent.type($("[name=control]"), "!")
    expect(errorOf("control")).toBeNull()
    await screen.getByRole("button", { name: "Save" }).click()
    expect(validate).toHaveBeenCalledWith("hello!", expect.any(FormData), expect.anything())
  })
})

describe("disabled", () => {
  const prevent = (event: React.FormEvent) => event.preventDefault()

  const scrub = (label: Element, by: number) => {
    const box = label.getBoundingClientRect()
    const at = (x: number, type: string) =>
      label.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          pointerId: 1,
          clientX: box.left + x,
          clientY: box.top + 4,
        }),
      )
    at(5, "pointerdown")
    at(5 + by, "pointermove")
    at(5 + by, "pointerup")
  }

  test("a disabled control's rule doesn't run and doesn't block the submit", async () => {
    const validate = vi.fn(() => "Never")
    const onSubmit = vi.fn(prevent)
    const screen = await render(
      <Dilekce onSubmit={onSubmit}>
        <DilekceField name="a" label="A" validate={validate}>
          <DilekceInput disabled />
        </DilekceField>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Save" }).click()
    expect(validate).not.toHaveBeenCalled()
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(errorOf("a")).toBeNull()
  })

  test("a disabled section skips every rule and constraint inside it", async () => {
    const validate = vi.fn(() => "Never")
    const onSubmit = vi.fn(prevent)
    const screen = await render(
      <Dilekce onSubmit={onSubmit}>
        <DilekceSection disabled>
          <DilekceField name="a" label="A" validate={validate}>
            <DilekceInput />
          </DilekceField>
          <DilekceField name="b" label="B" validate={validate}>
            <DilekceCheckboxGroup
              required
              name="b"
              options={[
                { value: "x", label: "X" },
                { value: "y", label: "Y" },
              ]}
            />
          </DilekceField>
        </DilekceSection>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Save" }).click()
    expect(validate).not.toHaveBeenCalled()
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(errorOf("a")).toBeNull()
    expect(document.querySelector("[data-slot=dilekce-error]")).toBeNull()
  })

  test("a field with one enabled control is still checked", async () => {
    const validate = vi.fn(() => "Not this")
    const screen = await render(
      <Dilekce onSubmit={prevent}>
        <DilekceField name="a" label="A" validate={validate}>
          <DilekceRadioGroup
            name="a"
            options={[
              { value: "x", label: "X", disabled: true },
              { value: "y", label: "Y" },
            ]}
          />
        </DilekceField>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Save" }).click()
    expect(validate).toHaveBeenCalledOnce()
    expect(errorOf("a")).toBe("Not this")
  })

  test("advance skips fields in a disabled section", async () => {
    await render(
      <Dilekce advance>
        <DilekceField name="a" label="A">
          <DilekceInput />
        </DilekceField>
        <DilekceSection disabled>
          <DilekceField name="b" label="B">
            <DilekceInput />
          </DilekceField>
        </DilekceSection>
        <DilekceField name="c" label="C">
          <DilekceInput />
        </DilekceField>
      </Dilekce>,
    )
    $("[name=a]").focus()
    await userEvent.keyboard("{Enter}")
    expect(document.activeElement).toBe($("[name=c]"))
  })

  test("scrub and the steppers do nothing in a disabled section, even one disabled later", async () => {
    await render(
      <Dilekce>
        <DilekceSection>
          <DilekceField name="qty" label="Qty">
            <DilekceNumber defaultValue={5} scrub={10} />
          </DilekceField>
        </DilekceSection>
      </Dilekce>,
    )
    const input = $<HTMLInputElement>("[name=qty]")
    scrub($("label"), 30)
    expect(input.value).toBe("8")

    $<HTMLFieldSetElement>("fieldset").disabled = true
    scrub($("label"), 30)
    expect(input.value).toBe("8")
    $("button[aria-label=Increase]").dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
    )
    expect(input.value).toBe("8")
  })
})

describe("affixes and counter", () => {
  test("leading and trailing text sit inside the cell, around the value", async () => {
    await render(
      <Dilekce>
        <DilekceField name="price" label="Price">
          <DilekceInput leading="₺" trailing="TRY" defaultValue="40" />
        </DilekceField>
        <DilekceField name="w" label="Weight">
          <DilekceNumber trailing="kg" defaultValue={2} />
        </DilekceField>
      </Dilekce>,
    )
    const [lead, trail] = document.querySelectorAll("[data-slot=dilekce-affix]")
    const input = $("[name=price]").getBoundingClientRect()
    expect(lead!.getBoundingClientRect().right).toBeLessThanOrEqual(input.left)
    expect(trail!.getBoundingClientRect().left).toBeGreaterThanOrEqual(input.right)
    // Not hidden: the control is described by them, so "₺" and "kg" are read.
    expect(lead!.getAttribute("aria-hidden")).toBeNull()
    expect(describedText($("[name=price]"))).toBe("₺ TRY")
    expect(describedText($("[name=w]"))).toBe("kg")
    expect(document.querySelectorAll("[data-slot=dilekce-affix]")).toHaveLength(3)
  })

  test("a field with maxLength counts while focused, and always near the limit", async () => {
    const screen = await render(
      <Dilekce>
        <DilekceField name="bio" label="Bio">
          <DilekceTextarea maxLength={10} />
        </DilekceField>
      </Dilekce>,
    )
    const counter = () => $("[data-slot=dilekce-counter]")
    expect(counter().textContent).toBe("0/10")
    expect(getComputedStyle(counter()).display).toBe("none")

    await screen.getByRole("textbox", { name: "Bio" }).fill("hello")
    expect(counter().textContent).toBe("5/10")
    expect(getComputedStyle(counter()).display).not.toBe("none")

    await userEvent.tab()
    expect(getComputedStyle(counter()).display).toBe("none")
    await screen.getByRole("textbox", { name: "Bio" }).fill("hello worl")
    await userEvent.tab()
    expect(counter().hasAttribute("data-near")).toBe(true)
    expect(getComputedStyle(counter()).display).not.toBe("none")
  })
})

describe("form behaviour", () => {
  test("with advance, Enter moves to the next field and submits from the last", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    const screen = await render(
      <Dilekce advance onSubmit={onSubmit}>
        <DilekceField name="a" label="A">
          <DilekceInput />
        </DilekceField>
        <DilekceField name="size" label="Size">
          <DilekceRadioGroup
            defaultValue="m"
            options={[
              { value: "s", label: "S" },
              { value: "m", label: "M" },
            ]}
          />
        </DilekceField>
        <DilekceField name="b" label="B">
          <DilekceInput />
        </DilekceField>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    await screen.getByRole("textbox", { name: "A" }).click()
    await userEvent.keyboard("{Enter}")
    // The radio group is one stop, at its checked radio.
    expect(document.activeElement).toBe($("input[value=m]"))
    $("[name=b]").focus()
    await userEvent.keyboard("{Enter}")
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  test("advance: Enter on a checked radio moves to the next field's control", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    await render(
      <Dilekce advance onSubmit={onSubmit}>
        <DilekceField name="size" label="Size">
          <DilekceRadioGroup
            defaultValue="m"
            options={[
              { value: "s", label: "S" },
              { value: "m", label: "M" },
            ]}
          />
        </DilekceField>
        <DilekceField name="b" label="B">
          <DilekceInput />
        </DilekceField>
      </Dilekce>,
    )
    $("input[value=m]").focus()
    await userEvent.keyboard("{Enter}")
    expect(document.activeElement).toBe($("[name=b]"))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test("advance: Enter on a checkbox leaves its whole group", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    await render(
      <Dilekce advance onSubmit={onSubmit}>
        <DilekceField name="c" label="C">
          <DilekceCheckboxGroup
            options={[
              { value: "x", label: "X" },
              { value: "y", label: "Y" },
            ]}
          />
        </DilekceField>
        <DilekceField name="b" label="B">
          <DilekceInput />
        </DilekceField>
      </Dilekce>,
    )
    $("input[value=x]").focus()
    await userEvent.keyboard("{Enter}")
    expect(document.activeElement).toBe($("[name=b]"))

    // From the last checkbox group in the form, Enter submits.
    $("[name=b]").remove()
    $("input[value=y]").focus()
    await userEvent.keyboard("{Enter}")
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  test("advance: Enter on a select moves on, and submits from the last field", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    await render(
      <Dilekce advance onSubmit={onSubmit}>
        <DilekceField name="s" label="S">
          <DilekceSelect options={[{ value: "x", label: "X" }]} />
        </DilekceField>
        <DilekceField name="b" label="B">
          <DilekceInput />
        </DilekceField>
        <DilekceField name="t" label="T">
          <DilekceSelect options={[{ value: "y", label: "Y" }]} />
        </DilekceField>
      </Dilekce>,
    )
    $("select[name=s]").focus()
    await userEvent.keyboard("{Enter}")
    expect(document.activeElement).toBe($("[name=b]"))
    $("select[name=t]").focus()
    await userEvent.keyboard("{Enter}")
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  test("onDirtyChange runs outside render, with no React warning", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      function Parent() {
        const [dirty, setDirty] = React.useState(false)
        return (
          <>
            <output data-testid="dirty">{String(dirty)}</output>
            <Dilekce onDirtyChange={setDirty}>
              <DilekceField name="a" label="A">
                <DilekceInput />
              </DilekceField>
            </Dilekce>
          </>
        )
      }
      const screen = await render(<Parent />)
      const input = screen.getByRole("textbox", { name: "A" })
      await input.fill("x")
      await expect.element(screen.getByTestId("dirty")).toHaveTextContent("true")
      await input.fill("")
      await expect.element(screen.getByTestId("dirty")).toHaveTextContent("false")
      const warned = error.mock.calls.some((call) =>
        call.some((arg) => String(arg).includes("Cannot update a component")),
      )
      expect(warned).toBe(false)
    } finally {
      error.mockRestore()
    }
  })

  test("without advance, Enter submits as usual", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    const screen = await render(<Basic onSubmit={onSubmit} />)
    await screen.getByRole("textbox", { name: /Full name/ }).fill("Ada")
    await userEvent.keyboard("{Enter}")
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  test("dirty follows the values, and a submit or reset makes it clean", async () => {
    const onDirtyChange = vi.fn()
    const screen = await render(
      <Dilekce onDirtyChange={onDirtyChange} onSubmit={(event) => event.preventDefault()}>
        <DilekceField name="a" label="A">
          <DilekceInput defaultValue="x" />
        </DilekceField>
        <DilekceField name="c" label="C">
          <DilekceCheckboxGroup options={[{ value: "y", label: "Why" }]} />
        </DilekceField>
        <button type="submit">Save</button>
        <button type="reset">Reset</button>
      </Dilekce>,
    )
    const form = $("form")
    const input = screen.getByRole("textbox", { name: "A" })
    await input.fill("xy")
    expect(form.hasAttribute("data-dirty")).toBe(true)
    expect(onDirtyChange).toHaveBeenLastCalledWith(true)

    await input.fill("x")
    expect(form.hasAttribute("data-dirty")).toBe(false)
    expect(onDirtyChange).toHaveBeenLastCalledWith(false)

    await screen.getByRole("checkbox", { name: "Why" }).click()
    expect(form.hasAttribute("data-dirty")).toBe(true)
    await screen.getByRole("button", { name: "Reset" }).click()
    await expect.poll(() => form.hasAttribute("data-dirty")).toBe(false)
    await expect.element(screen.getByRole("checkbox", { name: "Why" })).not.toBeChecked()

    await input.fill("z")
    await screen.getByRole("button", { name: "Save" }).click()
    expect(form.hasAttribute("data-dirty")).toBe(false)
  })

  test("warnUnsaved asks before leaving only while dirty", async () => {
    const screen = await render(
      <Dilekce warnUnsaved>
        <DilekceField name="a" label="A">
          <DilekceInput />
        </DilekceField>
      </Dilekce>,
    )
    const leave = () => {
      const event = new Event("beforeunload", { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(leave()).toBe(false)
    await screen.getByRole("textbox", { name: "A" }).fill("x")
    expect(leave()).toBe(true)
  })

  test("a stopped submit is announced and reported by name", async () => {
    const onInvalidSubmit = vi.fn()
    const screen = await render(
      <Dilekce onInvalidSubmit={onInvalidSubmit} messages={dilekceMessages.tr}>
        <DilekceField name="a" label="A">
          <DilekceInput required />
        </DilekceField>
        <DilekceField name="b" label="B">
          <DilekceInput required />
        </DilekceField>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Save" }).click()
    expect(screen.getByRole("status").element().textContent).toBe("2 alan düzeltilmeli")
    const fields: DilekceInvalidField[] = onInvalidSubmit.mock.calls[0]![0]
    expect(fields.map(({ name, label, message }) => ({ name, label, message }))).toEqual([
      { name: "a", label: "A", message: "Zorunlu" },
      { name: "b", label: "B", message: "Zorunlu" },
    ])
    expect(fields[0]!.element).toBe($("[name=a]"))
    expect(fields[1]!.element).toBe($("[name=b]"))
  })
})

describe("refs", () => {
  // What react-hook-form's register() hands a control: a name and a ref callback.
  const register = (name: string) => ({ name, ref: vi.fn() })

  test("a ref on the form keeps dirty tracking working", async () => {
    const ref = vi.fn()
    const onDirtyChange = vi.fn()
    await render(
      <Dilekce ref={ref} onDirtyChange={onDirtyChange}>
        <DilekceField name="n" label="N">
          <DilekceInput />
        </DilekceField>
      </Dilekce>,
    )
    expect(ref).toHaveBeenCalledWith($("form"))
    await userEvent.type($("input"), "x")
    expect(onDirtyChange).toHaveBeenLastCalledWith(true)
    expect($("form").hasAttribute("data-dirty")).toBe(true)
  })

  test("a ref on a number keeps the steppers and the scrub working", async () => {
    const field = register("qty")
    const object = React.createRef<HTMLInputElement>()
    const screen = await render(
      <Dilekce>
        <DilekceField label="Qty">
          <DilekceNumber {...field} defaultValue={1} scrub={10} />
        </DilekceField>
        <DilekceField label="Other">
          <DilekceNumber ref={object} name="other" defaultValue={1} />
        </DilekceField>
      </Dilekce>,
    )
    expect(field.ref).toHaveBeenCalledWith($("[name=qty]"))
    expect(object.current).toBe($("[name=other]"))
    await screen.getByRole("button", { name: "Increase Qty" }).click()
    expect($<HTMLInputElement>("[name=qty]").value).toBe("2")

    const label = $("label")
    const box = label.getBoundingClientRect()
    const at = (x: number, type: string) =>
      label.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          pointerId: 1,
          clientX: box.left + x,
          clientY: box.top + 4,
        }),
      )
    at(5, "pointerdown")
    at(35, "pointermove")
    at(35, "pointerup")
    expect($<HTMLInputElement>("[name=qty]").value).toBe("5")
  })

  test("a ref on a select keeps data-empty following a reset", async () => {
    const field = register("size")
    await render(
      <Dilekce>
        <DilekceField label="Size">
          <DilekceSelect {...field} options={[{ value: "a", label: "A" }]} />
        </DilekceField>
        <button type="reset">Reset</button>
      </Dilekce>,
    )
    expect(field.ref).toHaveBeenCalledWith($("select"))
    await userEvent.selectOptions($("select"), "a")
    expect($("select").hasAttribute("data-empty")).toBe(false)
    $<HTMLFormElement>("form").reset()
    await expect.poll(() => $("select").hasAttribute("data-empty")).toBe(true)
  })

  test("a ref on a field keeps its counter and validation working", async () => {
    const ref = React.createRef<HTMLDivElement>()
    const screen = await render(
      <Dilekce>
        <DilekceField ref={ref} name="n" label="N">
          <DilekceInput maxLength={5} required />
        </DilekceField>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    expect(ref.current).toBe($("[data-slot=dilekce-field]"))
    await userEvent.type($("input"), "ab")
    expect($("[data-slot=dilekce-counter]").textContent).toBe("2/5")
    await userEvent.clear($("input"))
    await screen.getByRole("button", { name: "Save" }).click()
    expect(errorOf("n")).toBe("Required")
  })

  test("refs are released on unmount", async () => {
    const ref = vi.fn()
    const object = React.createRef<HTMLDivElement>()
    const screen = await render(
      <Dilekce ref={ref}>
        <DilekceField ref={object} name="n" label="N">
          <DilekceInput />
        </DilekceField>
      </Dilekce>,
    )
    expect(object.current).not.toBeNull()
    await screen.unmount()
    expect(object.current).toBeNull()
    expect(ref).toHaveBeenLastCalledWith(null)
  })
})

describe("values written from code", () => {
  const sizes = [
    { value: "a", label: "A" },
    { value: "b", label: "B" },
  ]
  const dash = (name: string) =>
    getComputedStyle($(`[name=${name}]`).closest("[data-slot=dilekce-field]")!, "::after").content

  test("a select follows select.value, selectedIndex and a form reset", async () => {
    await render(
      <Dilekce mode="filled">
        <DilekceField name="size" label="Size">
          <DilekceSelect options={sizes} />
        </DilekceField>
      </Dilekce>,
    )
    const select = $<HTMLSelectElement>("select")
    expect(select.hasAttribute("data-empty")).toBe(true)
    expect(dash("size")).toContain("—")

    select.value = "a"
    await expect.poll(() => select.hasAttribute("data-empty")).toBe(false)
    expect(dash("size")).not.toContain("—")
    expect(select.value).toBe("a")

    $<HTMLFormElement>("form").reset()
    await expect.poll(() => select.hasAttribute("data-empty")).toBe(true)

    select.selectedIndex = 2
    await expect.poll(() => select.hasAttribute("data-empty")).toBe(false)
    expect(select.value).toBe("b")
  })

  test("a controlled select follows its value prop", async () => {
    let set!: (value: string) => void
    function Controlled() {
      const [value, setValue] = React.useState("")
      React.useEffect(() => {
        set = setValue
      }, [setValue])
      return (
        <Dilekce>
          <DilekceField name="size" label="Size">
            <DilekceSelect options={sizes} value={value} onChange={() => {}} />
          </DilekceField>
        </Dilekce>
      )
    }
    await render(<Controlled />)
    expect($("select").hasAttribute("data-empty")).toBe(true)
    flushSync(() => set("b"))
    expect($("select").hasAttribute("data-empty")).toBe(false)
    flushSync(() => set(""))
    expect($("select").hasAttribute("data-empty")).toBe(true)
  })

  test("a controlled input updates the counter, dirty and a showing message", async () => {
    let set!: (value: string) => void
    const onDirtyChange = vi.fn()
    function Controlled() {
      const [value, setValue] = React.useState("")
      React.useEffect(() => {
        set = setValue
      }, [setValue])
      return (
        <Dilekce onDirtyChange={onDirtyChange}>
          <DilekceField name="code" label="Code">
            <DilekceInput
              required
              maxLength={10}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </DilekceField>
          <button type="submit">Save</button>
        </Dilekce>
      )
    }
    const screen = await render(<Controlled />)
    expect(onDirtyChange).not.toHaveBeenCalled()
    await screen.getByRole("button", { name: "Save" }).click()
    expect(errorOf("code")).toBe("Required")

    flushSync(() => set("123456789"))
    expect(onDirtyChange).toHaveBeenLastCalledWith(true)
    expect($("form").hasAttribute("data-dirty")).toBe(true)
    expect(errorOf("code")).toBeNull()
    // Within 90% of the limit the counter always shows.
    expect($("[data-slot=dilekce-counter]").textContent).toBe("9/10")

    flushSync(() => set(""))
    expect(onDirtyChange).toHaveBeenLastCalledWith(false)
    expect($("form").hasAttribute("data-dirty")).toBe(false)
  })

  test("a value written to an uncontrolled input is seen when focus moves, and on leaving", async () => {
    const screen = await render(
      <Dilekce warnUnsaved>
        <DilekceField name="a" label="A">
          <DilekceInput />
        </DilekceField>
        <DilekceField name="b" label="B">
          <DilekceInput />
        </DilekceField>
      </Dilekce>,
    )
    const leave = () => {
      const event = new Event("beforeunload", { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    $<HTMLInputElement>("[name=a]").value = "set from code"
    // Nothing has happened yet that could tell; leaving the page looks again.
    expect(leave()).toBe(true)
    await expect.poll(() => $("form").hasAttribute("data-dirty")).toBe(true)

    $<HTMLFormElement>("form").reset()
    await expect.poll(() => $("form").hasAttribute("data-dirty")).toBe(false)

    $<HTMLInputElement>("[name=b]").value = "again"
    await screen.getByRole("textbox", { name: "A" }).click()
    await expect.poll(() => $("form").hasAttribute("data-dirty")).toBe(true)
  })

  test("form.reset() from code clears the counter, the select and dirty", async () => {
    await render(
      <Dilekce>
        <DilekceField name="a" label="A">
          <DilekceInput maxLength={9} defaultValue="12345678" />
        </DilekceField>
        <DilekceField name="size" label="Size">
          <DilekceSelect options={sizes} />
        </DilekceField>
      </Dilekce>,
    )
    await userEvent.type($("[name=a]"), "9")
    await userEvent.selectOptions($("select"), "a")
    expect($("[data-slot=dilekce-counter]").textContent).toBe("9/9")
    expect($("form").hasAttribute("data-dirty")).toBe(true)
    $<HTMLFormElement>("form").reset()
    await expect.poll(() => $("[data-slot=dilekce-counter]").textContent).toBe("8/9")
    expect($("select").hasAttribute("data-empty")).toBe(true)
    expect($("form").hasAttribute("data-dirty")).toBe(false)
  })
})

describe("copying a filled form", () => {
  test("each value has a named copy button that copies what the cell says", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
    const screen = await render(
      <Dilekce mode="filled">
        <DilekceRow>
          <DilekceField name="w" label="Weight">
            <DilekceNumber trailing="kg" defaultValue={2} />
          </DilekceField>
          <DilekceField name="kind" label="Kind">
            <DilekceSelect defaultValue="b" options={[{ value: "b", label: "Beta" }]} />
          </DilekceField>
          <DilekceField name="x" label="Extras">
            <DilekceCheckboxGroup
              defaultValue={["a", "c"]}
              options={[
                { value: "a", label: "Alpha" },
                { value: "b", label: "Bravo" },
                { value: "c", label: "Charlie" },
              ]}
            />
          </DilekceField>
          <DilekceField name="empty" label="Empty">
            <DilekceInput />
          </DilekceField>
        </DilekceRow>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Copy Weight" }).click()
    expect(writeText).toHaveBeenLastCalledWith("2 kg")
    await expect.element(screen.getByRole("button", { name: "Copied Weight" })).toBeVisible()

    await screen.getByRole("button", { name: "Copy Kind" }).click()
    expect(writeText).toHaveBeenLastCalledWith("Beta")
    await screen.getByRole("button", { name: "Copy Extras" }).click()
    expect(writeText).toHaveBeenLastCalledWith("Alpha, Charlie")

    const empty = $("[name=empty]")
      .closest("[data-slot=dilekce-field]")!
      .querySelector("[data-slot=dilekce-copy]")!
    expect(getComputedStyle(empty).display).toBe("none")
  })

  test("copyable={false} and edit mode have no copy buttons", async () => {
    await render(
      <>
        <Dilekce mode="filled" copyable={false}>
          <DilekceField name="a" label="A">
            <DilekceInput defaultValue="x" />
          </DilekceField>
        </Dilekce>
        <Dilekce>
          <DilekceField name="b" label="B">
            <DilekceInput defaultValue="y" />
          </DilekceField>
        </Dilekce>
      </>,
    )
    expect(document.querySelector("[data-slot=dilekce-copy]")).toBeNull()
  })
})

/* -------------------------------------------------------------------------- */
/*                                Accessibility                               */
/* -------------------------------------------------------------------------- */

const emulate = (features: Array<{ name: string; value: string }>) =>
  cdp().send("Emulation.setEmulatedMedia", { features })

// vitest.config.ts launches this file's browser with a fine, hovering pointer, so the hover and
// pointer-fine rules are the same on every machine.
beforeAll(() => {
  expect(matchMedia("(pointer: fine)").matches, "the fine project's pointer").toBe(true)
  expect(matchMedia("(hover: hover)").matches, "the fine project's hover").toBe(true)
})

afterEach(async () => {
  document.documentElement.classList.remove("dark")
  await emulate([])
})

/** A CSS color as [r, g, b, a], whatever notation the browser computed it in. */
function rgba(css: string) {
  const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!
  context.fillStyle = css
  context.fillRect(0, 0, 1, 1)
  return [...context.getImageData(0, 0, 1, 1).data]
}

const luminance = (css: string) => {
  const [r = 0, g = 0, b = 0] = rgba(css).map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const ratio = (a: string, b: string) => {
  const [hi = 0, lo = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const style = (el: Element, pseudo?: string) => getComputedStyle(el, pseudo)
const fieldOf = (name: string) => $(`[name=${name}]`).closest<HTMLElement>(FIELD)!
const FIELD = "[data-slot=dilekce-field]"

describe("contrast", () => {
  function Contrast() {
    return (
      <Dilekce>
        <DilekceRow>
          <DilekceField name="name" label="Full name">
            <DilekceInput required />
          </DilekceField>
          <DilekceField name="bio" label="Bio">
            <DilekceTextarea maxLength={40} defaultValue="hello" />
          </DilekceField>
          <DilekceField name="city" label="City">
            <DilekceInput placeholder="Istanbul" />
          </DilekceField>
        </DilekceRow>
        <button type="submit">Save</button>
      </Dilekce>
    )
  }

  for (const theme of ["light", "dark"] as const) {
    test(`${theme}: invalid, hovered and focused cells keep small text at 4.5:1`, async () => {
      document.documentElement.classList.toggle("dark", theme === "dark")
      const screen = await render(<Contrast />)
      await screen.getByRole("button", { name: "Save" }).click()
      const name = fieldOf("name")
      const label = name.querySelector("[data-slot=dilekce-label]")!
      const error = name.querySelector("[data-slot=dilekce-error]")!
      const numbers: Record<string, number> = {}
      const measure = async (state: string, field: HTMLElement, texts: Element[]) => {
        await sleep(300)
        const background = style(field).backgroundColor
        expect(rgba(background)[3], `${state}: the cell is opaque`).toBe(255)
        for (const text of texts) {
          const value = ratio(style(text).color, background)
          numbers[`${state} ${text.getAttribute("data-slot")?.replace("dilekce-", "")}`] = value
          expect(
            value,
            `${theme} ${state} ${text.getAttribute("data-slot")}`,
          ).toBeGreaterThanOrEqual(4.5)
        }
      }

      // Rest, focus away, pointer away.
      ;(document.activeElement as HTMLElement).blur()
      await userEvent.hover(document.body)
      await measure("invalid", name, [label, error])
      await userEvent.hover(label)
      await measure("invalid+hover", name, [label, error])
      await userEvent.hover(document.body)
      $<HTMLInputElement>("[name=name]").focus()
      await measure("invalid+focus", name, [label, error])

      // A plain cell: hovered, with a placeholder; focused, with the counter.
      ;(document.activeElement as HTMLElement).blur()
      const city = fieldOf("city")
      await userEvent.hover(city)
      await measure("hover", city, [city.querySelector("[data-slot=dilekce-label]")!])
      const input = $<HTMLInputElement>("[name=city]")
      const placeholder = style(input, "::placeholder").color
      expect(
        ratio(placeholder, style(city).backgroundColor),
        `${theme} hover placeholder`,
      ).toBeGreaterThanOrEqual(4.5)
      await userEvent.hover(document.body)
      $<HTMLTextAreaElement>("[name=bio]").focus()
      const bio = fieldOf("bio")
      await measure("focus", bio, [bio.querySelector("[data-slot=dilekce-counter]")!])
      console.info(
        `contrast ${theme}`,
        JSON.stringify(numbers, (_k, v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v)),
      )
    })
  }
})

describe("forced colors", () => {
  function Forced() {
    return (
      <Dilekce>
        <DilekceSection legend="Parcel">
          <DilekceRow>
            <DilekceField name="name" label="Name">
              <DilekceInput />
            </DilekceField>
            <DilekceField name="kind" label="Kind">
              <DilekceRadioGroup
                name="kind"
                defaultValue="a"
                options={[
                  { value: "a", label: "Alpha" },
                  { value: "b", label: "Bravo" },
                ]}
              />
            </DilekceField>
            <DilekceField name="extras" label="Extras">
              <DilekceCheckboxGroup
                defaultValue={["x"]}
                options={[
                  { value: "x", label: "Xray" },
                  { value: "y", label: "Yankee" },
                ]}
              />
            </DilekceField>
          </DilekceRow>
        </DilekceSection>
      </Dilekce>
    )
  }

  for (const theme of ["light", "dark"] as const) {
    test(`${theme}: the focused cell has an outline, the grid has borders, checked marks differ`, async () => {
      document.documentElement.classList.toggle("dark", theme === "dark")
      await emulate([{ name: "forced-colors", value: "active" }])
      expect(matchMedia("(forced-colors: active)").matches).toBe(true)
      await render(<Forced />)

      const name = fieldOf("name")
      // The lines between cells are borders: backgrounds are gone, gaps show Canvas.
      expect(style(name).borderTopWidth).toBe("1px")
      expect(style(name).borderTopStyle).toBe("solid")
      expect(style($("[data-slot=dilekce-row]")).columnGap).toBe("0px")
      expect(style($("[data-slot=dilekce-legend]")).borderTopWidth).toBe("1px")

      // The box-shadow focus line is stripped; the outline is what shows.
      expect(style(name).outlineStyle).toBe("none")
      $<HTMLInputElement>("[name=name]").focus()
      await sleep(250)
      expect(style(name).outlineStyle).toBe("solid")
      expect(style(name).outlineWidth).toBe("3px")
      expect(style(name).outlineColor).not.toBe(style(name).backgroundColor)

      // Checked and unchecked marks differ without any shadow or fill from us.
      const [on, off] = [...document.querySelectorAll<HTMLInputElement>("input[type=radio]")]
      expect(style(on!).borderTopWidth).not.toBe(style(off!).borderTopWidth)
      expect(style(on!).borderTopColor).not.toBe(style(off!).borderTopColor)
      const [ticked, empty] = [
        ...document.querySelectorAll<HTMLInputElement>("input[type=checkbox]"),
      ]
      expect(style(ticked!).backgroundColor).not.toBe(style(empty!).backgroundColor)
      // The tick is drawn in the system color for text on Highlight.
      const tick = ticked!.nextElementSibling!
      expect(style(tick).display).not.toBe("none")
      expect(ratio(style(tick).color, style(ticked!).backgroundColor)).toBeGreaterThanOrEqual(4.5)
    })
  }

  test("outside forced colors none of that applies", async () => {
    await render(<Forced />)
    expect(style(fieldOf("name")).borderTopWidth).toBe("0px")
  })
})

describe("announcements", () => {
  function Announced() {
    return (
      <Dilekce>
        <DilekceRow>
          <DilekceField name="email" label="Email">
            <DilekceInput type="email" />
          </DilekceField>
          <DilekceField
            name="user"
            label="Username"
            validate={(value) =>
              new Promise((resolve) =>
                setTimeout(() => resolve(value === "taken" ? "Already used" : null), 200),
              )
            }
          >
            <DilekceInput />
          </DilekceField>
        </DilekceRow>
        <DilekceActions>
          <button type="submit">Save</button>
        </DilekceActions>
      </Dilekce>
    )
  }
  const region = () => $("[role=status]")

  test("a blur error is read once with its label, and typing doesn't repeat it", async () => {
    const screen = await render(<Announced />)
    expect(document.querySelectorAll("[aria-live=polite]")).toHaveLength(1)
    const email = screen.getByRole("textbox", { name: "Email" })
    await email.fill("x")
    await userEvent.tab()
    await expect.poll(() => region().textContent).toBe("Email: Check format")

    // The message stays the same while the value is still wrong.
    let writes = 0
    const watch = new MutationObserver(() => writes++)
    watch.observe(region(), { childList: true, characterData: true, subtree: true })
    await email.click()
    await userEvent.keyboard("yz")
    await sleep(150)
    expect(errorOf("email")).toBe("Check format")
    expect(writes).toBe(0)

    // Fixed, then broken again: said again.
    await email.fill("a@b.co")
    await userEvent.tab()
    await sleep(100)
    await email.fill("zz")
    await userEvent.tab()
    await expect.poll(() => writes).toBeGreaterThan(0)
    expect(region().textContent).toContain("Email: Check format")
    watch.disconnect()
  })

  test("Checking… and the result are announced", async () => {
    const screen = await render(<Announced />)
    await screen.getByRole("textbox", { name: "Username" }).fill("taken")
    await userEvent.tab()
    await expect.poll(() => region().textContent).toBe("Username: Checking…")
    await expect.poll(() => region().textContent).toBe("Username: Already used")
  })

  test("a failed submit says the count, not every message", async () => {
    const screen = await render(
      <Dilekce>
        <DilekceField name="a" label="A">
          <DilekceInput required />
        </DilekceField>
        <DilekceField name="b" label="B">
          <DilekceInput required />
        </DilekceField>
        <button type="submit">Save</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Save" }).click()
    await sleep(100)
    expect(region().textContent).toBe("2 fields need attention")
  })

  test("errors from outside are announced when they arrive", async () => {
    function Server() {
      const [errors, setErrors] = React.useState<DilekceErrors>({})
      return (
        <Dilekce errors={errors}>
          <DilekceField name="a" label="A">
            <DilekceInput />
          </DilekceField>
          <DilekceField name="b" label="B">
            <DilekceInput />
          </DilekceField>
          <button type="button" onClick={() => setErrors({ a: "Taken", b: "Taken too" })}>
            Fail
          </button>
        </Dilekce>
      )
    }
    const screen = await render(<Server />)
    await screen.getByRole("button", { name: "Fail" }).click()
    await expect.poll(() => region().textContent).toBe("A: Taken. B: Taken too")
  })

  test("copying is announced", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
    const screen = await render(
      <Dilekce mode="filled">
        <DilekceField name="w" label="Weight">
          <DilekceInput defaultValue="2" />
        </DilekceField>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Copy Weight" }).click()
    await expect.poll(() => region().textContent).toBe("Weight: Copied")
  })
})

describe("checkbox group semantics", () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Bravo" },
  ]

  test("required is said in words on the group; no aria-required or aria-readonly on a group", async () => {
    await render(
      <Dilekce>
        <DilekceField name="x" label="Extras">
          <DilekceCheckboxGroup required options={options} />
        </DilekceField>
      </Dilekce>,
    )
    const group = $("[role=group]")
    expect(group.hasAttribute("aria-required")).toBe(false)
    expect(group.hasAttribute("aria-readonly")).toBe(false)
    expect(describedText(group)).toBe("Required")
    // Native required would demand every box; none carries it.
    expect(document.querySelector("input[required]")).toBeNull()
  })

  test("read-only is on each checkbox, and nowhere on the group", async () => {
    await render(
      <Dilekce mode="filled">
        <DilekceField name="x" label="Extras">
          <DilekceCheckboxGroup defaultValue={["a"]} options={options} />
        </DilekceField>
      </Dilekce>,
    )
    expect($("[role=group]").hasAttribute("aria-readonly")).toBe(false)
    const boxes = [...document.querySelectorAll("input[type=checkbox]")]
    expect(boxes).toHaveLength(2)
    expect(boxes.every((box) => box.getAttribute("aria-readonly") === "true")).toBe(true)
  })
})

describe("steppers and targets", () => {
  function Weight(props: { mode?: DilekceMode }) {
    return (
      <Dilekce mode={props.mode}>
        <DilekceField name="w" label="Weight">
          <DilekceNumber min={0} max={9} defaultValue={1} trailing="kg" />
        </DilekceField>
        <DilekceField name="p" label="Pieces">
          <DilekceNumber min={0} max={9} defaultValue={1} />
        </DilekceField>
      </Dilekce>
    )
  }

  test("each stepper is named with its field and is 24px", async () => {
    const screen = await render(<Weight />)
    for (const name of [
      "Decrease Weight",
      "Increase Weight",
      "Decrease Pieces",
      "Increase Pieces",
    ]) {
      const button = screen.getByRole("button", { name }).element()
      const box = button.getBoundingClientRect()
      expect(box.width).toBeGreaterThanOrEqual(24)
      expect(box.height).toBeGreaterThanOrEqual(24)
    }
  })

  test("a click without a press steps once; a press steps once and repeats while held", async () => {
    const screen = await render(<Weight />)
    const input = $<HTMLInputElement>("[name=w]")
    const plus = screen
      .getByRole("button", { name: "Increase Weight" })
      .element() as HTMLButtonElement
    // Keyboard, assistive tech, voice control and scripts click with no pointer events.
    plus.click()
    plus.click()
    expect(input.value).toBe("3")

    // A real press steps on pointerdown, the click after it doesn't step again.
    await screen.getByRole("button", { name: "Increase Weight" }).click()
    expect(input.value).toBe("4")

    // Held: steps repeat.
    plus.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }))
    await sleep(700)
    plus.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0 }))
    expect(Number(input.value)).toBeGreaterThan(6)
  })

  for (const density of ["compact", "comfortable", "roomy"] as const) {
    test(`${density}: the copy button is 24px and over the label row, not the value`, async () => {
      await render(
        <Dilekce mode="filled" density={density}>
          <DilekceField name="w" label="Weight">
            <DilekceInput defaultValue="2" />
          </DilekceField>
        </Dilekce>,
      )
      const box = $("[data-slot=dilekce-copy]").getBoundingClientRect()
      expect(box.width).toBeGreaterThanOrEqual(24)
      expect(box.height).toBeGreaterThanOrEqual(24)
      // It floats over the label row; at most the control's line-height padding is shared.
      expect(box.bottom).toBeLessThanOrEqual($("[name=w]").getBoundingClientRect().top + 4)
    })
  }

  for (const theme of ["light", "dark"] as const) {
    test(`${theme}: the copy button, radios and checkboxes focus with an outline over 3:1`, async () => {
      document.documentElement.classList.toggle("dark", theme === "dark")
      await render(
        <>
          <Dilekce mode="filled">
            <DilekceField name="w" label="Weight">
              <DilekceInput defaultValue="2" />
            </DilekceField>
          </Dilekce>
          <Dilekce>
            <DilekceField name="k" label="Kind">
              <DilekceRadioGroup
                defaultValue="a"
                options={[
                  { value: "a", label: "Alpha" },
                  { value: "b", label: "Bravo" },
                ]}
              />
            </DilekceField>
            <DilekceField name="x" label="Extras">
              <DilekceCheckboxGroup options={[{ value: "a", label: "Alpha" }]} />
            </DilekceField>
          </Dilekce>
        </>,
      )
      // Filled: the (read-only) value, then its copy button; then the radio, the checkbox.
      for (const kind of ["text", "button", "radio", "checkbox"]) {
        await userEvent.tab()
        if (kind === "text") continue
        const target = document.activeElement as HTMLInputElement | HTMLButtonElement
        expect(target.type).toBe(kind)
        const field = target.closest(FIELD)!
        expect(style(target).outlineStyle).toBe("solid")
        expect(
          ratio(style(target).outlineColor, style(field).backgroundColor),
          `${theme} ${kind}`,
        ).toBeGreaterThanOrEqual(3)
      }
    })
  }
})

describe("reduced motion", () => {
  test("transitions and the pulse stop", async () => {
    await emulate([{ name: "prefers-reduced-motion", value: "reduce" }])
    const screen = await render(
      <Dilekce>
        <DilekceField name="u" label="User" validate={() => new Promise<null>(() => {})}>
          <DilekceInput defaultValue="a" />
        </DilekceField>
        <DilekceField name="n" label="N">
          <DilekceNumber />
        </DilekceField>
      </Dilekce>,
    )
    expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true)
    expect(style(fieldOf("u")).transitionProperty).toBe("none")
    expect(style($("button[aria-label=Increase]")).transitionProperty).toBe("none")
    await screen.getByRole("textbox", { name: "User" }).click()
    await userEvent.keyboard("b")
    await userEvent.tab()
    await expect.poll(() => document.querySelector("[data-slot=dilekce-pending]")).not.toBeNull()
    expect(style($("[data-slot=dilekce-pending]")).animationName).toBe("none")
  })
})

describe("async checks that go wrong", () => {
  const prevent = (event: React.FormEvent) => event.preventDefault()

  test("a rule that never settles doesn't block the next submit", async () => {
    const onSubmit = vi.fn(prevent)
    let hang = true
    const validate = () => (hang ? new Promise<string>(() => {}) : "")
    await render(
      <Dilekce onSubmit={onSubmit}>
        <DilekceField name="a" label="A" validate={validate}>
          <DilekceInput />
        </DilekceField>
        <button type="submit">Go</button>
      </Dilekce>,
    )
    $<HTMLFormElement>("form").requestSubmit()
    await sleep(30)
    expect($("form").dataset.checking).toBe("true")
    hang = false
    $<HTMLFormElement>("form").requestSubmit()
    await expect.poll(() => onSubmit.mock.calls.length).toBe(1)
    expect($("form").dataset.checking).toBeUndefined()
  })

  test("a newer submit that finishes at once also drops the running check", async () => {
    const onSubmit = vi.fn(prevent)
    let slow = true
    const validate = (value: string | string[]) =>
      slow && value === "" ? new Promise<string>(() => {}) : ""
    await render(
      <Dilekce onSubmit={onSubmit}>
        <DilekceField name="a" label="A" validate={validate}>
          <DilekceInput />
        </DilekceField>
        <button type="submit">Go</button>
      </Dilekce>,
    )
    $<HTMLFormElement>("form").requestSubmit()
    await sleep(30)
    slow = false
    $<HTMLFormElement>("form").requestSubmit()
    await sleep(30)
    expect(onSubmit).toHaveBeenCalledOnce()
    expect($("form").dataset.checking).toBeUndefined()
  })

  test("the rule gets a signal, aborted by a newer check, a reset and an unmount", async () => {
    const signals: AbortSignal[] = []
    const validate = (
      _value: string | string[],
      _data: FormData,
      options: { signal: AbortSignal },
    ) => {
      // (Absent from a validator that predates the signal.)
      if (options) signals.push(options.signal)
      return new Promise<string>(() => {})
    }
    const screen = await render(
      <Dilekce onSubmit={prevent}>
        <DilekceField name="a" label="A" validate={validate}>
          <DilekceInput />
        </DilekceField>
        <button type="submit">Go</button>
      </Dilekce>,
    )
    const form = $<HTMLFormElement>("form")
    form.requestSubmit()
    await sleep(10)
    expect(signals).toHaveLength(1)
    expect(signals[0]!.aborted).toBe(false)
    // A newer check of the field.
    form.requestSubmit()
    await sleep(10)
    expect(signals).toHaveLength(2)
    expect(signals[0]!.aborted).toBe(true)
    expect(signals[1]!.aborted).toBe(false)
    // A reset.
    form.reset()
    await sleep(10)
    expect(signals[1]!.aborted).toBe(true)
    // An unmount.
    form.requestSubmit()
    await sleep(10)
    expect(signals[2]!.aborted).toBe(false)
    screen.unmount()
    expect(signals[2]!.aborted).toBe(true)
  })

  test("a stale answer doesn't fail the submit; the newest outcome does", async () => {
    const onSubmit = vi.fn(prevent)
    const onInvalidSubmit = vi.fn()
    const runs: Array<(message: string) => void> = []
    await render(
      <Dilekce onSubmit={onSubmit} onInvalidSubmit={onInvalidSubmit}>
        <DilekceField
          name="a"
          label="A"
          validate={() => new Promise<string>((resolve) => runs.push(resolve))}
        >
          <DilekceInput />
        </DilekceField>
        <button type="submit">Go</button>
      </Dilekce>,
    )
    $<HTMLFormElement>("form").requestSubmit()
    await sleep(10)
    await userEvent.type($("[name=a]"), "x")
    await userEvent.tab()
    await expect.poll(() => runs.length).toBe(2)
    // The newest run is fine, the older one (for the old value) says no.
    runs[1]!("")
    runs[0]!("Bad for empty")
    // The submit goes on and validates the edited value once more.
    await expect.poll(() => runs.length).toBe(3)
    runs[2]!("")
    await expect.poll(() => onSubmit.mock.calls.length).toBe(1)
    expect(onInvalidSubmit).not.toHaveBeenCalled()
    expect(errorOf("a")).toBeNull()
  })

  test("a control without a name edited during the check is checked again", async () => {
    const onSubmit = vi.fn(prevent)
    let release: (message: string) => void = () => {}
    let first = true
    const validate = () => {
      if (!first) return Promise.resolve("")
      return new Promise<string>((resolve) => (release = resolve))
    }
    await render(
      <Dilekce onSubmit={onSubmit}>
        <DilekceField label="Slow" validate={validate}>
          <DilekceInput data-testid="slow" />
        </DilekceField>
        <DilekceField label="Req">
          <DilekceInput required data-testid="req" />
        </DilekceField>
        <button type="submit">Go</button>
      </Dilekce>,
    )
    const req = $<HTMLInputElement>("[data-testid=req]")
    await userEvent.type(req, "x")
    $<HTMLFormElement>("form").requestSubmit()
    await sleep(20)
    await userEvent.clear(req)
    first = false
    release("")
    await expect
      .poll(() => req.closest("[data-slot=dilekce-field]")?.getAttribute("data-invalid"))
      .toBe("true")
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test("nothing happens after the form unmounts", async () => {
    const onSubmit = vi.fn(prevent)
    const onInvalidSubmit = vi.fn()
    let release: (message: string) => void = () => {}
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const screen = await render(
      <Dilekce onSubmit={onSubmit} onInvalidSubmit={onInvalidSubmit}>
        <DilekceField
          name="s"
          label="Slow"
          validate={() => new Promise<string>((resolve) => (release = resolve))}
        >
          <DilekceInput />
        </DilekceField>
      </Dilekce>,
    )
    $<HTMLFormElement>("form").requestSubmit()
    await sleep(10)
    screen.unmount()
    release("Bad")
    await sleep(50)
    expect(onInvalidSubmit).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  test("a reset button outside the form clears server errors from a click", async () => {
    await render(
      <div>
        <Dilekce id="outside" errors={{ a: "Taken" }}>
          <DilekceField name="a" label="A">
            <DilekceInput />
          </DilekceField>
        </Dilekce>
        <button type="reset" form="outside">
          Reset
        </button>
      </div>,
    )
    expect(errorOf("a")).toBe("Taken")
    $<HTMLButtonElement>("button[type=reset]").click()
    await expect.poll(() => errorOf("a")).toBeNull()
  })

  test("a reset button outside the form clears server errors from the keyboard", async () => {
    await render(
      <div>
        <Dilekce id="outside" errors={{ a: "Taken" }}>
          <DilekceField name="a" label="A">
            <DilekceInput />
          </DilekceField>
        </Dilekce>
        <button type="reset" form="outside">
          Reset
        </button>
      </div>,
    )
    $<HTMLButtonElement>("button[type=reset]").focus()
    await userEvent.keyboard("{Enter}")
    await expect.poll(() => errorOf("a")).toBeNull()
  })

  test("a reset button of another form leaves this form's errors alone", async () => {
    await render(
      <div>
        <Dilekce id="one" errors={{ a: "Taken" }}>
          <DilekceField name="a" label="A">
            <DilekceInput />
          </DilekceField>
        </Dilekce>
        <form id="two" />
        <button type="reset" form="two">
          Reset
        </button>
      </div>,
    )
    $<HTMLButtonElement>("button[type=reset]").click()
    await sleep(50)
    expect(errorOf("a")).toBe("Taken")
  })

  test("a controlled value and its rule changing together are checked with the new rule", async () => {
    function Page() {
      const [state, set] = React.useState({ value: "a", match: "b" })
      return (
        <Dilekce onSubmit={prevent}>
          <DilekceField
            name="a"
            label="A"
            validate={(value) => (value === state.match ? null : "No match")}
          >
            <DilekceInput value={state.value} onChange={() => {}} />
          </DilekceField>
          <button type="submit">Go</button>
          <button type="button" onClick={() => set({ value: "c", match: "c" })}>
            Both
          </button>
        </Dilekce>
      )
    }
    await render(<Page />)
    $<HTMLFormElement>("form").requestSubmit()
    await expect.poll(() => errorOf("a")).toBe("No match")
    $<HTMLButtonElement>("button[type=button]").click()
    await sleep(30)
    expect(errorOf("a")).toBeNull()
  })

  test("a disabled control's value isn't the field's value", async () => {
    const validate = vi.fn(() => null)
    await render(
      <Dilekce onSubmit={prevent}>
        <DilekceField name="a" label="A" validate={validate}>
          <DilekceInput name="first" disabled defaultValue="x" />
          <DilekceInput name="second" defaultValue="y" />
        </DilekceField>
        <button type="submit">Go</button>
      </Dilekce>,
    )
    $<HTMLFormElement>("form").requestSubmit()
    await sleep(20)
    expect(validate).toHaveBeenCalledWith("y", expect.any(FormData), expect.anything())
  })
})

/* -------------------------------------------------------------------------- */
/*                               Error summary                                */
/* -------------------------------------------------------------------------- */

describe("error summary", () => {
  const kinds = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
  ]
  const SUMMARY = "[data-slot=dilekce-summary]"
  const links = () => [...document.querySelectorAll<HTMLAnchorElement>(`${SUMMARY} a`)]

  function Summarised({
    onInvalidSubmit,
    mode,
    messages,
    title,
    spacer = false,
  }: {
    onInvalidSubmit?: (fields: DilekceInvalidField[]) => void
    mode?: DilekceMode
    messages?: typeof dilekceMessages.tr
    title?: React.ReactNode
    spacer?: boolean
  }) {
    return (
      <Dilekce
        mode={mode}
        messages={messages}
        onInvalidSubmit={onInvalidSubmit}
        onSubmit={(event) => event.preventDefault()}
      >
        <DilekceSummary title={title} />
        <DilekceRow>
          <DilekceField name="name" label="Full name">
            <DilekceInput required />
          </DilekceField>
          <DilekceField name="email" label="Email">
            <DilekceInput type="email" required />
          </DilekceField>
        </DilekceRow>
        {spacer && <div style={{ height: 3000 }} />}
        <DilekceField name="kind" label="Kind">
          <DilekceRadioGroup name="kind" required options={kinds} />
        </DilekceField>
        <DilekceActions>
          <button type="submit">Save</button>
          <button type="reset">Reset</button>
        </DilekceActions>
      </Dilekce>
    )
  }

  test("renders nothing until a submit is stopped", async () => {
    await render(<Summarised />)
    expect(document.querySelector(SUMMARY)).toBeNull()
  })

  test("a stopped submit lists a link per invalid field and focuses the summary", async () => {
    const screen = await render(<Summarised />)
    await screen.getByRole("button", { name: "Save" }).click()
    const summary = $(SUMMARY)
    expect(document.activeElement).toBe(summary)
    expect(summary.getAttribute("tabindex")).toBe("-1")
    expect(summary.getAttribute("role")).not.toBe("alert")
    expect(document.getElementById(summary.getAttribute("aria-labelledby")!)?.textContent).toBe(
      "There is a problem",
    )
    expect(links().map((link) => link.textContent)).toEqual([
      "Full name: Required",
      "Email: Required",
      "Kind: Required",
    ])
    // Each link points at its control; a radio group at its first radio.
    expect(links().map((link) => link.getAttribute("href"))).toEqual([
      `#${$("[name=name]").id}`,
      `#${$("[name=email]").id}`,
      `#${$("[name=kind]").id}`,
    ])
    expect(document.getElementById($("[name=kind]").id)).toBe($("[name=kind]"))
    // The cells still show their own message; the form still counts.
    expect(errorOf("name")).toBe("Required")
    expect(screen.getByRole("status").element().textContent).toBe("3 fields need attention")
  })

  test("without a summary the first invalid field is focused, as before", async () => {
    const screen = await render(<Basic />)
    await screen.getByRole("button", { name: "Save" }).click()
    expect(document.activeElement).toBe($("[name=name]"))
  })

  test("a link focuses its control and scrolls it into view instead of changing the hash", async () => {
    const screen = await render(<Summarised spacer />)
    await screen.getByRole("button", { name: "Save" }).click()
    const before = location.hash
    const link = links()[2]!
    link.click()
    expect(document.activeElement).toBe($("[name=kind]"))
    expect(location.hash).toBe(before)
    const box = $("[name=kind]").getBoundingClientRect()
    expect(box.top).toBeGreaterThanOrEqual(0)
    expect(box.bottom).toBeLessThanOrEqual(window.innerHeight)
  })

  test("a line goes when its field turns valid; the summary hides when none is left", async () => {
    const screen = await render(<Summarised />)
    await screen.getByRole("button", { name: "Save" }).click()
    expect(links()).toHaveLength(3)
    await userEvent.type($("[name=name]"), "Ada")
    await expect
      .poll(() => links().map((link) => link.textContent))
      .toEqual(["Email: Required", "Kind: Required"])
    // The message follows the field live.
    await userEvent.type($("[name=email]"), "nope")
    await expect.poll(() => links()[0]?.textContent).toBe("Email: Check format")
    await userEvent.type($("[name=email]"), "@x.org")
    await userEvent.click(document.querySelectorAll<HTMLElement>("[name=kind]")[1]!)
    await expect.poll(() => document.querySelector(SUMMARY)).toBeNull()
  })

  test("a reset hides it, and a valid submit too", async () => {
    const screen = await render(<Summarised />)
    await screen.getByRole("button", { name: "Save" }).click()
    expect(document.querySelector(SUMMARY)).not.toBeNull()
    await screen.getByRole("button", { name: "Reset" }).click()
    await expect.poll(() => document.querySelector(SUMMARY)).toBeNull()

    await screen.getByRole("button", { name: "Save" }).click()
    expect(document.querySelector(SUMMARY)).not.toBeNull()
    await userEvent.type($("[name=name]"), "Ada")
    await userEvent.type($("[name=email]"), "a@b.co")
    await userEvent.click($("[name=kind]"))
    await screen.getByRole("button", { name: "Save" }).click()
    expect(document.querySelector(SUMMARY)).toBeNull()
  })

  test("a second stopped submit takes focus again", async () => {
    const screen = await render(<Summarised />)
    await screen.getByRole("button", { name: "Save" }).click()
    $<HTMLInputElement>("[name=name]").focus()
    $<HTMLFormElement>("form").requestSubmit()
    await expect.poll(() => document.activeElement).toBe($(SUMMARY))
  })

  test("the heading is a message", async () => {
    const screen = await render(<Summarised messages={dilekceMessages.tr} />)
    await screen.getByRole("button", { name: "Save" }).click()
    expect($("[data-slot=dilekce-summary-title]").textContent).toBe("Bir sorun var")
  })

  test("the title prop replaces the heading", async () => {
    const screen = await render(<Summarised title="Fix these" />)
    await screen.getByRole("button", { name: "Save" }).click()
    expect($("[data-slot=dilekce-summary-title]").textContent).toBe("Fix these")
  })

  test("onInvalidSubmit gets name, label, message and the control", async () => {
    const onInvalidSubmit = vi.fn()
    const screen = await render(<Summarised onInvalidSubmit={onInvalidSubmit} />)
    await screen.getByRole("button", { name: "Save" }).click()
    const fields: DilekceInvalidField[] = onInvalidSubmit.mock.calls[0]![0]
    expect(fields.map((f) => [f.name, f.label, f.message])).toEqual([
      ["name", "Full name", "Required"],
      ["email", "Email", "Required"],
      ["kind", "Kind", "Required"],
    ])
    expect(fields[0]!.element).toBe($("[name=name]"))
  })

  test("it is hidden in filled mode and in print", async () => {
    const screen = await render(<Summarised />)
    await screen.getByRole("button", { name: "Save" }).click()
    expect(getComputedStyle($(SUMMARY)).display).not.toBe("none")
    await cdp().send("Emulation.setEmulatedMedia", { media: "print" })
    expect(getComputedStyle($(SUMMARY)).display).toBe("none")
    await emulate([])
    await screen.rerender(<Summarised mode="filled" />)
    expect(getComputedStyle($(SUMMARY)).display).toBe("none")
  })

  test("it spans the grid with a destructive accent", async () => {
    const screen = await render(<Summarised />)
    await screen.getByRole("button", { name: "Save" }).click()
    const summary = $(SUMMARY)
    expect(summary.getBoundingClientRect().width).toBe($("form").clientWidth)
    expect(style(summary).borderLeftWidth).toBe("4px")
  })

  for (const theme of ["light", "dark"] as const) {
    test(`${theme}: heading and links keep 4.5:1`, async () => {
      document.documentElement.classList.toggle("dark", theme === "dark")
      const screen = await render(<Summarised />)
      await screen.getByRole("button", { name: "Save" }).click()
      const summary = $(SUMMARY)
      const background = style(summary).backgroundColor
      expect(rgba(background)[3]).toBe(255)
      for (const text of [$("[data-slot=dilekce-summary-title]"), ...links()]) {
        expect(
          ratio(style(text).color, background),
          `${theme} ${text.textContent}`,
        ).toBeGreaterThanOrEqual(4.5)
      }
    })
  }
})

/* -------------------------------------------------------------------------- */
/*                               Standard Schema                              */
/* -------------------------------------------------------------------------- */

describe("schema", () => {
  const prevent = (event: React.FormEvent) => event.preventDefault()
  const save = (name: string) => `${name}`

  const Signup = z.object({
    name: z.string().min(3, "At least 3 letters"),
    age: z.coerce.number().min(18, "Adults only"),
  })

  function Form({
    schema = Signup,
    onValidSubmit,
    onInvalidSubmit,
    onSubmit = prevent,
  }: {
    schema?: StandardSchemaV1
    onValidSubmit?: (value: unknown, event: React.FormEvent<HTMLFormElement>) => void
    onInvalidSubmit?: (fields: DilekceInvalidField[]) => void
    onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void
  }) {
    return (
      <Dilekce
        schema={schema}
        onValidSubmit={onValidSubmit}
        onInvalidSubmit={onInvalidSubmit}
        onSubmit={onSubmit}
      >
        <DilekceSummary />
        <DilekceRow>
          <DilekceField name="name" label="Name">
            <DilekceInput />
          </DilekceField>
          <DilekceField name="age" label="Age">
            <DilekceNumber />
          </DilekceField>
        </DilekceRow>
        <button type="submit">{save("Go")}</button>
      </Dilekce>
    )
  }

  test("issues land on their fields on submit, in the summary and in onInvalidSubmit", async () => {
    const onValidSubmit = vi.fn()
    const onInvalidSubmit = vi.fn()
    const screen = await render(
      <Form onValidSubmit={onValidSubmit} onInvalidSubmit={onInvalidSubmit} />,
    )
    await userEvent.type($("[name=name]"), "ab")
    await userEvent.type($("[name=age]"), "5")
    await screen.getByRole("button", { name: "Go" }).click()
    expect(errorOf("name")).toBe("At least 3 letters")
    expect(errorOf("age")).toBe("Adults only")
    expect(onValidSubmit).not.toHaveBeenCalled()
    expect(
      [...document.querySelectorAll("[data-slot=dilekce-summary] a")].map((a) => a.textContent),
    ).toEqual(["Name: At least 3 letters", "Age: Adults only"])
    expect(onInvalidSubmit.mock.calls[0]![0].map((f: DilekceInvalidField) => f.name)).toEqual([
      "name",
      "age",
    ])
  })

  test("the schema runs after constraints and the field's own rule", async () => {
    const screen = await render(
      <Dilekce schema={Signup} onSubmit={prevent}>
        <DilekceField name="name" label="Name">
          <DilekceInput required />
        </DilekceField>
        <DilekceField name="age" label="Age" validate={(v) => v === "7" && "Not seven"}>
          <DilekceNumber />
        </DilekceField>
        <button type="submit">Go</button>
      </Dilekce>,
    )
    await userEvent.type($("[name=age]"), "7")
    await screen.getByRole("button", { name: "Go" }).click()
    // Name is empty: the browser's "Required", not the schema's "At least 3 letters".
    expect(errorOf("name")).toBe("Required")
    // The field's rule beats the schema's "Adults only".
    expect(errorOf("age")).toBe("Not seven")
  })

  test("on blur only that field's issues show, and they follow typing live", async () => {
    await render(<Form />)
    await userEvent.type($("[name=name]"), "ab")
    await userEvent.tab()
    expect(errorOf("name")).toBe("At least 3 letters")
    // The age field was never touched: the schema's issue for it stays hidden.
    expect(errorOf("age")).toBeNull()
    await userEvent.type($("[name=name]"), "c")
    await expect.poll(() => errorOf("name")).toBeNull()
  })

  test("a valid submit gets the schema's parsed output; onSubmit still runs", async () => {
    const onValidSubmit = vi.fn()
    const onSubmit = vi.fn(prevent)
    const screen = await render(<Form onValidSubmit={onValidSubmit} onSubmit={onSubmit} />)
    await userEvent.type($("[name=name]"), "Ada")
    await userEvent.type($("[name=age]"), "36")
    await screen.getByRole("button", { name: "Go" }).click()
    expect(onValidSubmit).toHaveBeenCalledTimes(1)
    expect(onValidSubmit.mock.calls[0]![0]).toEqual({ name: "Ada", age: 36 })
    expect(onValidSubmit.mock.calls[0]![1].type).toBe("submit")
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  test("without a schema onValidSubmit gets the values", async () => {
    const onValidSubmit = vi.fn()
    const screen = await render(
      <Dilekce onSubmit={prevent} onValidSubmit={onValidSubmit}>
        <DilekceField name="name" label="Name">
          <DilekceInput defaultValue="Ada" />
        </DilekceField>
        <DilekceField name="bio" label="Bio">
          <DilekceTextarea defaultValue="Hi" />
        </DilekceField>
        <DilekceField name="age" label="Age">
          <DilekceNumber defaultValue={36} />
        </DilekceField>
        <DilekceField name="size" label="Size">
          <DilekceSelect options={kindOptions} defaultValue="b" />
        </DilekceField>
        <DilekceField name="kind" label="Kind">
          <DilekceRadioGroup options={kindOptions} defaultValue="a" />
        </DilekceField>
        <DilekceField name="tags" label="Tags">
          <DilekceCheckboxGroup options={kindOptions} defaultValue={["a", "b"]} />
        </DilekceField>
        <DilekceField name="none" label="None">
          <DilekceCheckboxGroup options={kindOptions} />
        </DilekceField>
        <DilekceField name="solo" label="Solo">
          <DilekceCheckboxGroup options={[{ value: "yes", label: "Yes" }]} defaultValue={["yes"]} />
        </DilekceField>
        <input type="checkbox" name="agree" value="on" defaultChecked />
        <input type="checkbox" name="off" value="on" />
        <input type="checkbox" name="pair" value="x" defaultChecked />
        <input type="checkbox" name="pair" value="y" />
        <input name="gone" defaultValue="x" disabled />
        <DilekceField name="passengers.0.name" label="P0">
          <DilekceInput defaultValue="Ada" />
        </DilekceField>
        <DilekceField name="passengers.1.name" label="P1">
          <DilekceInput defaultValue="Grace" />
        </DilekceField>
        <DilekceField name="address.city" label="City">
          <DilekceInput defaultValue="Ankara" />
        </DilekceField>
        <button type="submit">Go</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Go" }).click()
    expect(onValidSubmit.mock.calls[0]![0]).toEqual({
      name: "Ada",
      bio: "Hi",
      age: "36",
      size: "b",
      kind: "a",
      tags: ["a", "b"],
      none: [],
      solo: ["yes"],
      agree: "on",
      pair: ["x"],
      passengers: [{ name: "Ada" }, { name: "Grace" }],
      address: { city: "Ankara" },
    })
  })

  test("a path of { key } segments and indexes finds a dotted name", async () => {
    const schema: StandardSchemaV1 = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({
          issues: [{ message: "Nope", path: [{ key: "passengers" }, 0, { key: "name" }] }],
        }),
      },
    }
    const screen = await render(
      <Dilekce schema={schema} onSubmit={prevent}>
        <DilekceField name="passengers.0.name" label="Passenger">
          <DilekceInput />
        </DilekceField>
        <button type="submit">Go</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Go" }).click()
    expect(errorOf("passengers.0.name")).toBe("Nope")
  })

  test("an issue no field answers for becomes a form-level line", async () => {
    const schema = z
      .object({ name: z.string(), age: z.coerce.number() })
      .refine((v) => v.name !== "root", { message: "Not root" })
    const onInvalidSubmit = vi.fn()
    const onValidSubmit = vi.fn()
    const screen = await render(
      <Form schema={schema} onInvalidSubmit={onInvalidSubmit} onValidSubmit={onValidSubmit} />,
    )
    await userEvent.type($("[name=name]"), "root")
    await userEvent.type($("[name=age]"), "20")
    await screen.getByRole("button", { name: "Go" }).click()
    expect(onValidSubmit).not.toHaveBeenCalled()
    const summary = $("[data-slot=dilekce-summary]")
    expect(document.activeElement).toBe(summary)
    expect([...summary.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["Not root"])
    expect(summary.querySelector("a")).toBeNull()
    const fields: DilekceInvalidField[] = onInvalidSubmit.mock.calls[0]![0]
    expect(fields).toHaveLength(1)
    expect(fields[0]).toMatchObject({ name: "", label: "", message: "Not root" })
    expect(fields[0]!.element).toBe($("form"))
    // Fixing it from a field clears the line.
    await userEvent.clear($("[name=name]"))
    await userEvent.type($("[name=name]"), "ada")
    await userEvent.tab()
    await expect.poll(() => document.querySelector("[data-slot=dilekce-summary]")).toBeNull()
  })

  test("a checkbox group's issue lands on the group", async () => {
    const onValidSubmit = vi.fn()
    const screen = await render(
      <Dilekce
        schema={z.object({ tags: z.array(z.string()).min(1, "Pick one") })}
        onSubmit={prevent}
        onValidSubmit={onValidSubmit}
      >
        <DilekceField name="tags" label="Tags">
          <DilekceCheckboxGroup options={kindOptions} />
        </DilekceField>
        <button type="submit">Go</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Go" }).click()
    expect(errorOf("tags")).toBe("Pick one")
    await userEvent.click($("[name=tags]"))
    await screen.getByRole("button", { name: "Go" }).click()
    expect(onValidSubmit.mock.calls[0]![0]).toEqual({ tags: ["a"] })
  })

  test("a field that is disabled isn't answered for: its issue is form-level", async () => {
    const onInvalidSubmit = vi.fn()
    const screen = await render(
      <Dilekce schema={Signup} onSubmit={prevent} onInvalidSubmit={onInvalidSubmit}>
        <DilekceField name="name" label="Name">
          <DilekceInput defaultValue="Ada" />
        </DilekceField>
        <DilekceField name="age" label="Age">
          <DilekceNumber disabled />
        </DilekceField>
        <button type="submit">Go</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Go" }).click()
    expect(onInvalidSubmit.mock.calls[0]![0].map((f: DilekceInvalidField) => f.name)).toEqual([""])
  })

  test("an async schema holds the submit, and the newest answer wins", async () => {
    const runs: Array<{ value: unknown; resolve: (r: StandardSchemaV1.Result<unknown>) => void }> =
      []
    const schema: StandardSchemaV1 = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (value) =>
          new Promise((resolve) => {
            runs.push({ value, resolve })
          }),
      },
    }
    const onValidSubmit = vi.fn()
    await render(
      <Dilekce schema={schema} onSubmit={prevent} onValidSubmit={onValidSubmit}>
        <DilekceField name="name" label="Name">
          <DilekceInput />
        </DilekceField>
        <button type="submit">Go</button>
      </Dilekce>,
    )
    // Blur alone: the field is pending while the schema runs.
    await userEvent.type($("[name=name]"), "a")
    await userEvent.tab()
    await expect.poll(() => runs.length).toBe(1)
    expect(fieldOf("name").dataset.pending).toBe("true")
    // A newer edit supersedes: the stale answer is ignored.
    await userEvent.type($("[name=name]"), "b")
    await userEvent.tab()
    await expect.poll(() => runs.length).toBe(2)
    runs[1]!.resolve({ value: { name: "ab" } })
    await expect.poll(() => fieldOf("name").dataset.pending).toBeUndefined()
    runs[0]!.resolve({ issues: [{ message: "Stale", path: ["name"] }] })
    await sleep(20)
    expect(errorOf("name")).toBeNull()
    // Submit: held while the schema runs, then goes through with its output.
    $<HTMLFormElement>("form").requestSubmit()
    await expect.poll(() => runs.length).toBe(3)
    expect($("form").dataset.checking).toBe("true")
    expect(onValidSubmit).not.toHaveBeenCalled()
    runs[2]!.resolve({ value: { name: "parsed" } })
    await expect.poll(() => onValidSubmit.mock.calls.length).toBe(1)
    expect(onValidSubmit.mock.calls[0]![0]).toEqual({ name: "parsed" })
    expect($("form").dataset.checking).toBeUndefined()
  })

  test("an async schema's issues fail the held submit", async () => {
    const schema: StandardSchemaV1 = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: async () => ({ issues: [{ message: "Taken", path: ["name"] }] }),
      },
    }
    const onValidSubmit = vi.fn()
    const onInvalidSubmit = vi.fn()
    await render(
      <Dilekce
        schema={schema}
        onSubmit={prevent}
        onValidSubmit={onValidSubmit}
        onInvalidSubmit={onInvalidSubmit}
      >
        <DilekceField name="name" label="Name">
          <DilekceInput />
        </DilekceField>
        <button type="submit">Go</button>
      </Dilekce>,
    )
    $<HTMLFormElement>("form").requestSubmit()
    await expect.poll(() => errorOf("name")).toBe("Taken")
    expect(onValidSubmit).not.toHaveBeenCalled()
    expect(onInvalidSubmit).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe($("[name=name]"))
  })

  test("a schema that throws fails closed: no submit, the form says it couldn't check", async () => {
    const schema: StandardSchemaV1 = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => {
          throw new Error("boom")
        },
      },
    }
    const onValidSubmit = vi.fn()
    const screen = await render(
      <Dilekce schema={schema} onSubmit={prevent} onValidSubmit={onValidSubmit}>
        <DilekceField name="name" label="Name">
          <DilekceInput defaultValue="x" />
        </DilekceField>
        <button type="submit">Go</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Go" }).click()
    expect(onValidSubmit).not.toHaveBeenCalled()
    await expect
      .poll(() => $("[role=status]").textContent)
      .toBe("Couldn't check the form, try again")
  })

  test("onValidSubmit's value has the schema's output type", () => {
    // Type-level: this only has to compile.
    const typed = (
      <Dilekce
        schema={z.object({ n: z.coerce.number() })}
        onValidSubmit={(value) => {
          expectTypeOf(value).toEqualTypeOf<{ n: number }>()
        }}
      />
    )
    const plain = (
      <Dilekce
        onValidSubmit={(value) => {
          expectTypeOf(value).toEqualTypeOf<Record<string, unknown>>()
        }}
      />
    )
    expect(typed).toBeTruthy()
    expect(plain).toBeTruthy()
  })
})

const kindOptions = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
]

/* -------------------------------------------------------------------------- */
/*                               defaultValues                                */
/* -------------------------------------------------------------------------- */

describe("defaultValues", () => {
  const prevent = (event: React.FormEvent) => event.preventDefault()

  function Filled({
    defaults,
    onReset,
    controlled = false,
  }: {
    defaults?: React.ComponentProps<typeof Dilekce>["defaultValues"]
    onReset?: () => void
    controlled?: boolean
  }) {
    return (
      <Dilekce defaultValues={defaults} onReset={onReset} onSubmit={prevent}>
        <DilekceField name="name" label="Name">
          <DilekceInput />
        </DilekceField>
        <DilekceField name="bio" label="Bio">
          <DilekceTextarea maxLength={20} />
        </DilekceField>
        <DilekceField name="size" label="Size">
          <DilekceSelect options={kindOptions} />
        </DilekceField>
        <DilekceField name="kind" label="Kind">
          <DilekceRadioGroup options={kindOptions} />
        </DilekceField>
        <DilekceField name="tags" label="Tags">
          <DilekceCheckboxGroup options={kindOptions} />
        </DilekceField>
        <DilekceField name="age" label="Age">
          <DilekceNumber />
        </DilekceField>
        <input type="checkbox" name="agree" data-testid="agree" />
        {controlled && (
          <DilekceField name="held" label="Held">
            <DilekceInput value="mine" onChange={() => {}} />
          </DilekceField>
        )}
        <button type="submit">Go</button>
        <button type="reset">Reset</button>
      </Dilekce>
    )
  }

  const everything = {
    name: "Ada",
    bio: "Hello",
    size: "b",
    kind: "a",
    tags: ["a", "b"],
    age: 36,
    agree: true,
  }
  const read = () => ({
    name: $<HTMLInputElement>("[name=name]").value,
    bio: $<HTMLTextAreaElement>("[name=bio]").value,
    size: $<HTMLSelectElement>("[name=size]").value,
    kind: document.querySelector<HTMLInputElement>("[name=kind]:checked")?.value,
    tags: [...document.querySelectorAll<HTMLInputElement>("[name=tags]:checked")].map(
      (i) => i.value,
    ),
    age: $<HTMLInputElement>("[name=age]").value,
    agree: $<HTMLInputElement>("[name=agree]").checked,
  })

  test("every kind of control starts from its default", async () => {
    await render(<Filled defaults={everything} />)
    expect(read()).toEqual({
      name: "Ada",
      bio: "Hello",
      size: "b",
      kind: "a",
      tags: ["a", "b"],
      age: "36",
      agree: true,
    })
    // Nothing is dirty: the defaults are where the form started.
    expect($("form").dataset.dirty).toBeUndefined()
  })

  test("a reset restores them", async () => {
    const screen = await render(<Filled defaults={everything} />)
    await userEvent.fill($("[name=name]"), "Grace")
    await userEvent.selectOptions($("[name=size]"), "a")
    await userEvent.click(document.querySelectorAll<HTMLElement>("[name=kind]")[1]!)
    await userEvent.click(document.querySelectorAll<HTMLElement>("[name=tags]")[0]!)
    await userEvent.click($("[data-testid=agree]"))
    expect($("form").dataset.dirty).toBe("true")
    await screen.getByRole("button", { name: "Reset" }).click()
    expect(read()).toEqual({
      name: "Ada",
      bio: "Hello",
      size: "b",
      kind: "a",
      tags: ["a", "b"],
      age: "36",
      agree: true,
    })
    await expect.poll(() => $("form").dataset.dirty).toBeUndefined()
  })

  test("data-empty and the counter follow them", async () => {
    const screen = await render(<Filled defaults={{ size: "b", bio: "x".repeat(19) }} />)
    await expect.poll(() => $("[name=size]").dataset.empty).toBeUndefined()
    await expect.element(screen.getByText("19/20")).toBeInTheDocument()
  })

  test("the filled dash follows them", async () => {
    await render(
      <Dilekce mode="filled" defaultValues={{ name: "Ada", size: "b" }}>
        <DilekceField name="name" label="Name">
          <DilekceInput />
        </DilekceField>
        <DilekceField name="size" label="Size">
          <DilekceSelect options={kindOptions} />
        </DilekceField>
        <DilekceField name="other" label="Other">
          <DilekceInput />
        </DilekceField>
      </Dilekce>,
    )
    const dash = (name: string) =>
      getComputedStyle($(`[name=${name}]`).closest(FIELD)!, "::after").content
    expect(dash("name")).not.toContain("—")
    expect(dash("size")).not.toContain("—")
    expect(dash("other")).toContain("—")
    expect($("[name=size]").dataset.empty).toBeUndefined()
  })

  test("a control the app controls keeps its own value", async () => {
    await render(<Filled defaults={{ held: "theirs" }} controlled />)
    expect($<HTMLInputElement>("[name=held]").value).toBe("mine")
  })

  test("dotted names and nested objects and arrays both work", async () => {
    await render(
      <Dilekce
        defaultValues={{
          "a.b": "dotted",
          passengers: [{ name: "Ada" }, { name: "Grace" }],
          address: { city: "Ankara" },
          emails: ["x@y.z"],
        }}
      >
        {["a.b", "passengers.0.name", "passengers.1.name", "address.city", "emails.0"].map((n) => (
          <DilekceField key={n} name={n} label={n}>
            <DilekceInput />
          </DilekceField>
        ))}
      </Dilekce>,
    )
    expect(
      ["a.b", "passengers.0.name", "passengers.1.name", "address.city", "emails.0"].map(
        (n) => $<HTMLInputElement>(`[name="${n}"]`).value,
      ),
    ).toEqual(["dotted", "Ada", "Grace", "Ankara", "x@y.z"])
  })

  test("null clears a control's markup default", async () => {
    await render(
      <Dilekce defaultValues={{ name: null }}>
        <DilekceField name="name" label="Name">
          <DilekceInput defaultValue="from markup" />
        </DilekceField>
      </Dilekce>,
    )
    expect($<HTMLInputElement>("[name=name]").value).toBe("")
  })

  test("a field that mounts later picks its default up", async () => {
    function Later({ show }: { show: boolean }) {
      return (
        <Dilekce defaultValues={{ late: "here" }}>
          {show && (
            <DilekceField name="late" label="Late">
              <DilekceInput />
            </DilekceField>
          )}
        </Dilekce>
      )
    }
    const screen = await render(<Later show={false} />)
    await screen.rerender(<Later show />)
    expect($<HTMLInputElement>("[name=late]").value).toBe("here")
  })

  test("new contents apply again and reset the form to them, clearing dirty", async () => {
    const onReset = vi.fn()
    const screen = await render(<Filled defaults={{ name: "Ada", kind: "a" }} onReset={onReset} />)
    await userEvent.fill($("[name=name]"), "typed")
    expect($("form").dataset.dirty).toBe("true")
    await screen.rerender(<Filled defaults={{ name: "Grace", size: "a" }} onReset={onReset} />)
    expect(read()).toMatchObject({ name: "Grace", size: "a", kind: undefined })
    await expect.poll(() => $("form").dataset.dirty).toBeUndefined()
    // The form reset itself: the app's onReset wasn't told.
    expect(onReset).not.toHaveBeenCalled()
    // And a user reset goes back to the new values.
    await userEvent.fill($("[name=name]"), "again")
    await screen.getByRole("button", { name: "Reset" }).click()
    expect($<HTMLInputElement>("[name=name]").value).toBe("Grace")
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  test("an equal object, such as an inline literal, doesn't reset what was typed", async () => {
    const screen = await render(<Filled defaults={{ name: "Ada" }} />)
    await userEvent.fill($("[name=name]"), "typed")
    await screen.rerender(<Filled defaults={{ name: "Ada" }} />)
    expect($<HTMLInputElement>("[name=name]").value).toBe("typed")
  })

  test("a name the new object leaves out goes back to its markup", async () => {
    function Markup({ defaults }: { defaults: Record<string, string> }) {
      return (
        <Dilekce defaultValues={defaults}>
          <DilekceField name="name" label="Name">
            <DilekceInput defaultValue="markup" />
          </DilekceField>
        </Dilekce>
      )
    }
    const screen = await render(<Markup defaults={{ name: "set" }} />)
    expect($<HTMLInputElement>("[name=name]").value).toBe("set")
    await screen.rerender(<Markup defaults={{}} />)
    expect($<HTMLInputElement>("[name=name]").value).toBe("markup")
  })
})

/* -------------------------------------------------------------------------- */
/*                      Checkbox, switch, file and date types                 */
/* -------------------------------------------------------------------------- */

describe("checkbox and switch", () => {
  const prevent = (event: React.FormEvent) => event.preventDefault()

  for (const [kind, Toggle, role] of [
    ["checkbox", DilekceCheckbox, "checkbox"],
    ["switch", DilekceSwitch, "switch"],
  ] as const) {
    describe(kind, () => {
      function Consent({
        onValidSubmit,
        mode,
        schema,
        value,
        required = true,
        defaults,
      }: {
        onValidSubmit?: (value: unknown) => void
        mode?: DilekceMode
        schema?: StandardSchemaV1
        value?: string
        required?: boolean
        defaults?: React.ComponentProps<typeof Dilekce>["defaultValues"]
      }) {
        return (
          <Dilekce
            mode={mode}
            schema={schema}
            defaultValues={defaults}
            onSubmit={prevent}
            onValidSubmit={onValidSubmit}
          >
            <DilekceField name="consent" label="Consent" description="You can withdraw it later">
              <Toggle required={required} value={value}>
                I agree to the <a href="#terms">terms</a>
              </Toggle>
            </DilekceField>
            <button type="submit">Go</button>
            <button type="reset">Reset</button>
          </Dilekce>
        )
      }

      test("the control is named by its own text; the field's label names the group", async () => {
        const screen = await render(<Consent />)
        const group = screen.getByRole("group", { name: /^Consent/ })
        await expect.element(group).toBeVisible()
        const control = screen.getByRole(role, { name: "I agree to the terms" })
        await expect.element(control).toBeVisible()
        expect(group.element().contains(control.element())).toBe(true)
        // The label is a <div>, not a <label> pointing at a control it doesn't name.
        expect($("[data-slot=dilekce-label]").tagName).toBe("DIV")
        expect(describedText(control.element())).toBe("You can withdraw it later")
        expect($<HTMLInputElement>("[name=consent]").required).toBe(true)
      })

      test("without text the field's label names the control", async () => {
        const screen = await render(
          <Dilekce>
            <DilekceField name="on" label="Notifications">
              <Toggle />
            </DilekceField>
          </Dilekce>,
        )
        await expect.element(screen.getByRole(role, { name: "Notifications" })).toBeVisible()
        expect(document.querySelector("[role=group]")).toBeNull()
        expect($("[data-slot=dilekce-label]").tagName).toBe("LABEL")
      })

      test("required says Required when unticked, with the message in its description", async () => {
        const onValidSubmit = vi.fn()
        const screen = await render(<Consent onValidSubmit={onValidSubmit} />)
        await screen.getByRole("button", { name: "Go" }).click()
        expect(errorOf("consent")).toBe("Required")
        const control = $<HTMLInputElement>("[name=consent]")
        expect(control.getAttribute("aria-invalid")).toBe("true")
        expect(describedText(control)).toBe("You can withdraw it later Required")
        expect(document.activeElement).toBe(control)
        expect(onValidSubmit).not.toHaveBeenCalled()

        await screen.getByRole(role).click()
        expect(errorOf("consent")).toBeNull()
        await screen.getByRole("button", { name: "Go" }).click()
        expect(onValidSubmit).toHaveBeenCalledTimes(1)
      })

      test("the value is the checkbox's value when ticked, and absent when not", async () => {
        const onValidSubmit = vi.fn()
        const screen = await render(<Consent required={false} onValidSubmit={onValidSubmit} />)
        await screen.getByRole("button", { name: "Go" }).click()
        expect(onValidSubmit.mock.calls[0]![0]).toEqual({})
        await screen.getByRole(role).click()
        await screen.getByRole("button", { name: "Go" }).click()
        expect(onValidSubmit.mock.calls[1]![0]).toEqual({ consent: "on" })
        await screen.rerender(
          <Consent required={false} value="yes" onValidSubmit={onValidSubmit} />,
        )
        await screen.getByRole("button", { name: "Go" }).click()
        expect(onValidSubmit.mock.calls[2]![0]).toEqual({ consent: "yes" })
      })

      test("a schema reads it as z.literal('on') or z.coerce.boolean().default(false)", async () => {
        const onValidSubmit = vi.fn()
        const screen = await render(
          <Consent
            required={false}
            schema={z.object({ consent: z.literal("on", "You must agree") })}
            onValidSubmit={onValidSubmit}
          />,
        )
        await screen.getByRole("button", { name: "Go" }).click()
        expect(errorOf("consent")).toBe("You must agree")
        await screen.getByRole(role).click()
        await screen.getByRole("button", { name: "Go" }).click()
        expect(onValidSubmit.mock.lastCall![0]).toEqual({ consent: "on" })

        const coerced = vi.fn()
        await screen.rerender(
          <Consent
            required={false}
            schema={z.object({ consent: z.coerce.boolean().default(false) })}
            onValidSubmit={coerced}
          />,
        )
        await screen.getByRole("button", { name: "Go" }).click()
        expect(coerced.mock.lastCall![0]).toEqual({ consent: true })
        await screen.getByRole(role).click()
        await screen.getByRole("button", { name: "Go" }).click()
        expect(coerced.mock.lastCall![0]).toEqual({ consent: false })
      })

      test("defaultValues tick it, a reset goes back, and ticking is a change", async () => {
        const onDirtyChange = vi.fn()
        const screen = await render(
          <Dilekce onDirtyChange={onDirtyChange} defaultValues={{ consent: true }}>
            <DilekceField name="consent" label="Consent">
              <Toggle>Yes</Toggle>
            </DilekceField>
            <button type="reset">Reset</button>
          </Dilekce>,
        )
        await expect.element(screen.getByRole(role, { name: "Yes" })).toBeChecked()
        await screen.getByRole(role).click()
        await expect.element(screen.getByRole(role)).not.toBeChecked()
        expect($("[data-slot=dilekce]").hasAttribute("data-dirty")).toBe(true)
        expect(onDirtyChange).toHaveBeenLastCalledWith(true)
        await screen.getByRole("button", { name: "Reset" }).click()
        await expect.element(screen.getByRole(role)).toBeChecked()
        await expect.poll(() => $("[data-slot=dilekce]").hasAttribute("data-dirty")).toBe(false)
      })

      test("a controlled one follows checked, and defaultValues leave it alone", async () => {
        function Held({ on }: { on: boolean }) {
          return (
            <Dilekce defaultValues={{ consent: false }}>
              <DilekceField name="consent" label="Consent">
                <Toggle checked={on} onChange={() => {}}>
                  Yes
                </Toggle>
              </DilekceField>
            </Dilekce>
          )
        }
        const screen = await render(<Held on={true} />)
        await expect.element(screen.getByRole(role)).toBeChecked()
        await screen.rerender(<Held on={false} />)
        await expect.element(screen.getByRole(role)).not.toBeChecked()
        expect($("[name=consent]").hasAttribute("data-controlled")).toBe(true)
      })

      test("filled: read-only, muted when off, copied as its text, no dash", async () => {
        const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
        const screen = await render(
          <Dilekce mode="filled">
            <DilekceField name="yes" label="Accepted">
              <Toggle defaultChecked>Terms</Toggle>
            </DilekceField>
            <DilekceField name="no" label="Declined">
              <Toggle>Newsletter</Toggle>
            </DilekceField>
          </Dilekce>,
        )
        const yes = $<HTMLInputElement>("[name=yes]")
        const no = $<HTMLInputElement>("[name=no]")
        expect(yes.getAttribute("aria-readonly")).toBe("true")
        no.click()
        expect(no.checked).toBe(false)
        await yes.click()
        expect(yes.checked).toBe(true)

        const text = (input: Element) => style(input.closest("label")!).color
        expect(text(no)).toBe(
          style(fieldOf("no").querySelector("[data-slot=dilekce-label]")!).color,
        )
        expect(text(yes)).not.toBe(text(no))
        expect(style(fieldOf("no"), "::after").content).not.toContain("—")
        expect(style(fieldOf("yes"), "::after").content).not.toContain("—")

        await screen.getByRole("button", { name: "Copy Accepted" }).click()
        expect(writeText).toHaveBeenLastCalledWith("Terms")
        // Nothing to copy when it's off.
        expect(style(fieldOf("no").querySelector("[data-slot=dilekce-copy]")!).display).toBe("none")
      })

      test("announces the label and the message, like any field", async () => {
        const screen = await render(<Consent />)
        await screen.getByRole("button", { name: "Go" }).click()
        await screen.getByRole(role).click()
        await screen.getByRole(role).click()
        await userEvent.tab()
        await expect
          .poll(() => $("[role=status]").textContent)
          .toMatch(/Consent: Required|1 field needs attention/)
      })
    })
  }

  test("the checkbox keeps the group's marks: border, tick, 24px target, focus outline", async () => {
    const screen = await render(
      <Dilekce>
        <DilekceField name="c" label="C">
          <DilekceCheckbox defaultChecked>Yes</DilekceCheckbox>
        </DilekceField>
      </Dilekce>,
    )
    const box = $<HTMLInputElement>("[name=c]")
    expect(style(box).appearance).toBe("none")
    expect(Number.parseFloat(style(box).width)).toBeGreaterThanOrEqual(15)
    expect(style(box.nextElementSibling!).display).not.toBe("none")
    expect(box.closest("label")!.getBoundingClientRect().height).toBeGreaterThanOrEqual(22)
    await userEvent.keyboard("{Tab}")
    expect(document.activeElement).toBe(box)
    expect(style(box).outlineStyle).toBe("solid")
    await screen.getByRole("checkbox").click()
  })

  test("advance: Enter on a checkbox moves on, and submits from the last", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    await render(
      <Dilekce advance onSubmit={onSubmit}>
        <DilekceField name="a" label="A">
          <DilekceCheckbox>One</DilekceCheckbox>
        </DilekceField>
        <DilekceField name="b" label="B">
          <DilekceSwitch>Two</DilekceSwitch>
        </DilekceField>
      </Dilekce>,
    )
    $("[name=a]").focus()
    await userEvent.keyboard("{Enter}")
    expect(document.activeElement).toBe($("[name=b]"))
    await userEvent.keyboard("{Enter}")
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

describe("switch", () => {
  function Sw({ mode, checked = false }: { mode?: DilekceMode; checked?: boolean }) {
    return (
      <Dilekce mode={mode}>
        <DilekceField name="sms" label="Alerts">
          <DilekceSwitch defaultChecked={checked}>SMS updates</DilekceSwitch>
        </DilekceField>
        <DilekceField name="other" label="Other">
          <DilekceInput />
        </DilekceField>
      </Dilekce>
    )
  }
  const track = () => $<HTMLInputElement>("[name=sms]")
  const thumb = () => $("[data-slot=dilekce-switch-thumb]")

  test("a track and a thumb, sized to the cell's text, the thumb inside the track", async () => {
    const screen = await render(<Sw />)
    const rect = track().getBoundingClientRect()
    const text = Number.parseFloat(style($("[data-slot=dilekce]")).getPropertyValue("--dk-text"))
    expect(text).toBeGreaterThan(0)
    expect(rect.height).toBeCloseTo(1.2 * 16, 0)
    expect(rect.width / rect.height).toBeCloseTo(1.85, 1)
    const off = thumb().getBoundingClientRect()
    expect(off.left).toBeGreaterThan(rect.left)
    expect(off.right).toBeLessThan(rect.right)
    expect(off.top).toBeGreaterThan(rect.top)
    expect(off.bottom).toBeLessThan(rect.bottom)
    // The track is centered on the text's first line.
    const label = track().closest("label")!.getBoundingClientRect()
    expect(rect.top + rect.height / 2).toBeCloseTo(label.top + 22.4 / 2, 0)
    await screen.getByRole("switch").click()
  })

  test("on: the thumb moves to the end, the track takes primary and the thumb the background", async () => {
    const screen = await render(<Sw />)
    const before = thumb().getBoundingClientRect().left - track().getBoundingClientRect().left
    expect(style(thumb()).backgroundColor).toBe(
      style(fieldOf("other").querySelector("[data-slot=dilekce-label]")!).color,
    )
    await screen.getByRole("switch").click()
    await sleep(300)
    await expect.element(screen.getByRole("switch")).toBeChecked()
    const after = thumb().getBoundingClientRect().left - track().getBoundingClientRect().left
    expect(after).toBeGreaterThan(before + 10)
    const probe = document.createElement("i")
    probe.className = "bg-primary"
    document.body.append(probe)
    expect(style(track()).backgroundColor).toBe(style(probe).backgroundColor)
    probe.className = "bg-background"
    expect(style(thumb()).backgroundColor).toBe(style(probe).backgroundColor)
    probe.remove()
  })

  for (const theme of ["light", "dark"] as const) {
    test(`${theme}: the track's edge and the thumb stand out at 3:1 off and on`, async () => {
      document.documentElement.classList.toggle("dark", theme === "dark")
      const screen = await render(<Sw />)
      const cell = style(fieldOf("sms")).backgroundColor
      await userEvent.hover(document.body)
      expect(ratio(style(track()).borderTopColor, cell), "off: edge").toBeGreaterThanOrEqual(3)
      expect(
        ratio(style(thumb()).backgroundColor, style(track()).backgroundColor),
        "off: thumb",
      ).toBeGreaterThanOrEqual(3)
      await screen.getByRole("switch").click()
      await userEvent.hover(document.body)
      await sleep(300)
      expect(ratio(style(track()).backgroundColor, cell), "on: track").toBeGreaterThanOrEqual(3)
      expect(
        ratio(style(thumb()).backgroundColor, style(track()).backgroundColor),
        "on: thumb",
      ).toBeGreaterThanOrEqual(3)
    })
  }

  test("forced colors: a visible track edge, and a thumb that shows which side it's on", async () => {
    await emulate([{ name: "forced-colors", value: "active" }])
    const screen = await render(<Sw />)
    expect(Number.parseFloat(style(track()).borderTopWidth)).toBeGreaterThanOrEqual(1)
    expect(style(track()).borderTopColor).not.toBe(style(fieldOf("sms")).backgroundColor)
    const off = {
      track: style(track()).backgroundColor,
      thumb: style(thumb()).backgroundColor,
      edge: style(track()).borderTopColor,
      left: thumb().getBoundingClientRect().left - track().getBoundingClientRect().left,
    }
    expect(off.thumb).not.toBe(style(fieldOf("sms")).backgroundColor)
    await screen.getByRole("switch").click()
    await sleep(300)
    const on = {
      track: style(track()).backgroundColor,
      thumb: style(thumb()).backgroundColor,
      edge: style(track()).borderTopColor,
      left: thumb().getBoundingClientRect().left - track().getBoundingClientRect().left,
    }
    // Position, and a fill that differs, so it isn't colour alone.
    expect(on.left).toBeGreaterThan(off.left + 10)
    expect(on.track).not.toBe(off.track)
    expect(ratio(on.thumb, on.track)).toBeGreaterThanOrEqual(3)
    expect(ratio(off.thumb, off.track)).toBeGreaterThanOrEqual(3)
  })

  test("reduced motion: the thumb jumps", async () => {
    await emulate([{ name: "prefers-reduced-motion", value: "reduce" }])
    await render(<Sw />)
    expect(style(thumb()).transitionProperty).toBe("none")
    expect(style(track()).transitionProperty).toBe("none")
  })

  test("it grows with the density's text", async () => {
    const heights: Record<string, number> = {}
    for (const density of ["compact", "roomy"] as const) {
      const screen = await render(
        <Dilekce density={density}>
          <DilekceField name="sms" label="Alerts">
            <DilekceSwitch>SMS</DilekceSwitch>
          </DilekceField>
        </Dilekce>,
      )
      heights[density] = track().getBoundingClientRect().height
      await screen.unmount()
    }
    expect(heights.roomy!).toBeGreaterThan(heights.compact!)
  })

  test("filled: on keeps the track filled in ink, off stays an empty track; neither moves", async () => {
    const screen = await render(<Sw mode="filled" checked />)
    await expect.element(screen.getByRole("switch")).toBeChecked()
    await track().click()
    expect(track().checked).toBe(true)
    expect(track().getAttribute("aria-readonly")).toBe("true")
  })
})

describe("file input", () => {
  const prevent = (event: React.FormEvent) => event.preventDefault()
  const pdf = () => new File(["%PDF"], "invoice.pdf", { type: "application/pdf" })
  const png = () => new File(["png"], "scan.png", { type: "image/png" })

  /** Chooses files the way the picker does: set `files`, then fire input and change. */
  const choose = (input: HTMLInputElement, ...files: File[]) => {
    const transfer = new DataTransfer()
    for (const file of files) transfer.items.add(file)
    input.files = transfer.files
    input.dispatchEvent(new Event("input", { bubbles: true }))
    input.dispatchEvent(new Event("change", { bubbles: true }))
  }

  function Upload({
    mode,
    multiple,
    required,
    onValidSubmit,
    schema,
    defaults,
    validate,
  }: {
    mode?: DilekceMode
    multiple?: boolean
    required?: boolean
    onValidSubmit?: (value: unknown) => void
    schema?: StandardSchemaV1
    defaults?: React.ComponentProps<typeof Dilekce>["defaultValues"]
    validate?: React.ComponentProps<typeof DilekceField>["validate"]
  }) {
    return (
      <Dilekce
        mode={mode}
        schema={schema}
        defaultValues={defaults}
        onSubmit={prevent}
        onValidSubmit={onValidSubmit}
      >
        <DilekceField name="invoice" label="Customs invoice" validate={validate}>
          <DilekceFile accept="application/pdf,image/*" multiple={multiple} required={required} />
        </DilekceField>
        <button type="submit">Go</button>
        <button type="reset">Reset</button>
      </Dilekce>
    )
  }
  const input = () => $<HTMLInputElement>("[name=invoice]")

  test("a native file input named by the field's label, with accept and multiple passed on", async () => {
    const screen = await render(<Upload multiple />)
    await expect.element(screen.getByLabelText("Customs invoice")).toBeVisible()
    expect(input().type).toBe("file")
    expect(input().accept).toBe("application/pdf,image/*")
    expect(input().multiple).toBe(true)
  })

  test("the browser's button is a small outline button in the theme's tokens", async () => {
    await render(<Upload />)
    // The mouse stays where an earlier test left it: park it off the button so it isn't hovered.
    await userEvent.unhover(input())
    const button = style(input(), "::file-selector-button")
    const probe = document.createElement("i")
    probe.className = "border-input bg-background text-foreground"
    document.body.append(probe)
    const tokens = style(probe)
    // The button eases its colors (transition-colors), and a slow machine reads them mid-way, as
    // oklab. Wait for the transition to settle rather than racing it.
    await vi.waitFor(() => {
      expect(button.backgroundColor).toBe(tokens.backgroundColor)
      expect(button.borderTopColor).toBe(tokens.borderTopColor)
      expect(button.color).toBe(tokens.color)
    })
    expect(button.borderTopWidth).toBe("1px")
    expect(button.borderTopColor).toBe(tokens.borderTopColor)
    expect(button.backgroundColor).toBe(tokens.backgroundColor)
    expect(button.color).toBe(tokens.color)
    expect(Number.parseFloat(button.borderTopLeftRadius)).toBeGreaterThan(4)
    expect(Number.parseFloat(button.height)).toBeGreaterThanOrEqual(24)
    probe.remove()
    // The rest of the control is the cell's: no border of its own.
    expect(style(input()).borderTopWidth).toBe("0px")
  })

  test("the chosen name follows the button, muted until there is one", async () => {
    await render(<Upload />)
    expect(input().hasAttribute("data-empty")).toBe(true)
    const muted = style(input()).color
    choose(input(), pdf())
    await expect.poll(() => input().hasAttribute("data-empty")).toBe(false)
    expect(style(input()).color).not.toBe(muted)
    expect($("[data-slot=dilekce-file-names]").textContent).toBe("invoice.pdf")
  })

  test("required says Required until a file is chosen; the browser's message is the generic one", async () => {
    const screen = await render(<Upload required />)
    await screen.getByRole("button", { name: "Go" }).click()
    expect(errorOf("invoice")).toBe("Required")
    choose(input(), pdf())
    await expect.poll(() => errorOf("invoice")).toBeNull()
  })

  test("a rule gets the names, and the files are in the form data", async () => {
    const validate = vi.fn((value: string | string[], data: FormData) => {
      const file = data.get("invoice") as File
      return file.size > 0 && file.size < 2 ? "Too small" : null
    })
    const screen = await render(<Upload validate={validate} />)
    choose(input(), new File(["x"], "tiny.pdf"))
    await screen.getByRole("button", { name: "Go" }).click()
    expect(validate.mock.lastCall![0]).toBe("tiny.pdf")
    expect(errorOf("invoice")).toBe("Too small")
  })

  test("the schema gets a File, a File[] for multiple, and nothing for an empty single field", async () => {
    const onValidSubmit = vi.fn()
    const screen = await render(
      <Upload
        onValidSubmit={onValidSubmit}
        schema={z.object({ invoice: z.instanceof(File, { error: "Attach the invoice" }) })}
      />,
    )
    await screen.getByRole("button", { name: "Go" }).click()
    expect(errorOf("invoice")).toBe("Attach the invoice")
    choose(input(), pdf())
    await screen.getByRole("button", { name: "Go" }).click()
    const value = onValidSubmit.mock.lastCall![0] as { invoice: File }
    expect(value.invoice).toBeInstanceOf(File)
    expect(value.invoice.name).toBe("invoice.pdf")
    await screen.unmount()

    const many = vi.fn()
    const multi = await render(<Upload multiple onValidSubmit={many} />)
    await multi.getByRole("button", { name: "Go" }).click()
    expect(many.mock.lastCall![0]).toEqual({ invoice: [] })
    choose(input(), pdf(), png())
    await multi.getByRole("button", { name: "Go" }).click()
    const files = (many.mock.lastCall![0] as { invoice: File[] }).invoice
    expect(files.map((f) => f.name)).toEqual(["invoice.pdf", "scan.png"])
    expect(files[0]).toBeInstanceOf(File)

    await multi.unmount()
    const none = vi.fn()
    const single = await render(<Upload onValidSubmit={none} />)
    await single.getByRole("button", { name: "Go" }).click()
    expect(none.mock.lastCall![0]).toEqual({})
  })

  test("a chosen file is a change, and a reset clears it", async () => {
    const screen = await render(<Upload />)
    expect($("[data-slot=dilekce]").hasAttribute("data-dirty")).toBe(false)
    choose(input(), pdf())
    await expect.poll(() => $("[data-slot=dilekce]").hasAttribute("data-dirty")).toBe(true)
    await screen.getByRole("button", { name: "Reset" }).click()
    expect(input().files!.length).toBe(0)
    await expect.poll(() => $("[data-slot=dilekce]").hasAttribute("data-dirty")).toBe(false)
    await expect.poll(() => input().hasAttribute("data-empty")).toBe(true)
    expect(document.querySelector("[data-slot=dilekce-file-names]")).toBeNull()
  })

  test("defaultValues don't reach it, and don't break the form", async () => {
    await render(<Upload defaults={{ invoice: "invoice.pdf" }} />)
    expect(input().files!.length).toBe(0)
    expect(input().hasAttribute("data-empty")).toBe(true)
  })

  test("several files: the names describe the control, the browser says how many", async () => {
    await render(<Upload multiple />)
    choose(input(), pdf(), png())
    await expect.poll(() => describedText(input())).toBe("invoice.pdf, scan.png")
  })

  test("filled: the control gives way to the names, or a dash", async () => {
    const screen = await render(<Upload mode="filled" multiple />)
    expect(style(input()).display).toBe("none")
    expect(style(fieldOf("invoice"), "::after").content).toContain("—")
    expect(style(fieldOf("invoice").querySelector("[data-slot=dilekce-copy]")!).display).toBe(
      "none",
    )
    choose(input(), pdf(), png())
    const names = $("[data-slot=dilekce-file-names]")
    await expect.poll(() => style(names).position).not.toBe("absolute")
    expect(names.textContent).toBe("invoice.pdf, scan.png")
    expect(names.getBoundingClientRect().width).toBeGreaterThan(40)
    expect(style(fieldOf("invoice"), "::after").content).not.toContain("—")

    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
    await screen.getByRole("button", { name: "Copy Customs invoice" }).click()
    expect(writeText).toHaveBeenLastCalledWith("invoice.pdf, scan.png")
  })

  test("filled: nothing opens the picker, not even the label", async () => {
    await render(<Upload mode="filled" />)
    const click = new MouseEvent("click", { bubbles: true, cancelable: true })
    input().dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
  })

  test("a disabled file field is skipped by the schema and the submit", async () => {
    const onValidSubmit = vi.fn()
    const screen = await render(
      <Dilekce onSubmit={prevent} onValidSubmit={onValidSubmit}>
        <DilekceField name="invoice" label="Invoice">
          <DilekceFile required disabled />
        </DilekceField>
        <button type="submit">Go</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Go" }).click()
    expect(onValidSubmit.mock.lastCall![0]).toEqual({})
  })
})

/**
 * The style rules that mention `part` in a selector, with the media query they sit
 * in. `getComputedStyle` can't resolve the date input's picker button (a UA
 * pseudo-element), so what's checked is the stylesheet that styles it.
 */
function rulesMentioning(part: string) {
  const found: Array<{ css: string; media: string }> = []
  const walk = (rules: CSSRuleList, media: string) => {
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule && rule.selectorText.includes(part)) {
        found.push({ css: rule.style.cssText, media })
      }
      if ("cssRules" in rule) {
        walk(
          (rule as CSSGroupingRule).cssRules,
          rule instanceof CSSMediaRule ? rule.conditionText : media,
        )
      }
    }
  }
  for (const sheet of document.styleSheets) walk(sheet.cssRules, "")
  return found
}

describe("date and time inputs", () => {
  const prevent = (event: React.FormEvent) => event.preventDefault()
  const types = [
    {
      type: "date",
      value: "2026-03-15",
      min: "2026-03-10",
      max: "2026-03-20",
      early: "2026-03-01",
      late: "2026-04-01",
    },
    { type: "time", value: "09:30", min: "08:00", max: "17:00", early: "07:00", late: "18:00" },
    {
      type: "datetime-local",
      value: "2026-03-15T09:30",
      min: "2026-03-10T00:00",
      max: "2026-03-20T00:00",
      early: "2026-03-01T00:00",
      late: "2026-04-01T00:00",
    },
    {
      type: "month",
      value: "2026-03",
      min: "2026-02",
      max: "2026-04",
      early: "2026-01",
      late: "2026-06",
    },
    {
      type: "week",
      value: "2026-W11",
      min: "2026-W09",
      max: "2026-W15",
      early: "2026-W02",
      late: "2026-W30",
    },
  ] as const

  for (const t of types) {
    describe(t.type, () => {
      const input = () => $<HTMLInputElement>("[name=when]")
      function When({
        mode,
        defaultValue,
        bounds = false,
      }: {
        mode?: DilekceMode
        defaultValue?: string
        bounds?: boolean
      }) {
        return (
          <Dilekce mode={mode} onSubmit={prevent}>
            <DilekceField name="when" label="When">
              <DilekceInput
                type={t.type}
                defaultValue={defaultValue}
                min={bounds ? t.min : undefined}
                max={bounds ? t.max : undefined}
              />
            </DilekceField>
            <button type="submit">Go</button>
            <button type="reset">Reset</button>
          </Dilekce>
        )
      }

      test("a native input, named by its label, with the value as the browser writes it", async () => {
        const screen = await render(<When defaultValue={t.value} />)
        await expect.element(screen.getByLabelText("When")).toBeVisible()
        expect(input().type).toBe(t.type)
        expect(input().value).toBe(t.value)
      })

      test("min and max say Too low and Too high", async () => {
        const screen = await render(<When bounds />)
        await userEvent.fill(input(), t.early)
        await screen.getByRole("button", { name: "Go" }).click()
        expect(errorOf("when")).toBe("Too low")
        await userEvent.fill(input(), t.late)
        await userEvent.tab()
        expect(errorOf("when")).toBe("Too high")
        await userEvent.fill(input(), t.value)
        await expect.poll(() => errorOf("when")).toBeNull()
      })

      test("empty is tracked from the value: typed, written, reset", async () => {
        const screen = await render(<When />)
        expect(input().hasAttribute("data-empty")).toBe(true)
        await userEvent.fill(input(), t.value)
        await expect.poll(() => input().hasAttribute("data-empty")).toBe(false)
        await screen.getByRole("button", { name: "Reset" }).click()
        await expect.poll(() => input().hasAttribute("data-empty")).toBe(true)
        await screen.rerender(<When defaultValue={t.value} />)
        expect(input().hasAttribute("data-empty")).toBe(false)
      })

      test("filled: a dash when empty, the value when not, and it can't be edited", async () => {
        const screen = await render(
          <Dilekce mode="filled">
            <DilekceRow>
              <DilekceField name="empty" label="Empty">
                <DilekceInput type={t.type} />
              </DilekceField>
              <DilekceField name="full" label="Full">
                <DilekceInput type={t.type} defaultValue={t.value} />
              </DilekceField>
            </DilekceRow>
          </Dilekce>,
        )
        expect(style(fieldOf("empty"), "::after").content).toContain("—")
        expect(style(fieldOf("full"), "::after").content).not.toContain("—")
        // The editor's format ("mm/dd/yyyy") isn't left showing beside the dash.
        const empty = $<HTMLInputElement>("[name=empty]")
        expect(style(empty).color).toBe("rgba(0, 0, 0, 0)")
        expect(style($("[name=full]")).color).not.toBe("rgba(0, 0, 0, 0)")
        expect(empty.readOnly).toBe(true)
        // Read-only: typing doesn't fill it.
        empty.focus()
        await userEvent.keyboard("2026")
        expect(empty.value).toBe("")
        // No copy button on an empty value; one that copies the value on a full one.
        expect(style(fieldOf("empty").querySelector("[data-slot=dilekce-copy]")!).display).toBe(
          "none",
        )
        await expect.element(screen.getByRole("button", { name: "Copy Full" })).toBeInTheDocument()
      })

      test("the editor follows the dark class: color-scheme", async () => {
        await render(<When defaultValue={t.value} />)
        expect(style(input()).colorScheme).toContain("normal")
        document.documentElement.classList.add("dark")
        await sleep(50)
        expect(style(input()).colorScheme).toBe("dark")
      })
    })
  }

  test("the picker button is a mask painted with the muted token, CanvasText in forced colors", async () => {
    await render(
      <Dilekce>
        <DilekceField name="when" label="When">
          <DilekceInput type="date" />
        </DilekceField>
        <DilekceField name="at" label="At">
          <DilekceInput type="time" />
        </DilekceField>
      </Dilekce>,
    )
    const rules = rulesMentioning("::-webkit-calendar-picker-indicator")
    const has = (media: string, css: string) =>
      rules.some((rule) => rule.media === media && rule.css.includes(css))
    expect(has("", "background-color: var(--muted-foreground)")).toBe(true)
    expect(has("", "mask: var(--dk-picker)")).toBe(true)
    expect(has("", "background-image: none")).toBe(true)
    expect(has("", "background-color: var(--foreground)")).toBe(true)
    expect(has("(forced-colors: active)", "background-color: canvastext")).toBe(true)
    // Filled mode doesn't show it.
    expect(has("", "display: none")).toBe(true)

    // A calendar for dates, a clock for times.
    const icon = (name: string) =>
      decodeURIComponent($(`[name=${name}]`).style.getPropertyValue("--dk-picker"))
    expect(icon("when")).toContain("<rect")
    expect(icon("at")).toContain("<circle")
  })

  test("a date field is as tall as a text field beside it", async () => {
    await render(
      <Dilekce>
        <DilekceRow>
          <DilekceField name="a" label="Text">
            <DilekceInput />
          </DilekceField>
          <DilekceField name="b" label="Date">
            <DilekceInput type="date" />
          </DilekceField>
        </DilekceRow>
      </Dilekce>,
    )
    const [a, b] = ["a", "b"].map((n) => $(`[name=${n}]`).getBoundingClientRect().height)
    expect(Math.abs(a! - b!)).toBeLessThanOrEqual(2)
  })

  test("a ref still reaches the input", async () => {
    const ref = React.createRef<HTMLInputElement>()
    await render(
      <Dilekce>
        <DilekceField name="when" label="When">
          <DilekceInput type="date" ref={ref} />
        </DilekceField>
      </Dilekce>,
    )
    expect(ref.current).toBe($("[name=when]"))
  })
})

describe("new controls with the form's other features", () => {
  const prevent = (event: React.FormEvent) => event.preventDefault()

  test("the error summary lists them and its links focus them", async () => {
    const screen = await render(
      <Dilekce onSubmit={prevent}>
        <DilekceSummary />
        <DilekceField name="consent" label="Consent">
          <DilekceCheckbox required>Agree</DilekceCheckbox>
        </DilekceField>
        <DilekceField name="sms" label="Alerts">
          <DilekceSwitch required>SMS</DilekceSwitch>
        </DilekceField>
        <DilekceField name="invoice" label="Invoice">
          <DilekceFile required />
        </DilekceField>
        <DilekceField name="when" label="When">
          <DilekceInput type="date" required />
        </DilekceField>
        <button type="submit">Go</button>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Go" }).click()
    const links = [
      ...document.querySelectorAll<HTMLAnchorElement>("[data-slot=dilekce-summary-link]"),
    ]
    expect(links.map((a) => a.textContent)).toEqual([
      "Consent: Required",
      "Alerts: Required",
      "Invoice: Required",
      "When: Required",
    ])
    for (const [index, name] of ["consent", "sms", "invoice", "when"].entries()) {
      links[index]!.click()
      expect(document.activeElement).toBe($(`[name=${name}]`))
    }
  })

  for (const theme of ["light", "dark"] as const) {
    test(`${theme}: the text beside a checkbox or switch keeps 4.5:1, on, off and filled`, async () => {
      document.documentElement.classList.toggle("dark", theme === "dark")
      for (const mode of ["edit", "filled"] as const) {
        const screen = await render(
          <Dilekce mode={mode}>
            <DilekceField name="a" label="A">
              <DilekceCheckbox defaultChecked>On</DilekceCheckbox>
            </DilekceField>
            <DilekceField name="b" label="B">
              <DilekceSwitch>Off</DilekceSwitch>
            </DilekceField>
            <DilekceField name="c" label="C">
              <DilekceFile />
            </DilekceField>
          </Dilekce>,
        )
        await sleep(250)
        for (const name of ["a", "b"]) {
          const field = fieldOf(name)
          const text = field.querySelector("label")!
          expect(
            ratio(style(text).color, style(field).backgroundColor),
            `${theme} ${mode} ${name}`,
          ).toBeGreaterThanOrEqual(4.5)
        }
        // The empty file name, muted.
        if (mode === "edit") {
          expect(
            ratio(style($("[name=c]")).color, style(fieldOf("c")).backgroundColor),
          ).toBeGreaterThanOrEqual(4.5)
        }
        await screen.unmount()
      }
    })
  }

  test("forced colors: a checked checkbox differs from an unchecked one, and the file button has an edge", async () => {
    await emulate([{ name: "forced-colors", value: "active" }])
    await render(
      <Dilekce>
        <DilekceField name="a" label="A">
          <DilekceCheckbox defaultChecked>On</DilekceCheckbox>
        </DilekceField>
        <DilekceField name="b" label="B">
          <DilekceCheckbox>Off</DilekceCheckbox>
        </DilekceField>
        <DilekceField name="c" label="C">
          <DilekceFile />
        </DilekceField>
      </Dilekce>,
    )
    expect(style($("[name=a]")).backgroundColor).not.toBe(style($("[name=b]")).backgroundColor)
    expect(style($("[name=a]").nextElementSibling!).display).not.toBe("none")
    expect(style($("[name=c]"), "::file-selector-button").borderTopWidth).toBe("1px")
  })
})

/* -------------------------------------------------------------------------- */
/*                         Repeater: "add another" rows                       */
/* -------------------------------------------------------------------------- */

describe("repeater", () => {
  type RepeatProps = Partial<React.ComponentProps<typeof DilekceRepeat>>
  function Passengers({
    form = {},
    ...props
  }: RepeatProps & { form?: Partial<React.ComponentProps<typeof Dilekce>> }) {
    return (
      <Dilekce onSubmit={(event) => event.preventDefault()} {...form}>
        <DilekceRepeat name="passengers" min={1} max={3} addLabel="Add passenger" {...props}>
          {(row) => (
            <DilekceRow>
              <DilekceField name={row.name("fullName")} label="Name" span={2}>
                <DilekceInput required />
              </DilekceField>
              <DilekceField name={row.name("age")} label="Age">
                <DilekceNumber min={0} />
              </DilekceField>
              <DilekceRepeatRemove />
            </DilekceRow>
          )}
        </DilekceRepeat>
        <DilekceActions>
          <button type="submit">Save</button>
          <button type="reset">Reset</button>
        </DilekceActions>
      </Dilekce>
    )
  }
  const names = () =>
    [...document.querySelectorAll<HTMLInputElement>("[name^=passengers]")].map((el) => el.name)
  const said = () => $("[role=status]").textContent
  const rowsOf = () => document.querySelectorAll("[data-slot=dilekce-repeat-row]").length
  const typeInto = (name: string, value: string) => {
    const input = $<HTMLInputElement>(`[name="${name}"]`)
    input.focus()
    return userEvent.fill(input, value)
  }

  test("starts with max(min, 1) rows named by index, and nests into an array on submit", async () => {
    const onValidSubmit = vi.fn()
    const screen = await render(<Passengers form={{ onValidSubmit }} />)
    expect(names()).toEqual(["passengers.0.fullName", "passengers.0.age"])
    await screen.getByRole("button", { name: "Add passenger" }).click()
    expect(names()).toEqual([
      "passengers.0.fullName",
      "passengers.0.age",
      "passengers.1.fullName",
      "passengers.1.age",
    ])
    await userEvent.fill($("[name='passengers.0.fullName']"), "Ada")
    await userEvent.fill($("[name='passengers.0.age']"), "36")
    await userEvent.fill($("[name='passengers.1.fullName']"), "Grace")
    await screen.getByRole("button", { name: "Save" }).click()
    expect(onValidSubmit).toHaveBeenCalledTimes(1)
    expect(onValidSubmit.mock.calls[0]![0]).toEqual({
      passengers: [
        { fullName: "Ada", age: "36" },
        { fullName: "Grace", age: "" },
      ],
    })
  })

  test("adding focuses the first control of the new row and says so; max hides the add button", async () => {
    const screen = await render(<Passengers />)
    const add = screen.getByRole("button", { name: "Add passenger" })
    await add.click()
    expect(document.activeElement).toBe($("[name='passengers.1.fullName']"))
    await expect.poll(said).toBe("Row 2 added")
    await add.click()
    expect(document.activeElement).toBe($("[name='passengers.2.fullName']"))
    await expect.poll(said).toBe("Row 3 added")
    expect(rowsOf()).toBe(3)
    expect(document.querySelector("[data-slot=dilekce-repeat-add]")).toBeNull()
  })

  test("a row's remove button is named by its position and disabled at min", async () => {
    const screen = await render(<Passengers defaultCount={2} />)
    const first = screen.getByRole("button", { name: "Remove row 1" })
    const second = screen.getByRole("button", { name: "Remove row 2" })
    await expect.element(first).toBeEnabled()
    expect(first.element().textContent).toBe("Remove")
    // The 24px target.
    const box = second.element().getBoundingClientRect()
    expect(box.width).toBeGreaterThanOrEqual(24)
    expect(box.height).toBeGreaterThanOrEqual(24)
    await first.click()
    // One row left, at min: nothing more to remove.
    await expect.element(screen.getByRole("button", { name: "Remove row 1" })).toBeDisabled()
  })

  test("removing the first row keeps the others' values and renames them to the new positions", async () => {
    const onValidSubmit = vi.fn()
    const screen = await render(<Passengers defaultCount={3} form={{ onValidSubmit }} />)
    await typeInto("passengers.0.fullName", "Ada")
    await typeInto("passengers.1.fullName", "Grace")
    await typeInto("passengers.2.fullName", "Edsger")
    const second = $<HTMLInputElement>("[name='passengers.1.fullName']")
    const third = $<HTMLInputElement>("[name='passengers.2.fullName']")
    await screen.getByRole("button", { name: "Remove row 1" }).click()
    // The same elements, one place earlier, with what was typed in them.
    expect($("[name='passengers.0.fullName']")).toBe(second)
    expect($("[name='passengers.1.fullName']")).toBe(third)
    expect(second.value).toBe("Grace")
    expect(third.value).toBe("Edsger")
    expect(names().filter((n) => n.endsWith("fullName"))).toEqual([
      "passengers.0.fullName",
      "passengers.1.fullName",
    ])
    // Focus lands on the same position's first control; the rest is said.
    expect(document.activeElement).toBe(second)
    await expect.poll(said).toBe("Row 1 removed")
    await screen.getByRole("button", { name: "Save" }).click()
    expect(onValidSubmit.mock.calls[0]![0]).toEqual({
      passengers: [
        { fullName: "Grace", age: "" },
        { fullName: "Edsger", age: "" },
      ],
    })
  })

  test("removing the last row focuses the previous one; with min 0, the add button", async () => {
    const screen = await render(<Passengers min={0} defaultCount={2} />)
    await screen.getByRole("button", { name: "Remove row 2" }).click()
    expect(document.activeElement).toBe($("[name='passengers.0.fullName']"))
    await expect.poll(said).toBe("Row 2 removed")
    await screen.getByRole("button", { name: "Remove row 1" }).click()
    expect(rowsOf()).toBe(0)
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Add passenger" }).element(),
    )
    await screen.getByRole("button", { name: "Add passenger" }).click()
    expect(rowsOf()).toBe(1)
    expect(document.activeElement).toBe($("[name='passengers.0.fullName']"))
  })

  test("row.remove() and row.key work from the render function", async () => {
    const seen: string[] = []
    const screen = await render(
      <Dilekce>
        <DilekceRepeat name="tags" min={0} defaultCount={2}>
          {(row) => {
            seen.push(row.key)
            return (
              <DilekceRow>
                <DilekceField name={row.name("v")} label={`Tag ${row.index}`}>
                  <DilekceInput />
                </DilekceField>
                <button type="button" onClick={row.remove}>{`drop ${row.index}`}</button>
              </DilekceRow>
            )
          }}
        </DilekceRepeat>
      </Dilekce>,
    )
    const keysBefore = new Set(seen)
    expect(keysBefore.size).toBe(2)
    seen.length = 0
    await screen.getByRole("button", { name: "drop 0" }).click()
    expect(rowsOf()).toBe(1)
    // The surviving row kept its key, though it is row 0 now.
    expect(seen).toHaveLength(1)
    expect(keysBefore.has(seen[0]!)).toBe(true)
    // Add is named from the message by default.
    await expect.element(screen.getByRole("button", { name: "Add another" })).toBeVisible()
  })

  test("the row count starts from defaultValues, or defaultCount, clamped to min and max", async () => {
    const people = [
      { fullName: "Ada", age: 36 },
      { fullName: "Grace", age: 85 },
    ]
    const screen = await render(<Passengers form={{ defaultValues: { passengers: people } }} />)
    expect(rowsOf()).toBe(2)
    expect($<HTMLInputElement>("[name='passengers.0.fullName']").value).toBe("Ada")
    expect($<HTMLInputElement>("[name='passengers.1.age']").value).toBe("85")
    await screen.unmount()

    const counted = await render(
      <Passengers defaultCount={3} form={{ defaultValues: { passengers: people } }} />,
    )
    expect(rowsOf()).toBe(3)
    // The third row has no default.
    expect($<HTMLInputElement>("[name='passengers.2.fullName']").value).toBe("")
    await counted.unmount()

    const capped = await render(
      <Passengers max={1} form={{ defaultValues: { passengers: people } }} />,
    )
    expect(rowsOf()).toBe(1)
    await capped.unmount()
    await render(<Passengers min={2} />)
    expect(rowsOf()).toBe(2)
  })

  test("a reset brings back the default rows and values; dirty counts added and removed rows", async () => {
    const onDirtyChange = vi.fn()
    const screen = await render(
      <Passengers
        form={{
          onDirtyChange,
          defaultValues: { passengers: [{ fullName: "Ada", age: 36 }] },
        }}
      />,
    )
    expect(onDirtyChange).not.toHaveBeenCalled()
    await screen.getByRole("button", { name: "Add passenger" }).click()
    await expect.poll(() => onDirtyChange.mock.calls.at(-1)?.[0]).toBe(true)
    // An empty row less is clean again.
    await screen.getByRole("button", { name: "Remove row 2" }).click()
    await expect.poll(() => onDirtyChange.mock.calls.at(-1)?.[0]).toBe(false)

    // Remove the default row, add two: reset restores Ada alone.
    await screen.getByRole("button", { name: "Add passenger" }).click()
    await screen.getByRole("button", { name: "Remove row 1" }).click()
    await userEvent.fill($("[name='passengers.0.fullName']"), "Someone else")
    await screen.getByRole("button", { name: "Add passenger" }).click()
    expect(rowsOf()).toBe(2)
    await screen.getByRole("button", { name: "Reset" }).click()
    await expect.poll(rowsOf).toBe(1)
    await expect.poll(() => $<HTMLInputElement>("[name='passengers.0.fullName']").value).toBe("Ada")
    await expect.poll(() => onDirtyChange.mock.calls.at(-1)?.[0]).toBe(false)
    expect($("[data-slot=dilekce]").hasAttribute("data-dirty")).toBe(false)
  })

  test("reset leaves untouched rows alone", async () => {
    const screen = await render(<Passengers defaultCount={2} />)
    const before = $("[name='passengers.1.fullName']")
    await userEvent.fill(before, "x")
    await screen.getByRole("button", { name: "Reset" }).click()
    await expect.poll(() => (before as HTMLInputElement).value).toBe("")
    expect($("[name='passengers.1.fullName']")).toBe(before)
  })

  test("onRowsChange hears adds, removes and a reset that changes the count", async () => {
    const onRowsChange = vi.fn()
    const screen = await render(<Passengers onRowsChange={onRowsChange} />)
    expect(onRowsChange).not.toHaveBeenCalled()
    await screen.getByRole("button", { name: "Add passenger" }).click()
    await screen.getByRole("button", { name: "Add passenger" }).click()
    await screen.getByRole("button", { name: "Remove row 2" }).click()
    expect(onRowsChange.mock.calls.map((c) => c[0])).toEqual([2, 3, 2])
    await screen.getByRole("button", { name: "Reset" }).click()
    await expect.poll(() => onRowsChange.mock.calls.at(-1)?.[0]).toBe(1)
  })

  test("a schema's array issues reach the right row's field, even after a removal", async () => {
    const schema = z.object({
      passengers: z.array(
        z.object({ fullName: z.string().min(1), age: z.coerce.number().max(120, "Too high") }),
      ),
    })
    const screen = await render(
      <Dilekce schema={schema} onSubmit={(event) => event.preventDefault()}>
        <DilekceRepeat name="passengers" defaultCount={3}>
          {(row) => (
            <DilekceRow>
              <DilekceField name={row.name("fullName")} label="Name">
                <DilekceInput />
              </DilekceField>
              <DilekceField name={row.name("age")} label="Age">
                <DilekceNumber />
              </DilekceField>
              <DilekceRepeatRemove />
            </DilekceRow>
          )}
        </DilekceRepeat>
        <button type="submit">Go</button>
      </Dilekce>,
    )
    await userEvent.fill($("[name='passengers.0.fullName']"), "A")
    await userEvent.fill($("[name='passengers.1.fullName']"), "B")
    await userEvent.fill($("[name='passengers.1.age']"), "999")
    await userEvent.fill($("[name='passengers.2.fullName']"), "C")
    await screen.getByRole("button", { name: "Remove row 1" }).click()
    await screen.getByRole("button", { name: "Go" }).click()
    // The old row 1 is row 0 now, and it is the one with a bad age.
    expect(errorOf("passengers.0.age")).toBe("Too high")
    expect(errorOf("passengers.1.age")).toBeNull()
    expect(errorOf("passengers.0.fullName")).toBeNull()
  })

  test("Enter advances across rows in order", async () => {
    await render(<Passengers defaultCount={2} form={{ advance: true }} />)
    $<HTMLInputElement>("[name='passengers.0.fullName']").focus()
    await userEvent.keyboard("{Enter}")
    expect(document.activeElement).toBe($("[name='passengers.0.age']"))
    await userEvent.keyboard("{Enter}")
    expect(document.activeElement).toBe($("[name='passengers.1.fullName']"))
  })

  test("filled mode and print hide the add and remove cells", async () => {
    const filled = await render(<Passengers defaultCount={2} form={{ mode: "filled" }} />)
    expect(style($("[data-slot=dilekce-repeat-add]")).display).toBe("none")
    for (const cell of document.querySelectorAll("[data-slot=dilekce-repeat-remove]")) {
      expect(style(cell).display).toBe("none")
    }
    await filled.unmount()

    await render(<Passengers defaultCount={2} />)
    expect(style($("[data-slot=dilekce-repeat-add]")).display).not.toBe("none")
    await cdp().send("Emulation.setEmulatedMedia", { media: "print" })
    try {
      expect(style($("[data-slot=dilekce-repeat-add]")).display).toBe("none")
      expect(style($("[data-slot=dilekce-repeat-remove]")).display).toBe("none")
    } finally {
      await cdp().send("Emulation.setEmulatedMedia", { media: "" })
    }
  })

  test("the same form in filled mode keeps its rows and values", async () => {
    const view = (mode: DilekceMode) => <Passengers defaultCount={2} form={{ mode }} />
    const screen = await render(view("edit"))
    await userEvent.fill($("[name='passengers.1.fullName']"), "Grace")
    await screen.rerender(view("filled"))
    expect($<HTMLInputElement>("[name='passengers.1.fullName']").value).toBe("Grace")
    expect($<HTMLInputElement>("[name='passengers.1.fullName']").readOnly).toBe(true)
    expect(rowsOf()).toBe(2)
  })

  test("Turkish messages name the buttons and the announcements", async () => {
    const screen = await render(
      <Passengers defaultCount={2} form={{ messages: dilekceMessages.tr }} addLabel={undefined} />,
    )
    await expect.element(screen.getByRole("button", { name: "1. satırı kaldır" })).toBeVisible()
    expect(screen.getByRole("button", { name: "2. satırı kaldır" }).element().textContent).toBe(
      "Kaldır",
    )
    await screen.getByRole("button", { name: "Bir tane daha ekle" }).click()
    await expect.poll(said).toBe("3. satır eklendi")
    await screen.getByRole("button", { name: "3. satırı kaldır" }).click()
    await expect.poll(said).toBe("3. satır kaldırıldı")
  })

  test("the new strings exist in both languages", () => {
    for (const key of ["add", "remove", "removeRow", "rowAdded", "rowRemoved", "change"] as const) {
      expect(dilekceMessages.en[key], key).toBeTruthy()
      expect(dilekceMessages.tr[key], key).toBeTruthy()
    }
  })

  test("forced colors: the remove cell has a border and its button a focus outline", async () => {
    await emulate([{ name: "forced-colors", value: "active" }])
    const screen = await render(<Passengers defaultCount={2} />)
    expect(style($("[data-slot=dilekce-repeat-remove]")).borderTopWidth).toBe("1px")
    expect(style($("[data-slot=dilekce-repeat-add]")).borderTopWidth).toBe("1px")
    for (const name of ["Remove row 1", "Add passenger"]) {
      const button = screen.getByRole("button", { name }).element() as HTMLElement
      button.focus()
      await userEvent.keyboard("{Shift>}{Shift}")
      await userEvent.tab({ shift: true })
      await userEvent.tab()
      expect(style(button).outlineStyle).toBe("solid")
    }
  })

  for (const theme of ["light", "dark"] as const) {
    test(`${theme}: the add and remove text keeps 4.5:1 and their focus 3:1`, async () => {
      document.documentElement.classList.toggle("dark", theme === "dark")
      const screen = await render(<Passengers defaultCount={2} />)
      for (const [name, cell] of [
        ["Remove row 1", "dilekce-repeat-remove"],
        ["Add passenger", "dilekce-repeat-add"],
      ] as const) {
        const button = screen.getByRole("button", { name }).element() as HTMLElement
        const background = style($(`[data-slot=${cell}]`)).backgroundColor
        expect(rgba(background)[3]).toBe(255)
        expect(ratio(style(button).color, background), `${theme} ${name}`).toBeGreaterThanOrEqual(
          4.5,
        )
        await userEvent.tab()
        button.focus()
        await userEvent.tab({ shift: true })
        await userEvent.tab()
        expect(
          ratio(style(button).outlineColor, background),
          `${theme} ${name} focus`,
        ).toBeGreaterThanOrEqual(3)
      }
    })
  }
})

/* -------------------------------------------------------------------------- */
/*                  Check your answers: Change and empty text                 */
/* -------------------------------------------------------------------------- */

describe("check your answers", () => {
  const changes = () => [...document.querySelectorAll("[data-slot=dilekce-change]")]

  function Answers(props: React.ComponentProps<typeof Dilekce>) {
    return (
      <Dilekce mode="filled" {...props}>
        <DilekceRow>
          <DilekceField name="name" label="Name">
            <DilekceInput defaultValue="Ada" />
          </DilekceField>
          <DilekceField name="phone" label="Phone">
            <DilekceInput type="tel" />
          </DilekceField>
          <DilekceField name="kind" label="Kind">
            <DilekceSelect options={[{ value: "a", label: "Alpha" }]} />
          </DilekceField>
        </DilekceRow>
      </Dilekce>
    )
  }

  test("onEdit gives every filled field a Change button named with its label", async () => {
    const onEdit = vi.fn()
    const screen = await render(<Answers onEdit={onEdit} />)
    expect(changes()).toHaveLength(3)
    await screen.getByRole("button", { name: "Change Phone" }).click()
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit.mock.calls[0]![0]).toEqual({
      name: "phone",
      label: "Phone",
      element: $("[name=phone]"),
    })
    // Empty fields can be changed too, and Copy sits beside it where there is something to copy.
    await expect.element(screen.getByRole("button", { name: "Copy Name" })).toBeVisible()
    expect(
      style($("[name=phone]").closest(FIELD)!.querySelector("[data-slot=dilekce-copy]")!).display,
    ).toBe("none")
  })

  test("no onEdit and edit mode have no Change buttons", async () => {
    await render(
      <>
        <Answers />
        <Answers mode="edit" onEdit={() => {}} />
      </>,
    )
    expect(changes()).toHaveLength(0)
  })

  test("a field's edit overrides: a string is a link, a function a button, false hides it", async () => {
    const onEdit = vi.fn()
    const own = vi.fn()
    const screen = await render(
      <Dilekce mode="filled" onEdit={onEdit}>
        <DilekceField name="a" label="Address" edit="/address?change=1">
          <DilekceInput defaultValue="x" />
        </DilekceField>
        <DilekceField name="b" label="Phone" edit={own}>
          <DilekceInput defaultValue="y" />
        </DilekceField>
        <DilekceField name="c" label="Secret" edit={false}>
          <DilekceInput defaultValue="z" />
        </DilekceField>
        <DilekceField name="d" label="Plain">
          <DilekceInput defaultValue="w" />
        </DilekceField>
      </Dilekce>,
    )
    const link = screen.getByRole("link", { name: "Change Address" })
    expect(link.element().getAttribute("href")).toBe("/address?change=1")
    await screen.getByRole("button", { name: "Change Phone" }).click()
    expect(own).toHaveBeenCalledTimes(1)
    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Change Secret" }).elements()).toHaveLength(0)
    await screen.getByRole("button", { name: "Change Plain" }).click()
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit.mock.calls[0]![0].label).toBe("Plain")
  })

  test("a field's edit works without the form's onEdit", async () => {
    const own = vi.fn()
    const screen = await render(
      <Dilekce mode="filled">
        <DilekceField name="a" label="A" edit={own}>
          <DilekceInput defaultValue="x" />
        </DilekceField>
        <DilekceField name="b" label="B">
          <DilekceInput defaultValue="y" />
        </DilekceField>
      </Dilekce>,
    )
    expect(changes()).toHaveLength(1)
    await screen.getByRole("button", { name: "Change A" }).click()
    expect(own).toHaveBeenCalled()
  })

  test("Change switches back to edit, and the values are still there", async () => {
    function Review() {
      const [mode, setMode] = React.useState<DilekceMode>("edit")
      return (
        <Dilekce
          mode={mode}
          onEdit={({ element }) => {
            flushSync(() => setMode("edit"))
            element.focus()
          }}
        >
          <DilekceField name="name" label="Name">
            <DilekceInput />
          </DilekceField>
          <DilekceField name="city" label="City">
            <DilekceInput />
          </DilekceField>
          <button type="button" onClick={() => setMode("filled")}>
            Review
          </button>
        </Dilekce>
      )
    }
    const screen = await render(<Review />)
    await userEvent.fill($("[name=name]"), "Ada")
    await userEvent.fill($("[name=city]"), "London")
    await screen.getByRole("button", { name: "Review" }).click()
    expect($<HTMLInputElement>("[name=city]").readOnly).toBe(true)
    await screen.getByRole("button", { name: "Change City" }).click()
    expect($<HTMLInputElement>("[name=city]").readOnly).toBe(false)
    expect(document.activeElement).toBe($("[name=city]"))
    expect($<HTMLInputElement>("[name=name]").value).toBe("Ada")
    expect($<HTMLInputElement>("[name=city]").value).toBe("London")
  })

  test("a repeater row's Change gives the indexed name", async () => {
    const onEdit = vi.fn()
    const screen = await render(
      <Dilekce mode="filled" onEdit={onEdit}>
        <DilekceRepeat name="p" defaultCount={2}>
          {(row) => (
            <DilekceField name={row.name("n")} label={`Name ${row.index + 1}`}>
              <DilekceInput defaultValue="x" />
            </DilekceField>
          )}
        </DilekceRepeat>
      </Dilekce>,
    )
    await screen.getByRole("button", { name: "Change Name 2" }).click()
    expect(onEdit.mock.calls[0]![0].name).toBe("p.1.n")
  })

  test("Change is a Turkish word in Turkish", async () => {
    const screen = await render(<Answers onEdit={() => {}} messages={dilekceMessages.tr} />)
    await expect.element(screen.getByRole("button", { name: "Değiştir Name" })).toBeVisible()
  })

  for (const density of ["compact", "comfortable", "roomy"] as const) {
    test(`${density}: Change is 24px and over the label row, not the value`, async () => {
      await render(<Answers onEdit={() => {}} density={density} />)
      for (const change of changes()) {
        const box = change.getBoundingClientRect()
        expect(box.width).toBeGreaterThanOrEqual(24)
        expect(box.height).toBeGreaterThanOrEqual(24)
        // It floats over the label row; at most the control's line-height padding is shared.
        expect(box.bottom).toBeLessThanOrEqual(
          change.closest(FIELD)!.querySelector("input, select")!.getBoundingClientRect().top + 4,
        )
      }
    })
  }

  test("Change and Copy sit side by side in tab order: the value, copy, then change", async () => {
    await render(<Answers onEdit={() => {}} />)
    await userEvent.tab()
    expect((document.activeElement as HTMLElement).dataset.slot).toBe("dilekce-input")
    await userEvent.tab()
    expect((document.activeElement as HTMLElement).dataset.slot).toBe("dilekce-copy")
    await userEvent.tab()
    expect((document.activeElement as HTMLElement).dataset.slot).toBe("dilekce-change")
    const copy = $("[data-slot=dilekce-copy]").getBoundingClientRect()
    const change = $("[data-slot=dilekce-change]").getBoundingClientRect()
    expect(change.left).toBeGreaterThanOrEqual(copy.right)
  })

  for (const theme of ["light", "dark"] as const) {
    test(`${theme}: Change keeps 4.5:1 and a 3:1 focus outline; a link does too`, async () => {
      document.documentElement.classList.toggle("dark", theme === "dark")
      await render(
        <Dilekce mode="filled" onEdit={() => {}}>
          <DilekceField name="a" label="A">
            <DilekceInput defaultValue="x" />
          </DilekceField>
          <DilekceField name="b" label="B" edit="#b">
            <DilekceInput defaultValue="y" />
          </DilekceField>
        </Dilekce>,
      )
      for (const change of changes()) {
        const field = change.closest<HTMLElement>(FIELD)!
        const background = style(field).backgroundColor
        expect(ratio(style(change).color, background), `${theme} text`).toBeGreaterThanOrEqual(4.5)
        ;(change as HTMLElement).focus()
        await userEvent.tab({ shift: true })
        await userEvent.tab()
        // Shift-tab from the first copy button leaves the page; tab back lands on a Change.
        if (document.activeElement !== change) (change as HTMLElement).focus()
        expect(style(change).outlineStyle).toBe("solid")
        expect(
          ratio(style(change).outlineColor, background),
          `${theme} focus`,
        ).toBeGreaterThanOrEqual(3)
      }
    })
  }

  test("forced colors: Change keeps a visible outline when focused", async () => {
    await emulate([{ name: "forced-colors", value: "active" }])
    await render(<Answers onEdit={() => {}} />)
    const change = changes()[0] as HTMLElement
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    expect(document.activeElement).toBe(change)
    expect(style(change).outlineStyle).toBe("solid")
    expect(style(change).outlineColor).not.toBe(style(change.closest(FIELD)!).backgroundColor)
  })

  test("print hides Change", async () => {
    await render(<Answers onEdit={() => {}} />)
    expect(style(changes()[0]!).display).not.toBe("none")
    await cdp().send("Emulation.setEmulatedMedia", { media: "print" })
    try {
      expect(style($("[data-slot=dilekce-field-actions]")).display).toBe("none")
    } finally {
      await cdp().send("Emulation.setEmulatedMedia", { media: "" })
    }
  })

  describe("emptyText", () => {
    const empties = () =>
      [...document.querySelectorAll<HTMLElement>("[data-slot=dilekce-empty]")].filter(
        (el) => style(el).display !== "none",
      )

    test("shows where the dash was, for empty fields only, and the dash is gone", async () => {
      await render(
        <Dilekce mode="filled" emptyText="Not provided">
          <DilekceRow>
            <DilekceField name="a" label="A">
              <DilekceInput />
            </DilekceField>
            <DilekceField name="b" label="B">
              <DilekceInput defaultValue="Here" />
            </DilekceField>
            <DilekceField name="c" label="C">
              <DilekceSelect options={[{ value: "x", label: "X" }]} />
            </DilekceField>
            <DilekceField name="d" label="D">
              <DilekceInput type="date" />
            </DilekceField>
            <DilekceField name="e" label="E">
              <DilekceTextarea />
            </DilekceField>
            <DilekceField name="f" label="F">
              <DilekceFile />
            </DilekceField>
          </DilekceRow>
        </Dilekce>,
      )
      expect(empties().map((el) => el.closest(FIELD)!.querySelector("label")!.textContent)).toEqual(
        ["A", "C", "D", "E", "F"],
      )
      for (const el of empties()) expect(el.textContent).toBe("Not provided")
      for (const name of ["a", "b", "c"]) {
        expect(style(fieldOf(name), "::after").content).not.toContain("—")
      }
      // Where nothing is empty text is not rendered into the layout.
      expect(style(fieldOf("b").querySelector("[data-slot=dilekce-empty]")!).display).toBe("none")
    })

    test("a screen reader meets it: the accessibility tree has the text only for empty fields", async () => {
      const screen = await render(
        <Dilekce mode="filled" emptyText="Not provided" aria-label="Answers" copyable={false}>
          <DilekceField name="a" label="Email">
            <DilekceSelect options={[{ value: "x", label: "X" }]} />
          </DilekceField>
          <DilekceField name="b" label="City">
            <DilekceSelect defaultValue="x" options={[{ value: "x", label: "X" }]} />
          </DilekceField>
        </Dilekce>,
      )
      await expect.element(screen.getByRole("form", { name: "Answers" }))
        .toMatchAriaInlineSnapshot(`
        - form "Answers":
          - text: Email
          - combobox "Email":
            - option "Select…" [selected]
            - option "X"
          - text: Not provided City
          - combobox "City":
            - option "Select…"
            - option "X" [selected]
      `)
      // Hidden where a value stands: said once, for Email only.
      expect(document.body.innerText.match(/Not provided/g)).toHaveLength(1)
    })

    test("the text follows the value as it is typed, and stays out of edit mode", async () => {
      function Live({ mode }: { mode: DilekceMode }) {
        return (
          <Dilekce mode={mode} emptyText="Not provided">
            <DilekceField name="a" label="A">
              <DilekceInput />
            </DilekceField>
          </Dilekce>
        )
      }
      const screen = await render(<Live mode="edit" />)
      expect(document.querySelector("[data-slot=dilekce-empty]")).toBeNull()
      await userEvent.fill($("[name=a]"), "filled in")
      await screen.rerender(<Live mode="filled" />)
      expect(empties()).toHaveLength(0)
      await screen.rerender(<Live mode="edit" />)
      await userEvent.clear($("[name=a]"))
      await screen.rerender(<Live mode="filled" />)
      expect(empties()).toHaveLength(1)
    })

    test("without emptyText the dash stays", async () => {
      await render(
        <Dilekce mode="filled">
          <DilekceField name="a" label="A">
            <DilekceInput />
          </DilekceField>
        </Dilekce>,
      )
      expect(document.querySelector("[data-slot=dilekce-empty]")).toBeNull()
      expect(style(fieldOf("a"), "::after").content).toContain("—")
    })

    for (const theme of ["light", "dark"] as const) {
      test(`${theme}: the empty text keeps 4.5:1`, async () => {
        document.documentElement.classList.toggle("dark", theme === "dark")
        await render(
          <Dilekce mode="filled" emptyText="Not provided">
            <DilekceField name="a" label="A">
              <DilekceInput />
            </DilekceField>
          </Dilekce>,
        )
        const text = empties()[0]!
        expect(
          ratio(style(text).color, style(fieldOf("a")).backgroundColor),
        ).toBeGreaterThanOrEqual(4.5)
      })
    }

    test("it is part of copy-free text: Copy stays hidden for an empty field", async () => {
      await render(
        <Dilekce mode="filled" emptyText="Not provided">
          <DilekceField name="a" label="A">
            <DilekceInput />
          </DilekceField>
        </Dilekce>,
      )
      expect(style($("[data-slot=dilekce-copy]")).display).toBe("none")
    })
  })
})
