require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8080;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// In-memory storage (replace with database in production)
const gameData = {
  players: {},
  gameStates: {}
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Player endpoints
app.get('/api/player/:playerId', (req, res) => {
  const { playerId } = req.params;
  const player = gameData.players[playerId];
  
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  
  res.json(player);
});

app.post('/api/player', (req, res) => {
  const { playerId, playerName, score, level } = req.body;
  
  if (!playerId) {
    return res.status(400).json({ error: 'Player ID is required' });
  }
  
  gameData.players[playerId] = {
    playerId,
    playerName: playerName || 'Anonymous',
    score: score || 0,
    level: level || 1,
    lastUpdated: new Date().toISOString()
  };
  
  res.status(201).json(gameData.players[playerId]);
});

app.put('/api/player/:playerId', (req, res) => {
  const { playerId } = req.params;
  const updates = req.body;
  
  if (!gameData.players[playerId]) {
    return res.status(404).json({ error: 'Player not found' });
  }
  
  gameData.players[playerId] = {
    ...gameData.players[playerId],
    ...updates,
    lastUpdated: new Date().toISOString()
  };
  
  res.json(gameData.players[playerId]);
});

app.delete('/api/player/:playerId', (req, res) => {
  const { playerId } = req.params;
  
  if (!gameData.players[playerId]) {
    return res.status(404).json({ error: 'Player not found' });
  }
  
  delete gameData.players[playerId];
  res.status(204).send();
});

// Game state endpoints
app.get('/api/gamestate/:stateId', (req, res) => {
  const { stateId } = req.params;
  const state = gameData.gameStates[stateId];
  
  if (!state) {
    return res.status(404).json({ error: 'Game state not found' });
  }
  
  res.json(state);
});

app.post('/api/gamestate', (req, res) => {
  const { stateId, data } = req.body;
  
  if (!stateId) {
    return res.status(400).json({ error: 'State ID is required' });
  }
  
  gameData.gameStates[stateId] = {
    stateId,
    data: data || {},
    timestamp: new Date().toISOString()
  };
  
  res.status(201).json(gameData.gameStates[stateId]);
});

// Leaderboard endpoint
app.get('/api/leaderboard', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  const sortedPlayers = Object.values(gameData.players)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, limit);
  
  res.json(sortedPlayers);
});

// WebSocket Server for real-time communication
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);
      
      // Echo back to client
      ws.send(JSON.stringify({
        type: 'response',
        data: data,
        timestamp: new Date().toISOString()
      }));
      
      // Broadcast to all clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'broadcast',
            data: data,
            timestamp: new Date().toISOString()
          }));
        }
      });
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Start HTTP server
app.listen(PORT, () => {
  console.log(`HTTP Server running on port ${PORT}`);
  console.log(`WebSocket Server running on port ${WS_PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing servers');
  wss.close(() => {
    console.log('WebSocket server closed');
  });
  process.exit(0);
});
