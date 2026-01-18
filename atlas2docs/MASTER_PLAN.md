# ATLAS-2 Master Plan

## Vision
Build a modular VR demo platform (ATLAS-2) that showcases human-centric AI via three demos:
- Mnemosyne: spatial knowledge graph with AI-suggested links and human acceptance.
- Themis: agent council / CPN workflow visualization with human checkpoints.
- Tecton: parametric design configurator with AI suggestions.

## Goals
- A stable core engine for WebXR scenes and module loading.
- Three scripted, demo-ready modules with placeholder data and assets.
- Fast iteration, clear guardrails, and reproducible builds.

## Non-Goals (for now)
- Live backend integration.
- Production-grade data pipelines.
- Final art/UX polish beyond demo readiness.

## Principles
- Human-in-the-loop is visible and explicit.
- Use fake or curated data to keep demos reliable.
- Keep the core small; keep modules isolated.

## Scope and Deliverables
- Core engine: scene setup, XR loop, input, module loader.
- Shared UI: panels, tooltips, narration hooks.
- Demo modules: Mnemosyne, Themis, Tecton.
- Placeholder datasets and assets.
- Documentation and guardrails in atlas2docs.

## Milestones (aligned with Work Packages)
- WP-01: repo scaffolding and baseline runtime.
- WP-02: core engine and module system.
- WP-03: interaction system.
- WP-04: data pipeline and placeholder data.
- WP-05: Mnemosyne demo.
- WP-06: Themis demo.
- WP-07: Tecton demo.
- WP-08: polish and QA.

## Assumptions
- Stack is flexible; defaults to WebXR + Three.js + Vite + TypeScript unless changed.
- Placeholders are acceptable for data and assets.
- VR device testing is ideal but not required for every step.

## Risks and Mitigations
- Performance in VR -> keep geometry light, test early, optimize iteratively.
- Asset availability -> use placeholders and swap later.
- Scope creep -> hold the line on non-goals and exit criteria.
