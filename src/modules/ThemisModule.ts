import * as THREE from 'three';
import type { AtlasModule, ModuleContext } from './AtlasModule';
import { loadThemisData } from '../data';
import { TextSprite } from '../ui/TextSprite';

interface ThemisNode {
  id: string;
  position: THREE.Vector3;
}

interface ThemisEvent {
  time: number;
  type: string;
  data: Record<string, unknown>;
}

interface PanelButton {
  group: THREE.Group;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  material: THREE.MeshStandardMaterial;
  label: TextSprite;
  unsubscribe: () => void;
}

export class ThemisModule implements AtlasModule {
  id = 'themis';
  private group?: THREE.Group;
  private camera?: THREE.Camera;
  private panelOffset = new THREE.Vector3(0, -0.1, 0);
  private panelPosition = new THREE.Vector3();
  private panelDirection = new THREE.Vector3();
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

  private panelGroup?: THREE.Group;
  private panelLabel?: TextSprite;
  private panelButtons: PanelButton[] = [];
  private panelBackground?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;

  onLoad(context: ModuleContext): void {
    this.active = true;
    this.camera = context.camera;
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
    if (!this.active) {
      return;
    }
    if (this.panelGroup && this.camera) {
      this.panelGroup.lookAt(this.camera.position);
    }
    if (this.paused) {
      return;
    }
    this.elapsed += dt;
    this.advanceScript();
    this.updateToken(dt);
  }

  onUnload(): void {
    this.active = false;
    this.hidePanel();
    this.disposePanel();

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
    if (this.panelGroup) {
      return;
    }
    const panelGroup = new THREE.Group();
    panelGroup.position.set(0.7, 1.3, -1.1);
    panelGroup.visible = false;
    context.scene.add(panelGroup);
    this.panelGroup = panelGroup;

    const panelMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const panelMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), panelMaterial);
    panelMesh.name = 'ThemisPanel';
    panelGroup.add(panelMesh);
    this.panelBackground = panelMesh;

    this.panelLabel = new TextSprite('Checkpoint', {
      fontSize: 24,
      background: 'rgba(15, 23, 42, 0.6)'
    });
    this.panelLabel.sprite.position.set(0, 0.05, 0.02);
    panelGroup.add(this.panelLabel.sprite);

    const continueButton = this.createPanelButton(
      context,
      'Continue',
      new THREE.Vector3(0, -0.05, 0.02),
      0x2563eb,
      () => {
        this.hidePanel();
        this.paused = false;
        this.resumeFromCheckpoint();
      }
    );
    this.panelButtons.push(continueButton);
    panelGroup.add(continueButton.group);
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
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.07), material);
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

  private showPanel(label: string): void {
    if (!this.panelGroup || !this.panelLabel) {
      return;
    }
    this.panelLabel.update(label);
    this.positionPanelInFront();
    this.panelGroup.visible = true;
  }

  private hidePanel(): void {
    if (!this.panelGroup) {
      return;
    }
    this.panelGroup.visible = false;
  }

  private positionPanelInFront(distance = 1.1): void {
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

    this.panelLabel?.dispose();
    this.panelLabel = undefined;

    this.panelBackground?.material.dispose();
    this.panelBackground?.geometry.dispose();
    this.panelBackground?.removeFromParent();
    this.panelBackground = undefined;

    this.panelGroup?.removeFromParent();
    this.panelGroup = undefined;
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
