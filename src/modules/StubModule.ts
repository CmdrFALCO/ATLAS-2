import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AtlasModule, ModuleContext } from './AtlasModule';
import { MERCEDES_MODELS } from './modelCatalog';

export class StubModule implements AtlasModule {
  id = 'stub';
  private group?: THREE.Group;
  private model?: THREE.Object3D;
  private collider?: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
  private unsubscribe?: () => void;
  private context?: ModuleContext;
  private loader = new GLTFLoader();
  private hover = false;
  private modelIndex = 0;
  private loadToken = 0;
  private dragging = false;
  private dragController?: THREE.Object3D;
  private dragDistance = 0;
  private dragOffset = new THREE.Vector3();
  private controllerHandlers: Array<{
    controller: THREE.Object3D;
    onSqueezeStart: () => void;
    onSqueezeEnd: () => void;
  }> = [];
  private grabRaycaster = new THREE.Raycaster();
  private grabOrigin = new THREE.Vector3();
  private grabDirection = new THREE.Vector3();
  private grabRotation = new THREE.Matrix4();

  onLoad(context: ModuleContext): void {
    this.context = context;
    const group = new THREE.Group();
    group.name = 'StubModel';
    group.position.set(0, 0.9, -0.6);
    context.scene.add(group);
    this.group = group;
    this.bindGrabControllers(context);
    void this.loadModel();
  }

  onUpdate(dt: number): void {
    if (!this.group) {
      return;
    }
    this.group.rotation.y += dt * 0.4;
    this.group.scale.setScalar(this.hover ? 1.03 : 1);
    if (this.dragging) {
      this.updateDraggedGroup();
    }
  }

  onUnload(): void {
    this.unbindGrabControllers();
    this.clearModel();
    this.group?.removeFromParent();
    this.group = undefined;
    this.context = undefined;
  }

  private async loadModel(): Promise<void> {
    if (!this.group || !this.context) {
      return;
    }
    const modelConfig = MERCEDES_MODELS[this.modelIndex];
    const token = ++this.loadToken;
    try {
      const gltf = await this.loader.loadAsync(this.resolvePath(modelConfig.file));
      if (!this.group || token !== this.loadToken) {
        return;
      }
      this.clearModel();
      this.model = gltf.scene;
      this.model.name = modelConfig.label;
      this.fitModelToSize(this.model, 3.5);
      this.group.add(this.model);
      this.updateCollider();
    } catch (error) {
      console.warn('[stub] Failed to load model', error);
    }
  }

  private cycleModel(): void {
    this.modelIndex = (this.modelIndex + 1) % MERCEDES_MODELS.length;
    void this.loadModel();
  }

  private updateCollider(): void {
    if (!this.group || !this.model || !this.context) {
      return;
    }
    const bounds = new THREE.Box3().setFromObject(this.model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bounds.getSize(size);
    bounds.getCenter(center);

    if (!this.collider) {
      const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
      this.collider = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
      this.collider.name = 'StubCollider';
      this.group.add(this.collider);
    } else {
      this.collider.geometry.dispose();
      this.collider.geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    }
    this.collider.position.copy(center);

    this.unsubscribe?.();
    this.unsubscribe = this.context.interaction.register(this.collider, {
      onHoverStart: () => {
        this.hover = true;
      },
      onHoverEnd: () => {
        this.hover = false;
      },
      onSelect: () => {
        this.cycleModel();
      }
    });
  }

  private clearModel(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.hover = false;

    if (this.collider) {
      this.collider.geometry.dispose();
      this.collider.material.dispose();
      this.collider.removeFromParent();
      this.collider = undefined;
    }

    if (this.model) {
      this.disposeObject(this.model);
      this.model.removeFromParent();
      this.model = undefined;
    }
  }

  private bindGrabControllers(context: ModuleContext): void {
    if (this.controllerHandlers.length > 0) {
      return;
    }
    const controllers = [
      context.renderer.xr.getController(0),
      context.renderer.xr.getController(1)
    ];
    for (const controller of controllers) {
      const onSqueezeStart = () => this.beginGrab(controller);
      const onSqueezeEnd = () => this.endGrab(controller);
      controller.addEventListener('squeezestart', onSqueezeStart);
      controller.addEventListener('squeezeend', onSqueezeEnd);
      this.controllerHandlers.push({ controller, onSqueezeStart, onSqueezeEnd });
    }
  }

  private unbindGrabControllers(): void {
    for (const entry of this.controllerHandlers) {
      entry.controller.removeEventListener('squeezestart', entry.onSqueezeStart);
      entry.controller.removeEventListener('squeezeend', entry.onSqueezeEnd);
    }
    this.controllerHandlers = [];
  }

  private beginGrab(controller: THREE.Object3D): void {
    if (!this.group || !this.collider || this.dragging) {
      return;
    }
    const hit = this.getControllerHit(controller);
    if (!hit) {
      return;
    }
    this.dragging = true;
    this.dragController = controller;
    this.dragDistance = hit.distance;
    this.dragOffset.copy(this.group.position).sub(hit.point);
  }

  private endGrab(controller: THREE.Object3D): void {
    if (!this.dragging || this.dragController !== controller) {
      return;
    }
    this.dragging = false;
    this.dragController = undefined;
    this.dragDistance = 0;
    this.dragOffset.set(0, 0, 0);
  }

  private getControllerHit(controller: THREE.Object3D): {
    point: THREE.Vector3;
    distance: number;
  } | null {
    if (!this.collider) {
      return null;
    }
    this.grabOrigin.setFromMatrixPosition(controller.matrixWorld);
    this.grabRotation.extractRotation(controller.matrixWorld);
    this.grabDirection.set(0, 0, -1).applyMatrix4(this.grabRotation).normalize();
    this.grabRaycaster.set(this.grabOrigin, this.grabDirection);
    const intersections = this.grabRaycaster.intersectObject(this.collider, false);
    if (!intersections.length) {
      return null;
    }
    const hit = intersections[0];
    return { point: hit.point, distance: hit.distance };
  }

  private updateDraggedGroup(): void {
    if (!this.group || !this.dragController) {
      return;
    }
    this.grabOrigin.setFromMatrixPosition(this.dragController.matrixWorld);
    this.grabRotation.extractRotation(this.dragController.matrixWorld);
    this.grabDirection.set(0, 0, -1).applyMatrix4(this.grabRotation).normalize();
    this.group.position
      .copy(this.grabOrigin)
      .addScaledVector(this.grabDirection, this.dragDistance)
      .add(this.dragOffset);
  }

  private fitModelToSize(model: THREE.Object3D, targetSize: number): void {
    model.scale.set(1, 1, 1);
    model.position.set(0, 0, 0);
    model.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    bounds.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? targetSize / maxDim : 1;
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);

    const scaledBounds = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    scaledBounds.getCenter(center);
    model.position.sub(center);
  }

  private resolvePath(file: string): string {
    if (file.startsWith('/')) {
      return file;
    }
    return `/${file}`;
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          this.disposeMaterial(material);
        }
      }
    });
  }

  private disposeMaterial(material: THREE.Material): void {
    const textures = Object.values(material).filter(
      (value): value is THREE.Texture => value instanceof THREE.Texture
    );
    for (const texture of textures) {
      texture.dispose();
    }
    material.dispose();
  }
}
