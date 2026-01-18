import * as THREE from 'three';
import type { AtlasModule, ModuleContext } from './AtlasModule';
import { loadMnemosyneData } from '../data';

const EXPLICIT_COLOR = 0x3b82f6;
const AI_COLOR = 0x22c55e;

interface NodeEntry {
  id: string;
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  material: THREE.MeshStandardMaterial;
  label: LabelEntry;
  unsubscribe: () => void;
  selected: boolean;
}

interface EdgeEntry {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'explicit' | 'ai_suggested' | 'cluster';
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  material: THREE.LineBasicMaterial;
  handle?: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  handleMaterial?: THREE.MeshStandardMaterial;
  handleUnsubscribe?: () => void;
  reasons?: string[];
  confidence?: number;
  visible: boolean;
}

interface LabelEntry {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  texture: THREE.Texture;
}

export class MnemosyneModule implements AtlasModule {
  id = 'mnemosyne';
  private group?: THREE.Group;
  private nodeGeometry?: THREE.SphereGeometry;
  private handleGeometry?: THREE.SphereGeometry;
  private nodes: NodeEntry[] = [];
  private edges: EdgeEntry[] = [];
  private labels: LabelEntry[] = [];
  private active = false;
  private pulseTime = 0;

  private panel?: HTMLDivElement;
  private panelTitle?: HTMLDivElement;
  private panelConnection?: HTMLDivElement;
  private panelReasons?: HTMLUListElement;
  private panelConfidence?: HTMLDivElement;
  private panelAccept?: HTMLButtonElement;
  private panelReject?: HTMLButtonElement;
  private panelClose?: HTMLButtonElement;
  private activeEdge?: EdgeEntry;

  onLoad(context: ModuleContext): void {
    this.active = true;
    const group = new THREE.Group();
    group.name = 'Mnemosyne';
    context.scene.add(group);
    this.group = group;

    this.ensurePanel(context);

    loadMnemosyneData().then((result) => {
      if (!this.active) {
        return;
      }
      this.buildScene(context, result.data);
    });
  }

  onUpdate(dt: number): void {
    this.pulseTime += dt;
    const pulse = 1 + Math.sin(this.pulseTime * 2) * 0.15;
    for (const edge of this.edges) {
      if (edge.type === 'ai_suggested' && edge.handle) {
        edge.handle.scale.setScalar(pulse);
      }
    }
  }

  onUnload(): void {
    this.active = false;
    this.hidePanel();
    this.panel?.remove();
    this.panel = undefined;

    for (const edge of this.edges) {
      edge.handleUnsubscribe?.();
      edge.handleMaterial?.dispose();
      edge.handle?.removeFromParent();
      edge.material.dispose();
      edge.line.geometry.dispose();
      edge.line.removeFromParent();
    }
    this.edges = [];

    for (const node of this.nodes) {
      node.unsubscribe();
      node.material.dispose();
      node.mesh.removeFromParent();
      node.label.material.dispose();
      node.label.texture.dispose();
      node.label.sprite.removeFromParent();
    }
    this.nodes = [];

    for (const label of this.labels) {
      label.material.dispose();
      label.texture.dispose();
      label.sprite.removeFromParent();
    }
    this.labels = [];

    this.nodeGeometry?.dispose();
    this.nodeGeometry = undefined;
    this.handleGeometry?.dispose();
    this.handleGeometry = undefined;

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
    const nodePositions = new Map<string, THREE.Vector3>();
    const nodeTitles = new Map<string, string>();

    for (const node of data.nodes) {
      const key = node.clusterId ?? 'default';
      if (!nodeGroups.has(key)) {
        nodeGroups.set(key, []);
      }
      nodeGroups.get(key)?.push(node);
      nodeTitles.set(node.id, node.title);
    }

    const clusterIds = Array.from(nodeGroups.keys());
    const radius = 1.6;
    const innerRadius = 0.4;
    this.nodeGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    this.handleGeometry = new THREE.SphereGeometry(0.05, 12, 12);

    clusterIds.forEach((clusterId, clusterIndex) => {
      const cluster = clusterMap.get(clusterId);
      const color = cluster?.color ?? '#94a3b8';
      const angle = (clusterIndex / clusterIds.length) * Math.PI * 2;
      const center = new THREE.Vector3(
        Math.cos(angle) * radius,
        1.4,
        Math.sin(angle) * radius
      );

      const clusterLabel = this.createLabelSprite(cluster?.label ?? clusterId, '#e2e8f0');
      clusterLabel.sprite.position.copy(center).add(new THREE.Vector3(0, 0.35, 0));
      this.group?.add(clusterLabel.sprite);
      this.labels.push(clusterLabel);

      const nodes = nodeGroups.get(clusterId) ?? [];
      nodes.forEach((node, nodeIndex) => {
        const nodeAngle = (nodeIndex / Math.max(nodes.length, 1)) * Math.PI * 2;
        const offset = new THREE.Vector3(
          Math.cos(nodeAngle) * innerRadius,
          (nodeIndex % 3) * 0.06,
          Math.sin(nodeAngle) * innerRadius
        );
        const position = center.clone().add(offset);
        nodePositions.set(node.id, position);

        const material = new THREE.MeshStandardMaterial({ color });
        const mesh = new THREE.Mesh(this.nodeGeometry!, material);
        mesh.position.copy(position);
        mesh.name = node.title;
        this.group?.add(mesh);

        const label = this.createLabelSprite(node.title, '#f8fafc');
        label.sprite.position.copy(position).add(new THREE.Vector3(0, 0.18, 0));
        this.group?.add(label.sprite);

        const entry: NodeEntry = {
          id: node.id,
          mesh,
          material,
          label,
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

    for (const edge of data.edges) {
      const source = nodePositions.get(edge.source);
      const target = nodePositions.get(edge.target);
      if (!source || !target) {
        continue;
      }

      const geometry = new THREE.BufferGeometry().setFromPoints([source, target]);
      const isAI = edge.type === 'ai_suggested';
      const material = new THREE.LineBasicMaterial({
        color: isAI ? AI_COLOR : EXPLICIT_COLOR,
        transparent: true,
        opacity: isAI ? 0.8 : 0.6
      });
      const line = new THREE.Line(geometry, material);
      line.name = `Edge ${edge.source}-${edge.target}`;
      this.group?.add(line);

      const entry: EdgeEntry = {
        id: edge.id,
        sourceId: edge.source,
        targetId: edge.target,
        type: edge.type,
        line,
        material,
        reasons: edge.reasons,
        confidence: edge.confidence,
        visible: true
      };

      if (isAI) {
        const mid = source.clone().add(target).multiplyScalar(0.5);
        const handleMaterial = new THREE.MeshStandardMaterial({
          color: AI_COLOR,
          emissive: 0x064e3b
        });
        const handle = new THREE.Mesh(this.handleGeometry!, handleMaterial);
        handle.position.copy(mid);
        handle.name = `AI Edge ${edge.source}-${edge.target}`;
        this.group?.add(handle);

        entry.handle = handle;
        entry.handleMaterial = handleMaterial;
        entry.handleUnsubscribe = context.interaction.register(handle, {
          onHoverStart: () => {
            handleMaterial.emissive.setHex(0x16a34a);
          },
          onHoverEnd: () => {
            handleMaterial.emissive.setHex(0x064e3b);
          },
          onSelect: () => {
            this.openPanel(entry, nodeTitles);
          }
        });
      }

      this.edges.push(entry);
    }
  }

  private createLabelSprite(text: string, color: string): LabelEntry {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }
    const fontSize = 28;
    context.font = `600 ${fontSize}px Segoe UI`;
    const metrics = context.measureText(text);
    const paddingX = 20;
    const paddingY = 16;
    canvas.width = Math.ceil(metrics.width + paddingX * 2);
    canvas.height = fontSize + paddingY * 2;

    context.font = `600 ${fontSize}px Segoe UI`;
    context.fillStyle = 'rgba(15, 23, 42, 0.7)';
    context.strokeStyle = 'rgba(148, 163, 184, 0.6)';
    context.lineWidth = 2;
    context.fillRect(2, 2, canvas.width - 4, canvas.height - 4);
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    const scale = Math.min(0.9, 0.25 + text.length * 0.04);
    sprite.scale.set(scale, scale * (canvas.height / canvas.width), 1);

    return { sprite, material, texture };
  }

  private ensurePanel(context: ModuleContext): void {
    if (this.panel) {
      return;
    }
    const panel = document.createElement('div');
    panel.style.position = 'absolute';
    panel.style.right = '16px';
    panel.style.top = '16px';
    panel.style.width = '320px';
    panel.style.padding = '12px';
    panel.style.background = 'rgba(15, 23, 42, 0.92)';
    panel.style.border = '1px solid rgba(148, 163, 184, 0.5)';
    panel.style.borderRadius = '12px';
    panel.style.color = '#e2e8f0';
    panel.style.fontFamily = 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
    panel.style.display = 'none';

    const title = document.createElement('div');
    title.textContent = 'AI-Suggested Connection';
    title.style.fontWeight = '600';
    title.style.marginBottom = '8px';
    panel.appendChild(title);

    const connection = document.createElement('div');
    connection.style.marginBottom = '8px';
    panel.appendChild(connection);

    const reasonsLabel = document.createElement('div');
    reasonsLabel.textContent = 'Why this was suggested:';
    reasonsLabel.style.marginBottom = '4px';
    panel.appendChild(reasonsLabel);

    const reasons = document.createElement('ul');
    reasons.style.margin = '0 0 8px 16px';
    reasons.style.padding = '0';
    panel.appendChild(reasons);

    const confidence = document.createElement('div');
    confidence.style.marginBottom = '12px';
    panel.appendChild(confidence);

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';

    const accept = document.createElement('button');
    accept.textContent = 'Accept';
    accept.style.flex = '1';
    accept.style.padding = '6px 10px';
    accept.style.borderRadius = '8px';
    accept.style.border = '1px solid rgba(34, 197, 94, 0.6)';
    accept.style.background = 'rgba(34, 197, 94, 0.2)';
    accept.style.color = '#dcfce7';

    const reject = document.createElement('button');
    reject.textContent = 'Reject';
    reject.style.flex = '1';
    reject.style.padding = '6px 10px';
    reject.style.borderRadius = '8px';
    reject.style.border = '1px solid rgba(239, 68, 68, 0.6)';
    reject.style.background = 'rgba(239, 68, 68, 0.2)';
    reject.style.color = '#fee2e2';

    const close = document.createElement('button');
    close.textContent = 'Close';
    close.style.flex = '1';
    close.style.padding = '6px 10px';
    close.style.borderRadius = '8px';
    close.style.border = '1px solid rgba(148, 163, 184, 0.4)';
    close.style.background = 'rgba(51, 65, 85, 0.4)';
    close.style.color = '#e2e8f0';

    actions.appendChild(accept);
    actions.appendChild(reject);
    actions.appendChild(close);
    panel.appendChild(actions);

    accept.addEventListener('click', () => {
      if (this.activeEdge) {
        this.acceptEdge(this.activeEdge);
      }
      this.hidePanel();
    });
    reject.addEventListener('click', () => {
      if (this.activeEdge) {
        this.rejectEdge(this.activeEdge);
      }
      this.hidePanel();
    });
    close.addEventListener('click', () => {
      this.hidePanel();
    });

    context.uiRoot.appendChild(panel);

    this.panel = panel;
    this.panelTitle = title;
    this.panelConnection = connection;
    this.panelReasons = reasons;
    this.panelConfidence = confidence;
    this.panelAccept = accept;
    this.panelReject = reject;
    this.panelClose = close;
  }

  private openPanel(edge: EdgeEntry, titles: Map<string, string>): void {
    if (!this.panel || !this.panelConnection || !this.panelReasons || !this.panelConfidence) {
      return;
    }
    if (!edge.visible) {
      return;
    }
    const sourceTitle = titles.get(edge.sourceId) ?? edge.sourceId;
    const targetTitle = titles.get(edge.targetId) ?? edge.targetId;
    this.panelConnection.textContent = `${sourceTitle} ? ${targetTitle}`;

    this.panelReasons.innerHTML = '';
    const reasons = edge.reasons?.length ? edge.reasons : ['No additional context provided.'];
    for (const reason of reasons) {
      const item = document.createElement('li');
      item.textContent = reason;
      this.panelReasons.appendChild(item);
    }

    if (edge.confidence !== undefined) {
      const percent = Math.round(edge.confidence * 100);
      this.panelConfidence.textContent = `Confidence: ${percent}%`;
    } else {
      this.panelConfidence.textContent = 'Confidence: n/a';
    }

    this.activeEdge = edge;
    this.panel.style.display = 'block';
  }

  private hidePanel(): void {
    if (this.panel) {
      this.panel.style.display = 'none';
    }
    this.activeEdge = undefined;
  }

  private acceptEdge(edge: EdgeEntry): void {
    edge.type = 'explicit';
    edge.material.color.setHex(EXPLICIT_COLOR);
    edge.material.opacity = 0.7;
    if (edge.handle) {
      edge.handleUnsubscribe?.();
      edge.handleMaterial?.dispose();
      edge.handle.removeFromParent();
      edge.handle = undefined;
    }
  }

  private rejectEdge(edge: EdgeEntry): void {
    edge.visible = false;
    edge.line.visible = false;
    if (edge.handle) {
      edge.handleUnsubscribe?.();
      edge.handleMaterial?.dispose();
      edge.handle.removeFromParent();
      edge.handle = undefined;
    }
  }
}
