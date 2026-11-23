# Guide Quest Arcade (3D games) – source

The 3D games on `play.html` are built from this folder with [three.js](https://threejs.org) 0.187.

- `src/` – game code: `core.js` (engine, sound, input), `character.js` (the Pathfinder in Class A uniform), `runner.js` (Seawall Fun Run, Choices Run, Honour Run), `train.js` (the Choice trains), `defender.js` (Body Temple Defender), `escape.js` (Break Free escape room), `canoe.js` (Canoe Journey through Our Church's Story), `walk.js` (the walk-and-talk engine) with `grace.js` (Sister Grace's Street) and `school.js` (School Days), `props.js` (low-poly props), `kit.js` (Kenney models), `themes.js` (pressures, facts, questions, scenery), `main.js` (menus, HUD, class boards).
- `src/data.js` – questions and Honour scenarios, extracted from the Apps Script content by `extract.js`.
- `tools/` (`anims.mjs` rebuilds the animation files with only the clips the games use) – asset pipeline: `build_masks.py` paints the uniform regions onto the characters, `slim.mjs` makes phone-sized models and animations.
- `rules.json` – Firebase Realtime Database rules (project "Guide Quest Games") for class rooms in the multiplayer games.
- `build3d.sh <site folder>` – bundles everything into `play.html`, `games/gq3d.js` and `games/assets/`.

3D models and animations: Quaternius (Universal Base Characters, Universal Animation Library) and Kenney (Nature Kit, Car Kit), all CC0.
