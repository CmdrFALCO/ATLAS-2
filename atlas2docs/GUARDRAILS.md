# ATLAS-2 Guardrails

## Quality Gates
- Do not advance to the next work package until exit criteria are met.
- No unresolved runtime errors or console errors are allowed.
- If a bug is found, fix it before moving on.

## Process Rules
- Work in small, testable increments.
- Prefer placeholders over blocking on real assets or data.
- Keep docs updated when scope or decisions change.

## Architecture Rules
- Keep the core engine minimal and stable.
- Modules must be isolated and load/unload cleanly.
- Shared systems (input, UI, data) live in core, not in modules.

## Data Rules
- Use fake or curated data by default.
- Validate data shape at load time and fail gracefully.
- Keep data schemas documented and consistent across modules.

## VR and UX Rules
- Favor readable text and clear spatial spacing.
- Avoid rapid motion or camera movement that can cause discomfort.
- Keep interactions simple: point, select, grab.

## Decision Tracking
- If the stack changes, document the decision and rationale.
- Record major trade-offs so the plan stays consistent.
