# ΛTLΛS Work Packages (WP)

## Phase 1: Foundation (The Skeleton)
- [ ] **WP-01-SETUP:** Initialize Vite + TS + Three.js repo. Configure basic WebXR scene with a floor and lights.
- [ ] **WP-02-CORE:** Implement `AtlasEngine` class and the Module loading system.
- [ ] **WP-03-INPUT:** specific VR input handling (Raycaster for selection, Thumbstick for rotation).

## Phase 2: Mnemosyne (The Graph)
- [ ] **WP-04-DATA:** Generate `knowledge-graph.json` (150 nodes, 5 clusters) per spec.
- [ ] **WP-05-VIZ:** Integrate `3d-force-graph`. Render nodes as spheres, edges as lines.
- [ ] **WP-06-UI:** Implement the "Trust Panel" (floating UI) for Accept/Reject workflow.

## Phase 3: Themis (The Logic)
- [ ] **WP-07-CPN:** Build the Token Animation system (glowing orbs moving along paths).
- [ ] **WP-08-FLOW:** Script the "Agent Council" narrative sequence (Act 1-3).

## Phase 4: Tecton (The Builder)
- [ ] **WP-09-CAD:** Implement GLTF loader with variant switching. (Note: Requires manual STEP -> GLTF conversion via FreeCAD relative to Desktop app).
- [ ] **WP-10-PARAM:** Build the "Slider UI" and link it to model scale/color changes.
