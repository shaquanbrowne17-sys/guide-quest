"""Paints the Pathfinder Class A uniform onto the Quaternius base characters as a region mask.
Each texel of the body's UV layout gets a region id: skin, shirt, trim, trousers, belt, shoes, buckle, socks, patch...
The game's shader colours each region (so skin tone and clothes can change without new textures)."""
import sys, os, numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(__file__)); from gltfio import Gltf
B = sys.argv[1]; OUT = sys.argv[2]; N = 1024
SKIN, SHIRT, TRIM, TROUSERS, BELT, SHOES, BUCKLE, SOCKS, PATCH, PATCHRIM, LOWLEG = range(11)
GROUPS = ['head', 'torso', 'pelvis', 'upper', 'fore', 'thigh', 'calf', 'foot']
def group(name):
    if name in ('Head', 'neck_01'): return 0
    if name.startswith('spine') or name.startswith('clavicle'): return 1
    if name in ('pelvis', 'root'): return 2
    if name.startswith('upperarm'): return 3
    if name.startswith('thigh'): return 5
    if name.startswith('calf'): return 6
    if name.startswith('foot') or name.startswith('ball'): return 7
    return 4  # lower arm, hand, fingers
for nm in ['Superhero_Male_FullBody', 'Superhero_Female_FullBody']:
    g = Gltf(os.path.join(B, nm + '.gltf')); j = g.j
    sk = j['skins'][0]; names = [j['nodes'][i]['name'] for i in sk['joints']]
    ibm = g.acc(sk['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
    J = {names[k]: np.linalg.inv(ibm[k])[:3, 3] for k in range(len(names))}
    gmap = np.array([group(n) for n in names])
    mat = [m['name'] for m in j['materials']]
    pr = [p for m in j['meshes'] for p in m['primitives'] if mat[p['material']].startswith('MI_Superhero')][0]
    P = g.acc(pr['attributes']['POSITION']).astype(np.float64); UV = g.acc(pr['attributes']['TEXCOORD_0']).astype(np.float64)
    JO = g.acc(pr['attributes']['JOINTS_0']).astype(int); WE = g.acc(pr['attributes']['WEIGHTS_0']).astype(np.float64)
    NRM = g.acc(pr['attributes']['NORMAL']).astype(np.float64)
    IDX = g.acc(pr['indices']).reshape(-1, 3)
    GW = np.zeros((len(P), len(GROUPS)))
    for k in range(4): np.add.at(GW, (np.arange(len(P)), gmap[JO[:, k]]), WE[:, k])
    belt = J['spine_01'][1] - 0.05 if 'Male' in nm else J['spine_01'][1] - 0.035
    sh, el = J['upperarm_l'][0], J['lowerarm_l'][0]; sleeve = sh + 0.55 * (el - sh)
    ankle = J['foot_l'][1] + 0.03; knee = J['calf_l'][1] + 0.02
    chest = J['spine_03'][1] + 0.045
    reg = np.full((N, N), 255, np.uint8)
    def region(p, gw, n):
        x, y, z = p; ax = abs(x); gi = int(np.argmax(gw))
        if gi == 7 or y < ankle: return SHOES
        if gi == 0: return SKIN
        if gi == 4: return SKIN
        if gi == 3:
            if ax > sleeve: return SKIN
            if ax > sleeve - 0.018: return TRIM
            # Pathfinder triangle on the left sleeve, on top of the arm in the T-pose (outside when the arm hangs)
            if x > 0 and n[1] > 0.35:
                u = x - (sh + 0.06); w = 0.052 * (1 - u / 0.075)
                if 0 <= u <= 0.075 and abs(z - J['upperarm_l'][2]) <= w:
                    return PATCHRIM if (u < 0.007 or abs(z - J['upperarm_l'][2]) > w - 0.007) else PATCH
            return SHIRT
        if gi in (1, 2) or (gi == 5 and y > belt + 0.03):
            if abs(y - belt) < 0.022:
                return BUCKLE if (ax < 0.032 and z > 0.02) else BELT
            if y > belt:
                if z > 0.02:
                    if ax < 0.0065 and y < J['clavicle_l'][1] - 0.01: return TRIM
                    if 0.035 < ax < 0.145 and chest - 0.06 < y < chest + 0.05:
                        if y > chest + 0.035 or ax < 0.042 or ax > 0.138 or y < chest - 0.053: return TRIM
                return SHIRT
            return TROUSERS
        if gi == 5: return TROUSERS
        if gi == 6:
            if y < ankle + 0.09: return SOCKS
            return LOWLEG if y < knee else TROUSERS
        return SKIN
    for t in IDX:
        a, b, c = t; uv = UV[[a, b, c]] * N
        x0, y0 = np.floor(uv.min(0)).astype(int); x1, y1 = np.ceil(uv.max(0)).astype(int)
        x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, N - 1), min(y1, N - 1)
        if x1 < x0 or y1 < y0: continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax_, ay), (bx, by), (cx, cy) = uv
        d = (by - cy) * (ax_ - cx) + (cx - bx) * (ay - cy)
        if abs(d) < 1e-12: continue
        l1 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / d; l2 = ((cy - ay) * (xs - cx) + (ax_ - cx) * (ys - cy)) / d; l3 = 1 - l1 - l2
        inside = (l1 >= -0.02) & (l2 >= -0.02) & (l3 >= -0.02)
        if not inside.any(): continue
        for yy, xx in zip(*np.nonzero(inside)):
            L = np.array([l1[yy, xx], l2[yy, xx], l3[yy, xx]])
            p = L @ P[[a, b, c]]; gw = L @ GW[[a, b, c]]; n = L @ NRM[[a, b, c]]
            reg[y0 + yy, x0 + xx] = region(p, gw, n)
    # grow every island a few pixels so sampling at the seams never lands on empty texels
    filled = reg != 255
    for _ in range(4):
        im = Image.fromarray(np.where(filled, reg, 0).astype(np.uint8)); mx = np.array(im.filter(ImageFilter.MaxFilter(3)))
        grow = (~filled) & (mx > 0); reg[grow] = mx[grow]; filled = reg != 255
    reg[reg == 255] = 0
    Image.fromarray((reg.astype(np.uint16) * 20).astype(np.uint8)).save(os.path.join(OUT, ('mask_m' if 'Male' in nm else 'mask_f') + '.png'), optimize=True)
    print(nm, 'belt', round(belt, 3), 'sleeve', round(sleeve, 3), 'counts', np.bincount(reg.ravel(), minlength=11).tolist())
