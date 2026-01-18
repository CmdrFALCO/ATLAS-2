import * as THREE from 'three';

export interface InteractionHit {
  object: THREE.Object3D;
  point: THREE.Vector3;
  distance: number;
}

export interface InteractionHandlers {
  onHoverStart?: (hit: InteractionHit) => void;
  onHoverEnd?: (hit: InteractionHit) => void;
  onSelect?: (hit: InteractionHit) => void;
}

export class InteractionSystem {
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private targets = new Map<THREE.Object3D, InteractionHandlers>();
  private hovered?: THREE.Object3D;
  private hoveredHit?: InteractionHit;
  private hasPointer = false;
  private xrControllers = new Set<THREE.Object3D>();
  private controllerCursors = new Map<THREE.Object3D, THREE.Mesh>();
  private defaultRayLength = 5;

  constructor(private camera: THREE.Camera, private domElement: HTMLElement) {
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointerleave', this.onPointerLeave);
  }

  register(object: THREE.Object3D, handlers: InteractionHandlers): () => void {
    this.targets.set(object, handlers);
    return () => {
      if (this.hovered === object) {
        this.clearHover();
      }
      this.targets.delete(object);
    };
  }

  addXRController(controller: THREE.Object3D): () => void {
    if (this.xrControllers.has(controller)) {
      return () => {};
    }
    this.xrControllers.add(controller);
    const cursor = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0 })
    );
    cursor.position.set(0, 0, -this.defaultRayLength);
    controller.add(cursor);
    this.controllerCursors.set(controller, cursor);
    const onSelect = () => {
      const hit = this.getControllerHits(controller)[0];
      if (!hit) {
        return;
      }
      const handlers = this.targets.get(hit.object);
      handlers?.onSelect?.(hit);
    };
    controller.addEventListener('selectstart', onSelect);
    return () => {
      controller.removeEventListener('selectstart', onSelect);
      const cursorMesh = this.controllerCursors.get(controller);
      if (cursorMesh) {
        cursorMesh.geometry.dispose();
        (cursorMesh.material as THREE.Material).dispose();
        cursorMesh.removeFromParent();
        this.controllerCursors.delete(controller);
      }
      this.xrControllers.delete(controller);
      if (this.xrControllers.size === 0 && !this.hasPointer) {
        this.clearHover();
      }
    };
  }

  update(): void {
    if ((!this.hasPointer && this.xrControllers.size === 0) || this.targets.size === 0) {
      this.clearHover();
      return;
    }
    const hits: InteractionHit[] = [];

    if (this.hasPointer) {
      hits.push(...this.getPointerHits());
    }

    for (const controller of this.xrControllers) {
      const controllerHits = this.getControllerHits(controller);
      hits.push(...controllerHits);
      const cursor = this.controllerCursors.get(controller);
      if (cursor) {
        const distance = controllerHits[0]?.distance ?? this.defaultRayLength;
        cursor.position.set(0, 0, -distance);
      }
    }

    hits.sort((a, b) => a.distance - b.distance);
    const next = hits[0];
    if (next?.object !== this.hovered) {
      if (this.hovered && this.hoveredHit) {
        const prevHandlers = this.targets.get(this.hovered);
        prevHandlers?.onHoverEnd?.(this.hoveredHit);
      }
      if (next) {
        const nextHandlers = this.targets.get(next.object);
        nextHandlers?.onHoverStart?.(next);
      }
      this.hovered = next?.object;
      this.hoveredHit = next;
    }
  }

  dispose(): void {
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointerleave', this.onPointerLeave);
    this.targets.clear();
    this.clearHover();
  }

  getHoverHit(): InteractionHit | undefined {
    return this.hoveredHit;
  }

  private onPointerMove = (event: PointerEvent): void => {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.hasPointer = true;
  };

  private onPointerDown = (): void => {
    if (!this.hasPointer) {
      return;
    }
    const top = this.getPointerHits()[0];
    if (!top) {
      return;
    }
    const handlers = this.targets.get(top.object);
    handlers?.onSelect?.(top);
  };

  private onPointerLeave = (): void => {
    this.hasPointer = false;
    this.clearHover();
  };

  private clearHover(): void {
    if (this.hovered && this.hoveredHit) {
      const handlers = this.targets.get(this.hovered);
      handlers?.onHoverEnd?.(this.hoveredHit);
    }
    this.hovered = undefined;
    this.hoveredHit = undefined;
  }

  private getPointerHits(): InteractionHit[] {
    const objects = Array.from(this.targets.keys());
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.getHitsFromRaycaster(objects);
  }

  private getControllerHits(controller: THREE.Object3D): InteractionHit[] {
    const objects = Array.from(this.targets.keys());
    const origin = new THREE.Vector3();
    const direction = new THREE.Vector3(0, 0, -1);
    const rotation = new THREE.Matrix4();

    origin.setFromMatrixPosition(controller.matrixWorld);
    rotation.extractRotation(controller.matrixWorld);
    direction.applyMatrix4(rotation);
    this.raycaster.set(origin, direction.normalize());

    return this.getHitsFromRaycaster(objects);
  }

  private getHitsFromRaycaster(objects: THREE.Object3D[]): InteractionHit[] {
    const intersections = this.raycaster.intersectObjects(objects, true);
    const hits: InteractionHit[] = [];
    const seen = new Set<THREE.Object3D>();

    for (const hit of intersections) {
      const target = this.resolveTarget(hit.object);
      if (!target || seen.has(target)) {
        continue;
      }
      seen.add(target);
      hits.push({
        object: target,
        point: hit.point,
        distance: hit.distance
      });
    }

    return hits;
  }

  private resolveTarget(object: THREE.Object3D): THREE.Object3D | undefined {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (this.targets.has(current)) {
        return current;
      }
      current = current.parent;
    }
    return undefined;
  }
}
