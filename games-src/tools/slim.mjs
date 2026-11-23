// Makes phone-sized copies of the character, hair and animation files.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, resample, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
await MeshoptEncoder.ready;
import sharp from 'sharp';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const [, , PACKS, OUT] = process.argv;
const CH = PACKS + '/Universal Base Characters[Standard]/Universal Base Characters[Standard]/';
async function slimTextures(doc, sizes) {
  for (const m of doc.getRoot().listMaterials()) {
    const n = m.getNormalTexture(); if (n) { m.setNormalTexture(null); }
    const r = m.getMetallicRoughnessTexture(); if (r) m.setMetallicRoughnessTexture(null);
    m.setMetallicFactor(0); m.setRoughnessFactor(0.85);
  }
  await doc.transform(prune());
  for (const t of doc.getRoot().listTextures()) {
    const name = t.getURI() || t.getName(); const size = sizes(name);
    const img = await sharp(Buffer.from(t.getImage())).resize(size, size).jpeg({ quality: 82 }).toBuffer();
    t.setImage(new Uint8Array(img)); t.setMimeType('image/jpeg'); t.setURI(name.replace(/\.png$/i, '.jpg'));
  }
}
/* The base bodies are superhero-muscular. Pull each vertex part of the way toward the bone it rides on,
   so arms, chest and legs look like a teenager's. UVs and weights don't change, so the uniform mask still fits. */
const SEG = { pelvis: 'spine_01', spine_01: 'spine_02', spine_02: 'spine_03', spine_03: 'neck_01', neck_01: 'Head', clavicle_l: 'upperarm_l', clavicle_r: 'upperarm_r', upperarm_l: 'lowerarm_l', upperarm_r: 'lowerarm_r', lowerarm_l: 'hand_l', lowerarm_r: 'hand_r', thigh_l: 'calf_l', thigh_r: 'calf_r', calf_l: 'foot_l', calf_r: 'foot_r' };
function deflate(doc, female) {
  const K = female ? { pelvis: 0.93, spine_01: 0.9, spine_02: 0.87, spine_03: 0.86, clavicle: 0.88, neck_01: 0.9, upperarm: 0.82, lowerarm: 0.88, thigh: 0.9, calf: 0.92 }
                   : { pelvis: 0.9, spine_01: 0.86, spine_02: 0.82, spine_03: 0.8, clavicle: 0.82, neck_01: 0.86, upperarm: 0.74, lowerarm: 0.83, thigh: 0.86, calf: 0.9 };
  const kOf = n => K[n] || K[n.replace(/_[lr]$/, '')] || 1;
  const root = doc.getRoot(), skin = root.listSkins()[0], joints = skin.listJoints();
  const wp = joints.map(j => j.getWorldTranslation()), byName = {}; joints.forEach((j, i) => { byName[j.getName()] = i; });
  const seg = joints.map((j, i) => { const c = SEG[j.getName()]; return [wp[i], c != null && byName[c] != null ? wp[byName[c]] : wp[i]]; });
  const kk = joints.map(j => kOf(j.getName()));
  const prim = root.listMeshes().flatMap(m => m.listPrimitives()).find(p => /Superhero/i.test(p.getMaterial().getName()));
  const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0');
  const v = [0, 0, 0], jj = [0, 0, 0, 0], ww = [0, 0, 0, 0];
  for (let i = 0; i < P.getCount(); i++) {
    P.getElement(i, v); J.getElement(i, jj); W.getElement(i, ww);
    let tx = 0, ty = 0, tz = 0, k = 0, sw = 0;
    for (let a = 0; a < 4; a++) { const w = ww[a]; if (!w) continue; const [A, B] = seg[jj[a]];
      const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], L = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
      let t = L > 1e-9 ? ((v[0] - A[0]) * d[0] + (v[1] - A[1]) * d[1] + (v[2] - A[2]) * d[2]) / L : 0; t = Math.max(0, Math.min(1, t));
      tx += w * (A[0] + d[0] * t); ty += w * (A[1] + d[1] * t); tz += w * (A[2] + d[2] * t); k += w * kk[jj[a]]; sw += w; }
    if (!sw) continue; tx /= sw; ty /= sw; tz /= sw; k /= sw;
    P.setElement(i, [tx + (v[0] - tx) * k, ty + (v[1] - ty) * k, tz + (v[2] - tz) * k]);
  }
  /* smooth the shirt and trousers areas so they read as cloth, not muscle. Vertices split at UV seams are moved together. */
  const n = P.getCount(), key = new Map(), grp = new Int32Array(n), gpos = [];
  for (let i = 0; i < n; i++) { P.getElement(i, v); const k2 = v.map(x => Math.round(x * 1e4)).join(','); let g = key.get(k2); if (g == null) { g = gpos.length; key.set(k2, g); gpos.push(v.slice()); } grp[i] = g; }
  const G = gpos.length, nb = Array.from({ length: G }, () => new Set()), clothW = new Float32Array(G), cnt = new Float32Array(G);
  const cloth = jn => /^(spine|pelvis|clavicle|thigh)/.test(jn) ? 1 : /^(upperarm|calf)/.test(jn) ? 0.6 : 0;
  for (let i = 0; i < n; i++) { J.getElement(i, jj); W.getElement(i, ww); let c = 0; for (let a = 0; a < 4; a++) c += ww[a] * cloth(joints[jj[a]].getName()); clothW[grp[i]] += c; cnt[grp[i]]++; }
  for (let g = 0; g < G; g++) clothW[g] /= cnt[g] || 1;
  const idx = prim.getIndices().getArray();
  for (let t = 0; t < idx.length; t += 3) { const a = grp[idx[t]], b = grp[idx[t + 1]], c = grp[idx[t + 2]]; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
  for (let it = 0; it < 8; it++) {
    const next = gpos.map(p => p.slice());
    for (let g = 0; g < G; g++) { const w = clothW[g]; if (w < 0.05 || !nb[g].size) continue; let x = 0, y = 0, z = 0; nb[g].forEach(o => { x += gpos[o][0]; y += gpos[o][1]; z += gpos[o][2]; }); const m = nb[g].size, l = 0.5 * w;
      next[g] = [gpos[g][0] + (x / m - gpos[g][0]) * l, gpos[g][1] + (y / m - gpos[g][1]) * l, gpos[g][2] + (z / m - gpos[g][2]) * l]; }
    for (let g = 0; g < G; g++) gpos[g] = next[g];
  }
  for (let i = 0; i < n; i++) P.setElement(i, gpos[grp[i]]);
  // fresh normals so the smoothed cloth shades smoothly
  const N = prim.getAttribute('NORMAL'); if (N) { const acc = Array.from({ length: G }, () => [0, 0, 0]);
    for (let t = 0; t < idx.length; t += 3) { const [a, b, c] = [grp[idx[t]], grp[idx[t + 1]], grp[idx[t + 2]]], A = gpos[a], B = gpos[b], C = gpos[c];
      const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], w2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]], f = [u[1] * w2[2] - u[2] * w2[1], u[2] * w2[0] - u[0] * w2[2], u[0] * w2[1] - u[1] * w2[0]];
      for (const g of [a, b, c]) { acc[g][0] += f[0]; acc[g][1] += f[1]; acc[g][2] += f[2]; } }
    for (let i = 0; i < n; i++) { if (clothW[grp[i]] < 0.05) continue; const q = acc[grp[i]], L = Math.hypot(q[0], q[1], q[2]) || 1; N.setElement(i, [q[0] / L, q[1] / L, q[2] / L]); } }
  // report the upper-back profile so the scarf can sit on it
  const out = []; for (const y0 of [1.27, 1.33, 1.4, 1.45, 1.5]) { let mn = 0; for (let i = 0; i < P.getCount(); i++) { P.getElement(i, v); if (Math.abs(v[1] - y0) < 0.02 && Math.abs(v[0]) < 0.16 && v[2] < mn) mn = v[2]; } out.push(y0 + ':' + mn.toFixed(3)); }
  let hw = 0; for (let i = 0; i < P.getCount(); i++) { P.getElement(i, v); if (Math.abs(v[1] - 1.3) < 0.02 && Math.abs(v[2]) < 0.05) hw = Math.max(hw, Math.abs(v[0])); }
  console.log((female ? 'f' : 'm') + ' back', out.join(' '), 'waist-ish half width', hw.toFixed(3));
}
async function body(src, dst) {
  const doc = await io.read(CH + 'Base Characters/Godot - UE/' + src);
  deflate(doc, /Female/.test(src));
  await slimTextures(doc, n => /Superhero/i.test(n) ? 1024 : 256);
  await doc.transform(dedup(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(OUT + '/' + dst, doc); console.log(dst);
}
async function hair(src, dst) {
  const doc = await io.read(CH + 'Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/' + src);
  await slimTextures(doc, () => 512);
  await io.write(OUT + '/' + dst, doc); console.log(dst);
}
async function anims(src, keep, dst) {
  const doc = await io.read(src); const root = doc.getRoot();
  for (const a of root.listAnimations()) if (!keep.includes(a.getName())) a.dispose();
  for (const n of root.listNodes()) { if (n.getMesh()) { n.getMesh().dispose(); n.setMesh(null); } if (n.getSkin()) n.setSkin(null); }
  for (const s of root.listSkins()) s.dispose();
  for (const a of root.listAnimations()) for (const ch of a.listChannels()) {
    const path = ch.getTargetPath(), node = ch.getTargetNode() && ch.getTargetNode().getName();
    if (path === 'scale' || /^(thumb|index|middle|ring|pinky)_/.test(node || '') || (path === 'translation' && !['root', 'pelvis'].includes(node))) { const smp = ch.getSampler(); ch.dispose(); if (smp) smp.dispose(); }
  }
  await doc.transform(resample({ tolerance: 0.0008 }), prune({ keepLeaves: true, keepAttributes: false }), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
  await io.write(OUT + '/' + dst, doc); console.log(dst, root.listAnimations().map(a => a.getName()).join(','));
}
await body('Superhero_Male_FullBody.gltf', 'pf_m.glb');
await body('Superhero_Female_FullBody.gltf', 'pf_f.glb');
for (const [s, d] of [['Hair_Buzzed.gltf', 'hair_buzzed.glb'], ['Hair_SimpleParted.gltf', 'hair_parted.glb'], ['Hair_Buns.gltf', 'hair_buns.glb'], ['Hair_Long.gltf', 'hair_long.glb'], ['Hair_BuzzedFemale.gltf', 'hair_short.glb'], ['Eyebrows_Female.gltf', 'brows_f.glb'], ['Eyebrows_Regular.gltf', 'brows_m.glb']]) await hair(s, d);
const U1 = PACKS + '/Universal Animation Library[Standard]/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb';
const U2 = PACKS + '/Universal Animation Library 2[Standard]/Universal Animation Library 2[Standard]/Unreal-Godot/UAL2_Standard.glb';
await anims(U1, ['Idle_Loop', 'Sprint_Loop', 'Jog_Fwd_Loop', 'Walk_Loop', 'Jump_Start', 'Jump_Loop', 'Jump_Land', 'Roll', 'Hit_Chest', 'Death01', 'Dance_Loop', 'Sitting_Idle_Loop', 'Swim_Fwd_Loop', 'Interact', 'PickUp_Table', 'Idle_Talking_Loop', 'Push_Loop', 'Driving_Loop', 'Crouch_Idle_Loop', 'Pistol_Aim_Neutral', 'Spell_Simple_Shoot', 'Fixing_Kneeling'], 'anims1.glb');
await anims(U2, ['Slide_Start', 'Slide_Loop', 'Slide_Exit', 'Yes', 'Idle_No_Loop', 'Hit_Knockback', 'OverhandThrow', 'Idle_FoldArms_Loop', 'Walk_Carry_Loop', 'Consume', 'Chest_Open', 'Idle_TalkingPhone_Loop', 'NinjaJump_Start', 'NinjaJump_Land', 'Farm_Watering'], 'anims2.glb');
