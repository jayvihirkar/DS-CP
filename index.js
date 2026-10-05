const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const EARTH_RADIUS_KM = 6371;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function haversineDistance(a, b) {
  const radians = value => (value * Math.PI) / 180;
  const latDelta = radians(b.lat - a.lat);
  const lngDelta = radians(b.lng - a.lng);
  const term = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(lngDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(term));
}

function createInitialGraph() {
  const locations = {
    'VIT Kondhwa Campus': [18.4597, 73.8844], 'VIT Bibwewadi Campus': [18.4628, 73.8680],
    Swargate: [18.500605533841608, 73.85841056598598], 'Shivaji Nagar': [18.53025950764808, 73.85008521330353],
    'Railway Station': [18.529268626151026, 73.87414034947514], Katraj: [18.448198224959548, 73.85848909610095],
    Sinhgad: [18.466656934037342, 73.83567939610137], Hinjewadi: [18.5893, 73.7054],
    'MIT ADT': [18.49318668349125, 74.02340020910424], 'Upper Depot': [18.46109567280875, 73.8720547245966],
    PICT: [18.457236774425763, 73.85119971764523]
  };
  const newGraph = Object.fromEntries(Object.entries(locations).map(([name, [lat, lng]]) => [name, { lat, lng, neighbors: {} }]));

  // A road edge may not be shorter than the direct geographic distance. This makes
  // the haversine heuristic admissible and consistent for A*.
  const connect = (from, to, requestedDistance) => {
    const distance = Math.max(requestedDistance, haversineDistance(newGraph[from], newGraph[to]));
    newGraph[from].neighbors[to] = distance;
    newGraph[to].neighbors[from] = distance;
  };
  [
    ['VIT Kondhwa Campus', 'Upper Depot', 2.3], ['VIT Kondhwa Campus', 'Katraj', 4.1],
    ['VIT Kondhwa Campus', 'Swargate', 6.5], ['VIT Kondhwa Campus', 'Railway Station', 8.9],
    ['VIT Kondhwa Campus', 'Hinjewadi', 24], ['VIT Kondhwa Campus', 'MIT ADT', 21],
    ['VIT Bibwewadi Campus', 'Upper Depot', 0.9], ['VIT Bibwewadi Campus', 'Swargate', 4.5],
    ['VIT Bibwewadi Campus', 'Katraj', 8], ['Swargate', 'Shivaji Nagar', 5],
    ['Swargate', 'Katraj', 12], ['Swargate', 'Railway Station', 3],
    ['Shivaji Nagar', 'Railway Station', 3], ['Shivaji Nagar', 'Hinjewadi', 14],
    ['Railway Station', 'Hinjewadi', 18], ['Katraj', 'Sinhgad', 15],
    ['Sinhgad', 'Hinjewadi', 20], ['Upper Depot', 'Katraj', 2.3], ['Upper Depot', 'PICT', 3.4]
  ].forEach(([from, to, distance]) => connect(from, to, distance));
  return newGraph;
}

class MinHeap {
  constructor() { this.items = []; }
  get size() { return this.items.length; }
  push(item) {
    this.items.push(item);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].priority <= item.priority) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = item;
  }
  pop() {
    if (this.items.length === 0) return null;
    const minimum = this.items[0];
    const last = this.items.pop();
    if (this.items.length === 0) return minimum;
    let index = 0;
    while (index * 2 + 1 < this.items.length) {
      let child = index * 2 + 1;
      if (child + 1 < this.items.length && this.items[child + 1].priority < this.items[child].priority) child += 1;
      if (this.items[child].priority >= last.priority) break;
      this.items[index] = this.items[child];
      index = child;
    }
    this.items[index] = last;
    return minimum;
  }
}

function initialiseSearch(graph, start) {
  const distances = {};
  const previous = {};
  Object.keys(graph).forEach(node => {
    distances[node] = node === start ? 0 : Infinity;
    previous[node] = null;
  });
  return { distances, previous };
}

function buildResult(distances, previous, end, settled) {
  if (distances[end] === Infinity) return { path: [], distance: Infinity, success: false, settledVertices: settled.size };
  const route = [];
  for (let node = end; node !== null; node = previous[node]) route.unshift(node);
  return { path: route, distance: distances[end], success: true, settledVertices: settled.size };
}

function dijkstraLinear(graph, start, end) {
  const { distances, previous } = initialiseSearch(graph, start);
  const unvisited = new Set(Object.keys(graph));
  const settled = new Set();
  while (unvisited.size > 0) {
    let current = null;
    for (const node of unvisited) if (current === null || distances[node] < distances[current]) current = node;
    if (current === null || distances[current] === Infinity) break;
    unvisited.delete(current);
    settled.add(current);
    if (current === end) break;
    for (const [neighbor, weight] of Object.entries(graph[current].neighbors)) {
      if (settled.has(neighbor)) continue;
      const candidate = distances[current] + weight;
      if (candidate < distances[neighbor]) {
        distances[neighbor] = candidate;
        previous[neighbor] = current;
      }
    }
  }
  return buildResult(distances, previous, end, settled);
}

function dijkstraHeap(graph, start, end) {
  const { distances, previous } = initialiseSearch(graph, start);
  const frontier = new MinHeap();
  const settled = new Set();
  frontier.push({ node: start, priority: 0 });
  while (frontier.size > 0) {
    const { node: current } = frontier.pop();
    if (settled.has(current)) continue; // stale heap entry
    settled.add(current);
    if (current === end) break; // early termination
    for (const [neighbor, weight] of Object.entries(graph[current].neighbors)) {
      if (settled.has(neighbor)) continue;
      const candidate = distances[current] + weight;
      if (candidate < distances[neighbor]) {
        distances[neighbor] = candidate;
        previous[neighbor] = current;
        frontier.push({ node: neighbor, priority: candidate });
      }
    }
  }
  return buildResult(distances, previous, end, settled);
}

function aStar(graph, start, end) {
  const { distances, previous } = initialiseSearch(graph, start);
  const frontier = new MinHeap();
  const settled = new Set();
  frontier.push({ node: start, priority: haversineDistance(graph[start], graph[end]) });
  while (frontier.size > 0) {
    const { node: current } = frontier.pop();
    if (settled.has(current)) continue;
    settled.add(current);
    if (current === end) break;
    for (const [neighbor, weight] of Object.entries(graph[current].neighbors)) {
      if (settled.has(neighbor)) continue;
      const candidate = distances[current] + weight;
      if (candidate < distances[neighbor]) {
        distances[neighbor] = candidate;
        previous[neighbor] = current;
        frontier.push({ node: neighbor, priority: candidate + haversineDistance(graph[neighbor], graph[end]) });
      }
    }
  }
  return buildResult(distances, previous, end, settled);
}

const algorithms = {
  linear: { label: 'Dijkstra (linear scan)', search: dijkstraLinear },
  heap: { label: 'Dijkstra (binary heap)', search: dijkstraHeap },
  astar: { label: 'A* (haversine)', search: aStar }
};
let graph = createInitialGraph();

function publicLocations() {
  return Object.fromEntries(Object.entries(graph).map(([name, location]) => [name, { lat: location.lat, lng: location.lng }]));
}

app.get('/api/locations', (req, res) => res.json(publicLocations()));
app.get('/api/algorithms', (req, res) => res.json(Object.fromEntries(Object.entries(algorithms).map(([id, value]) => [id, value.label]))));

app.post('/api/locations', (req, res) => {
  const { name, lat, lng, connectTo, distance } = req.body;
  const normalisedName = typeof name === 'string' ? name.trim() : '';
  const numericLat = Number(lat);
  const numericLng = Number(lng);
  const numericDistance = Number(distance);
  if (!normalisedName || graph[normalisedName]) return res.status(400).json({ error: 'Provide a unique landmark name.' });
  if (!Number.isFinite(numericLat) || numericLat < -90 || numericLat > 90 || !Number.isFinite(numericLng) || numericLng < -180 || numericLng > 180) return res.status(400).json({ error: 'Latitude and longitude are invalid.' });
  if (!connectTo || !graph[connectTo] || !Number.isFinite(numericDistance) || numericDistance <= 0) return res.status(400).json({ error: 'Select an existing landmark and a positive road distance.' });
  const candidate = { lat: numericLat, lng: numericLng };
  const directDistance = haversineDistance(candidate, graph[connectTo]);
  if (numericDistance < directDistance) return res.status(400).json({ error: `Road distance must be at least ${directDistance.toFixed(2)} km to preserve A* optimality.` });
  graph[normalisedName] = { ...candidate, neighbors: { [connectTo]: numericDistance } };
  graph[connectTo].neighbors[normalisedName] = numericDistance;
  return res.status(201).json({ success: true, location: { name: normalisedName, ...candidate } });
});

app.post('/api/shortest-path', (req, res) => {
  const { start, end, algorithm = 'astar' } = req.body;
  if (!start || !end || !graph[start] || !graph[end]) return res.status(400).json({ error: 'Valid start and destination locations are required.' });
  if (!algorithms[algorithm]) return res.status(400).json({ error: 'Unknown algorithm. Use linear, heap, or astar.' });
  if (start === end) return res.json({ success: true, path: [{ name: start, lat: graph[start].lat, lng: graph[start].lng }], distance: 0, settledVertices: 0, algorithm, algorithmLabel: algorithms[algorithm].label, message: 'You are already at the destination!' });
  const result = algorithms[algorithm].search(graph, start, end);
  if (!result.success) return res.status(400).json({ error: 'No path found between the locations.' });
  return res.json({ success: true, path: result.path.map(name => ({ name, lat: graph[name].lat, lng: graph[name].lng })), distance: Number(result.distance.toFixed(3)), settledVertices: result.settledVertices, algorithm, algorithmLabel: algorithms[algorithm].label });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Shortest-route app for the Pune VIT region');
  });
}

module.exports = { app, aStar, createInitialGraph, dijkstraHeap, dijkstraLinear, haversineDistance, MinHeap, resetGraph: () => { graph = createInitialGraph(); } };
