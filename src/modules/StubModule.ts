import * as THREE from 'three';
import type { AtlasModule, ModuleContext } from './AtlasModule';

export class StubModule implements AtlasModule {
  id = 'stub';
  private cube?: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;

  onLoad(context: ModuleContext): void {
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8 })
    );
    cube.position.set(0, 1.4, -0.6);
    context.scene.add(cube);
    this.cube = cube;
  }

  onUpdate(dt: number): void {
    if (!this.cube) {
      return;
    }
    this.cube.rotation.y += dt * 0.6;
  }

  onUnload(): void {
    if (!this.cube) {
      return;
    }
    this.cube.geometry.dispose();
    this.cube.material.dispose();
    this.cube.removeFromParent();
    this.cube = undefined;
  }
}
