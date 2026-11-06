# AGENTS.md

## Project

Orange Task Farm is an AI web service designed to help users
reduce overwhelming goals into actions that can be started within 3 minutes.

## Source of Truth

Before making changes, read:

1. docs/PRD.md
2. docs/RULES.md
3. docs/TODO.md
4. docs/ARCHITECTURE.md
5. docs/IMPLEMENTATION_PLAN.md

PRD.md and RULES.md must not be changed unless explicitly requested.

## Development Workflow

For every task:

1. Read relevant documents.
2. Inspect existing code.
3. Propose a short plan.
4. Implement the smallest required change.
5. Run tests/lint/typecheck when available.
6. Review your own changes.
7. Report changed files and results.

## Product Rules

- Prioritize the Core Loop.
- Do not add unrequested features.
- Minimize user input.
- Reward starting, not task difficulty.
- Growth is based on progress, not elapsed time.
- Side features must not interfere with the Core Loop.

## Scope Control

Do not implement future phases unless explicitly requested.

If a requirement is ambiguous, ask before making a product decision.
