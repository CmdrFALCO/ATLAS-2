import type { MnemosyneData, TectonData, ThemisData } from './types';

export const createMnemosynePlaceholder = (): MnemosyneData => ({
  nodes: [
    {
      id: 'p1',
      title: 'Placeholder Note',
      clusterId: 'default',
      connectionCount: 1,
      isAISuggested: false
    },
    {
      id: 'p2',
      title: 'AI Suggested Link',
      clusterId: 'default',
      connectionCount: 1,
      isAISuggested: true
    }
  ],
  edges: [
    {
      id: 'pe1',
      source: 'p1',
      target: 'p2',
      type: 'ai_suggested',
      confidence: 0.65,
      reasons: ['Placeholder connection']
    }
  ],
  clusters: [{ id: 'default', label: 'Default', color: '#94a3b8' }]
});

export const createThemisPlaceholder = (): ThemisData => ({
  places: [{ id: 'p_start', label: 'Start', position: { x: 0, y: 1, z: 0 } }],
  transitions: [
    {
      id: 't_step',
      label: 'Step',
      isHumanCheckpoint: false,
      position: { x: 0.5, y: 1, z: 0 }
    }
  ],
  arcs: [{ from: 'p_start', to: 't_step' }],
  script: [{ time: 0, type: 'token_move', data: { from: 'p_start', to: 't_step' } }]
});

export const createTectonPlaceholder = (): TectonData => ({
  variants: [
    {
      id: 'variant-base',
      file: 'models/tecton-placeholder.gltf',
      params: {
        cellCount: 48,
        cooling: 'air',
        energy_kwh: 10.5,
        mass_kg: 80,
        cost_relative: 1.0,
        thermal_headroom: 'moderate'
      }
    }
  ],
  aiSuggestion: {
    id: 'variant-ai',
    file: 'models/tecton-placeholder.gltf',
    params: {
      cellCount: 52,
      cooling: 'air',
      energy_kwh: 11.3,
      mass_kg: 85,
      cost_relative: 1.08,
      thermal_headroom: 'good'
    }
  }
});
