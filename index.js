const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Graph representation for Pune college region
// Nodes represent key locations in Pune with their coordinates (lat, lng)
const graph = {
  'VIT Kondhwa Campus': { lat: 18.4597, lng: 73.8844, neighbors: {} },
  'VIT Bibwewadi Campus': { lat: 18.4628, lng: 73.8680, neighbors: {} },
  'Swargate': { lat: 18.500605533841608, lng: 73.85841056598598, neighbors: {} },
  'Shivaji Nagar': { lat: 18.53025950764808, lng: 73.85008521330353, neighbors: {} },
  'Railway Station': { lat: 18.529268626151026, lng: 73.87414034947514, neighbors: {} },
  'Katraj': { lat: 18.448198224959548, lng: 73.85848909610095, neighbors: {} },
  'Sinhgad': { lat: 18.466656934037342, lng: 73.83567939610137, neighbors: {} },
  'Hinjewadi': { lat: 18.5893, lng: 73.7054, neighbors: {} },
  'MIT ADT': { lat: 18.49318668349125, lng: 74.02340020910424, neighbors: {} },
  'Upper Depot': { lat: 18.46109567280875, lng: 73.8720547245966, neighbors:{} },
  'PICT' : { lat: 18.457236774425763, lng: 73.85119971764523, neighbors:{} }
};

// Road network - weighted edges (distances in km)
function initializeGraph() {
  // VIT Kondhwa Campus connections
  graph['VIT Kondhwa Campus'].neighbors['Upper Depot'] = 1.5;
  graph['VIT Kondhwa Campus'].neighbors['Katraj'] = 4.1;
  graph['VIT Kondhwa Campus'].neighbors['Swargate'] = 6.5;
  graph['VIT Kondhwa Campus'].neighbors['Railway Station'] = 8.9;
  graph['VIT Kondhwa Campus'].neighbors['Hinjewadi'] = 24;
  graph['VIT Kondhwa Campus'].neighbors['MIT ADT'] = 21;

  
  // VIT Bibwewadi Campus connections
  graph['VIT Bibwewadi Campus'].neighbors['Upper Depot'] = 0.9;
  graph['VIT Bibwewadi Campus'].neighbors['Swargate'] = 6;
  graph['VIT Bibwewadi Campus'].neighbors['Katraj'] = 8;
 // graph['VIT Bibwewadi Campus'].neighbors['PICT'] = 3.2;

  
  // Swargate connections
  graph['Swargate'].neighbors['VIT Kondhwa Campus'] = 7;
  graph['Swargate'].neighbors['VIT Bibwewadi Campus'] = 6;
  graph['Swargate'].neighbors['Shivaji Nagar'] = 5;
  graph['Swargate'].neighbors['Katraj'] = 12;
  graph['Swargate'].neighbors['Railway Station'] = 3;
  
  // Shivaji Nagar connections
  graph['Shivaji Nagar'].neighbors['Swargate'] = 5;
  graph['Shivaji Nagar'].neighbors['Railway Station'] = 3;
  graph['Shivaji Nagar'].neighbors['Hinjewadi'] = 14;
  
  // Railway Station connections
  graph['Railway Station'].neighbors['Shivaji Nagar'] = 3;
  graph['Railway Station'].neighbors['Hinjewadi'] = 18;
  
  // Katraj connections
  graph['Katraj'].neighbors['VIT Kondhwa Campus'] = 8;
  graph['Katraj'].neighbors['VIT Bibwewadi Campus'] = 8;
  graph['Katraj'].neighbors['Swargate'] = 12;
  graph['Katraj'].neighbors['Sinhgad'] = 15;
  
  // Sinhgad connections
  graph['Sinhgad'].neighbors['Katraj'] = 15;
  graph['Sinhgad'].neighbors['Hinjewadi'] = 20;
  
  // Hinjewadi connections
  graph['Hinjewadi'].neighbors['Railway Station'] = 18;
  graph['Hinjewadi'].neighbors['Shivaji Nagar'] = 14;
  graph['Hinjewadi'].neighbors['Sinhgad'] = 20;

  // Upper Depot connections
  graph['Upper Depot'].neighbors['VIT Bibwewadi Campus'] = 0.8;
  graph['Upper Depot'].neighbors['VIT Kondhwa Campus'] = 1.6;
  graph['Upper Depot'].neighbors['Katraj'] = 1.6;
  graph['Upper Depot'].neighbors['PICT'] = 3.4;

  
}

// Initialize the graph
initializeGraph();

// Dijkstra's Algorithm Implementation
function dijkstra(start, end) {
  const distances = {};
  const previous = {};
  const unvisited = new Set();
  const visited = new Set();
  
  // Initialize distances
  for (const node in graph) {
    distances[node] = node === start ? 0 : Infinity;
    previous[node] = null;
    unvisited.add(node);
  }
  
  // Dijkstra's main loop
  while (unvisited.size > 0) {
    // Find unvisited node with minimum distance
    let currentNode = null;
    let minDistance = Infinity;
    
    for (const node of unvisited) {
      if (distances[node] < minDistance) {
        minDistance = distances[node];
        currentNode = node;
      }
    }
    
    if (!currentNode || distances[currentNode] === Infinity) {
      break;
    }
    
    // Move current node from unvisited to visited
    unvisited.delete(currentNode);
    visited.add(currentNode);
    
    // If we reached the destination, we're done
    if (currentNode === end) {
      break;
    }
    
    // Update distances to neighbors
    for (const neighbor in graph[currentNode].neighbors) {
      if (!visited.has(neighbor)) {
        const edgeWeight = graph[currentNode].neighbors[neighbor];
        const newDistance = distances[currentNode] + edgeWeight;
        
        if (newDistance < distances[neighbor]) {
          distances[neighbor] = newDistance;
          previous[neighbor] = currentNode;
        }
      }
    }
  }
  
  // Reconstruct the path
  const path = [];
  let current = end;
  
  while (current !== null) {
    path.unshift(current);
    current = previous[current];
  }
  
  // Return path and distance
  return {
    path: distances[end] === Infinity ? [] : path,
    distance: distances[end],
    success: distances[end] !== Infinity
  };
}

// API Routes

// Get all locations
app.get('/api/locations', (req, res) => {
  const locations = {};
  for (const name in graph) {
    locations[name] = {
      lat: graph[name].lat,
      lng: graph[name].lng
    };
  }
  res.json(locations);
});

// Find shortest path
app.post('/api/shortest-path', (req, res) => {
  const { start, end } = req.body;
  
  if (!start || !end) {
    return res.status(400).json({ error: 'Start and end locations are required' });
  }
  
  if (!graph[start] || !graph[end]) {
    return res.status(400).json({ error: 'Invalid location(s) provided' });
  }
  
  if (start === end) {
    return res.json({
      success: true,
      path: [start],
      distance: 0,
      message: 'You are already at the destination!'
    });
  }
  
  const result = dijkstra(start, end);
  
  if (!result.success) {
    return res.status(400).json({ error: 'No path found between the locations' });
  }
  
  // Add coordinates to the path
  const pathWithCoords = result.path.map(node => ({
    name: node,
    lat: graph[node].lat,
    lng: graph[node].lng
  }));
  
  res.json({
    path: pathWithCoords,
    distance: result.distance,
    success: true
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📍 Shortest Distance App for Pune VIT Region`);
});

