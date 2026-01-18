# Agent Router (Vectorius)

This repo supports two guardrail modes:

- STRICT: `docs/agents/codex-rules.strict.md`
- AUTONOMY: `docs/agents/codex-rules.autonomy.md`

## How to choose
The user prompt MUST include one of:
- `MODE=STRICT`
- `MODE=AUTO`

If neither is present, default to `MODE=STRICT`.

## Instruction to agents
1) Read the selected rules file first and treat it as authority.
2) Then execute the user request.

## Slice execution
When the user asks to "implement Slice X", follow `docs/agents/slice-runner.md`.

The slice definitions and status live in `docs/projects/prd-pivot-plan.md`.
After each successful slice, update the status in the plan doc with "complete" + commit SHA.

If implementing a slice, default behavior is to EXECUTE and commit.

Documentation updates may follow in a second commit if required.
