import { KEYBINDINGS } from '../core/constants.js';
import { clamp, normalize } from '../core/math.js';

const ACTION_BY_CODE = Object.entries(KEYBINDINGS).reduce((lookup, [action, codes]) => {
  codes.forEach((code) => { lookup[code] = action; });
  return lookup;
}, {});

export const GAMEPAD_ACTIONS = Object.freeze([
  'attack', 'dodge', 'skillOne', 'skillTwo', 'companion', 'hybrid', 'potion', 'ultimate', 'inventory', 'pause', 'interact', null
]);

export const GAMEPAD_LABELS = Object.freeze({
  attack: 'A', dodge: 'B', skillOne: 'X', skillTwo: 'Y', companion: 'LB', hybrid: 'RB', potion: 'LT', ultimate: 'RT',
  inventory: 'View', pause: 'Menu', interact: 'LS', skills: 'Hub', journey: 'Hub', chronicle: 'Hub', campaign: 'Hub', contracts: 'Hub', map: 'Hub'
});

const isEditable = (target) => {
  if (!target || typeof target !== 'object') return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
};

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.queue = [];
    this.uiQueue = [];
    this.held = new Set();
    this.gamepadMove = { x: 0, y: 0 };
    this.gamepadAim = { x: 0, y: 0, active: false };
    this.gamepadButtons = new Map();
    this.lastRumble = 0;
    this.lastInputMethod = 'keyboardMouse';
    this.inputMethodChangedAt = 0;
    this.pointer = { x: 0, y: 0, worldX: 0, worldY: 0, down: false, active: false, type: 'mouse', id: null, commandDirty: false };
    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', (event) => {
      this._markInputMethod('keyboardMouse');
      if (isEditable(event.target)) return;
      const action = ACTION_BY_CODE[event.code];
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
      if (action && !event.repeat) this.press(action);
    }, { passive: false });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
      const action = ACTION_BY_CODE[event.code];
      if (action) this.release(action);
    });
    window.addEventListener('blur', () => this.reset());

    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    this.canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.button !== 2) return;
      this._markInputMethod('keyboardMouse');
      this.canvas.focus({ preventScroll: true });
      this._setPointer(event);
      if (event.button === 2) {
        this.press('skillOne');
        return;
      }
      this.pointer.down = true;
      this.pointer.active = true;
      this.pointer.type = event.pointerType || 'mouse';
      this.pointer.id = Number.isFinite(event.pointerId) ? event.pointerId : null;
      this.pointer.commandDirty = true;
      if (this.pointer.id !== null && this.canvas.setPointerCapture) {
        try { this.canvas.setPointerCapture(this.pointer.id); } catch { /* Pointer capture is optional in embedded Windows webviews. */ }
      }
      this.press('contextAction');
    });
    this.canvas.addEventListener('pointermove', (event) => {
      this._markInputMethod('keyboardMouse');
      this._setPointer(event);
      if (this.pointer.down) this.pointer.commandDirty = true;
    });
    this.canvas.addEventListener('pointerup', (event) => this._releasePointer(event));
    this.canvas.addEventListener('pointercancel', (event) => this._releasePointer(event));
    this.canvas.addEventListener('lostpointercapture', (event) => this._releasePointer(event));
    window.addEventListener('pointerup', (event) => this._releasePointer(event));
    window.addEventListener('pointercancel', (event) => this._releasePointer(event));
  }

  _markInputMethod(method) {
    if (this.lastInputMethod === method) return;
    this.lastInputMethod = method;
    this.inputMethodChangedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  getInputMethod() {
    return this.lastInputMethod;
  }

  _setPointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = clamp(event.clientX - rect.left, 0, rect.width || 1);
    this.pointer.y = clamp(event.clientY - rect.top, 0, rect.height || 1);
    this.pointer.active = true;
  }

  _releasePointer(event) {
    if (!this.pointer.down) return;
    if (this.pointer.id !== null && Number.isFinite(event?.pointerId) && event.pointerId !== this.pointer.id) return;
    if (Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY)) this._setPointer(event);
    this.pointer.down = false;
    this.pointer.id = null;
    this.pointer.commandDirty = false;
  }

  updateWorldPointer(camera, viewport) {
    if (!this.pointer.active) return;
    this.pointer.worldX = camera.x + this.pointer.x / viewport.scale;
    this.pointer.worldY = camera.y + this.pointer.y / viewport.scale;
  }

  press(action, duration = 0.22) {
    const existing = this.queue.find((entry) => entry.action === action);
    if (existing) existing.time = Math.max(existing.time, duration);
    else this.queue.push({ action, time: duration });
  }

  pressUi(action, duration = 0.3) {
    const existing = this.uiQueue.find((entry) => entry.action === action);
    if (existing) existing.time = Math.max(existing.time, duration);
    else this.uiQueue.push({ action, time: duration });
  }

  consumeUi(action) {
    const index = this.uiQueue.findIndex((entry) => entry.action === action);
    if (index < 0) return false;
    this.uiQueue.splice(index, 1);
    return true;
  }

  consume(action) {
    const index = this.queue.findIndex((entry) => entry.action === action);
    if (index < 0) return false;
    this.queue.splice(index, 1);
    return true;
  }

  defer(action, duration = 0.18) {
    this.press(action, duration);
  }

  hold(action) {
    this.held.add(action);
  }

  release(action) {
    this.held.delete(action);
  }

  isHeld(action) {
    return this.held.has(action);
  }

  getMove() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    x += this.gamepadMove.x;
    y += this.gamepadMove.y;
    if (Math.abs(x) + Math.abs(y) < 0.001) return { x: 0, y: 0, moving: false };
    const direction = normalize(x, y);
    return { x: direction.x, y: direction.y, moving: true };
  }

  tick(delta) {
    this._pollGamepad();
    this.queue.forEach((entry) => { entry.time -= delta; });
    this.queue = this.queue.filter((entry) => entry.time > 0);
    this.uiQueue.forEach((entry) => { entry.time -= delta; });
    this.uiQueue = this.uiQueue.filter((entry) => entry.time > 0);
  }

  reset() {
    this.keys.clear();
    this.queue.length = 0;
    this.uiQueue.length = 0;
    this.held.clear();
    this.gamepadMove.x = 0;
    this.gamepadMove.y = 0;
    this.gamepadAim.active = false;
    this.pointer.down = false;
    this.pointer.id = null;
    this.pointer.commandDirty = false;
  }

  getAimDirection() {
    return this.gamepadAim.active ? { x: this.gamepadAim.x, y: this.gamepadAim.y } : null;
  }

  rumble(duration = 0.1, strong = 0.45, weak = 0.2) {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastRumble < 45) return;
    this.lastRumble = now;
    const pad = Array.from(navigator.getGamepads()).find((candidate) => candidate?.vibrationActuator?.playEffect);
    if (!pad) return;
    try {
      pad.vibrationActuator.playEffect('dual-rumble', {
        startDelay: 0, duration: Math.max(16, Math.round(duration * 1000)),
        strongMagnitude: clamp(strong, 0, 1), weakMagnitude: clamp(weak, 0, 1)
      });
    } catch { /* Controller rumble is optional and must never interrupt combat. */ }
  }

  _pollGamepad() {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;
    const pads = Array.from(navigator.getGamepads()).filter(Boolean);
    let activePad = null;
    for (const pad of pads) {
      const leftX = pad.axes[0] ?? 0;
      const leftY = pad.axes[1] ?? 0;
      const rightX = pad.axes[2] ?? 0;
      const rightY = pad.axes[3] ?? 0;
      const moving = Math.hypot(leftX, leftY) > 0.18;
      const aiming = Math.hypot(rightX, rightY) > 0.18;
      if (moving || aiming || pad.buttons.some((button) => button.pressed)) {
        activePad = pad;
        this.gamepadMove = moving ? normalize(leftX, leftY) : { x: 0, y: 0 };
        this.gamepadAim = aiming ? { ...normalize(rightX, rightY), active: true } : { x: 0, y: 0, active: false };
      }
      const previous = this.gamepadButtons.get(pad.index) ?? [];
      const actions = GAMEPAD_ACTIONS;
      const uiActions = { 0: 'confirm', 1: 'back', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
      pad.buttons.forEach((button, index) => {
        const action = actions[index];
        if (action && button.pressed && !previous[index]) this.press(action);
        const uiAction = uiActions[index];
        if (uiAction && button.pressed && !previous[index]) this.pressUi(uiAction);
      });
      this.gamepadButtons.set(pad.index, pad.buttons.map((button) => button.pressed));
    }
    if (activePad) this._markInputMethod('gamepad');
    if (!activePad) {
      this.gamepadMove = { x: 0, y: 0 };
      this.gamepadAim = { x: 0, y: 0, active: false };
    }
  }
}
