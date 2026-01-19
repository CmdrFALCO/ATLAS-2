import type { ScenarioEvent, ScenarioScript, TooltipPosition } from '../scenario/types';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number';

const isTooltipPosition = (value: unknown): value is TooltipPosition =>
  value === 'center' || value === 'node';

const isScenarioEvent = (value: unknown): value is ScenarioEvent => {
  if (!isObject(value) || !isString(value.type)) {
    return false;
  }
  switch (value.type) {
    case 'WAIT':
      return isNumber(value.seconds);
    case 'TOOLTIP':
      return (
        isString(value.text) &&
        (value.position === undefined || isTooltipPosition(value.position)) &&
        (value.nodeId === undefined || isString(value.nodeId)) &&
        (value.seconds === undefined || isNumber(value.seconds))
      );
    case 'NARRATION':
      return (
        isString(value.text) &&
        (value.audioFile === undefined || isString(value.audioFile)) &&
        (value.seconds === undefined || isNumber(value.seconds))
      );
    case 'HIGHLIGHT_CLUSTER':
      return isString(value.clusterId) && (value.seconds === undefined || isNumber(value.seconds));
    case 'HIGHLIGHT_NODE':
      return isString(value.nodeId) && (value.seconds === undefined || isNumber(value.seconds));
    case 'HIGHLIGHT_EDGE':
      return isString(value.edgeId) && (value.seconds === undefined || isNumber(value.seconds));
    case 'TRANSITION_SCENE':
      return isString(value.target);
    default:
      return false;
  }
};

const isScenarioScript = (value: unknown): value is ScenarioScript => {
  if (!isObject(value)) {
    return false;
  }
  const events = value.events;
  return isString(value.id) && Array.isArray(events) && events.every(isScenarioEvent);
};

const createScenarioFallback = (id: string): ScenarioScript => ({
  id,
  events: [
    {
      type: 'TOOLTIP',
      text: `Scenario not found: ${id}`,
      position: 'center',
      seconds: 2.5
    }
  ]
});

export const loadScenarioScript = async (id: string): Promise<ScenarioScript> => {
  const url = `/data/scenarios/${id}.json`;
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!isScenarioScript(data)) {
      throw new Error('Invalid scenario script');
    }
    return data;
  } catch (error) {
    console.warn(`[scenario] Falling back for ${url}`, error);
    return createScenarioFallback(id);
  }
};
