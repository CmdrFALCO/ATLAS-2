import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AtlasModule, ModuleContext } from './AtlasModule';
import { loadTectonData } from '../data';
import { TextSprite } from '../ui/TextSprite';

interface VariantParams {
  cellCount: number;
  cooling: 'liquid' | 'air';
  energy_kwh: number;
  mass_kg: number;
  cost_relative: number;
  thermal_headroom: 'good' | 'moderate' | 'poor';
}

interface Variant {
  id: string;
  file: string;
  params: VariantParams;
}

interface PanelButton {
  group: THREE.Group;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  material: THREE.MeshStandardMaterial;
  label: TextSprite;
  unsubscribe: () => void;
}

interface ModelInstance {
  file: string;
  container: THREE.Group;
  content: THREE.Group;
  meshes: THREE.Mesh[];
  basePositions: THREE.Vector3[];
  explodeDirections: THREE.Vector3[];
}

const EXPLODE_DISTANCE = 0.12;

export class TectonModule implements AtlasModule {
  id = 'tecton';
  private group?: THREE.Group;
  private camera?: THREE.Camera;
  private activeVariant?: Variant;
  private aiVariant?: Variant;
  private variants: Variant[] = [];
  private variantIndex = 0;
  private showAi = false;
  private explode = false;
  private active = false;

  private panelGroup?: THREE.Group;
  private panelBackground?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private title?: TextSprite;
  private baseLines: TextSprite[] = [];
  private aiLines: TextSprite[] = [];
  private buttons: PanelButton[] = [];

  private loader = new GLTFLoader();
  private modelCache = new Map<string, Promise<THREE.Group>>();
  private baseModel?: ModelInstance;
  private aiModel?: ModelInstance;
  private baseFallback?: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private aiFallback?: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private baseFallbackMaterial?: THREE.MeshStandardMaterial;
  private aiFallbackMaterial?: THREE.MeshStandardMaterial;
  private baseRequestId = 0;
  private aiRequestId = 0;

  onLoad(context: ModuleContext): void {
    this.active = true;
    this.camera = context.camera;
    const group = new THREE.Group();
    group.name = 'Tecton';
    context.scene.add(group);
    this.group = group;

    this.ensurePanel(context);

    loadTectonData().then((result) => {
      if (!this.active) {
        return;
      }
      this.variants = result.data.variants.slice();
      this.aiVariant = result.data.aiSuggestion;
      this.initializeVariants();
    });
  }

  onUpdate(): void {
    if (this.panelGroup && this.camera) {
      this.panelGroup.lookAt(this.camera.position);
    }
  }

  onUnload(): void {
    this.active = false;
    this.disposePanel();

    this.disposeModel(this.baseModel);
    this.baseModel = undefined;
    this.disposeModel(this.aiModel);
    this.aiModel = undefined;

    this.disposeFallback('base');
    this.disposeFallback('ai');

    this.group?.removeFromParent();
    this.group = undefined;
    this.variants = [];
    this.activeVariant = undefined;
    this.aiVariant = undefined;
    this.modelCache.clear();
  }

  private initializeVariants(): void {
    if (!this.group || this.variants.length === 0) {
      return;
    }
    this.variantIndex = 0;
    this.activeVariant = this.variants[0];
    void this.updateBaseModel();
    void this.updateAiModel();
    this.updatePanel();
    this.updateLayout();
  }

  private async updateBaseModel(): Promise<void> {
    if (!this.group || !this.activeVariant || !this.active) {
      return;
    }
    const variant = this.activeVariant;
    const size = this.getSize(variant.params);
    const color = this.getThermalColor(variant.params.thermal_headroom);

    if (this.baseModel && this.baseModel.file === variant.file) {
      this.tintModel(this.baseModel, color, 1);
      this.fitModelToSize(this.baseModel, size);
      this.updateExplode();
      this.updateLayout();
      return;
    }

    const requestId = ++this.baseRequestId;
    let source: THREE.Group;
    try {
      source = await this.loadModel(variant.file);
    } catch (error) {
      console.warn('[tecton] Failed to load base model', error);
      this.ensureFallbackMesh('base', size, color, 1);
      this.updateLayout();
      return;
    }

    if (!this.group || !this.activeVariant || this.activeVariant.id !== variant.id) {
      return;
    }
    if (requestId !== this.baseRequestId) {
      return;
    }

    this.disposeModel(this.baseModel);
    this.baseModel = undefined;
    this.disposeFallback('base');

    const instance = this.createModelInstance(source, variant.file);
    this.tintModel(instance, color, 1);
    this.fitModelToSize(instance, size);
    this.updateExplode(instance);
    this.group.add(instance.container);
    this.baseModel = instance;

    this.updateLayout();
  }

  private async updateAiModel(): Promise<void> {
    if (!this.group || !this.aiVariant || !this.active) {
      return;
    }
    const variant = this.aiVariant;
    const size = this.getSize(variant.params);

    if (this.aiModel && this.aiModel.file === variant.file) {
      this.tintModel(this.aiModel, 0x22c55e, 0.55);
      this.fitModelToSize(this.aiModel, size);
      this.updateExplode();
      this.updateLayout();
      return;
    }

    const requestId = ++this.aiRequestId;
    let source: THREE.Group;
    try {
      source = await this.loadModel(variant.file);
    } catch (error) {
      console.warn('[tecton] Failed to load AI model', error);
      this.ensureFallbackMesh('ai', size, 0x22c55e, 0.5);
      this.updateLayout();
      return;
    }

    if (!this.group || !this.aiVariant || this.aiVariant.id !== variant.id) {
      return;
    }
    if (requestId !== this.aiRequestId) {
      return;
    }

    this.disposeModel(this.aiModel);
    this.aiModel = undefined;
    this.disposeFallback('ai');

    const instance = this.createModelInstance(source, variant.file);
    this.tintModel(instance, 0x22c55e, 0.55);
    this.fitModelToSize(instance, size);
    this.updateExplode(instance);
    instance.container.visible = this.showAi;
    this.group.add(instance.container);
    this.aiModel = instance;

    this.updateLayout();
  }

  private updateLayout(): void {
    const basePosition = new THREE.Vector3(0, 1.2, -0.6);
    const aiPosition = new THREE.Vector3(0.5, 1.2, -0.6);

    if (this.showAi) {
      basePosition.set(-0.5, 1.2, -0.6);
    }

    if (this.baseModel) {
      this.baseModel.container.position.copy(basePosition);
    }
    if (this.baseFallback) {
      this.baseFallback.position.copy(basePosition);
    }

    if (this.aiModel) {
      this.aiModel.container.position.copy(aiPosition);
      this.aiModel.container.visible = this.showAi;
    }
    if (this.aiFallback) {
      this.aiFallback.position.copy(aiPosition);
      this.aiFallback.visible = this.showAi;
    }
  }

  private ensurePanel(context: ModuleContext): void {
    if (this.panelGroup) {
      return;
    }
    const panelGroup = new THREE.Group();
    panelGroup.position.set(0.7, 1.35, -1.05);
    context.scene.add(panelGroup);
    this.panelGroup = panelGroup;

    const panelMaterial = new THREE.MeshStandardMaterial({
      color: 0x111827,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    });
    const panelMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 1.02), panelMaterial);
    panelMesh.name = 'TectonPanel';
    panelGroup.add(panelMesh);
    this.panelBackground = panelMesh;

    this.title = new TextSprite('Tecton Configurator', {
      fontSize: 30,
      background: 'rgba(15, 23, 42, 0.3)',
      width: 512,
      height: 96,
      scale: 0.0016
    });
    this.title.sprite.position.set(0, 0.4, 0.02);
    panelGroup.add(this.title.sprite);

    const baseLinePositions = [0.27, 0.19, 0.11, 0.03, -0.05, -0.13];
    this.baseLines = baseLinePositions.map((y) => {
      const line = new TextSprite('', {
        fontSize: 24,
        background: 'rgba(15, 23, 42, 0.2)',
        borderWidth: 1,
        width: 512,
        height: 80,
        scale: 0.00145
      });
      line.sprite.position.set(0, y, 0.02);
      panelGroup.add(line.sprite);
      return line;
    });

    const aiLinePositions = [-0.27, -0.33, -0.39, -0.45];
    this.aiLines = aiLinePositions.map((y) => {
      const line = new TextSprite('', {
        fontSize: 22,
        background: 'rgba(15, 23, 42, 0.18)',
        borderWidth: 1,
        width: 512,
        height: 72,
        scale: 0.00135
      });
      line.sprite.position.set(0, y, 0.02);
      panelGroup.add(line.sprite);
      return line;
    });

    const prevButton = this.createPanelButton(
      context,
      'Prev',
      new THREE.Vector3(-0.2, -0.53, 0.02),
      0x475569,
      () => this.shiftVariant(-1)
    );
    const nextButton = this.createPanelButton(
      context,
      'Next',
      new THREE.Vector3(0.2, -0.53, 0.02),
      0x475569,
      () => this.shiftVariant(1)
    );
    const toggleButton = this.createPanelButton(
      context,
      'Toggle AI',
      new THREE.Vector3(-0.12, -0.61, 0.02),
      0x16a34a,
      () => this.toggleAi()
    );
    const explodeButton = this.createPanelButton(
      context,
      'Explode',
      new THREE.Vector3(0.12, -0.61, 0.02),
      0x0ea5e9,
      () => this.toggleExplode()
    );

    this.buttons.push(prevButton, nextButton, toggleButton, explodeButton);
    panelGroup.add(prevButton.group, nextButton.group, toggleButton.group, explodeButton.group);
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
      fontSize: 18,
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

  private updatePanel(): void {
    if (!this.activeVariant || !this.baseLines.length) {
      return;
    }
    const { params, id } = this.activeVariant;
    const baseText = [
      `Variant: ${id}`,
      `Cells: ${params.cellCount}`,
      `Energy: ${params.energy_kwh.toFixed(1)} kWh`,
      `Mass: ${params.mass_kg.toFixed(1)} kg`,
      `Cooling: ${params.cooling}`,
      `Thermal: ${params.thermal_headroom}`
    ];
    this.baseLines.forEach((line, index) => {
      line.update(baseText[index] ?? '');
      line.setVisible(Boolean(baseText[index]));
    });

    if (this.showAi && this.aiVariant) {
      const ai = this.aiVariant.params;
      const aiText = [
        'AI Suggestion',
        `Cells: ${ai.cellCount}`,
        `Energy: ${ai.energy_kwh.toFixed(1)} kWh`,
        `Thermal: ${ai.thermal_headroom}`
      ];
      this.aiLines.forEach((line, index) => {
        line.update(aiText[index] ?? '');
        line.setVisible(Boolean(aiText[index]));
      });
    } else {
      this.aiLines.forEach((line) => line.setVisible(false));
    }
  }

  private shiftVariant(direction: number): void {
    if (this.variants.length === 0) {
      return;
    }
    this.variantIndex = (this.variantIndex + direction + this.variants.length) % this.variants.length;
    this.activeVariant = this.variants[this.variantIndex];
    void this.updateBaseModel();
    this.updatePanel();
    this.updateLayout();
  }

  private toggleAi(): void {
    this.showAi = !this.showAi;
    if (this.showAi && !this.aiModel) {
      void this.updateAiModel();
    }
    this.updateLayout();
    this.updatePanel();
    this.updateExplode();
  }

  private toggleExplode(): void {
    this.explode = !this.explode;
    this.updateExplode();
  }

  private updateExplode(instance?: ModelInstance): void {
    if (instance) {
      this.applyExplode(instance);
      return;
    }
    if (this.baseModel) {
      this.applyExplode(this.baseModel);
    }
    if (this.aiModel) {
      this.applyExplode(this.aiModel);
    }
  }

  private applyExplode(instance: ModelInstance): void {
    const distance = this.explode ? EXPLODE_DISTANCE : 0;
    instance.meshes.forEach((mesh, index) => {
      const base = instance.basePositions[index];
      const direction = instance.explodeDirections[index];
      mesh.position.copy(base);
      if (distance > 0) {
        mesh.position.addScaledVector(direction, distance);
      }
    });
  }

  private disposePanel(): void {
    this.title?.dispose();
    this.title = undefined;

    for (const line of this.baseLines) {
      line.dispose();
    }
    this.baseLines = [];

    for (const line of this.aiLines) {
      line.dispose();
    }
    this.aiLines = [];

    for (const button of this.buttons) {
      button.unsubscribe();
      button.material.dispose();
      button.mesh.geometry.dispose();
      button.label.dispose();
      button.group.removeFromParent();
    }
    this.buttons = [];

    this.panelBackground?.material.dispose();
    this.panelBackground?.geometry.dispose();
    this.panelBackground?.removeFromParent();
    this.panelBackground = undefined;

    this.panelGroup?.removeFromParent();
    this.panelGroup = undefined;
  }

  private resolveModelPath(file: string): string {
    if (file.startsWith('http') || file.startsWith('data:')) {
      return file;
    }
    if (file.startsWith('/')) {
      return file;
    }
    return `/${file}`;
  }

  private loadModel(file: string): Promise<THREE.Group> {
    const resolved = this.resolveModelPath(file);
    const cached = this.modelCache.get(resolved);
    if (cached) {
      return cached;
    }
    const promise = new Promise<THREE.Group>((resolve, reject) => {
      this.loader.load(
        resolved,
        (gltf) => resolve(gltf.scene),
        undefined,
        (error) => reject(error)
      );
    });
    this.modelCache.set(resolved, promise);
    return promise;
  }

  private createModelInstance(source: THREE.Group, file: string): ModelInstance {
    const content = source.clone(true);
    const container = new THREE.Group();
    container.add(content);

    const meshes: THREE.Mesh[] = [];
    const basePositions: THREE.Vector3[] = [];
    const explodeDirections: THREE.Vector3[] = [];

    content.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const usesArray = Array.isArray(child.material);
        const materials = usesArray ? child.material : [child.material];
        const clonedMaterials = materials.map((material) => material.clone());
        child.geometry = child.geometry.clone();
        child.material = usesArray ? clonedMaterials : clonedMaterials[0];
        meshes.push(child);
        basePositions.push(child.position.clone());
      }
    });

    const center = new THREE.Vector3();
    if (basePositions.length > 0) {
      for (const pos of basePositions) {
        center.add(pos);
      }
      center.multiplyScalar(1 / basePositions.length);
    }

    basePositions.forEach((pos, index) => {
      const direction = pos.clone().sub(center);
      if (direction.lengthSq() < 0.0001) {
        direction.set(index % 2 === 0 ? 1 : -1, 0.4, index % 3 === 0 ? 0.6 : -0.2);
      }
      direction.normalize();
      explodeDirections.push(direction);
    });

    return { file, container, content, meshes, basePositions, explodeDirections };
  }

  private tintModel(instance: ModelInstance, color: number, opacity: number): void {
    for (const mesh of instance.meshes) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        const mat = material as THREE.MeshStandardMaterial;
        if ('color' in mat) {
          mat.color.setHex(color);
        }
        if (opacity < 1) {
          mat.transparent = true;
          mat.opacity = opacity;
        } else {
          mat.opacity = 1;
          mat.transparent = false;
        }
        mat.needsUpdate = true;
      }
    }
  }

  private fitModelToSize(instance: ModelInstance, size: THREE.Vector3): void {
    const { content } = instance;
    content.scale.set(1, 1, 1);
    content.position.set(0, 0, 0);
    content.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(content);
    const boundsSize = new THREE.Vector3();
    bounds.getSize(boundsSize);

    const scale = new THREE.Vector3(
      boundsSize.x ? size.x / boundsSize.x : 1,
      boundsSize.y ? size.y / boundsSize.y : 1,
      boundsSize.z ? size.z / boundsSize.z : 1
    );
    content.scale.copy(scale);
    content.updateMatrixWorld(true);

    const centeredBounds = new THREE.Box3().setFromObject(content);
    const center = centeredBounds.getCenter(new THREE.Vector3());
    content.position.sub(center);
  }

  private disposeModel(instance?: ModelInstance): void {
    if (!instance) {
      return;
    }
    instance.container.removeFromParent();
    instance.container.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          material.dispose();
        }
      }
    });
  }

  private ensureFallbackMesh(
    target: 'base' | 'ai',
    size: THREE.Vector3,
    color: number,
    opacity: number
  ): void {
    if (!this.group) {
      return;
    }
    const mesh = target === 'base' ? this.baseFallback : this.aiFallback;
    let material = target === 'base' ? this.baseFallbackMaterial : this.aiFallbackMaterial;

    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color,
        transparent: opacity < 1,
        opacity
      });
    } else {
      material.color.setHex(color);
      material.opacity = opacity;
      material.transparent = opacity < 1;
    }

    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);

    if (mesh) {
      mesh.geometry.dispose();
      mesh.geometry = geometry;
      mesh.material = material;
    } else {
      const fallbackMesh = new THREE.Mesh(geometry, material);
      fallbackMesh.name = target === 'base' ? 'Tecton Base Fallback' : 'AI Suggestion Fallback';
      this.group.add(fallbackMesh);
      if (target === 'base') {
        this.baseFallback = fallbackMesh;
        this.baseFallbackMaterial = material;
      } else {
        this.aiFallback = fallbackMesh;
        this.aiFallbackMaterial = material;
      }
    }
  }

  private disposeFallback(target: 'base' | 'ai'): void {
    const mesh = target === 'base' ? this.baseFallback : this.aiFallback;
    const material = target === 'base' ? this.baseFallbackMaterial : this.aiFallbackMaterial;

    if (mesh) {
      mesh.geometry.dispose();
      mesh.removeFromParent();
    }
    if (material) {
      material.dispose();
    }

    if (target === 'base') {
      this.baseFallback = undefined;
      this.baseFallbackMaterial = undefined;
    } else {
      this.aiFallback = undefined;
      this.aiFallbackMaterial = undefined;
    }
  }

  private getThermalColor(headroom: VariantParams['thermal_headroom']): number {
    if (headroom === 'good') {
      return 0x22c55e;
    }
    if (headroom === 'moderate') {
      return 0xf59e0b;
    }
    return 0xef4444;
  }

  private getSize(params: VariantParams): THREE.Vector3 {
    const width = 0.6 + Math.max(params.cellCount - 40, 0) * 0.01;
    const height = 0.18 + Math.max(params.energy_kwh - 10, 0) * 0.02;
    const depth = 0.35 + Math.max(params.mass_kg - 70, 0) * 0.005;
    return new THREE.Vector3(width, height, depth);
  }
}
