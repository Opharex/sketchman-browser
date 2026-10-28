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

## Jet movement correction

Two separate APK classes share the jet artwork. `impossible` (spawn type 7) updates position using `0.05 * elapsedMilliseconds`; its horizontal parameter is first divided by 1000. Thus `-4300` gives **-215 px/s**, before the difficulty multiplier, rather than -4300 px/s. Vertical input is an oscillation coefficient with that same 0.05 time factor; it is not a constant downward velocity. The optional horizontal sway is applied per fixed simulation tick. Negative fire flags suppress shooting, and enabled flying jets use a 1500 ms firing interval.

`vessels` (spawn type 10) travels between two source positions at `350 * difficultyMultiplier` px/s using 2D distance, stays completely stationary for the final argument's duration in milliseconds, then retraces the path to its entry point and despawns. Its hold duration does not shrink with difficulty. It fires during the hold, with the existing 200 ms wind-up. Generic world scrolling and decorative bobbing must not be added to the held position. Source zero-coordinate defaults are y=160..416 and destination x=144..864.

Regression tests use the actual type-7 and type-10 records, assert numerical speed and vertical bounds, measure stationary coordinates and retreat direction, and compare 30/60/120 FPS updates. Live APK execution remains unavailable.


## Obstacle destruction effects and sounds

Recovered from `through.a(int)`, `framework.all.c/d` and `framework.probed` in the supplied 1.0.5 APK. `tools/extract-destruction.py` reads the original .pag/.par definitions into `dist/destruction-data.js`: texture frame sizes, source offsets, particle counts, start/end colors, alpha midpoint, scale, velocity, rotation, spread, delays, lifetime and blend mode. The browser interpolates those values on a fixed 60 Hz particle clock, retaining the source renderer's per-update movement while keeping refresh rates consistent. This is recovered-code validation; no Android runtime was available.

| Obstacle | Original group | Destruction sound ID |
|---|---|---|
| Crate | G_BoxDest | 19 |
| Vertical spikes | G_SpikesVDest | 21 |
| Horizontal/reverse spikes | G_SpikesHDest | 21 |
| Saw | G_SawDest | 22 |
| Air mine | G_AirMineDest | 23 |
| Barrel shot | G_BarrelExplodeDest | 23 |
| Barrel player collision | G_BarrelCrashDest | 24 |
| Junk | G_JunkDest | 21 |
| Land mine | G_LandMineDest | 23 |
| Death ray | G_RayDest | 26 |

Nonlethal projectile impacts use wood sound 20, barrel sound 25, ray sound 27, or metal sound 10. Lethal hits use only the destruction sound, as in the source. Player collisions select the same destruction group except for barrel collisions, which tumble the intact barrel instead of using its blast. Enemy deaths use their smoke group and optional blood group, with explosion sound 15 instead of crate destruction. The existing barrel area-damage behavior remains, but does not add a second generic explosion visual/audio over its recovered effect.


## Boss encounter, projectile orientation, and damage bars

`dragon.and`, `and$re`, `TWeaponDispenser`, and `dragon.probed` define the jeep encounter. It starts at (-200,382), passes through (1200,382), then settles at (720,412). Each update approaches with gain 20/10000 per millisecond, capped at 10 pixels per axis. The port runs that movement at a fixed 60 Hz. The boss is invulnerable until the second waypoint is reached. Its gunman offset is (-100,-100), wheels are (-85,48) and (110,48), and bullet origin is (-160,-100); sprites now use their original scale.

The first boss has 800 health and a 1750 ms volley interval; subsequent encounters add 300 health and shorten the interval by 250 ms, down to 250 ms. Projectile code applies the linear movement twice, yielding horizontal speeds 700/800/700 px/s. Source player-centre height bands <202, 202–358, and >358 select upward, level, or downward three-shot spreads. The first volley starts when combat begins. Enemy projectiles use the original BUL_HeliBullet sprite rotated into their velocity vector; jet muzzle placement follows the shooter's facing. Existing obstacles remain and keep moving during the entrance/fight; the director pauses new obstacle spawns.

Both flying (`impossible.w`) and hovering (`vessels.s`) jetpack enemies use exactly 50 health in the APK. This replaces the earlier user-requested 35-health one-shot override. Damage is not scaled with difficulty. Pistol/semi-auto (40 damage) and SMG (35 damage) need two projectile hits; weapons dealing at least 50 damage need one. The requested immediate removal of dead jet sprites remains. Damage bars use GPROP_DamageBar/Base art, remain hidden until damage, and follow live obstacles/enemies. Bars remain visible after the first hit per the user's requested behavior rather than the recovered one-second display timer. Boss health follows its gunman rather than appearing as a fixed HUD strip. Verification uses recovered APK code, simulation tests and browser rendering; no Android runtime is available here.


## Mobile shop presentation

`dragon.We` provides the six-category chooser and `TGameStore.b/a` the vertically scrolling catalog. The category screen now uses the supplied APK's STR_Categories_Back_01 artwork, with matching button regions and back control. The catalog follows the recovered category and weapon order with 150px rows at the original 960px logical width, original 128px item icons, STR_Splitter, STR_Buy/BuyBtn/Purchased, and STR_HUD coin counter/back artwork. `tools/extract-shop-art.py` restores original trimmed images into their full source dimensions for responsive DOM rendering. Weapon descriptions follow the recovered shop text.

Earned-coin purchases, weapon equipment and consumable stock/enabling retain the browser game's existing behavior. The Coins category displays original coin pack artwork with an earned-coins message; paid mobile IAP is not connected. Text remains accessible browser-rendered text rather than the APK bitmap font. Pointer and keyboard scrolling work independently of gameplay controls. Category and item lists were visually verified in the browser along with insufficient-funds feedback and back navigation.


## UI button audio

`up.b`, `We.b`, and `TGameStore.b/c` call sound ID 1 for main-menu selection, category selection/back, catalog back, successful purchases and insufficient-funds attempts. `framework.way.a(int)` resolves ID 1 as its first sound entry, S_0001_Click.wav. All active shop buttons now call the same existing audio player once at activation, including enable controls; purchase callbacks no longer play an extra click. HUD pause and browser fullscreen controls use the same click; jump/fire retain their gameplay sounds. Disabled purchased/equipped buttons do not activate audio. The original WAV bytes are retained and sound/volume preferences apply.
