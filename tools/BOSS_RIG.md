# Boss Rig 01

Open `dist/boss-rig-preview.html` through an HTTP server. The GitHub Pages route is
`/sketchman-browser/boss-rig-preview.html`. The standalone preview remains independent. The game also renders this rig during live boss combat.

## Source and reconstruction

Source: `ENM_EnemyBOSS_Idle_01`, HAZ_Enemies_1.png, rectangle (177,319,121,169).
The source is a flattened frame, not a layered character file. `boss-rig.js` masks
original head, upper torso, legs, upper/lower arms and hands into cached canvases.
The lower torso, covered joints, receiver/stock and pump have reconstructed artwork.
The muzzle retains original source pixels. Reconstruction is intentionally explicit:
this is not a claim that all of the source's hidden artwork was recovered.

The lower-body piece remains planted. This is an upper-body shotgun rig; independent
walking/running legs and finger articulation are outside this rig's scope.

## API

```js
import {loadBossRig, PRESETS} from './boss-rig.js';
const rig = await loadBossRig(); // once, after document is available
ctx.save();
ctx.translate(x, y);
ctx.scale(scale, scale);
rig.draw(ctx, {...PRESETS.raised, pump: 0.5}, {joints: false});
ctx.restore();
```

Coordinate space: original trimmed 121 x 169 sprite. Torso pivot: (75,98).
For matching the game's untrimmed 180 x 180 frame, the atlas trim offset is (23,5).
Use the game's `drawFrame` anchor convention before integrating into combat.

Front chain: shoulder (85,53), lengths 30 and 17. Rear chain: shoulder (65,53),
lengths 21 and 24. Firing wrist controls grip; gun angle rotates around that grip.
Support target is (-51 + 11*pump, 1) in weapon space. `release` blends to a free
support-hand target. Pump travel is 11 source pixels. Two-bone IK keeps fixed
bone lengths. Unreachable controls are clamped and reported via `error`.

Controls: gripX/gripY, angle (radians), pump (0..1), release (0..1), lean/head
(radians). `sampleRig(seconds)` supplies a six-second readiness/recoil/lift/pump/
release verification cycle. This is not the final spin-and-cock choreography.

## Validation

`node --test tests/boss-rig.test.mjs`: full loop sampled at 120 Hz, bone lengths,
wrist contact, pump tracking, release, unreachable targets and seamless cycle.
Original and five rig poses were rendered with the actual Canvas drawing module
and visually inspected. The integration changes the boss rendering and synchronized sound cues; damage, cadence, hitboxes and jump-to-hit behavior are preserved.
Browser interaction and physical phone testing remain separate from these checks.

## Combat integration — BOSS RIG SYNC 01

`boss-shot-animation.js` maps simulation `shotAge` to recoil, lift, two pump strokes
and recovery. The fixed-step volley event resets the animation and triggers fire
audio. A single fixed-step cue plays the existing BossCockShotgun sample at the
pump marker. Both samples decode during the loading screen. Faster encounters
compress motion and cocking audio together, leaving a ready stance before the
next volley. No wall-clock timers drive combat animation or sound events.

`?bossTest=1` provides immediate combat after Play / weapon selection. Test runs
skip mission rewards, score/coin writes and equipped item consumption. Existing
menu purchases and explicit equipment selections retain their normal behavior.
Normal play also uses the new rig. Death retains original death frames.

The muzzle is calibrated to the original projectile spawn (boss.x-160,boss.y-100).
All 82 tests pass, including 20/30/60/120 FPS sync, rapid encounters, death cue
termination and preloaded audio immediate-start checks. A composite render
verified placement on the original jeep; phone audio latency remains device-dependent.
