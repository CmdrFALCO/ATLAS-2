import * as THREE from 'three';
import type { AtlasModule, ModuleContext } from './AtlasModule';
import { loadTectonData } from '../data';

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

export class TectonModule implements AtlasModule {
  id = 'tecton';
  private group?: THREE.Group;
  private baseMesh?: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private aiMesh?: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private baseMaterial?: THREE.MeshStandardMaterial;
  private aiMaterial?: THREE.MeshStandardMaterial;
  private activeVariant?: Variant;
  private aiVariant?: Variant;
  private variants: Variant[] = [];
  private showAi = false;
  private active = false;

  private panel?: HTMLDivElement;
  private stats?: HTMLDivElement;
  private aiStats?: HTMLDivElement;
  private slider?: HTMLInputElement;
  private toggleButton?: HTMLButtonElement;

  onLoad(context: ModuleContext): void {
    this.active = true;
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
    // No-op for now.
  }

  onUnload(): void {
    this.active = false;
    this.panel?.remove();
    this.panel = undefined;
    this.stats = undefined;
    this.aiStats = undefined;
    this.slider = undefined;
    this.toggleButton = undefined;

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
    this.activeVariant = this.variants[0];
    this.updateBaseMesh();
    this.updateAiMesh();
    this.updatePanel();
    this.updateLayout();
    this.updateSliderState();
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
    if (this.panel) {
      return;
    }
    const panel = document.createElement('div');
    panel.style.position = 'absolute';
    panel.style.right = '16px';
    panel.style.bottom = '16px';
    panel.style.width = '320px';
    panel.style.padding = '12px';
    panel.style.background = 'rgba(15, 23, 42, 0.92)';
    panel.style.border = '1px solid rgba(148, 163, 184, 0.5)';
    panel.style.borderRadius = '12px';
    panel.style.color = '#e2e8f0';
    panel.style.fontFamily = 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif';

    const title = document.createElement('div');
    title.textContent = 'Tecton Configurator';
    title.style.fontWeight = '600';
    title.style.marginBottom = '8px';
    panel.appendChild(title);

    const stats = document.createElement('div');
    stats.style.marginBottom = '12px';
    panel.appendChild(stats);

    const sliderLabel = document.createElement('div');
    sliderLabel.textContent = 'Cell Count Variant';
    sliderLabel.style.marginBottom = '6px';
    panel.appendChild(sliderLabel);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '0';
    slider.step = '1';
    slider.value = '0';
    slider.style.width = '100%';
    slider.addEventListener('input', () => {
      const index = Number(slider.value);
      const next = this.variants[index];
      if (!next) {
        return;
      }
      this.activeVariant = next;
      this.updateBaseMesh();
      this.updatePanel();
      this.updateLayout();
    });
    panel.appendChild(slider);

    const aiStats = document.createElement('div');
    aiStats.style.margin = '12px 0';
    panel.appendChild(aiStats);

    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Show AI Suggestion';
    toggleButton.style.width = '100%';
    toggleButton.style.padding = '6px 10px';
    toggleButton.style.borderRadius = '8px';
    toggleButton.style.border = '1px solid rgba(34, 197, 94, 0.6)';
    toggleButton.style.background = 'rgba(34, 197, 94, 0.2)';
    toggleButton.style.color = '#dcfce7';
    toggleButton.addEventListener('click', () => {
      this.showAi = !this.showAi;
      toggleButton.textContent = this.showAi ? 'Hide AI Suggestion' : 'Show AI Suggestion';
      this.updateAiMesh();
      this.updateLayout();
      this.updatePanel();
    });
    panel.appendChild(toggleButton);

    context.uiRoot.appendChild(panel);

    this.panel = panel;
    this.stats = stats;
    this.aiStats = aiStats;
    this.slider = slider;
    this.toggleButton = toggleButton;
  }

  private updateSliderState(): void {
    if (!this.slider) {
      return;
    }
    this.slider.max = String(Math.max(this.variants.length - 1, 0));
    const index = this.activeVariant
      ? Math.max(this.variants.findIndex((variant) => variant.id === this.activeVariant?.id), 0)
      : 0;
    this.slider.value = String(index);
  }

  private updatePanel(): void {
    if (!this.stats || !this.aiStats) {
      return;
    }
    if (!this.activeVariant) {
      this.stats.textContent = 'Loading variants...';
      return;
    }
    const { params, id } = this.activeVariant;
    this.stats.innerHTML = [
      `<div><strong>${id}</strong></div>`,
      `<div>Cells: ${params.cellCount}</div>`,
      `<div>Energy: ${params.energy_kwh.toFixed(1)} kWh</div>`,
      `<div>Mass: ${params.mass_kg.toFixed(1)} kg</div>`,
      `<div>Cooling: ${params.cooling}</div>`,
      `<div>Thermal: ${params.thermal_headroom}</div>`
    ].join('');

    if (this.showAi && this.aiVariant) {
      const ai = this.aiVariant.params;
      this.aiStats.innerHTML = [
        `<div style=\"margin-top:8px;\"><strong>AI Suggestion</strong></div>`,
        `<div>Cells: ${ai.cellCount}</div>`,
        `<div>Energy: ${ai.energy_kwh.toFixed(1)} kWh</div>`,
        `<div>Mass: ${ai.mass_kg.toFixed(1)} kg</div>`,
        `<div>Thermal: ${ai.thermal_headroom}</div>`
      ].join('');
    } else {
      this.aiStats.innerHTML = '';
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
