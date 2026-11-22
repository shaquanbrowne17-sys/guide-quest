/* Kenney (CC0) models. Flat-coloured ones are baked into one vertex-coloured geometry each (one draw call). */
import { THREE, MAT } from './core.js';
import { loadGLB } from './character.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const baked = {}, scenes = {};
/** Loads models by name (files in assets/k/). Returns when all are ready. Failed files are skipped. */
export async function loadKit(names) {
  await Promise.all(names.map(n => baked[n] || scenes[n] ? null : loadGLB('k/' + n + '.glb').then(g => {
    scenes[n] = g.scene;
    if (!/^car_/.test(n)) baked[n] = bake(g.scene);
  }).catch(() => {})));
}
function bake(scene) {
  scene.updateMatrixWorld(true); const parts = [];
  scene.traverse(o => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    const groups = g.groups.length ? g.groups : [{ start: 0, count: n, materialIndex: 0 }];
    groups.forEach(gr => { const c = (mats[gr.materialIndex] || mats[0]).color || new THREE.Color(1, 1, 1); for (let i = gr.start; i < gr.start + gr.count; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; } });
    const out = new THREE.BufferGeometry(); out.setAttribute('position', g.attributes.position); out.setAttribute('normal', g.attributes.normal); out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(out);
  });
  const m = mergeGeometries(parts, false); m.computeBoundingBox();
  const b = m.boundingBox; m.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); m.computeBoundingBox(); m.computeBoundingSphere();
  return m;
}
/** A mesh of a baked model, scaled so its height is h (or by factor s when h is null). */
export function kit(name, h, s) {
  const g = baked[name]; if (!g) return null;
  const m = new THREE.Mesh(g, MAT.flat); const k = h ? h / (g.boundingBox.max.y || 1) : (s || 1); m.scale.setScalar(k); return m;
}
export function kitGeo(name) { return baked[name]; }
/** A textured model (cars): a clone of the loaded scene. */
export function kitScene(name, len) {
  const s = scenes[name]; if (!s) return null; const c = s.clone(true);
  const b = new THREE.Box3().setFromObject(c); const k = len ? len / (b.max.z - b.min.z) : 1; c.scale.setScalar(k);
  c.position.y = -b.min.y * k; const g = new THREE.Group(); g.add(c); return g;
}
export const has = n => !!(baked[n] || scenes[n]);
