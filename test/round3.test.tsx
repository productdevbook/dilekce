import * as React from "react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { cdp, userEvent } from "vitest/browser"
import { cleanup, render } from "vitest-browser-react"
import { z } from "zod"

import "../src/index.css"
import {
  Dilekce,
  DilekceActions,
  DilekceField,
  DilekceInput,
  DilekceNumber,
  DilekceRepeat,
  DilekceRepeatRemove,
  DilekceRow,
  DilekceSelect,
  DilekceSummary,
  dilekceMessages,
  type StandardSchemaV1,
} from "../registry/dilekce/dilekce"

/** Touch emulation makes the primary pointer coarse and hover-less, as a phone's is. */
const touch = () =>
  cdp().send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 })

afterEach(async () => {
  cleanup()
  document.documentElement.classList.remove("dark")
  await cdp().send("Emulation.setTouchEmulationEnabled", { enabled: false })
})

// A submit must not navigate the test page.
document.addEventListener("submit", (event) => event.preventDefault())

const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!
const $$ = <T extends Element = HTMLElement>(selector: string) => [
  ...document.querySelectorAll<T>(selector),
]
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
const style = (el: Element) => getComputedStyle(el)
const submit = () => $<HTMLFormElement>("form").requestSubmit()
const CHECK_FAILED = "Couldn't check the form, try again"

const standard = (validate: StandardSchemaV1["~standard"]["validate"]): StandardSchemaV1 => ({
  "~standard": { version: 1, vendor: "test", validate },
})

/* -------------------------------------------------------------------------- */
/*                         F1: a failed check fails closed                     */
/* -------------------------------------------------------------------------- */

describe("a check that can't run fails closed", () => {
  const messageInSummary = () => $("[data-slot=dilekce-summary]")?.textContent ?? ""
  const status = () => $("[role=status]").textContent ?? ""

  function App({
    schema,
    onValidSubmit,
    onInvalidSubmit,
    validate,
  }: {
    schema?: StandardSchemaV1
    onValidSubmit: (value: unknown) => void
    onInvalidSubmit?: (fields: unknown) => void
    validate?: React.ComponentProps<typeof DilekceField>["validate"]
  }) {
    return (
      <Dilekce schema={schema} onValidSubmit={onValidSubmit} onInvalidSubmit={onInvalidSubmit}>
        <DilekceSummary />
        <DilekceField name="n" label="N" validate={validate}>
          <DilekceInput defaultValue="abc" />
        </DilekceField>
        <button type="submit">go</button>
      </Dilekce>
    )
  }

  const throwing = standard(() => {
    throw new Error("boom")
  })
  const rejecting = standard(() => Promise.reject(new Error("network")))

  for (const [name, schema] of [
    ["throws", throwing],
    ["rejects", rejecting],
  ] as const) {
    test(`a schema that ${name} doesn't submit, says so, and can be retried`, async () => {
      const valid = vi.fn()
      const invalid = vi.fn()
      let working = false
      const flaky = standard((value) =>
        working ? { value } : (schema["~standard"].validate(value) as never),
      )
      await render(<App schema={flaky} onValidSubmit={valid} onInvalidSubmit={invalid} />)
      submit()
      await vi.waitFor(() => expect(invalid).toHaveBeenCalledTimes(1))
      expect(valid).not.toHaveBeenCalled()
      expect(messageInSummary()).toContain(CHECK_FAILED)
      await vi.waitFor(() => expect(status()).toContain(CHECK_FAILED))
      expect(invalid.mock.calls[0]![0]).toEqual([
        { name: "", label: "", message: CHECK_FAILED, element: $("form") },
      ])
      // Nothing is stuck: the form isn't busy and the next try goes through.
      expect($("form").getAttribute("aria-busy")).toBeNull()
      working = true
      submit()
      await vi.waitFor(() => expect(valid).toHaveBeenCalledTimes(1))
      expect(valid.mock.calls[0]![0]).toEqual({ n: "abc" })
      expect(messageInSummary()).not.toContain(CHECK_FAILED)
    })
  }

  test("a field rule that rejects doesn't submit either", async () => {
    const valid = vi.fn()
    const invalid = vi.fn()
    let works = false
    await render(
      <App
        onValidSubmit={valid}
        onInvalidSubmit={invalid}
        validate={() => (works ? null : Promise.reject(new Error("net")))}
      />,
    )
    submit()
    await vi.waitFor(() => expect(invalid).toHaveBeenCalledTimes(1))
    expect(valid).not.toHaveBeenCalled()
    expect(messageInSummary()).toContain(CHECK_FAILED)
    expect($("[data-slot=dilekce-error]")).toBeNull()
    works = true
    submit()
    await vi.waitFor(() => expect(valid).toHaveBeenCalledTimes(1))
  })

  test("a field rule that throws synchronously doesn't submit", async () => {
    const valid = vi.fn()
    const invalid = vi.fn()
    await render(
      <App
        onValidSubmit={valid}
        onInvalidSubmit={invalid}
        validate={() => {
          throw new Error("boom")
        }}
      />,
    )
    submit()
    await vi.waitFor(() => expect(invalid).toHaveBeenCalledTimes(1))
    expect(valid).not.toHaveBeenCalled()
    expect(messageInSummary()).toContain(CHECK_FAILED)
  })

  test("the message exists in English and Turkish and can be overridden", async () => {
    expect(dilekceMessages.en.checkFailed).toBe(CHECK_FAILED)
    expect(dilekceMessages.tr.checkFailed).toBeTruthy()
    const valid = vi.fn()
    await render(
      <Dilekce
        schema={throwing}
        onValidSubmit={valid}
        messages={{ ...dilekceMessages.en, checkFailed: "Nope" }}
      >
        <DilekceSummary />
        <DilekceField name="n" label="N">
          <DilekceInput />
        </DilekceField>
      </Dilekce>,
    )
    submit()
    await vi.waitFor(() => expect(messageInSummary()).toContain("Nope"))
    expect(valid).not.toHaveBeenCalled()
  })
})

/* -------------------------------------------------------------------------- */
/*                               Values and schemas                            */
/* -------------------------------------------------------------------------- */

describe("values", () => {
  test("F6: { value, issues: [] } is a success, and onValidSubmit gets the value", async () => {
    const valid = vi.fn()
    await render(
      <Dilekce
        schema={standard((value) => ({ value: { parsed: value }, issues: [] }) as never)}
        onValidSubmit={valid}
      >
        <DilekceField name="n" label="N">
          <DilekceInput defaultValue="abc" />
        </DilekceField>
      </Dilekce>,
    )
    submit()
    await vi.waitFor(() => expect(valid).toHaveBeenCalledTimes(1))
    expect(valid.mock.calls[0]![0]).toEqual({ parsed: { n: "abc" } })
  })

  test("F2: a repeater with no rows gives [] for its name", async () => {
    const valid = vi.fn()
    const invalid = vi.fn()
    await render(
      <Dilekce
        schema={z.object({ p: z.array(z.object({ n: z.string() })), q: z.array(z.string()) })}
        onValidSubmit={valid}
        onInvalidSubmit={invalid}
      >
        <DilekceRepeat name="p" defaultCount={0}>
          {(row) => (
            <DilekceRow>
              <DilekceField name={row.name("n")} label="N">
                <DilekceInput />
              </DilekceField>
              <DilekceRepeatRemove />
            </DilekceRow>
          )}
        </DilekceRepeat>
        <DilekceRepeat name="q" defaultCount={0}>
          {(row) => (
            <DilekceField name={`q.${row.index}`} label="Q">
              <DilekceInput />
            </DilekceField>
          )}
        </DilekceRepeat>
        <button type="submit">go</button>
      </Dilekce>,
    )
    submit()
    await vi.waitFor(() => expect(valid).toHaveBeenCalledTimes(1))
    expect(invalid).not.toHaveBeenCalled()
    expect(valid.mock.calls[0]![0]).toEqual({ p: [], q: [] })
  })

  test("F2: removing the last row gives [] again", async () => {
    const valid = vi.fn()
    await render(
      <Dilekce onValidSubmit={valid}>
        <DilekceRepeat name="p" defaultCount={1}>
          {(row) => (
            <DilekceRow>
              <DilekceField name={row.name("n")} label="N">
                <DilekceInput defaultValue="x" />
              </DilekceField>
              <DilekceRepeatRemove />
            </DilekceRow>
          )}
        </DilekceRepeat>
        <button type="submit">go</button>
      </Dilekce>,
    )
    submit()
    await vi.waitFor(() => expect(valid).toHaveBeenCalledTimes(1))
    expect(valid.mock.calls[0]![0]).toEqual({ p: [{ n: "x" }] })
    $<HTMLButtonElement>("[data-slot=dilekce-repeat-remove-button]").click()
    await vi.waitFor(() => expect($$("[data-slot=dilekce-repeat-row]")).toHaveLength(0))
    submit()
    await vi.waitFor(() => expect(valid).toHaveBeenCalledTimes(2))
    expect(valid.mock.calls[1]![0]).toEqual({ p: [] })
  })

  test("F7: a multiple select without a default logs no React warning", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {})
    const valid = vi.fn()
    try {
      await render(
        <Dilekce onValidSubmit={valid}>
          <DilekceField name="ms" label="MS">
            <DilekceSelect multiple options={[{ value: "1", label: "One" }]} />
          </DilekceField>
          <button type="submit">go</button>
        </Dilekce>,
      )
      submit()
      await vi.waitFor(() => expect(valid).toHaveBeenCalledTimes(1))
      expect(valid.mock.calls[0]![0]).toEqual({ ms: [] })
      expect(errors).not.toHaveBeenCalled()
    } finally {
      errors.mockRestore()
    }
  })
})

/* -------------------------------------------------------------------------- */
/*                               Repeater and summary                          */
/* -------------------------------------------------------------------------- */

function Parcels({
  defaults,
  onValidSubmit,
  schema,
}: {
  defaults?: Record<string, unknown>
  onValidSubmit?: (value: unknown) => void
  schema?: StandardSchemaV1
}) {
  return (
    <Dilekce schema={schema} defaultValues={defaults as never} onValidSubmit={onValidSubmit}>
      <DilekceSummary />
      <DilekceRepeat name="p" min={1} max={5}>
        {(row) => (
          <DilekceRow>
            <DilekceField name={row.name("n")} label={`Name ${row.index + 1}`}>
              <DilekceInput />
            </DilekceField>
            <DilekceRepeatRemove />
          </DilekceRow>
        )}
      </DilekceRepeat>
      <DilekceActions>
        <button type="submit">go</button>
        <button type="reset">rs</button>
      </DilekceActions>
    </Dilekce>
  )
}
const names = () => $$<HTMLInputElement>("input[name^='p.']").map((input) => input.value)

describe("repeater", () => {
  test("F3: a row added after removing a middle row starts empty", async () => {
    const valid = vi.fn()
    await render(
      <Parcels onValidSubmit={valid} defaults={{ p: [{ n: "A" }, { n: "B" }, { n: "C" }] }} />,
    )
    expect(names()).toEqual(["A", "B", "C"])
    $$<HTMLButtonElement>("[data-slot=dilekce-repeat-remove-button]")[1]!.click()
    await vi.waitFor(() => expect(names()).toEqual(["A", "C"]))
    $<HTMLButtonElement>("[data-slot=dilekce-repeat-add] button").click()
    await vi.waitFor(() => expect(names()).toEqual(["A", "C", ""]))
    submit()
    await vi.waitFor(() => expect(valid).toHaveBeenCalledTimes(1))
    expect(valid.mock.calls[0]![0]).toEqual({ p: [{ n: "A" }, { n: "C" }, { n: "" }] })
  })

  test("F3: a reset brings the default rows back, with their defaults", async () => {
    await render(<Parcels defaults={{ p: [{ n: "A" }, { n: "B" }] }} />)
    $$<HTMLButtonElement>("[data-slot=dilekce-repeat-remove-button]")[0]!.click()
    $<HTMLButtonElement>("[data-slot=dilekce-repeat-add] button").click()
    await vi.waitFor(() => expect(names()).toEqual(["B", ""]))
    $<HTMLButtonElement>("button[type=reset]").click()
    await vi.waitFor(() => expect(names()).toEqual(["A", "B"]))
    // And a row added after the reset is empty again.
    $<HTMLButtonElement>("[data-slot=dilekce-repeat-add] button").click()
    await vi.waitFor(() => expect(names()).toEqual(["A", "B", ""]))
  })

  test("F5: the summary's label follows a field that was renumbered", async () => {
    const schema = z.object({ p: z.array(z.object({ n: z.string().min(2, "too short") })) })
    await render(
      <Parcels schema={schema} defaults={{ p: [{ n: "A" }, { n: "BB" }, { n: "C" }] }} />,
    )
    submit()
    const lines = () =>
      $$("[data-slot=dilekce-summary-item]").map((item) => item.textContent?.replace(/\s+/g, " "))
    await vi.waitFor(() => expect(lines()).toHaveLength(2))
    expect(lines()[1]).toContain("Name 3")
    $$<HTMLButtonElement>("[data-slot=dilekce-repeat-remove-button]")[0]!.click()
    await vi.waitFor(() => expect(lines()).toHaveLength(1))
    await vi.waitFor(() => expect(lines()[0]).toContain("Name 2"))
    expect(lines()[0]).not.toContain("Name 3")
  })

  test("F4: the remove cell never sits alone on a line with a gap, from 250 to 1500px", async () => {
    await render(
      <div id="box" style={{ width: 250 }}>
        <Dilekce>
          <DilekceRepeat name="parcels" min={1} max={5} defaultCount={2}>
            {(row) => (
              <DilekceRow>
                <DilekceField name={row.name("w")} label="W">
                  <DilekceNumber trailing="kg" />
                </DilekceField>
                <DilekceField name={row.name("c")} label="C" span={2}>
                  <DilekceSelect options={[{ value: "a", label: "A" }]} />
                </DilekceField>
                <DilekceRepeatRemove />
              </DilekceRow>
            )}
          </DilekceRepeat>
        </Dilekce>
      </div>,
    )
    const box = $("#box")
    const bad: string[] = []
    for (let width = 250; width <= 1500; width += 3) {
      box.style.width = `${width}px`
      await frame()
      await frame()
      for (const row of $$("[data-slot=dilekce-row]")) {
        const lines = new Map<number, Element[]>()
        for (const cell of row.children) {
          const top = Math.round(cell.getBoundingClientRect().top)
          lines.set(top, [...(lines.get(top) ?? []), cell])
        }
        for (const cells of lines.values()) {
          const covered =
            cells.reduce((sum, cell) => sum + cell.getBoundingClientRect().width, 0) +
            (cells.length - 1)
          if (Math.abs(covered - row.getBoundingClientRect().width) > 1.5) {
            bad.push(`${width}px: a line of ${cells.length} covers ${Math.round(covered)}`)
          }
        }
      }
    }
    expect(bad).toEqual([])
  })
})

/* -------------------------------------------------------------------------- */
/*                         Filled mode: cell actions and affixes               */
/* -------------------------------------------------------------------------- */

describe("filled mode actions", () => {
  function Cells({ actions = true }: { actions?: boolean }) {
    return (
      <Dilekce mode="filled" copyable={actions} onEdit={actions ? () => {} : undefined}>
        <DilekceRow>
          <DilekceField name="phone" label="Telephone number" style={{ flex: "none", width: 200 }}>
            <DilekceInput defaultValue="555 0100" />
          </DilekceField>
        </DilekceRow>
      </Dilekce>
    )
  }
  const label = () => $("[data-slot=dilekce-label]")
  const actions = () => $("[data-slot=dilekce-field-actions]")

  test("fine pointers: the actions overlay the label's end instead of shrinking it", async () => {
    await render(<Cells actions={false} />)
    const plain = label().getBoundingClientRect().width
    await cleanup()
    await render(<Cells />)
    expect(label().getBoundingClientRect().width).toBe(plain)
    expect(label().scrollWidth).toBeLessThanOrEqual(label().clientWidth)
    const field = $("[data-slot=dilekce-field]").getBoundingClientRect()
    const box = actions().getBoundingClientRect()
    expect(style(actions()).position).toBe("absolute")
    // In the cell's top-right corner, over a fade.
    expect(box.right).toBeLessThanOrEqual(field.right)
    expect(field.right - box.right).toBeLessThan(24)
    expect(box.top - field.top).toBeLessThan(24)
    expect(style(actions()).backgroundImage).toContain("gradient")
    for (const button of $$("[data-slot=dilekce-field-actions] > *")) {
      const size = button.getBoundingClientRect()
      expect(size.width).toBeGreaterThanOrEqual(24)
      expect(size.height).toBeGreaterThanOrEqual(24)
    }
  })

  test("fine pointers: hidden at rest, shown on hover and on keyboard focus", async () => {
    await render(<Cells />)
    expect(style(actions()).opacity).toBe("0")
    await userEvent.hover($("[data-slot=dilekce-field]"))
    await vi.waitFor(() => expect(style(actions()).opacity).toBe("1"))
    await userEvent.unhover($("[data-slot=dilekce-field]"))
    await vi.waitFor(() => expect(style(actions()).opacity).toBe("0"))
    await userEvent.tab()
    expect(document.activeElement?.getAttribute("data-slot")).toBe("dilekce-input")
    await userEvent.tab()
    expect(document.activeElement?.getAttribute("data-slot")).toBe("dilekce-copy")
    await vi.waitFor(() => expect(style(actions()).opacity).toBe("1"))
    await userEvent.tab()
    expect(document.activeElement?.getAttribute("data-slot")).toBe("dilekce-change")
    expect(style(actions()).opacity).toBe("1")
  })

  test("tab order: a field's control, then its own actions, then the next field", async () => {
    await render(
      <Dilekce mode="filled" onEdit={() => {}}>
        <DilekceRow>
          <DilekceField name="a" label="First">
            <DilekceInput defaultValue="one" />
          </DilekceField>
          <DilekceField name="b" label="Second">
            <DilekceInput defaultValue="two" />
          </DilekceField>
        </DilekceRow>
      </Dilekce>,
    )
    const seen: string[] = []
    for (let i = 0; i < 6; i++) {
      await userEvent.tab()
      const el = document.activeElement as HTMLElement
      seen.push(
        `${el.closest("[data-slot=dilekce-field]")?.querySelector("input")?.name}:${el.dataset.slot}`,
      )
    }
    expect(seen).toEqual([
      "a:dilekce-input",
      "a:dilekce-copy",
      "a:dilekce-change",
      "b:dilekce-input",
      "b:dilekce-copy",
      "b:dilekce-change",
    ])
  })

  test("coarse pointers: always visible and in flow, so they take the label's room", async () => {
    await touch()
    await render(<Cells />)
    expect(style(actions()).position).not.toBe("absolute")
    expect(style(actions()).opacity).toBe("1")
    expect(style($("[data-slot=dilekce-change]")).display).not.toBe("none")
  })

  test("an empty field with no Change has no action box over its label", async () => {
    await render(
      <Dilekce mode="filled">
        <DilekceField name="a" label="A">
          <DilekceInput />
        </DilekceField>
      </Dilekce>,
    )
    expect(style(actions()).display).toBe("none")
  })

  for (const theme of ["light", "dark"] as const) {
    test(`${theme}: the fade matches the cell`, async () => {
      document.documentElement.classList.toggle("dark", theme === "dark")
      await render(<Cells />)
      const fade = style(actions()).backgroundImage
      expect(fade).toContain("linear-gradient")
      // The end stop is the cell's own background (the token), not a guess.
      const cell = style($("[data-slot=dilekce-field]")).backgroundColor
      const probe = document.createElement("div")
      probe.style.backgroundColor = cell
      document.body.append(probe)
      const resolved = style(probe).backgroundColor
      probe.remove()
      expect(fade).toContain(resolved)
    })
  }
})

describe("filled mode affixes", () => {
  test("a trailing affix sits right after the value, a leading one right before it", async () => {
    await render(
      <Dilekce mode="filled">
        <DilekceRow>
          <DilekceField name="w" label="Weight" span={3}>
            <DilekceNumber trailing="kg" defaultValue={1.5} />
          </DilekceField>
          <DilekceField name="v" label="Value" span={3}>
            <DilekceNumber leading="$" defaultValue={250} />
          </DilekceField>
          <DilekceField name="t" label="Text" span={3}>
            <DilekceInput trailing=".com" leading="https://" defaultValue="example" />
          </DilekceField>
        </DilekceRow>
      </Dilekce>,
    )
    for (const name of ["w", "v", "t"]) {
      const input = $<HTMLInputElement>(`[name=${name}]`)
      const wrap = input.parentElement!
      const affixes = $$("[data-slot=dilekce-affix]").filter((affix) => wrap.contains(affix))
      const box = input.getBoundingClientRect()
      expect(box.width, `${name} input is sized to its value`).toBeLessThan(
        wrap.getBoundingClientRect().width / 2,
      )
      for (const affix of affixes) {
        const side = affix.getAttribute("data-side")
        const at = affix.getBoundingClientRect()
        const gap = side === "trailing" ? at.left - box.right : box.left - at.right
        expect(gap, `${name} ${side}`).toBeGreaterThanOrEqual(0)
        expect(gap, `${name} ${side}`).toBeLessThanOrEqual(8)
      }
    }
  })

  test("in edit mode the control still fills the cell", async () => {
    await render(
      <Dilekce>
        <DilekceField name="w" label="Weight" span={3}>
          <DilekceNumber trailing="kg" defaultValue={1.5} />
        </DilekceField>
      </Dilekce>,
    )
    const input = $("[name=w]")
    const affix = $("[data-slot=dilekce-affix]")
    expect(input.getBoundingClientRect().right).toBeLessThan(affix.getBoundingClientRect().left + 1)
    expect(affix.getBoundingClientRect().left - input.getBoundingClientRect().right).toBeLessThan(8)
    expect(input.getBoundingClientRect().width).toBeGreaterThan(100)
  })
})

describe("message beside or below the label", () => {
  const label = () => $("[data-slot=dilekce-label]").getBoundingClientRect()
  const error = () => $("[data-slot=dilekce-error]").getBoundingClientRect()

  function Narrow({ label }: { label: string }) {
    return (
      <div style={{ width: 390 }}>
        <Dilekce lang="tr" messages={{ ...dilekceMessages.tr }}>
          <DilekceRow>
            <DilekceField name="d" label={label} style={{ flex: "none", width: 195 }}>
              <DilekceInput required />
            </DilekceField>
          </DilekceRow>
        </Dilekce>
      </div>
    )
  }

  test("a long label whose full text plus the message does not fit moves the message below", async () => {
    await render(<Narrow label="Teslim alma tarihi" />)
    const form = $<HTMLFormElement>("form")
    form.requestSubmit()
    await vi.waitFor(() =>
      expect($("[data-slot=dilekce-field]").hasAttribute("data-below")).toBe(true),
    )
    expect(error().top).toBeGreaterThanOrEqual(label().bottom)
    // The label keeps its full text.
    expect($("[data-slot=dilekce-label]").scrollWidth).toBeLessThanOrEqual(
      $("[data-slot=dilekce-label]").clientWidth,
    )
  })

  test("a short label keeps a short message beside it, and nothing overlaps", async () => {
    await render(<Narrow label="Ad" />)
    $<HTMLFormElement>("form").requestSubmit()
    await vi.waitFor(() => expect($("[data-slot=dilekce-error]")).toBeTruthy())
    expect($("[data-slot=dilekce-field]").hasAttribute("data-below")).toBe(false)
    expect(label().right).toBeLessThanOrEqual(error().left + 0.5)
  })
})
