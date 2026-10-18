import * as React from "react"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, test, vi } from "vitest"
import { cdp, userEvent } from "vitest/browser"
import { cleanup, render } from "vitest-browser-react"

import "../src/index.css"
import {
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
  dilekceMessages,
  type DilekceErrors,
  type DilekceMode,
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
    expect(onInvalidSubmit).toHaveBeenCalledWith(["a", "b"])
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
    test(`${density}: the copy button is 24px and clear of the control`, async () => {
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
      expect(box.bottom).toBeLessThanOrEqual($("[name=w]").getBoundingClientRect().top)
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
      // Filled: the copy button, then the (read-only) value; then the radio, the checkbox.
      for (const kind of ["button", "text", "radio", "checkbox"]) {
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
