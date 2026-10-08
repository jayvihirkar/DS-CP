// Benchmark: Dijkstra (linear scan) vs Dijkstra (binary heap) vs A* (haversine)
// Synthetic Pune landmark graphs, 4 nearest neighbours per vertex, detour 1.0-1.4
// Run: node benchmark.js

const SIZES = [10, 100, 1000, 10000];
const QUERIES = { 10: 2000, 100: 1000, 1000: 200, 10000: 20 }; // linear scan is O(V^2), so fewer at 10k
const K = 4;
const SEED = 42;

// Seeded RNG (mulberry32) so results are reproducible
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function haversine(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Build graph: points in a box around Pune, connect each to K nearest (undirected)
function buildGraph(n, rand) {
  const nodes = [];
  for (let i = 0; i < n; i++) {
    nodes.push({ lat: 18.40 + rand() * 0.25, lon: 73.75 + rand() * 0.25 });
  }
  // grid buckets for fast nearest-neighbour search
  const cells = Math.max(1, Math.floor(Math.sqrt(n / 2)));
  const bucket = new Map();
  const cellOf = (p) => [
    Math.min(cells - 1, Math.floor(((p.lat - 18.40) / 0.25) * cells)),
    Math.min(cells - 1, Math.floor(((p.lon - 73.75) / 0.25) * cells)),
  ];
  nodes.forEach((p, i) => {
    const [r, c] = cellOf(p);
    const key = r * cells + c;
    if (!bucket.has(key)) bucket.set(key, []);
    bucket.get(key).push(i);
  });
  const adj = Array.from({ length: n }, () => new Map());
  for (let i = 0; i < n; i++) {
    const [r, c] = cellOf(nodes[i]);
    let found = [];
    for (let rad = 1; rad <= cells; rad++) {
      found = [];
      for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= cells || cc >= cells) continue;
        const list = bucket.get(rr * cells + cc);
        if (list) for (const j of list) if (j !== i) found.push(j);
      }
      if (found.length >= K + 8 || rad === cells) break;
    }
    found.sort((a, b) => haversine(nodes[i], nodes[a]) - haversine(nodes[i], nodes[b]));
    for (const j of found.slice(0, K)) {
      const w = haversine(nodes[i], nodes[j]) * (1.0 + 0.4 * rand());
      if (!adj[i].has(j)) { adj[i].set(j, w); adj[j].set(i, w); }
    }
  }
  return { nodes, adj };
}

// ---------- Engine 1: Dijkstra, linear scan ----------
function dijkstraLinear(g, s, t) {
  const n = g.nodes.length;
  const dist = new Float64Array(n).fill(Infinity);
  const done = new Uint8Array(n);
  dist[s] = 0;
  let settled = 0;
  for (let it = 0; it < n; it++) {
    let u = -1, best = Infinity;
    for (let v = 0; v < n; v++) if (!done[v] && dist[v] < best) { best = dist[v]; u = v; }
    if (u === -1) break;
    done[u] = 1; settled++;
    for (const [v, w] of g.adj[u]) if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
  }
  return { d: dist[t], settled };
}

// ---------- Binary min-heap of [priority, vertex, g] ----------
class Heap {
  constructor() { this.p = []; this.v = []; this.g = []; }
  get size() { return this.p.length; }
  push(p, v, g) {
    let i = this.p.length;
    this.p.push(p); this.v.push(v); this.g.push(g);
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (this.p[par] <= this.p[i]) break;
      this._swap(i, par); i = par;
    }
  }
  pop() {
    const out = [this.p[0], this.v[0], this.g[0]];
    const lp = this.p.pop(), lv = this.v.pop(), lg = this.g.pop();
    if (this.p.length) {
      this.p[0] = lp; this.v[0] = lv; this.g[0] = lg;
      let i = 0; const n = this.p.length;
      for (;;) {
        let l = 2 * i + 1, r = l + 1, m = i;
        if (l < n && this.p[l] < this.p[m]) m = l;
        if (r < n && this.p[r] < this.p[m]) m = r;
        if (m === i) break;
        this._swap(i, m); i = m;
      }
    }
    return out;
  }
  _swap(a, b) {
    [this.p[a], this.p[b]] = [this.p[b], this.p[a]];
    [this.v[a], this.v[b]] = [this.v[b], this.v[a]];
    [this.g[a], this.g[b]] = [this.g[b], this.g[a]];
  }
}

// ---------- Engine 2: Dijkstra, binary heap (stale entries skipped, early stop) ----------
function dijkstraHeap(g, s, t) {
  const n = g.nodes.length;
  const dist = new Float64Array(n).fill(Infinity);
  const done = new Uint8Array(n);
  dist[s] = 0;
  const h = new Heap(); h.push(0, s, 0);
  let settled = 0;
  while (h.size) {
    const [, u, du] = h.pop();
    if (done[u] || du > dist[u]) continue; // stale
    done[u] = 1; settled++;
    if (u === t) break;
    for (const [v, w] of g.adj[u]) {
      const nd = du + w;
      if (nd < dist[v]) { dist[v] = nd; h.push(nd, v, nd); }
    }
  }
  return { d: dist[t], settled };
}

// ---------- Engine 3: A* with haversine heuristic ----------
function astar(g, s, t) {
  const n = g.nodes.length;
  const gs = new Float64Array(n).fill(Infinity);
  const done = new Uint8Array(n);
  const target = g.nodes[t];
  gs[s] = 0;
  const h = new Heap(); h.push(haversine(g.nodes[s], target), s, 0);
  let settled = 0;
  while (h.size) {
    const [, u, gu] = h.pop();
    if (done[u] || gu > gs[u]) continue;
    done[u] = 1; settled++;
    if (u === t) break;
    for (const [v, w] of g.adj[u]) {
      const ng = gu + w;
      if (ng < gs[v]) { gs[v] = ng; h.push(ng + haversine(g.nodes[v], target), v, ng); }
    }
  }
  return { d: gs[t], settled };
}

// ---------- Run ----------
const engines = { linear: dijkstraLinear, heap: dijkstraHeap, astar };
const results = [];
let mismatches = 0;

for (const n of SIZES) {
  const rand = rng(SEED + n);
  const g = buildGraph(n, rand);
  const qn = QUERIES[n];

  // pick connected random pairs (use heap Dijkstra to check reachability)
  const pairs = [];
  while (pairs.length < qn) {
    const s = Math.floor(rand() * n), t = Math.floor(rand() * n);
    if (s !== t && isFinite(dijkstraHeap(g, s, t).d)) pairs.push([s, t]);
  }

  // warm up JIT
  for (let i = 0; i < Math.min(5, pairs.length); i++)
    for (const f of Object.values(engines)) f(g, pairs[i][0], pairs[i][1]);

  const time = { linear: 0, heap: 0, astar: 0 };
  const settledSum = { linear: 0, heap: 0, astar: 0 };
  for (const [s, t] of pairs) {
    const ds = [];
    for (const [name, f] of Object.entries(engines)) {
      const t0 = process.hrtime.bigint();
      const r = f(g, s, t);
      time[name] += Number(process.hrtime.bigint() - t0) / 1e6;
      settledSum[name] += r.settled;
      ds.push(r.d);
    }
    if (Math.abs(ds[0] - ds[1]) > 1e-9 || Math.abs(ds[0] - ds[2]) > 1e-9) mismatches++;
  }
  const row = {
    V: n, queries: qn,
    linear_ms: time.linear / qn, heap_ms: time.heap / qn, astar_ms: time.astar / qn,
    heap_vs_linear: time.linear / time.heap,
    astar_vs_heap: time.heap / time.astar,
    settled_linear: settledSum.linear / qn,
    settled_heap: settledSum.heap / qn,
    settled_astar: settledSum.astar / qn,
    astar_fewer_vs_dijkstra_pct: (1 - settledSum.astar / settledSum.heap) * 100,
  };
  results.push(row);
  console.log(`V=${n} done`);
}

console.log("\nMean query time (ms):");
console.table(results.map(r => ({
  V: r.V, queries: r.queries,
  linear: +r.linear_ms.toFixed(4), heap: +r.heap_ms.toFixed(4), astar: +r.astar_ms.toFixed(4),
  "heap vs linear (x)": +r.heap_vs_linear.toFixed(1),
  "A* vs heap (x)": +r.astar_vs_heap.toFixed(2),
})));
console.log("Vertices settled (mean per query):");
console.table(results.map(r => ({
  V: r.V,
  linear: +r.settled_linear.toFixed(1), heap: +r.settled_heap.toFixed(1), astar: +r.settled_astar.toFixed(1),
  "A* fewer than Dijkstra (%)": +r.astar_fewer_vs_dijkstra_pct.toFixed(1),
})));
console.log(`Distance mismatches across engines: ${mismatches}`);
