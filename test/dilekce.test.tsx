import * as React from "react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { userEvent } from "vitest/browser"
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
    await screen.getByRole("button", { name: "Increase" }).click()
    expect(input.value).toBe("2")
    await screen.getByRole("button", { name: "Increase" }).click()
    expect(input.value).toBe("2")
    expect(onChange).toHaveBeenCalledOnce()
    await screen.getByRole("button", { name: "Decrease" }).click()
    expect(input.value).toBe("1")
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
    expect(validate).toHaveBeenCalledWith("ada", expect.any(FormData))
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

  test("a second submit while the check runs is ignored, and the replay goes through once", async () => {
    let finish!: (message: string | null) => void
    const validate = vi.fn(() => new Promise<string | null>((resolve) => (finish = resolve)))
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
    expect(validate).toHaveBeenCalledOnce()
    finish(null)
    await expect.poll(() => action.mock.calls.length).toBe(1)
    await sleep(100)
    expect(action).toHaveBeenCalledOnce()
    expect(validate).toHaveBeenCalledOnce()
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
    expect(validate).toHaveBeenCalledWith(["a", "b"], expect.any(FormData))
    expect(errorOf("x")).toBe("Pick one at most")
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
    expect(lead!.getAttribute("aria-hidden")).toBe("true")
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
