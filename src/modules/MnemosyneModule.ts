import * as THREE from 'three';
import type { AtlasModule, ModuleContext } from './AtlasModule';
import { loadMnemosyneData } from '../data';

interface NodeEntry {
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  material: THREE.MeshStandardMaterial;
  unsubscribe: () => void;
  selected: boolean;
}

export class MnemosyneModule implements AtlasModule {
  id = 'mnemosyne';
  private group?: THREE.Group;
  private geometry?: THREE.SphereGeometry;
  private nodes: NodeEntry[] = [];
  private active = false;

  onLoad(context: ModuleContext): void {
    this.active = true;
    const group = new THREE.Group();
    group.name = 'Mnemosyne';
    context.scene.add(group);
    this.group = group;

    loadMnemosyneData().then((result) => {
      if (!this.active) {
        return;
      }
      this.buildScene(context, result.data);
    });
  }

  onUpdate(): void {
    // No-op for now. Layout is static.
  }

  onUnload(): void {
    this.active = false;
    for (const node of this.nodes) {
      node.unsubscribe();
      node.material.dispose();
      node.mesh.removeFromParent();
    }
    this.nodes = [];
    this.geometry?.dispose();
    this.geometry = undefined;
    this.group?.removeFromParent();
    this.group = undefined;
  }

  private buildScene(
    context: ModuleContext,
    data: Awaited<ReturnType<typeof loadMnemosyneData>>['data']
  ): void {
    if (!this.group) {
      return;
    }
    const clusterMap = new Map(
      data.clusters.map((cluster) => [cluster.id, cluster] as const)
    );
    const nodeGroups = new Map<string, typeof data.nodes>();
    for (const node of data.nodes) {
      const key = node.clusterId ?? 'default';
      if (!nodeGroups.has(key)) {
        nodeGroups.set(key, []);
      }
      nodeGroups.get(key)?.push(node);
    }

    const clusterIds = Array.from(nodeGroups.keys());
    const radius = 1.6;
    const innerRadius = 0.4;
    this.geometry = new THREE.SphereGeometry(0.08, 16, 16);

    clusterIds.forEach((clusterId, clusterIndex) => {
      const cluster = clusterMap.get(clusterId);
      const color = cluster?.color ?? '#94a3b8';
      const angle = (clusterIndex / clusterIds.length) * Math.PI * 2;
      const center = new THREE.Vector3(
        Math.cos(angle) * radius,
        1.4,
        Math.sin(angle) * radius
      );

      const nodes = nodeGroups.get(clusterId) ?? [];
      nodes.forEach((node, nodeIndex) => {
        const nodeAngle = (nodeIndex / Math.max(nodes.length, 1)) * Math.PI * 2;
        const offset = new THREE.Vector3(
          Math.cos(nodeAngle) * innerRadius,
          (nodeIndex % 3) * 0.06,
          Math.sin(nodeAngle) * innerRadius
        );
        const position = center.clone().add(offset);

        const material = new THREE.MeshStandardMaterial({ color });
        const mesh = new THREE.Mesh(this.geometry!, material);
        mesh.position.copy(position);
        mesh.name = node.title;
        this.group?.add(mesh);

        const entry: NodeEntry = {
          mesh,
          material,
          selected: false,
          unsubscribe: context.interaction.register(mesh, {
            onHoverStart: () => {
              material.emissive.setHex(0x1f2937);
            },
            onHoverEnd: () => {
              material.emissive.setHex(0x000000);
            },
            onSelect: () => {
              entry.selected = !entry.selected;
              material.color.set(entry.selected ? '#22c55e' : color);
            }
          })
        };
        this.nodes.push(entry);
      });
    });
  }
}
