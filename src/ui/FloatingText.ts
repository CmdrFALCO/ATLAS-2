import * as THREE from 'three';
import { TextSprite, type TextSpriteOptions } from './TextSprite';

export type FloatingAnchorMode = 'camera' | 'world';

export interface FloatingTextOptions {
  text?: TextSpriteOptions;
  distance?: number;
  offset?: THREE.Vector3;
}

export interface FloatingTextShowOptions {
  duration?: number;
  anchor?: {
    mode: FloatingAnchorMode;
    position?: THREE.Vector3;
  };
}

export class FloatingText {
  private group = new THREE.Group();
  private sprite: TextSprite;
  private active = false;
  private remaining = 0;
  private anchorMode: FloatingAnchorMode = 'camera';
  private anchorPosition = new THREE.Vector3();
  private distance: number;
  private offset: THREE.Vector3;
  private cameraPosition = new THREE.Vector3();
  private cameraDirection = new THREE.Vector3();

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    options: FloatingTextOptions = {}
  ) {
    this.distance = options.distance ?? 1.2;
    this.offset = options.offset?.clone() ?? new THREE.Vector3();
    this.sprite = new TextSprite('', options.text);
    this.group.add(this.sprite.sprite);
    this.group.visible = false;
    this.scene.add(this.group);
  }

  show(text: string, options: FloatingTextShowOptions = {}): void {
    this.sprite.update(text);
    this.sprite.setVisible(true);
    this.active = true;
    this.remaining = options.duration ?? 0;
    this.anchorMode = options.anchor?.mode ?? 'camera';
    if (options.anchor?.position) {
      this.anchorPosition.copy(options.anchor.position);
    }
    this.group.visible = true;
    this.updatePosition();
  }

  hide(): void {
    this.active = false;
    this.remaining = 0;
    this.sprite.setVisible(false);
    this.group.visible = false;
  }

  update(dt: number): void {
    if (!this.active) {
      return;
    }
    if (this.remaining > 0) {
      this.remaining -= dt;
      if (this.remaining <= 0) {
        this.hide();
        return;
      }
    }
    this.updatePosition();
  }

  dispose(): void {
    this.sprite.dispose();
    this.group.removeFromParent();
  }

  private updatePosition(): void {
    if (this.anchorMode === 'camera') {
      this.camera.getWorldPosition(this.cameraPosition);
      this.camera.getWorldDirection(this.cameraDirection);
      this.group.position
        .copy(this.cameraPosition)
        .add(this.cameraDirection.multiplyScalar(this.distance))
        .add(this.offset);
    } else {
      this.group.position.copy(this.anchorPosition);
    }
    this.group.lookAt(this.camera.position);
  }
}
