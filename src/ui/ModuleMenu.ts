import * as THREE from 'three';
import type { InteractionSystem } from '../core/InteractionSystem';

export interface MenuItem {
  id: string;
  label: string;
  onSelect: () => void;
}

interface ButtonEntry {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  material: THREE.MeshStandardMaterial;
  label: LabelEntry;
  unsubscribe: () => void;
}

interface LabelEntry {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  texture: THREE.Texture;
}

export class ModuleMenu {
  private group = new THREE.Group();
  private buttons: ButtonEntry[] = [];
  private panel?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private panelMaterial?: THREE.MeshStandardMaterial;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private interaction: InteractionSystem,
    items: MenuItem[]
  ) {
    this.group.name = 'ModuleMenu';
    this.scene.add(this.group);
    this.build(items);
  }

  setPosition(position: THREE.Vector3): void {
    this.group.position.copy(position);
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  update(): void {
    this.group.lookAt(this.camera.position);
  }

  dispose(): void {
    for (const button of this.buttons) {
      button.unsubscribe();
      button.material.dispose();
      button.mesh.geometry.dispose();
      button.mesh.removeFromParent();
      button.label.material.dispose();
      button.label.texture.dispose();
      button.label.sprite.removeFromParent();
    }
    this.buttons = [];

    this.panelMaterial?.dispose();
    this.panel?.geometry.dispose();
    this.panel?.removeFromParent();
    this.panel = undefined;
    this.panelMaterial = undefined;

    this.group.removeFromParent();
  }

  private build(items: MenuItem[]): void {
    const width = 0.6;
    const buttonHeight = 0.08;
    const gap = 0.02;
    const padding = 0.04;
    const height = items.length * buttonHeight + (items.length - 1) * gap + padding * 2;

    const panelGeometry = new THREE.PlaneGeometry(width, height);
    this.panelMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    this.panel = new THREE.Mesh(panelGeometry, this.panelMaterial);
    this.panel.name = 'ModuleMenuPanel';
    this.group.add(this.panel);

    const startY = height / 2 - padding - buttonHeight / 2;

    items.forEach((item, index) => {
      const y = startY - index * (buttonHeight + gap);
      const material = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: 0x0b1220,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.08, buttonHeight), material);
      mesh.position.set(0, y, 0.01);
      mesh.name = `Menu ${item.label}`;
      this.group.add(mesh);

      const label = this.createLabelSprite(item.label, '#e2e8f0');
      label.sprite.position.set(0, y, 0.02);
      this.group.add(label.sprite);

      const unsubscribe = this.interaction.register(mesh, {
        onHoverStart: () => {
          material.emissive.setHex(0x1d4ed8);
        },
        onHoverEnd: () => {
          material.emissive.setHex(0x0b1220);
        },
        onSelect: () => {
          item.onSelect();
        }
      });

      this.buttons.push({ mesh, material, label, unsubscribe });
    });
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
    const paddingX = 16;
    const paddingY = 12;
    canvas.width = Math.ceil(metrics.width + paddingX * 2);
    canvas.height = fontSize + paddingY * 2;

    context.font = `600 ${fontSize}px Segoe UI`;
    context.fillStyle = 'rgba(15, 23, 42, 0.7)';
    context.fillRect(2, 2, canvas.width - 4, canvas.height - 4);
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
    const scale = Math.min(0.5, 0.18 + text.length * 0.02);
    sprite.scale.set(scale, scale * (canvas.height / canvas.width), 1);

    return { sprite, material, texture };
  }
}
