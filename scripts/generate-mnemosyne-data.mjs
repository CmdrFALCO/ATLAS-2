import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const seedRandom = (seed) => {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const rand = seedRandom(20260118);

const pick = (list) => list[Math.floor(rand() * list.length)];

const clusterDefs = [
  {
    id: 'chemistry',
    label: 'Chemistry',
    color: '#3b82f6',
    topics: ['Electrolyte', 'Cathode', 'Anode', 'NMC', 'LFP', 'SEI', 'Solvent']
  },
  {
    id: 'thermal',
    label: 'Thermal',
    color: '#ef4444',
    topics: ['Thermal Runaway', 'Cooling', 'Heat Sink', 'Hotspot', 'Vent', 'Sensors']
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing',
    color: '#06b6d4',
    topics: ['Assembly Line', 'Quality Control', 'Welding', 'Tab Design', 'Yield']
  },
  {
    id: 'testing',
    label: 'Testing',
    color: '#f59e0b',
    topics: ['Cycle Life', 'Abuse Test', 'Vibration', 'Validation', 'Charge Rate']
  },
  {
    id: 'strategy',
    label: 'Strategy',
    color: '#8b5cf6',
    topics: ['Cost Model', 'Supply Chain', 'Roadmap', 'Pack Design', 'Format Trade-offs']
  }
];

const suffixes = [
  'Analysis',
  'Study',
  'Notes',
  'Report',
  'Overview',
  'Trade-offs',
  'Experiment',
  'Review'
];

const nodes = [];
const nodeCountPerCluster = 30;

for (const cluster of clusterDefs) {
  for (let i = 0; i < nodeCountPerCluster; i += 1) {
    const topic = pick(cluster.topics);
    const suffix = pick(suffixes);
    nodes.push({
      id: `${cluster.id}-${i + 1}`,
      title: `${topic} ${suffix}`,
      clusterId: cluster.id,
      connectionCount: 0,
      isAISuggested: false,
      needsAttention: rand() < 0.04
    });
  }
}

const nodeIds = nodes.map((node) => node.id);
const edges = [];
const edgeSet = new Set();
const edgeTotal = 220;
const reasons = [
  'Shared terminology',
  'Related project milestone',
  'Similar thermal constraints',
  'Common component reference',
  'Mentioned in same test series'
];

while (edges.length < edgeTotal) {
  const source = pick(nodeIds);
  const target = pick(nodeIds);
  if (source === target) {
    continue;
  }
  const key = source < target ? `${source}|${target}` : `${target}|${source}`;
  if (edgeSet.has(key)) {
    continue;
  }
  edgeSet.add(key);
  const isAi = rand() > 0.65;
  const edge = {
    id: `e${edges.length + 1}`,
    source,
    target,
    type: isAi ? 'ai_suggested' : 'explicit'
  };
  if (isAi) {
    edge.confidence = Math.round((0.55 + rand() * 0.4) * 100) / 100;
    edge.reasons = [pick(reasons), pick(reasons)];
  }
  edges.push(edge);
}

const connectionCounts = new Map();
for (const edge of edges) {
  connectionCounts.set(edge.source, (connectionCounts.get(edge.source) ?? 0) + 1);
  connectionCounts.set(edge.target, (connectionCounts.get(edge.target) ?? 0) + 1);
}

for (const node of nodes) {
  node.connectionCount = connectionCounts.get(node.id) ?? 0;
}

const data = {
  nodes,
  edges,
  clusters: clusterDefs.map(({ topics, ...cluster }) => cluster)
};

const outputPath = join(__dirname, '..', 'public', 'data', 'mnemosyne.json');
writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`Wrote ${outputPath}`);
