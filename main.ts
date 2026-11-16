// Emberkeep — entry program for make.fun best-game-01.
// Copies game/ and screenshots/ beside this file into the output directory
// and writes dossier.json with the kit's buildDossier library.
// Node built-ins only; deterministic: two runs write identical bytes.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outDir, { recursive: true });

// Copy the playable game and its screenshots verbatim. cpSync copies file
// contents only (no timestamps in the output), so repeated runs agree byte
// for byte, as the competition requires.
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

// Build the dossier from the output directory, at the competition's caps.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(`Wrote ${outDir} (game/ + screenshots/ + dossier.json, ${dossier.length} bytes)`);
