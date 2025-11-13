# Shortest Distance Web App

A web application to find the shortest path between locations in Pune, focusing on VIT campuses and surrounding areas using **Dijkstra's Algorithm**.

## Features

- 🗺️ Interactive map visualization using Leaflet.js
- 🧮 Dijkstra's algorithm implementation for finding shortest paths
- 📍 Multiple locations in Pune VIT region (VIT Kondhwa, VIT Bibwewadi, Railway Station, Hinjewadi, etc.)
- 🎨 Beautiful, modern UI with gradient design
- 📏 Distance calculation in kilometers
- 🔵 Visual path highlighting on map

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

### Dijkstra's Algorithm
1. Initialize all distances as infinite except the start node (0)
2. Visit unvisited nodes starting from the nearest
3. Update distances to all neighbors
4. Track the shortest path found so far
5. Continue until the destination is reached
6. Reconstruct the final path

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
  "end": "Railway Station"
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
  "distance": 15.5
}
```

## Project Structure

```
DS-CP/
├── index.js              # Server and Dijkstra algorithm
├── package.json          # Dependencies
├── README.md             # This file
└── public/
    └── index.html        # Frontend UI and map
```

## License

MIT

