import json, struct, numpy as np, os
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
class Gltf:
    def __init__(self, path):
        self.dir = os.path.dirname(path); self.j = json.load(open(path))
        self.bufs = [open(os.path.join(self.dir, b['uri']), 'rb').read() for b in self.j['buffers']]
    def acc(self, i):
        a = self.j['accessors'][i]; bv = self.j['bufferViews'][a['bufferView']]; buf = self.bufs[bv['buffer']]
        dt = np.dtype(CT[a['componentType']]); n = NC[a['type']]; off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = bv.get('byteStride', 0) or dt.itemsize * n
        if stride == dt.itemsize * n: arr = np.frombuffer(buf, dt, a['count'] * n, off).reshape(a['count'], n)
        else: arr = np.stack([np.frombuffer(buf, dt, n, off + k * stride) for k in range(a['count'])])
        if a.get('normalized'): arr = arr.astype(np.float32) / np.iinfo(dt).max
        return arr.copy()
    def node_world(self):
        """world matrices of every node in bind (rest) pose"""
        j = self.j; W = [None] * len(j['nodes'])
        def local(n):
            if 'matrix' in n: return np.array(n['matrix'], dtype=np.float64).reshape(4, 4).T
            t = np.array(n.get('translation', [0, 0, 0])); r = n.get('rotation', [0, 0, 0, 1]); s = np.array(n.get('scale', [1, 1, 1]))
            x, y, z, w = r; R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
            M = np.eye(4); M[:3, :3] = R * s; M[:3, 3] = t; return M
        par = {}
        for i, n in enumerate(j['nodes']):
            for c in n.get('children', []): par[c] = i
        def w(i):
            if W[i] is None: W[i] = (w(par[i]) if i in par else np.eye(4)) @ local(j['nodes'][i])
            return W[i]
        for i in range(len(j['nodes'])): w(i)
        return W
