# dilekce install and distribution audit

Tested with shadcn CLI 4.22.0 against http://127.0.0.1:5318/r/dilekce.json. Scratch projects are in /tmp/dilekce-audit/install/{vite-radix,vite-base,next-radix,next-base,legacy}. Screenshots are *-light.png, *-dark.png and *-errors.png in the same folder. The demo form uses every component (Input, Number, Select, RadioGroup, CheckboxGroup, Textarea, Actions) in edit and filled mode.

## Setup

`npx shadcn@latest init -t {vite|next} -b {radix|base} -p nova -y --no-monorepo`. Init offers template (next, start, vite, react-router, laravel, astro) and base (base, radix, aria). Both bases tried. Init logs had no warnings or errors.

`add http://127.0.0.1:5318/r/dilekce.json` succeeded on all four projects with no prompts or warnings. It wrote one file (`components/ui/dilekce.tsx`, or `src/components/ui/...` in the Vite and src-layout projects). The CLI strips `"use client"` for non-RSC (Vite) projects and keeps it for Next, which is correct.

## Findings

### P0 - README install URL returns 404

- `curl https://raw.githubusercontent.com/productdevbook/dilekce/main/public/r/dilekce.json` returns 404. `gh repo view productdevbook/dilekce` cannot resolve the repo, so it is private or not pushed (unconfirmed which).
- The only documented install path is broken for every real user until the repo is public. There is no deployed demo or site URL, and there is no deploy workflow in .github/workflows.
- Fix (S): publish the repo, or host `/r/*.json` on a stable domain (Pages or Vercel) and document `npx shadcn@latest add https://<domain>/r/dilekce.json`. Add a CI step that curls the documented URL after deploy.

### P1 - Fails `exactOptionalPropertyTypes` (7 errors inside the shipped file)

- Errors at registry/dilekce/dilekce.tsx lines ~798/800 (FieldContextValue `name`), 1064, 1096, 1125, 1233 (`useControl(props)` takes `{id?: string; name?: string; ...}` but gets `string | undefined`), and 1440 and 1493 (`{ name: string | undefined }`). Line numbers drift by 2 in the Next copy because of `"use client"`.
- Reproduce: `tsc -p tsconfig.app.json --noEmit --exactOptionalPropertyTypes` in any of the 4 projects.
- Fix (S): add `| undefined` to the optional fields of `FieldContextValue` and the `useControl` parameter type.
- Related: `<Dilekce mode={cond ? "filled" : undefined}>` also errors, because the props declare `mode?: DilekceMode`. Same fix style for the public prop types.
- `noUncheckedIndexedAccess` gives 0 errors in Next and in Vite. The default strict config of all four projects also gives 0 errors.
- Gotcha: the Vite template's root `tsconfig.json` has `"files": []` plus references, so `tsc --noEmit` there checks nothing. Use `tsc -b` or `-p tsconfig.app.json`. `tsc -b` passes.

### P1 - Hard dependency on React 19, undocumented

- `ref` is passed as a plain prop on function components (`ref={formRef}`, `ComponentProps<"input">` includes `ref`). The file has no `forwardRef`.
- On React 18, refs to these components are silently dropped. The README says "nothing beyond React, Tailwind CSS v4". `registry:ui` has no way to declare a React peer version.
- Fix (S): state "React 19+" in the README, in `description` and in `docs`. For a stronger guarantee, add a `meta` field.

### P1 - `cn` import (`from "cn"`) differs from every shadcn component

- Stock shadcn components import `@/lib/utils`. Fresh 4.22 projects already have `lib/utils.ts` as `export { cn } from "cn"`, so they resolve to the same function (no conflict in the 4 fresh projects).
- On a legacy project (`legacy/`, clsx plus tailwind-merge `cn` in `@/lib/utils`) the add installs a second `cn` package (`"cn": "^0.5.0"` was added to package.json) and typechecks. There are now two `cn` implementations in the project: dilekce uses the `cn` package, everything else uses twMerge. Class-conflict resolution may differ, and the extra dependency is surprising.
- Trade-off: the `cn` import is deliberate, but it should be documented. The alternative is `import { cn } from "@/lib/utils"` plus `registryDependencies: ["utils"]`, the conventional shadcn way. That rewrites to the user's alias and adds no dependency.

### P2 - Registry metadata is minimal

Both registry.json and public/r/dilekce.json validate against the shadcn schemas (registry.json, public/r/registry.json and the item all pass ajv). The item schema's `properties` are: name, type, description, title, author, dependencies, devDependencies, registryDependencies, files, tailwind, cssVars, css, envVars, meta, docs, categories, extends, style, iconLibrary, baseColor, theme, font. Missing from dilekce:

- `docs`: shown after `add`. Use it for a usage hint, the React 19 note, and mention of `<Button>` (`registryDependencies: ["button"]` is not declared, though the README usage needs it).
- `author`, `categories` (for example `["forms"]`), `meta`.
- Only one item exists. No `registry:block` examples (for example the shipping form from src/app.tsx) that users can `add` and read. The CLI schema's `type` enum in 4.22 has no `registry:example`, so use `registry:block`.
- `cssVars`/`css`: none, which is good (tokens only). The `--dk-*` vars are internal.
- `registry.json` also has no `include` or `pagination`. These are not needed for one item.
- Effort S to M.

### P2 - No versioning or update story

- Item JSON has no version. package.json is `0.1.0` and private, there are no git tags (`git tag` is empty), no CHANGELOG, and no release workflow.
- Updates: `shadcn diff` is DEPRECATED in 4.22. The replacement is `add <url> --diff`, which I verified. It printed a correct unified diff against my edited local copy, and `add` without `--overwrite` prompts "already exists. overwrite?" even with `-y`. The README does not mention updating at all.
- Fix (S): add an "Updating" section (`npx shadcn@latest add <url> --diff`, then `--overwrite`). Publish versioned URLs (tags, or `/r/v1/dilekce.json`) so users can pin, because `main` is the only ref.
- `shadcn docs`/`view`: `view <url>` works. `docs <url>` says "not found in the shadcn registry" (it only supports the official registry), so it is not a gap in dilekce.

### P2 - Namespace and discoverability

- No `@dilekce` registry namespace, and not listed in the shadcn registry directory (registries.json PR). The URL form is long, and `npx shadcn add @dilekce/dilekce` is not possible. Effort S.

### P3 - Next.js usage gotcha

`<Dilekce onSubmit={fn}>` used from a Server Component fails `next build` with "Event handlers cannot be passed to Client Component props". The user's file needs `"use client"`, which is standard React. Mention it in the README. The next-build failure I hit was my own demo and is fixed by `"use client"` on it.

### P3 - Demo observation (not install)

`DilekceNumber defaultValue={1.5}` with no `step` shows "Invalid step" on submit (native step default is 1). This is native behavior, but it is a likely first-hit surprise (see vite-base-errors.png). Consider documenting `step="any"`.

## Build and visual results

| project                | tsc default     | strict-plus                     | build                            | console errors              |
| ---------------------- | --------------- | ------------------------------- | -------------------------------- | --------------------------- |
| vite-radix / vite-base | pass (`tsc -b`) | 7 plus 1 errors (exactOptional) | `vite build` ok                  | none                        |
| next-radix / next-base | pass            | same                            | `next build` ok (16.4.0, static) | none, no hydration warnings |

Rendering: all four projects (Radix and Base UI, Vite and Next) look the same and correct in light and dark (`.dark` class toggled). They use the project's own nova theme (neutral tokens, Geist). Errors render inside cells (red cell, short message) and filled mode renders as a document. The Base UI vs Radix choice makes no difference, since dilekce uses native controls and does not touch either. The `<Button>` from the template was only used for the actions row.

## CI (.github/workflows/ci.yml)

- Action versions exist (checkout v7.0.1, setup-node v7.1.0, setup-bun v2.2.0). Concurrency, permissions: contents read, and frozen lockfile are good.
- P2: `git diff --exit-code public/r` ignores new untracked files. Use `git status --porcelain public/r` (or `git add -N`) so a newly added registry item is caught. Also `bun run build` runs `registry:build` before `vite build`, so the check is correct for edits.
- P2: CI runs `bunx vitest run` instead of `bun run test`, which is fine but redundant with the separate lint and typecheck steps. No install-smoke test: nothing in CI does `shadcn add` of the built JSON into a fresh Vite/Next project and builds it. Add one (a matrix of vite and next, strict-plus tsc). That would have caught the exactOptional errors and the README URL. Effort M.
- P3: no OS or Node matrix, and no concurrency on release because there is no release or deploy job. Renovate uses deprecated `config:base` (now `config:recommended`).
- P3: emoji in step names is cosmetic.
