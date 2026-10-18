@AGENTS.md

## Orchestration and cost

- The orchestrator plans, writes briefs and reviews; agents write the code. Agents run on Sonnet
  at `medium`. The orchestrator passes `model: opus` for design, architecture, the contract, money or
  concurrency, and a bug whose cause is unclear; a bug fix in existing code gets `effort: high`.
- A brief names the goal, the files, the check to run, what is out of scope, and asks for a final
  message of at most 300 words; long output goes to a file under /tmp and is referenced by path.
- Agents run in parallel only on independent work (e.g. iOS and Android after the contract is
  live); dependent steps of one feature run in order.
- Changes to money, concurrency, migrations, the contract or permissions are reviewed in a fresh
  context (`/code-review`) before commit; only findings that affect correctness are fixed.
- One feature per session: a large piece of work gets a spec file and is built in a fresh session.

# Compact instructions

Keep the list of changed files, open bugs, the checks that ran and their results, and the decisions
taken; drop tool output.
