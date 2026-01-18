import type { MnemosyneData, TectonData, ThemisData } from './types';
import {
  createMnemosynePlaceholder,
  createTectonPlaceholder,
  createThemisPlaceholder
} from './placeholders';

export type LoadSource = 'file' | 'fallback';

export interface LoadResult<T> {
  data: T;
  source: LoadSource;
}

type Validator<T> = (value: unknown) => value is T;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number';
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const isArrayOf = <T>(value: unknown, validator: (item: unknown) => item is T): value is T[] =>
  Array.isArray(value) && value.every(validator);

const edgeTypes = new Set(['explicit', 'ai_suggested', 'cluster']);
const coolingTypes = new Set(['liquid', 'air']);
const headroomTypes = new Set(['good', 'moderate', 'poor']);

const isMnemosyneData: Validator<MnemosyneData> = (value): value is MnemosyneData => {
  if (!isObject(value)) {
    return false;
  }
  const nodes = (value as MnemosyneData).nodes;
  const edges = (value as MnemosyneData).edges;
  const clusters = (value as MnemosyneData).clusters;

  const isNode = (node: unknown): node is MnemosyneData['nodes'][number] =>
    isObject(node) &&
    isString(node.id) &&
    isString(node.title) &&
    isNumber(node.connectionCount) &&
    isBoolean(node.isAISuggested);

  const isEdge = (edge: unknown): edge is MnemosyneData['edges'][number] =>
    isObject(edge) &&
    isString(edge.id) &&
    isString(edge.source) &&
    isString(edge.target) &&
    isString(edge.type) &&
    edgeTypes.has(edge.type);

  const isCluster = (cluster: unknown): cluster is MnemosyneData['clusters'][number] =>
    isObject(cluster) &&
    isString(cluster.id) &&
    isString(cluster.label) &&
    isString(cluster.color);

  return isArrayOf(nodes, isNode) && isArrayOf(edges, isEdge) && isArrayOf(clusters, isCluster);
};

const isThemisData: Validator<ThemisData> = (value): value is ThemisData => {
  if (!isObject(value)) {
    return false;
  }
  const places = (value as ThemisData).places;
  const transitions = (value as ThemisData).transitions;
  const arcs = (value as ThemisData).arcs;
  const script = (value as ThemisData).script;

  const isPosition = (pos: unknown): pos is { x: number; y: number; z: number } =>
    isObject(pos) && isNumber(pos.x) && isNumber(pos.y) && isNumber(pos.z);

  const isPlace = (place: unknown): place is ThemisData['places'][number] =>
    isObject(place) && isString(place.id) && isString(place.label) && isPosition(place.position);

  const isTransition = (transition: unknown): transition is ThemisData['transitions'][number] =>
    isObject(transition) &&
    isString(transition.id) &&
    isString(transition.label) &&
    isBoolean(transition.isHumanCheckpoint) &&
    isPosition(transition.position);

  const isArc = (arc: unknown): arc is ThemisData['arcs'][number] =>
    isObject(arc) && isString(arc.from) && isString(arc.to);

  const isEvent = (event: unknown): event is ThemisData['script'][number] =>
    isObject(event) && isNumber(event.time) && isString(event.type) && isObject(event.data);

  return (
    isArrayOf(places, isPlace) &&
    isArrayOf(transitions, isTransition) &&
    isArrayOf(arcs, isArc) &&
    isArrayOf(script, isEvent)
  );
};

const isTectonData: Validator<TectonData> = (value): value is TectonData => {
  if (!isObject(value)) {
    return false;
  }
  const variants = (value as TectonData).variants;
  const aiSuggestion = (value as TectonData).aiSuggestion;

  const isParams = (params: unknown): params is TectonData['variants'][number]['params'] =>
    isObject(params) &&
    isNumber(params.cellCount) &&
    isString(params.cooling) &&
    coolingTypes.has(params.cooling) &&
    isNumber(params.energy_kwh) &&
    isNumber(params.mass_kg) &&
    isNumber(params.cost_relative) &&
    isString(params.thermal_headroom) &&
    headroomTypes.has(params.thermal_headroom);

  const isVariant = (variant: unknown): variant is TectonData['variants'][number] =>
    isObject(variant) && isString(variant.id) && isString(variant.file) && isParams(variant.params);

  return isArrayOf(variants, isVariant) && isVariant(aiSuggestion);
};

const loadJson = async <T>(
  url: string,
  fallback: () => T,
  validate: Validator<T>
): Promise<LoadResult<T>> => {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!validate(data)) {
      throw new Error('Invalid data shape');
    }
    return { data, source: 'file' };
  } catch (error) {
    console.warn(`[data] Falling back for ${url}`, error);
    return { data: fallback(), source: 'fallback' };
  }
};

export const loadMnemosyneData = (): Promise<LoadResult<MnemosyneData>> =>
  loadJson('/data/mnemosyne.json', createMnemosynePlaceholder, isMnemosyneData);

export const loadThemisData = (): Promise<LoadResult<ThemisData>> =>
  loadJson('/data/themis.json', createThemisPlaceholder, isThemisData);

export const loadTectonData = (): Promise<LoadResult<TectonData>> =>
  loadJson('/data/tecton.json', createTectonPlaceholder, isTectonData);
