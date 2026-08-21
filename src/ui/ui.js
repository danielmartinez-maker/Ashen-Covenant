import { LEVEL_XP, MAX_LEVEL, RARITY_COLORS } from '../core/constants.js';
import { CLASS_IDS, CLASSES, getClass, getHybrid } from '../data/classes.js';
import { ENDGAME_ACTIVITIES } from '../data/expansion.js';
import { AFFIXES, RUNES, runeById } from '../data/items.js';
import { ZONES } from '../data/world.js';
import { GAMEPAD_LABELS } from '../systems/input.js';
import { loadSave, saveSettings } from '../systems/save.js';
import { assetCssUrl } from '../core/assets.js';
import { FocusNavigator } from './focus.js';
import { uiIcon } from './icons.js';

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
const percent = (value) => `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
const AFFIX_BY_STAT = new Map(AFFIXES.map((affix) => [affix.stat, affix]));
const HUB_PANELS = Object.freeze([
  { id: 'map', label: 'Atlas', icon: 'map', key: 'M' },
  { id: 'campaign', label: 'Journal', icon: 'journal', key: 'L' },
  { id: 'skills', label: 'Skills', icon: 'skills', key: 'K' },
  { id: 'metamorphosis', label: 'Metamorphosis', icon: 'journey', key: 'V' },
  { id: 'journey', label: 'Journey', icon: 'journey', key: 'P' },
  { id: 'inventory', label: 'Relics', icon: 'inventory', key: 'I' },
  { id: 'chronicle', label: 'Chronicle', icon: 'chronicle', key: 'H' },
  { id: 'endgame', label: 'Contracts', icon: 'contracts', key: 'O' },
  { id: 'pause', label: 'Settings', icon: 'settings', key: 'Esc' }
]);
const KEYBOARD_ACTION_LABELS = Object.freeze({
  attack: 'LMB / J', skillOne: 'RMB / Q', skillTwo: 'E', dodge: 'Space', companion: 'C', hybrid: 'F', ultimate: 'R', potion: 'G', interact: 'X'
});
const STANDALONE_PANELS = new Set(['howto', 'replace-save', 'death', 'campaign-dialogue', 'campaign-choice', 'expedition-choice', 'confirm-action', 'settings']);
const DESTRUCTIVE_TONES = new Set(['warning', 'danger']);

export class GameUI {
  constructor(root, game, input, settings, audio = null) {
    this.root = root;
    this.game = game;
    this.input = input;
    this.settings = settings;
    this.audio = audio;
    this.selection = [];
    this.overlay = null;
    this.overlayResumeState = null;
    this.pendingNewRun = null;
    this.campaignDialogue = null;
    this.inventoryView = 'pack';
    this.inventoryMode = 'loadout';
    this.journeyView = 'road';
    this.journeyBandId = null;
    this.paragonBoardId = 'covenant-heart';
    this.operationsView = 'contracts';
    this.chronicleView = 'identity';
    this.chronicleItemId = null;
    this.contractRegionFilter = 'all';
    this.contractDifficultyFilter = 'all';
    this.inventoryQuery = '';
    this.inventoryRarityFilter = 'all';
    this.inventorySlotFilter = 'all';
    this.selectedItemId = null;
    this.selectedRuneId = null;
    this.pendingConfirmation = null;
    this.confirmationReturnPanel = null;
    this.inputMethod = this.input.getInputMethod?.() ?? this.input.lastInputMethod ?? 'keyboardMouse';
    this.overlayScroll = new Map();
    this.focusNavigator = new FocusNavigator(root);
    this.tooltipTarget = null;
    this.toastTimer = null;
    this.lastHud = 0;
    this.lastDebugRender = -Infinity;
    const initialAssetStatus = this.game.renderer?.getAssetStatus?.();
    this.assetGate = !initialAssetStatus ? 'ready' : initialAssetStatus.ready ? 'ready' : initialAssetStatus.failed?.length ? 'failed' : 'pending';
    this.mount();
    this.applyUiPreferences();
    this.bindGame();
    this.watchPresentationAssets();
  }

  hubNavigationMarkup() {
    return HUB_PANELS.map((panel) => `<button type="button" data-open-panel="${panel.id}" data-panel-key="${panel.key}" aria-label="Open ${panel.label}">${uiIcon(panel.icon)}<span>${panel.label}</span><b class="hub-badge" data-hub-badge="${panel.id}"></b><kbd>${this.inputMethod === 'gamepad' ? GAMEPAD_LABELS[panel.id] ?? 'Hub' : panel.key}</kbd></button>`).join('');
  }

  saveSummaryMarkup() {
    const snapshot = loadSave();
    const valid = snapshot?.player && typeof snapshot.primary === 'string' && typeof snapshot.secondary === 'string' && snapshot.primary !== snapshot.secondary;
    const hybrid = valid ? getHybrid(snapshot.primary, snapshot.secondary) : null;
    if (!hybrid) return `<span class="continue-mark">${uiIcon('journey')}</span><span class="continue-copy"><small>Continue covenant</small><strong>No journey saved</strong><em>Your first covenant will appear here.</em></span><span class="continue-arrow">${uiIcon('chevron')}</span>`;
    const level = Math.max(1, Math.min(MAX_LEVEL, Number(snapshot.player.level) || 1));
    const x = Number.isFinite(Number(snapshot.player.x)) ? Number(snapshot.player.x) : 0;
    const y = Number.isFinite(Number(snapshot.player.y)) ? Number(snapshot.player.y) : 0;
    const zone = zoneText(x, y);
    const savedAt = Number(snapshot.savedAt);
    const elapsed = Number.isFinite(savedAt) ? Math.max(0, Date.now() - savedAt) : null;
    const savedLabel = elapsed === null ? 'Save ready' : elapsed < 60_000 ? 'Saved moments ago' : elapsed < 3_600_000 ? `Saved ${Math.max(1, Math.round(elapsed / 60_000))}m ago` : elapsed < 86_400_000 ? `Saved ${Math.max(1, Math.round(elapsed / 3_600_000))}h ago` : `Saved ${Math.max(1, Math.round(elapsed / 86_400_000))}d ago`;
    const primary = CLASSES[snapshot.primary];
    const secondary = CLASSES[snapshot.secondary];
    return `<span class="continue-mark" style="--save-color:${hybrid.color}">${hybrid.icon}</span><span class="continue-copy"><small>Continue covenant</small><strong>${escapeHtml(hybrid.name)} · Level ${level}</strong><em>${escapeHtml(zone)} · ${escapeHtml(savedLabel)}</em><span>${escapeHtml(primary?.name ?? snapshot.primary)} + ${escapeHtml(secondary?.name ?? snapshot.secondary)}</span></span><span class="continue-arrow">${uiIcon('chevron')}</span>`;
  }

  refreshSaveSummary() {
    if (!this.elements?.continue) return;
    this.elements.continue.innerHTML = this.saveSummaryMarkup();
    this.elements.continue.disabled = this.assetGate !== 'ready' || !this.game.hasSave();
  }

  applyUiPreferences() {
    const scale = Math.max(.8, Math.min(1.3, Number(this.settings.uiScale) || 1));
    const opacity = Math.max(.6, Math.min(1, Number(this.settings.hudOpacity) || .92));
    if (document?.documentElement) document.documentElement.style.fontSize = `${Math.round(16 * scale * 100) / 100}px`;
    this.root.style.setProperty('--hud-opacity', opacity);
    this.root.style.setProperty('--title-art', assetCssUrl('/assets/campaign/chapter-one-keyart.png'));
    this.root.style.setProperty('--ability-atlas', assetCssUrl('/assets/ability-atlas-i.png'));
    this.root.style.setProperty('--item-atlas', assetCssUrl('/assets/item-atlas-v2.png'));
    this.root.style.setProperty('--rune-atlas', assetCssUrl('/assets/rune-atlas-v2.png'));
    this.root.dataset.hudMode = ['full', 'focused', 'minimal'].includes(this.settings.hudMode) ? this.settings.hudMode : 'full';
    this.root.dataset.inputMethod = this.inputMethod;
    this.root.classList.toggle('ui-high-contrast', this.settings.highContrast === true);
    this.root.classList.toggle('ui-reduced-motion', this.settings.reducedMotion === true);
    this.root.classList.toggle('ui-hide-minimap', this.settings.showMinimap === false);
    this.root.classList.toggle('ui-hide-control-hints', this.settings.showControlHints === false);
  }

  controlLabel(action) {
    return this.inputMethod === 'gamepad' ? GAMEPAD_LABELS[action] ?? '—' : KEYBOARD_ACTION_LABELS[action] ?? action;
  }

  watchPresentationAssets() {
    const renderer = this.game.renderer;
    if (!renderer?.whenReady || !renderer?.getAssetStatus) return;
    const refresh = (status = renderer.getAssetStatus()) => {
      this.assetGate = status.ready ? 'ready' : status.failed?.length ? 'failed' : 'pending';
      this.renderClassSelection();
      this.elements.continue.disabled = this.assetGate !== 'ready' || !this.game.hasSave();
      if (this.assetGate === 'failed') this.toast(`Required creature art could not load: ${status.failed.join(', ')}.`, 'warning');
    };
    refresh();
    renderer.whenReady().then(refresh);
  }

  syncInputMethod(force = false) {
    const next = this.input.getInputMethod?.() ?? this.input.lastInputMethod ?? 'keyboardMouse';
    if (!force && next === this.inputMethod) return;
    this.inputMethod = next === 'gamepad' ? 'gamepad' : 'keyboardMouse';
    this.root.dataset.inputMethod = this.inputMethod;
    this.root.querySelectorAll('[data-panel-key]').forEach((button) => {
      const panel = button.dataset.openPanel;
      const fallback = button.dataset.panelKey;
      const key = button.querySelector('kbd');
      if (key) key.textContent = this.inputMethod === 'gamepad' ? GAMEPAD_LABELS[panel] ?? 'Hub' : fallback;
    });
    const systemBindings = { campaign: 'L', skills: 'K', journey: 'P', inventory: 'I', chronicle: 'H', endgame: 'O', pause: 'Esc' };
    Object.entries(systemBindings).forEach(([name, keyboard]) => {
      const button = this.root.querySelector(`#${name}-button`);
      const key = button?.querySelector('kbd');
      if (key) key.textContent = this.inputMethod === 'gamepad' ? GAMEPAD_LABELS[name === 'endgame' ? 'contracts' : name] ?? 'Hub' : keyboard;
    });
    if (this.game.player) this.renderAbilities();
    const legend = this.root.querySelector('#control-legend');
    if (legend) legend.innerHTML = this.inputMethod === 'gamepad'
      ? `<kbd>${GAMEPAD_LABELS.interact}</kbd> Interact <span>·</span> <kbd>${GAMEPAD_LABELS.pause}</kbd> Covenant Hub`
      : '<kbd>X</kbd> Interact <span>·</span> <kbd>Esc</kbd> Covenant Hub';
  }

  mount() {
    this.root.innerHTML = `
      <section id="title-screen" class="screen title-screen" aria-labelledby="game-title">
        <div class="title-backdrop" aria-hidden="true"></div>
        <header class="title-masthead" aria-label="Ashen Covenant">
          <span class="title-sigil">AC</span>
          <span>Ashen Covenant</span>
          <small>The Black Road · v6.0.0</small>
        </header>
        <div class="title-content">
          <section class="title-hero" aria-labelledby="game-title">
            <p class="eyebrow">A rebuilt dual-oath dungeon action RPG</p>
            <h1 id="game-title">Ashen <span>Covenant</span></h1>
            <p class="title-lede">Prepare in Sanctuary. Choose a doomed road. Break four sealed rooms and the creature waiting at the end.</p>
            <div class="title-pillars" aria-label="Game features"><span>5 branching expeditions</span><span>20 sealed encounters</span><span>8-frame combat animation</span></div>
            <button id="continue-run" class="continue-card" type="button">
              ${this.saveSummaryMarkup()}
            </button>
            <div class="title-secondary-actions">
              <button id="how-to-play" class="button ghost" type="button">How to play</button>
              <button id="title-settings" class="button ghost" type="button">Settings</button>
            </div>
          </section>
          <section class="selection-shell" aria-labelledby="select-heading">
            <div class="selection-heading">
              <div>
                <p class="eyebrow">Create a new covenant</p>
                <h2 id="select-heading">Choose your two oaths</h2>
              </div>
              <output id="class-count" class="class-count">0 / 2 selected</output>
            </div>
            <ol id="selection-steps" class="selection-steps" aria-label="Covenant creation steps">
              <li data-selection-step="primary"><span>1</span><div><b>Primary oath</b><small>Your weapon and core kit</small></div></li>
              <li data-selection-step="secondary"><span>2</span><div><b>Companion oath</b><small>Technique and build direction</small></div></li>
              <li data-selection-step="hybrid"><span>3</span><div><b>Hybrid covenant</b><small>Signature, ultimate, and board</small></div></li>
            </ol>
            <p class="selection-instruction">Selection order matters. Pick the class you want to control first, then the oath that will reshape it.</p>
            <div id="class-grid" class="class-grid" role="group" aria-label="Choose your two classes"></div>
            <aside id="hybrid-preview" class="hybrid-preview empty" aria-live="polite"></aside>
            <div class="menu-actions">
              <button id="new-run" class="button primary" type="button" disabled>Begin covenant</button>
              <button id="clear-classes" class="button ghost" type="button" disabled>Clear choices</button>
            </div>
            <p class="menu-note">Nothing is preselected. Keyboard, mouse, and gamepad are supported from the first screen.</p>
          </section>
        </div>
      </section>

      <section id="hud" class="hud is-hidden" aria-label="Combat HUD">
        <div class="hud-vitals" aria-label="Covenant status">
          <div class="hero-readout">
            <div class="class-crests" id="class-crests"></div>
            <div class="hero-text"><strong id="hero-name">Covenant</strong><span id="hero-level">Level 1</span><i class="level-xp-track"><b id="level-xp-fill"></b></i></div>
          </div>
          <div class="bars">
            <div id="health-bar" class="bar health" role="progressbar" aria-label="Health" aria-valuemin="0"><span id="health-fill"></span><b id="health-label">0 / 0</b></div>
            <div id="resource-bar" class="bar resource" role="progressbar" aria-label="Class resource" aria-valuemin="0"><span id="resource-fill"></span><b id="resource-label">Resolve</b></div>
          </div>
        </div>

        <nav class="hud-utilities" aria-label="Covenant systems">
          <button id="campaign-button" class="hud-command text-button" type="button" aria-label="Open Journal">${uiIcon('journal')}<span>Journal</span><kbd>L</kbd></button>
          <button id="skills-button" class="hud-command text-button" type="button" aria-label="Open Skills">${uiIcon('skills')}<span>Skills</span><b id="skill-points">0</b><kbd>K</kbd></button>
          <button id="journey-button" class="hud-command text-button journey-button" type="button" aria-label="Open Journey">${uiIcon('journey')}<span>Journey</span><b id="journey-points">0</b><kbd>P</kbd></button>
          <button id="inventory-button" class="hud-command text-button" type="button" aria-label="Open Relics and inventory">${uiIcon('inventory')}<span>Relics</span><kbd>I</kbd></button>
          <button id="chronicle-button" class="hud-command text-button chronicle-button" type="button" aria-label="Open Chronicle">${uiIcon('chronicle')}<span>Chronicle</span><b id="chronicle-choices">0</b><kbd>H</kbd></button>
          <button id="endgame-button" class="hud-command text-button" type="button" aria-label="Open Contracts">${uiIcon('contracts')}<span>Contracts</span><kbd>O</kbd></button>
          <button id="pause-button" class="hud-command icon-button" type="button" aria-label="Pause game and open settings">${uiIcon('pause')}<kbd>Esc</kbd></button>
        </nav>

        <div class="minimap-shell">
          <button id="map-button" class="icon-button map-button" type="button" aria-label="Open world atlas">${uiIcon('map')}</button>
          <div id="minimap" class="minimap" aria-label="World map preview"><div class="minimap-tiles" aria-hidden="true">${ZONES.map((zone) => `<span class="minimap-tile" style="--terrain:${assetCssUrl(zone.terrain)}"></span>`).join('')}</div><i class="mini-route"></i><i class="mini-player"></i><i class="mini-event"></i></div>
          <span id="minimap-zone">The Ash Road</span>
        </div>

        <div class="objective-stack">
          <aside id="roadcraft-card" class="roadcraft-card is-hidden" aria-label="Roadcraft tutorial">
            <header><small id="roadcraft-kicker">Roadcraft</small><b id="roadcraft-step">1 / 8</b></header>
            <strong id="roadcraft-title">Take the road</strong><span id="roadcraft-detail">Move with WASD or left-click.</span>
            <i><b id="roadcraft-fill"></b></i>
          </aside>
          <aside id="objective-card" class="objective-card">
            <p class="eyebrow">Current path</p><strong id="objective-title">The road waits</strong><span id="objective-detail">Choose your oath.</span><div class="objective-progress"><span id="objective-progress-fill"></span></div>
          </aside>
          <button id="contract-tracker" class="contract-tracker is-hidden" type="button" aria-label="Open tracked contract">
            <span class="contract-tracker-mark">✦</span><span class="contract-tracker-copy"><small id="contract-tracker-kicker">Tracked contract</small><strong id="contract-tracker-title">No active writ</strong><em id="contract-tracker-detail"></em><i><b id="contract-tracker-fill"></b></i></span><span id="contract-tracker-count" class="contract-tracker-count">0/0</span>
          </button>
        </div>

        <section id="boss-hud" class="boss-hud is-hidden" aria-label="Boss health"><span id="boss-name">The Bell-Broken</span><div class="boss-bar"><i id="boss-health"></i></div><em id="boss-phase">Phase 1</em></section>
        <section id="target-hud" class="target-hud is-hidden" aria-label="Selected enemy"><span><small id="target-rank">Hostile</small><strong id="target-name">Enemy</strong></span><div class="target-bar"><i id="target-health"></i></div><em id="target-state">Ready</em></section>
        <section id="encounter-hud" class="encounter-hud is-hidden" aria-label="Authored encounter">
          <span><small id="encounter-kicker">Road encounter</small><strong id="encounter-name">The road waits</strong><em id="encounter-hint"></em></span>
          <div><i id="encounter-fill"></i></div><b id="encounter-count">0 / 0</b><button id="expedition-return" class="is-hidden" type="button">Return to Sanctuary</button>
        </section>
        <div class="combat-readout" aria-label="Combat state"><section id="class-mechanic-readout" class="class-mechanic-readout"><header><b id="class-mechanic-name">Class mechanic</b><small id="class-mechanic-value">0%</small></header><i><em id="class-mechanic-fill"></em></i><span id="class-mechanic-state">Build through combat</span></section><span id="barrier-label">No barrier</span><span id="resonance-label">Resonance 0% · Charge 0/3</span><span id="affix-readout">Fated effects: none</span><span id="endgame-readout"></span></div>
        <nav id="ability-bar" class="ability-bar" aria-label="Abilities"></nav>
        <p id="control-legend" class="interact-hint"><kbd>X</kbd> Interact <span>·</span> <kbd>Esc</kbd> Covenant Hub</p>
      </section>

      <section id="overlay" class="overlay is-hidden" role="dialog" aria-modal="true" aria-labelledby="overlay-title" aria-describedby="overlay-context">
        <div class="overlay-backdrop" data-close-overlay></div>
        <article class="overlay-card">
          <header class="overlay-header">
            <div class="overlay-heading"><p id="overlay-kicker" class="eyebrow">Covenant</p><h2 id="overlay-title">Menu</h2><span id="overlay-context" class="sr-only">Covenant menu</span></div>
            <div id="overlay-summary" class="overlay-summary" aria-label="Character summary"></div>
            <button id="close-overlay" class="icon-button" type="button" aria-label="Close panel">${uiIcon('close')}<kbd>Esc</kbd></button>
          </header>
          <nav id="overlay-navigation" class="overlay-navigation" aria-label="Covenant Hub">
            <div class="hub-brand"><span>AC</span><div><b>Covenant Hub</b><small>All roads, one place</small></div></div>
            ${this.hubNavigationMarkup()}
          </nav>
          <div id="overlay-content" class="overlay-content" tabindex="0"></div>
          <footer class="overlay-footer"><span><kbd>↑↓←→</kbd> Navigate</span><span><kbd>Enter / A</kbd> Select</span><span><kbd>Esc / B</kbd> Back</span></footer>
        </article>
      </section>
      <div id="ui-tooltip" class="ui-tooltip is-hidden" role="tooltip"><strong></strong><span></span></div>
      <div id="toast-region" class="toast-region" role="status" aria-live="polite" aria-atomic="false"></div>
    `;
    this.elements = {
      title: this.root.querySelector('#title-screen'), hud: this.root.querySelector('#hud'), grid: this.root.querySelector('#class-grid'), count: this.root.querySelector('#class-count'),
      preview: this.root.querySelector('#hybrid-preview'), start: this.root.querySelector('#new-run'), continue: this.root.querySelector('#continue-run'), overlay: this.root.querySelector('#overlay'),
      overlayTitle: this.root.querySelector('#overlay-title'), overlayKicker: this.root.querySelector('#overlay-kicker'), overlayContent: this.root.querySelector('#overlay-content'),
      overlayNavigation: this.root.querySelector('#overlay-navigation'), overlaySummary: this.root.querySelector('#overlay-summary'),
      abilityBar: this.root.querySelector('#ability-bar'), toast: this.root.querySelector('#toast-region'), tooltip: this.root.querySelector('#ui-tooltip')
    };
    this.renderClassSelection();
    this.elements.continue.disabled = this.assetGate !== 'ready' || !this.game.hasSave();
    this.bindDom();
  }

  bindDom() {
    this.elements.grid.addEventListener('click', (event) => {
      const button = event.target.closest('[data-class-id]');
      if (button) this.toggleClass(button.dataset.classId);
    });
    this.elements.start.addEventListener('click', () => this.beginNewRun());
    this.elements.continue.addEventListener('click', () => this.continueRun());
    this.root.querySelector('#clear-classes').addEventListener('click', () => { this.selection = []; this.renderClassSelection(); });
    this.root.querySelector('#how-to-play').addEventListener('click', () => this.showOverlay('howto'));
    this.root.querySelector('#title-settings').addEventListener('click', () => this.showOverlay('settings'));
    this.root.querySelector('#map-button').addEventListener('click', () => this.showOverlay('map'));
    this.root.querySelector('#skills-button').addEventListener('click', () => this.showOverlay('skills'));
    this.root.querySelector('#journey-button').addEventListener('click', () => this.showOverlay('journey'));
    this.root.querySelector('#chronicle-button').addEventListener('click', () => this.showOverlay('chronicle'));
    this.root.querySelector('#campaign-button').addEventListener('click', () => this.showOverlay('campaign'));
    this.root.querySelector('#inventory-button').addEventListener('click', () => this.showOverlay('inventory'));
    this.root.querySelector('#endgame-button').addEventListener('click', () => this.showOverlay('endgame'));
    this.root.querySelector('#contract-tracker').addEventListener('click', () => { this.operationsView = 'contracts'; this.showOverlay('endgame'); });
    this.root.querySelector('#expedition-return').addEventListener('click', () => { this.game.returnToSanctuary?.(); this.updateHud(true); });
    this.root.querySelector('#pause-button').addEventListener('click', () => this.showOverlay('pause'));
    this.root.querySelector('#close-overlay').addEventListener('click', () => this.hideOverlay());
    this.root.querySelector('[data-close-overlay]').addEventListener('click', () => this.hideOverlay());
    this.elements.overlayNavigation.addEventListener('click', (event) => {
      const button = event.target.closest('[data-open-panel]');
      if (button) this.showOverlay(button.dataset.openPanel);
    });
    this.elements.overlayContent.addEventListener('click', (event) => this.handleOverlayClick(event));
    this.elements.overlayContent.addEventListener('change', (event) => this.handleOverlayChange(event));
    this.elements.overlayContent.addEventListener('input', (event) => this.handleOverlayInput(event));
    this.elements.overlayContent.addEventListener('scroll', () => this.hideTooltip(), { passive: true });
    this.elements.abilityBar.addEventListener('pointerdown', (event) => {
      const button = event.target.closest('[data-game-action]');
      if (!button) return;
      event.preventDefault();
      this.input.press(button.dataset.gameAction);
    });
    this.root.addEventListener('pointerover', (event) => this.maybeShowTooltip(event.target));
    this.root.addEventListener('pointerout', (event) => {
      if (!event.relatedTarget || !event.target.closest?.('[data-tooltip-title]')?.contains(event.relatedTarget)) this.hideTooltip();
    });
    this.root.addEventListener('focusin', (event) => this.maybeShowTooltip(event.target));
    this.root.addEventListener('focusout', (event) => {
      if (!event.relatedTarget || !event.target.closest?.('[data-tooltip-title]')?.contains(event.relatedTarget)) this.hideTooltip();
    });
    window.addEventListener('keydown', (event) => {
      if (this.focusNavigator.trapTab(event)) return;
      const shortcutPanels = { KeyM: ['map', 'map'], KeyL: ['campaign', 'campaign'], KeyK: ['skills', 'skills'], KeyP: ['journey', 'journey'], KeyI: ['inventory', 'inventory'], KeyH: ['chronicle', 'chronicle'], KeyO: ['endgame', 'contracts'] };
      const shortcut = shortcutPanels[event.code];
      const editable = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName);
      if (shortcut && this.overlay && !STANDALONE_PANELS.has(this.overlay) && !event.repeat && !editable) {
        event.preventDefault();
        this.input.consume?.(shortcut[1]);
        this.showOverlay(shortcut[0]);
        return;
      }
      if (event.code === 'F3' && !event.repeat && this.overlay === 'presentation-debug') {
        event.preventDefault();
        this.input.consume?.('debug');
        this.game.presentation?.toggleDebug(false);
        this.hideOverlay();
        return;
      }
      if (event.code !== 'Escape' || event.repeat || !this.overlay || this.overlay === 'death') return;
      event.preventDefault();
      // InputManager receives this key first. Remove its queued pause action so
      // resuming does not immediately reopen the panel on the next game tick.
      this.input.consume?.('pause');
      if (this.overlay === 'confirm-action') this.cancelConfirmation();
      else this.hideOverlay();
    }, { passive: false });
  }

  bindGame() {
    this.game.on('run-started', () => {
      this.elements.title.classList.add('is-hidden');
      this.elements.hud.classList.remove('is-hidden');
      this.focusNavigator.scope = null;
      this.focusNavigator.returnTarget = null;
      this.syncInputMethod(true);
      this.renderAbilities();
      this.updateHud(true);
    });
    this.game.on('toast', ({ message, tone }) => this.toast(message, tone));
    this.game.on('zone', () => this.updateHud(true));
    this.game.on('level-up', () => { this.renderAbilities(); this.updateHud(true); });
    this.game.on('leveling-updated', () => {
      if (this.overlay === 'journey') this.renderOverlayContent('journey');
      this.updateHud(true);
    });
    this.game.on('contracts-updated', () => {
      if (this.overlay === 'endgame') this.renderOverlayContent('endgame');
      this.updateHud(true);
    });
    this.game.on('reforged-updated', () => {
      if (this.overlay === 'chronicle') this.renderOverlayContent('chronicle');
      if (this.overlay === 'expedition-choice') this.renderOverlayContent('expedition-choice');
      if (this.overlay === 'journey') this.renderOverlayContent('journey');
      this.updateHud(true);
    });
    this.game.on('overlay', ({ panel }) => this.showOverlay(panel));
    this.game.on('player-dead', () => this.showOverlay('death'));
    this.game.on('respawned', () => {
      if (this.overlay === 'death') this.hideOverlay(true);
      this.updateHud(true);
    });
    this.game.on('boss-phase', () => this.updateHud(true));
    this.game.on('boss-defeated', () => this.updateHud(true));
    this.game.on('loot', () => this.updateHud(true));
    this.game.on('campaign-updated', () => {
      if (this.overlay === 'campaign') this.renderOverlayContent('campaign');
      this.updateHud(true);
    });
    this.game.on('requiem-updated', () => this.updateHud(true));
    this.game.on('campaign-dialogue', ({ id, dialogue, journal }) => {
      this.campaignDialogue = { id, dialogue, journal };
      this.showOverlay('campaign-dialogue');
    });
  }

  processControllerUi() {
    if (!this.input.consumeUi) return;
    this.syncInputMethod();
    const scope = !this.elements.title.classList.contains('is-hidden') ? this.elements.title : !this.elements.overlay.classList.contains('is-hidden') ? this.elements.overlay : null;
    if (!scope) return;
    const modalScope = scope === this.elements.overlay;
    if (!this.focusNavigator.scope) this.focusNavigator.scope = scope;
    const focusables = this.focusNavigator.focusables(scope);
    if (!focusables.length) return;
    if (this.input.consumeUi('up')) this.focusNavigator.move('up');
    if (this.input.consumeUi('down')) this.focusNavigator.move('down');
    if (this.input.consumeUi('left')) this.focusNavigator.move('left');
    if (this.input.consumeUi('right')) this.focusNavigator.move('right');
    if (this.input.consumeUi('confirm')) {
      const current = focusables.indexOf(document.activeElement);
      const target = current >= 0 ? focusables[current] : focusables[0];
      target.focus?.({ preventScroll: true });
      target.click?.();
    }
    if (this.input.consumeUi('back') && !this.elements.overlay.classList.contains('is-hidden')) {
      if (this.overlay === 'confirm-action') this.cancelConfirmation();
      else this.hideOverlay();
    }
    if (!modalScope && this.elements.overlay.classList.contains('is-hidden')) this.focusNavigator.scope = null;
  }

  toggleClass(id) {
    if (!CLASS_IDS.includes(id)) return;
    const found = this.selection.indexOf(id);
    if (found >= 0) this.selection.splice(found, 1);
    else if (this.selection.length < 2) this.selection.push(id);
    else this.selection[1] = id;
    if (this.game.presentation) {
      this.game.presentation.musicOverride = this.selection.length ? 'CharacterCreation' : null;
      this.game.presentation.characterClassOverride = this.selection[0] ?? null;
    }
    this.renderClassSelection();
  }

  renderClassSelection() {
    this.elements.grid.innerHTML = CLASS_IDS.map((id) => {
      const entry = CLASSES[id];
      const order = this.selection.indexOf(id);
      const selected = order >= 0;
      const role = order === 0 ? 'Primary' : order === 1 ? 'Companion' : '';
      return `<button class="class-card ${selected ? 'is-selected' : ''}" data-class-id="${id}" type="button" aria-pressed="${selected}" aria-label="${escapeHtml(entry.name)}${role ? ` selected as ${role}` : ''}" style="--class-color:${entry.color}">
        ${selected ? `<span class="class-order">${role}</span>` : ''}<span class="class-icon">${entry.icon}</span><span class="class-name">${entry.name}</span><span class="class-resource">${entry.resource}</span><span class="class-identity">${entry.identity}</span>
      </button>`;
    }).join('');
    const [first, second] = this.selection;
    this.elements.count.textContent = `${this.selection.length} / 2 selected`;
    this.elements.start.disabled = this.selection.length !== 2 || this.assetGate !== 'ready';
    this.root.querySelector('#clear-classes').disabled = this.selection.length === 0;
    this.root.querySelectorAll('[data-selection-step]').forEach((step) => {
      const id = step.dataset.selectionStep;
      const complete = id === 'primary' ? this.selection.length >= 1 : id === 'secondary' ? this.selection.length >= 2 : this.selection.length >= 2;
      const active = id === 'primary' ? this.selection.length === 0 : id === 'secondary' ? this.selection.length === 1 : this.selection.length === 2;
      step.classList.toggle('is-complete', complete);
      step.classList.toggle('is-active', active);
    });
    if (first && second) {
      const hybrid = getHybrid(first, second);
      const companion = CLASSES[second].abilities.skillOne;
      this.elements.preview.className = 'hybrid-preview';
      this.elements.preview.innerHTML = `<p class="eyebrow">Hybrid archetype</p><div class="hybrid-title" style="--hybrid-color:${hybrid.color}"><span>${hybrid.icon}</span><div><h3>${hybrid.name}</h3><p>${hybrid.passive}: ${hybrid.passiveText}</p></div></div><div class="hybrid-skills"><span><b>C · ${companion.icon} Echo: ${companion.name}</b>Your second oath enters combat as an active companion technique.</span><span><b>${hybrid.signature.icon} ${hybrid.signature.name}</b>${hybrid.signature.hint}</span><span><b>${hybrid.ultimate.icon} ${hybrid.ultimate.name}</b>${hybrid.ultimate.hint}</span></div>`;
      this.elements.start.textContent = this.assetGate === 'pending' ? 'Loading creature art…' : this.assetGate === 'failed' ? 'Creature art unavailable' : `Begin as ${hybrid.name}`;
    } else {
      this.elements.preview.className = 'hybrid-preview empty';
      this.elements.preview.innerHTML = `<p class="eyebrow">Hybrid archetype</p><h3>Two oaths create a build</h3><p>Select ${this.selection.length === 0 ? 'a first and second' : 'a companion'} class to reveal its passive mechanic, signature ability, ultimate, unique items, and progression board.</p>`;
      this.elements.start.textContent = this.assetGate === 'pending' ? 'Loading creature art…' : this.assetGate === 'failed' ? 'Creature art unavailable' : 'Begin covenant';
    }
  }

  beginNewRun() {
    if (this.selection.length !== 2) return;
    if (this.game.hasSave()) {
      this.pendingNewRun = this.selection.slice(0, 2);
      this.showOverlay('replace-save');
      return;
    }
    this.startSelectedRun(this.selection);
  }

  startSelectedRun(selection) {
    if (!Array.isArray(selection) || selection.length !== 2) this.toast('Choose two different classes to begin.', 'warning');
    else if (!this.game.start(selection[0], selection[1])) return;
    else if (this.game.presentation) { this.game.presentation.musicOverride = null; this.game.presentation.characterClassOverride = null; }
  }

  continueRun() {
    if (!this.game.continueRun()) {
      if (!this.game.hasSave()) this.toast('No covenant save is available yet.', 'warning');
      return;
    }
    if (this.game.presentation) { this.game.presentation.musicOverride = null; this.game.presentation.characterClassOverride = null; }
    this.elements.title.classList.add('is-hidden');
    this.elements.hud.classList.remove('is-hidden');
    this.renderAbilities();
    this.updateHud(true);
  }

  renderAbilities() {
    const primary = this.game.getPrimaryClass();
    const hybrid = this.game.getHybrid();
    const secondary = this.game.getSecondaryClass?.();
    const companion = this.game.getCompanionTechnique?.() ?? (secondary ? { name: `Echo: ${secondary.abilities?.skillOne?.name ?? secondary.name}`, icon: secondary.abilities?.skillOne?.icon ?? secondary.icon, hint: 'Companion technique.', cooldown: 5 } : null);
    if (!primary || !hybrid || !companion) return;
    const entries = [
      ['attack', primary.abilities.attack], ['skillOne', primary.abilities.skillOne], ['skillTwo', primary.abilities.skillTwo], ['dodge', primary.abilities.dodge],
      ['companion', companion], ['hybrid', hybrid.signature], ['ultimate', hybrid.ultimate], ['potion', { name: 'Ashen Flask', icon: '✚', hint: 'Restore health.', cooldown: 1 }]
    ];
    this.elements.abilityBar.innerHTML = entries.map(([action, ability], index) => {
      const key = this.controlLabel(action);
      return `<button type="button" class="ability ability-${action}" data-game-action="${action}" data-tooltip-title="${escapeHtml(ability.name)}" data-tooltip-body="${escapeHtml(ability.hint ?? '')}" aria-label="${escapeHtml(ability.name)} · ${escapeHtml(key)}"><span class="ability-icon asset-icon icon-${index % 6}">${ability.icon}</span><span class="ability-name">${escapeHtml(ability.name)}</span><kbd>${escapeHtml(key)}</kbd><output data-cooldown-label="${action}" aria-hidden="true"></output><em data-ability-state="${action}">${action === 'potion' ? `×${this.game.player?.potions ?? 0}` : ''}</em><i data-cooldown="${action}"></i></button>`;
    }).join('');
  }

  updateHud(force = false) {
    this.processControllerUi();
    if (!this.game.player || (this.game.clock - this.lastHud < 0.06 && !force)) return;
    this.lastHud = this.game.clock;
    if (this.overlay === 'presentation-debug' && this.game.clock - this.lastDebugRender >= 0.2) {
      this.lastDebugRender = this.game.clock;
      const scroll = this.elements.overlayContent.scrollTop;
      this.renderOverlayContent('presentation-debug');
      this.elements.overlayContent.scrollTop = scroll;
    }
    const player = this.game.player;
    const primary = this.game.getPrimaryClass();
    const secondary = this.game.getSecondaryClass();
    const hybrid = this.game.getHybrid();
    const companion = this.game.getCompanionTechnique?.();
    const stats = this.game.getStats();
    const leveling = this.game.getLevelingOverview?.();
    const requiem = this.game.getRequiemOverview?.();
    this.root.querySelector('#hero-name').textContent = hybrid.name;
    const district = this.game.getDistrict?.();
    this.root.querySelector('#hero-level').textContent = `Level ${player.level} · ${district?.name ?? zoneText(player.x, player.y)}`;
    this.root.querySelector('#minimap-zone').textContent = district?.name ?? zoneText(player.x, player.y);
    if (leveling) this.root.querySelector('#level-xp-fill').style.width = percent(leveling.xp / Math.max(1, leveling.nextXp));
    const healthRatio = player.hp / Math.max(1, player.maxHp);
    const resourceRatio = player.resource / Math.max(1, player.maxResource);
    this.root.querySelector('#health-fill').style.width = percent(healthRatio);
    this.root.querySelector('#health-label').textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
    const healthBar = this.root.querySelector('#health-bar');
    healthBar.setAttribute('aria-valuenow', String(Math.max(0, Math.ceil(player.hp))));
    healthBar.setAttribute('aria-valuemax', String(player.maxHp));
    this.root.querySelector('#resource-fill').style.width = percent(resourceRatio);
    this.root.querySelector('#resource-label').textContent = `${primary.resource} ${Math.ceil(player.resource)} / ${player.maxResource}`;
    const resourceBar = this.root.querySelector('#resource-bar');
    resourceBar.setAttribute('aria-valuenow', String(Math.max(0, Math.ceil(player.resource))));
    resourceBar.setAttribute('aria-valuemax', String(player.maxResource));
    this.elements.hud.classList.toggle('is-low-health', healthRatio <= .28);
    this.elements.hud.classList.toggle('is-confluence-ready', (player.confluence ?? 0) >= 3);
    this.root.querySelector('#barrier-label').textContent = player.barrier > 0 ? `Barrier ${Math.ceil(player.barrier)} · ${Math.ceil(player.barrierTime)}s` : 'No barrier';
    this.root.querySelector('#resonance-label').textContent = `Resonance ${Math.floor(player.resonance ?? 0)}% · Charge ${player.confluence ?? 0}/3`;
    const fated = this.game.getActiveFatedAffixes?.() ?? [];
    this.root.querySelector('#affix-readout').textContent = fated.length ? `Fated ${fated.length}: ${fated.slice(0, 2).map((affix) => affix.label).join(' · ')}` : 'Fated effects: none';
    this.root.querySelector('#endgame-readout').textContent = this.game.endgame && !this.game.endgame.completed
      ? `${this.game.endgame.blackRoad ? `${this.game.endgame.name} · Room ${this.game.endgame.waveIndex}/${this.game.endgame.wavePlan.length}` : this.game.endgame.activity === 'arena' ? 'Arena' : 'Endgame'} · ${Math.round(this.game.endgame.elapsed)}s`
      : '';
    const mechanicCard = this.root.querySelector('#class-mechanic-readout');
    if (requiem?.mechanic && mechanicCard) {
      mechanicCard.style.setProperty('--mechanic', requiem.mechanic.color);
      mechanicCard.classList.toggle('is-ready', requiem.mechanic.ready);
      this.root.querySelector('#class-mechanic-name').textContent = requiem.mechanic.name;
      this.root.querySelector('#class-mechanic-value').textContent = requiem.mechanic.ready ? 'READY' : `${Math.round(requiem.mechanic.value)}%`;
      this.root.querySelector('#class-mechanic-fill').style.width = percent(requiem.mechanic.value / 100);
      this.root.querySelector('#class-mechanic-state').textContent = requiem.mechanic.ready ? requiem.mechanic.verb : requiem.mechanic.description;
      mechanicCard.setAttribute('aria-label', `${requiem.mechanic.name}, ${Math.round(requiem.mechanic.value)} percent${requiem.mechanic.ready ? ', ready' : ''}`);
    }
    this.root.querySelector('#skill-points').textContent = player.skillPoints;
    const skillHubBadge = this.root.querySelector('[data-hub-badge="skills"]');
    if (skillHubBadge) skillHubBadge.textContent = player.skillPoints > 0 ? String(player.skillPoints) : '';
    if (leveling) {
      const ascensionChoices = leveling.ascensions.filter((tier) => tier.unlocked && !tier.selected).length;
      const journeyClaims = leveling.bands.filter((band) => band.cacheReady || band.masteryReady).length;
      const paragonChoices = leveling.paragon?.unlocked ? leveling.paragon.points + leveling.paragon.boardSigils : 0;
      const available = leveling.pillarPoints + paragonChoices + ascensionChoices + journeyClaims;
      const journeyButton = this.root.querySelector('#journey-button');
      this.root.querySelector('#journey-points').textContent = available;
      const journeyHubBadge = this.root.querySelector('[data-hub-badge="journey"]');
      if (journeyHubBadge) journeyHubBadge.textContent = available > 0 ? String(available) : '';
      journeyButton.classList.toggle('has-rewards', available > 0);
      journeyButton.title = `${leveling.bands.find((band) => band.active)?.name ?? 'Covenant Journey'} · ${available} choice${available === 1 ? '' : 's'} ready`;
    }
    if (force) {
      const chronicle = this.game.getReforgedOverview?.();
      if (chronicle) {
        const choices = chronicle.hybrid.tiers.filter((tier) => tier.unlocked && !tier.selected).length
          + chronicle.mastery.reduce((sum, entry) => sum + entry.points, 0)
          + chronicle.relics.reduce((sum, item) => sum + Math.max(0, item.bondRank - item.memories.length), 0)
          + chronicle.factions.filter((faction) => faction.rank >= 2 && !faction.doctrineId).length
          + chronicle.world.arcs.filter((arc) => arc.pendingChoice).length
          + chronicle.bestiary.filter((family) => family.rank >= 2 && !family.insightId).length
          + chronicle.decrees.filter((entry) => entry.completed && !entry.selected).length
          + (chronicle.eclipse.points > 0 ? 1 : 0);
        const button = this.root.querySelector('#chronicle-button');
        this.root.querySelector('#chronicle-choices').textContent = choices;
        const chronicleHubBadge = this.root.querySelector('[data-hub-badge="chronicle"]');
        if (chronicleHubBadge) chronicleHubBadge.textContent = choices > 0 ? String(choices) : '';
        button.classList.toggle('has-rewards', choices > 0);
        button.title = `${chronicle.oath.name} World Torment · ${choices} systemic choice${choices === 1 ? '' : 's'} ready`;
      }
    }
    this.root.querySelector('#class-crests').innerHTML = `<span style="--crest:${primary.color}" title="${primary.name}">${primary.icon}</span><span style="--crest:${secondary.color}" title="${secondary.name}">${secondary.icon}</span>`;
    const objective = this.game.objective;
    this.root.querySelector('#objective-title').textContent = objective.title;
    this.root.querySelector('#objective-detail').textContent = objective.detail;
    this.root.querySelector('#objective-progress-fill').style.width = percent(objective.total ? objective.progress / objective.total : 0);
    this.root.querySelector('#objective-card').setAttribute('aria-label', `${objective.title}. ${objective.detail}`);
    const roadcraft = this.root.querySelector('#roadcraft-card');
    roadcraft.classList.toggle('is-hidden', !requiem?.tutorial);
    if (requiem?.tutorial) {
      this.root.querySelector('#roadcraft-kicker').textContent = `Roadcraft · ${requiem.difficulty.name}`;
      this.root.querySelector('#roadcraft-step').textContent = `${requiem.tutorialStep + 1} / ${requiem.tutorialTotal}`;
      this.root.querySelector('#roadcraft-title').textContent = requiem.tutorial.title;
      this.root.querySelector('#roadcraft-detail').textContent = requiem.tutorial.detail;
      this.root.querySelector('#roadcraft-fill').style.width = percent(requiem.tutorial.progress / Math.max(1, requiem.tutorial.target));
      roadcraft.setAttribute('aria-label', `${requiem.tutorial.title}. ${requiem.tutorial.detail}. ${requiem.tutorial.progress} of ${requiem.tutorial.target}`);
    }
    const trackedContract = this.game.getTrackedContract?.();
    const contractTracker = this.root.querySelector('#contract-tracker');
    contractTracker.classList.toggle('is-hidden', !trackedContract);
    if (trackedContract) {
      this.root.querySelector('#contract-tracker-kicker').textContent = `${trackedContract.difficulty} · Step ${trackedContract.stepNumber}/${trackedContract.totalSteps}`;
      this.root.querySelector('#contract-tracker-title').textContent = trackedContract.name;
      this.root.querySelector('#contract-tracker-detail').textContent = trackedContract.ready ? 'Return to the Covenant Board for payment.' : trackedContract.currentStep?.name ?? trackedContract.description;
      this.root.querySelector('#contract-tracker-fill').style.width = percent(trackedContract.target ? trackedContract.progress / trackedContract.target : 0);
      this.root.querySelector('#contract-tracker-count').textContent = trackedContract.ready ? 'READY' : `${trackedContract.progress}/${trackedContract.target}`;
      contractTracker.style.setProperty('--contract', trackedContract.difficultyColor ?? '#d9b766');
    }
    if (force) {
      const readyContracts = this.game.getContractBoard?.()?.active?.filter((entry) => entry.ready).length ?? 0;
      const contractHubBadge = this.root.querySelector('[data-hub-badge="endgame"]');
      if (contractHubBadge) contractHubBadge.textContent = readyContracts > 0 ? String(readyContracts) : '';
    }
    const boss = this.game.getBoss();
    const bossHud = this.root.querySelector('#boss-hud');
    const bossVisible = Boolean(boss && Math.hypot(boss.x - player.x, boss.y - player.y) <= 720);
    const combatFocused = this.settings.combatHudFocus !== false && (bossVisible || player.combatTime > 0.15 || Boolean(requiem?.encounter));
    this.elements.hud.classList.toggle('is-combat-focus', combatFocused);
    bossHud.classList.toggle('is-hidden', !bossVisible);
    if (boss) {
      this.root.querySelector('#boss-name').textContent = boss.name;
      this.root.querySelector('#boss-health').style.width = percent(boss.hp / boss.maxHp);
      this.root.querySelector('#boss-phase').textContent = `Phase ${boss.phase}`;
      bossHud.setAttribute('aria-label', `${boss.name}, phase ${boss.phase}, ${Math.round(Math.max(0, boss.hp / Math.max(1, boss.maxHp)) * 100)} percent health`);
    }
    const target = this.game.getCombatTarget?.();
    const targetHud = this.root.querySelector('#target-hud');
    const targetVisible = Boolean(target && !target.boss && !bossVisible && Math.hypot(target.x - player.x, target.y - player.y) <= 920);
    targetHud.classList.toggle('is-hidden', !targetVisible);
    if (targetVisible) {
      const affix = target.affixes?.[0]?.name ?? target.affixes?.[0]?.label;
      this.root.querySelector('#target-rank').textContent = target.elite ? `Elite ${affix ?? target.role}` : target.role;
      this.root.querySelector('#target-name').textContent = target.name;
      this.root.querySelector('#target-health').style.width = percent(target.hp / Math.max(1, target.maxHp));
      const stagger = Math.round(Math.max(0, target.stagger / Math.max(1, target.staggerMax)) * 100);
      this.root.querySelector('#target-state').textContent = target.state === 'windup' ? 'Attacking' : stagger > 0 ? `Stagger ${stagger}%` : target.engaged ? 'Engaged' : 'Unaware';
      targetHud.setAttribute('aria-label', `${target.name}, ${Math.round(Math.max(0, target.hp / Math.max(1, target.maxHp)) * 100)} percent health`);
    }
    const encounterHud = this.root.querySelector('#encounter-hud');
    const encounterVisible = Boolean(requiem?.encounter && !bossVisible);
    encounterHud.classList.toggle('is-hidden', !encounterVisible);
    const expeditionReturn = this.root.querySelector('#expedition-return');
    expeditionReturn.classList.toggle('is-hidden', !requiem?.blackRoad?.completed);
    if (encounterVisible) {
      const encounter = requiem.encounter;
      const defeated = Math.max(0, encounter.total - encounter.remaining);
      this.root.querySelector('#encounter-kicker').textContent = encounter.completed ? `${requiem.blackRoad.name} complete`
        : encounter.stage ? `Room ${encounter.stage}/${encounter.totalStages} · ${encounter.stageType === 'ritual' ? 'Objective chamber' : encounter.stageType === 'lieutenant' ? 'Lieutenant' : encounter.stageType === 'boss' ? 'Boss chamber' : 'Formation'}`
          : encounter.state === 'approaching' ? `Tier ${encounter.tier} road encounter` : encounter.state === 'danger' ? 'Enemy attack committed' : encounter.state === 'cleared' ? 'Encounter cleared' : `Tier ${encounter.tier} formation`;
      this.root.querySelector('#encounter-name').textContent = encounter.name;
      this.root.querySelector('#encounter-hint').textContent = encounter.completed ? 'Final cache secured. Return to Sanctuary when ready.' : encounter.state === 'cleared' ? 'Room secured. The next seal is opening.' : `${encounter.objective ? `${encounter.objective} · ` : ''}${encounter.hint}`;
      this.root.querySelector('#encounter-fill').style.width = percent(encounter.total ? defeated / encounter.total : 0);
      this.root.querySelector('#encounter-count').textContent = encounter.completed ? 'EXPEDITION CLEARED' : encounter.state === 'cleared' ? 'ROOM CLEARED' : encounter.vessels ? `${encounter.vessels} ward${encounter.vessels === 1 ? '' : 's'} · ${encounter.remaining} remain` : `${encounter.remaining} remain`;
      encounterHud.classList.toggle('is-danger', encounter.state === 'danger');
      encounterHud.classList.toggle('is-cleared', encounter.state === 'cleared');
      encounterHud.setAttribute('aria-label', `${encounter.name}. ${encounter.remaining} enemies remain. ${encounter.hint}`);
    }
    this.elements.abilityBar.querySelectorAll('[data-cooldown]').forEach((cover) => {
      const action = cover.dataset.cooldown;
      const cooldown = player.cooldowns[action] ?? 0;
      const max = action === 'attack' ? primary.abilities.attack.cooldown : action === 'skillOne' ? primary.abilities.skillOne.cooldown : action === 'skillTwo' ? primary.abilities.skillTwo.cooldown : action === 'dodge' ? primary.abilities.dodge.cooldown : action === 'companion' ? companion?.cooldown ?? 5 : action === 'hybrid' ? hybrid.signature.cooldown : action === 'ultimate' ? hybrid.ultimate.cooldown : 1;
      cover.style.transform = `scaleY(${Math.min(1, cooldown / max)})`;
      const button = cover.closest('.ability');
      const label = button?.querySelector('[data-cooldown-label]');
      const state = button?.querySelector('[data-ability-state]');
      const cooling = cooldown > .05;
      button?.classList.toggle('is-on-cooldown', cooling);
      button?.classList.toggle('is-ready', !cooling);
      if (label) {
        label.textContent = cooling ? cooldown.toFixed(cooldown < 1 ? 1 : 0) : '';
        label.setAttribute('aria-hidden', cooling ? 'false' : 'true');
      }
      if (state && action === 'potion') {
        state.textContent = `×${player.potions ?? 0}`;
        button?.classList.toggle('is-empty', (player.potions ?? 0) <= 0);
      }
      if (button) button.setAttribute('aria-label', `${button.querySelector('.ability-name')?.textContent ?? action}. ${cooling ? `${cooldown.toFixed(1)} seconds remaining` : 'Ready'}. ${button.querySelector('kbd')?.textContent ?? ''}`);
    });
    this.updateMinimap();
    void stats;
  }

  updateMinimap() {
    const minimap = this.root.querySelector('#minimap');
    const playerDot = minimap.querySelector('.mini-player');
    const eventDot = minimap.querySelector('.mini-event');
    const routeDot = minimap.querySelector('.mini-route');
    const player = this.game.player;
    playerDot.style.left = `${player.x / 3840 * 100}%`;
    playerDot.style.top = `${player.y / 2520 * 100}%`;
    const route = this.game.getRequiemOverview?.()?.route;
    if (route) {
      routeDot.style.display = 'block';
      routeDot.style.left = `${route.x / 3840 * 100}%`;
      routeDot.style.top = `${route.y / 2520 * 100}%`;
      routeDot.title = `Next road encounter: ${route.name}`;
    } else routeDot.style.display = 'none';
    if (this.game.worldEvent) {
      eventDot.style.display = 'block';
      eventDot.style.left = `${this.game.worldEvent.x / 3840 * 100}%`;
      eventDot.style.top = `${this.game.worldEvent.y / 2520 * 100}%`;
    } else eventDot.style.display = 'none';
  }

  showOverlay(panel) {
    if (!this.game.player && !['howto', 'replace-save', 'settings', 'confirm-action'].includes(panel)) return;
    const previousPanel = this.overlay;
    if (previousPanel) this.overlayScroll.set(previousPanel, this.elements.overlayContent.scrollTop);
    this.overlay = panel;
    if (this.game.player && panel !== 'death' && this.game.state === 'playing') {
      this.overlayResumeState = 'playing';
      this.game.state = 'paused';
    }
    this.hideTooltip();
    this.elements.overlay.classList.remove('is-hidden');
    this.elements.overlay.classList.toggle('is-standalone', STANDALONE_PANELS.has(panel));
    this.elements.overlay.dataset.panel = panel;
    this.elements.title.setAttribute('aria-hidden', 'true');
    this.elements.hud.setAttribute('aria-hidden', 'true');
    this.renderOverlayContent(panel, previousPanel !== panel);
    const focusSelector = panel === 'confirm-action' ? '[autofocus]' : STANDALONE_PANELS.has(panel) ? '#close-overlay' : `[data-open-panel="${panel}"]`;
    this.focusNavigator.activate(this.elements.overlay, focusSelector);
  }

  hideOverlay(force = false) {
    if (this.overlay === 'confirm-action' && !force) {
      this.cancelConfirmation();
      return;
    }
    if ((this.overlay === 'death' || this.overlay === 'expedition-choice') && !force) return;
    const closingPanel = this.overlay;
    if (closingPanel) this.overlayScroll.set(closingPanel, this.elements.overlayContent.scrollTop);
    if (this.overlayResumeState && this.game.state !== 'menu') this.game.state = this.overlayResumeState;
    this.overlayResumeState = null;
    this.overlay = null;
    if (closingPanel === 'replace-save') this.pendingNewRun = null;
    if (closingPanel === 'presentation-debug') this.game.presentation?.toggleDebug(false);
    this.elements.overlay.classList.add('is-hidden');
    this.elements.overlay.removeAttribute('data-panel');
    this.elements.title.removeAttribute('aria-hidden');
    this.elements.hud.removeAttribute('aria-hidden');
    this.focusNavigator.deactivate();
    this.hideTooltip();
  }

  renderOverlayContent(panel, resetScroll = false) {
    const scroll = resetScroll ? this.overlayScroll.get(panel) ?? 0 : this.elements.overlayContent.scrollTop;
    const info = this.overlayInfo(panel);
    this.elements.overlayTitle.textContent = info.title;
    this.elements.overlayKicker.textContent = info.kicker;
    this.elements.overlayContent.innerHTML = info.content;
    this.elements.overlayContent.dataset.panel = panel;
    this.elements.overlayContent.scrollTop = scroll;
    this.updateOverlayChrome(panel);
  }

  updateOverlayChrome(panel) {
    const activePanel = panel === 'settings' || panel === 'presentation-debug' ? 'pause' : ['imprints', 'mastery'].includes(panel) ? 'skills' : panel;
    this.elements.overlayNavigation.querySelectorAll('[data-open-panel]').forEach((button) => {
      const active = button.dataset.openPanel === activePanel;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    const player = this.game.player;
    this.elements.overlaySummary.innerHTML = player
      ? `<span><small>Level</small><b>${player.level}</b></span><span><small>Gold</small><b>${Number(player.gold ?? 0).toLocaleString()}</b></span><span><small>Flasks</small><b>${player.potions ?? 0}/${player.maxPotions ?? player.potions ?? 0}</b></span>`
      : '<span><small>Local profile</small><b>Windows</b></span>';
    const close = this.root.querySelector('#close-overlay');
    const locked = panel === 'death' || panel === 'expedition-choice';
    close.classList.toggle('is-hidden', locked);
    close.disabled = locked;
    this.root.querySelector('#overlay-context').textContent = `${this.elements.overlayTitle.textContent}. ${STANDALONE_PANELS.has(panel) ? 'Focused dialog' : 'Covenant Hub panel'}.`;
  }

  overlayInfo(panel) {
    if (panel === 'howto') return { kicker: 'Read the Black Road', title: 'How to play', content: `<div class="howto-grid"><section><span class="howto-icon">${uiIcon('chronicle')}</span><h3>Two oaths</h3><p>Choose two base classes. The first supplies your core kit; the second gives you an active <b>Companion Technique</b>. Together they create a named hybrid with signature abilities, an ultimate, a progression board, and unique items.</p></section><section><span class="howto-icon">${uiIcon('skills')}</span><h3>Committed combat</h3><p><b>Left-click ground</b> to move. <b>Left-click a creature</b> to select, approach, and strike once; every click commits one attack. <b>Right-click/Q</b> uses your first skill. <b>WASD</b> remains available for direct movement.</p></section><section><span class="howto-icon">${uiIcon('settings')}</span><h3>Abilities</h3><p><b>Q/E</b> core skills · <b>C</b> companion · <b>Space</b> dodge · <b>F/R</b> hybrid ability/ultimate · <b>G</b> flask · <b>X</b> interact or execute. Controller uses left stick to move and right stick to aim.</p></section><section><span class="howto-icon">${uiIcon('warning')}</span><h3>Sealed rooms</h3><p>Open the <b>Atlas</b> in Sanctuary and launch a Black Road expedition. Only one encounter exists at a time. Break formations, destroy ritual vessels, execute a lieutenant, then defeat a three-phase boss.</p></section><section><span class="howto-icon">${uiIcon('journey')}</span><h3>Choose the route</h3><p>Every expedition has four rooms and a midpoint junction. A boon changes the rest of the run, raises Reward Heat, and can add a lasting danger before the boss.</p></section><section><span class="howto-icon">${uiIcon('inventory')}</span><h3>Relics</h3><p>Inspect before acting. Fated affixes change live combat rules, while Forge, Codex, runes, loadouts, and item comparison show exactly what an upgrade changes.</p></section></div>` };
    if (panel === 'skills') return this.skillsOverlay();
    if (panel === 'metamorphosis') return this.metamorphosisOverlay();
    if (panel === 'journey') return this.journeyOverlay();
    if (panel === 'chronicle') return this.chronicleOverlay();
    if (panel === 'expedition-choice') return this.expeditionChoiceOverlay();
    if (panel === 'mastery') return this.masteryOverlay();
    if (panel === 'imprints') return this.imprintsOverlay();
    if (panel === 'inventory') return this.inventoryOverlay();
    if (panel === 'campaign') return this.campaignOverlay();
    if (panel === 'campaign-dialogue') return this.campaignDialogueOverlay();
    if (panel === 'campaign-choice') return this.campaignChoiceOverlay();
    if (panel === 'map') return this.mapOverlay();
    if (panel === 'endgame') return this.endgameOverlay();
    if (panel === 'pause') return this.pauseOverlay();
    if (panel === 'settings') return this.pauseOverlay(true);
    if (panel === 'presentation-debug') return this.presentationDebugOverlay();
    if (panel === 'confirm-action') return this.confirmationOverlay();
    if (panel === 'replace-save') return { kicker: 'Existing covenant found', title: 'Begin a new covenant?', content: `<p class="overlay-intro">Starting with these two classes replaces the current local covenant save. Continue only when you are ready to leave the existing run behind.</p><div class="pause-actions"><button class="button primary" type="button" data-overlay-action="confirm-new-run">Replace and begin</button><button class="button secondary" type="button" data-overlay-action="cancel-new-run">Keep current covenant</button></div>` };
    if (panel === 'death') return { kicker: 'The bell tolls', title: 'Fallen on the road', content: `<p class="death-copy">You will wake at Ashen Sanctuary in a moment. Your covenant, equipment, levels, and progress are safe; only a small amount of gold is lost.</p><div class="death-orbit">✦</div>` };
    return { kicker: 'Covenant', title: 'Menu', content: '' };
  }

  pauseOverlay(titleOnly = false) {
    const slider = (id, label, value, min = 0, max = 1, step = 0.05) => `<label class="range-row"><span>${label}<output>${Math.round(Number(value) * 100)}%</output></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
    const sessionActions = titleOnly
      ? `<p class="settings-copy">These preferences apply to every covenant on this Windows profile.</p><button class="button primary" type="button" data-overlay-action="resume">Close settings</button>`
      : '<button class="button primary" type="button" data-overlay-action="resume">Resume journey</button><button class="button secondary" type="button" data-overlay-action="sanctuary">Return to Ashen Sanctuary</button>';
    const controls = [
      ['Move', 'WASD', 'Left stick'], ['Aim', 'Mouse', 'Right stick'], ['Attack / dodge', 'Mouse or J / Space', 'A / B'],
      ['Core skills', 'Q / E', 'X / Y'], ['Companion / hybrid', 'C / F', 'LB / RB'], ['Flask / ultimate', 'G / R', 'LT / RT'],
      ['Interact', 'X', 'Left-stick press'], ['Covenant Hub', 'Esc', 'Menu']
    ].map(([action, keyboard, gamepad]) => `<div><b>${action}</b><span>${keyboard}</span><span>${gamepad}</span></div>`).join('');
    const requiem = this.game.getRequiemOverview?.();
    const difficultyControl = requiem ? `<label class="select-row">Road difficulty<select id="requiem-difficulty"><option value="adventurer" ${requiem.difficulty.id === 'adventurer' ? 'selected' : ''}>Adventurer · forgiving</option><option value="veteran" ${requiem.difficulty.id === 'veteran' ? 'selected' : ''}>Veteran · intended</option><option value="penitent" ${requiem.difficulty.id === 'penitent' ? 'selected' : ''}>Penitent · demanding</option></select></label>` : '';
    return {
      kicker: titleOnly ? 'Profile settings · saved automatically' : 'Covenant paused · saved automatically',
      title: titleOnly ? 'Settings and accessibility' : 'The road waits',
      content: `<div class="settings-layout">
        <section class="settings-panel settings-actions"><header>${uiIcon('journey')}<div><p>Session</p><h3>${titleOnly ? 'Profile' : 'Journey'}</h3></div></header>${sessionActions}${difficultyControl}<label class="select-row">Graphics quality<select id="graphics-quality"><option value="low" ${this.settings.graphicsQuality === 'low' ? 'selected' : ''}>Low</option><option value="high" ${!this.settings.graphicsQuality || this.settings.graphicsQuality === 'high' ? 'selected' : ''}>High</option><option value="ultra" ${this.settings.graphicsQuality === 'ultra' ? 'selected' : ''}>Ultra</option></select></label><label class="select-row">Auto-pickup<select id="loot-filter"><option value="all" ${this.settings.lootFilter === 'all' ? 'selected' : ''}>All loot</option><option value="magic" ${this.settings.lootFilter === 'magic' ? 'selected' : ''}>Magic and better</option><option value="rare" ${this.settings.lootFilter === 'rare' ? 'selected' : ''}>Rare and better</option><option value="relic" ${this.settings.lootFilter === 'relic' ? 'selected' : ''}>Relic and better</option><option value="unique" ${this.settings.lootFilter === 'unique' ? 'selected' : ''}>Unique and Mythic</option></select></label><label class="toggle-row"><input id="aim-assist-toggle" type="checkbox" ${this.settings.aimAssist !== false ? 'checked' : ''}> Controller aim assist</label></section>
        <section class="settings-panel"><header>${uiIcon('settings')}<div><p>Interface</p><h3>HUD and text</h3></div></header>${slider('ui-scale', 'UI scale', this.settings.uiScale ?? 1, .8, 1.3, .05)}${slider('hud-opacity', 'HUD opacity', this.settings.hudOpacity ?? .92, .6, 1, .05)}<label class="select-row">HUD detail<select id="hud-mode"><option value="full" ${!this.settings.hudMode || this.settings.hudMode === 'full' ? 'selected' : ''}>Full</option><option value="focused" ${this.settings.hudMode === 'focused' ? 'selected' : ''}>Focused</option><option value="minimal" ${this.settings.hudMode === 'minimal' ? 'selected' : ''}>Minimal</option></select></label><label class="toggle-row"><input id="high-contrast-toggle" type="checkbox" ${this.settings.highContrast ? 'checked' : ''}> High-contrast interface</label><label class="toggle-row"><input id="minimap-toggle" type="checkbox" ${this.settings.showMinimap !== false ? 'checked' : ''}> Show minimap</label><label class="toggle-row"><input id="combat-hud-focus-toggle" type="checkbox" ${this.settings.combatHudFocus !== false ? 'checked' : ''}> Auto-focus HUD during combat</label><label class="toggle-row"><input id="control-hints-toggle" type="checkbox" ${this.settings.showControlHints !== false ? 'checked' : ''}> Show control hints</label></section>
        <section class="settings-panel"><header>${uiIcon('settings')}<div><p>Sound</p><h3>Audio mix</h3></div></header><label class="toggle-row"><input id="sound-toggle" type="checkbox" ${this.settings.sound !== false ? 'checked' : ''}> Audio enabled</label>${slider('master-volume', 'Master', this.settings.masterVolume ?? .82)}${slider('music-volume', 'Music', this.settings.musicVolume ?? .62)}${slider('sfx-volume', 'Effects', this.settings.sfxVolume ?? .82)}${slider('dialogue-volume', 'Dialogue', this.settings.dialogueVolume ?? .9)}${slider('ambience-volume', 'Ambience', this.settings.ambienceVolume ?? .7)}<label class="toggle-row"><input id="background-audio-toggle" type="checkbox" ${this.settings.backgroundAudio ? 'checked' : ''}> Continue audio in background</label><label class="toggle-row"><input id="mute-unfocused-toggle" type="checkbox" ${this.settings.muteWhenUnfocused !== false ? 'checked' : ''}> Mute when unfocused</label></section>
        <section class="settings-panel"><header>${uiIcon('spark')}<div><p>Soundtrack</p><h3>Adaptive score</h3></div></header>${slider('music-intensity', 'Dynamic intensity', this.settings.dynamicMusicIntensity ?? 1, 0, 1.25, .05)}<label class="select-row">Combat frequency<select id="combat-music-frequency"><option value="reduced" ${this.settings.combatMusicFrequency === 'reduced' ? 'selected' : ''}>Reduced</option><option value="standard" ${!this.settings.combatMusicFrequency || this.settings.combatMusicFrequency === 'standard' ? 'selected' : ''}>Standard</option><option value="frequent" ${this.settings.combatMusicFrequency === 'frequent' ? 'selected' : ''}>Frequent</option></select></label><label class="toggle-row"><input id="stinger-toggle" type="checkbox" ${this.settings.reducedStingers ? 'checked' : ''}> Reduce reward stingers</label><label class="toggle-row"><input id="streamer-safe-toggle" type="checkbox" ${this.settings.streamerSafeMusic !== false ? 'checked' : ''}> Streamer-safe music only</label><small>Current score layers are original procedural material. This setting remains enforced for future imported cues.</small></section>
        <section class="settings-panel"><header>${uiIcon('warning')}<div><p>Accessibility</p><h3>Motion and readability</h3></div></header>${slider('camera-shake', 'Camera shake', this.settings.cameraShakeScale ?? 1)}${slider('hit-stop', 'Impact pause', this.settings.hitStopScale ?? 1)}<label class="toggle-row"><input id="motion-toggle" type="checkbox" ${this.settings.reducedMotion ? 'checked' : ''}> Reduced interface and camera motion</label><label class="toggle-row"><input id="flashing-toggle" type="checkbox" ${this.settings.reducedFlashing ? 'checked' : ''}> Reduced flashing</label><label class="toggle-row"><input id="vfx-toggle" type="checkbox" ${this.settings.reducedVfx ? 'checked' : ''}> Simplified combat effects</label><label class="toggle-row"><input id="presentation-debug-toggle" type="checkbox" ${this.settings.presentationDebug ? 'checked' : ''}> Enable F3 presentation debug</label></section>
        <section class="settings-panel controls-panel"><header>${uiIcon('skills')}<div><p>Reference</p><h3>Controls</h3></div></header><div class="control-table"><div class="control-table-head"><b>Action</b><span>Keyboard</span><span>Gamepad</span></div>${controls}</div><small>Prompts switch automatically when the game detects keyboard/mouse or gamepad input.</small></section>
      </div>${titleOnly ? '' : '<div class="pause-footer"><button class="button ghost" type="button" data-overlay-action="title">Save and leave to title</button></div>'}`
    };
  }

  requestConfirmation({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'warning', action }) {
    if (typeof action !== 'function') return false;
    this.confirmationReturnPanel = this.overlay;
    this.pendingConfirmation = { title, message, confirmLabel, cancelLabel, tone: DESTRUCTIVE_TONES.has(tone) ? tone : 'warning', action };
    this.showOverlay('confirm-action');
    return true;
  }

  confirmationOverlay() {
    const confirmation = this.pendingConfirmation;
    if (!confirmation) return { kicker: 'Confirmation', title: 'Nothing to confirm', content: '<p class="empty-copy">The requested action is no longer available.</p>' };
    return {
      kicker: confirmation.tone === 'danger' ? 'Permanent action' : 'Confirm action',
      title: confirmation.title,
      content: `<section class="confirmation-card tone-${confirmation.tone}"><span>${uiIcon(confirmation.tone === 'danger' ? 'warning' : 'lock')}</span><p>${escapeHtml(confirmation.message)}</p><div><button class="button ${confirmation.tone === 'danger' ? 'danger' : 'primary'}" type="button" data-confirm-action autofocus>${escapeHtml(confirmation.confirmLabel)}</button><button class="button secondary" type="button" data-cancel-action>${escapeHtml(confirmation.cancelLabel)}</button></div></section>`
    };
  }

  confirmPendingAction() {
    const confirmation = this.pendingConfirmation;
    const returnPanel = this.confirmationReturnPanel;
    this.pendingConfirmation = null;
    this.confirmationReturnPanel = null;
    if (!confirmation) {
      this.hideOverlay(true);
      return false;
    }
    let result = false;
    try { result = confirmation.action() !== false; } catch { result = false; }
    if (returnPanel) this.showOverlay(returnPanel);
    else this.hideOverlay(true);
    if (!result) this.toast('That action could not be completed.', 'warning');
    return result;
  }

  cancelConfirmation() {
    const returnPanel = this.confirmationReturnPanel;
    this.pendingConfirmation = null;
    this.confirmationReturnPanel = null;
    if (returnPanel) this.showOverlay(returnPanel);
    else this.hideOverlay(true);
  }

  presentationDebugOverlay() {
    const snapshot = this.game.presentation?.getDebugSnapshot?.();
    if (!snapshot?.enabled) return { kicker: 'Presentation diagnostics', title: 'Debug disabled', content: '<p class="empty-copy">Enable Presentation Debug in Pause settings, then press F3 during play.</p>' };
    const context = snapshot.context ?? {};
    const animation = snapshot.animation ?? {};
    const audio = snapshot.audio ?? {};
    const music = audio.music ?? {};
    const timeline = animation.timeline;
    const budget = animation.budget ?? {};
    const events = snapshot.eventBus?.history ?? [];
    const errors = snapshot.errors ?? [];
    const metric = (name, value, note = '') => `<div><dt>${name}</dt><dd>${escapeHtml(String(value ?? '—'))}</dd>${note ? `<small>${escapeHtml(note)}</small>` : ''}</div>`;
    return {
      kicker: `Live presentation diagnostics · F3 · ${snapshot.performance?.averageMs?.toFixed?.(3) ?? '0.000'} ms average`,
      title: 'Presentation Debug Panel',
      content: `<div class="debug-toolbar"><button type="button" data-debug-impact="light-slash">Light impact</button><button type="button" data-debug-impact="heavy-cleave">Heavy impact</button><button type="button" data-debug-impact="critical">Critical impact</button><button type="button" data-debug-stinger="legendary">Legendary sting</button><button type="button" data-debug-stinger="boss-phase">Boss phase sting</button><button type="button" data-debug-enemy-attack>Trigger enemy attack</button><button type="button" data-debug-boss-phase>Advance boss phase</button><button type="button" data-debug-step>Frame-step</button><button type="button" data-debug-export>Export log</button><label>Music intensity<select id="debug-music-intensity"><option value="">Live</option>${[0,.15,.3,.45,.6,.75,.9,1].map((value) => `<option value="${value}" ${this.game.presentation?.debugOverrides?.musicIntensity === value ? 'selected' : ''}>${Math.round(value * 100)}%</option>`).join('')}</select></label></div><div class="debug-grid"><section><h3>Player animation</h3><dl>${metric('State', context.playerMovementState)}${metric('Clip/profile', timeline?.profileId ?? snapshot.playerAnimation?.profileId ?? snapshot.playerAnimation?.type)}${metric('Phase', timeline?.phase ?? 'idle')}${metric('Time', timeline ? `${timeline.elapsed.toFixed(3)} / ${timeline.duration.toFixed(3)} s` : '—')}${metric('Buffered input', this.input.queue?.map((entry) => entry.action).join(', ') || 'none')}${metric('Root motion', 'gameplay-authoritative')}${metric('IK / foot lock', 'sprite-grounding')}${metric('Weapon', context.playerWeaponType)}</dl></section><section><h3>Encounter</h3><dl>${metric('Enemies', context.nearbyEnemyCount)}${metric('Elites', context.nearbyEliteCount)}${metric('Boss', context.nearbyBoss ?? 'none')}${metric('Boss phase', context.bossPhase || '—')}${metric('Boss stagger', context.bossStaggerState)}${metric('Threat', `${Math.round((context.enemyThreatScore ?? 0) * 100)}%`)}${metric('Intensity band', context.intensityBand)}${metric('Ragdolls / corpses', `${snapshot.activeRagdolls} / ${snapshot.activeCorpses}`)}</dl></section><section><h3>Adaptive music</h3><dl>${metric('State', music.state ?? context.musicState)}${metric('Cue', music.cueId ?? 'silence')}${metric('Section', music.section)}${metric('Stems', music.activeStems?.join(', ') || 'none')}${metric('Music intensity', `${Math.round((music.intensity ?? 0) * 100)}%`)}${metric('Voices', `${audio.activeVoices ?? 0} SFX · ${music.activeVoices ?? 0} music`)}${metric('Transition', music.transitionAt ? music.transitionAt.toFixed(3) : 'none')}${metric('Asset status', music.assetStatus)}</dl></section><section><h3>Budgets & camera</h3><dl>${metric('Camera profile', snapshot.impact?.camera?.profileId)}${metric('Impact profile', snapshot.impact?.activeProfile)}${metric('Animators', budget.activeActors)}${metric('Pose evaluations', budget.poseEvaluations)}${metric('LOD tiers', JSON.stringify(budget.tiers ?? {}))}${metric('Destructibles', snapshot.activeDestructibles)}${metric('Particles', snapshot.activeParticles)}${metric('Projectiles', snapshot.activeProjectiles)}${metric('Presentation CPU', `${snapshot.performance?.currentMs?.toFixed?.(3) ?? 0} ms`, `p95 ${snapshot.performance?.p95Ms?.toFixed?.(3) ?? 0} ms`)}</dl></section></div><section class="debug-log"><h3>Recent typed events</h3><ol>${events.length ? events.slice().reverse().map((event) => `<li><time>${Number(event.time ?? 0).toFixed(2)}</time><b>${escapeHtml(event.type)}</b><span>${escapeHtml(event.source)}</span></li>`).join('') : '<li>No events recorded.</li>'}</ol></section>${errors.length ? `<section class="debug-errors"><h3>Errors</h3><pre>${escapeHtml(JSON.stringify(errors, null, 2))}</pre></section>` : ''}`
    };
  }

  chronicleOverlay() {
    const data = this.game.getReforgedOverview?.();
    if (!data) return { kicker: 'Systemic Chronicle', title: 'No covenant record', content: '<p class="empty-copy">Begin a covenant to open its systemic record.</p>' };
    const views = [
      ['identity', 'Identity'], ['mastery', 'Mastery & Relics'], ['forge', 'Forge'], ['factions', 'Factions'],
      ['world', 'Living World'], ['endgame', 'Eclipse'], ['bestiary', 'Bestiary'], ['decrees', 'Decrees']
    ];
    const tabs = `<nav class="chronicle-tabs" aria-label="Systemic Chronicle views">${views.map(([id, label]) => `<button type="button" data-chronicle-view="${id}" class="${this.chronicleView === id ? 'is-active' : ''}">${label}</button>`).join('')}</nav>`;
    let content = '';
    if (this.chronicleView === 'identity') {
      const oaths = data.oaths.map((oath) => `<button type="button" class="system-choice oath-choice ${oath.selected ? 'is-selected' : ''}" data-world-oath="${oath.id}" ${oath.unlocked ? '' : 'disabled'}><span>${oath.icon}</span><b>${escapeHtml(oath.name)}</b><small>${escapeHtml(oath.summary)}</small><em>${oath.unlocked ? `${Math.round((oath.reward - 1) * 100)}% reward pressure` : `Level ${oath.minLevel}`}</em></button>`).join('');
      const mutations = data.hybrid.tiers.map((tier) => `<article class="system-panel"><header><div><p class="eyebrow">Level ${tier.level} · Tier ${tier.tier}</p><h3>${escapeHtml(tier.name)}</h3></div><span>${tier.unlocked ? tier.selected ? 'Bound' : 'Choice ready' : 'Locked'}</span></header><div class="system-choice-grid">${tier.choices.map((choice) => `<button type="button" class="system-choice ${tier.selected === choice.id ? 'is-selected' : ''}" data-hybrid-tier="${tier.tier}" data-hybrid-choice="${choice.id}" ${tier.unlocked ? '' : 'disabled'}><span>${choice.icon}</span><b>${escapeHtml(choice.name)}</b><small>${escapeHtml(choice.description)}</small></button>`).join('')}</div></article>`).join('');
      const reactions = data.reactions.map((reaction) => `<article class="reaction-card" style="--reaction:${reaction.color}"><span>${reaction.icon}</span><div><b>${escapeHtml(reaction.name)}</b><p>${escapeHtml(reaction.description)}</p><small>${reaction.count.toLocaleString()} triggered</small></div></article>`).join('');
      const audit = data.audit.map((entry) => `<article><b>${escapeHtml(entry.name)}</b><span>${entry.before} → ${entry.target}</span><p>${escapeHtml(entry.overhaul)}</p></article>`).join('');
      content = `<section class="chronicle-hero"><p class="eyebrow">Active world difficulty</p><h3>${escapeHtml(data.oath.name)} World Torment</h3><span>${escapeHtml(data.oath.summary)}</span></section><section class="system-panel"><header><div><p class="eyebrow">Five rulesets</p><h3>World Torments</h3></div><span>Rewrite in Sanctuary</span></header><div class="system-choice-grid oath-grid">${oaths}</div></section>${mutations}<section class="system-panel"><header><div><p class="eyebrow">Status interaction, not isolated damage</p><h3>Combat Reactions</h3></div><span>${data.reactions.reduce((sum, entry) => sum + entry.count, 0).toLocaleString()} total</span></header><div class="reaction-grid">${reactions}</div></section><details class="depth-audit"><summary>System depth audit · ${data.audit.length} overhauls</summary><div>${audit}</div></details>`;
    } else if (this.chronicleView === 'mastery') {
      const mastery = data.mastery.map((entry) => `<article class="system-panel mastery-evolution"><header><div><p class="eyebrow">${escapeHtml(entry.slot)} · ${entry.points} unspent</p><h3>${entry.pathId ? escapeHtml(entry.paths.find((path) => path.id === entry.pathId)?.name ?? entry.slot) : 'Choose an evolution'}</h3></div>${entry.rank ? `<button type="button" class="button compact ghost" data-mastery-evolution-respec="${entry.slot}">Rewrite</button>` : ''}</header><div class="system-choice-grid">${entry.paths.map((path) => `<button type="button" class="system-choice ${path.selected ? 'is-selected' : ''}" data-mastery-evolution-slot="${entry.slot}" data-mastery-evolution-path="${path.id}" ${path.canInvest ? '' : 'disabled'}><span>${path.icon}</span><b>${escapeHtml(path.name)} · ${path.selected ? entry.rank : 0}/${path.maxRank}</b><small>${escapeHtml(path.summary)}</small><em>${escapeHtml(path.milestone.name)} at rank 5</em></button>`).join('')}</div></article>`).join('');
      const relics = data.relics.filter((item) => item.bondRank > 0 || ['relic', 'unique', 'mythic'].includes(item.rarity)).map((item) => `<article class="relic-memory-card rarity-${item.rarity}"><header><div><p>${escapeHtml(item.location)} · ${escapeHtml(item.slot)}</p><h4>${escapeHtml(item.name)}</h4></div><b>Bond ${item.bondRank}/3</b></header><div class="memory-grid">${item.memoryChoices.map((memory) => `<button type="button" class="system-choice ${memory.selected ? 'is-selected' : ''}" data-relic-memory-item="${item.id}" data-relic-memory="${memory.id}" ${memory.available ? '' : 'disabled'}><span>${memory.icon}</span><b>${escapeHtml(memory.name)}</b><small>${escapeHtml(memory.description)}</small></button>`).join('')}</div>${item.memories.length ? `<button type="button" class="button compact ghost" data-relic-memory-rewrite="${item.id}">Release Memories · ${item.memories.length * 2} Echoes</button>` : ''}</article>`).join('');
      content = `<section class="chronicle-hero"><p class="eyebrow">Six ability families · three paths each</p><h3>Ability Evolutions</h3><span>Mastery ranks now become spendable specialization points, with a mechanical capstone at rank five.</span></section>${mastery}<section class="system-panel"><header><div><p class="eyebrow">One permanent choice per Bond rank</p><h3>Relic Memories</h3></div><span>${data.relics.reduce((sum, item) => sum + Math.max(0, item.bondRank - item.memories.length), 0)} ready</span></header><div class="relic-memory-list">${relics || '<p class="empty-copy">Equip and fight with a Relic to awaken its Memories.</p>'}</div></section>`;
    } else if (this.chronicleView === 'forge') {
      const items = data.relics;
      const selected = items.find((item) => item.id === this.chronicleItemId) ?? items[0];
      if (selected) this.chronicleItemId = selected.id;
      const itemSelector = items.length ? `<label class="select-row chronicle-item-select">Forge target <select id="chronicle-item-select">${items.map((item) => `<option value="${item.id}" ${item.id === selected?.id ? 'selected' : ''}>${escapeHtml(item.name)} · ${escapeHtml(item.location)}</option>`).join('')}</select></label>` : '<p class="empty-copy">No owned item can be selected.</p>';
      const passiveIds = new Set(['living-script', 'aspect-weave', 'careful-salvage']);
      const disciplines = data.forge.disciplines.map((discipline) => `<article class="forge-discipline" style="--forge:${discipline.color}"><header><span>${discipline.icon}</span><div><p>Rank ${discipline.rank}/10 · ${discipline.xp}/${discipline.nextXp} XP</p><h3>${escapeHtml(discipline.name)}</h3></div><button type="button" class="button compact ${discipline.focused ? 'primary' : 'ghost'}" data-forge-focus="${discipline.id}">${discipline.focused ? 'Focused' : 'Focus'}</button></header><p>${escapeHtml(discipline.summary)}</p><div class="forge-techniques">${discipline.techniques.map((technique) => `<button type="button" class="system-choice ${technique.unlocked ? 'is-unlocked' : ''}" data-forge-technique="${technique.id}" ${technique.unlocked && (!passiveIds.has(technique.id)) ? '' : 'disabled'}><b>Rank ${technique.rank} · ${escapeHtml(technique.name)}</b><small>${escapeHtml(technique.description)}</small><em>${passiveIds.has(technique.id) && technique.unlocked ? 'Active passive' : technique.unlocked ? 'Use on target' : 'Locked'}</em></button>`).join('')}</div></article>`).join('');
      content = `<section class="chronicle-hero"><p class="eyebrow">Four permanent artisan disciplines</p><h3>Deep Forge</h3><span>Every forge action trains a craft. Focus earns 50% more experience; unlocked techniques replace blind rerolls with controlled decisions.</span></section><section class="system-panel forge-target"><header><div><p class="eyebrow">Selected relic</p><h3>${selected ? escapeHtml(selected.name) : 'No target'}</h3></div><span>${selected ? `${selected.quality} · MW ${selected.masterwork}` : ''}</span></header>${itemSelector}${selected ? `<p>${selected.affixes.map((affix, index) => `${index === selected.forgeLockedAffix ? '🔒 ' : ''}${escapeHtml(affix.label)}`).join(' · ') || 'No affixes'}</p>` : ''}</section><div class="forge-discipline-grid">${disciplines}</div>`;
    } else if (this.chronicleView === 'factions') {
      content = `<section class="chronicle-hero"><p class="eyebrow">One pledge · five political identities</p><h3>Faction Doctrines & Directives</h3><span>Renown unlocks power, weekly-style directive cycles earn Favor, and one permanent pledge empowers the doctrine you choose.</span></section><div class="faction-system-grid">${data.factions.map((faction) => `<article class="system-panel faction-system" style="--faction:${faction.color}"><header><span>${faction.icon}</span><div><p>Rank ${faction.rank} · ${faction.favor} Favor · Cycle ${faction.directiveCycle + 1}</p><h3>${escapeHtml(faction.name)}</h3></div>${faction.pledged ? '<b>Pledged</b>' : `<button type="button" class="button compact" data-faction-pledge="${faction.id}" ${faction.canPledge ? '' : 'disabled'}>Pledge</button>`}</header><div class="system-choice-grid">${faction.doctrines.map((doctrine) => `<button type="button" class="system-choice ${doctrine.selected ? 'is-selected' : ''}" data-faction-doctrine-id="${faction.id}" data-faction-doctrine="${doctrine.id}" ${doctrine.unlocked ? '' : 'disabled'}><span>${doctrine.icon}</span><b>${escapeHtml(doctrine.name)}</b><small>${escapeHtml(doctrine.description)}</small></button>`).join('')}</div><div class="directive-list">${faction.directives.map((directive) => `<button type="button" data-faction-directive-id="${faction.id}" data-faction-directive="${directive.id}" ${directive.ready ? '' : 'disabled'}><span>${directive.icon}</span><b>${escapeHtml(directive.name)}</b><small>${directive.progress}/${directive.target} · +${directive.favor} Favor</small></button>`).join('')}</div>${faction.offers.map((offer) => `<button type="button" class="faction-offer" data-faction-offer="${offer.id}" ${offer.canBuy ? '' : 'disabled'}><b>${escapeHtml(offer.name)} · ${offer.cost} Favor</b><small>${escapeHtml(offer.description)}</small></button>`).join('')}</article>`).join('')}</div>`;
    } else if (this.chronicleView === 'world') {
      const regions = data.world.regions.filter((zone) => zone.id !== 'sanctuary').map((region) => `<article class="region-state"><header><b>${escapeHtml(region.name)}</b><span>Threat ${region.threat}% · Control ${region.control}%</span></header><i><b style="width:${region.threat}%"></b></i><p>Momentum ${region.momentum > 0 ? '+' : ''}${region.momentum} · Secrets ${region.secrets}/5 · Ignored ${region.ignoredEvents}</p></article>`).join('');
      const strongholds = data.world.strongholds.map((hold) => `<article class="system-panel stronghold-system"><header><div><p>${hold.reclaimed ? `Stability ${hold.stability}% · ${hold.defenses} defenses` : 'Hostile'}</p><h3>${escapeHtml(hold.label)}</h3></div><span>${hold.reclaimed ? 'Reclaimed' : 'Assault in world'}</span></header><div class="system-choice-grid">${hold.projects.map((project) => `<button type="button" class="system-choice" data-stronghold-id="${hold.id}" data-stronghold-project="${project.id}" ${project.canInvest ? '' : 'disabled'}><span>${project.icon}</span><b>${escapeHtml(project.name)} ${project.rank}/${project.maxRank}</b><small>${escapeHtml(project.description)}</small><em>${project.rank >= project.maxRank ? 'Complete' : `${project.nextCost} Alloys`}</em></button>`).join('')}</div></article>`).join('');
      const arcs = data.world.arcs.map((arc) => `<article class="system-panel event-arc"><header><span>${arc.icon}</span><div><p>${arc.selectedEnding ? 'Permanent outcome' : `Stage ${Math.min(arc.stages.length, arc.stage + 1)}/${arc.stages.length}`}</p><h3>${escapeHtml(arc.name)}</h3></div></header>${arc.currentStage ? `<p><b>${escapeHtml(arc.currentStage.name)}</b> · ${escapeHtml(arc.currentStage.description)}</p>` : ''}${arc.selectedEnding ? `<p class="selected-ending"><b>${escapeHtml(arc.selectedEnding.name)}</b> · ${escapeHtml(arc.selectedEnding.description)}</p>` : arc.pendingChoice ? `<div class="system-choice-grid">${arc.endings.map((ending) => `<button type="button" class="system-choice" data-event-arc="${arc.id}" data-event-outcome="${ending.id}"><b>${escapeHtml(ending.name)}</b><small>${escapeHtml(ending.description)}</small></button>`).join('')}</div>` : '<small>Complete regional events to advance this chain.</small>'}</article>`).join('');
      content = `<section class="chronicle-hero"><p class="eyebrow">Pressure persists</p><h3>Living World State</h3><span>Events, deaths, discoveries, strongholds, and permanent regional choices now push threat and control in opposite directions.</span></section><section class="system-panel"><header><div><p class="eyebrow">Five hostile regions</p><h3>Regional pressure</h3></div></header><div class="region-state-grid">${regions}</div></section><div class="stronghold-grid">${strongholds}</div><section class="system-panel"><header><div><p class="eyebrow">Three stages · two lasting answers</p><h3>Regional Event Arcs</h3></div></header><div class="event-arc-grid">${arcs}</div></section>`;
    } else if (this.chronicleView === 'endgame') {
      const expedition = data.expedition;
      const nodes = data.eclipse.nodes.map((node) => `<button type="button" class="eclipse-node ${node.allocated ? 'is-allocated' : ''} ${node.available ? 'is-available' : ''}" style="--x:${node.x}%;--y:${node.y}%" data-eclipse-node="${node.id}" ${node.available ? '' : 'disabled'} title="${escapeHtml(node.description)}"><span>${node.icon}</span><b>${escapeHtml(node.name)}</b><small>${node.cost}</small></button>`).join('');
      const lines = data.eclipse.nodes.flatMap((node) => node.requires.map((required) => { const source = data.eclipse.nodes.find((entry) => entry.id === required); return source ? `<line x1="${source.x}" y1="${source.y}" x2="${node.x}" y2="${node.y}" class="${source.allocated && node.allocated ? 'is-active' : ''}"></line>` : ''; })).join('');
      const constellations = data.eclipse.constellations.map((entry) => `<article><span>${entry.icon}</span><div><b>${escapeHtml(entry.name)}</b><p>${escapeHtml(entry.description)}</p></div></article>`).join('');
      content = `<section class="chronicle-hero"><p class="eyebrow">Routes chosen ${expedition.routesChosen} · Highest heat ${expedition.maxHeat}</p><h3>Expedition Mastery ${expedition.mastery.toLocaleString()}</h3><span>Operations now branch between rooms. Boons add build power and Reward Heat; dangerous choices add persistent Banes to the remaining route.</span></section><section class="system-panel eclipse-shell"><header><div><p class="eyebrow">${data.eclipse.points} points · ${data.eclipse.pinnacleKeys} Pinnacle Keys</p><h3>Eclipse Web</h3></div><span>${data.eclipse.spent} power routed</span></header><div class="eclipse-canvas"><svg viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>${nodes}</div><div class="pinnacle-actions"><button type="button" class="button primary" data-pinnacle="worldscar" ${data.eclipse.nodes.find((node) => node.special === 'unlock-worldscar')?.allocated && data.eclipse.pinnacleKeys ? '' : 'disabled'}>Open Worldscar</button><button type="button" class="button primary" data-pinnacle="final-bell" ${data.eclipse.nodes.find((node) => node.special === 'unlock-final-bell')?.allocated && data.eclipse.pinnacleKeys ? '' : 'disabled'}>Ring the Final Bell</button></div></section><section class="system-panel"><header><div><p class="eyebrow">Completed Paragon routes</p><h3>Active Constellations</h3></div><span>${data.eclipse.constellations.length}/16</span></header><div class="constellation-grid">${constellations || '<p class="empty-copy">Complete named routes across Paragon boards to form Constellations.</p>'}</div></section>`;
    } else if (this.chronicleView === 'bestiary') {
      const families = data.bestiary.map((family) => `<article class="system-panel bestiary-family"><header><span>${family.icon}</span><div><p>Rank ${family.rank}/4 · ${family.kills.toLocaleString()} records</p><h3>${escapeHtml(family.name)}</h3></div><b>${family.rank >= 4 ? 'Mastered' : `${family.next} next`}</b></header><p>${escapeHtml(family.summary)}</p><div class="system-choice-grid">${family.insights.map((insight) => `<button type="button" class="system-choice ${insight.selected ? 'is-selected' : ''}" data-bestiary-family="${family.id}" data-bestiary-insight="${insight.id}" ${insight.canChoose ? '' : 'disabled'}><span>${insight.icon}</span><b>${escapeHtml(insight.name)}</b><small>${escapeHtml(insight.description)}</small></button>`).join('')}</div></article>`).join('');
      const nemeses = data.nemeses.map((nemesis) => `<article class="nemesis-card"><span>†</span><div><b>${escapeHtml(nemesis.name)}</b><p>Level ${nemesis.level} · ${nemesis.victories} victories · Grudge ${nemesis.grudge} · Bounty ${nemesis.bounty}</p><small>${nemesis.traits.map((trait) => escapeHtml(trait)).join(' · ') || 'No adaptations yet'}</small></div></article>`).join('');
      content = `<section class="chronicle-hero"><p class="eyebrow">Research counters whole enemy roles</p><h3>Bestiary & Nemesis Archive</h3><span>Repeated encounters unlock a chosen offensive, defensive, or harvesting counter. Enemies that defeat you remember, adapt, and return with growing bounties.</span></section><div class="bestiary-grid">${families}</div><section class="system-panel"><header><div><p class="eyebrow">Vendetta ${data.vendetta}</p><h3>Remembered Rivals</h3></div><span>${data.nemeses.length}/4 active</span></header><div class="nemesis-list">${nemeses || '<p class="empty-copy">No living enemy currently carries a grudge against this covenant.</p>'}</div></section>`;
    } else {
      content = `<section class="chronicle-hero"><p class="eyebrow">Every chapter leaves a rule behind</p><h3>Campaign Decrees</h3><span>Finishing an act now creates a permanent strategic decision rather than only closing a quest counter.</span></section><div class="decree-grid">${data.decrees.map((entry, index) => `<article class="system-panel decree-card"><header><div><p>Chapter ${index + 1} · ${entry.completed ? entry.selected ? 'Decreed' : 'Choice ready' : 'Incomplete'}</p><h3>${entry.selected ? escapeHtml(entry.choices.find((choice) => choice.id === entry.selected)?.name ?? 'Decree') : 'Unwritten law'}</h3></div></header><div class="system-choice-grid">${entry.choices.map((choice) => `<button type="button" class="system-choice ${choice.selected ? 'is-selected' : ''}" data-decree-chapter="${entry.chapterId}" data-decree="${choice.id}" ${entry.completed && !entry.selected ? '' : 'disabled'}><span>${choice.icon}</span><b>${escapeHtml(choice.name)}</b><small>${escapeHtml(choice.description)}</small></button>`).join('')}</div></article>`).join('')}</div>`;
    }
    return { kicker: `${data.oath.name} Oath · ${data.audit.length} deep systems`, title: 'Systemic Chronicle', content: `${tabs}${content}` };
  }

  expeditionChoiceOverlay() {
    const route = this.game.getExpeditionRouteChoice?.();
    if (!route) return { kicker: 'Expedition route', title: 'The junction has closed', content: '<p class="empty-copy">Return to the operation.</p>' };
    const blackRoad = this.game.endgame?.blackRoad === true;
    const boons = route.currentBoons.map((boon) => `<span>${boon.icon} ${escapeHtml(boon.name)}</span>`).join('');
    const banes = route.currentBanes.map((bane) => `<span>† ${escapeHtml(bane.name)}</span>`).join('');
    return { kicker: `${blackRoad ? this.game.endgame.name : 'Expedition'} · Room ${route.room}/${route.totalRooms} · Reward Heat ${route.heat}`, title: blackRoad ? 'The Black Road divides' : 'Choose the next road', content: `<section class="route-summary"><div><p class="eyebrow">Current boons</p>${boons || '<span>None yet</span>'}</div><div><p class="eyebrow">Current banes</p>${banes || '<span>None yet</span>'}</div></section><p class="overlay-intro">A hotter road improves the final cache but can add a Bane to every remaining encounter. The choice follows you through the lieutenant and boss rooms.</p><div class="route-choice-grid">${route.choices.map((boon) => `<button type="button" data-expedition-route="${boon.id}" style="--route:${boon.heat >= 2 ? '#d56b70' : '#89cfc2'}"><span>${boon.icon}</span><b>${escapeHtml(boon.name)}</b><small>${escapeHtml(boon.description)}</small><em>+${boon.heat} Heat${boon.bane ? ' · Adds a Bane' : ''}</em></button>`).join('')}</div>` };
  }

  journeyOverlay() {
    const data = this.game.getLevelingOverview?.();
    if (!data) return { kicker: 'Covenant Journey', title: 'The road is unreadable', content: '<p class="empty-copy">No leveling record is available.</p>' };
    const active = data.bands.find((band) => band.id === this.journeyBandId) ?? data.bands.find((band) => band.active) ?? data.bands.at(-1);
    const paragon = data.paragon;
    const paragonCapped = paragon?.rank >= paragon?.maxRank;
    const progress = paragonCapped ? '100%' : percent(data.xp / Math.max(1, data.nextXp));
    const unchosenAscensions = data.ascensions.filter((tier) => tier.unlocked && !tier.selected).length;
    const paragonReady = paragon?.unlocked ? paragon.points + paragon.boardSigils : 0;
    const tabs = `<nav class="journey-tabs" aria-label="Leveling views"><button type="button" data-journey-view="road" class="${this.journeyView === 'road' ? 'is-active' : ''}">Journey</button><button type="button" data-journey-view="pillars" class="${this.journeyView === 'pillars' ? 'is-active' : ''}">Pillars <b>${data.pillarPoints}</b></button><button type="button" data-journey-view="ascension" class="${this.journeyView === 'ascension' ? 'is-active' : ''}">Ascension <b>${unchosenAscensions}</b></button><button type="button" data-journey-view="paragon" class="${this.journeyView === 'paragon' ? 'is-active' : ''}">Paragon <b>${paragonReady}</b></button></nav>`;
    const hero = `<section class="journey-hero" style="--journey:${active.color}"><div><p class="eyebrow">${data.level >= MAX_LEVEL ? `Level 100 · Paragon Rank ${paragon.rank}` : `Level ${data.level} of ${MAX_LEVEL}`}</p><h3>${escapeHtml(data.level >= MAX_LEVEL ? 'Paragon Atlas' : active.name)}</h3><span>${escapeHtml(data.level >= MAX_LEVEL ? 'Route through endgame boards, keystones, and Glyph sockets.' : active.focus)}</span></div><div class="journey-xp"><b>${paragonCapped ? 'Atlas complete' : `${Math.floor(data.xp).toLocaleString()} / ${Math.floor(data.nextXp).toLocaleString()}`}</b><i><span style="width:${progress}"></span></i><small>${data.level >= MAX_LEVEL ? 'Paragon experience' : 'Experience to next level'}</small></div></section>`;
    let content = '';
    if (this.journeyView === 'road') {
      const tasks = active.tasks.map((entry) => `<article class="journey-task ${entry.complete ? 'is-complete' : ''}"><span>${entry.icon}</span><div><h4>${escapeHtml(entry.name)}</h4><p>${escapeHtml(entry.description)}</p><i><b style="width:${percent(entry.progress / entry.target)}"></b></i><small>${entry.progress}/${entry.target}${entry.complete ? ' · Complete' : ''}</small></div></article>`).join('');
      const cacheAction = active.cacheClaimed ? '<span class="journey-claimed">Chapter cache claimed</span>' : `<button type="button" class="button primary" data-journey-claim="${active.id}" ${active.cacheReady ? '' : 'disabled'}>Claim chapter cache · ${active.completed}/${active.required}</button>`;
      const masteryAction = active.masteryClaimed ? '<span class="journey-claimed mastery">Mastery reward claimed</span>' : `<button type="button" class="button secondary" data-journey-mastery="${active.id}" ${active.masteryReady ? '' : 'disabled'}>Master all six · +1 Pillar point</button>`;
      const levels = data.rewards.slice(active.minLevel - 1, active.maxLevel).map((reward) => {
        const state = reward.level < data.level ? 'is-earned' : reward.level === data.level ? 'is-current' : '';
        const tags = [reward.skill ? 'Skill' : '', reward.pillar ? 'Pillar' : '', reward.cache ? 'Cache' : '', reward.ascension ? 'Ascension' : '', reward.potion ? 'Flask' : '', reward.paragon ? 'Paragon' : ''].filter(Boolean).join(' · ');
        return `<article class="level-reward ${state}"><b>${reward.level}</b><div><h4>${escapeHtml(reward.name)}</h4><p>${escapeHtml(reward.description)}</p><small>${escapeHtml(tags || 'Milestone')}</small></div></article>`;
      }).join('');
      const bands = data.bands.map((band) => `<button type="button" class="journey-band-card ${band.id === active.id ? 'is-active' : ''} ${band.unlocked ? '' : 'is-locked'}" data-journey-band="${band.id}" style="--journey:${band.color}"><span>${band.number}</span><div><b>${escapeHtml(band.name)}</b><small>Levels ${band.minLevel}–${band.maxLevel} · ${band.completed}/${band.tasks.length} trials</small></div><i>${band.masteryClaimed ? 'Mastered' : band.cacheClaimed ? 'Cache claimed' : band.unlocked ? 'Open road' : `Level ${band.minLevel}`}</i></button>`).join('');
      content = `<section class="journey-current"><header><div><p class="eyebrow">Journey chapter ${active.number} · ${escapeHtml(active.recommended)}</p><h3>${escapeHtml(active.name)}</h3></div><strong>${active.completed}/${active.tasks.length}</strong></header><div class="journey-task-grid">${tasks}</div><footer>${cacheAction}${masteryAction}</footer></section><section class="journey-section"><header><div><p class="eyebrow">Every level has a reward</p><h3>Levels ${active.minLevel}–${active.maxLevel}</h3></div></header><div class="level-reward-grid">${levels}</div></section><section class="journey-section"><header><div><p class="eyebrow">${data.bands.length} stages · ${data.bands.reduce((sum, band) => sum + band.tasks.length, 0)} trials</p><h3>Full Covenant Journey</h3></div></header><div class="journey-band-list">${bands}</div></section>`;
    } else if (this.journeyView === 'pillars') {
      const pillars = data.pillars.map((pillar) => {
        const pips = Array.from({ length: pillar.maxRank }, (_, index) => `<i class="${index < pillar.rank ? 'is-filled' : ''}"></i>`).join('');
        const milestones = pillar.milestones.map((milestone) => `<li class="${pillar.rank >= milestone.rank ? 'is-earned' : ''}"><b>${milestone.rank} · ${escapeHtml(milestone.name)}</b><span>${escapeHtml(milestone.description)}</span></li>`).join('');
        return `<article class="pillar-card" style="--pillar:${pillar.color}"><header><span>${pillar.icon}</span><div><p>Rank ${pillar.rank}/${pillar.maxRank}</p><h3>${escapeHtml(pillar.name)}</h3></div></header><p>${escapeHtml(pillar.summary)}</p><div class="pillar-pips" style="grid-template-columns:repeat(${pillar.maxRank},1fr)">${pips}</div><ul>${milestones}</ul><button type="button" class="button compact" data-pillar-invest="${pillar.id}" ${pillar.canInvest ? '' : 'disabled'}>${pillar.rank >= pillar.maxRank ? 'Mastered' : data.pillarPoints ? 'Invest Pillar point' : 'No points available'}</button></article>`;
      }).join('');
      content = `<section class="journey-section pillars-intro"><header><div><p class="eyebrow">${data.pillarPoints} unspent Pillar point${data.pillarPoints === 1 ? '' : 's'}</p><h3>Permanent build foundations</h3></div><button type="button" class="button ghost" data-pillar-respec>Rekindle all Pillars</button></header><p class="overlay-intro">One point arrives at level 1 and every even level. Perfecting all six trials in a Journey chapter grants another. Ranks 3, 6, 10, and 15 add major effects.</p><div class="pillar-grid">${pillars}</div></section>`;
    } else if (this.journeyView === 'ascension') {
      const tiers = data.ascensions.map((tier) => {
        const selected = tier.choices.find((entry) => entry.id === tier.selected);
        if (!tier.unlocked) return `<article class="ascension-tier is-locked"><header><span>${tier.level}</span><div><p>Unlocks at level ${tier.level}</p><h3>${escapeHtml(tier.name)}</h3></div></header></article>`;
        if (selected) return `<article class="ascension-tier is-selected"><header><span>${tier.level}</span><div><p>Ascended</p><h3>${escapeHtml(tier.name)}</h3></div></header><section><b>${selected.icon} ${escapeHtml(selected.name)}</b><p>${escapeHtml(selected.description)}</p></section></article>`;
        return `<article class="ascension-tier is-ready"><header><span>${tier.level}</span><div><p>Choice ready</p><h3>${escapeHtml(tier.name)}</h3></div></header><div class="ascension-choice-grid">${tier.choices.map((entry) => `<button type="button" data-ascension-level="${tier.level}" data-ascension-choice="${entry.id}"><span>${entry.icon}</span><b>${escapeHtml(entry.name)}</b><small>${escapeHtml(entry.description)}</small></button>`).join('')}</div></article>`;
      }).join('');
      content = `<section class="journey-section ascension-intro"><header><div><p class="eyebrow">One choice every five levels</p><h3>${data.ascensions.length} Ascension temperings</h3></div><button type="button" class="button ghost" data-ascension-respec>Rewrite all choices</button></header><p class="overlay-intro">Each tempering offers one of three build-defining effects. Choices remain fixed until you pay to rewrite the full Ascension path.</p><div class="ascension-list">${tiers}</div></section>`;
    } else {
      const activeBoard = paragon.boards.find((board) => board.id === this.paragonBoardId) ?? paragon.boards.find((board) => board.unlocked) ?? paragon.boards[0];
      const nodeById = new Map(activeBoard.nodes.map((node) => [node.id, node]));
      const edges = activeBoard.nodes.flatMap((node) => [...node.requires, ...node.requiresAny].map((requirement) => {
        const source = nodeById.get(requirement);
        if (!source) return '';
        return `<line x1="${source.x}" y1="${source.y}" x2="${node.x}" y2="${node.y}" class="${source.allocated && node.allocated ? 'is-active' : ''}"></line>`;
      })).join('');
      const nodeButtons = activeBoard.nodes.map((node) => `<button type="button" class="paragon-node node-${node.type} ${node.allocated ? 'is-allocated' : ''} ${node.available ? 'is-available' : ''}" style="--x:${node.x}%;--y:${node.y}%;--node:${activeBoard.color}" data-paragon-node="${escapeHtml(node.id)}" ${node.available ? '' : 'disabled'} title="${escapeHtml(`${node.name} · ${node.description} · Cost ${node.cost}`)}"><span>${node.icon}</span><b>${escapeHtml(node.name)}</b><small>${node.cost}</small></button>`).join('');
      const boardCards = paragon.boards.map((board) => `<button type="button" class="paragon-board-card ${board.id === activeBoard.id ? 'is-active' : ''} ${board.unlocked ? 'is-unlocked' : 'is-locked'}" style="--board:${board.color}" data-paragon-board="${escapeHtml(board.id)}"><span>${board.icon}</span><div><b>${escapeHtml(board.name)}</b><small>${board.unlocked ? `${board.nodes.filter((node) => node.allocated).length}/${board.nodes.length} nodes` : `Paragon ${board.minRank}+`}</small></div><i>${board.unlocked ? 'Attached' : board.canUnlock ? 'Ready' : 'Locked'}</i></button>`).join('');
      const boardAction = activeBoard.unlocked
        ? `<span class="paragon-attached">${activeBoard.nodes.filter((node) => node.allocated).length}/${activeBoard.nodes.length} nodes awakened</span>`
        : `<button type="button" class="button primary" data-paragon-unlock="${escapeHtml(activeBoard.id)}" ${activeBoard.canUnlock ? '' : 'disabled'}>${paragon.rank < activeBoard.minRank ? `Requires Paragon ${activeBoard.minRank}` : paragon.boardSigils ? 'Attach with Board Sigil' : 'Route to a Gate for a Board Sigil'}</button>`;
      const socketNodes = paragon.boards.filter((board) => board.unlocked).flatMap((board) => board.nodes.filter((node) => node.type === 'socket' && node.allocated).map((node) => ({ ...node, boardName: board.name })));
      const socketControls = socketNodes.length ? socketNodes.map((node) => `<label class="paragon-socket-control"><span>${escapeHtml(node.boardName)} · ${escapeHtml(node.name)}</span><select data-paragon-socket="${escapeHtml(node.id)}"><option value="">Empty socket</option>${paragon.glyphs.map((glyph) => `<option value="${escapeHtml(glyph.id)}" ${paragon.sockets[node.id] === glyph.id ? 'selected' : ''}>${escapeHtml(glyph.name)} · Rank ${glyph.rank}</option>`).join('')}</select></label>`).join('') : '<p class="empty-copy">Awaken a ◇ socket node on an attached board to equip a Glyph.</p>';
      const glyphs = paragon.glyphs.map((glyph) => `<article class="paragon-glyph" style="--glyph:${glyph.color}"><header><span>${glyph.icon}</span><div><p>Rank ${glyph.rank}/${glyph.maxRank}${glyph.socketedNodeId ? ' · Socketed' : ''}</p><h4>${escapeHtml(glyph.name)}</h4></div></header><p>${escapeHtml(glyph.summary)}</p><div class="glyph-pips">${Array.from({ length: glyph.maxRank }, (_, index) => `<i class="${index < glyph.rank ? 'is-filled' : ''}"></i>`).join('')}</div><small>${glyph.milestones.map((milestone) => `${milestone.rank}: ${milestone.name}`).join(' · ')}</small><button type="button" class="button compact" data-paragon-glyph-upgrade="${escapeHtml(glyph.id)}" ${glyph.canUpgrade ? '' : 'disabled'}>${glyph.rank >= glyph.maxRank ? 'Mastered' : `Upgrade · ${glyph.upgradeCost} Embers`}</button></article>`).join('');
      const legacyImprints = paragon.legacyImprints.length ? `<p class="legacy-imprint-note">Migrated Legacy Imprints preserved: ${paragon.legacyImprints.map((path) => `${escapeHtml(path.name)} ${path.rank}`).join(' · ')}</p>` : '';
      content = `<section class="journey-section paragon-intro ${paragon.unlocked ? '' : 'is-locked'}" style="--paragon:${activeBoard.color}"><header><div><p class="eyebrow">${paragon.unlocked ? `${paragon.points} points · ${paragon.boardSigils} Board Sigils · ${paragon.glyphEmbers} Glyph Embers` : `Unlocks at level ${MAX_LEVEL}`}</p><h3>Paragon Atlas · Rank ${paragon.rank}/${paragon.maxRank}</h3></div><button type="button" class="button ghost" data-paragon-respec ${paragon.unlocked ? '' : 'disabled'}>Rekindle Atlas</button></header><p class="overlay-intro">Spend points along connected routes. Rare and Legendary nodes cost more, Keystones change combat behavior, Glyph sockets amplify a chosen endgame identity, and Gate nodes earn the sigils used to attach more boards.</p>${legacyImprints}<div class="paragon-board-list">${boardCards}</div><section class="paragon-board-shell ${activeBoard.unlocked ? '' : 'is-board-locked'}"><header><div><p class="eyebrow">${activeBoard.icon} ${activeBoard.unlocked ? 'Attached board' : 'Board preview'}</p><h4>${escapeHtml(activeBoard.name)}</h4><span>${escapeHtml(activeBoard.summary)}</span></div>${boardAction}</header><div class="paragon-canvas"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${edges}</svg>${nodeButtons}</div></section><section class="paragon-lower"><div><header><p class="eyebrow">Active sockets</p><h4>Glyph loadout</h4></header><div class="paragon-sockets">${socketControls}</div></div><div><header><p class="eyebrow">Permanent glyph growth</p><h4>Glyph archive</h4></header><div class="paragon-glyph-grid">${glyphs}</div></div></section></section>`;
    }
    return { kicker: `${active.name} · ${active.completed}/${active.tasks.length} trials`, title: 'Covenant Journey', content: `${hero}${tabs}${content}` };
  }

  skillsOverlay() {
    const player = this.game.player;
    const nodes = this.game.getSkillNodes();
    return { kicker: `${player.skillPoints} points available · ${player.gold} gold`, title: 'Skill constellation', content: `<p class="overlay-intro">Branches now unlock by level and prerequisites. Capstones are mutually exclusive, and refunds protect dependent nodes, so each late-game covenant has a real commitment instead of a flat bonus list.</p><div class="skill-overlay-links"><button class="button secondary imprint-link" type="button" data-overlay-action="imprints">Attune skill imprints</button><button class="button secondary imprint-link" type="button" data-overlay-action="mastery">Combat mastery & doctrines</button></div><div class="skill-grid">${nodes.map((node) => {
      const fallbackRank = player.skillRanks[node.id] ?? 0;
      const state = this.game.getSkillNodeState?.(node) ?? { rank: fallbackRank, canBuy: player.skillPoints > 0 && fallbackRank < node.max, canRefund: false, refundCost: 0, lockReason: null, refundReason: null };
      const rank = state.rank;
      const metadata = [`Tier ${node.tier ?? 1}`, node.branch ?? 'Core', `Level ${node.level ?? 1}`].join(' · ');
      const locked = state.lockReason && rank < node.max;
      return `<article class="skill-node ${rank ? 'is-owned' : ''} ${locked ? 'is-locked' : ''}" style="--node-color:${node.color}"><p>${escapeHtml(node.className)}</p><h3>${escapeHtml(node.name)} <small>${rank}/${node.max}</small></h3><em class="skill-meta">${escapeHtml(metadata)}</em><span>${escapeHtml(node.desc)}</span>${locked ? `<small class="skill-lock">${escapeHtml(state.lockReason)}</small>` : ''}<div class="skill-actions"><button type="button" class="button compact" data-skill-id="${node.id}" ${state.canBuy ? '' : 'disabled'}>${rank >= node.max ? 'Mastered' : `Invest (${rank + 1})`}</button>${rank ? `<button type="button" class="button compact ghost-compact" data-refund-skill-id="${node.id}" title="${escapeHtml(state.refundReason ?? `Refund for ${state.refundCost} gold`)}" ${state.canRefund ? '' : 'disabled'}>Refund · ${state.refundCost}g</button>` : ''}</div></article>`;
    }).join('')}</div>` };
  }

  imprintsOverlay() {
    const player = this.game.player;
    const groups = this.game.getImprintOptions?.() ?? [];
    return { kicker: `Level ${player.level} covenant`, title: 'Skill imprints', content: `<p class="overlay-intro">Attune one imprint to each family. An imprint changes the actual combat action rather than simply adding a stat; selecting an equipped imprint again removes it. Higher-level imprints are deliberately build-defining.</p><div class="imprint-groups">${groups.map((group) => `<section class="imprint-group"><h3>${group.title}</h3><div class="imprint-grid">${group.options.map((imprint) => {
      const locked = player.level < imprint.level;
      const selected = group.selected === imprint.id;
      return `<button type="button" class="imprint-card ${selected ? 'is-selected' : ''} ${locked ? 'is-locked' : ''}" data-imprint-slot="${group.slot}" data-imprint-id="${imprint.id}" ${locked ? 'disabled' : ''}><span class="imprint-icon">${imprint.icon}</span><span><b>${imprint.name}</b><em>${selected ? 'Attuned' : locked ? `Unlocks at level ${imprint.level}` : `Level ${imprint.level}`}</em><small>${imprint.desc}</small></span></button>`;
    }).join('')}</div></section>`).join('')}</div>` };
  }

  masteryOverlay() {
    const groups = this.game.getMasteryOptions?.() ?? [];
    return { kicker: 'Earned in live combat', title: 'Covenant mastery', content: `<p class="overlay-intro">Each ability family gains mastery only while enemies are close. Ranks make the action stronger; at rank III, choose one doctrine. Those choices are free to change here, so use them to tune a build for the next fight rather than fearing a permanent mistake.</p><div class="mastery-grid">${groups.map((group) => {
      const progress = group.rank >= group.maxRank ? 'Mastered' : `${group.xp}/${group.nextXp} mastery · next rank opens at level ${group.unlockLevel}`;
      const doctrineMarkup = group.doctrineOptions.map((doctrine) => {
        const selected = group.selectedDoctrine === doctrine.id;
        return `<button type="button" class="doctrine-card ${selected ? 'is-selected' : ''}" data-mastery-slot="${group.id}" data-mastery-doctrine="${doctrine.id}" ${group.doctrineUnlocked ? '' : 'disabled'}><span>${doctrine.icon}</span><b>${escapeHtml(doctrine.name)}</b><small>${escapeHtml(doctrine.desc)}</small></button>`;
      }).join('');
      return `<section class="mastery-card"><header><span class="mastery-icon">${group.icon}</span><div><p>Rank ${group.rank}/${group.maxRank}</p><h3>${escapeHtml(group.name)}</h3></div></header><strong>${escapeHtml(progress)}</strong><em>${escapeHtml(group.desc)}</em><div class="doctrine-grid">${doctrineMarkup}</div>${group.doctrineUnlocked ? '<small class="mastery-note">Select one doctrine; select it again to unset it.</small>' : '<small class="mastery-note">Reach rank III to unlock a doctrine.</small>'}</section>`;
    }).join('')}</div>` };
  }

  inventoryOverlay() {
    const player = this.game.player;
    const materials = { cinders: 0, shards: 0, alloys: 0, echoes: 0, prisms: 0, cores: 0, ...(player.materials ?? {}) };
    const capacities = this.game.getInventoryCapacities?.() ?? { pack: 60, stash: 180 };
    const equipment = Object.entries(player.equipment ?? {}).filter(([, item]) => item);
    const pack = player.inventory ?? [];
    const stash = player.stash ?? [];
    const runeEntries = RUNES.filter((rune) => (player.runes?.[rune.id] ?? 0) > 0);
    if (this.selectedRuneId && !runeEntries.some((rune) => rune.id === this.selectedRuneId)) this.selectedRuneId = null;
    const selectedRune = runeById(this.selectedRuneId);
    const makeEntry = (item, location, label, options) => ({ item, location, label, options });
    const equippedEntries = equipment.map(([slot, item]) => makeEntry(item, 'equipped', `Equipped · ${slot}`, { equippedSlot: slot }));
    const packEntries = pack.map((item) => makeEntry(item, 'pack', 'Pack', { canEquip: true, canStash: true, canSalvage: true, canExtract: ['unique', 'mythic'].includes(item.rarity) }));
    const stashEntries = stash.map((item) => makeEntry(item, 'stash', 'Sanctuary stash', { canEquip: true, canRetrieve: true }));
    const allEntries = [...equippedEntries, ...packEntries, ...stashEntries];
    const rawActiveEntries = this.inventoryView === 'stash' ? stashEntries : packEntries;
    const query = this.inventoryQuery.trim().toLowerCase();
    const matchesFilter = (entry) => {
      const item = entry.item;
      if (this.inventoryRarityFilter !== 'all' && item.rarity !== this.inventoryRarityFilter) return false;
      if (this.inventorySlotFilter !== 'all' && item.slot !== this.inventorySlotFilter) return false;
      if (!query) return true;
      const haystack = [item.name, item.slot, item.rarity, item.description, ...(item.affixes ?? []).map((affix) => affix.label)].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    };
    const activeEntries = rawActiveEntries.filter(matchesFilter);
    if (this.selectedItemId && !allEntries.some((entry) => entry.item.id === this.selectedItemId)) this.selectedItemId = null;
    const selectedEntry = allEntries.find((entry) => entry.item.id === this.selectedItemId) ?? activeEntries[0] ?? equippedEntries[0] ?? rawActiveEntries[0] ?? null;
    if (selectedEntry) this.selectedItemId = selectedEntry.item.id;
    const comparisonItem = selectedEntry ? equipment.find(([slot, item]) => slot === selectedEntry.item.slot && item.id !== selectedEntry.item.id)?.[1] ?? null : null;
    const slotIds = [...new Set(allEntries.map((entry) => entry.item.slot).filter(Boolean))].sort();
    const loadouts = Array.from({ length: 3 }, (_, index) => {
      const saved = player.loadouts?.[index];
      const count = saved ? Object.keys(saved).length : 0;
      return `<article class="loadout-card"><b>Loadout ${index + 1}</b><span>${count ? `${count} relic${count === 1 ? '' : 's'} recorded` : 'Empty'}</span><div><button type="button" class="button compact ghost-compact" data-loadout-save="${index}">Save</button><button type="button" class="button compact" data-loadout-apply="${index}" ${count ? '' : 'disabled'}>Equip</button></div></article>`;
    }).join('');
    const sort = player.inventorySort ?? 'rarity';
    const runeMarkup = runeEntries.length ? runeEntries.map((rune) => `<button type="button" class="rune-card ${this.selectedRuneId === rune.id ? 'is-selected' : ''}" data-rune-id="${rune.id}"><span class="rune-art rune-art-${Math.max(0, RUNES.indexOf(rune))}" role="img" aria-label="${escapeHtml(rune.name)}"></span><b>${rune.name}</b><em>×${player.runes[rune.id]}</em><small>${rune.desc}</small></button>`).join('') : '<p class="empty-copy">Rare salvage can yield runes. Select one here, then inscribe it into a relic.</p>';
    const aspects = this.game.getAspectLibrary?.() ?? [];
    const aspectMarkup = aspects.length ? aspects.map((aspect) => `<button type="button" class="aspect-card ${aspect.unlocked ? '' : 'is-locked'} ${aspect.active ? 'is-active' : ''}" data-aspect-id="${aspect.id}" ${aspect.unlocked ? '' : 'disabled'}><span>${aspect.icon}</span><b>${escapeHtml(aspect.name)}</b><em>${aspect.active ? 'Attuned' : aspect.unlocked ? 'Available' : 'Unfound'}</em><small>${escapeHtml(aspect.effect)}</small></button>`).join('') : '<p class="empty-copy">Extract a unique relic from your pack to unlock its permanent covenant aspect.</p>';
    const codex = this.game.getLootCodex?.() ?? { sources: [], sets: [], pity: {}, target: null };
    const sourceMarkup = codex.sources.map((source) => {
      const entries = source.entries.map((entry) => `<button type="button" class="codex-target ${codex.target?.id === entry.id ? 'is-selected' : ''} ${entry.found ? 'is-found' : ''}" data-loot-target="${entry.id}"><span>${entry.icon}</span><b>${escapeHtml(entry.name)}</b><em>${entry.found ? `Found ×${entry.count}` : 'Unfound'}</em></button>`).join('');
      return `<article class="loot-source-card"><header><div><p>${source.found}/${source.total} uniques found</p><h4>${escapeHtml(source.name)}</h4></div><span>${escapeHtml(source.id === 'boss-hunt' ? `Boss pity ${codex.pity?.boss ?? 0}/4` : source.id === 'mythic-hunt' ? `Mythic pity ${codex.pity?.mythic ?? 0}/24` : '')}</span></header><p>${escapeHtml(source.detail)}</p><div class="codex-target-grid">${entries}</div></article>`;
    }).join('') || '<p class="empty-copy">Swear a covenant to reveal its target-farmable relics.</p>';
    const setMarkup = codex.sets.map((set) => `<article class="set-card ${set.active?.length ? 'is-active' : ''}"><p>${set.found}/${set.slots.length} pieces found</p><h4>${escapeHtml(set.name)}</h4><span>${set.bonuses.map((bonus) => `${bonus.pieces}pc ${escapeHtml(bonus.label)}`).join(' · ')}</span>${set.active?.length ? `<em>${set.active.map((bonus) => `${bonus.pieces}pc active`).join(' · ')}</em>` : ''}</article>`).join('');
    const aspectSlots = this.game.getAspectSlots?.() ?? 1;
    const activeSets = this.game.getActiveSetBonuses?.() ?? [];
    const activeSetCopy = activeSets.length ? activeSets.map((set) => `${set.setName} ${set.pieces}pc`).join(' · ') : 'No set bonuses active';
    const masterworkGuide = this.game.getMasterworkGuide?.() ?? { highestTier: 0, stages: [] };
    const masterworkMarkup = `<section class="masterwork-guide"><h3 class="section-heading">Endgame Masterworking <small>Highest clear: Tier ${masterworkGuide.highestTier}</small></h3><p>Masterwork Relics, Uniques, and Mythics through 12 ranks. Set a focus on an affix; ranks 4, 8, and 12 exalt that focus by 25%.</p><div>${masterworkGuide.stages.map((stage) => `<article class="masterwork-stage ${stage.unlocked ? 'is-unlocked' : ''}"><b>${escapeHtml(stage.name)} · ${stage.ranks[0]}–${stage.ranks[1]}</b><span>${stage.unlocked ? 'Unlocked' : `Level ${stage.level}${stage.tier ? ` · Tier ${stage.tier}` : ' · Chapter I'}`}</span><small>${escapeHtml(stage.detail)}</small></article>`).join('')}</div></section>`;
    const fated = this.game.getActiveFatedAffixes?.() ?? [];
    const fatedMarkup = fated.length
      ? `<section class="fated-affix-summary"><div><p class="eyebrow">Active fated effects</p><h3>${fated.length} build rule${fated.length === 1 ? '' : 's'} active</h3></div><div>${fated.map((affix) => `<article><b>${escapeHtml(affix.label)}</b><span>${escapeHtml(affix.effect)}</span><small>${escapeHtml(affix.itemName)}</small></article>`).join('')}</div></section>`
      : '<section class="fated-affix-summary is-empty"><div><p class="eyebrow">Active fated effects</p><h3>Find a Relic, Unique, or Mythic</h3></div><p>High-rarity drops now guarantee a Fated affix: a combat rule that can fork shots, create rifts, echo attacks, or change other live actions.</p></section>';
    const itemInspector = selectedEntry
      ? this.itemMarkup(selectedEntry.item, selectedEntry.label, { ...selectedEntry.options, selectedRune, comparisonItem, forge: this.inventoryMode === 'forge', showInventoryActions: this.inventoryMode === 'loadout' })
      : '<p class="empty-copy inventory-empty-inspector">Select an item when a drop reaches your pack.</p>';
    const tiles = (entries, empty) => entries.length
      ? entries.map((entry) => this.itemTileMarkup(entry, entry.item.id === this.selectedItemId)).join('')
      : `<p class="empty-copy">${empty}</p>`;
    const resourceStrip = `<section class="inventory-resources"><span><b>${player.gold}</b> gold</span><span><b>${materials.cinders}</b> cinders</span><span><b>${materials.shards}</b> shards</span><span><b>${materials.alloys}</b> alloys</span><span><b>${materials.echoes}</b> echoes</span><span><b>${materials.prisms}</b> prisms</span><span><b>${materials.cores}</b> apex cores</span></section>`;
    const modeTabs = `<nav class="inventory-mode-tabs" aria-label="Inventory views"><button type="button" class="${this.inventoryMode === 'loadout' ? 'is-active' : ''}" data-inventory-mode="loadout">Loadout</button><button type="button" class="${this.inventoryMode === 'forge' ? 'is-active' : ''}" data-inventory-mode="forge">Forge</button><button type="button" class="${this.inventoryMode === 'codex' ? 'is-active' : ''}" data-inventory-mode="codex">Codex</button></nav>`;
    const filterBar = `<section class="inventory-filterbar" aria-label="Filter inventory"><label class="inventory-search">${uiIcon('search')}<span class="sr-only">Search items</span><input id="inventory-search" type="search" value="${escapeHtml(this.inventoryQuery)}" placeholder="Search name, affix, or slot" autocomplete="off"></label><label>${uiIcon('filter')}<span class="sr-only">Rarity</span><select id="inventory-rarity-filter"><option value="all">All rarities</option>${Object.keys(RARITY_COLORS).map((rarity) => `<option value="${rarity}" ${this.inventoryRarityFilter === rarity ? 'selected' : ''}>${rarity[0].toUpperCase()}${rarity.slice(1)}</option>`).join('')}</select></label><label><span class="sr-only">Equipment slot</span><select id="inventory-slot-filter"><option value="all">All slots</option>${slotIds.map((slot) => `<option value="${escapeHtml(slot)}" ${this.inventorySlotFilter === slot ? 'selected' : ''}>${escapeHtml(slot[0].toUpperCase() + slot.slice(1))}</option>`).join('')}</select></label><button type="button" class="button compact ghost-compact" data-clear-inventory-filters ${(query || this.inventoryRarityFilter !== 'all' || this.inventorySlotFilter !== 'all') ? '' : 'disabled'}>Clear</button><output>${activeEntries.length} of ${rawActiveEntries.length}</output></section>`;
    const emptyInventory = query || this.inventoryRarityFilter !== 'all' || this.inventorySlotFilter !== 'all' ? 'No items match these filters.' : this.inventoryView === 'stash' ? 'The sanctuary stash is empty.' : 'The pack is empty. Defeat elites, events, and bosses for gear.';
    const loadoutPanel = `<section class="inventory-layout"><div class="inventory-shelves"><section><h3 class="section-heading">Equipped <small>${escapeHtml(activeSetCopy)}</small></h3><div class="item-shelf equipment-shelf">${tiles(equippedEntries, 'No gear equipped yet. Nearby drops are picked up automatically.')}</div></section><section class="inventory-tools"><div class="inventory-tabs"><button type="button" class="button compact ${this.inventoryView === 'pack' ? 'is-active' : ''}" data-inventory-view="pack">Pack ${pack.length}/${capacities.pack}</button><button type="button" class="button compact ${this.inventoryView === 'stash' ? 'is-active' : ''}" data-inventory-view="stash">Stash ${stash.length}/${capacities.stash}</button></div><div class="sort-controls"><span>Sort</span>${['rarity', 'slot', 'name'].map((mode) => `<button type="button" class="button compact ghost-compact ${sort === mode ? 'is-active' : ''}" data-sort-inventory="${mode}">${mode}</button>`).join('')}</div></section>${filterBar}<div class="item-shelf">${tiles(activeEntries, emptyInventory)}</div><section><h3 class="section-heading">Saved loadouts</h3><div class="loadout-grid">${loadouts}</div></section></div><aside class="item-inspector">${itemInspector}</aside></section>`;
    const forgePanel = `<section class="inventory-layout forge-layout"><div class="inventory-shelves"><section><h3 class="section-heading">Covenant forge</h3><div class="forge-recipe-grid"><button type="button" class="forge-recipe" data-craft-loot="rune"><b>Forge Rune</b><span>3 Forge Shards</span><small>Create one random rune.</small></button><button type="button" class="forge-recipe" data-craft-loot="relic"><b>Forge Relic</b><span>60 Cinders · 6 Shards</span><small>Create a source-marked Relic with a Fated affix.</small></button><button type="button" class="forge-recipe ${codex.target ? 'is-selected' : ''}" data-craft-loot="target"><b>${codex.target ? `Forge ${escapeHtml(codex.target.name)}` : 'Target Forge'}</b><span>120 Cinders · 8 Shards · 3 Echoes</span><small>${codex.target ? 'Creates the selected eligible unique.' : 'Select a unique in the Codex first.'}</small></button></div></section>${masterworkMarkup}<section><h3 class="section-heading">Rune satchel${selectedRune ? ` · ${escapeHtml(selectedRune.name)} selected` : ''}</h3><div class="rune-grid">${runeMarkup}</div></section><section><h3 class="section-heading">Choose an item</h3><div class="item-shelf">${tiles([...equippedEntries, ...packEntries, ...stashEntries], 'No relics available for forge work.')}</div></section></div><aside class="item-inspector">${itemInspector}</aside></section>`;
    const codexPanel = `<section class="inventory-codex">${fatedMarkup}<section><h3 class="section-heading">Aspect codex <small>${(player.attunedAspects ?? []).length}/${aspectSlots} attuned</small></h3><div class="aspect-grid">${aspectMarkup}</div></section><section><h3 class="section-heading">Loot Codex <small>Select a unique, then forge it from the Forge tab</small></h3><div class="loot-codex-grid">${sourceMarkup}</div></section><section><h3 class="section-heading">Covenant sets</h3><div class="set-grid">${setMarkup}</div></section></section>`;
    const panel = this.inventoryMode === 'forge' ? forgePanel : this.inventoryMode === 'codex' ? codexPanel : loadoutPanel;
    return { kicker: `${player.gold} gold · ${materials.cinders} Cinders · ${materials.shards} Forge Shards · ${materials.echoes} Oath Echoes`, title: 'Relics and covenant craft', content: `<p class="overlay-intro">Inspect one item at a time, then act with intent. Relics, Uniques, and Mythics guarantee a Fated affix that changes a combat action; the Forge is where you specialize its roll.</p>${resourceStrip}${modeTabs}${panel}` };
  }

  itemTileMarkup(entry, selected = false) {
    const { item, label } = entry;
    const color = RARITY_COLORS[item.rarity] ?? '#ccd4d8';
    const fated = (item.affixes ?? []).some((affix) => AFFIX_BY_STAT.get(affix?.stat)?.kind === 'fated');
    return `<button type="button" class="item-tile rarity-${escapeHtml(item.rarity ?? 'common')} ${selected ? 'is-selected' : ''}" style="--rarity:${color}" data-inspect-item-id="${escapeHtml(item.id)}" data-tooltip-title="${escapeHtml(item.name)}" data-tooltip-body="${escapeHtml(`${item.rarity ?? 'common'} ${item.slot ?? 'item'} · item level ${item.itemLevel ?? 1}`)}"><span class="item-art item-art-${item.art ?? 0}" role="img" aria-label="${escapeHtml(item.name)}"></span><span class="item-tile-copy"><b>${escapeHtml(item.name)}</b><small>${escapeHtml(label)} · ilvl ${item.itemLevel ?? 1}</small>${fated ? '<em>✦ Fated</em>' : ''}</span></button>`;
  }

  itemMarkup(item, location, options = {}) {
    const color = RARITY_COLORS[item.rarity] ?? '#ccd4d8';
    const itemId = escapeHtml(item.id);
    const comparison = options.comparisonItem;
    const itemLevelDelta = comparison ? Number(item.itemLevel ?? 1) - Number(comparison.itemLevel ?? 1) : 0;
    const comparisonCopy = comparison ? `<div class="item-comparison ${itemLevelDelta > 0 ? 'is-upgrade' : itemLevelDelta < 0 ? 'is-downgrade' : 'is-even'}"><span>${itemLevelDelta > 0 ? '↑' : itemLevelDelta < 0 ? '↓' : '↔'}</span><div><small>Compared with equipped ${escapeHtml(comparison.slot ?? item.slot)}</small><b>${itemLevelDelta > 0 ? '+' : ''}${itemLevelDelta} item levels</b><em>${escapeHtml(comparison.name)}</em></div></div>` : '';
    const masterwork = this.game.getMasterworkState?.(item) ?? { rank: item.masterwork ?? 0, maxRank: 12, stage: { name: 'Foundry' }, focusIndex: 0, exalts: [], milestone: false, eligibility: { ok: false }, costs: null };
    const affixes = (Array.isArray(item.affixes) ? item.affixes : []).map((affix, index) => {
      const value = affix.percentage ? `${affix.value >= 0 ? '+' : ''}${Math.round(affix.value * 100)}%` : `${affix.value >= 0 ? '+' : ''}${Math.round(affix.value)}`;
      const focused = masterwork.focusIndex === index;
      const exaltCount = (masterwork.exalts ?? []).filter((focus) => focus === index).length;
      const definition = AFFIX_BY_STAT.get(affix.stat);
      const fated = definition?.kind === 'fated';
      const focusControl = options.forge && ['relic', 'unique', 'mythic'].includes(item.rarity) ? `<button type="button" class="affix-focus ${focused ? 'is-focused' : ''}" data-masterwork-focus-id="${itemId}" data-masterwork-focus-index="${index}">${focused ? 'Focused' : 'Focus'}</button>` : '';
      return `<li class="${focused ? 'is-masterwork-focus' : ''} ${fated ? 'is-fated' : ''}"><b>${fated ? '✦ ' : ''}${escapeHtml(affix.label)} ${value}</b><small>T${affix.tier ?? 1}${exaltCount ? ` · ✦${exaltCount}` : ''}</small>${fated ? `<small class="affix-effect">${escapeHtml(definition.effect)}</small>` : ''}${focusControl}</li>`;
    }).join('');
    const locked = this.game.isItemLocked?.(item.id) ?? Boolean(this.game.player.itemLocks?.[item.id]);
    const implicit = item.implicit ? `${item.implicit.percentage ? `${item.implicit.value >= 0 ? '+' : ''}${Math.round(item.implicit.value * 100)}%` : `${item.implicit.value >= 0 ? '+' : ''}${Math.round(item.implicit.value)}`} ${item.implicit.label}` : '';
    const runeIds = Array.isArray(item.runeIds) && item.runeIds.length ? item.runeIds : item.runeId ? [item.runeId] : [];
    const runes = runeIds.map((runeId) => runeById(runeId)).filter(Boolean);
    const bond = this.game.getRelicBond?.(item);
    const bondState = bond ? `<em class="item-state bond">Bond ${bond.rank}/3${bond.rank < bond.maxRank ? ` · ${bond.xp}/${bond.nextXp}` : ''}</em>${bond.awakening ? `<em class="item-state awakened">${escapeHtml(bond.awakening.name)}</em>` : ''}` : '';
    const set = item.setId ? this.game.getLootCodex?.().sets?.find((entry) => entry.id === item.setId) : null;
    const masterworkCopy = ['relic', 'unique', 'mythic'].includes(item.rarity) ? `<em class="item-state masterwork">${escapeHtml(masterwork.stage?.name ?? 'Foundry')} ${masterwork.rank}/${masterwork.maxRank}${masterwork.milestone ? ' · breakthrough next' : ''}</em>` : '';
    const state = `${implicit ? `<em class="item-state implicit">◈ ${escapeHtml(implicit)}</em>` : ''}<em class="item-state quality">${escapeHtml(item.quality ?? 'worn')} · ${escapeHtml(item.rarity ?? 'common')}</em>${item.setId ? `<em class="item-state set">${escapeHtml(set?.name ?? item.setId)} set</em>` : ''}${locked ? '<em class="item-state locked">Locked</em>' : ''}${item.tempered ? `<em class="item-state tempered">Tempered ×${item.tempered}</em>` : ''}${masterworkCopy}${runes.map((rune, index) => `<em class="item-state rune">${rune.icon} ${escapeHtml(rune.name)} <button type="button" class="rune-remove" data-unsocket-item-id="${itemId}" data-unsocket-index="${index}" aria-label="Remove ${escapeHtml(rune.name)}">×</button></em>`).join('')}${bondState}${item.corruption ? `<em class="item-state corrupted">${escapeHtml(item.corruption)}</em>` : ''}`;
    const awakeningCopy = bond?.awakening ? ` ${bond.awakening.desc}` : '';
    const masterworkButton = ['relic', 'unique', 'mythic'].includes(item.rarity) ? `<button type="button" class="button compact ghost-compact" data-masterwork-id="${itemId}" ${masterwork.rank >= masterwork.maxRank ? 'disabled' : ''}>Masterwork ${masterwork.rank}/${masterwork.maxRank}</button>` : '';
    const committed = masterwork.rank > 0;
    const inventoryActions = (options.showInventoryActions ?? true) ? `${options.canEquip ? `<button type="button" class="button compact" data-equip-id="${itemId}">Equip</button>` : ''}${options.equippedSlot ? `<button type="button" class="button compact ghost-compact" data-unequip-slot="${escapeHtml(options.equippedSlot)}">Unequip</button>` : ''}${options.canStash ? `<button type="button" class="button compact ghost-compact" data-stash-id="${itemId}">Stash</button>` : ''}${options.canRetrieve ? `<button type="button" class="button compact ghost-compact" data-retrieve-id="${itemId}">Retrieve</button>` : ''}<button type="button" class="button compact ghost-compact" data-lock-id="${itemId}">${locked ? 'Unlock' : 'Lock'}</button>${options.canExtract ? `<button type="button" class="button compact ghost-compact" data-extract-aspect-id="${itemId}" ${locked ? 'disabled' : ''}>Extract aspect</button>` : ''}${options.canSalvage ? `<button type="button" class="button compact ghost-compact" data-salvage-id="${itemId}" ${locked ? 'disabled' : ''}>Salvage</button>` : ''}` : '';
    const forgeActions = options.forge ? `<button type="button" class="button compact ghost-compact" data-reforge-id="${itemId}" ${committed ? 'disabled' : ''}>Reforge</button><button type="button" class="button compact ghost-compact" data-temper-id="${itemId}" ${committed ? 'disabled' : ''}>Temper</button><button type="button" class="button compact ghost-compact" data-infuse-id="${itemId}">Infuse</button><button type="button" class="button compact ghost-compact" data-open-socket-id="${itemId}" ${item.sockets >= 3 ? 'disabled' : ''}>Open socket</button>${masterworkButton}${options.selectedRune ? `<button type="button" class="button compact ghost-compact" data-inscribe-item-id="${itemId}">Inscribe ${escapeHtml(options.selectedRune.name)}</button>` : ''}<button type="button" class="button compact ghost-compact" data-corrupt-id="${itemId}" ${item.corruption ? 'disabled' : ''}>Corrupt</button>` : '';
    return `<article class="item-card item-inspector-card rarity-${item.rarity}" style="--rarity:${color}">${comparisonCopy}<div class="item-art item-art-${item.art ?? 0}" role="img" aria-label="${escapeHtml(item.name)}"></div><div><p>${escapeHtml(location)} · Item level ${item.itemLevel ?? 1} · ${runes.length}/${item.sockets ?? 0} sockets</p><h4>${escapeHtml(item.name)}</h4>${affixes ? `<ul>${affixes}</ul>` : ''}${state}<span>${escapeHtml(`${item.description}${awakeningCopy}`)}</span></div>${inventoryActions || forgeActions ? `<div class="item-actions">${inventoryActions}${forgeActions}</div>` : ''}</article>`;
  }

  campaignOverlay() {
    const journal = this.game.getCampaignJournal?.();
    if (!journal) return { kicker: 'The road', title: 'Campaign journal', content: '<p class="empty-copy">Begin a covenant to open the journal.</p>' };
    const { chapter, stage, progress, completed, chapters } = journal;
    const stages = (chapter.stages ?? []).map((entry, index) => {
      const active = entry.id === stage?.id;
      const done = completed || (chapter.stages?.findIndex((item) => item.id === stage?.id) ?? 0) > index;
      const state = active ? 'is-active' : done ? 'is-complete' : 'is-locked';
      const counter = active ? `${Math.min(entry.total, progress)}/${entry.total}` : done ? 'Complete' : '—';
      return `<li class="campaign-stage ${state}"><span class="campaign-stage-mark">${done ? '✓' : active ? '✦' : '•'}</span><span><b>${escapeHtml(entry.title)}</b><small>${escapeHtml(entry.detail)}</small></span><em>${escapeHtml(counter)}</em></li>`;
    }).join('');
    const chaptersMarkup = chapters.map((entry) => `<article class="campaign-chapter-card ${entry.active ? 'is-active' : ''} ${entry.discovered ? '' : 'is-locked'}" ${entry.artwork ? `style="--campaign-art:${assetCssUrl(entry.artwork)}"` : ''}><p>Chapter ${escapeHtml(entry.number)}</p><h3>${escapeHtml(entry.title)}</h3><span>${escapeHtml(entry.status ?? (entry.completed ? 'Complete' : entry.active ? 'In progress' : entry.discovered ? 'Discovered' : 'Beyond the road'))}</span><small>${escapeHtml(entry.summary)}</small></article>`).join('');
    return {
      kicker: completed ? `Chapter ${chapter.number} complete` : `Chapter ${chapter.number} · In progress`,
      title: 'Campaign journal',
      content: `<section class="campaign-hero" style="--campaign-art:${assetCssUrl(chapter.artwork)}"><div><p class="eyebrow">Chapter ${escapeHtml(chapter.number)}</p><h3>${escapeHtml(chapter.title)}</h3><p>${escapeHtml(chapter.summary)}</p></div></section><section class="campaign-objective"><div><p class="eyebrow">Current objective</p><h3>${escapeHtml(stage?.title ?? 'The road waits')}</h3><p>${escapeHtml(stage?.detail ?? '')}</p></div><strong>${Math.min(stage?.total ?? 1, progress)}/${stage?.total ?? 1}</strong></section><ol class="campaign-stages">${stages}</ol><section><h3 class="section-heading">Road ahead</h3><div class="campaign-chapter-grid">${chaptersMarkup}</div></section>`
    };
  }

  campaignDialogueOverlay() {
    const packet = this.campaignDialogue;
    const dialogue = packet?.dialogue;
    const chapter = packet?.journal?.chapter;
    if (!dialogue || !chapter) return { kicker: 'The road', title: 'Campaign', content: '<p class="empty-copy">The road is quiet.</p>' };
    return {
      kicker: dialogue.speaker,
      title: dialogue.title,
      content: `<section class="campaign-dialogue" style="--campaign-art:${assetCssUrl(chapter.artwork)}"><div class="campaign-dialogue-shade"></div><div class="campaign-dialogue-copy">${dialogue.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}<button type="button" class="button primary campaign-continue" data-campaign-dialogue-continue="${escapeHtml(packet.id)}">Continue</button></div></section>`
    };
  }

  campaignChoiceOverlay() {
    const journal = this.game.getCampaignJournal?.();
    const verdict = this.game.getChoirVerdict?.();
    const chapter = journal?.chapter;
    if (!chapter) return { kicker: 'The broken choir', title: 'The Names That Remain', content: '<p class="empty-copy">The reliquary is quiet.</p>' };
    if (verdict) {
      const bound = verdict === 'bind-choir';
      return {
        kicker: 'A verdict has been made',
        title: bound ? 'The choir is bound' : 'The choir is severed',
        content: `<section class="campaign-choice-scene" style="--campaign-art:${assetCssUrl(chapter.artwork)}"><div><p>${bound ? 'The names become a ward around the covenant. Rath Vell can still call guardians, but the choir will turn aside part of his toll.' : 'The names leave the bell as a final weapon. Rath Vell’s guard is exposed in later phases, and his elite servants replenish your Confluence.'}</p></div></section>`
      };
    }
    return {
      kicker: 'Reliquary of Names',
      title: 'The Names That Remain',
      content: `<p class="overlay-intro">This choice is persistent for this covenant and changes the Bell Vault encounter as well as the unique relic you earn. Choose the answer that fits how you want this build to play.</p><section class="campaign-choice-grid" style="--campaign-art:${assetCssUrl(chapter.artwork)}"><button class="campaign-verdict-card bind" type="button" data-choir-verdict="bind-choir"><span>♮</span><b>Bind the Choir</b><em>Defensive path</em><small>The choir becomes a ward: stronger barriers and reduced ward damage. At Abbot phase shifts it clears nearby hazards, but he calls Bellscar guardians. Earn <i>Vigil of the Bound Choir</i>.</small></button><button class="campaign-verdict-card sever" type="button" data-choir-verdict="sever-choir"><span>♬</span><b>Sever the Choir</b><em>Offensive path</em><small>Turn the final names against the bell: more power, critical chance, and stagger. Rath Vell becomes exposed in later phases. Earn <i>Last Peal of Bellscar</i>.</small></button></section>`
    };
  }

  metamorphosisOverlay() {
    const view = this.game.getMetamorphosisSnapshot?.() ?? { covenant: null, mutations: { abilities: [] }, hunters: [], regionalEvents: [], bossDiscoveries: [] };
    const covenant = view.covenant ?? {};
    const presentation = covenant.effects?.presentation ?? {};
    const mutations = view.mutations?.abilities ?? [];
    const mutationCards = mutations.map((ability) => {
      const selected = ability.mutations?.find((mutation) => mutation.selected) ?? null;
      const available = ability.mutations?.filter((mutation) => mutation.unlocked).length ?? 0;
      return `<article class="metamorphosis-mutation"><header><b>${escapeHtml(ability.abilityId)}</b><span>${available}/${ability.mutations?.length ?? 0} unlocked</span></header><p>${selected ? `${escapeHtml(selected.name)} · ${escapeHtml(selected.description)}` : 'No mutation selected yet.'}</p></article>`;
    }).join('');
    const hunters = view.hunters.length ? view.hunters.map((hunter) => `<article class="metamorphosis-hunter"><header><b>${escapeHtml(hunter.name)}</b><span>Grudge ${hunter.grudge}</span></header><p>${escapeHtml(hunter.factionId)} Hunter · ${hunter.adaptations.length ? hunter.adaptations.map(escapeHtml).join(' · ') : 'No learned adaptations'}</p><small>Known bounty: ${escapeHtml(hunter.targetRewardId ?? 'unknown')}</small></article>`).join('') : '<p class="empty-copy">No Hunter has learned your road yet.</p>';
    const events = view.regionalEvents.length ? view.regionalEvents.map((event) => `<article class="metamorphosis-event"><b>${escapeHtml(event.name ?? event.typeId)}</b><span>${escapeHtml(event.zoneId)} · ${Math.round(event.progress ?? 0)}/${Math.round(event.target ?? 0)}</span></article>`).join('') : '<p class="empty-copy">No regional pressure is currently active.</p>';
    const bosses = view.bossDiscoveries.length ? view.bossDiscoveries.map((entry) => `<li>${escapeHtml(entry.replace('boss:', ''))}</li>`).join('') : '<li>No Covenant boss variants recorded.</li>';
    const primary = covenant.primary ? covenant.primary[0].toUpperCase() + covenant.primary.slice(1) : 'Unbound';
    const secondary = covenant.secondary ? ` + ${covenant.secondary[0].toUpperCase() + covenant.secondary.slice(1)}` : '';
    return {
      kicker: `${primary}${secondary} · Stage ${covenant.stage ?? 0} · Instability ${Math.round(covenant.instability ?? 0)}%`,
      title: 'Covenant Metamorphosis',
      content: `<section class="metamorphosis-hero"><div><p class="eyebrow">Current form</p><h3>${escapeHtml(primary + secondary)}</h3><p>Stage ${covenant.stage ?? 0} changes combat rules, regional pressure, boss variants, rewards, and Sanctuary presentation.</p></div><dl><div><dt>Aura</dt><dd>${escapeHtml(presentation.aura ?? 'Dormant')}</dd></div><div><dt>Eyes</dt><dd>${escapeHtml(presentation.eyes ?? 'Unchanged')}</dd></div><div><dt>Weapon</dt><dd>${escapeHtml(presentation.weapon ?? 'Unchanged')}</dd></div><div><dt>Movement</dt><dd>${escapeHtml(presentation.movement ?? 'Unchanged')}</dd></div></dl></section><section class="board-section"><header><div><p class="eyebrow">Mechanical mutations</p><h3>Ability forms</h3></div><span>${view.mutations?.credits ?? 0} mutation credits</span></header><div class="metamorphosis-mutation-grid">${mutationCards}</div></section><section class="board-section"><header><div><p class="eyebrow">Persistent adversaries</p><h3>Named Hunters</h3></div><span>${view.hunters.length}</span></header><div class="metamorphosis-hunter-grid">${hunters}</div></section><section class="board-section"><header><div><p class="eyebrow">Living world</p><h3>Regional pressure</h3></div><span>${view.regionalEvents.length} active</span></header><div class="metamorphosis-event-grid">${events}</div></section><section class="board-section"><header><div><p class="eyebrow">Discovered variants</p><h3>Boss memory</h3></div></header><ul class="metamorphosis-discoveries">${bosses}</ul></section>`
    };
  }

  mapOverlay() {
    const playerZone = zoneText(this.game.player.x, this.game.player.y);
    const atlas = this.game.getWorldAtlas?.() ?? { districts: [], waypoints: [], lore: [], delves: [] };
    const currentDistrict = this.game.getDistrict?.();
    const expeditions = this.game.getBlackRoadAtlas?.() ?? [];
    const roadSummary = this.game.getRequiemOverview?.()?.blackRoad;
    const metamorphosis = this.game.getMetamorphosisSnapshot?.() ?? { hunters: [], regionalEvents: [] };
    return { kicker: currentDistrict ? `${currentDistrict.name} · ${playerZone}` : `Currently in ${playerZone}`, title: 'Atlas of the Black Road', content: `<section class="black-road-command"><div><p class="eyebrow">Five expeditions · twenty sealed rooms</p><h3>Choose one road. Clear one room at a time.</h3><p>Each route is a formation, an objective chamber, a lieutenant, and a multi-phase boss. Midway, choose a boon that changes the rest of the descent.</p></div><dl><div><dt>Clears</dt><dd>${roadSummary?.totalClears ?? 0}</dd></div><div><dt>Bosses</dt><dd>${roadSummary?.bossesDefeated ?? 0}</dd></div><div><dt>Active</dt><dd>${roadSummary?.active ? escapeHtml(roadSummary.name) : 'Sanctuary'}</dd></div></dl></section><div class="world-map black-road-map">${ZONES.map((zone) => {
      const progress = this.game.getZoneProgress?.(zone.id);
      const districts = atlas.districts.filter((district) => district.zoneId === zone.id);
      const districtCount = districts.filter((district) => district.discovered).length;
      const waypoint = atlas.waypoints.find((entry) => entry.zoneId === zone.id);
      const loreCount = atlas.lore.filter((entry) => entry.zoneId === zone.id && entry.discovered).length;
      const delveCount = atlas.delves.filter((entry) => entry.zoneId === zone.id && entry.clears > 0).length;
      const expedition = expeditions.find((entry) => entry.zoneId === zone.id);
      const activePressure = metamorphosis.regionalEvents.filter((event) => event.zoneId === zone.id);
      const hunterCount = metamorphosis.hunters.filter((hunter) => !hunter.defeated && ((zone.id === 'gravewake' || zone.id === 'bellscar') ? hunter.factionId === 'grave' : zone.id === 'redfen' ? hunter.factionId === 'blood' : zone.id === 'cairnreach' ? hunter.factionId === 'iron' : zone.id === 'veiled-road' ? hunter.factionId === 'void' : false)).length;
      const pressureBadges = [...activePressure.map((event) => `<span class="atlas-pressure-badge">${escapeHtml(event.name ?? event.typeId)}</span>`), ...(hunterCount ? [`<span class="atlas-pressure-badge hunter">Hunter ${hunterCount}</span>`] : [])].join('');
      const status = zone.safe ? 'Safe' : progress?.liberated ? `Liberated · ${progress.corruption}% corruption` : `${progress?.corruption ?? Math.min(60, zone.level * 3)}% corruption`;
      if (!expedition) return `<article class="map-zone sanctuary-map-zone ${zone.name === playerZone ? 'is-current' : ''}" style="--zone:${zone.color};--terrain:${assetCssUrl(zone.terrain)}"><header><div><h3>${escapeHtml(zone.name)}</h3><span>Preparation ground · ${status}</span></div></header><p>${escapeHtml(zone.description)} Restore flasks, inspect relics, change difficulty, then choose an expedition.</p>${pressureBadges ? `<div class="atlas-pressure-row">${pressureBadges}</div>` : ''}<div class="map-metrics"><b>${districtCount}/${districts.length || 5}<small>districts</small></b><b>${loreCount}<small>chronicles</small></b><b>${delveCount}<small>delves</small></b></div></article>`;
      const stageList = expedition.stages.map((stage) => `<li class="${stage.cleared ? 'is-cleared' : ''}"><span>${stage.number}</span><div><b>${escapeHtml(stage.name)}</b><small>${escapeHtml(stage.type === 'formation' ? 'Formation' : stage.type === 'ritual' ? 'Objective chamber' : stage.type === 'lieutenant' ? 'Lieutenant' : 'Boss')}</small></div></li>`).join('');
      const record = expedition.record;
      const best = record.bestTime ? `${Math.round(record.bestTime)}s best` : 'Uncleared';
      const action = expedition.active ? '<button class="expedition-launch is-active" type="button" disabled>Expedition in progress</button>' : `<button class="expedition-launch" type="button" data-black-road="${escapeHtml(expedition.id)}" ${expedition.unlocked ? '' : 'disabled'}>${expedition.unlocked ? record.clears ? 'Descend again' : 'Begin expedition' : `Level ${Math.max(1, expedition.recommendedLevel - 4)} required`}</button>`;
      return `<article class="map-zone black-road-zone ${zone.name === playerZone ? 'is-current' : ''} ${expedition.active ? 'is-expedition-active' : ''}" style="--zone:${expedition.color};--terrain:${assetCssUrl(zone.terrain)}"><header><div><p>${expedition.icon} Black Road</p><h3>${escapeHtml(expedition.name)}</h3><span>Recommended ${expedition.recommendedLevel} · ${escapeHtml(status)}</span></div>${waypoint?.discovered && !expedition.active ? `<button class="map-travel" type="button" data-fast-travel="${escapeHtml(zone.id)}">Travel</button>` : ''}</header><p>${escapeHtml(expedition.summary)}</p>${pressureBadges ? `<div class="atlas-pressure-row">${pressureBadges}</div>` : ''}<ol class="expedition-stage-list">${stageList}</ol><footer><span>${record.clears} clear${record.clears === 1 ? '' : 's'} · ${best} · Heat ${record.highestHeat}</span>${action}</footer></article>`;
    }).join('')}</div><p class="overlay-intro">The overworld remains for campaign landmarks, waystones, strongholds, and lore. Combat expeditions are instanced into sealed rooms so every encounter has a readable beginning, objective, and end.</p>` };
  }

  endgameOverlay() {
    const player = this.game.player;
    const records = player.endgameRecords ?? {};
    const recordText = (id) => records[id]?.bestTier ? `Best tier ${records[id].bestTier} · ${records[id].clears} clears${records[id].fastest ? ` · ${Math.round(records[id].fastest)}s best` : ''}` : 'No clear recorded';
    const contracts = this.game.getContractBoard?.() ?? { active: [], available: [], limit: 3, ledger: null, caches: [] };
    const factions = this.game.getFactionProgress?.() ?? [];
    const delves = this.game.getDelves?.() ?? [];
    const selectedTier = Math.max(1, Math.min(50, records.abyss?.bestTier ?? player.level));
    const tabs = `<nav class="operations-tabs" aria-label="Operations Board views"><button type="button" data-operations-view="contracts" class="${this.operationsView === 'contracts' ? 'is-active' : ''}">Contracts <b>${contracts.active.filter((entry) => entry.ready).length}</b></button><button type="button" data-operations-view="operations" class="${this.operationsView === 'operations' ? 'is-active' : ''}">Operations</button><button type="button" data-operations-view="factions" class="${this.operationsView === 'factions' ? 'is-active' : ''}">Factions</button></nav>`;
    const zoneName = (zoneId) => ZONES.find((zone) => zone.id === zoneId)?.name ?? zoneId;
    const contractSteps = (contract) => `<ol class="contract-steps">${contract.steps.map((step, index) => {
      const complete = contract.ready || contract.completedSteps?.includes(index);
      const current = index === contract.stepIndex && !contract.ready;
      const amount = complete ? step.target : current ? contract.progress : 0;
      return `<li class="${complete ? 'is-complete' : ''} ${current ? 'is-current' : ''}"><span>${complete ? '✓' : index + 1}</span><div><b>${escapeHtml(step.name)}</b><small>${amount}/${step.target} ${escapeHtml(step.unit)}</small></div></li>`;
    }).join('')}</ol>`;
    const clauseTags = (contract) => contract.clauseDetails?.length ? `<div class="contract-clauses">${contract.clauseDetails.map((clause) => `<span title="${escapeHtml(clause.description)}">${escapeHtml(clause.name)}</span>`).join('')}</div>` : '<div class="contract-clauses is-clear"><span>Clear terms</span></div>';
    const bonusLine = (contract) => contract.bonus ? `<div class="contract-bonus ${contract.bonus.failed ? 'is-failed' : contract.bonus.complete ? 'is-complete' : ''}"><span>${contract.bonus.failed ? '×' : contract.bonus.complete ? '✓' : '◇'}</span><div><b>${escapeHtml(contract.bonus.name)}</b><small>${escapeHtml(contract.bonus.description)}${['execution', 'elite'].includes(contract.bonus.type) ? ` · ${contract.bonus.progress}/${contract.bonus.target}` : ''}</small></div></div>` : '';
    const rewardLine = (contract) => `<div class="contract-reward"><span><b>${Number(contract.gold).toLocaleString()}</b> gold</span><span><b>${contract.renown}</b> renown</span><span><b>${contract.seals}</b> seals</span><span><b>${contract.materialAmount}</b> ${escapeHtml(contract.material)}</span></div>`;
    const activeContractCard = (contract) => {
      const launch = !contract.ready && contract.currentStep?.type === 'operation' ? `<button type="button" data-contract-launch="${escapeHtml(contract.id)}">Launch sealed mission</button>` : '';
      const claim = contract.ready ? `<button type="button" data-contract-claim="${escapeHtml(contract.id)}">Claim payment</button>` : '';
      const pin = contracts.pinnedId === contract.id ? '<span class="contract-pinned">Tracked</span>' : `<button type="button" class="quiet-action" data-contract-pin="${escapeHtml(contract.id)}">Track</button>`;
      return `<article class="active-writ ${contract.ready ? 'is-ready' : ''}" style="--contract:${contract.difficultyColor}"><header><div><span>${escapeHtml(contract.difficulty)} · ${escapeHtml(zoneName(contract.zoneId))}</span><h4>${escapeHtml(contract.name)}</h4></div><strong>${contract.ready ? 'READY' : `${contract.stepNumber}/${contract.totalSteps}`}</strong></header><p>${escapeHtml(contract.flavor)}</p>${contractSteps(contract)}${clauseTags(contract)}${bonusLine(contract)}${rewardLine(contract)}<footer>${claim}${launch}${pin}<button type="button" class="quiet-action danger" data-contract-abandon="${escapeHtml(contract.id)}">Abandon</button></footer></article>`;
    };
    const offerCard = (contract) => `<article class="writ-offer" style="--contract:${contract.difficultyColor}"><header><span>${escapeHtml(contract.difficultyIcon)}</span><div><small>${escapeHtml(contract.difficulty)} · ${escapeHtml(zoneName(contract.zoneId))}</small><h4>${escapeHtml(contract.name)}</h4></div><b>${contract.totalSteps} step${contract.totalSteps === 1 ? '' : 's'}</b></header><p>${escapeHtml(contract.flavor)}</p>${clauseTags(contract)}${bonusLine(contract)}${rewardLine(contract)}<footer><small>${contract.completions ?? 0} prior completion${contract.completions === 1 ? '' : 's'}</small><button type="button" data-contract-accept="${escapeHtml(contract.id)}" ${contracts.active.length >= contracts.limit ? 'disabled' : ''}>Accept writ</button></footer></article>`;
    let body = '';
    if (this.operationsView === 'contracts') {
      const ledger = contracts.ledger;
      const offers = contracts.available.filter((contract) => (this.contractRegionFilter === 'all' || contract.zoneId === this.contractRegionFilter) && (this.contractDifficultyFilter === 'all' || contract.difficultyId === this.contractDifficultyFilter));
      const regionOptions = ZONES.filter((zone) => !zone.safe).map((zone) => `<option value="${escapeHtml(zone.id)}" ${this.contractRegionFilter === zone.id ? 'selected' : ''}>${escapeHtml(zone.name)}</option>`).join('');
      const difficultyOptions = ledger.difficulties.filter((difficulty) => difficulty.unlocked).map((difficulty) => `<option value="${escapeHtml(difficulty.id)}" ${this.contractDifficultyFilter === difficulty.id ? 'selected' : ''}>${escapeHtml(difficulty.name)}</option>`).join('');
      const history = ledger.history.length ? ledger.history.slice(0, 8).map((entry) => `<li><span>${entry.bonus ? '✦' : '◇'}</span><div><b>${escapeHtml(entry.name)}</b><small>${escapeHtml(entry.difficulty)} · ${escapeHtml(zoneName(entry.zoneId))}</small></div><em>+${entry.seals} seals</em></li>`).join('') : '<li class="empty-copy">Completed orders will be recorded here.</li>';
      const caches = contracts.caches.map((cache) => `<article class="seal-cache ${cache.unlocked ? '' : 'is-locked'}"><div><span>✦</span><small>${cache.unlocked ? `${cache.cost} seals` : `Ledger ${cache.minRank}`}</small></div><h4>${escapeHtml(cache.name)}</h4><p>${escapeHtml(cache.description)}</p><button type="button" data-contract-cache="${escapeHtml(cache.id)}" ${cache.unlocked && ledger.seals >= cache.cost ? '' : 'disabled'}>${cache.unlocked ? `Open · ${cache.cost}` : 'Locked'}</button></article>`).join('');
      body = `<section class="contract-command" style="--contract:#d8bd70"><div><p class="eyebrow">Contract Ledger ${ledger.rank}/${ledger.maxRank}</p><h3>${escapeHtml(ledger.name)}</h3><p>${escapeHtml(ledger.reward)}</p><i><b style="width:${Math.round(ledger.progress * 100)}%"></b></i><small>${ledger.rank >= ledger.maxRank ? `${ledger.xp.toLocaleString()} mastery XP · maximum rank` : `${ledger.xp.toLocaleString()} / ${ledger.nextXp.toLocaleString()} mastery XP`}</small></div><dl><div><dt>Seals</dt><dd>${ledger.seals}</dd></div><div><dt>Streak</dt><dd>${ledger.streak}</dd></div><div><dt>Best</dt><dd>${ledger.bestStreak}</dd></div><div><dt>Slots</dt><dd>${contracts.active.length}/${contracts.limit}</dd></div></dl></section><section class="board-section contract-active-section"><header><div><p class="eyebrow">Pinned to your HUD</p><h3>Active writs</h3></div><span>${contracts.active.filter((entry) => entry.ready).length} ready to claim</span></header><div class="active-writ-grid">${contracts.active.length ? contracts.active.map(activeContractCard).join('') : '<p class="empty-copy">Accept a regional order below. Every writ can be completed alongside campaign, exploration, events, and delves.</p>'}</div></section><section class="board-section contract-market"><header><div><p class="eyebrow">Board cycle ${ledger.cycle + 1}</p><h3>Available orders</h3></div><button type="button" class="board-refresh" data-contract-refresh>Turn board · ${ledger.freeRefreshes ? `${ledger.freeRefreshes} free` : `${ledger.refreshCost.toLocaleString()} gold`}</button></header><div class="contract-filters"><label>Region<select id="contract-region-filter"><option value="all">All regions</option>${regionOptions}</select></label><label>Difficulty<select id="contract-difficulty-filter"><option value="all">All unlocked</option>${difficultyOptions}</select></label><span>${offers.length}/${contracts.available.length} offers shown</span></div><div class="writ-offer-grid">${offers.length ? offers.map(offerCard).join('') : '<p class="empty-copy">No current offers match those filters. Turn the board or broaden the search.</p>'}</div></section><section class="board-section seal-exchange"><header><div><p class="eyebrow">Targeted rewards</p><h3>Seal Exchange</h3></div><span>${ledger.seals} seals available</span></header><div class="seal-cache-grid">${caches}</div></section><section class="board-section contract-history"><header><div><p class="eyebrow">Last eight payments</p><h3>Ledger history</h3></div><span>Best streak ${ledger.bestStreak}</span></header><ul>${history}</ul></section>`;
    } else if (this.operationsView === 'operations') {
      body = `<section class="board-command"><div><p class="overlay-intro">Choose a tier once, then launch any operation. Tier 20 adds a second world modifier; tier 35 adds a third. Every mode has its own encounter structure, regional loot, faction renown, and persistent records.</p></div><label class="tier-picker">Operation tier <input id="endgame-tier" type="number" min="1" max="50" value="${selectedTier}"></label></section><div class="activity-grid expanded">${ENDGAME_ACTIVITIES.map((activity) => `<button data-endgame="${escapeHtml(activity.id)}" type="button"><b>${activity.icon} ${escapeHtml(activity.name)}</b><span>${escapeHtml(activity.description)}<small>${recordText(activity.id)}</small></span></button>`).join('')}</div><section class="board-section"><header><div><p class="eyebrow">Hand-built descents</p><h3>Regional delves</h3></div><span>${delves.length} locations</span></header><div class="delve-grid">${delves.map((delve) => `<article class="${delve.unlocked ? '' : 'is-locked'}"><span>${delve.icon}</span><div><h4>${escapeHtml(delve.name)}</h4><p>${escapeHtml(delve.description)}</p><small>Level ${delve.level} · ${delve.waves} waves · ${delve.clears ?? 0} clears${delve.bestTier ? ` · best ${delve.bestTier}` : ''}</small></div><button type="button" data-delve-start="${escapeHtml(delve.id)}" ${delve.unlocked ? '' : 'disabled'}>${delve.unlocked ? 'Descend' : 'Locked'}</button></article>`).join('')}</div></section>`;
    } else {
      const ledger = contracts.ledger;
      const difficultyRoad = ledger.difficulties.map((difficulty) => `<article class="contract-difficulty ${difficulty.unlocked ? 'is-unlocked' : ''}" style="--contract:${difficulty.color}"><span>${escapeHtml(difficulty.icon)}</span><div><h4>${escapeHtml(difficulty.name)}</h4><p>${difficulty.stepCount} objective stages · ${difficulty.clauseCount} risk clauses${difficulty.operation ? ' · sealed finale' : ''}</p><small>${difficulty.unlocked ? 'Unlocked' : `Level ${difficulty.minLevel} · Ledger ${difficulty.minRank}`}</small></div></article>`).join('');
      body = `<section class="board-section"><header><div><p class="eyebrow">Persistent alliances</p><h3>Faction renown</h3></div><span>${factions.filter((faction) => faction.rank >= faction.maxRank).length}/${factions.length} exalted</span></header><div class="faction-grid">${factions.map((faction) => `<article style="--faction:${faction.color}"><span>${faction.icon}</span><div><h4>${escapeHtml(faction.name)} <small>Rank ${faction.rank}/${faction.maxRank}</small></h4><p>${escapeHtml(faction.description)}</p><i><b style="width:${Math.round(faction.rankProgress * 100)}%"></b></i><em>${faction.rank >= faction.maxRank ? 'Exalted' : `${faction.renown}/${faction.next} renown`}</em></div></article>`).join('')}</div></section><section class="board-section"><header><div><p class="eyebrow">The contract road</p><h3>Writ difficulty</h3></div><span>Ledger ${ledger.rank}/${ledger.maxRank}</span></header><div class="contract-difficulty-grid">${difficultyRoad}</div></section>`;
    }
    return {
      kicker: `${contracts.active.length}/${contracts.limit} contracts active · ${contracts.ledger?.seals ?? 0} seals · streak ${contracts.ledger?.streak ?? 0}`,
      title: 'Covenant Operations Board',
      content: `${tabs}${body}`
    };
  }

  handleOverlayChange(event) {
    const target = event.target;
    if (target.id === 'inventory-rarity-filter') {
      this.inventoryRarityFilter = target.value;
      this.renderOverlayContent('inventory');
      return;
    }
    if (target.id === 'inventory-slot-filter') {
      this.inventorySlotFilter = target.value;
      this.renderOverlayContent('inventory');
      return;
    }
    if (target.id === 'chronicle-item-select') {
      this.chronicleItemId = target.value;
      this.renderOverlayContent('chronicle');
      return;
    }
    if (target.id === 'contract-region-filter') {
      this.contractRegionFilter = target.value;
      this.renderOverlayContent('endgame');
      return;
    }
    if (target.id === 'contract-difficulty-filter') {
      this.contractDifficultyFilter = target.value;
      this.renderOverlayContent('endgame');
      return;
    }
    if (target.dataset.paragonSocket !== undefined) {
      if (this.game.socketParagonGlyph?.(target.dataset.paragonSocket, target.value || null)) this.renderOverlayContent('journey');
      return;
    }
    if (target.id === 'debug-music-intensity') {
      this.game.presentation?.forceMusicIntensity?.(target.value);
      this.renderOverlayContent('presentation-debug');
      return;
    }
    if (target.id === 'requiem-difficulty') {
      this.game.setRequiemDifficulty?.(target.value);
      this.renderOverlayContent(this.overlay);
      return;
    }
    const rangeSettings = {
      'master-volume': 'masterVolume', 'music-volume': 'musicVolume', 'sfx-volume': 'sfxVolume',
      'dialogue-volume': 'dialogueVolume', 'ambience-volume': 'ambienceVolume', 'music-intensity': 'dynamicMusicIntensity',
      'camera-shake': 'cameraShakeScale', 'hit-stop': 'hitStopScale', 'ui-scale': 'uiScale', 'hud-opacity': 'hudOpacity'
    };
    const toggleSettings = {
      'stinger-toggle': 'reducedStingers', 'motion-toggle': 'reducedMotion', 'flashing-toggle': 'reducedFlashing',
      'background-audio-toggle': 'backgroundAudio', 'mute-unfocused-toggle': 'muteWhenUnfocused',
      'streamer-safe-toggle': 'streamerSafeMusic', 'presentation-debug-toggle': 'presentationDebug',
      'high-contrast-toggle': 'highContrast', 'minimap-toggle': 'showMinimap', 'combat-hud-focus-toggle': 'combatHudFocus', 'control-hints-toggle': 'showControlHints'
    };
    if (rangeSettings[target.id]) {
      this.settings[rangeSettings[target.id]] = Number(target.value);
      const output = target.closest('label')?.querySelector('output');
      if (output) output.textContent = `${Math.round(Number(target.value) * 100)}%`;
    } else if (toggleSettings[target.id]) this.settings[toggleSettings[target.id]] = target.checked;
    else if (target.id === 'vfx-toggle') this.settings.reducedVfx = target.checked;
    else if (target.id === 'sound-toggle') {
      this.settings.sound = target.checked;
      if (target.checked) this.audio?.unlock();
    } else if (target.id === 'aim-assist-toggle') this.settings.aimAssist = target.checked;
    else if (target.id === 'graphics-quality') this.settings.graphicsQuality = target.value;
    else if (target.id === 'loot-filter') this.settings.lootFilter = target.value;
    else if (target.id === 'hud-mode') this.settings.hudMode = target.value;
    else if (target.id === 'combat-music-frequency') this.settings.combatMusicFrequency = target.value;
    else return;
    this.game.settings = { ...this.game.settings, ...this.settings };
    if (this.game.presentation) {
      this.game.presentation.settings.presentationDebug = this.settings.presentationDebug === true;
      this.game.presentation.releaseDebugAllowed = this.settings.presentationDebug === true || Boolean(import.meta?.env?.DEV);
      if (!this.game.presentation.releaseDebugAllowed) this.game.presentation.toggleDebug(false);
    }
    this.audio?.applySettings?.();
    this.applyUiPreferences();
    saveSettings(this.settings);
  }

  handleOverlayInput(event) {
    const target = event.target;
    if (target.id !== 'inventory-search') return;
    this.inventoryQuery = target.value.slice(0, 80);
    const selectionStart = target.selectionStart ?? this.inventoryQuery.length;
    this.renderOverlayContent('inventory');
    const replacement = this.root.querySelector('#inventory-search');
    replacement?.focus?.({ preventScroll: true });
    replacement?.setSelectionRange?.(selectionStart, selectionStart);
  }

  handleOverlayClick(event) {
    const target = event.target.closest('button, input');
    if (!target) return;
    if (target.hasAttribute('data-confirm-action')) {
      this.confirmPendingAction();
      return;
    }
    if (target.hasAttribute('data-cancel-action')) {
      this.cancelConfirmation();
      return;
    }
    if (target.dataset.debugImpact) {
      this.game.presentation?.requestImpact?.(target.dataset.debugImpact, { x: this.game.player.x, y: this.game.player.y, priority: 10 });
      this.renderOverlayContent('presentation-debug');
      return;
    }
    if (target.dataset.debugStinger) {
      this.game.presentation?.emit?.('music:stinger', { id: target.dataset.debugStinger }, { source: 'debug-panel', priority: 10 });
      this.renderOverlayContent('presentation-debug');
      return;
    }
    if (target.hasAttribute('data-debug-enemy-attack')) {
      const enemy = this.game.entities.enemies.filter((entry) => !entry.dead).sort((a, b) => Math.hypot(a.x - this.game.player.x, a.y - this.game.player.y) - Math.hypot(b.x - this.game.player.x, b.y - this.game.player.y))[0];
      if (enemy) this.game._startEnemyAttack?.(enemy);
      this.renderOverlayContent('presentation-debug');
      return;
    }
    if (target.hasAttribute('data-debug-boss-phase')) {
      const boss = this.game.getBoss?.();
      if (boss && boss.phase < 3) {
        boss.phase += 1; boss.phaseAnnounced = boss.phase;
        this.game.emit?.('boss-phase', { enemy: boss, phase: boss.phase });
      }
      this.renderOverlayContent('presentation-debug');
      return;
    }
    if (target.hasAttribute('data-debug-step')) {
      const state = this.game.state;
      this.game.state = 'playing'; this.game._updateStep?.(1 / 30); this.game.state = state;
      this.renderOverlayContent('presentation-debug');
      return;
    }
    if (target.hasAttribute('data-debug-export')) {
      const data = JSON.stringify(this.game.presentation?.getDebugSnapshot?.() ?? {}, null, 2);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      link.download = `ashen-presentation-${Date.now()}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      return;
    }
    if (target.dataset.chronicleView) {
      this.chronicleView = target.dataset.chronicleView;
      this.renderOverlayContent('chronicle');
      return;
    }
    if (target.dataset.worldOath) {
      if (this.game.setWorldOath?.(target.dataset.worldOath)) this.renderOverlayContent('chronicle');
      return;
    }
    if (target.dataset.hybridChoice) {
      if (this.game.chooseHybridMutation?.(Number(target.dataset.hybridTier), target.dataset.hybridChoice)) this.renderOverlayContent('chronicle');
      return;
    }
    if (target.dataset.masteryEvolutionPath) {
      if (this.game.investMasteryEvolution?.(target.dataset.masteryEvolutionSlot, target.dataset.masteryEvolutionPath)) this.renderOverlayContent('chronicle');
      return;
    }
    if (target.dataset.masteryEvolutionRespec) {
      if (this.game.respecMasteryEvolution?.(target.dataset.masteryEvolutionRespec)) this.renderOverlayContent('chronicle');
      return;
    }
    if (target.dataset.relicMemory) {
      if (this.game.chooseRelicMemory?.(target.dataset.relicMemoryItem, target.dataset.relicMemory)) this.renderOverlayContent('chronicle');
      return;
    }
    if (target.dataset.relicMemoryRewrite) {
      if (this.game.rewriteRelicMemories?.(target.dataset.relicMemoryRewrite)) this.renderOverlayContent('chronicle');
      return;
    }
    if (target.dataset.forgeFocus) {
      if (this.game.setForgeFocus?.(target.dataset.forgeFocus)) this.renderOverlayContent('chronicle');
      return;
    }
    if (target.dataset.forgeTechnique) {
      const overview = this.game.getReforgedOverview?.();
      const item = overview?.relics.find((entry) => entry.id === this.chronicleItemId) ?? overview?.relics[0];
      const runeId = Object.keys(this.game.player?.runes ?? {}).find((id) => (this.game.player.runes[id] ?? 0) >= 3) ?? item?.runeIds?.[0];
      const options = { itemId: item?.id, index: 0, family: 'offense', runeId, baseId: item?.baseId, sourceId: item?.sourceId ?? 'stronghold' };
      if (this.game.useForgeTechnique?.(target.dataset.forgeTechnique, options)) this.renderOverlayContent('chronicle');
      else this.toast('That technique needs a compatible target or more materials.', 'warning');
      return;
    }
    if (target.dataset.factionDoctrine) {
      if (this.game.chooseFactionDoctrine?.(target.dataset.factionDoctrineId, target.dataset.factionDoctrine)) this.renderOverlayContent('chronicle');
      return;
    }
    if (target.dataset.factionPledge) {
      if (this.game.pledgeFaction?.(target.dataset.factionPledge)) this.renderOverlayContent('chronicle');
      return;
    }
    if (target.dataset.factionDirective) {
      if (this.game.claimFactionDirective?.(target.dataset.factionDirectiveId, target.dataset.factionDirective)) this.renderOverlayContent('chronicle');
      return;
    }
    if (target.dataset.factionOffer) {
      if (this.game.purchaseFactionOffer?.(target.dataset.factionOffer)) this.renderOverlayContent('chronicle');
      return;
    }
    if (target.dataset.strongholdProject) {
      if (this.game.investStronghold?.(target.dataset.strongholdId, target.dataset.strongholdProject)) this.renderOverlayContent('chronicle');
      return;
    }
    if (target.dataset.eventOutcome) {
      if (this.game.chooseEventArcOutcome?.(target.dataset.eventArc, target.dataset.eventOutcome)) this.renderOverlayContent('chronicle');
      return;
    }
    if (target.dataset.eclipseNode) {
      if (this.game.allocateEclipseNode?.(target.dataset.eclipseNode)) this.renderOverlayContent('chronicle');
      return;
    }
    if (target.dataset.bestiaryInsight) {
      if (this.game.chooseBestiaryInsight?.(target.dataset.bestiaryFamily, target.dataset.bestiaryInsight)) this.renderOverlayContent('chronicle');
      return;
    }
    if (target.dataset.decree) {
      if (this.game.chooseCampaignDecree?.(target.dataset.decreeChapter, target.dataset.decree)) this.renderOverlayContent('chronicle');
      return;
    }
    if (target.dataset.expeditionRoute) {
      if (this.game.chooseExpeditionRoute?.(target.dataset.expeditionRoute)) this.hideOverlay(true);
      return;
    }
    if (target.dataset.pinnacle) {
      const type = target.dataset.pinnacle;
      this.hideOverlay(true);
      if (!this.game.startPinnacle?.(type)) {
        this.chronicleView = 'endgame';
        this.showOverlay('chronicle');
      }
      return;
    }
    if (target.dataset.operationsView) {
      this.operationsView = target.dataset.operationsView;
      this.renderOverlayContent('endgame');
      return;
    }
    if (target.dataset.journeyView) {
      this.journeyView = target.dataset.journeyView;
      this.renderOverlayContent('journey');
      return;
    }
    if (target.dataset.journeyBand) {
      this.journeyBandId = target.dataset.journeyBand;
      this.renderOverlayContent('journey');
      return;
    }
    if (target.dataset.paragonBoard) {
      this.paragonBoardId = target.dataset.paragonBoard;
      this.renderOverlayContent('journey');
      return;
    }
    if (target.dataset.paragonUnlock) {
      if (this.game.unlockParagonBoard?.(target.dataset.paragonUnlock)) this.renderOverlayContent('journey');
      return;
    }
    if (target.dataset.paragonNode) {
      if (this.game.allocateParagonNode?.(target.dataset.paragonNode)) this.renderOverlayContent('journey');
      return;
    }
    if (target.dataset.paragonGlyphUpgrade) {
      if (this.game.upgradeParagonGlyph?.(target.dataset.paragonGlyphUpgrade)) this.renderOverlayContent('journey');
      return;
    }
    if (target.dataset.paragonRespec !== undefined) {
      if (this.game.respecParagon?.()) this.renderOverlayContent('journey');
      return;
    }
    if (target.dataset.journeyClaim) {
      if (this.game.claimJourneyReward?.(target.dataset.journeyClaim, false)) this.renderOverlayContent('journey');
      return;
    }
    if (target.dataset.journeyMastery) {
      if (this.game.claimJourneyReward?.(target.dataset.journeyMastery, true)) this.renderOverlayContent('journey');
      return;
    }
    if (target.dataset.pillarInvest) {
      if (this.game.investPillar?.(target.dataset.pillarInvest)) this.renderOverlayContent('journey');
      return;
    }
    if (target.dataset.pillarRespec !== undefined) {
      if (this.game.respecPillars?.()) this.renderOverlayContent('journey');
      return;
    }
    if (target.dataset.ascensionChoice) {
      if (this.game.chooseAscension?.(Number(target.dataset.ascensionLevel), target.dataset.ascensionChoice)) this.renderOverlayContent('journey');
      return;
    }
    if (target.dataset.ascensionRespec !== undefined) {
      if (this.game.respecAscensions?.()) this.renderOverlayContent('journey');
      return;
    }
    if (target.dataset.legacyInvest) {
      if (this.game.investLegacy?.(target.dataset.legacyInvest)) this.renderOverlayContent('journey');
      return;
    }
    if (target.dataset.inventoryMode) {
      this.inventoryMode = target.dataset.inventoryMode;
      this.renderOverlayContent('inventory');
      return;
    }
    if (target.hasAttribute('data-clear-inventory-filters')) {
      this.inventoryQuery = '';
      this.inventoryRarityFilter = 'all';
      this.inventorySlotFilter = 'all';
      this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.inspectItemId) {
      this.selectedItemId = target.dataset.inspectItemId;
      this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.campaignDialogueContinue) {
      const dialogueId = target.dataset.campaignDialogueContinue;
      this.game.acknowledgeCampaignDialogue?.(dialogueId);
      if (dialogueId !== 'reliquary-awakens') this.hideOverlay();
      return;
    }
    if (target.dataset.choirVerdict) {
      this.game.chooseChoirVerdict?.(target.dataset.choirVerdict);
      return;
    }
    if (target.dataset.skillId) {
      if (this.game.upgradeSkill(target.dataset.skillId)) this.renderOverlayContent('skills');
      return;
    }
    if (target.dataset.refundSkillId) {
      if (this.game.refundSkill?.(target.dataset.refundSkillId)) this.renderOverlayContent('skills');
      return;
    }
    if (target.dataset.masteryDoctrine) {
      if (this.game.selectMasteryDoctrine?.(target.dataset.masterySlot, target.dataset.masteryDoctrine)) this.renderOverlayContent('mastery');
      return;
    }
    if (target.dataset.imprintId) {
      if (this.game.selectImprint?.(target.dataset.imprintSlot, target.dataset.imprintId)) this.renderOverlayContent('imprints');
      return;
    }
    if (target.dataset.equipId) {
      if (this.game.equipItem(target.dataset.equipId)) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.unequipSlot) {
      if (this.game.unequipItem?.(target.dataset.unequipSlot)) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.stashId) {
      if (this.game.stashItem?.(target.dataset.stashId)) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.retrieveId) {
      if (this.game.retrieveItem?.(target.dataset.retrieveId)) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.lockId) {
      if (this.game.toggleItemLock?.(target.dataset.lockId)) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.runeId) {
      this.selectedRuneId = this.selectedRuneId === target.dataset.runeId ? null : target.dataset.runeId;
      this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.inscribeItemId) {
      if (!this.selectedRuneId) {
        this.toast('Select a rune from the satchel first.', 'warning');
      } else if (this.game.inscribeRune?.(target.dataset.inscribeItemId, this.selectedRuneId)) {
        this.renderOverlayContent('inventory');
      }
      return;
    }
    if (target.dataset.unsocketItemId) {
      if (this.game.unsocketRune?.(target.dataset.unsocketItemId, Number(target.dataset.unsocketIndex))) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.openSocketId) {
      if (this.game.openSocket?.(target.dataset.openSocketId)) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.infuseId) {
      if (this.game.infuseAffix?.(target.dataset.infuseId)) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.craftLoot) {
      if (this.game.craftLoot?.(target.dataset.craftLoot)) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.lootTarget) {
      if (this.game.selectLootTarget?.(target.dataset.lootTarget)) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.inventoryView) {
      this.inventoryView = target.dataset.inventoryView;
      this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.sortInventory) {
      if (this.game.sortInventory?.(target.dataset.sortInventory)) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.loadoutSave !== undefined) {
      if (this.game.saveLoadout?.(Number(target.dataset.loadoutSave))) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.loadoutApply !== undefined) {
      if (this.game.applyLoadout?.(Number(target.dataset.loadoutApply))) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.reforgeId) {
      if (this.game.reforgeItem(target.dataset.reforgeId)) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.temperId) {
      if (this.game.temperItem(target.dataset.temperId)) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.masterworkFocusId) {
      if (this.game.setMasterworkFocus?.(target.dataset.masterworkFocusId, Number(target.dataset.masterworkFocusIndex))) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.masterworkId) {
      if (this.game.masterworkItem?.(target.dataset.masterworkId)) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.corruptId) {
      if (this.game.corruptItem(target.dataset.corruptId)) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.salvageId) {
      const id = target.dataset.salvageId;
      const item = [...(this.game.player.inventory ?? []), ...(this.game.player.stash ?? []), ...Object.values(this.game.player.equipment ?? {})].find((entry) => entry?.id === id);
      this.requestConfirmation({ title: 'Salvage this relic?', message: `${item?.name ?? 'This item'} will be dismantled for materials and cannot be recovered.`, confirmLabel: 'Salvage item', tone: 'danger', action: () => this.game.salvageItem(id) });
      return;
    }
    if (target.dataset.extractAspectId) {
      const id = target.dataset.extractAspectId;
      const item = [...(this.game.player.inventory ?? []), ...(this.game.player.stash ?? []), ...Object.values(this.game.player.equipment ?? {})].find((entry) => entry?.id === id);
      this.requestConfirmation({ title: 'Extract this Aspect?', message: `${item?.name ?? 'This item'} will be consumed permanently and its power will enter the Aspect Codex.`, confirmLabel: 'Extract Aspect', tone: 'danger', action: () => this.game.extractAspect?.(id) });
      return;
    }
    if (target.dataset.aspectId) {
      if (this.game.attuneAspect?.(target.dataset.aspectId)) this.renderOverlayContent('inventory');
      return;
    }
    if (target.dataset.blackRoad) {
      const expeditionId = target.dataset.blackRoad;
      this.hideOverlay();
      if (!this.game.startBlackRoadExpedition?.(expeditionId)) this.showOverlay('map');
      return;
    }
    if (target.dataset.fastTravel) {
      if (this.game.fastTravel?.(target.dataset.fastTravel)) this.hideOverlay();
      return;
    }
    if (target.dataset.contractRefresh !== undefined) {
      if (this.game.refreshContractBoard?.()) this.renderOverlayContent('endgame');
      return;
    }
    if (target.dataset.contractAccept) {
      if (this.game.acceptContract?.(target.dataset.contractAccept)) this.renderOverlayContent('endgame');
      return;
    }
    if (target.dataset.contractPin) {
      if (this.game.pinContract?.(target.dataset.contractPin)) this.renderOverlayContent('endgame');
      return;
    }
    if (target.dataset.contractCache) {
      if (this.game.purchaseContractCache?.(target.dataset.contractCache)) this.renderOverlayContent('endgame');
      return;
    }
    if (target.dataset.contractLaunch) {
      const contractId = target.dataset.contractLaunch;
      this.hideOverlay();
      if (!this.game.startContractMission?.(contractId)) this.showOverlay('endgame');
      return;
    }
    if (target.dataset.contractClaim) {
      if (this.game.claimContract?.(target.dataset.contractClaim)) this.renderOverlayContent('endgame');
      return;
    }
    if (target.dataset.contractAbandon) {
      const id = target.dataset.contractAbandon;
      const contract = this.game.getContractBoard?.()?.active?.find((entry) => entry.id === id);
      this.requestConfirmation({ title: 'Abandon this writ?', message: `${contract?.name ?? 'This contract'} will leave the ledger and the current payment streak may be broken.`, confirmLabel: 'Abandon writ', tone: 'danger', action: () => this.game.abandonContract?.(id) });
      return;
    }
    if (target.dataset.delveStart) {
      const tier = this.root.querySelector('#endgame-tier')?.value;
      const delveId = target.dataset.delveStart;
      this.hideOverlay();
      if (!this.game.startDelve?.(delveId, tier)) this.showOverlay('endgame');
      return;
    }
    if (target.dataset.endgame) {
      const tier = this.root.querySelector('#endgame-tier')?.value;
      const activity = target.dataset.endgame;
      this.hideOverlay();
      if (!this.game.startEndgame(activity, tier)) this.showOverlay('endgame');
      return;
    }
    if (target.id === 'vfx-toggle') {
      this.settings.reducedVfx = target.checked;
      saveSettings(this.settings);
      return;
    }
    if (target.id === 'sound-toggle') {
      this.settings.sound = target.checked;
      if (target.checked) this.audio?.unlock();
      saveSettings(this.settings);
      return;
    }
    if (target.dataset.overlayAction === 'confirm-new-run') {
      const selection = this.pendingNewRun;
      this.pendingNewRun = null;
      this.hideOverlay();
      this.startSelectedRun(selection);
      return;
    }
    if (target.dataset.overlayAction === 'cancel-new-run') {
      this.pendingNewRun = null;
      this.hideOverlay();
      return;
    }
    if (target.dataset.overlayAction === 'resume') this.hideOverlay();
    if (target.dataset.overlayAction === 'imprints') this.showOverlay('imprints');
    if (target.dataset.overlayAction === 'mastery') this.showOverlay('mastery');
    if (target.dataset.overlayAction === 'sanctuary') { this.game.returnToSanctuary(); this.hideOverlay(); }
    if (target.dataset.overlayAction === 'title') {
      this.game.save();
      this.game.state = 'menu';
      if (this.game.presentation) { this.game.presentation.musicOverride = null; this.game.presentation.characterClassOverride = null; }
      this.elements.hud.classList.add('is-hidden');
      this.elements.title.classList.remove('is-hidden');
      this.hideOverlay();
      this.refreshSaveSummary();
      this.elements.continue.focus?.({ preventScroll: true });
    }
  }

  maybeShowTooltip(target) {
    const trigger = target?.closest?.('[data-tooltip-title]');
    if (!trigger || trigger === this.tooltipTarget) return;
    this.tooltipTarget = trigger;
    const tooltip = this.elements.tooltip;
    tooltip.querySelector('strong').textContent = trigger.dataset.tooltipTitle ?? '';
    tooltip.querySelector('span').textContent = trigger.dataset.tooltipBody ?? '';
    tooltip.classList.remove('is-hidden');
    const rect = trigger.getBoundingClientRect?.() ?? { left: 0, top: 0, right: 0, bottom: 0, width: 0 };
    const tipRect = tooltip.getBoundingClientRect?.() ?? { width: 260, height: 70 };
    const viewportWidth = window.innerWidth || 1280;
    const viewportHeight = window.innerHeight || 720;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(12, Math.min(viewportWidth - tipRect.width - 12, left));
    let top = rect.top - tipRect.height - 10;
    if (top < 12) top = Math.min(viewportHeight - tipRect.height - 12, rect.bottom + 10);
    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  }

  hideTooltip() {
    this.tooltipTarget = null;
    this.elements?.tooltip?.classList.add('is-hidden');
  }

  toast(message, tone = 'normal') {
    const copy = String(message ?? '');
    const existing = [...this.elements.toast.children].find((entry) => entry.dataset.message === copy && !entry.classList.contains('is-leaving'));
    if (existing) {
      existing.classList.remove('is-bumped');
      void existing.offsetWidth;
      existing.classList.add('is-bumped');
      return;
    }
    while (this.elements.toast.children.length >= 4) this.elements.toast.firstElementChild?.remove();
    const toast = document.createElement('div');
    toast.className = `toast toast-${tone}`;
    toast.dataset.message = copy;
    if (tone === 'warning' || tone === 'danger') toast.setAttribute('role', 'alert');
    const mark = document.createElement('span');
    mark.className = 'toast-mark';
    mark.innerHTML = uiIcon(tone === 'warning' || tone === 'danger' ? 'warning' : tone === 'accent' ? 'spark' : 'check');
    const body = document.createElement('span');
    body.className = 'toast-copy';
    body.textContent = copy;
    const life = document.createElement('i');
    life.className = 'toast-life';
    toast.append(mark, body, life);
    this.elements.toast.append(toast);
    window.setTimeout(() => toast.classList.add('is-leaving'), 3600);
    window.setTimeout(() => toast.remove(), 4100);
  }
}

const zoneText = (x, y) => ZONES.find((zone) => x >= zone.x && y >= zone.y && x <= zone.x + zone.width && y <= zone.y + zone.height)?.name ?? 'The Ash Road';
