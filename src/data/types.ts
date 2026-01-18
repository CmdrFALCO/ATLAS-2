export interface MnemosyneNode {
  id: string;
  title: string;
  clusterId?: string;
  connectionCount: number;
  isAISuggested: boolean;
}

export interface MnemosyneEdge {
  id: string;
  source: string;
  target: string;
  type: 'explicit' | 'ai_suggested' | 'cluster';
  confidence?: number;
  reasons?: string[];
}

export interface MnemosyneCluster {
  id: string;
  label: string;
  color: string;
}

export interface MnemosyneData {
  nodes: MnemosyneNode[];
  edges: MnemosyneEdge[];
  clusters: MnemosyneCluster[];
}

export interface ThemisPlace {
  id: string;
  label: string;
  position: { x: number; y: number; z: number };
}

export interface ThemisTransition {
  id: string;
  label: string;
  isHumanCheckpoint: boolean;
  position: { x: number; y: number; z: number };
}

export interface ThemisArc {
  from: string;
  to: string;
}

export interface ThemisEvent {
  time: number;
  type: string;
  data: Record<string, unknown>;
}

export interface ThemisData {
  places: ThemisPlace[];
  transitions: ThemisTransition[];
  arcs: ThemisArc[];
  script: ThemisEvent[];
}

export interface TectonVariant {
  id: string;
  file: string;
  params: {
    cellCount: number;
    cooling: 'liquid' | 'air';
    energy_kwh: number;
    mass_kg: number;
    cost_relative: number;
    thermal_headroom: 'good' | 'moderate' | 'poor';
  };
}

export interface TectonData {
  variants: TectonVariant[];
  aiSuggestion: TectonVariant;
}
