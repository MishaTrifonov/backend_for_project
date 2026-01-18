# Quick Start Guide

## Get Started in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

The server will be available at:
- HTTP API: http://localhost:3000
- WebSocket: ws://localhost:8080

### 3. Test the Server
```bash
./test-server.sh
```

## Quick API Examples

### Create a Player
```bash
curl -X POST http://localhost:3000/api/player \
  -H "Content-Type: application/json" \
  -d '{"playerId":"player1","playerName":"John","score":100,"level":1}'
```

### Get Player Data
```bash
curl http://localhost:3000/api/player/player1
```

### Update Player Score
```bash
curl -X PUT http://localhost:3000/api/player/player1 \
  -H "Content-Type: application/json" \
  -d '{"score":500}'
```

### Get Leaderboard
```bash
curl http://localhost:3000/api/leaderboard?limit=10
```

### Save Game State
```bash
curl -X POST http://localhost:3000/api/gamestate \
  -H "Content-Type: application/json" \
  -d '{"stateId":"level1","data":{"checkpoint":5}}'
```

## Unity Integration

1. Copy `UnityBackendClient.cs` to your Unity project
2. Attach it to a GameObject
3. Set the server URL in the Inspector
4. Use the methods to interact with the backend:

```csharp
// Save player data
StartCoroutine(SavePlayer(score: 1000, level: 5));

// Load leaderboard
StartCoroutine(GetLeaderboard(10, (players) => {
    foreach (var player in players) {
        Debug.Log($"{player.playerName}: {player.score}");
    }
}));
```

## Deployment

### Using Docker
```bash
docker-compose up -d
```

### To Cloud Platform
See the main README.md for detailed deployment instructions for:
- Heroku
- AWS/Azure/GCP
- VPS Servers

## Need Help?

- Check the full [README.md](README.md) for complete documentation
- Run `./test-server.sh` to verify everything is working
- Check server logs for debugging information
