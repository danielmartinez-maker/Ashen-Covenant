import './styles.css';
import { InputManager } from './systems/input.js';
import { Renderer } from './systems/renderer.js';
import { GameEngine } from './systems/game.js';
import { AudioDirector } from './systems/audio.js';
import { loadSettings } from './systems/save.js';
import { GameUI } from './ui/ui.js';
import { GamePresentationSystem } from './presentation/system.js';

const canvas = document.querySelector('#game-canvas');
const root = document.querySelector('#ui-root');
const settings = loadSettings();
const input = new InputManager(canvas);
const renderer = new Renderer(canvas);
const game = new GameEngine(input, renderer, settings);
const audio = new AudioDirector(settings);
const presentation = new GamePresentationSystem(game, { input, settings, audio });
const ui = new GameUI(root, game, input, settings, audio);
document.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
document.addEventListener('keydown', () => audio.unlock(), { passive: true });

window.ashenCovenant = Object.freeze({ game, ui, renderer, input, audio, presentation });

let previous = performance.now();
const frame = (now) => {
  // Keep up with machines that dip to 10 FPS; GameEngine subdivides this into
  // safe 1/30-second simulation steps. Longer stalls remain capped so an
  // alt-tab cannot fast-forward combat by seconds at once.
  const delta = Math.min((now - previous) / 1000, 0.1);
  previous = now;
  game.update(delta);
  presentation.update(delta);
  renderer.render(game);
  ui.updateHud();
  window.requestAnimationFrame(frame);
};

window.requestAnimationFrame(frame);
