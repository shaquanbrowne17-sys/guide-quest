/* The Pathfinder: Quaternius base character (CC0) wearing the Class A uniform painted by region, with the yellow scarf. */
import { THREE, G, P, merge, store } from './core.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export const ASSET = () => (window.GQ3D_BASE || 'games/assets/');
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = {};
export function loadGLB(url) { return cache[url] || (cache[url] = loader.loadAsync(ASSET() + url)); }
const texLoader = new THREE.TextureLoader();
const masks = {};
function mask(body) {
  if (!masks[body]) { const t = texLoader.load(ASSET() + 'mask_' + body + '.png'); t.flipY = false; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace; masks[body] = t; }
  return masks[body];
}

export const SKIN_TONES = ['#5A3A28', '#7A4D33', '#A0694A', '#C99A72', '#E6C2A0'];
export const HAIR = { m: ['buzzed', 'parted', 'short'], f: ['buns', 'long', 'short'] };
export const OUTFITS = {
  /* region colours: 1 shirt, 2 trim, 3 trousers, 4 belt, 5 shoes, 6 buckle, 7 socks, 8 patch, 9 patch rim */
  pathfinder: { shirt: '#C9B27E', trim: '#9C8556', trousers: '#1E2126', belt: '#141414', shoes: '#111111', buckle: '#D4AF37', socks: '#F1F1F1', patch: '#B8202E', rim: '#E8C547', scarf: '#F4C21B' },
  captain: { shirt: '#F4F4F2', trim: '#1D2A44', trousers: '#1D2A44', belt: '#141414', shoes: '#111111', buckle: '#D4AF37', socks: '#F1F1F1', patch: '#1D2A44', rim: '#D4AF37' },
  nurse: { shirt: '#F7F7F7', trim: '#7FB6D9', trousers: '#F2F2F2', belt: '#EDEDED', shoes: '#F4F4F4', buckle: '#EDEDED', socks: '#F1F1F1', patch: '#D3243A', rim: '#F7F7F7' },
  pastor: { shirt: '#F4F4F2', trim: '#2B2F38', trousers: '#2B2F38', belt: '#141414', shoes: '#111111', buckle: '#9AA3AE', socks: '#2B2F38', patch: '#F4F4F2', rim: '#F4F4F2' },
  village: { shirt: '#B5452C', trim: '#7A2E1D', trousers: '#6E4B2C', belt: '#3A2A1A', shoes: '#5A3A22', buckle: '#C9A13B', socks: '#6E4B2C', patch: '#B5452C', rim: '#B5452C' },
  casual: { shirt: '#2F6DB5', trim: '#24578F', trousers: '#3A3F4A', belt: '#141414', shoes: '#EDEDED', buckle: '#9AA3AE', socks: '#F1F1F1', patch: '#2F6DB5', rim: '#2F6DB5' },
  counsellor: { shirt: '#C9B27E', trim: '#9C8556', trousers: '#1E2126', belt: '#141414', shoes: '#111111', buckle: '#D4AF37', socks: '#F1F1F1', patch: '#B8202E', rim: '#E8C547', scarf: '#F4C21B' },
};
export const LOOK_DEFAULT = { body: 'm', skin: 1, hair: 'buzzed', bottom: 'trousers' };
export function myLook() { return Object.assign({}, LOOK_DEFAULT, store('gq3d-look') || {}); }
export function saveLook(l) { store('gq3d-look', l); }

function uniformMaterial(orig, body, look, outfit) {
  const o = OUTFITS[outfit] || OUTFITS.pathfinder, c = k => new THREE.Color(o[k]);
  const cols = [new THREE.Color('#ffffff'), c('shirt'), c('trim'), c('trousers'), c('belt'), c('shoes'), c('buckle'), c('socks'), c('patch'), c('rim'), c('trousers')];
  const skin = new THREE.Color(SKIN_TONES[look.skin] || SKIN_TONES[1]), base = new THREE.Color('#A0694A');
  const tint = new THREE.Vector3(skin.r / base.r, skin.g / base.g, skin.b / base.b);
  const m = new THREE.MeshStandardMaterial({ map: orig.map, roughness: 0.82, metalness: 0 });
  m.userData.u = { uMask: { value: mask(body) }, uCol: { value: cols }, uSkin: { value: tint }, uSkirt: { value: look.bottom === 'skirt' ? 1 : 0 } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uMask; uniform vec3 uCol[11]; uniform vec3 uSkin; uniform float uSkirt;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        int rid = int(floor(texture2D(uMask, vMapUv).r * 255.0 / 20.0 + 0.5));
        vec3 skinC = diffuseColor.rgb * uSkin;
        vec3 cc = skinC;
        if (rid == 10) cc = uSkirt > 0.5 ? skinC : uCol[3];
        else if (rid == 7) cc = uSkirt > 0.5 ? uCol[7] : uCol[3];
        else if (rid > 0 && rid < 10) cc = uCol[rid];
        diffuseColor.rgb = cc;`);
  };
  m.customProgramCacheKey = () => 'gq-uniform';
  return m;
}

function scarf(color, body) {
  /* the folded triangle lies on the upper back, its two ends come round the neck and through the woggle in front */
  const f = body === 'f', w = f ? 0.115 : 0.135;
  const tri = new THREE.BufferGeometry();
  const v = f ? [-w, 0.025, -0.08, w, 0.025, -0.08, 0, -0.22, -0.062, 0, -0.08, -0.09] : [-w, 0.025, -0.114, w, 0.025, -0.114, 0, -0.26, -0.09, 0, -0.09, -0.12];
  tri.setAttribute('position', new THREE.Float32BufferAttribute([v[0], v[1], v[2], v[9], v[10], v[11], v[3], v[4], v[5], v[0], v[1], v[2], v[6], v[7], v[8], v[9], v[10], v[11], v[9], v[10], v[11], v[6], v[7], v[8], v[3], v[4], v[5]], 3));
  tri.computeVertexNormals();
  const back = new THREE.Mesh(tri, new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide, flatShading: true }));
  const g = merge([
    P(G.tor(f ? 0.068 : 0.076, 0.028, 6, 14), color, [0, 0, 0.0], [Math.PI / 2 + 0.25, 0, 0], [1.05, 1, 1]),
    P(G.box(0.035, 0.14, 0.018), color, [0.02, -0.1, f ? 0.072 : 0.088], [0.18, 0, 0.16]), P(G.box(0.035, 0.14, 0.018), color, [-0.02, -0.1, f ? 0.072 : 0.088], [0.18, 0, -0.16]),
    P(G.cyl(0.022, 0.022, 0.035, 8), '#6E4424', [0, -0.055, f ? 0.068 : 0.084], [Math.PI / 2 + 0.2, 0, 0]),
  ]);
  const grp = new THREE.Group(); grp.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }))); grp.add(back);
  return grp;
}
function skirtMesh(color) {
  const g = merge([P(G.cyl(0.165, 0.27, 0.42, 14), color, [0, -0.2, 0]), P(G.cyl(0.168, 0.168, 0.05, 14), '#141414', [0, 0.0, 0])]);
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }));
}
/* attach an object to a bone so it sits at a world position/rotation in the rest pose */
function attach(root, bone, obj, worldPos, worldScale) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(bone.matrixWorld).invert();
  const want = new THREE.Matrix4().compose(new THREE.Vector3(...worldPos), new THREE.Quaternion(), new THREE.Vector3(...(worldScale || [1, 1, 1])));
  want.premultiply(inv); want.decompose(obj.position, obj.quaternion, obj.scale); bone.add(obj);
}

let ANIMS = null;
export function loadAnims() {
  if (!ANIMS) ANIMS = Promise.all([loadGLB('anims1.glb'), loadGLB('anims2.glb')]).then(([a, b]) => {
    const map = {}; [...a.animations, ...b.animations].forEach(c => { map[c.name] = c; }); return map;
  });
  return ANIMS;
}

export async function makeCharacter(look, outfit = 'pathfinder') {
  look = Object.assign({}, LOOK_DEFAULT, look || {}); const body = look.body === 'f' ? 'f' : 'm';
  const [gl, clips] = await Promise.all([loadGLB('pf_' + body + '.glb'), loadAnims()]);
  const root = SkeletonUtils.clone(gl.scene); root.name = 'pathfinder';
  let bodyMesh = null; const bones = {};
  root.traverse(o => { if (o.isBone) bones[o.name] = o; if (o.isMesh) { o.frustumCulled = false; if (/Superhero/i.test(o.material.name)) bodyMesh = o; } });
  bodyMesh.material = uniformMaterial(bodyMesh.material, body, look, outfit);
  // hair
  const hairName = HAIR[body].includes(look.hair) ? look.hair : HAIR[body][0];
  const hg = await loadGLB('hair_' + hairName + '.glb'); let hm = null;
  hg.scene.traverse(o => { if (o.isSkinnedMesh && !hm) hm = o; });
  if (hm) {
    const hair = new THREE.SkinnedMesh(hm.geometry, hm.material.clone()); hair.frustumCulled = false;
    hair.material.color = new THREE.Color(look.hairColor || '#2A1B12'); hair.material.roughness = 0.9;
    bodyMesh.parent.add(hair); hair.bind(new THREE.Skeleton(bodyMesh.skeleton.bones, hm.skeleton.boneInverses.map(m => m.clone())), hm.bindMatrix.clone());
  }
  const o = OUTFITS[outfit] || OUTFITS.pathfinder;
  if (o.scarf && bones.spine_03) attach(root, bones.spine_03, scarf(o.scarf, body), [0, body === 'm' ? 1.475 : 1.445, body === 'm' ? -0.03 : -0.035]);
  // proper shoes over the painted feet
  root.updateMatrixWorld(true);
  ['l', 'r'].forEach(sd => { const f = bones['foot_' + sd], b = bones['ball_' + sd]; if (!f || !b) return;
    const fp = f.getWorldPosition(new THREE.Vector3()), bp = b.getWorldPosition(new THREE.Vector3()), len = Math.max(0.18, bp.z - fp.z + 0.12);
    const g = merge([P(G.box(0.088, 0.06, len), o.shoes || '#111', [0, 0.042, 0]), P(G.cyl(0.044, 0.044, 0.06, 10, 1), o.shoes || '#111', [0, 0.042, len / 2], null), P(G.box(0.094, 0.018, len + 0.02), '#2B2B2B', [0, 0.009, 0.008])]);
    attach(root, f, new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 })), [fp.x, 0, (fp.z + bp.z) / 2 - 0.005]); });
  if (look.bottom === 'skirt' && bones.pelvis) attach(root, bones.pelvis, skirtMesh(o.trousers), [0, 1.0, -0.02], [body === 'm' ? 1.0 : 0.97, 1, 0.9]);
  root.traverse(m => { if (m.isMesh && m !== bodyMesh && /Hair/i.test(m.material.name || '')) { m.material = m.material.clone(); m.material.color = new THREE.Color('#2A1B12'); } });
  const mixer = new THREE.AnimationMixer(root); const actions = {}; let cur = null;
  function play(name, o = {}) {
    const clip = clips[name]; if (!clip) return null;
    let a = actions[name]; if (!a) { a = actions[name] = mixer.clipAction(clip); }
    if (cur === a && !o.restart) { a.timeScale = o.speed || 1; return a; }
    a.reset(); a.setLoop(o.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = !!o.once; a.timeScale = o.speed || 1;
    a.enabled = true; a.setEffectiveWeight(1);
    if (cur && cur !== a) a.crossFadeFrom(cur, o.fade == null ? 0.15 : o.fade, false); a.play(); cur = a; return a;
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.38, 18), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.3, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; shadow.renderOrder = 1;
  const holder = new THREE.Group(); holder.add(root); holder.add(shadow); root.scale.setScalar(0.94); /* a teenager, not a giant */
  return { root: holder, model: root, bones, mixer, play, update: dt => mixer.update(dt), shadow, look, clips, duration: n => clips[n] ? clips[n].duration : 0 };
}
