import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const positions = [
  // +X
  0.5, -0.5, -0.5,
  0.5, 0.5, -0.5,
  0.5, 0.5, 0.5,
  0.5, -0.5, 0.5,
  // -X
  -0.5, -0.5, 0.5,
  -0.5, 0.5, 0.5,
  -0.5, 0.5, -0.5,
  -0.5, -0.5, -0.5,
  // +Y
  -0.5, 0.5, -0.5,
  -0.5, 0.5, 0.5,
  0.5, 0.5, 0.5,
  0.5, 0.5, -0.5,
  // -Y
  -0.5, -0.5, 0.5,
  -0.5, -0.5, -0.5,
  0.5, -0.5, -0.5,
  0.5, -0.5, 0.5,
  // +Z
  -0.5, -0.5, 0.5,
  0.5, -0.5, 0.5,
  0.5, 0.5, 0.5,
  -0.5, 0.5, 0.5,
  // -Z
  0.5, -0.5, -0.5,
  -0.5, -0.5, -0.5,
  -0.5, 0.5, -0.5,
  0.5, 0.5, -0.5
];

const normals = [
  // +X
  1, 0, 0,
  1, 0, 0,
  1, 0, 0,
  1, 0, 0,
  // -X
  -1, 0, 0,
  -1, 0, 0,
  -1, 0, 0,
  -1, 0, 0,
  // +Y
  0, 1, 0,
  0, 1, 0,
  0, 1, 0,
  0, 1, 0,
  // -Y
  0, -1, 0,
  0, -1, 0,
  0, -1, 0,
  0, -1, 0,
  // +Z
  0, 0, 1,
  0, 0, 1,
  0, 0, 1,
  0, 0, 1,
  // -Z
  0, 0, -1,
  0, 0, -1,
  0, 0, -1,
  0, 0, -1
];

const indices = [];
for (let i = 0; i < 6; i += 1) {
  const offset = i * 4;
  indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
}

const positionArray = new Float32Array(positions);
const normalArray = new Float32Array(normals);
const indexArray = new Uint16Array(indices);

const parts = [];
let byteOffset = 0;

const addPart = (buffer, alignment) => {
  if (alignment > 1 && byteOffset % alignment !== 0) {
    const padding = alignment - (byteOffset % alignment);
    parts.push(Buffer.alloc(padding));
    byteOffset += padding;
  }
  const offset = byteOffset;
  parts.push(buffer);
  byteOffset += buffer.length;
  return { offset, length: buffer.length };
};

const positionView = addPart(Buffer.from(positionArray.buffer), 4);
const normalView = addPart(Buffer.from(normalArray.buffer), 4);
const indexView = addPart(Buffer.from(indexArray.buffer), 4);

const binaryBuffer = Buffer.concat(parts);
const bufferUri = `data:application/octet-stream;base64,${binaryBuffer.toString('base64')}`;

const gltf = {
  asset: {
    version: '2.0',
    generator: 'atlas2-tecton-placeholder'
  },
  buffers: [
    {
      uri: bufferUri,
      byteLength: binaryBuffer.length
    }
  ],
  bufferViews: [
    {
      buffer: 0,
      byteOffset: positionView.offset,
      byteLength: positionView.length,
      target: 34962
    },
    {
      buffer: 0,
      byteOffset: normalView.offset,
      byteLength: normalView.length,
      target: 34962
    },
    {
      buffer: 0,
      byteOffset: indexView.offset,
      byteLength: indexView.length,
      target: 34963
    }
  ],
  accessors: [
    {
      bufferView: 0,
      componentType: 5126,
      count: 24,
      type: 'VEC3',
      min: [-0.5, -0.5, -0.5],
      max: [0.5, 0.5, 0.5]
    },
    {
      bufferView: 1,
      componentType: 5126,
      count: 24,
      type: 'VEC3'
    },
    {
      bufferView: 2,
      componentType: 5123,
      count: 36,
      type: 'SCALAR'
    }
  ],
  materials: [
    {
      name: 'TectonPlaceholder',
      pbrMetallicRoughness: {
        baseColorFactor: [0.1, 0.6, 0.2, 1.0],
        metallicFactor: 0.1,
        roughnessFactor: 0.65
      }
    }
  ],
  meshes: [
    {
      primitives: [
        {
          attributes: {
            POSITION: 0,
            NORMAL: 1
          },
          indices: 2,
          material: 0
        }
      ]
    }
  ],
  nodes: [
    {
      name: 'Cell-01',
      mesh: 0,
      translation: [-0.5, 0, 0]
    },
    {
      name: 'Cell-02',
      mesh: 0,
      translation: [0.5, 0, 0]
    },
    {
      name: 'Cell-03',
      mesh: 0,
      translation: [0, 0, 0.5]
    }
  ],
  scenes: [
    {
      nodes: [0, 1, 2]
    }
  ],
  scene: 0
};

const outputDir = join(__dirname, '..', 'public', 'models');
mkdirSync(outputDir, { recursive: true });
const outputPath = join(outputDir, 'tecton-placeholder.gltf');
writeFileSync(outputPath, JSON.stringify(gltf, null, 2), 'utf8');
console.log(`Wrote ${outputPath}`);
