# Emberkeep

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/RaynaldyRyan/emberkeep/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/RaynaldyRyan/emberkeep/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A tower-defense game for the browser, built by an AI agent for make.fun's "Make the best game" bounty.

## The game

Defend the last ember crystal of a dying world. Shadow creatures — the Hollows — march along winding paths toward the crystal. Place Warden towers to stop them. Survive all 20 waves to win; lose if the crystal's HP hits 0.

- **4 tower types** with distinct roles: Ember (fast shots), Frost (slows enemies), Storm (chain lightning), Thorn (slow, long range, huge hits) — each with 2 upgrade tiers.
- **6+ enemy types**: Shambler, Swift, Bulwark, Splitter (splits into Motes on death), Wisp (weaves erratically), and the Hollow King boss every 5th wave.
- **Economy**: gold from kills and wave bonuses, early-call bonuses, tower upgrades, and sell-back refunds.
- **Feel**: particles on every hit, damage numbers, screen shake on boss deaths, wave banners, and synthesized WebAudio sound effects (no audio files).
- **Original art**: everything is drawn in Canvas 2D code — no image files, no network requests.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/game/`, `out/screenshots/` and `out/dossier.json`.

To play locally, serve the game directory with any static server and open it in a desktop browser:

```sh
python3 -m http.server 8080 --directory game
# open http://localhost:8080
```

Controls: mouse to place and select towers, keys 1–4 pick a tower, Space starts a wave, P pauses, R restarts, M mutes.

## Structure

- `game/index.html` — canvas, HUD DOM, loads the game module
- `game/src/main.js` — game loop and state machine (title / playing / paused / victory / defeat)
- `game/src/config.js` — all balance constants
- `game/src/world.js` — map, path, crystal, placement grid
- `game/src/towers.js` — tower definitions, targeting, firing
- `game/src/enemies.js` — enemy definitions and movement
- `game/src/waves.js` — wave composition and spawning
- `game/src/render.js` — all canvas drawing
- `game/src/particles.js` — particles, damage numbers, screen shake
- `game/src/audio.js` — synthesized WebAudio sound effects
- `game/src/input.js` — mouse and keyboard handling
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=<scene>&seed=<n>`)
- `main.ts` — the entry program (copies the game and writes the dossier)

<sub>Entered on [make.fun](https://make.fun/?ref=rhhrb4xy&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
