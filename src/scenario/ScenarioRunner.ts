import * as THREE from 'three';
import type { ModuleLoader } from '../core/ModuleLoader';
import { loadScenarioScript } from '../data/scenarios';
import { FloatingText, type FloatingTextShowOptions } from '../ui/FloatingText';
import type { ScenarioAnchor, ScenarioEvent, ScenarioScript } from './types';

interface ScenarioModule {
  onScenarioEvent?: (event: ScenarioEvent) => void;
  getScenarioAnchor?: (anchor: ScenarioAnchor) => THREE.Vector3 | undefined;
}

export class ScenarioRunner {
  private tooltip: FloatingText;
  private narration: FloatingText;
  private events: ScenarioEvent[] = [];
  private index = 0;
  private hold = 0;
  private running = false;
  private activeScriptId?: string;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    private modules: ModuleLoader
  ) {
    this.tooltip = new FloatingText(scene, camera, {
      text: {
        fontSize: 26,
        background: 'rgba(15, 23, 42, 0.7)',
        borderColor: 'rgba(148, 163, 184, 0.7)',
        borderWidth: 2,
        paddingX: 20,
        paddingY: 14,
        scale: 0.0019
      },
      distance: 1.2,
      offset: new THREE.Vector3(0, 0.35, 0)
    });

    this.narration = new FloatingText(scene, camera, {
      text: {
        fontSize: 24,
        background: 'rgba(2, 6, 23, 0.8)',
        borderColor: 'rgba(148, 163, 184, 0.5)',
        borderWidth: 1,
        paddingX: 22,
        paddingY: 16,
        scale: 0.0019,
        width: 720
      },
      distance: 1.2,
      offset: new THREE.Vector3(0, -0.32, 0)
    });
  }

  isRunning(): boolean {
    return this.running;
  }

  async runActive(): Promise<void> {
    const activeId = this.modules.getActiveId();
    if (!activeId) {
      this.tooltip.show('Select a module first.', { duration: 2.5 });
      return;
    }
    const script = await loadScenarioScript(activeId);
    this.start(script);
  }

  start(script: ScenarioScript): void {
    this.activeScriptId = script.id;
    this.events = script.events.slice();
    this.index = 0;
    this.hold = 0;
    this.running = true;
    this.tooltip.hide();
    this.narration.hide();
  }

  stop(): void {
    this.running = false;
    this.events = [];
    this.index = 0;
    this.hold = 0;
    this.activeScriptId = undefined;
    this.tooltip.hide();
    this.narration.hide();
  }

  update(dt: number): void {
    this.tooltip.update(dt);
    this.narration.update(dt);

    if (!this.running) {
      return;
    }
    if (this.hold > 0) {
      this.hold -= dt;
      if (this.hold > 0) {
        return;
      }
    }
    this.advance();
  }

  private advance(): void {
    while (this.running && this.hold <= 0 && this.index < this.events.length) {
      const event = this.events[this.index];
      this.index += 1;
      this.hold = this.applyEvent(event);
    }
    if (this.index >= this.events.length && this.hold <= 0) {
      this.stop();
    }
  }

  private applyEvent(event: ScenarioEvent): number {
    if (event.type === 'WAIT') {
      return event.seconds;
    }

    if (event.type === 'TOOLTIP') {
      const duration = event.seconds ?? 3;
      const anchor = this.resolveTooltipAnchor(event);
      this.tooltip.show(event.text, { duration, anchor });
      return duration;
    }

    if (event.type === 'NARRATION') {
      const duration = event.seconds ?? 4;
      this.narration.show(event.text, { duration });
      return duration;
    }

    if (
      event.type === 'HIGHLIGHT_CLUSTER' ||
      event.type === 'HIGHLIGHT_NODE' ||
      event.type === 'HIGHLIGHT_EDGE'
    ) {
      this.dispatchToModule(event);
      return event.seconds ?? 2.5;
    }

    if (event.type === 'TRANSITION_SCENE') {
      this.stop();
      void this.modules.load(event.target);
      return 0;
    }

    return 0;
  }

  private resolveTooltipAnchor(
    event: Extract<ScenarioEvent, { type: 'TOOLTIP' }>
  ): FloatingTextShowOptions['anchor'] {
    if (event.position === 'node' && event.nodeId) {
      const module = this.modules.getActiveModule() as ScenarioModule | undefined;
      const anchor = module?.getScenarioAnchor?.({ type: 'node', id: event.nodeId });
      if (anchor) {
        return { mode: 'world', position: anchor };
      }
    }
    return { mode: 'camera' };
  }

  private dispatchToModule(event: ScenarioEvent): void {
    const module = this.modules.getActiveModule() as ScenarioModule | undefined;
    module?.onScenarioEvent?.(event);
  }
}
