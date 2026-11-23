# Guide Quest Arcade (3D games) – source

The 3D games on `play.html` are built from this folder with [three.js](https://threejs.org) 0.187.

- `src/` – game code: `core.js` (engine, sound, input), `character.js` (the Pathfinder in Class A uniform), `runner.js` (Seawall Fun Run, Choices Run, Honour Run), `train.js` (the Choice trains), `defender.js` (Body Temple Defender), `escape.js` (Break Free escape room), `canoe.js` (Canoe Journey through Our Church's Story), `walk.js` (the walk-and-talk engine) with `grace.js` (Sister Grace's Street), `school.js` (School Days), `nature.js` (Nature Photographer), `teach.js` (Teach the Juniors) and `patch.js` (Honours Patch Hunt), `race.js` (Town Kart, Forest Bike and River Canoe races with question checkpoints), `switch.js` (Switch Run, solo or with your class), `mp.js` (class rooms on Firebase, loaded only when someone plays with their class), `props.js` (low-poly props), `kit.js` (Kenney models), `themes.js` (pressures, facts, questions, scenery), `main.js` (menus, HUD, class boards).
- `src/data.js` – questions and Honour scenarios, extracted from the Apps Script content by `extract.js`.
- `tools/` (`anims.mjs` rebuilds the animation files with only the clips the games use) – asset pipeline: `build_masks.py` paints the uniform regions onto the characters, `slim.mjs` makes phone-sized models and animations.
- `src/firebase-config.js` – the public web config of the Firebase project. It is public by design: it only names the project; `rules.json` decides what players may read and write.
- `rules.json` – Firebase Realtime Database rules (project "Guide Quest Games") for class rooms in the multiplayer games.
- `build3d.sh <site folder>` – bundles everything into `play.html`, `games/gq3d.js` (plus `games/c-*.js` chunks: the Firebase code loads only for class rooms) and `games/assets/`.

3D models and animations: Quaternius (Universal Base Characters, Universal Animation Library) and Kenney (Nature Kit, Car Kit), all CC0.
