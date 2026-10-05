const { aStar, dijkstraHeap, dijkstraLinear, haversineDistance } = require('../index');

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function buildGraph(size, seed = 2026) {
  const next = random(seed + size);
  const columns = Math.ceil(Math.sqrt(size));
  const rows = Math.ceil(size / columns);
  const graph = {};
  for (let index = 0; index < size; index += 1) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    // Small deterministic jitter retains a geographic distribution while making
    // the four cardinal grid neighbours the local road-network candidates.
    const jitter = () => (next() - .5) * .0002;
    graph[`L${index}`] = {
      lat: 18.35 + (row / Math.max(rows - 1, 1)) * .35 + jitter(),
      lng: 73.65 + (column / Math.max(columns - 1, 1)) * .45 + jitter(),
      neighbors: {}
    };
  }
  const connect = (a, b) => {
    const directDistance = haversineDistance(graph[a], graph[b]);
    const roadDistance = directDistance * (1 + next() * .4);
    graph[a].neighbors[b] = roadDistance;
    graph[b].neighbors[a] = roadDistance;
  };
  for (let index = 0; index < size; index += 1) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    if (column + 1 < columns && index + 1 < size) connect(`L${index}`, `L${index + 1}`);
    if (row + 1 < rows && index + columns < size) connect(`L${index}`, `L${index + columns}`);
  }
  return graph;
}

function meanQueryTime(search, graph, queries) {
  const started = process.hrtime.bigint();
  let settled = 0;
  for (const [start, end] of queries) settled += search(graph, start, end).settledVertices;
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  return { milliseconds: elapsedMs / queries.length, settled: settled / queries.length };
}

const requested = process.argv.find(value => value.startsWith('--sizes='));
const requestedLargeQueries = process.argv.find(value => value.startsWith('--large-queries='));
const sizes = (requested ? requested.split('=')[1] : '10,100,1000,10000').split(',').map(Number);
const largeQueryCount = requestedLargeQueries ? Number(requestedLargeQueries.split('=')[1]) : 3;
console.log('V\tLinear ms\tHeap ms\tA* ms\tDijkstra settled\tA* settled');
for (const size of sizes) {
  const graph = buildGraph(size);
  const names = Object.keys(graph);
  const next = random(9000 + size);
  // The O(V²) baseline is deliberately expensive at 10,000 vertices. Keep the
  // default interactive; pass --large-queries=50 for the paper-scale sample.
  const queryCount = size <= 1000 ? 200 : largeQueryCount;
  const queries = Array.from({ length: queryCount }, () => [names[Math.floor(next() * size)], names[Math.floor(next() * size)]]);
  const linear = meanQueryTime(dijkstraLinear, graph, queries);
  const heap = meanQueryTime(dijkstraHeap, graph, queries);
  const astar = meanQueryTime(aStar, graph, queries);
  console.log(`${size}\t${linear.milliseconds.toFixed(4)}\t${heap.milliseconds.toFixed(4)}\t${astar.milliseconds.toFixed(4)}\t${heap.settled.toFixed(1)}\t${astar.settled.toFixed(1)}`);
}
