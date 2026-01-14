# Documentation Directory

This directory contains all project documentation organized by purpose.

## Structure

```
docs/
├── README.md                    # This file
├── Attributions.md              # Third-party licenses and credits
├── agents/                      # AI agent instruction files
│   ├── codex-rules.strict.md   # Strict mode (default) - ask before acting
│   ├── codex-rules.autonomy.md # Autonomy mode - minimal supervision
│   └── slice-runner.md         # Vertical slice execution workflow
├── project/                     # Project-specific documentation
│   └── data-realization-plan.md # Hardcoded → Supabase migration tracker
├── slices/                      # Individual slice scope documents
│   ├── slice-2-scope.md
│   ├── slice-4-scope.md
│   ├── slice-6-scope.md
│   └── slice-7-scope.md
└── archive/                     # Deprecated/historical documents
    └── codex-rules-old.md
```

## Agent Instructions

The files in `agents/` define how AI coding assistants (Claude Code, Cursor, etc.) should work with this codebase.

**Entry point**: See [../CLAUDE.md](../CLAUDE.md) in the repository root - this file is automatically loaded by Claude Code and references the detailed agent instructions.

### Operating Modes

1. **Strict Mode** (default) - [agents/codex-rules.strict.md](agents/codex-rules.strict.md)
   - Stop and ask when uncertain
   - Explicit approval required before coding
   - Detailed pre-commit verification
   - Use for: regular development, unfamiliar tasks

2. **Autonomy Mode** - [agents/codex-rules.autonomy.md](agents/codex-rules.autonomy.md)
   - Make conservative decisions automatically
   - Execute vertical slices with minimal supervision
   - Use for: overnight batch work, well-defined slice execution

3. **Slice Runner** - [agents/slice-runner.md](agents/slice-runner.md)
   - Standard process for executing data realization slices
   - References the tracker in `project/data-realization-plan.md`

## Project Documentation

### Data Realization Plan

[project/data-realization-plan.md](project/data-realization-plan.md) tracks the migration from hardcoded/localStorage data to Supabase.

**Contents:**
- Inventory of all hardcoded data sources
- Proposed Supabase schema (tables, views, RLS policies)
- 8-slice implementation plan
- Status tracker with commit SHAs and manual test paths

**Status Legend:**
- ⬜ Not started
- 🟨 In progress
- ✅ Complete
- ⛔ Blocked

## Slice-Specific Documentation

The `slices/` directory contains detailed scope documents for individual slices when the scope is complex enough to warrant a separate file.

## Archive

The `archive/` directory contains deprecated documentation that may be useful for historical reference but should not be used for current development.

## Maintenance

- **CLAUDE.md**: Update when adding new patterns or common gotchas
- **Agent rules**: Update when process changes (migration workflow, commit format, etc.)
- **Data realization plan**: Update slice status after each implementation
- **Slice docs**: Create only when a slice needs more detailed planning than the main plan provides

---

**Last updated**: 2026-01-13
