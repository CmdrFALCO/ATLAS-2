import * as THREE from 'three';
import './style.css';
import { AtlasEngine } from './core';
import { BeaconModule, MnemosyneModule, StubModule, ThemisModule, TectonModule } from './modules';
import { ModuleMenu } from './ui/ModuleMenu';

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
  'Modules: [1] Stub Cube  [2] Beacon  [3] Mnemosyne  [4] Themis  [5] Tecton  (H: hint, D: debug)',
  16,
  14
);
hint.style.padding = '8px 12px';

const fps = createOverlay('FPS: --', 56, 12);
const interactionDebug = createOverlay('Hover: none', 96, 12);

const engine = new AtlasEngine(app, { enableXR: true });
engine.modules.register(new StubModule());
engine.modules.register(new BeaconModule());
engine.modules.register(new MnemosyneModule());
engine.modules.register(new ThemisModule());
engine.modules.register(new TectonModule());
engine.modules.load('stub');
const menu = new ModuleMenu(engine.scene, engine.camera, engine.interaction, [
  { id: 'stub', label: 'Stub Cube', onSelect: () => engine.modules.load('stub') },
  { id: 'beacon', label: 'Beacon', onSelect: () => engine.modules.load('beacon') },
  { id: 'mnemosyne', label: 'Mnemosyne', onSelect: () => engine.modules.load('mnemosyne') },
  { id: 'themis', label: 'Themis', onSelect: () => engine.modules.load('themis') },
  { id: 'tecton', label: 'Tecton', onSelect: () => engine.modules.load('tecton') }
]);
menu.setPosition(new THREE.Vector3(-0.9, 1.4, -1.2));
let frameCount = 0;
let elapsed = 0;
let debugVisible = true;
const setDebugVisible = (visible: boolean) => {
  const display = visible ? 'block' : 'none';
  fps.style.display = display;
  interactionDebug.style.display = display;
};

window.addEventListener('keydown', (event) => {
  if (event.key === '1') {
    engine.modules.load('stub');
  } else if (event.key === '2') {
    engine.modules.load('beacon');
  } else if (event.key === '3') {
    engine.modules.load('mnemosyne');
  } else if (event.key === '4') {
    engine.modules.load('themis');
  } else if (event.key === '5') {
    engine.modules.load('tecton');
  } else if (event.key.toLowerCase() === 'h') {
    const isHidden = hint.style.display === 'none';
    hint.style.display = isHidden ? 'block' : 'none';
  } else if (event.key.toLowerCase() === 'd') {
    debugVisible = !debugVisible;
    setDebugVisible(debugVisible);
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
  const hover = engine.interaction.getHoverHit();
  if (hover) {
    const name = hover.object.name || hover.object.type;
    interactionDebug.textContent = `Hover: ${name} (${hover.distance.toFixed(2)}m)`;
  } else {
    interactionDebug.textContent = 'Hover: none';
  }
});
