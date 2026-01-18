import * as THREE from 'three';
import type { ModuleContext } from '../modules/AtlasModule';
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
    const button = this.createVRButton();
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

  private createVRButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = 'ENTER VR';
    button.style.position = 'absolute';
    button.style.right = '16px';
    button.style.bottom = '16px';
    button.style.padding = '10px 12px';
    button.style.borderRadius = '8px';
    button.style.border = '1px solid rgba(148, 163, 184, 0.6)';
    button.style.background = 'rgba(15, 23, 42, 0.8)';
    button.style.color = '#e2e8f0';
    button.style.cursor = 'pointer';
    button.style.zIndex = '999';

    let currentSession: XRSession | null = null;

    const onSessionStarted = async (session: XRSession) => {
      currentSession = session;
      currentSession.addEventListener('end', onSessionEnded);
      await this.renderer.xr.setSession(session);
      button.textContent = 'EXIT VR';
    };

    const onSessionEnded = () => {
      if (!currentSession) {
        return;
      }
      currentSession.removeEventListener('end', onSessionEnded);
      currentSession = null;
      button.textContent = 'ENTER VR';
    };

    const sessionInit: XRSessionInit = {
      optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers', 'dom-overlay'],
      domOverlay: { root: this.container }
    };

    const fallbackInit: XRSessionInit = {
      optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers']
    };

    button.onclick = () => {
      if (!navigator.xr) {
        return;
      }
      if (currentSession) {
        currentSession.end();
        return;
      }
      navigator.xr
        .requestSession('immersive-vr', sessionInit)
        .then(onSessionStarted)
        .catch(() =>
          navigator.xr?.requestSession('immersive-vr', fallbackInit).then(onSessionStarted)
        );
    };

    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        if (!supported) {
          button.textContent = 'VR NOT SUPPORTED';
          button.disabled = true;
        }
      });
    } else {
      button.textContent = 'VR NOT AVAILABLE';
      button.disabled = true;
    }

    return button;
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
