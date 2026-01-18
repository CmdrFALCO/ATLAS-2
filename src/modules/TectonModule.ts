import * as THREE from 'three';
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

export class TectonModule implements AtlasModule {
  id = 'tecton';
  private group?: THREE.Group;
  private camera?: THREE.Camera;
  private baseMesh?: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private aiMesh?: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private baseMaterial?: THREE.MeshStandardMaterial;
  private aiMaterial?: THREE.MeshStandardMaterial;
  private activeVariant?: Variant;
  private aiVariant?: Variant;
  private variants: Variant[] = [];
  private variantIndex = 0;
  private showAi = false;
  private active = false;

  private panelGroup?: THREE.Group;
  private panelBackground?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private title?: TextSprite;
  private baseLines: TextSprite[] = [];
  private aiLines: TextSprite[] = [];
  private buttons: PanelButton[] = [];

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

    this.baseMesh?.geometry.dispose();
    this.baseMaterial?.dispose();
    this.baseMesh?.removeFromParent();
    this.baseMesh = undefined;
    this.baseMaterial = undefined;

    this.aiMesh?.geometry.dispose();
    this.aiMaterial?.dispose();
    this.aiMesh?.removeFromParent();
    this.aiMesh = undefined;
    this.aiMaterial = undefined;

    this.group?.removeFromParent();
    this.group = undefined;
    this.variants = [];
    this.activeVariant = undefined;
    this.aiVariant = undefined;
  }

  private initializeVariants(): void {
    if (!this.group || this.variants.length === 0) {
      return;
    }
    this.variantIndex = 0;
    this.activeVariant = this.variants[0];
    this.updateBaseMesh();
    this.updateAiMesh();
    this.updatePanel();
    this.updateLayout();
  }

  private updateBaseMesh(): void {
    if (!this.group || !this.activeVariant) {
      return;
    }
    const size = this.getSize(this.activeVariant.params);
    const color = this.getThermalColor(this.activeVariant.params.thermal_headroom);

    if (!this.baseMaterial) {
      this.baseMaterial = new THREE.MeshStandardMaterial({ color });
    } else {
      this.baseMaterial.color.set(color);
    }

    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    if (this.baseMesh) {
      this.baseMesh.geometry.dispose();
      this.baseMesh.geometry = geometry;
    } else {
      this.baseMesh = new THREE.Mesh(geometry, this.baseMaterial);
      this.baseMesh.name = 'Tecton Base';
      this.baseMesh.position.set(0, 1.2, -0.6);
      this.group.add(this.baseMesh);
    }
  }

  private updateAiMesh(): void {
    if (!this.group || !this.aiVariant) {
      return;
    }
    const size = this.getSize(this.aiVariant.params);
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);

    if (!this.aiMaterial) {
      this.aiMaterial = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        transparent: true,
        opacity: 0.5
      });
    }

    if (this.aiMesh) {
      this.aiMesh.geometry.dispose();
      this.aiMesh.geometry = geometry;
    } else {
      this.aiMesh = new THREE.Mesh(geometry, this.aiMaterial);
      this.aiMesh.name = 'AI Suggestion';
      this.group.add(this.aiMesh);
    }

    this.aiMesh.visible = this.showAi;
  }

  private updateLayout(): void {
    if (!this.baseMesh) {
      return;
    }
    if (this.showAi && this.aiMesh) {
      this.baseMesh.position.set(-0.5, 1.2, -0.6);
      this.aiMesh.position.set(0.5, 1.2, -0.6);
    } else {
      this.baseMesh.position.set(0, 1.2, -0.6);
      if (this.aiMesh) {
        this.aiMesh.position.set(0.5, 1.2, -0.6);
      }
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
      new THREE.Vector3(0, -0.61, 0.02),
      0x16a34a,
      () => this.toggleAi()
    );

    this.buttons.push(prevButton, nextButton, toggleButton);
    panelGroup.add(prevButton.group, nextButton.group, toggleButton.group);
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
    this.updateBaseMesh();
    this.updatePanel();
    this.updateLayout();
  }

  private toggleAi(): void {
    this.showAi = !this.showAi;
    this.updateAiMesh();
    this.updateLayout();
    this.updatePanel();
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
