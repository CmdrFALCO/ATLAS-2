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
Status: Complete.
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
Status: Complete.
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
Status: Complete.
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
Status: Complete.
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
Status: Complete.
Exit criteria:
- No known bugs or console errors.
- Core flows for all three demos are stable.
- Light performance pass (remove obvious bottlenecks).
Deliverables:
- QA notes and fixes.
- Final demo checklist.

## WP-09: Performance and Bundle Split
Goal: Reduce startup cost and improve frame stability on Quest.
Entry: WP-08 complete.
Status: Complete.
Exit criteria:
- Modules are dynamically imported (Mnemosyne/Themis/Tecton).
- Bundle warning addressed or documented with rationale.
- FPS stable for all demos on Quest (spot-check).
Deliverables:
- Lazy loading for modules.
- Performance notes and measurements.

## WP-10: Mnemosyne Scale + Visual Upgrade
Goal: Move from placeholder graph to demo-scale knowledge space.
Entry: WP-09 complete.
Status: Complete.
Exit criteria:
- 150+ nodes render with readable labels in VR.
- Explicit vs AI edges are visually distinct and legible.
- Cluster expansion or emphasis interaction implemented.
Deliverables:
- Force-graph integration or improved layout system.
- Mnemosyne data expanded to demo scale.

## WP-11: Themis Narrative Upgrade
Goal: Match the Agent Council narrative beats.
Entry: WP-10 complete.
Status: Complete.
Exit criteria:
- Chaos vs. CPN contrast visualization implemented.
- Checkpoint panel shows richer source list content.
- Token animation uses easing and clear pause/resume cues.
Deliverables:
- Themis chaos view and split-screen/contrast mode.
- Updated checkpoint UI content.

## WP-12: Tecton GLTF Upgrade
Goal: Replace primitives with real or placeholder GLTF variants.
Entry: WP-11 complete.
Status: Pending.
Exit criteria:
- GLTF variants load and swap from manifest.
- Side-by-side comparison works with real geometry.
- Exploded view or layered separation implemented (basic).
Deliverables:
- GLTF loader and variant switcher.
- Exploded view animation.

## WP-13: Scenario Runner + Narration
Goal: Scripted sequence support across demos.
Entry: WP-12 complete.
Status: Pending.
Exit criteria:
- Scenario runner can trigger tooltips, highlights, and waits.
- At least one scripted sequence per demo.
- Narration text hooks integrated (audio optional).
Deliverables:
- Scenario runner module.
- Tooltip and narration system.

## WP-14: Hosting + Recording
Goal: Ready-to-share demo package.
Entry: WP-13 complete.
Status: Pending.
Exit criteria:
- Hosted build available via URL.
- Backup screen recordings captured.
- Demo runbook updated.
Deliverables:
- Deployment instructions.
- Recorded demo assets.
