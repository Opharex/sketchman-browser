# APK reference audit — normal runs and animation

Reference: user-supplied `sketchman-1-0-5.apk` (Sketchman 1.0.5). This environment has no Android device, emulator, or Android execution service. No claim of live APK playtesting is made; the evidence below comes from its bytecode and assets. Browser runs and automated simulations validate the reimplementation.

## Separate the tutorial

`com.blitpop.dragon.s` invokes `aboard.b()` only for the first-run / explicit tutorial flag. `TWeaponDispenser.b(float)` advances its clock normally for standard play and by four times the elapsed milliseconds in tutorial mode. `the.b()` also skips purchased consumables while the tutorial flag is active. Normal gameplay must not inherit the tutorial's pacing or input prompts.

## Actual normal spawn sequence

`assets/SketchMan001.xma` is 749 records, each ten little-endian signed int32 fields. 101 markers (`event=5555`) delimit 100 timed patterns. `normal-patterns.json` preserves all event times and original arguments. `extract-patterns.py` reproduces it from the supplied APK.

The normal selector (`TWeaponDispenser.a()` / `.b()`) starts with counter 80, speed multiplier 1, coin interval 4. Initial difficulty patterns are 53–64, followed by 35–45, then 65–90, then 0–34. Coin interludes select 46–52 or 91–99. The interval increases after every coin interlude. Speed increases by 0.075 after each three pattern selections, capped at 4. The normal boss timer is 75 seconds, paused during a boss fight. The distance counter advances one metre per 100 ms.

The original default hazard / coin velocity is 0.43 pixels per ms multiplied by the current speed multiplier. The ground scroller moves 6.8 pixels per 60 Hz frame, scenery 4, foreground 6.9. The foreground is rendered after the actors. The scenery tile sequence starts Hills → Desert → West → Field → City → Sea → Tropical → West/Wall → Wall → Canyon → Ice, with the supplied transition tile at every fifth tile.

## Animation and registration

`framework.We.draw()` computes each frame's origin from its **untrimmed** width/height, then applies its saved trim offsets. It does not centre every independently cropped image. That was the source of the browser version's previous frame wobble.

`framework.re` derives frame duration using integer division of the declared clip time by its frame count. Restored clocks:

| State | Frames | Milliseconds per frame |
| --- | ---: | ---: |
| Unarmed / weapon run | 17 | 29 |
| First jump | 14 | 60 |
| Double-jump roll | 7 | 35 |
| Glide | 2 | 64 |
| Player death | 9 | 33 |
| Knife enemy idle / attack | 8 | 50 |
| Knife enemy death | 5 | 60 |
| Jet idle | 9 | 44 |
| Jet firing | 8 | 50 |
| Boss idle | 9 | 66 |
| Boss death | 8 | 50 |
| Shield | 3 | 85 |
| Saw | 2 | 48 |
| Mine | 2 | 128 |
| Death ray | 2 | 64 |
| Coin | 6 | 83, then 500 ms end pause |

`the.a(float)` chooses the first jump, then roll, then glide. `the.b(int)` returns to unarmed running between shots and to rolling when an airborne gun pose expires. Gun poses persist 400–600 ms by weapon. The ground death sequence uses frames 8, 7, then `CHR_DeadFloor_01`; enemies and bosses also retain their death frames instead of vanishing immediately.

The player's source centre is `(150, 428)` at ground level. Collision dimensions and render pivots are distinct. The health gauge is `(348, 534, 268, 34)`; the pause button is centred `(886, 69)`, jump `(144, 576)`, fire `(816, 576)`. `SCN_Background.jpg` is stored in a 1024-square texture, but only its original 960×640 rectangle is used. Scaling the full padded texture was another cause of the prior layout mismatch.

## Remaining limits

Boss movement/attack tactics, some projectile/effect behavior, exact enemy collision reactions, and tutorial scripting remain browser reimplementations. Original spawn data and animation registration/timing are recovered, but a side-by-side recording of later APK runs is still needed for visual verification against the running original.
