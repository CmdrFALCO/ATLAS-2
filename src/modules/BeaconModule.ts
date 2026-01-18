import * as THREE from 'three';
import type { AtlasModule, ModuleContext } from './AtlasModule';

export class BeaconModule implements AtlasModule {
  id = 'beacon';
  private beacon?: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshStandardMaterial>;
  private unsubscribe?: () => void;
  private selected = false;

  onLoad(context: ModuleContext): void {
    const material = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x7c2d12 });
    const beacon = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.3, 1),
      material
    );
    beacon.name = 'Beacon';
    beacon.position.set(0, 1.25, -0.7);
    context.scene.add(beacon);
    this.beacon = beacon;

    this.unsubscribe = context.interaction.register(beacon, {
      onHoverStart: () => {
        material.emissive.setHex(0xb45309);
      },
      onHoverEnd: () => {
        material.emissive.setHex(0x7c2d12);
      },
      onSelect: () => {
        this.selected = !this.selected;
        material.color.setHex(this.selected ? 0x22c55e : 0xf97316);
      }
    });
  }

  onUpdate(dt: number): void {
    if (!this.beacon) {
      return;
    }
    this.beacon.rotation.x += dt * 0.5;
    this.beacon.rotation.y += dt * 0.7;
  }

  onUnload(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.selected = false;
    if (!this.beacon) {
      return;
    }
    this.beacon.geometry.dispose();
    this.beacon.material.dispose();
    this.beacon.removeFromParent();
    this.beacon = undefined;
  }
}
