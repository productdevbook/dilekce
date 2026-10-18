import * as React from "react"
import { flushSync } from "react-dom"
import { cn } from "cn"
import { z } from "zod"

import { Button } from "@/components/ui/button"
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
  type DilekceDensity,
  type DilekceErrors,
  type DilekceMode,
} from "@/registry/dilekce/dilekce"

const INSTALL =
  "npx shadcn@latest add https://raw.githubusercontent.com/productdevbook/dilekce/main/public/r/dilekce.json"

const copy = {
  en: {
    sender: "Sender",
    parcel: "Parcel",
    delivery: "Delivery",
    name: "Full name",
    phone: "Phone",
    email: "Email",
    street: "Street address",
    city: "City",
    postcode: "Postcode",
    weight: "Weight",
    emptyText: "Not provided",
    addParcel: "Add parcel",
    contents: "Contents",
    service: "Service",
    extras: "Extras",
    notes: "Notes for the courier",
    notesHint: "Gate codes, a neighbour who takes parcels, anything that helps.",
    reset: "Clear",
    submit: "Book pickup",
    select: "Select…",
    taken: "We don't collect from this postcode yet",
    confirm: "Confirm email",
    mismatch: "Doesn't match",
    bounced: "This address bounced last time, check it",
    value: "Declared value",
    unsaved: "Unsaved changes",
    houseNumber: "Add a house number",
    noFood: "Same-day delivery doesn't take food",
    invoice: "Customs invoice",
    invoiceHint: "PDF or an image, for parcels that leave the country.",
    pickupDate: "Pickup date",
    alerts: "Alerts",
    sms: "SMS updates",
    consentLabel: "Consent",
    consent: "I agree to the courier terms",
  },
  tr: {
    sender: "Gönderici",
    parcel: "Paket",
    delivery: "Teslimat",
    name: "Ad soyad",
    phone: "Telefon",
    email: "E-posta",
    street: "Açık adres",
    city: "Şehir",
    postcode: "Posta kodu",
    weight: "Ağırlık",
    emptyText: "Belirtilmedi",
    addParcel: "Paket ekle",
    contents: "İçerik",
    service: "Hizmet",
    extras: "Ekstralar",
    notes: "Kurye için not",
    notesHint: "Kapı şifresi, paketi alabilecek komşu, işe yarayacak her şey.",
    reset: "Temizle",
    submit: "Kurye çağır",
    select: "Seçin…",
    taken: "Bu posta koduna henüz hizmet vermiyoruz",
    confirm: "E-postayı onayla",
    mismatch: "Eşleşmiyor",
    bounced: "Bu adres geçen sefer geri döndü, kontrol edin",
    value: "Beyan edilen değer",
    unsaved: "Kaydedilmemiş değişiklikler",
    houseNumber: "Bina numarasını ekleyin",
    noFood: "Aynı gün teslimat gıda taşımaz",
    invoice: "Gümrük faturası",
    invoiceHint: "PDF ya da görsel; yurt dışına giden paketler için.",
    pickupDate: "Alım tarihi",
    alerts: "Bildirimler",
    sms: "SMS ile haber ver",
    consentLabel: "Onay",
    consent: "Kurye şartlarını kabul ediyorum",
  },
}

type Lang = keyof typeof copy

/** Today as the date input writes it (local time, not UTC). */
const today = () => new Date().toLocaleDateString("sv")

export function App() {
  const [mode, setMode] = React.useState<DilekceMode>("edit")
  const [density, setDensity] = React.useState<DilekceDensity>("comfortable")
  const [focus, setFocus] = React.useState<"line" | "ring">("line")
  const [lang, setLang] = React.useState<Lang>("en")
  const [errors, setErrors] = React.useState<DilekceErrors>()
  const [submitted, setSubmitted] = React.useState<Record<string, unknown>>()
  const [width, setWidth] = React.useState(100)
  const [sample, setSample] = React.useState(0)
  const [advance, setAdvance] = React.useState(true)
  const [dirty, setDirty] = React.useState(false)
  const t = copy[lang]

  // The rules the browser can't express, as a Standard Schema (Zod here; Valibot
  // and ArkType work the same). Values are strings, so numbers are coerced.
  const booking = React.useMemo(
    () =>
      z
        .looseObject({
          street: z.string().regex(/\d/, t.houseNumber),
          // The repeater's rows nest: parcels.0.weight, parcels.1.weight, …
          parcels: z.array(z.object({ weight: z.coerce.number(), contents: z.string() })),
          value: z.union([z.literal("").transform(() => undefined), z.coerce.number()]),
          service: z.string(),
          // A single checkbox is "on" when ticked and absent when not.
          consent: z.literal("on"),
          // A file field gives a File (File[] with `multiple`), absent when none was chosen.
          invoice: z.instanceof(File).optional(),
        })
        // No path: the issue belongs to the form, so only the summary shows it.
        .refine(
          (v) => !(v.service === "same-day" && v.parcels.some((p) => p.contents === "food")),
          {
            message: t.noFood,
          },
        ),
    [t],
  )
  // The example fills the form by name; a reset goes back to these.
  const defaults = React.useMemo(
    () => ({
      parcels: [{ weight: 1.5 }],
      service: "standard",
      sms: true,
      ...(sample
        ? {
            name: "Ada Lovelace",
            email: "ada@analytical.engine",
            confirm: "ada@analytical.engine",
            city: "London",
            value: 250,
            parcels: [
              { weight: 1.5, contents: "documents" },
              { weight: 4, contents: "clothing" },
            ],
            extras: ["signature"],
            pickup: today(),
          }
        : {}),
    }),
    [sample],
  )

  return (
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">dilekçe</h1>
            <p className="max-w-xl text-pretty text-muted-foreground">
              Dense, paper-style grid forms for shadcn/ui. Every field is a cell, errors sit inside
              it, and the same form renders filled in like a completed document. Native controls,
              one file.
            </p>
          </div>
          <ThemeToggle />
        </div>
        <InstallCommand />
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <Segmented label="Mode" value={mode} options={["edit", "filled"]} onChange={setMode} />
          <Segmented
            label="Density"
            value={density}
            options={["compact", "comfortable", "roomy"]}
            onChange={setDensity}
          />
          <Segmented label="Focus" value={focus} options={["line", "ring"]} onChange={setFocus} />
          <Segmented label="Messages" value={lang} options={["en", "tr"]} onChange={setLang} />
          <Segmented
            label="Enter"
            value={advance ? "next field" : "submit"}
            options={["next field", "submit"]}
            onChange={(value) => setAdvance(value === "next field")}
          />
          <label className="flex items-center gap-2 text-muted-foreground">
            Width
            <input
              type="range"
              min={35}
              max={100}
              value={width}
              onChange={(event) => setWidth(Number(event.currentTarget.value))}
              className="w-28 accent-primary"
            />
            <span className="w-9 font-mono text-xs tabular-nums">{width}%</span>
          </label>
          <Button size="sm" variant="outline" onClick={() => setSample((n) => n + 1)}>
            Fill example
          </Button>
        </div>

        <div style={{ width: `${width}%` }} className="relative transition-[width]">
          {dirty && (
            <span className="absolute -top-6 right-0 text-xs text-muted-foreground">
              ● {t.unsaved}
            </span>
          )}
          <Dilekce
            key={`${lang}-${sample}`}
            mode={mode}
            density={density}
            focus={focus}
            messages={dilekceMessages[lang]}
            errors={errors}
            advance={advance}
            // Check your answers: Change in filled mode goes back to the field.
            onEdit={({ element }) => {
              flushSync(() => setMode("edit"))
              element.focus()
            }}
            emptyText={t.emptyText}
            warnUnsaved
            onDirtyChange={setDirty}
            schema={booking}
            defaultValues={defaults}
            onSubmit={(event) => event.preventDefault()}
            onValidSubmit={(values) => {
              setSubmitted(values)
              // A pretend server: it remembers one address that bounced.
              if (String(values.email).endsWith("@bounce.test")) {
                setErrors({ email: t.bounced })
              }
            }}
            onReset={() => setSubmitted(undefined)}
          >
            <DilekceSummary />
            <DilekceSection legend={t.sender}>
              <DilekceRow>
                <DilekceField name="name" label={t.name} span={2}>
                  <DilekceInput required autoComplete="name" />
                </DilekceField>
                <DilekceField name="phone" label={t.phone}>
                  <DilekceInput type="tel" autoComplete="tel" />
                </DilekceField>
                <DilekceField name="email" label={t.email} span={2}>
                  <DilekceInput type="email" required autoComplete="email" />
                </DilekceField>
                <DilekceField
                  name="confirm"
                  label={t.confirm}
                  span={2}
                  validate={(value, data) => value !== data.get("email") && t.mismatch}
                >
                  <DilekceInput type="email" required autoComplete="email" />
                </DilekceField>
              </DilekceRow>
              <DilekceRow>
                <DilekceField name="street" label={t.street} span={3}>
                  <DilekceInput required autoComplete="street-address" />
                </DilekceField>
                <DilekceField name="city" label={t.city}>
                  <DilekceInput autoComplete="address-level2" />
                </DilekceField>
                <DilekceField
                  name="postcode"
                  label={t.postcode}
                  messages={{ patternMismatch: lang === "tr" ? "5 hane" : "5 digits" }}
                  validate={async (value) => {
                    // A pretend coverage lookup.
                    await new Promise((resolve) => setTimeout(resolve, 700))
                    return value === "00000" && t.taken
                  }}
                >
                  <DilekceInput
                    required
                    inputMode="numeric"
                    pattern="\d{5}"
                    autoComplete="postal-code"
                  />
                </DilekceField>
              </DilekceRow>
            </DilekceSection>

            <DilekceSection legend={t.parcel}>
              <DilekceRepeat name="parcels" min={1} max={5} addLabel={t.addParcel}>
                {(row) => (
                  <DilekceRow>
                    <DilekceField name={row.name("weight")} label={`${t.weight} ${row.index + 1}`}>
                      <DilekceNumber min={0.1} max={30} step={0.1} required trailing="kg" />
                    </DilekceField>
                    <DilekceField
                      name={row.name("contents")}
                      label={`${t.contents} ${row.index + 1}`}
                      span={2}
                    >
                      <DilekceSelect
                        required
                        placeholder={t.select}
                        options={[
                          { value: "documents", label: "Documents" },
                          { value: "clothing", label: "Clothing" },
                          { value: "electronics", label: "Electronics" },
                          { value: "food", label: "Food (non-perishable)" },
                          { value: "other", label: "Other" },
                        ]}
                      />
                    </DilekceField>
                    <DilekceRepeatRemove />
                  </DilekceRow>
                )}
              </DilekceRepeat>
              <DilekceRow>
                <DilekceField name="value" label={t.value}>
                  <DilekceNumber min={0} step={10} leading="$" />
                </DilekceField>
                <DilekceField name="invoice" label={t.invoice} span={3} description={t.invoiceHint}>
                  <DilekceFile accept="application/pdf,image/*" />
                </DilekceField>
              </DilekceRow>
            </DilekceSection>

            <DilekceSection legend={t.delivery}>
              <DilekceRow>
                <DilekceField name="service" label={t.service} span={2}>
                  <DilekceRadioGroup
                    required
                    options={[
                      { value: "standard", label: "Standard" },
                      { value: "express", label: "Express" },
                      { value: "same-day", label: "Same day" },
                    ]}
                  />
                </DilekceField>
                <DilekceField name="extras" label={t.extras} span={2}>
                  <DilekceCheckboxGroup
                    options={[
                      { value: "insurance", label: "Insurance" },
                      { value: "signature", label: "Signature" },
                      { value: "fragile", label: "Fragile" },
                    ]}
                  />
                </DilekceField>
              </DilekceRow>
              <DilekceRow>
                <DilekceField name="pickup" label={t.pickupDate}>
                  <DilekceInput type="date" min={today()} required />
                </DilekceField>
                <DilekceField name="sms" label={t.alerts}>
                  <DilekceSwitch>{t.sms}</DilekceSwitch>
                </DilekceField>
                <DilekceField name="consent" label={t.consentLabel} span={2}>
                  <DilekceCheckbox required>{t.consent}</DilekceCheckbox>
                </DilekceField>
              </DilekceRow>
              <DilekceRow>
                <DilekceField name="notes" label={t.notes} span={4} description={t.notesHint}>
                  <DilekceTextarea maxLength={280} />
                </DilekceField>
              </DilekceRow>
            </DilekceSection>

            <DilekceActions>
              <Button type="reset" variant="outline">
                {t.reset}
              </Button>
              <Button type="submit">{t.submit}</Button>
            </DilekceActions>
          </Dilekce>
        </div>

        <p className="text-sm text-muted-foreground">
          Try postcode <code className="font-mono text-foreground">00000</code> for an async check,
          an email ending in <code className="font-mono text-foreground">@bounce.test</code> for a
          server error, same-day delivery of food for a form-level issue from the schema, Enter to
          move cell to cell, "Add parcel" for a repeating row, filled mode to copy values or Change
          a field, a drag across the weight label to scrub it, or a narrower width to watch rows
          wrap without a single breakpoint.
        </p>

        {submitted && (
          <pre className="overflow-x-auto rounded-lg border bg-muted p-4 font-mono text-xs">
            {JSON.stringify(
              submitted,
              (_key, value) => (value instanceof File ? `${value.name} (${value.size} B)` : value),
              2,
            )}
          </pre>
        )}
      </section>

      <footer className="mt-auto border-t pt-6 text-sm text-muted-foreground">
        MIT · built by{" "}
        <a
          className="underline underline-offset-4 hover:text-foreground"
          href="https://github.com/productdevbook"
        >
          productdevbook
        </a>
      </footer>
    </div>
  )
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: T[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex rounded-md border bg-muted p-0.5"
      >
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            onClick={() => onChange(option)}
            className={cn(
              "rounded-sm px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground transition-colors",
              value === option && "bg-background text-foreground shadow-xs",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function InstallCommand() {
  const [copied, setCopied] = React.useState(false)
  return (
    <div className="flex max-w-full items-center gap-2 self-start rounded-lg border bg-muted py-1.5 ps-3 pe-1.5">
      <code className="truncate font-mono text-sm">{INSTALL}</code>
      <Button
        size="sm"
        variant="ghost"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(INSTALL)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          } catch {
            // Clipboard blocked: the command is still there to select.
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  )
}

function ThemeToggle() {
  const [dark, setDark] = React.useState(() => document.documentElement.classList.contains("dark"))
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        const next = !dark
        setDark(next)
        document.documentElement.classList.toggle("dark", next)
        try {
          localStorage.setItem("theme", next ? "dark" : "light")
        } catch {
          // Private mode: the toggle still works for this visit.
        }
      }}
    >
      {dark ? "Light" : "Dark"}
    </Button>
  )
}
