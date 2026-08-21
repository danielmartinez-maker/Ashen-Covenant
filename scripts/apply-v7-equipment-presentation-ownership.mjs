import fs from 'node:fs';

const url = new URL('../src/presentation/system.js', import.meta.url);
let source = fs.readFileSync(url, 'utf8');
const replaceExactlyOnce = (label, before, after) => {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: source pattern not found`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: source pattern matched more than once`);
  source = source.slice(0, first) + after + source.slice(first + before.length);
};

replaceExactlyOnce(
  'equipment resolver import',
  "import { PresentationCombatContextResolver } from './combat-context-v7.js';\n",
  "import { PresentationCombatContextResolver } from './combat-context-v7.js';\nimport { EquipmentAppearanceResolver } from './equipment-appearance-v7.js';\n"
);
replaceExactlyOnce(
  'equipment resolver constructor',
  "    this.animationClipResolver = new AnimationClipResolver();\n",
  "    this.animationClipResolver = new AnimationClipResolver();\n    this.equipmentAppearanceResolver = new EquipmentAppearanceResolver();\n"
);
replaceExactlyOnce(
  'live equipment appearance resolution',
  "      presentation.combatContext = combatContext;\n      presentation.resolvedClip = resolvedClip;\n",
  "      presentation.combatContext = combatContext;\n      presentation.resolvedClip = resolvedClip;\n      presentation.equipmentAppearance = this.equipmentAppearanceResolver.resolve(\n        this.game.player.equipment,\n        this.game.player.covenantPresentation ?? combatContext.covenantIdentity,\n        { reducedVfx: this.settings.reducedVfx === true }\n      );\n"
);
replaceExactlyOnce(
  'equipment debug snapshot',
  "      locomotion: this.game?.player?.presentation?.locomotion ?? null, resolvedClip: this.game?.player?.presentation?.resolvedClip ?? null,\n",
  "      locomotion: this.game?.player?.presentation?.locomotion ?? null, resolvedClip: this.game?.player?.presentation?.resolvedClip ?? null,\n      equipmentAppearance: { cache: this.equipmentAppearanceResolver.debug(), currentKey: this.game?.player?.presentation?.equipmentAppearance?.key ?? null },\n"
);

fs.writeFileSync(url, source);
console.log('Applied v7 live equipment appearance ownership to GamePresentationSystem.');
