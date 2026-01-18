import * as THREE from 'three';
import type { AtlasModule, ModuleContext } from './AtlasModule';

export class BeaconModule implements AtlasModule {
  id = 'beacon';
  private beacon?: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshStandardMaterial>;

  onLoad(context: ModuleContext): void {
    const beacon = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.3, 1),
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x7c2d12 })
    );
    beacon.position.set(0, 1.25, -0.7);
    context.scene.add(beacon);
    this.beacon = beacon;
  }

  onUpdate(dt: number): void {
    if (!this.beacon) {
      return;
    }
    this.beacon.rotation.x += dt * 0.5;
    this.beacon.rotation.y += dt * 0.7;
  }

  onUnload(): void {
    if (!this.beacon) {
      return;
    }
    this.beacon.geometry.dispose();
    this.beacon.material.dispose();
    this.beacon.removeFromParent();
    this.beacon = undefined;
  }
}
