export type TooltipPosition = 'center' | 'node';

export type ScenarioEvent =
  | { type: 'WAIT'; seconds: number }
  | {
      type: 'TOOLTIP';
      text: string;
      position?: TooltipPosition;
      nodeId?: string;
      seconds?: number;
    }
  | { type: 'NARRATION'; text: string; audioFile?: string; seconds?: number }
  | { type: 'HIGHLIGHT_CLUSTER'; clusterId: string; seconds?: number }
  | { type: 'HIGHLIGHT_NODE'; nodeId: string; seconds?: number }
  | { type: 'HIGHLIGHT_EDGE'; edgeId: string; seconds?: number }
  | { type: 'TRANSITION_SCENE'; target: string };

export interface ScenarioScript {
  id: string;
  events: ScenarioEvent[];
}

export type ScenarioAnchor =
  | { type: 'node'; id: string }
  | { type: 'cluster'; id: string }
  | { type: 'edge'; id: string };
