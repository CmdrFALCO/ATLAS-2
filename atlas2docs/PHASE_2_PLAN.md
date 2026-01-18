# ATLAS-2 Phase 2 Plan

## Goals
- Improve performance and stability on Quest.
- Replace placeholder visuals with better representations.
- Add light UX polish and demo sequencing.

## Proposed Work Packages

### WP-09: Performance and Bundle Split
Goal: Reduce startup cost and improve frame stability.
Entry: Phase 1 complete.
Exit criteria:
- Dynamic imports for demo modules (Mnemosyne/Themis/Tecton).
- Bundle warning addressed or accepted with rationale.
- FPS stable for all demos on Quest.
Deliverables:
- Module code-splitting and lazy loading.
- Performance notes and measurements.

### WP-10: Mnemosyne Visual Upgrade
Goal: Improve readability and visual hierarchy.
Entry: WP-09 complete.
Exit criteria:
- Node labels are readable at arm's length in VR.
- Edge styling communicates explicit vs AI clearly.
- Optional: simple cluster volumes or halos.
Deliverables:
- Mnemosyne visual polish pass.

### WP-11: Themis Animation Polish
Goal: Improve token and checkpoint presentation.
Entry: WP-10 complete.
Exit criteria:
- Token motion is smooth with easing.
- Checkpoint panel placement is consistent and readable.
- Optional: subtle motion cues for active transitions.
Deliverables:
- Updated token animation and panel behavior.

### WP-12: Tecton Model Upgrade
Goal: Replace box placeholders with GLTF variants.
Entry: WP-11 complete.
Exit criteria:
- Load and swap GLTF variants from manifest.
- Side-by-side comparison works with real geometry.
- Basic exploded view optional (stretch goal).
Deliverables:
- GLTF loader integration and variant switcher.

### WP-13: Demo Sequencing and Narration
Goal: Optional scripted sequencing for a guided demo run.
Entry: WP-12 complete.
Exit criteria:
- Start-to-finish scripted flow with timing controls.
- Manual override remains available.
Deliverables:
- Scenario runner for Phase 2 demos.

## Notes
- Prioritize WP-09 for a smoother Quest experience.
- Each WP should follow the guardrails: no known errors before moving on.
