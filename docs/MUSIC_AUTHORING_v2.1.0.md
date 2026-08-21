# Adaptive Music Authoring Guide

## Asset status

The shipped 2.1 score is original procedural Web Audio synthesis and is a placeholder demonstration of the full adaptive system. It is not a final recorded soundtrack. Every cue retains `assetStatus: procedural-placeholder-original` so content reports and debug UI cannot misrepresent it.

Final composer deliveries should be licensed original work: 48 kHz, 24-bit WAV; stereo unless a mono source is appropriate; identical sample length for synchronized stems; exact tempo, meter, loop start/end, transition points, release tail, reference mix, per-stem files, target loudness, and rights metadata.

## Add a region

1. Add a `REGION_MUSIC_IDENTITIES` record with root, mode, texture name, and day/night silence ranges.
2. Create exploration, combat, and dungeon cues with the region ID. Settlement identity may use the region exploration record with `Settlement` context.
3. Supply day/night/weather-compatible stem variants or procedural rules.
4. Test region transitions under silence, combat, menus, fast travel, dungeon entry/exit, death, and save/load.
5. Add every cue to the music matrix.

Regional identity should change interval language, texture, rhythm, orchestration, and silence—not only transpose one generic loop.

## Add a cue

Use the cue helper or equivalent serializable record. Required production metadata includes:

- ID, display name, region/biome, context tags, priority and weight;
- minimum/maximum intensity, tempo, meter, bars and sections;
- loop points, transition mode, minimum play time, cooldown, repeat limit;
- stems, day/night/weather/class/quest rules when relevant;
- streaming and preloading policy, loudness metadata, and asset status.

The database must select the cue without a new manager code branch. Always provide a regional or global fallback.

## Add stems and sections

All stems in one cue must share sample length, tempo, meter, loop boundaries, and phase. Each stem declares a role, entry intensity, gain, and procedural pattern or imported asset. Existing roles are drone, texture, harmony, pulse, percussion, brass, choir, climax, depth, motif, and class color.

Use sections such as intro, exploration A/B, suspense, combat entry, combat A/B, escalation, climax, release, outro, and post-combat decay. Add compatible transition points on beat, half-bar, bar, two bars, or four bars. Immediate transitions are reserved for death, mandatory cinematics, loading, and restoration from death.

## Boss scoring

Create one cue per major boss. Encode boss identity through motif, tempo/meter, mode, and orchestration. Phase increases should add or transform layers instead of only raising volume. Phase-transition stings align with the authoritative phase event. Stagger caps intensity to thin percussion/choir without sounding victorious. Defeat begins the impact, crossfades the next context under short silence, then allows reward/narrative music.

On revive, keep the boss ID and phase in context. The same encounter must not replay `boss-reveal`; the boss cue must return immediately from death rather than waiting for a bar boundary.

## Add a stinger

Define stable ID, priority, cooldown, notes or final asset, duration, gain, and timbre. Reward stingers trigger at item spawn, not pickup. Higher-priority one-shots suppress lower-priority collisions; per-ID cooldowns prevent duplicate drops, phase events, and UI actions from stacking. Reduced-stinger mode suppresses noncritical stingers.

## Mix and streaming

The runtime exposes music, exploration, combat, boss, choir-ready stem roles, percussion-ready stem roles, stingers, cinematic, UI, dialogue, abilities, enemy abilities, ambience, footsteps, impacts, and destruction routing. Current procedural cues are always resident and cannot underrun. Imported assets should be classified as always resident, region-preloaded, streamed, on-demand, cached, or released. Never decode or open files on the combat-critical path.

Target integrated loudness is currently documented at -19 LUFS for placeholders; final mastering may revise it after dialogue/SFX mix review. Dialogue/cinematics use the separate duck gain, so changing duck state must never overwrite the user music-volume gain.

## Rights and streamer safety

Only original or properly licensed assets may enter the cue database. Store licensing confirmation with the cue. The `streamerSafeMusic` rule must exclude any future asset without explicit broadcast/streaming rights. Never copy themes, stems, MIDI, orchestration, recordings, or sound assets from commercial games.

## Validation

Run `npm run test:presentation`. Validation checks duplicate IDs, tempo/meter, intensity ranges, transition modes, stems, gains, production metadata, fallbacks, context coverage, stinger shape, history/cooldowns, quantization, boss restore, and procedural asset labels. Test imported WAV loops separately for sample-accurate length and click-free boundaries.
