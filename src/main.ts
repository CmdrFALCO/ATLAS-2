import * as THREE from 'three';
import './style.css';
import { AtlasEngine } from './core';
import { BeaconModule, StubModule } from './modules';
import { ModuleMenu } from './ui/ModuleMenu';
import { ScenarioRunner } from './scenario';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Missing #app container');
}

const createOverlay = (text: string, top: number, fontSize: number) => {
  const overlay = document.createElement('div');
  overlay.textContent = text;
  overlay.style.position = 'absolute';
  overlay.style.left = '16px';
  overlay.style.top = `${top}px`;
  overlay.style.color = '#e2e8f0';
  overlay.style.fontSize = `${fontSize}px`;
  overlay.style.fontFamily = 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
  overlay.style.padding = '6px 10px';
  overlay.style.background = 'rgba(15, 23, 42, 0.7)';
  overlay.style.border = '1px solid rgba(148, 163, 184, 0.4)';
  overlay.style.borderRadius = '8px';
  overlay.style.pointerEvents = 'none';
  app.appendChild(overlay);
  return overlay;
};

const hint = createOverlay(
  'Modules: [1] Stub Cube  [2] Beacon  [3] Mnemosyne  [4] Themis  [5] Tecton  [R] Run Scenario  (H: hint, D: debug)',
  16,
  14
);
hint.style.padding = '8px 12px';

const fps = createOverlay('FPS: --', 56, 12);
const interactionDebug = createOverlay('Hover: none', 96, 12);

const engine = new AtlasEngine(app, { enableXR: true });
const scenarioRunner = new ScenarioRunner(engine.scene, engine.camera, engine.modules);
engine.modules.register(new StubModule());
engine.modules.register(new BeaconModule());
engine.modules.registerLoader('mnemosyne', async () => {
  const { MnemosyneModule } = await import('./modules/MnemosyneModule');
  return new MnemosyneModule();
});
engine.modules.registerLoader('themis', async () => {
  const { ThemisModule } = await import('./modules/ThemisModule');
  return new ThemisModule();
});
engine.modules.registerLoader('tecton', async () => {
  const { TectonModule } = await import('./modules/TectonModule');
  return new TectonModule();
});
const runScenario = () => {
  if (scenarioRunner.isRunning()) {
    scenarioRunner.stop();
    return;
  }
  void scenarioRunner.runActive();
};
const menu = new ModuleMenu(engine.scene, engine.camera, engine.interaction, [
  { id: 'stub', label: 'Stub Cube', onSelect: () => loadWithStatus('stub', 'Loading Stub...') },
  { id: 'beacon', label: 'Beacon', onSelect: () => loadWithStatus('beacon', 'Loading Beacon...') },
  {
    id: 'mnemosyne',
    label: 'Mnemosyne',
    onSelect: () => loadWithStatus('mnemosyne', 'Loading Mnemosyne...')
  },
  { id: 'themis', label: 'Themis', onSelect: () => loadWithStatus('themis', 'Loading Themis...') },
  { id: 'tecton', label: 'Tecton', onSelect: () => loadWithStatus('tecton', 'Loading Tecton...') },
  { id: 'scenario', label: 'Run Scenario', onSelect: () => runScenario() }
]);
menu.setPosition(new THREE.Vector3(-0.9, 1.4, -1.2));
let frameCount = 0;
let elapsed = 0;
let debugVisible = true;
const loadWithStatus = async (id: string, message: string) => {
  scenarioRunner.stop();
  const start = performance.now();
  menu.setStatus(message);
  await engine.modules.load(id);
  const elapsedMs = performance.now() - start;
  const minDurationMs = 400;
  if (elapsedMs < minDurationMs) {
    await new Promise((resolve) => setTimeout(resolve, minDurationMs - elapsedMs));
  }
  menu.setStatus('');
};
engine.modules.load('stub');
const setDebugVisible = (visible: boolean) => {
  const display = visible ? 'block' : 'none';
  fps.style.display = display;
  interactionDebug.style.display = display;
};

window.addEventListener('keydown', (event) => {
  if (event.key === '1') {
    loadWithStatus('stub', 'Loading Stub...');
  } else if (event.key === '2') {
    loadWithStatus('beacon', 'Loading Beacon...');
  } else if (event.key === '3') {
    loadWithStatus('mnemosyne', 'Loading Mnemosyne...');
  } else if (event.key === '4') {
    loadWithStatus('themis', 'Loading Themis...');
  } else if (event.key === '5') {
    loadWithStatus('tecton', 'Loading Tecton...');
  } else if (event.key.toLowerCase() === 'h') {
    const isHidden = hint.style.display === 'none';
    hint.style.display = isHidden ? 'block' : 'none';
  } else if (event.key.toLowerCase() === 'd') {
    debugVisible = !debugVisible;
    setDebugVisible(debugVisible);
  } else if (event.key.toLowerCase() === 'r') {
    runScenario();
  }
});

engine.start();

engine.addFrameListener((dt) => {
  frameCount += 1;
  elapsed += dt;
  if (elapsed >= 1) {
    const fpsValue = Math.round(frameCount / elapsed);
    fps.textContent = `FPS: ${fpsValue}`;
    frameCount = 0;
    elapsed = 0;
  }
  menu.update();
  scenarioRunner.update(dt);
  const hover = engine.interaction.getHoverHit();
  if (hover) {
    const name = hover.object.name || hover.object.type;
    interactionDebug.textContent = `Hover: ${name} (${hover.distance.toFixed(2)}m)`;
  } else {
    interactionDebug.textContent = 'Hover: none';
  }
});
