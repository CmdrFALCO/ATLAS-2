import * as THREE from 'three';
import type { AtlasModule, ModuleContext } from './AtlasModule';

export class StubModule implements AtlasModule {
  id = 'stub';
  private cube?: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private unsubscribe?: () => void;
  private selected = false;

  onLoad(context: ModuleContext): void {
    const material = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), material);
    cube.name = 'StubCube';
    cube.position.set(0, 1.4, -0.6);
    context.scene.add(cube);
    this.cube = cube;

    this.unsubscribe = context.interaction.register(cube, {
      onHoverStart: () => {
        material.emissive.setHex(0x1e293b);
      },
      onHoverEnd: () => {
        material.emissive.setHex(0x000000);
      },
      onSelect: () => {
        this.selected = !this.selected;
        material.color.setHex(this.selected ? 0x22c55e : 0x38bdf8);
      }
    });
  }

  onUpdate(dt: number): void {
    if (!this.cube) {
      return;
    }
    this.cube.rotation.y += dt * 0.6;
  }

  onUnload(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.selected = false;
    if (!this.cube) {
      return;
    }
    this.cube.geometry.dispose();
    this.cube.material.dispose();
    this.cube.removeFromParent();
    this.cube = undefined;
  }
}
