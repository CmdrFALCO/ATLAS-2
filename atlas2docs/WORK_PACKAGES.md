# ATLAS-2 Work Packages

## WP-00: Docs Baseline
Goal: Establish working documentation for planning and quality gates.
Entry: None.
Exit criteria:
- atlas2docs contains MASTER_PLAN, WORK_PACKAGES, GUARDRAILS.
- Doc structure is agreed and stable enough to proceed.
Deliverables:
- atlas2docs/MASTER_PLAN.md
- atlas2docs/WORK_PACKAGES.md
- atlas2docs/GUARDRAILS.md

## WP-01: Repo Scaffolding
Goal: Minimal app boot with dev server and a rendering loop.
Entry: WP-00 complete.
Exit criteria:
- Project builds and runs on desktop browser.
- No console errors at idle.
- Basic scene renders (floor, light, camera).
Deliverables:
- Project scaffold (build, dev scripts).
- Minimal app entry and scene setup.
Notes:
- Choose stack and record the decision if not using defaults.

## WP-02: Core Engine
Goal: Core runtime with module loading and update loop.
Entry: WP-01 complete.
Status: Complete.
Exit criteria:
- AtlasEngine (or equivalent) manages scene, camera, and tick loop.
- Module loader can switch between modules without reload.
- No console errors when loading/unloading a module.
Deliverables:
- Core engine classes.
- Module interface (onLoad/onUpdate/onUnload).

## WP-03: Interaction System
Goal: User input and interaction primitives.
Entry: WP-02 complete.
Status: Complete.
Exit criteria:
- Raycast select works on desktop mouse.
- VR controller ray or pointer works (if device available).
- Interaction events routed to modules.
Deliverables:
- Interaction system (raycaster, select, hover).
- Simple input debug overlay or logs.

## WP-04: Data and Placeholders
Goal: Data loading and placeholder content pipeline.
Entry: WP-03 complete.
Exit criteria:
- JSON data loading works for at least one module.
- Placeholder generator can produce basic datasets.
- No runtime errors on malformed or missing data (fail gracefully).
Deliverables:
- Data loader utilities.
- Placeholder JSON for Mnemosyne, Themis, and Tecton.

## WP-05: Mnemosyne Demo
Goal: Knowledge graph demo with AI suggestion workflow.
Entry: WP-04 complete.
Exit criteria:
- Graph renders with clusters and labels.
- AI-suggested edges are visually distinct.
- Trust panel accept/reject flow works end-to-end.
Deliverables:
- Mnemosyne module.
- Graph renderer and UI panels.

## WP-06: Themis Demo
Goal: CPN workflow visualization with checkpoints.
Entry: WP-05 complete.
Exit criteria:
- Petri net visualization renders nodes and arcs.
- Token animation follows scripted path.
- Human checkpoint panel appears and blocks/resumes flow.
Deliverables:
- Themis module.
- Token animation and checkpoint UI.

## WP-07: Tecton Demo
Goal: Parametric configurator with comparisons.
Entry: WP-06 complete.
Exit criteria:
- Placeholder model or primitive-based module renders.
- Parameter UI updates the model state.
- AI suggestion comparison can be toggled.
Deliverables:
- Tecton module.
- Placeholder model loader or variant switcher.

## WP-08: Polish and QA
Goal: Demo stability and basic polish.
Entry: WP-07 complete.
Exit criteria:
- No known bugs or console errors.
- Core flows for all three demos are stable.
- Light performance pass (remove obvious bottlenecks).
Deliverables:
- QA notes and fixes.
- Final demo checklist.
