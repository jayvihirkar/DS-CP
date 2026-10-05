# Shortest Distance Web App

A web application for finding and visualising shortest routes between Pune VIT-region landmarks. It implements the three search engines described in the accompanying paper: baseline linear-scan Dijkstra, binary-heap Dijkstra with early termination, and haversine-guided A*.

## Features

- 🗺️ Interactive map visualization using Leaflet.js
- 🧮 Compare linear Dijkstra, binary-heap Dijkstra, and A* search
- ⚡ Binary min-heap frontier with stale-entry handling and early termination
- 🌍 Admissible, consistent haversine heuristic for A* (road edges cannot be shorter than the direct geographic distance)
- 📍 Multiple locations in Pune VIT region (VIT Kondhwa, VIT Bibwewadi, Railway Station, Hinjewadi, etc.)
- ➕ Add a landmark with coordinates and a weighted road connection at runtime
- 📏 Distance and settled-vertex metrics for each route request
- 🔵 Leaflet markers and OSRM road-route visualisation

## Technology Stack

- **Backend**: Node.js + Express
- **Frontend**: HTML, CSS, JavaScript + Leaflet.js
- **Algorithm**: Dijkstra's Shortest Path Algorithm

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Start the server:**
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

3. **Open in browser:**
```
http://localhost:3000
```

## How It Works

### Graph Representation
The application uses a weighted graph where:
- **Nodes** represent locations in Pune (colleges, stations, landmarks)
- **Edges** represent roads/connections between locations
- **Weights** represent distances in kilometers

### Search engines
- **Dijkstra (linear scan):** Selects the next vertex by scanning all unvisited vertices, with O(V²) time complexity.
- **Dijkstra (binary heap):** Uses a min-heap and early termination when the destination is settled, with O((V + E) log V) time complexity.
- **A* (haversine):** Orders the same heap by `distance-so-far + haversine-to-goal`. It remains optimal because every road edge is at least as long as the corresponding straight-line distance.

The result includes the selected engine and the number of settled vertices so the search reduction of A* is visible in the UI.

### Dynamic landmarks
Use **Add a landmark** to supply a name, latitude, longitude, an existing landmark to connect to, and the road distance. The application rejects a distance shorter than the haversine distance so A*'s optimality guarantee remains valid.

### Locations Included
- VIT Kondhwa Campus
- VIT Bibwewadi Campus
- Swargate
- Shivaji Nagar
- Railway Station
- Katraj
- Sinhgad
- Hinjewadi

## Usage

1. Select a **Starting Location** from the dropdown
2. Select a **Destination** from the dropdown
3. Click **"Find Shortest Path"** button
4. View the shortest route on the map
5. See the path details and total distance

## API Endpoints

### GET /api/locations
Returns all available locations with their coordinates.

### POST /api/shortest-path
Request body:
```json
{
  "start": "VIT Kondhwa Campus",
  "end": "Railway Station",
  "algorithm": "astar"
}
```

Response:
```json
{
  "success": true,
  "path": [
    {
      "name": "VIT Kondhwa Campus",
      "lat": 18.4643,
      "lng": 73.8680
    },
    ...
  ],
  "distance": 15.5,
  "settledVertices": 4,
  "algorithm": "astar",
  "algorithmLabel": "A* (haversine)"
}
```

### POST /api/locations
Adds one landmark and a bidirectional weighted road connection.

```json
{
  "name": "New Landmark",
  "lat": 18.46,
  "lng": 73.87,
  "connectTo": "Upper Depot",
  "distance": 1.4
}
```

## Validation and benchmarks

```bash
npm test
npm run benchmark
```

The test suite verifies that all three engines return identical shortest distances for every pair of included landmarks and that every initial edge preserves the A* heuristic guarantee. The benchmark script generates deterministic Pune-area landmark graphs for 10, 100, 1,000, and 10,000 vertices; use `node scripts/benchmark.js --sizes=10,100` for a quick run. It uses 200 queries through 1,000 vertices and 3 queries at 10,000 by default so the intentionally O(V²) baseline remains interactive; pass `--large-queries=50` for a paper-scale 10,000-vertex sample.

## Project Structure

```
DS-CP/
├── index.js              # Server and Dijkstra algorithm
├── package.json          # Dependencies
├── README.md             # This file
├── scripts/benchmark.js  # Reproducible algorithm benchmark
├── test/algorithms.test.js # Native Node test suite
└── public/
    └── index.html        # Frontend UI and map
```

## License

MIT

