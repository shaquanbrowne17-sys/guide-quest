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
async function body(src, dst) {
  const doc = await io.read(CH + 'Base Characters/Godot - UE/' + src);
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
