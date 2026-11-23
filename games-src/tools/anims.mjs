// Makes the animation files (only the clips we use, nothing else). Run: node tools/anims3.mjs <packs> <out>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, resample, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
await MeshoptEncoder.ready;
import sharp from 'sharp';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const [, , PACKS, OUT] = process.argv;
async function anims(src, keep, dst) {
  const doc = await io.read(src); const root = doc.getRoot();
  for (const a of root.listAnimations()) if (!keep.includes(a.getName())) a.dispose();
  for (const n of root.listNodes()) { if (n.getMesh()) { n.getMesh().dispose(); n.setMesh(null); } if (n.getSkin()) n.setSkin(null); }
  for (const s of root.listSkins()) s.dispose();
  for (const t of root.listTextures()) t.dispose(); for (const m of root.listMaterials()) m.dispose();
  for (const a of root.listAnimations()) for (const ch of a.listChannels()) {
    const path = ch.getTargetPath(), node = ch.getTargetNode() && ch.getTargetNode().getName();
    if (path === 'scale' || /^(thumb|index|middle|ring|pinky)_/.test(node || '') || (path === 'translation' && !['root', 'pelvis'].includes(node))) { const smp = ch.getSampler(); ch.dispose(); if (smp) smp.dispose(); }
  }
  { const used = new Set(); for (const a of root.listAnimations()) for (const s of a.listSamplers()) { used.add(s.getInput()); used.add(s.getOutput()); } for (const acc of root.listAccessors()) if (!used.has(acc)) acc.dispose(); }
  await doc.transform(resample({ tolerance: 0.0008 }), prune({ keepLeaves: true, keepAttributes: false }), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
  await io.write(OUT + '/' + dst, doc); console.log(dst, root.listAnimations().map(a => a.getName()).join(','));
}

const U1 = PACKS + '/Universal Animation Library[Standard]/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb';
const U2 = PACKS + '/Universal Animation Library 2[Standard]/Universal Animation Library 2[Standard]/Unreal-Godot/UAL2_Standard.glb';
await anims(U1, ['Idle_Loop', 'Sprint_Loop', 'Jog_Fwd_Loop', 'Walk_Loop', 'Jump_Start', 'Jump_Loop', 'Jump_Land', 'Roll', 'Hit_Chest', 'Death01', 'Dance_Loop', 'Sitting_Idle_Loop', 'Swim_Fwd_Loop', 'Interact', 'PickUp_Table', 'Idle_Talking_Loop', 'Push_Loop', 'Driving_Loop', 'Crouch_Idle_Loop', 'Pistol_Aim_Neutral', 'Spell_Simple_Shoot', 'Fixing_Kneeling', 'Sitting_Talking_Loop', 'Crouch_Fwd_Loop'], 'anims1.glb');
await anims(U2, ['Slide_Start', 'Slide_Loop', 'Slide_Exit', 'Yes', 'Idle_No_Loop', 'Hit_Knockback', 'OverhandThrow', 'Idle_FoldArms_Loop', 'Walk_Carry_Loop', 'Consume', 'Chest_Open', 'Idle_TalkingPhone_Loop', 'NinjaJump_Start', 'NinjaJump_Land', 'Farm_Watering', 'ClimbUp_1m', 'Farm_PlantSeed'], 'anims2.glb');
