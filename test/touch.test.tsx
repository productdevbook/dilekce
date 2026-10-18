import { afterEach, beforeAll, expect, test } from "vitest"
import { cleanup, render } from "vitest-browser-react"

import "../src/index.css"
import { Dilekce, DilekceField, DilekceInput, DilekceRow } from "../registry/dilekce/dilekce"

// The touch project (vitest.config.ts) launches this file's browser with a coarse pointer that
// can't hover, as a phone's is. It is its own file, and its own browser, because CDP touch
// emulation can't be switched off again to a fine pointer on headless Linux.
beforeAll(() => {
  expect(matchMedia("(pointer: coarse)").matches, "the touch project's pointer").toBe(true)
  expect(matchMedia("(hover: none)").matches, "the touch project's hover").toBe(true)
})

afterEach(() => cleanup())

const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!
const style = (el: Element) => getComputedStyle(el)

test("filled mode: coarse pointers see the actions always, in flow, so they take the label's room", async () => {
  await render(
    <Dilekce mode="filled" copyable onEdit={() => {}}>
      <DilekceRow>
        <DilekceField name="phone" label="Telephone number" style={{ flex: "none", width: 200 }}>
          <DilekceInput defaultValue="555 0100" />
        </DilekceField>
      </DilekceRow>
    </Dilekce>,
  )
  const actions = $("[data-slot=dilekce-field-actions]")
  expect(style(actions).position).not.toBe("absolute")
  expect(style(actions).opacity).toBe("1")
  expect(style($("[data-slot=dilekce-change]")).display).not.toBe("none")
  expect(style(actions).backgroundImage).toBe("none")
})
