import './style.css';
import { AtlasEngine } from './core';
import { BeaconModule, StubModule } from './modules';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Missing #app container');
}

const hint = document.createElement('div');
hint.textContent = 'Modules: [1] Stub Cube  [2] Beacon';
hint.style.position = 'absolute';
hint.style.left = '16px';
hint.style.top = '16px';
hint.style.color = '#e2e8f0';
hint.style.fontSize = '14px';
hint.style.fontFamily = 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
hint.style.padding = '8px 12px';
hint.style.background = 'rgba(15, 23, 42, 0.7)';
hint.style.border = '1px solid rgba(148, 163, 184, 0.4)';
hint.style.borderRadius = '8px';
hint.style.pointerEvents = 'none';
app.appendChild(hint);

const fps = document.createElement('div');
fps.textContent = 'FPS: --';
fps.style.position = 'absolute';
fps.style.left = '16px';
fps.style.top = '56px';
fps.style.color = '#e2e8f0';
fps.style.fontSize = '12px';
fps.style.fontFamily = 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
fps.style.padding = '6px 10px';
fps.style.background = 'rgba(15, 23, 42, 0.7)';
fps.style.border = '1px solid rgba(148, 163, 184, 0.4)';
fps.style.borderRadius = '8px';
fps.style.pointerEvents = 'none';
app.appendChild(fps);

const engine = new AtlasEngine(app);
engine.modules.register(new StubModule());
engine.modules.register(new BeaconModule());
engine.modules.load('stub');
let frameCount = 0;
let elapsed = 0;

window.addEventListener('keydown', (event) => {
  if (event.key === '1') {
    engine.modules.load('stub');
  } else if (event.key === '2') {
    engine.modules.load('beacon');
  } else if (event.key.toLowerCase() === 'h') {
    const isHidden = hint.style.display === 'none';
    hint.style.display = isHidden ? 'block' : 'none';
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
});
