import * as THREE from 'three';
import type { AtlasModule, ModuleContext } from './AtlasModule';
import { loadThemisData } from '../data';

interface ThemisNode {
  id: string;
  position: THREE.Vector3;
}

interface ThemisEvent {
  time: number;
  type: string;
  data: Record<string, unknown>;
}

export class ThemisModule implements AtlasModule {
  id = 'themis';
  private group?: THREE.Group;
  private active = false;
  private nodes = new Map<string, ThemisNode>();
  private token?: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  private tokenGeometry?: THREE.SphereGeometry;
  private tokenMaterial?: THREE.MeshStandardMaterial;
  private placeGeometry?: THREE.SphereGeometry;
  private transitionGeometry?: THREE.BoxGeometry;
  private placeMaterial?: THREE.MeshStandardMaterial;
  private transitionMaterial?: THREE.MeshStandardMaterial;
  private arcMaterial?: THREE.LineBasicMaterial;
  private script: ThemisEvent[] = [];
  private scriptIndex = 0;
  private elapsed = 0;
  private moving = false;
  private moveFrom?: THREE.Vector3;
  private moveTo?: THREE.Vector3;
  private moveDuration = 1;
  private moveTime = 0;
  private paused = false;
  private resumeTargetId?: string;

  private panel?: HTMLDivElement;
  private panelLabel?: HTMLDivElement;
  private panelContinue?: HTMLButtonElement;

  onLoad(context: ModuleContext): void {
    this.active = true;
    const group = new THREE.Group();
    group.name = 'Themis';
    context.scene.add(group);
    this.group = group;

    this.ensurePanel(context);

    loadThemisData().then((result) => {
      if (!this.active) {
        return;
      }
      this.buildScene(result.data);
      this.script = result.data.script.slice().sort((a, b) => a.time - b.time);
      this.scriptIndex = 0;
      this.elapsed = 0;
      this.spawnToken();
    });
  }

  onUpdate(dt: number): void {
    if (!this.active || this.paused) {
      return;
    }
    this.elapsed += dt;
    this.advanceScript();
    this.updateToken(dt);
  }

  onUnload(): void {
    this.active = false;
    this.hidePanel();
    this.panel?.remove();
    this.panel = undefined;

    this.nodes.clear();
    this.script = [];
    this.scriptIndex = 0;
    this.elapsed = 0;
    this.moving = false;
    this.paused = false;
    this.resumeTargetId = undefined;

    this.tokenMaterial?.dispose();
    this.tokenGeometry?.dispose();
    this.token?.removeFromParent();
    this.token = undefined;
    this.tokenMaterial = undefined;
    this.tokenGeometry = undefined;

    this.placeGeometry?.dispose();
    this.transitionGeometry?.dispose();
    this.placeMaterial?.dispose();
    this.transitionMaterial?.dispose();
    this.arcMaterial?.dispose();
    this.placeGeometry = undefined;
    this.transitionGeometry = undefined;
    this.placeMaterial = undefined;
    this.transitionMaterial = undefined;
    this.arcMaterial = undefined;

    this.group?.clear();
    this.group?.removeFromParent();
    this.group = undefined;
  }

  private buildScene(data: Awaited<ReturnType<typeof loadThemisData>>['data']): void {
    if (!this.group) {
      return;
    }
    this.placeMaterial = new THREE.MeshStandardMaterial({ color: 0x0ea5e9 });
    this.transitionMaterial = new THREE.MeshStandardMaterial({ color: 0x6366f1 });
    this.placeGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    this.transitionGeometry = new THREE.BoxGeometry(0.18, 0.18, 0.04);

    for (const place of data.places) {
      const mesh = new THREE.Mesh(this.placeGeometry, this.placeMaterial);
      mesh.position.set(place.position.x, place.position.y, place.position.z);
      mesh.name = place.label;
      this.group.add(mesh);
      this.nodes.set(place.id, { id: place.id, position: mesh.position.clone() });
    }

    for (const transition of data.transitions) {
      const mesh = new THREE.Mesh(this.transitionGeometry, this.transitionMaterial);
      mesh.position.set(transition.position.x, transition.position.y, transition.position.z);
      mesh.name = transition.label;
      this.group.add(mesh);
      this.nodes.set(transition.id, { id: transition.id, position: mesh.position.clone() });
    }

    this.arcMaterial = new THREE.LineBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.6
    });
    for (const arc of data.arcs) {
      const from = this.nodes.get(arc.from)?.position;
      const to = this.nodes.get(arc.to)?.position;
      if (!from || !to) {
        continue;
      }
      const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
      const line = new THREE.Line(geometry, this.arcMaterial);
      this.group.add(line);
    }
  }

  private spawnToken(): void {
    if (!this.group) {
      return;
    }
    this.tokenGeometry = new THREE.SphereGeometry(0.06, 16, 16);
    this.tokenMaterial = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x064e3b });
    this.token = new THREE.Mesh(this.tokenGeometry, this.tokenMaterial);
    const startNode =
      this.nodes.get('p_start') ?? (this.nodes.values().next().value as ThemisNode | undefined);
    if (startNode) {
      this.token.position.copy(startNode.position);
    }
    this.group.add(this.token);
  }

  private advanceScript(): void {
    if (this.scriptIndex >= this.script.length) {
      return;
    }
    const event = this.script[this.scriptIndex];
    if (this.elapsed < event.time) {
      return;
    }

    if (event.type === 'token_move') {
      const from = this.nodes.get(String(event.data.from));
      const to = this.nodes.get(String(event.data.to));
      if (from && to) {
        this.startMove(from.position, to.position);
      }
    }

    if (event.type === 'checkpoint_show') {
      this.paused = true;
      const label = String(event.data.label ?? 'Checkpoint');
      const resumeTo = event.data.resumeTo ?? event.data.nextTo ?? event.data.to;
      this.resumeTargetId = resumeTo ? String(resumeTo) : undefined;
      this.showPanel(label);
    }

    this.scriptIndex += 1;
  }

  private startMove(from: THREE.Vector3, to: THREE.Vector3): void {
    this.moving = true;
    this.moveTime = 0;
    this.moveFrom = from.clone();
    this.moveTo = to.clone();
  }

  private updateToken(dt: number): void {
    if (!this.moving || !this.token || !this.moveFrom || !this.moveTo) {
      return;
    }
    this.moveTime += dt;
    const t = Math.min(this.moveTime / this.moveDuration, 1);
    this.token.position.lerpVectors(this.moveFrom, this.moveTo, t);
    if (t >= 1) {
      this.moving = false;
    }
  }

  private ensurePanel(context: ModuleContext): void {
    if (this.panel) {
      return;
    }
    const panel = document.createElement('div');
    panel.style.position = 'absolute';
    panel.style.right = '16px';
    panel.style.bottom = '16px';
    panel.style.width = '280px';
    panel.style.padding = '12px';
    panel.style.background = 'rgba(15, 23, 42, 0.92)';
    panel.style.border = '1px solid rgba(148, 163, 184, 0.5)';
    panel.style.borderRadius = '12px';
    panel.style.color = '#e2e8f0';
    panel.style.fontFamily = 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
    panel.style.display = 'none';

    const label = document.createElement('div');
    label.style.fontWeight = '600';
    label.style.marginBottom = '10px';
    panel.appendChild(label);

    const button = document.createElement('button');
    button.textContent = 'Continue';
    button.style.padding = '6px 10px';
    button.style.borderRadius = '8px';
    button.style.border = '1px solid rgba(59, 130, 246, 0.6)';
    button.style.background = 'rgba(59, 130, 246, 0.2)';
    button.style.color = '#dbeafe';

    button.addEventListener('click', () => {
      this.hidePanel();
      this.paused = false;
      this.resumeFromCheckpoint();
    });

    panel.appendChild(button);
    context.uiRoot.appendChild(panel);

    this.panel = panel;
    this.panelLabel = label;
    this.panelContinue = button;
  }

  private showPanel(label: string): void {
    if (!this.panel || !this.panelLabel) {
      return;
    }
    this.panelLabel.textContent = label;
    this.panel.style.display = 'block';
  }

  private hidePanel(): void {
    if (!this.panel) {
      return;
    }
    this.panel.style.display = 'none';
  }

  private resumeFromCheckpoint(): void {
    if (!this.resumeTargetId || !this.token) {
      return;
    }
    const target = this.nodes.get(this.resumeTargetId);
    if (!target) {
      return;
    }
    const from = this.token.position.clone();
    this.startMove(from, target.position);
    this.resumeTargetId = undefined;
  }
}
