# Sketchman — browser recreation

A playable browser reimplementation of **Sketchman 1.0.5**, built from a user-supplied Android APK. Works with touch controls on mobile and keyboard on PC. No install, framework, build step, or server backend is required.

## Play

[Play on mobile or PC](https://opharex.github.io/sketchman-browser/)

## Play locally

From this directory:

```sh
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. Serve over HTTP; opening `index.html` directly as a `file://` URL will prevent the browser from loading game data.

## Publish on GitHub and share a link

1. Upload this project's contents to a GitHub repository with a `main` branch. Include the hidden `.github` folder and all files under `dist`.
2. In the repository, open **Settings → Pages**. Set **Source** to **GitHub Actions**.
3. Open **Actions → Deploy Sketchman to GitHub Pages → Run workflow**, or push a commit to `main`.
4. After deployment succeeds, the workflow's `github-pages` environment shows the playable URL. Share that URL; a repository link alone does not launch the game.

The workflow runs JavaScript checks and gameplay tests, then publishes `dist`. All game asset paths are relative, so both root sites and repository subpaths work. GitHub Pages availability depends on your repository visibility and GitHub plan.

Alternative: deploy the `dist` directory unchanged to any static HTTPS host.

## Controls

| Action | PC | Mobile |
| --- | --- | --- |
| Jump | Space, ↑, or W | JUMP |
| Double jump | Press again in the air | Tap JUMP again |
| Glide | Third press, then hold | Third tap, then hold JUMP |
| Shoot | Hold X, →, or D | Hold FIRE |
| Pause | P or Esc | Pause icon |
| Super Sketchman flight | Hold jump to ascend; release to descend | Hold JUMP to ascend |

Jumping and firing work simultaneously. Landscape orientation is recommended on phones. The fullscreen button uses the browser's Fullscreen API when available.

## Included

- Original notebook/menu artwork and 384 recovered sprites.
- All 17-frame running animations, jump/glide/death animations, and ten weapon types.
- Pistol, shotgun, SMG, RPG, explosive bow, semi-auto, homing missiles, shockwaves, Super Sketchman, and shadow clones.
- The APK’s 100 timed obstacle patterns and normal-run selection / acceleration rules, kept separate from the tutorial.
- Eleven scenery segments with original transition tiles, rear / foreground layers and HUD positions.
- Full-frame sprite alignment, original clip timing, double-jump rolls, gun-pose recovery, jet firing, enemy and boss death clips, shield animation and material debris.
- Coins, health pickups, invincibility, coin magnets, armor/damage/glide upgrades, extra life, and head starts.
- Original weapon prices, consumable pack prices, and 120 mission definitions/rewards recovered from the APK's Java bytecode.
- Local high scores, weapon unlocks, missions and consumable stock; JSON save export/import for moving progress between devices.
- Original music and sound effects, with mute/volume options.
- Touch controls, keyboard controls, pause on backgrounding, responsive menus, and reduced-motion-aware UI transitions.

## Fidelity and boundaries

This is a **browser reimplementation, not the original Android executable or a verified one-to-one port**. Sprite atlas coordinates, artwork, audio, weapon lists, weapon timing/damage values, shop prices and mission descriptions/rewards were recovered from the APK. Browser gameplay code was written anew. Normal-run spawn patterns, pattern selection, speed progression, animation frame timings, sprite trim registration, jump impulse rules and HUD / scenery layout have now been recovered from the APK. Boss attack tactics, some enemy / projectile behavior, collision reactions, weapon effects and mission condition interpretation remain reconstructed. The legacy `levels.dat` format has not been ported. No live APK playtests were possible in this environment; see `tools/APK_REFERENCE.md` for evidence and limitations. Ads, real-money purchases and the retired Google Play/Miniclip integrations are not implemented. Scores are device-local rather than a global leaderboard.

## Source layout

- `dist/index.html`: browser entrypoint.
- `dist/game.js`: rendering, audio, input, screens, shop, missions, local saves.
- `dist/engine.js`: deterministic, frame-rate-independent gameplay simulation.
- `dist/normal-run.js`: original normal-run pattern selection and scenery sequence.
- `dist/animation.js`: recovered clip timing, frame selection and trim registration.
- `dist/assets/`: original sprite atlases, audio and recovered data.
- `dist/icons/`: individual original sprites for DOM menus.
- `tests/`: Node gameplay/data tests.
- `tools/extract-assets.py`: reproducible artwork/audio extractor for a supplied APK (Python + Pillow).
- `.github/workflows/pages.yml`: GitHub Pages publication workflow.

Run checks with Node 22 or newer:

```sh
npm run check
npm test
```

No npm installation is necessary; there are no external runtime dependencies. Saves use the `sketchman-browser-v1` localStorage key. Data is local to the browser and origin. Hosting at a new URL starts a separate save; use Options → Export/Import to transfer it.

## Asset provenance

Sketchman and its original artwork, sounds and branding belong to their respective owners, identified in the APK as Miniclip / BlitPop. The supplied APK is not included. This project does not grant a license to the original assets. The newly written JavaScript/HTML/CSS is provided separately under `LICENSE-CODE.txt`; that license excludes original art, audio, branding and recovered game data.
