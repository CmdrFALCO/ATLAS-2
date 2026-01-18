import * as THREE from 'three';
import type { ModuleContext } from '../modules/AtlasModule';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { InteractionSystem } from './InteractionSystem';
import { ModuleLoader } from './ModuleLoader';

export interface EngineOptions {
  background?: number;
  showGrid?: boolean;
  showAxes?: boolean;
  enableXR?: boolean;
}

export class AtlasEngine {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly modules: ModuleLoader;
  readonly interaction: InteractionSystem;

  private clock = new THREE.Clock();
  private running = false;
  private frameListeners: Array<(dt: number) => void> = [];
  private xrEnabled = false;

  constructor(private container: HTMLElement, options: EngineOptions = {}) {
    const background = options.background ?? 0x0b0f14;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(background);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 1.6, 3);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.addDefaultEnvironment(options);

    this.interaction = new InteractionSystem(this.camera, this.renderer.domElement);

    const context: ModuleContext = {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      interaction: this.interaction,
      uiRoot: this.container
    };
    this.modules = new ModuleLoader(context);

    window.addEventListener('resize', this.onResize);

    if (options.enableXR) {
      this.enableXR();
    }
  }

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(this.onFrame);
  }

  stop(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  enableXR(): void {
    if (this.xrEnabled) {
      return;
    }
    this.xrEnabled = true;
    this.renderer.xr.enabled = true;
    const button = VRButton.createButton(this.renderer);
    button.style.position = 'absolute';
    button.style.right = '16px';
    button.style.bottom = '16px';
    this.container.appendChild(button);

    const controller1 = this.renderer.xr.getController(0);
    const controller2 = this.renderer.xr.getController(1);
    this.setupControllerRay(controller1);
    this.setupControllerRay(controller2);
    this.scene.add(controller1);
    this.scene.add(controller2);
    this.interaction.addXRController(controller1);
    this.interaction.addXRController(controller2);
  }

  addFrameListener(listener: (dt: number) => void): () => void {
    this.frameListeners.push(listener);
    return () => {
      this.frameListeners = this.frameListeners.filter((item) => item !== listener);
    };
  }

  private addDefaultEnvironment(options: EngineOptions): void {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 1.0);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(3, 4, 2);
    this.scene.add(dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.8,
        metalness: 0.1
      })
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    if (options.showGrid ?? true) {
      const grid = new THREE.GridHelper(12, 12, 0x334155, 0x1f2937);
      const material = grid.material as THREE.Material;
      material.opacity = 0.6;
      material.transparent = true;
      this.scene.add(grid);
    }

    if (options.showAxes ?? true) {
      const axes = new THREE.AxesHelper(1.2);
      axes.position.set(0, 0.02, 0);
      this.scene.add(axes);
    }
  }

  private setupControllerRay(controller: THREE.Object3D): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const material = new THREE.LineBasicMaterial({ color: 0x94a3b8 });
    const line = new THREE.Line(geometry, material);
    line.name = 'xr-ray';
    line.scale.z = 5;
    controller.add(line);
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private onFrame = (): void => {
    const dt = this.clock.getDelta();
    for (const listener of this.frameListeners) {
      listener(dt);
    }
    this.interaction.update();
    this.modules.update(dt);
    this.renderer.render(this.scene, this.camera);
  };
}
