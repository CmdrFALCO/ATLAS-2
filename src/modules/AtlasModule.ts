import type * as THREE from 'three';

export interface ModuleContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export interface AtlasModule {
  id: string;
  onLoad(context: ModuleContext): void | Promise<void>;
  onUpdate(dt: number): void;
  onUnload(): void;
}
