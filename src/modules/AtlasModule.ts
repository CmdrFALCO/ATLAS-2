import type * as THREE from 'three';
import type { InteractionSystem } from '../core/InteractionSystem';

export interface ModuleContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  interaction: InteractionSystem;
}

export interface AtlasModule {
  id: string;
  onLoad(context: ModuleContext): void | Promise<void>;
  onUpdate(dt: number): void;
  onUnload(): void;
}
