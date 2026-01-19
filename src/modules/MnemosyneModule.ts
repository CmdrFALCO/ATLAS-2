import * as THREE from 'three';
import type { AtlasModule, ModuleContext } from './AtlasModule';
import { loadMnemosyneData } from '../data';
import { TextSprite } from '../ui/TextSprite';
import type { ScenarioAnchor, ScenarioEvent } from '../scenario/types';

const EXPLICIT_COLOR = 0x3b82f6;
const AI_COLOR = 0x22c55e;
const ATTENTION_COLOR = 0xf59e0b;

interface NodeEntry {
  id: string;
  clusterId: string;
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  material: THREE.MeshStandardMaterial;
  baseColor: number;
  label: LabelEntry;
  unsubscribe: () => void;
  selected: boolean;
  hovered: boolean;
  basePosition: THREE.Vector3;
  expandedPosition: THREE.Vector3;
  needsAttention: boolean;
  dragging: boolean;
  dragController?: THREE.Object3D;
  dragDistance: number;
  dragOffset: THREE.Vector3;
}

interface EdgeEntry {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'explicit' | 'ai_suggested' | 'cluster';
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  material: THREE.LineBasicMaterial;
  baseColor: number;
  baseOpacity: number;
  handle?: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  handleMaterial?: THREE.MeshStandardMaterial;
  handleUnsubscribe?: () => void;
  reasons?: string[];
  confidence?: number;
  visible: boolean;
  source?: NodeEntry;
  target?: NodeEntry;
  positionAttr?: THREE.BufferAttribute;
}

interface LabelEntry {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  texture: THREE.Texture;
}

interface ClusterEntry {
  id: string;
  center: THREE.Vector3;
  expanded: boolean;
  label: LabelEntry;
  unsubscribe: () => void;
}

interface PanelButton {
  group: THREE.Group;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  material: THREE.MeshStandardMaterial;
  label: TextSprite;
  unsubscribe: () => void;
}

export class MnemosyneModule implements AtlasModule {
  id = 'mnemosyne';
  private group?: THREE.Group;
  private camera?: THREE.Camera;
  private panelOffset = new THREE.Vector3(0, -0.1, 0);
  private panelPosition = new THREE.Vector3();
  private panelDirection = new THREE.Vector3();
  private panelGroup?: THREE.Group;
  private panelTitle?: TextSprite;
  private panelConnection?: TextSprite;
  private panelConfidence?: TextSprite;
  private panelReasons: TextSprite[] = [];
  private panelButtons: PanelButton[] = [];
  private panelBackground?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private nodeGeometry?: THREE.SphereGeometry;
  private handleGeometry?: THREE.SphereGeometry;
  private nodes: NodeEntry[] = [];
  private edges: EdgeEntry[] = [];
  private labels: LabelEntry[] = [];
  private clusters = new Map<string, ClusterEntry>();
  private controllerHandlers: Array<{
    controller: THREE.Object3D;
    onSelectStart: () => void;
    onSelectEnd: () => void;
  }> = [];
  private grabRaycaster = new THREE.Raycaster();
  private grabOrigin = new THREE.Vector3();
  private grabDirection = new THREE.Vector3();
  private grabRotation = new THREE.Matrix4();
  private grabPoint = new THREE.Vector3();
  private grabTarget = new THREE.Vector3();
  private active = false;
  private pulseTime = 0;
  private activeEdge?: EdgeEntry;
  private scenarioTime = 0;
  private highlightClusterId?: string;
  private highlightNodeId?: string;
  private highlightEdgeId?: string;
  private highlightClusterUntil = 0;
  private highlightNodeUntil = 0;
  private highlightEdgeUntil = 0;

  onLoad(context: ModuleContext): void {
    this.active = true;
    this.camera = context.camera;
    const group = new THREE.Group();
    group.name = 'Mnemosyne';
    context.scene.add(group);
    this.group = group;

    this.ensurePanel(context);
    this.bindGrabControllers(context);

    loadMnemosyneData().then((result) => {
      if (!this.active) {
        return;
      }
      this.buildScene(context, result.data);
    });
  }

  onUpdate(dt: number): void {
    this.pulseTime += dt;
    this.scenarioTime += dt;
    const pulse = 1 + Math.sin(this.pulseTime * 2) * 0.15;
    for (const edge of this.edges) {
      if (edge.type === 'ai_suggested' && edge.handle) {
        edge.handle.scale.setScalar(pulse);
      }
    }
    for (const node of this.nodes) {
      if (node.dragging && node.dragController) {
        this.updateDraggedNode(node);
      } else {
        const cluster = this.clusters.get(node.clusterId);
        if (!cluster) {
          continue;
        }
        const target = cluster.expanded ? node.expandedPosition : node.basePosition;
        node.mesh.position.lerp(target, 0.1);
      }
      node.label.sprite.position.copy(node.mesh.position).add(new THREE.Vector3(0, 0.18, 0));
      this.applyNodeHighlight(node);
    }
    this.updateEdges();
    this.applyEdgeHighlight();
    if (this.panelGroup && this.camera) {
      this.panelGroup.lookAt(this.camera.position);
    }
  }

  onUnload(): void {
    this.active = false;
    this.hidePanel();
    this.disposePanel();
    this.unbindGrabControllers();

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

    for (const cluster of this.clusters.values()) {
      cluster.unsubscribe();
      cluster.label.material.dispose();
      cluster.label.texture.dispose();
      cluster.label.sprite.removeFromParent();
    }
    this.clusters.clear();

    this.nodeGeometry?.dispose();
    this.nodeGeometry = undefined;
    this.handleGeometry?.dispose();
    this.handleGeometry = undefined;

    this.group?.removeFromParent();
    this.group = undefined;
    this.highlightClusterId = undefined;
    this.highlightNodeId = undefined;
    this.highlightEdgeId = undefined;
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
    const nodeTitles = new Map<string, string>();
    const nodeEntryMap = new Map<string, NodeEntry>();

    for (const node of data.nodes) {
      const key = node.clusterId ?? 'default';
      if (!nodeGroups.has(key)) {
        nodeGroups.set(key, []);
      }
      nodeGroups.get(key)?.push(node);
      nodeTitles.set(node.id, node.title);
    }

    const clusterIds = Array.from(nodeGroups.keys());
    const radius = 2.2;
    const innerRadius = 0.55;
    const expandedRadius = 1.15;
    this.nodeGeometry = new THREE.SphereGeometry(0.07, 16, 16);
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
      clusterLabel.sprite.position.copy(center).add(new THREE.Vector3(0, 0.45, 0));
      this.group?.add(clusterLabel.sprite);
      this.labels.push(clusterLabel);

      const clusterEntry: ClusterEntry = {
        id: clusterId,
        center,
        expanded: false,
        label: clusterLabel,
        unsubscribe: context.interaction.register(clusterLabel.sprite, {
          onSelect: () => {
            const current = this.clusters.get(clusterId);
            if (current) {
              current.expanded = !current.expanded;
            }
          }
        })
      };
      this.clusters.set(clusterId, clusterEntry);

      const nodes = nodeGroups.get(clusterId) ?? [];
      nodes.forEach((node, nodeIndex) => {
        const nodeAngle = (nodeIndex / Math.max(nodes.length, 1)) * Math.PI * 2;
        const offsetBase = new THREE.Vector3(
          Math.cos(nodeAngle) * innerRadius,
          (nodeIndex % 5) * 0.05,
          Math.sin(nodeAngle) * innerRadius
        );
        const offsetExpanded = new THREE.Vector3(
          Math.cos(nodeAngle) * expandedRadius,
          (nodeIndex % 7) * 0.06,
          Math.sin(nodeAngle) * expandedRadius
        );
        const basePosition = center.clone().add(offsetBase);
        const expandedPosition = center.clone().add(offsetExpanded);

        const materialColor = node.needsAttention ? ATTENTION_COLOR : color;
        const material = new THREE.MeshStandardMaterial({ color: materialColor });
        const mesh = new THREE.Mesh(this.nodeGeometry!, material);
        mesh.position.copy(basePosition);
        mesh.name = node.title;
        this.group?.add(mesh);

        const label = this.createLabelSprite(node.title, '#f8fafc');
        label.sprite.position.copy(mesh.position).add(new THREE.Vector3(0, 0.18, 0));
        label.sprite.visible = false;
        this.group?.add(label.sprite);

        const entry: NodeEntry = {
          id: node.id,
          clusterId,
          mesh,
          material,
          baseColor: material.color.getHex(),
          label,
          selected: false,
          hovered: false,
          basePosition,
          expandedPosition,
          needsAttention: Boolean(node.needsAttention),
          dragging: false,
          dragDistance: 0,
          dragOffset: new THREE.Vector3(),
          unsubscribe: context.interaction.register(mesh, {
            onHoverStart: () => {
              entry.hovered = true;
              label.sprite.visible = true;
              material.emissive.setHex(0x1f2937);
            },
            onHoverEnd: () => {
              entry.hovered = false;
              label.sprite.visible = entry.selected;
              material.emissive.setHex(0x000000);
            },
            onSelect: () => {
              entry.selected = !entry.selected;
              label.sprite.visible = entry.selected || entry.hovered;
              if (!entry.needsAttention) {
                material.color.setHex(entry.selected ? 0x22c55e : entry.baseColor);
              }
            }
          })
        };
        this.nodes.push(entry);
        nodeEntryMap.set(node.id, entry);
      });
    });

    for (const edge of data.edges) {
      const source = nodeEntryMap.get(edge.source);
      const target = nodeEntryMap.get(edge.target);
      if (!source || !target) {
        continue;
      }

      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(6);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

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
        baseColor: material.color.getHex(),
        baseOpacity: material.opacity,
        reasons: edge.reasons,
        confidence: edge.confidence,
        visible: true,
        source,
        target,
        positionAttr: geometry.getAttribute('position') as THREE.BufferAttribute
      };

      if (isAI) {
        const handleMaterial = new THREE.MeshStandardMaterial({
          color: AI_COLOR,
          emissive: 0x064e3b
        });
        const handle = new THREE.Mesh(this.handleGeometry!, handleMaterial);
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

    this.updateEdges();
  }

  private updateEdges(): void {
    for (const edge of this.edges) {
      if (!edge.source || !edge.target || !edge.positionAttr) {
        continue;
      }
      const source = edge.source.mesh.position;
      const target = edge.target.mesh.position;
      edge.positionAttr.setXYZ(0, source.x, source.y, source.z);
      edge.positionAttr.setXYZ(1, target.x, target.y, target.z);
      edge.positionAttr.needsUpdate = true;
      if (edge.handle) {
        edge.handle.position.copy(source).add(target).multiplyScalar(0.5);
      }
    }
  }

  private applyNodeHighlight(node: NodeEntry): void {
    const highlightClusterActive =
      this.highlightClusterId && this.scenarioTime < this.highlightClusterUntil;
    const highlightNodeActive =
      this.highlightNodeId && this.scenarioTime < this.highlightNodeUntil;
    const highlight =
      (highlightClusterActive && node.clusterId === this.highlightClusterId) ||
      (highlightNodeActive && node.id === this.highlightNodeId);

    if (highlight) {
      const pulse = 1 + Math.sin(this.scenarioTime * 4) * 0.2;
      node.mesh.scale.setScalar(pulse);
      node.label.sprite.visible = true;
    } else {
      node.mesh.scale.setScalar(1);
      node.label.sprite.visible = node.selected || node.hovered;
    }

    if (this.highlightClusterId && this.scenarioTime >= this.highlightClusterUntil) {
      this.highlightClusterId = undefined;
    }
    if (this.highlightNodeId && this.scenarioTime >= this.highlightNodeUntil) {
      this.highlightNodeId = undefined;
    }
  }

  private applyEdgeHighlight(): void {
    const highlightEdgeActive =
      this.highlightEdgeId && this.scenarioTime < this.highlightEdgeUntil;
    for (const edge of this.edges) {
      if (!highlightEdgeActive || edge.id !== this.highlightEdgeId) {
        edge.material.color.setHex(edge.baseColor);
        edge.material.opacity = edge.baseOpacity;
        continue;
      }
      edge.material.color.setHex(0xfacc15);
      edge.material.opacity = 1;
    }
    if (this.highlightEdgeId && this.scenarioTime >= this.highlightEdgeUntil) {
      this.highlightEdgeId = undefined;
    }
  }

  private bindGrabControllers(context: ModuleContext): void {
    if (this.controllerHandlers.length > 0) {
      return;
    }
    const controllers = [
      context.renderer.xr.getController(0),
      context.renderer.xr.getController(1)
    ];
    for (const controller of controllers) {
      const onSelectStart = () => this.beginGrab(controller);
      const onSelectEnd = () => this.endGrab(controller);
      controller.addEventListener('selectstart', onSelectStart);
      controller.addEventListener('selectend', onSelectEnd);
      this.controllerHandlers.push({ controller, onSelectStart, onSelectEnd });
    }
  }

  private unbindGrabControllers(): void {
    for (const entry of this.controllerHandlers) {
      entry.controller.removeEventListener('selectstart', entry.onSelectStart);
      entry.controller.removeEventListener('selectend', entry.onSelectEnd);
    }
    this.controllerHandlers = [];
  }

  private beginGrab(controller: THREE.Object3D): void {
    if (this.nodes.length === 0) {
      return;
    }
    if (this.nodes.some((entry) => entry.dragController === controller)) {
      return;
    }
    const hit = this.getControllerNodeHit(controller);
    if (!hit || hit.node.dragging) {
      return;
    }
    hit.node.dragging = true;
    hit.node.dragController = controller;
    hit.node.dragDistance = hit.distance;
    hit.node.dragOffset.copy(hit.node.mesh.position).sub(hit.point);
    hit.node.selected = false;
    if (!hit.node.needsAttention) {
      hit.node.material.color.setHex(hit.node.baseColor);
    }
  }

  private endGrab(controller: THREE.Object3D): void {
    const node = this.nodes.find((entry) => entry.dragController === controller);
    if (!node) {
      return;
    }
    node.dragging = false;
    node.dragController = undefined;
    node.dragDistance = 0;
    node.dragOffset.set(0, 0, 0);
    node.basePosition.copy(node.mesh.position);
    node.expandedPosition.copy(node.mesh.position);
  }

  private getControllerNodeHit(controller: THREE.Object3D): {
    node: NodeEntry;
    point: THREE.Vector3;
    distance: number;
  } | null {
    const meshes = this.nodes.map((entry) => entry.mesh);
    if (meshes.length === 0) {
      return null;
    }
    this.grabOrigin.setFromMatrixPosition(controller.matrixWorld);
    this.grabRotation.extractRotation(controller.matrixWorld);
    this.grabDirection.set(0, 0, -1).applyMatrix4(this.grabRotation).normalize();
    this.grabRaycaster.set(this.grabOrigin, this.grabDirection);
    const intersections = this.grabRaycaster.intersectObjects(meshes, false);
    if (!intersections.length) {
      return null;
    }
    const hit = intersections[0];
    const node = this.nodes.find((entry) => entry.mesh === hit.object);
    if (!node) {
      return null;
    }
    this.grabPoint.copy(hit.point);
    return { node, point: this.grabPoint, distance: hit.distance };
  }

  private updateDraggedNode(node: NodeEntry): void {
    if (!node.dragController) {
      return;
    }
    this.grabOrigin.setFromMatrixPosition(node.dragController.matrixWorld);
    this.grabRotation.extractRotation(node.dragController.matrixWorld);
    this.grabDirection.set(0, 0, -1).applyMatrix4(this.grabRotation).normalize();
    this.grabTarget
      .copy(this.grabOrigin)
      .addScaledVector(this.grabDirection, node.dragDistance)
      .add(node.dragOffset);
    node.mesh.position.copy(this.grabTarget);
  }

  onScenarioEvent(event: ScenarioEvent): void {
    const duration = event.seconds ?? 2.5;
    if (event.type === 'HIGHLIGHT_CLUSTER') {
      this.highlightClusterId = event.clusterId;
      this.highlightClusterUntil = this.scenarioTime + duration;
    }
    if (event.type === 'HIGHLIGHT_NODE') {
      this.highlightNodeId = event.nodeId;
      this.highlightNodeUntil = this.scenarioTime + duration;
    }
    if (event.type === 'HIGHLIGHT_EDGE') {
      this.highlightEdgeId = event.edgeId;
      this.highlightEdgeUntil = this.scenarioTime + duration;
    }
  }

  getScenarioAnchor(anchor: ScenarioAnchor): THREE.Vector3 | undefined {
    if (anchor.type === 'node') {
      const node = this.nodes.find((entry) => entry.id === anchor.id);
      return node?.mesh.position.clone();
    }
    if (anchor.type === 'cluster') {
      const cluster = this.clusters.get(anchor.id);
      return cluster?.center.clone();
    }
    if (anchor.type === 'edge') {
      const edge = this.edges.find((entry) => entry.id === anchor.id);
      if (edge?.source && edge?.target) {
        return edge.source.mesh.position.clone().add(edge.target.mesh.position).multiplyScalar(0.5);
      }
    }
    return undefined;
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
    if (this.panelGroup) {
      return;
    }
    const panelGroup = new THREE.Group();
    panelGroup.position.set(0.8, 1.4, -1.2);
    panelGroup.visible = false;
    context.scene.add(panelGroup);
    this.panelGroup = panelGroup;

    const panelMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const panelMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), panelMaterial);
    panelMesh.name = 'MnemosynePanel';
    panelGroup.add(panelMesh);
    this.panelBackground = panelMesh;

    this.panelTitle = new TextSprite('AI Suggested Connection', {
      fontSize: 28,
      background: 'rgba(15, 23, 42, 0.6)'
    });
    this.panelTitle.sprite.position.set(0, 0.18, 0.02);
    panelGroup.add(this.panelTitle.sprite);

    this.panelConnection = new TextSprite('Connection', {
      fontSize: 24,
      background: 'rgba(15, 23, 42, 0.6)'
    });
    this.panelConnection.sprite.position.set(0, 0.08, 0.02);
    panelGroup.add(this.panelConnection.sprite);

    this.panelReasons = [0, 1, 2].map((index) => {
      const reason = new TextSprite('', {
        fontSize: 20,
        background: 'rgba(15, 23, 42, 0.4)',
        borderWidth: 0
      });
      reason.sprite.position.set(0, 0.02 - index * 0.06, 0.02);
      panelGroup.add(reason.sprite);
      return reason;
    });

    this.panelConfidence = new TextSprite('Confidence', {
      fontSize: 22,
      background: 'rgba(15, 23, 42, 0.4)'
    });
    this.panelConfidence.sprite.position.set(0, -0.15, 0.02);
    panelGroup.add(this.panelConfidence.sprite);

    const acceptButton = this.createPanelButton(
      context,
      'Accept',
      new THREE.Vector3(-0.18, -0.22, 0.02),
      0x16a34a,
      () => {
        if (this.activeEdge) {
          this.acceptEdge(this.activeEdge);
        }
        this.hidePanel();
      }
    );
    const rejectButton = this.createPanelButton(
      context,
      'Reject',
      new THREE.Vector3(0.18, -0.22, 0.02),
      0xef4444,
      () => {
        if (this.activeEdge) {
          this.rejectEdge(this.activeEdge);
        }
        this.hidePanel();
      }
    );

    this.panelButtons.push(acceptButton, rejectButton);
    panelGroup.add(acceptButton.group, rejectButton.group);
  }

  private createPanelButton(
    context: ModuleContext,
    label: string,
    position: THREE.Vector3,
    color: number,
    onSelect: () => void
  ): PanelButton {
    const group = new THREE.Group();
    group.position.copy(position);

    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: 0x0b1220,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.07), material);
    mesh.name = `Button ${label}`;
    group.add(mesh);

    const text = new TextSprite(label, {
      fontSize: 20,
      background: 'rgba(0,0,0,0)',
      borderWidth: 0,
      paddingX: 8,
      paddingY: 6,
      scale: 0.0014
    });
    text.sprite.position.set(0, 0, 0.01);
    group.add(text.sprite);

    const unsubscribe = context.interaction.register(mesh, {
      onHoverStart: () => {
        material.emissive.setHex(0x1d4ed8);
      },
      onHoverEnd: () => {
        material.emissive.setHex(0x0b1220);
      },
      onSelect: () => {
        onSelect();
      }
    });

    return { group, mesh, material, label: text, unsubscribe };
  }

  private openPanel(edge: EdgeEntry, titles: Map<string, string>): void {
    if (!this.panelGroup || !this.panelConnection || !this.panelConfidence) {
      return;
    }
    if (!edge.visible) {
      return;
    }
    const sourceTitle = titles.get(edge.sourceId) ?? edge.sourceId;
    const targetTitle = titles.get(edge.targetId) ?? edge.targetId;
    this.panelConnection.update(`${sourceTitle} <-> ${targetTitle}`);

    const reasons = edge.reasons?.length ? edge.reasons : ['No additional context provided.'];
    this.panelReasons.forEach((reasonSprite, index) => {
      const text = reasons[index] ?? '';
      reasonSprite.update(text || '');
      reasonSprite.setVisible(Boolean(text));
    });

    if (edge.confidence !== undefined) {
      const percent = Math.round(edge.confidence * 100);
      this.panelConfidence.update(`Confidence: ${percent}%`);
    } else {
      this.panelConfidence.update('Confidence: n/a');
    }

    this.activeEdge = edge;
    this.positionPanelInFront();
    this.panelGroup.visible = true;
  }

  private hidePanel(): void {
    if (this.panelGroup) {
      this.panelGroup.visible = false;
    }
    this.activeEdge = undefined;
  }

  private positionPanelInFront(distance = 1.2): void {
    if (!this.panelGroup || !this.camera) {
      return;
    }
    this.camera.getWorldPosition(this.panelPosition);
    this.camera.getWorldDirection(this.panelDirection);
    this.panelGroup.position
      .copy(this.panelPosition)
      .add(this.panelDirection.multiplyScalar(distance))
      .add(this.panelOffset);
  }

  private disposePanel(): void {
    for (const button of this.panelButtons) {
      button.unsubscribe();
      button.material.dispose();
      button.mesh.geometry.dispose();
      button.label.dispose();
      button.group.removeFromParent();
    }
    this.panelButtons = [];

    this.panelTitle?.dispose();
    this.panelConnection?.dispose();
    this.panelConfidence?.dispose();
    this.panelTitle = undefined;
    this.panelConnection = undefined;
    this.panelConfidence = undefined;

    for (const reason of this.panelReasons) {
      reason.dispose();
    }
    this.panelReasons = [];

    this.panelBackground?.material.dispose();
    this.panelBackground?.geometry.dispose();
    this.panelBackground?.removeFromParent();
    this.panelBackground = undefined;

    this.panelGroup?.removeFromParent();
    this.panelGroup = undefined;
  }

  private acceptEdge(edge: EdgeEntry): void {
    edge.type = 'explicit';
    edge.material.color.setHex(EXPLICIT_COLOR);
    edge.material.opacity = 0.7;
    edge.baseColor = edge.material.color.getHex();
    edge.baseOpacity = edge.material.opacity;
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
