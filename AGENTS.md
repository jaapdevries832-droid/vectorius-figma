# Codex Instructions

Always read `docs/codex-rules.md` before doing any work in this repo.
Those rules are non-negotiable and override defaults.
If any rule conflicts with a request, stop and ask.

# Agent Router (Vectorius)

This repo supports two guardrail modes:

- STRICT: `docs/codex-rules.strict.md`
- AUTONOMY: `docs/codex-rules.autonomy.md`

## How to choose
The user prompt MUST include one of:
- `MODE=STRICT`
- `MODE=AUTO`

If neither is present, default to `MODE=STRICT`.

## Instruction to agents
1) Read the selected rules file first and treat it as authority.
2) Then execute the user request.

## Slice execution
When the user asks to “implement Slice X”, follow `docs/slice-runner.md`.

The slice definitions and status live in `docs/data-realization-plan.md`.
After each successful slice, update the status in the plan doc with ✅ + commit SHA.
