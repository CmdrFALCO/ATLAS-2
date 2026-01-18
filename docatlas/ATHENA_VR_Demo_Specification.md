# ATHENA & CellCAD VR Demo Specification

**Version:** 1.0  
**Date:** January 17, 2026  
**Status:** Planning Complete, Ready for Spike  

---

## Executive Summary

Three VR demonstrations showcasing Human-Centric AI principles:

1. **ATHENA Knowledge Space** — Spatial knowledge graph with visible AI suggestions
2. **ATHENA Agent Council** — CPN-coordinated multi-agent workflow visualization  
3. **CellCAD Configurator** — Parametric engineering design in VR

**Target:** Internal sponsorship for Human-Centric AI research  
**Approach:** Directed demo scenarios with curated fake data (not live tools)  
**Platform:** Meta Quest 3 via WebXR  
**Timeline:** ~6 weeks to demo-ready  

---

## Table of Contents

1. [Strategic Context](#1-strategic-context)
2. [Human-Centric AI Framing](#2-human-centric-ai-framing)
3. [Technical Architecture](#3-technical-architecture)
4. [Demo 1: Knowledge Space](#4-demo-1-knowledge-space)
5. [Demo 2: Agent Council (CPN)](#5-demo-2-agent-council-cpn)
6. [Demo 3: CellCAD Configurator](#6-demo-3-cellcad-configurator)
7. [Requirements & Dependencies](#7-requirements--dependencies)
8. [Implementation Plan](#8-implementation-plan)
9. [Data Specifications](#9-data-specifications)
10. [Future: Live Sync Architecture](#10-future-live-sync-architecture)

---

## 1. Strategic Context

### Goal

Build compelling VR demonstrations to secure internal sponsorship for Human-Centric AI research projects.

### Why VR?

| Traditional AI Interface | VR Human-Centric AI |
|--------------------------|---------------------|
| 2D screen | 3D space (natural human thinking) |
| Text and lists | Spatial relationships (memory palace effect) |
| Abstract representations | Embodied interaction (pointing, grabbing) |
| AI "over there" in a panel | AI suggestions IN your space |
| Human adapts to computer | Computer adapts to human |

**Key insight:** "We brought the AI into human space, not the human into computer space."

### Approach: Directed Demos

Not building free-form tools. Building **scripted experiences** that:

- Use curated fake data that tells a story
- Guide specific interactions that "just work"
- Lead to "I need this for my team" moments
- Minimize edge cases and bugs

---

## 2. Human-Centric AI Framing

### Core Principles Demonstrated

| Principle | How Demos Show It |
|-----------|-------------------|
| **Transparency** | AI suggestions visibly green, not hidden |
| **Human Agency** | User explicitly accepts/rejects AI connections |
| **Explainability** | "Why did AI suggest this?" panels |
| **Augmentation** | AI finds patterns, human decides if meaningful |
| **Trust Calibration** | Tri-color system shows confidence levels |
| **Embodied Interaction** | Physical gestures, not abstract clicks |

### Academic Framework Alignment

Human-Centric AI pillars (common academic framework):

1. **Explainability** → Visible AI suggestions with rationale
2. **Controllability** → Accept/reject workflow
3. **Transparency** → Tri-color trust system
4. **Adaptability** → AI learns from human feedback
5. **Augmentation** → Enhances cognition, doesn't replace

All three demos hit all five pillars.

### Pitch Narratives

**For Engineers:**
> "See your team's knowledge in 3D, with AI connections you control."

**For AI Scientists:**
> "Explainable AI meets spatial computing — humans stay in the loop, literally."

**For Executives:**
> "Your organization's knowledge, visible and connected, with AI you can trust."

**Complete Pitch:**
> "Most AI tools are black boxes that tell you what to think. ATHENA is different. It shows you YOUR knowledge and uses AI to surface connections you might have missed. But here's the key: you see exactly what the AI suggests. Green connections. You can inspect why. Accept or reject. The AI proposes, the human decides. And in VR? You're standing INSIDE your knowledge. Using your brain's natural spatial reasoning. This is what human-centric AI looks like: AI that makes humans smarter, not AI that replaces human judgment."

---

## 3. Technical Architecture

### Platform Choice: WebXR

**Why not Unity (yet):**
- Steep learning curve for someone starting from zero
- Lots of friction (build, deploy, iterate cycle)
- Overkill for proof of concept

**Why WebXR:**
- Familiar web tech (React, TypeScript)
- Iterate in browser, test on Quest instantly via URL
- No app store, no install — hand someone a link
- If it works, can port to Unity later for polish

### Tech Stack

```
Runtime:
├── Three.js           — 3D rendering
├── WebXR API          — VR interaction (browser-native)
├── three-forcegraph   — Graph visualization (Demo 1)
├── TypeScript         — Type safety
└── Vite               — Build tooling

No new npm dependencies beyond these.
```

### Project Structure

```
vr-demos/
├── package.json
├── vite.config.ts
├── tsconfig.json
│
├── shared/                      # Shared infrastructure
│   ├── scene-setup.ts           # Three.js + WebXR boilerplate
│   ├── scenario-runner.ts       # Event sequencing engine
│   ├── tooltip-system.ts        # Floating text panels
│   ├── interaction.ts           # Point, select, grab handlers
│   ├── narration.ts             # Text/audio sync
│   └── types.ts                 # Shared type definitions
│
├── demos/
│   ├── knowledge-space/         # Demo 1
│   │   ├── index.html
│   │   ├── main.ts
│   │   ├── scenario.json
│   │   ├── graph-renderer.ts
│   │   └── connection-panel.ts
│   │
│   ├── agent-council/           # Demo 2
│   │   ├── index.html
│   │   ├── main.ts
│   │   ├── scenario.json
│   │   ├── cpn-renderer.ts      # Petri net visualization
│   │   ├── token-animation.ts
│   │   └── checkpoint-panel.ts
│   │
│   └── cellcad/                 # Demo 3
│       ├── index.html
│       ├── main.ts
│       ├── scenario.json
│       ├── module-loader.ts     # GLTF loading
│       ├── parameter-panel.ts
│       └── explode-view.ts
│
├── data/
│   ├── knowledge-graph.json     # Fake ATHENA data
│   ├── workflow.json            # CPN workflow definition
│   └── manifest.json            # CellCAD variants metadata
│
└── assets/
    ├── models/                  # CellCAD GLTF files
    └── audio/                   # Optional narration
```

### Scenario Runner System

All demos use a common event sequencing system:

```typescript
type DemoEvent =
  | { type: 'WAIT'; seconds: number }
  | { type: 'TOOLTIP'; text: string; position: 'center' | 'node'; nodeId?: string }
  | { type: 'HIGHLIGHT_CLUSTER'; clusterId: string }
  | { type: 'HIGHLIGHT_NODE'; nodeId: string }
  | { type: 'HIGHLIGHT_EDGE'; edgeId: string }
  | { type: 'ENABLE_INTERACTION'; interaction: 'point' | 'select' | 'grab' }
  | { type: 'WAIT_FOR_ACTION'; action: 'select_node' | 'accept_connection' | string }
  | { type: 'ADD_NODE'; node: DemoNode; animate: boolean }
  | { type: 'ADD_EDGES'; edges: DemoEdge[]; animate: boolean }
  | { type: 'NARRATION'; audioFile?: string; text: string }
  | { type: 'TRANSITION_SCENE'; target: string };
```

---

## 4. Demo 1: Knowledge Space

### Concept

User stands inside a 3D knowledge graph representing their team's research. AI suggestions are visible as green connections. User can inspect why AI made suggestions and accept/reject them.

### Duration

2-3 minutes

### Theme

"Your knowledge, your control"

### Scene Description

Floating in a 3D knowledge graph — battery R&D team's work. ~150 nodes in organic clusters. Clusters: Chemistry, Thermal, Manufacturing, Testing, Strategy. Blue lines (explicit connections), green lines (AI-suggested, pulsing subtly), amber nodes (needs attention).

### Act-by-Act Script

#### Act 1: Orientation (30s)

**Visual:**
- User materializes in center of graph
- ~150 nodes in organic clusters
- Clusters labeled: Chemistry, Thermal, Manufacturing, Testing, Strategy
- Blue lines (explicit), green lines (AI-suggested, pulsing), amber nodes (2-3)

**Narration:**
> "This is six months of your team's research. Every note. Every insight. Every connection."

**Tooltip:**
> "Blue = your connections. Green = AI suggestions. You decide what's real."

---

#### Act 2: Spatial Exploration (45s)

**Narration:**
> "Point at the Thermal cluster."

**Action:** Thermal cluster highlights. User points → cluster expands, nodes spread.

**Visual:**
- 28 nodes become readable
- Subclusters emerge: "Cooling", "Runaway", "Testing"
- Connection density visible
- One green connection pulses brighter

**Narration:**
> "See that green line? The AI found something."

---

#### Act 3: Human-Centric Moment (60s) — KEY SCENE

**Narration:**
> "Select it to see why."

**Action:** User selects green connection

**Panel appears:**

```
┌─────────────────────────────────────────────┐
│  AI-Suggested Connection                    │
│                                             │
│  "Thermal Runaway Prevention"               │
│          ↕                                  │
│  "Cell Format Trade-offs"                   │
│                                             │
│  ─────────────────────────────────────────  │
│  WHY AI SUGGESTED THIS:                     │
│                                             │
│  • Both discuss heat dissipation            │
│  • "Surface area" appears in both           │
│  • Related to same project milestone        │
│  • Confidence: 78%                          │
│                                             │
│  Similar connections you accepted: 6        │
│  Similar connections you rejected: 1        │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│      [ ACCEPT ]         [ DISMISS ]         │
│                                             │
│  Your decision. AI proposes, you decide.    │
└─────────────────────────────────────────────┘
```

**Narration:**
> "The AI explains its reasoning. You see the confidence level. You make the call."

**Action:** User selects ACCEPT

**Visual:** Line transitions green → blue, subtle celebration

**Narration:**
> "Your knowledge. Your judgment. AI just helped you see it."

---

#### Act 4: Living System (30s)

**Visual:**
- Notification sound
- New node materializes (glow effect)
- Label: "Cooling System Cost Analysis"
- Green lines animate outward to 3 related nodes
- Graph subtly rebalances

**Narration:**
> "A colleague just added a note. The system found three potential connections. Tomorrow, you'll decide if they're real."

---

#### Act 5: Close (15s)

**Visual:** Camera pulls back to full graph

**Narration:**
> "This is human-centric AI. AI that shows its work. AI that waits for your judgment. Your second brain — that you actually trust."

**Visual:** ATHENA logo fades in

---

## 5. Demo 2: Agent Council (CPN)

### Concept

Visualize how Colored Petri Nets coordinate multiple AI agents reliably, with human checkpoints at critical decisions. Contrasts with chaotic "traditional" multi-agent approaches.

### Duration

2-3 minutes

### Theme

"Multi-agent AI you can trust"

### Important Note

This demo does NOT require ATHENA Phase 6 to be complete. It visualizes the concept using scripted animations. The CPN is not actually running — the demo shows what it WILL do.

### Act-by-Act Script

#### Act 1: The Problem (30s)

**Visual:** Chaotic visualization
- Multiple AI "agents" as glowing orbs
- Messages flying between them chaotically
- Some colliding, some stuck
- Output: jumbled, inconsistent
- Red warning pulses

**Narration:**
> "This is how most multi-agent AI works. Multiple AIs talking to each other. No structure. No guarantees. Sometimes it works. Sometimes chaos."

**Visual:** Visualization freezes, glitches

**Narration:**
> "You can't build critical systems on 'sometimes'."

---

#### Act 2: The CPN Solution (45s)

**Visual:** Scene transforms — order emerges
- Petri net structure materializes
- Places (circles) = states
- Transitions (rectangles) = actions
- Tokens (colored dots) = data flowing
- Clear pathways, no chaos

**Narration:**
> "ATHENA uses Colored Petri Nets. A mathematically verified coordination system. Every agent has a role. Every step is tracked. Let me show you."

**Visual:** Workflow appears: "Research Report Generation"

```
●──→ [Research] ──→ ●──→ [◆ Human] ──→ ●──→ [Analyze] ──→ ...
     Agent 1            Checkpoint        Agent 2

     "Find 5          "Are these         "Extract
      sources"         relevant?"          insights"
```

**Narration:**
> "Research. Human checkpoint. Analysis. Draft. Human review. Every step defined. Every handoff verified."

---

#### Act 3: Watch It Run (60s) — KEY SCENE

**Narration:**
> "Let's run it."

**Visual:** Token (glowing orb) appears at start, moves to Research transition

**Agent 1 (voice):**
> "Searching for battery thermal management sources..."

**Visual:** Token carries data, moves to first place. Data preview floats: "5 sources found"

**Visual:** Token approaches Human Checkpoint — STOPS

**Narration:**
> "The workflow pauses. It needs you."

**Panel appears:**

```
┌─────────────────────────────────────────────┐
│  HUMAN CHECKPOINT                           │
│                                             │
│  Agent 1 found 5 sources:                   │
│                                             │
│  ✓ Nature Energy: Thermal Runaway (2024)    │
│  ✓ IEEE: Cell Format Comparison (2023)      │
│  ✓ Internal: Project Helix Notes            │
│  ? ArXiv: Preprint, not peer-reviewed       │
│  ✗ Blog post: Low reliability               │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  [ APPROVE 3 ] [ APPROVE ALL ] [ ADD MORE ] │
│                                             │
│  The AI gathered. You curate.               │
└─────────────────────────────────────────────┘
```

**Action:** User selects "APPROVE 3"

**Visual:** Token gains color (green = approved), continues through Analysis, gains more data

**Visual:** Draft stage — Agent 3 works. Token arrives at Human Review — STOPS again

**Panel shows draft summary**

**Narration:**
> "Final review. Always a human at the end. Approve, revise, or reject."

**Action:** User approves

**Visual:** Token reaches COMPLETE — celebration

---

#### Act 4: Why This Matters (30s)

**Visual:** Split screen: Chaos (left) vs CPN (right)

**Left side:**
- "Agent 2 started before Agent 1 finished"
- "No one reviewed the sources"
- "Output used hallucinated data"
- "Can't reproduce the result"

**Right side:**
- "Every step in order, verified"
- "Human approved sources before analysis"
- "Full audit trail"
- "Run it again, same process guaranteed"

**Narration:**
> "Traditional multi-agent: hope it works. CPN-coordinated: prove it works. Same AI capabilities. Radically different reliability."

---

#### Act 5: Close (15s)

**Visual:** CPN structure pulses, transforms into ATHENA logo

**Narration:**
> "Human-centric AI isn't just about interfaces. It's about AI systems humans can trust. Verify. Audit. Control. That's ATHENA."

---

## 6. Demo 3: CellCAD Configurator

### Concept

User stands in front of a battery module they can inspect, explode into components, and reconfigure by adjusting parameters. AI suggests alternative configurations that user can compare.

### Duration

2-3 minutes

### Theme

"Engineering intuition, amplified"

### Prerequisites

- 5-10 pre-generated GLTF module variants
- Manifest with metadata (mass, volume, cost, etc.)

### Act-by-Act Script

#### Act 1: Your Design (30s)

**Visual:**
- User appears in front of battery module (your GLTF)
- Floating labels: dimensions, cell count, mass
- Subtle grid floor
- Parameter panel floating to the side

**Narration:**
> "This is your current module design. 48 cells. Liquid cooling. 12.4 kWh. But what if you explored alternatives?"

---

#### Act 2: Parameter Exploration (45s)

**Narration:**
> "Grab the cell count slider."

**Visual:** Highlight slider: Cell Count

**Action:** User grabs slider, drags

**Visual:**
- Module rebuilds in real-time (geometry swap)
- 48 → 56 → 64 cells
- Dimensions update
- Mass indicator rises (green → yellow → red)
- Thermal warning appears at 64

**Narration:**
> "See the trade-offs immediately. More capacity, more mass, thermal risk. Your intuition, informed by real constraints."

**Action:** User adjusts back to 52

---

#### Act 3: AI Suggestion (45s) — KEY SCENE

**Visual:** Notification: "AI Design Assistant"

**Visual:** Second module materializes beside first, ghosted green

**Panel:**

```
┌─────────────────────────────────────────────┐
│  AI SUGGESTION                              │
│                                             │
│  Based on your constraints:                 │
│  • Target: 13+ kWh                          │
│  • Max mass: 95 kg                          │
│  • Thermal limit: 45°C                      │
│                                             │
│  Alternative configuration:                 │
│  • 54 cells (vs your 52)                    │
│  • Different cooling channel routing        │
│  • 13.2 kWh at 93 kg                        │
│                                             │
│  Trade-off: 2% higher cost, 6% better       │
│             thermal headroom                │
│                                             │
│  [ COMPARE SIDE-BY-SIDE ] [ DISMISS ]       │
│                                             │
│  AI suggests. You evaluate.                 │
└─────────────────────────────────────────────┘
```

**Action:** User selects COMPARE

**Visual:**
- Both modules solid, side by side
- Comparison labels between them
- Differences highlighted (cooling channels glow)
- User can walk around both

**Narration:**
> "The AI found an option you might not have. But it doesn't decide. You see both. You understand the trade-offs. You choose."

---

#### Act 4: Exploded View (30s)

**Narration:**
> "Want to look deeper? Explode the view."

**Action:** User makes expand gesture (or button)

**Visual:**
- Module separates into layers
- Cells, cooling system, casing, BMS
- Each layer labeled
- User can walk between layers
- Scale: components at human-readable size

**Narration:**
> "This is your design, at a scale where you can think. Not pixels on a screen. Physical intuition."

---

#### Act 5: Close (15s)

**Visual:** Components reassemble

**Narration:**
> "Human-centric AI for engineering. AI that explores the design space. You that makes the decisions. Your expertise, amplified."

**Visual:** CellCAD logo

---

## 7. Requirements & Dependencies

### Hardware

| Item | Required | Status | Notes |
|------|----------|--------|-------|
| Quest 3 | Yes | ✅ Have | Got yesterday |
| Development PC | Yes | ✅ Have | Assume available |
| USB-C cable | Optional | ? | Useful for debugging |
| Same WiFi network | Yes | ✅ | Quest browser → localhost |

### Software — Already Have (via ATHENA dev)

| Item | Required For |
|------|--------------|
| Node.js 18+ | All demos |
| Git | All demos |
| Code editor | All demos |

### Software — Needs Setup

| Item | Time | Notes |
|------|------|-------|
| Quest Developer Mode | 5 min | Phone app → Settings → Developer |
| npm packages | 2 min | Three.js, etc. |

### ATHENA Phase Dependencies

| Demo | ATHENA Phase Required | Why |
|------|----------------------|-----|
| Demo 1: Knowledge Space | None | Uses fake data |
| Demo 2: Agent Council | None | Scripted animation, not real CPN |
| Demo 3: CellCAD | None | Separate project |

**Key insight:** None of the demos require ATHENA to be running. They're standalone VR experiences demonstrating concepts.

### CellCAD Dependencies

| Requirement | Status | Notes |
|-------------|--------|-------|
| Parametric generator | ✅ Have | Can export GLTF |
| 5-10 module variants | Need | Export different configs |
| Metadata manifest | Need | Mass, volume, cost per variant |

### Dependency Diagram

```
                    ┌─────────────────────┐
                    │   Quest 3 + Dev     │
                    │   Mode Enabled      │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
     ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
     │ Demo 1:        │ │ Demo 2:        │ │ Demo 3:        │
     │ Knowledge      │ │ Agent Council  │ │ CellCAD        │
     │ Space          │ │                │ │                │
     └───────┬────────┘ └───────┬────────┘ └───────┬────────┘
             │                  │                  │
             ▼                  ▼                  ▼
     ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
     │ Fake graph     │ │ Workflow       │ │ GLTF exports   │
     │ data (JSON)    │ │ script (JSON)  │ │ from generator │
     │                │ │                │ │                │
     │ NO ATHENA      │ │ NO ATHENA      │ │ NO ATHENA      │
     │ DEPENDENCY     │ │ DEPENDENCY     │ │ DEPENDENCY     │
     └────────────────┘ └────────────────┘ └────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │  Shared WebXR       │
                    │  Infrastructure     │
                    └─────────────────────┘
```

---

## 8. Implementation Plan

### Pre-Work: Spike (1 Evening)

**Goal:** Validate core technical assumptions before committing

**Tasks:**
- [ ] Enable Quest Developer Mode
- [ ] Test WebXR in Quest browser (visit immersive-web.github.io samples)
- [ ] Create minimal Three.js + WebXR + forcegraph project
- [ ] Load 200 fake nodes, test on Quest
- [ ] Measure: FPS, readability, comfort

**Go/No-Go Criteria:**
- ✓ Graph renders in VR → Proceed
- ✓ 200+ nodes smooth → Proceed
- ✓ Labels readable → Proceed
- ✗ Performance tanks → Research alternatives
- ✗ Labels unreadable → Different approach needed

**Spike Code:**

```typescript
// spike-vr-graph.ts
import ForceGraph3D from '3d-force-graph';
import { VRButton } from 'three/examples/jsm/webxr/VRButton';

const nodes = Array.from({ length: 200 }, (_, i) => ({
  id: `note-${i}`,
  title: `Note ${i}`,
  group: Math.floor(Math.random() * 5),
}));

const edges = Array.from({ length: 300 }, () => ({
  source: `note-${Math.floor(Math.random() * 200)}`,
  target: `note-${Math.floor(Math.random() * 200)}`,
  type: Math.random() > 0.7 ? 'ai_suggested' : 'explicit',
}));

const graph = ForceGraph3D()
  .graphData({ nodes, links: edges })
  .nodeLabel('title')
  .nodeColor(n => ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][n.group])
  .linkColor(e => e.type === 'explicit' ? '#3b82f6' : '#22c55e')
  .linkOpacity(0.6);

graph.renderer().xr.enabled = true;
document.body.appendChild(VRButton.createButton(graph.renderer()));
```

### Week 1-2: Shared Infrastructure

**Tasks:**
- [ ] Project scaffolding (Vite + TS + Three.js)
- [ ] Scene setup module (lighting, floor, camera)
- [ ] WebXR integration with Quest
- [ ] Scenario runner engine
- [ ] Tooltip/panel system
- [ ] Interaction handlers (point, select, grab)
- [ ] Basic narration system

**Deliverable:** Framework that all demos build on

### Week 3: Demo 1 — Knowledge Space

**Tasks:**
- [ ] Create fake knowledge graph data (150 nodes, 200 edges, 5 clusters)
- [ ] Integrate three-forcegraph
- [ ] Cluster visualization and expansion
- [ ] Connection panel UI
- [ ] Accept/reject interaction
- [ ] "New node" animation
- [ ] Polish and timing

**Deliverable:** Complete Demo 1 experience

### Week 4: Demo 2 — Agent Council

**Tasks:**
- [ ] Create workflow definition JSON
- [ ] CPN renderer (places, transitions, arcs)
- [ ] Token animation system
- [ ] "Chaos" visualization for contrast
- [ ] Human checkpoint panel
- [ ] Split-screen comparison view
- [ ] Polish and timing

**Deliverable:** Complete Demo 2 experience

### Week 5: Demo 3 — CellCAD

**Tasks:**
- [ ] Export 5-10 GLTF variants from parametric generator
- [ ] Create manifest.json with metadata
- [ ] GLTF loader with variant swapping
- [ ] Parameter panel UI
- [ ] Side-by-side comparison
- [ ] Exploded view animation
- [ ] Polish and timing

**Deliverable:** Complete Demo 3 experience

### Week 6: Polish & Test

**Tasks:**
- [ ] Run through all demos, refine timing
- [ ] Test with someone unfamiliar
- [ ] Fix friction points
- [ ] Performance optimization
- [ ] Host on Vercel/Netlify
- [ ] Create backup screen recordings
- [ ] Prepare talking points

**Deliverable:** Demo-ready package

---

## 9. Data Specifications

### Demo 1: Knowledge Graph Data

```typescript
interface KnowledgeGraphData {
  nodes: DemoNode[];
  edges: DemoEdge[];
  clusters: DemoCluster[];
}

interface DemoNode {
  id: string;
  title: string;
  clusterId: string;
  connectionCount: number;
  isAISuggested: boolean;
  needsAttention?: boolean;
}

interface DemoEdge {
  id: string;
  source: string;
  target: string;
  type: 'explicit' | 'ai_suggested';
  // For AI suggestions:
  confidence?: number;
  reasons?: string[];
}

interface DemoCluster {
  id: string;
  label: string;
  color: string;
}
```

**Example nodes (battery domain):**

```json
{
  "nodes": [
    { "id": "t1", "title": "Thermal Runaway Prevention", "clusterId": "thermal" },
    { "id": "t2", "title": "Cooling System Trade-offs", "clusterId": "thermal" },
    { "id": "t3", "title": "Cell Temperature Limits", "clusterId": "thermal" },
    { "id": "c1", "title": "NMC vs LFP Decision", "clusterId": "chemistry" },
    { "id": "c2", "title": "Electrolyte Comparison", "clusterId": "chemistry" },
    { "id": "m1", "title": "Assembly Line Constraints", "clusterId": "manufacturing" },
    { "id": "m2", "title": "Quality Control Protocols", "clusterId": "manufacturing" }
  ],
  "clusters": [
    { "id": "thermal", "label": "Thermal Management", "color": "#ef4444" },
    { "id": "chemistry", "label": "Cell Chemistry", "color": "#3b82f6" },
    { "id": "manufacturing", "label": "Manufacturing", "color": "#22c55e" },
    { "id": "testing", "label": "Testing & Validation", "color": "#f59e0b" },
    { "id": "strategy", "label": "Strategy", "color": "#8b5cf6" }
  ]
}
```

**Time to create:** 2-3 hours

### Demo 2: Workflow Data

```typescript
interface WorkflowData {
  places: Place[];
  transitions: Transition[];
  arcs: Arc[];
  script: WorkflowEvent[];
}

interface Place {
  id: string;
  label: string;
  position: { x: number; y: number; z: number };
}

interface Transition {
  id: string;
  label: string;
  agentId?: string;
  isHumanCheckpoint: boolean;
  position: { x: number; y: number; z: number };
}

interface Arc {
  from: string;
  to: string;
}

interface WorkflowEvent {
  time: number;  // seconds from start
  type: 'token_move' | 'agent_speak' | 'checkpoint_show' | 'user_action';
  data: any;
}
```

**Time to create:** 1-2 hours

### Demo 3: CellCAD Manifest

```typescript
interface CellCADManifest {
  variants: ModuleVariant[];
  aiSuggestion: ModuleVariant;
}

interface ModuleVariant {
  id: string;
  file: string;  // GLTF filename
  params: {
    cellCount: number;
    cooling: 'liquid' | 'air';
    energy_kwh: number;
    mass_kg: number;
    cost_relative: number;
    thermal_headroom: 'good' | 'moderate' | 'poor';
    dimensions: { x: number; y: number; z: number };
  };
}
```

**Example manifest:**

```json
{
  "variants": [
    {
      "id": "base-48",
      "file": "module-48cell-liquid.gltf",
      "params": {
        "cellCount": 48,
        "cooling": "liquid",
        "energy_kwh": 11.2,
        "mass_kg": 82,
        "cost_relative": 1.0,
        "thermal_headroom": "good"
      }
    },
    {
      "id": "variant-52",
      "file": "module-52cell-liquid.gltf",
      "params": {
        "cellCount": 52,
        "cooling": "liquid",
        "energy_kwh": 12.1,
        "mass_kg": 88,
        "cost_relative": 1.08,
        "thermal_headroom": "good"
      }
    }
  ],
  "aiSuggestion": {
    "id": "ai-54-optimized",
    "file": "module-54cell-optimized.gltf",
    "params": {
      "cellCount": 54,
      "cooling": "liquid",
      "energy_kwh": 13.2,
      "mass_kg": 93,
      "cost_relative": 1.12,
      "thermal_headroom": "moderate"
    }
  }
}
```

**Time to create:** 2-4 hours (depends on generator)

---

## 10. Future: Live Sync Architecture

After demos succeed and sponsorship is secured, the next phase connects VR to live ATHENA data.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         ATHENA Desktop                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Legend-State│  │ React Flow  │  │ WebSocket Server        │  │
│  │ (truth)     │──│ (2D view)   │  │ (broadcast changes)     │  │
│  └─────────────┘  └─────────────┘  └───────────┬─────────────┘  │
│         │                                       │                │
│         └──────── state changes ────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket (ws://localhost:3001)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         ATHENA VR (Quest)                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Three.js + WebXR + three-forcegraph                         │ │
│  │                                                             │ │
│  │  Receives:              Renders:                            │ │
│  │  • Node CRUD            • Spheres in 3D space               │ │
│  │  • Edge CRUD            • Colored connection lines          │ │
│  │  • Focus changes        • Highlight active node             │ │
│  │  • Cluster updates      • Translucent cluster volumes       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Sync Protocol

```typescript
type SyncMessage = 
  | { type: 'FULL_SYNC'; nodes: VRNode[]; edges: VREdge[] }
  | { type: 'NODE_ADDED'; node: VRNode }
  | { type: 'NODE_UPDATED'; node: VRNode }
  | { type: 'NODE_DELETED'; id: string }
  | { type: 'EDGE_ADDED'; edge: VREdge }
  | { type: 'EDGE_DELETED'; id: string }
  | { type: 'FOCUS_CHANGED'; nodeId: string | null }
  | { type: 'CLUSTER_UPDATED'; cluster: VRCluster }

interface VRNode {
  id: string;
  title: string;
  x?: number;
  y?: number;
  connectionCount: number;
  isAISuggested: boolean;
  clusterId?: string;
}

interface VREdge {
  id: string;
  source: string;
  target: string;
  type: 'explicit' | 'ai_suggested' | 'cluster';
  color: string;
}
```

### Implementation Approach

Gated and modular — zero dependencies on core ATHENA:

```
src/
├── modules/
│   ├── store/           # Core ATHENA — no VR knowledge
│   └── canvas/          # React Flow — no VR knowledge
│
├── experimental/
│   └── vr-sync/         # Completely isolated
│       ├── index.ts           # Lazy entry point
│       ├── types.ts           # VRNode, VREdge, SyncMessage
│       ├── useVRSync.ts       # The hook
│       ├── mappers.ts         # Note → VRNode, Connection → VREdge
│       └── VRSyncStatus.tsx   # Optional UI indicator
│
scripts/
└── vr-sync-server.ts    # Standalone relay server
```

**Key principles:**
- No imports from vr-sync anywhere in core modules
- VR sync imports FROM core (one-way dependency)
- Dynamic import — code not bundled if disabled
- WebSocket is browser-native — no npm dependencies
- Server is separate script — not part of ATHENA build

### DevSettings Flag

```typescript
interface DevSettings {
  experimental: {
    vrSync: {
      enabled: boolean;
      serverUrl: string;  // default 'ws://localhost:3001'
    };
  };
}
```

---

## Appendices

### A. Existing VR Tools Research

**General-purpose spatial tools:**
- Shapes XR — collaborative 3D whiteboarding
- Gravity Sketch — design-focused
- Arkio — architectural planning
- Immersed / vSpatial — virtual desktop

**Node-graph visualization:**
- Noda — mind mapping in VR, Quest native
- MindMapVR — simpler mind mapping

**Development platforms:**
- Unity + Meta XR SDK — full control, steeper learning
- Godot + OpenXR — lighter weight
- A-Frame / Three.js + WebXR — rapid prototyping

**Gap identified:** No proper parametric trade-space explorer in VR exists.

### B. Alternative Tech Stacks (If Spike Fails)

If Three.js + WebXR + forcegraph doesn't work well:

1. **Babylon.js** — reportedly better XR support
2. **A-Frame + networked-aframe** — simpler, more VR-native
3. **Unity** — guaranteed to work, more effort

### C. Useful Links

- WebXR samples: https://immersive-web.github.io/webxr-samples/
- three-forcegraph: https://github.com/vasturiano/3d-force-graph
- Quest Developer Mode: Phone app → Settings → Developer → Enable

---

## Next Steps

1. **This week:** Run the spike (one evening)
2. **If spike succeeds:** Begin Week 1-2 (shared infrastructure)
3. **Continue in new conversation** with this document as reference

---

*Document generated from ATHENA Project Session — January 17, 2026*
