const test = require('node:test');
const assert = require('node:assert/strict');
const { aStar, createInitialGraph, dijkstraHeap, dijkstraLinear, haversineDistance, MinHeap } = require('../index');

test('binary heap returns values in ascending priority order', () => {
  const heap = new MinHeap();
  [5, 1, 4, 2, 3].forEach(priority => heap.push({ priority }));
  assert.deepEqual([heap.pop().priority, heap.pop().priority, heap.pop().priority, heap.pop().priority, heap.pop().priority], [1, 2, 3, 4, 5]);
});

test('all three engines agree on every Pune landmark pair', () => {
  const graph = createInitialGraph();
  const nodes = Object.keys(graph);
  for (const start of nodes) {
    for (const end of nodes) {
      const linear = dijkstraLinear(graph, start, end);
      const heap = dijkstraHeap(graph, start, end);
      const astar = aStar(graph, start, end);
      assert.equal(heap.success, linear.success, `${start} -> ${end}`);
      assert.equal(astar.success, linear.success, `${start} -> ${end}`);
      assert.ok(Math.abs(heap.distance - linear.distance) < 1e-9, `${start} -> ${end}: heap distance`);
      assert.ok(Math.abs(astar.distance - linear.distance) < 1e-9, `${start} -> ${end}: A* distance`);
    }
  }
});

test('A* can terminate without settling every vertex', () => {
  const graph = createInitialGraph();
  const result = aStar(graph, 'VIT Kondhwa Campus', 'Upper Depot');
  assert.equal(result.success, true);
  assert.ok(result.settledVertices < Object.keys(graph).length);
});

test('every initial edge is long enough for the haversine heuristic', () => {
  const graph = createInitialGraph();
  for (const [from, location] of Object.entries(graph)) {
    for (const [to, distance] of Object.entries(location.neighbors)) {
      assert.ok(distance + 1e-12 >= haversineDistance(location, graph[to]), `${from} -> ${to}`);
    }
  }
});
