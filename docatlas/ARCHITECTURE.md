# ΛTLΛS Technical Architecture

## Tech Stack
- **Runtime:** Three.js + WebXR (Native).
- **Language:** TypeScript.
- **Build:** Vite.
- **Graphing:** `3d-force-graph` (for Mnemosyne).
- **Physics/Interactions:** Custom `atlas-engine` modules (no heavy physics engines).

## System Design
The app is structured as a **Core Engine** with **Pluggable Modules**.

### 1. The Core (src/core/)
- `AtlasEngine`: Singleton that manages the WebXR loop, Scene, and Camera.
- `InteractionSystem`: Handles Raycasting (Laser Pointer) and Grip inputs.
- `RealityAnchor`: Manages the coordinate system (Floor, User Height).

### 2. The Modules (src/modules/)
Each demo is a self-contained module that implements the `AtlasModule` interface:
- `onLoad()`: Spawn assets.
- `onUpdate(dt)`: Handle animations.
- `onUnload()`: Cleanup.

## Data Flow
- **Fake Data Only:** All demos use static JSON files (stored in `src/data/`) that mirror the production schemas.
- **Event Bus:** Modules communicate via a simple pub/sub `ScenarioRunner` to trigger scripted events (e.g., "Act 2 starts").

## Data Schemas (Mirrored from ATHENA)

### Mnemosyne (Knowledge Graph)
Based on ATHENA's SQLite/Legend-State schema.

```typescript
interface VRNode {
  id: string;
  title: string;
  clusterId?: string; // Maps to Cluster.id
  connectionCount: number;
  isAISuggested: boolean;
}

interface VREdge {
  id: string;
  source: string; // Note ID
  target: string; // Note ID
  type: 'explicit' | 'ai_suggested' | 'cluster';
  confidence?: number; // 0-1 for AI suggestions
}

interface VRCluster {
  id: string;
  label: string;
  color: string;
}
```

### Tecton (CellCAD)
Module variants defined in `manifest.json`.

```typescript
interface ModuleVariant {
  id: string;
  file: string; // Path to GLTF (converted from STEP via FreeCAD)
  params: {
    cellCount: number;
    cooling: 'liquid' | 'air';
    energy_kwh: number;
    mass_kg: number;
    cost_relative: number;
    thermal_headroom: 'good' | 'moderate' | 'poor';
  };
}
```
