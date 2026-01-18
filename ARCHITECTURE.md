# Backend Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Unity WebGL Game                         │
│                    (Running in Browser)                          │
└────────────┬────────────────────────────────┬───────────────────┘
             │                                 │
             │ HTTP/REST API                   │ WebSocket (Real-time)
             │ (Player, Game State)            │ (Live Updates)
             │                                 │
             ▼                                 ▼
    ┌────────────────────┐         ┌──────────────────────┐
    │   Express Server   │         │  WebSocket Server    │
    │   Port: 3000       │         │  Port: 8080          │
    └────────────────────┘         └──────────────────────┘
             │                                 │
             └─────────────┬───────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  In-Memory DB   │
                  │  (gameData)     │
                  │  - Players      │
                  │  - GameStates   │
                  └─────────────────┘
```

## API Endpoints Flow

### 1. Player Management
```
Unity → POST /api/player → Create Player → Store in Memory → Return Player Data
Unity → GET /api/player/:id → Fetch Player → Return Player Data
Unity → PUT /api/player/:id → Update (Filtered) → Return Updated Data
Unity → DELETE /api/player/:id → Remove Player → Return 204
```

### 2. Leaderboard
```
Unity → GET /api/leaderboard?limit=N → Sort by Score → Return Top N (max 100)
```

### 3. Game State
```
Unity → POST /api/gamestate → Save State → Store in Memory → Return State
Unity → GET /api/gamestate/:id → Load State → Return State Data
```

### 4. WebSocket Communication
```
Unity Client ─── Connect ──→ WebSocket Server
                                    │
                                    ├─── Echo to Sender
                                    │
                                    └─── Broadcast to All Other Clients
```

## Security Layers

```
Request → CORS Check → Body Parser → Endpoint Handler → Field Validation → Response
             ↓             ↓              ↓                    ↓              ↓
        Allow/Deny    Parse JSON    Execute Logic    Filter Fields    Send Data
```

### Security Features
1. **CORS Protection** - Only allowed origins can connect
2. **Field Whitelisting** - PUT requests only update allowed fields
3. **Rate Limiting** - Leaderboard max 100 results
4. **Input Validation** - WebSocket messages validated
5. **Dependency Security** - All packages patched (0 vulnerabilities)

## Data Models

### Player Object
```javascript
{
  playerId: string,      // Immutable (protected in PUT)
  playerName: string,    // Updatable
  score: number,         // Updatable
  level: number,         // Updatable
  lastUpdated: ISO8601   // Auto-generated
}
```

### Game State Object
```javascript
{
  stateId: string,
  data: object,          // Any JSON data
  timestamp: ISO8601
}
```

### WebSocket Message
```javascript
{
  type: string,          // "response" | "broadcast" | "error"
  data: object,          // Original message data
  timestamp: ISO8601
}
```

## Deployment Architecture

### Docker Deployment
```
┌──────────────────────────────────┐
│      Docker Container            │
│                                  │
│  ┌────────────────────────────┐ │
│  │   Node.js Application      │ │
│  │   - Express (Port 3000)    │ │
│  │   - WebSocket (Port 8080)  │ │
│  └────────────────────────────┘ │
│                                  │
│  Volumes: ./logs                 │
│  Network: unity-network          │
└──────────────────────────────────┘
```

### Cloud Deployment Options
```
Local Dev → Git Push → Cloud Platform → Container Registry → Deployment
                            ↓
                    ┌───────┴────────┐
                    │                │
                Heroku           AWS/Azure/GCP
                    │                │
                    └────────┬───────┘
                             ↓
                    Production Server
                    (HTTPS + WSS)
```

## Performance Considerations

### Current Implementation
- **Storage**: In-memory (fast but volatile)
- **Concurrency**: Single Node.js process
- **Scalability**: Single instance

### Production Recommendations
```
Load Balancer
      ↓
   ┌──┴──┐
   │  │  │
  App1 App2 App3  ← Multiple instances
   │  │  │
   └──┬──┘
      ↓
   Database (Persistent)
      ↓
   Cache Layer (Redis)
```

## File Structure

```
backend_for_project/
├── server.js              ← Core application logic
├── package.json           ← Dependencies & scripts
├── .env.example          ← Configuration template
├── Dockerfile            ← Container build instructions
├── docker-compose.yml    ← Multi-container orchestration
├── UnityBackendClient.cs ← Unity integration code
├── test-server.sh        ← Automated testing
└── Documentation
    ├── README.md         ← Full documentation
    ├── QUICKSTART.md     ← Quick start guide
    ├── SUMMARY.md        ← Implementation summary
    └── ARCHITECTURE.md   ← This file
```

## Request/Response Examples

### Create Player
```bash
POST /api/player
Content-Type: application/json

{
  "playerId": "player123",
  "playerName": "John",
  "score": 100,
  "level": 1
}

→ Response: 201 Created
{
  "playerId": "player123",
  "playerName": "John",
  "score": 100,
  "level": 1,
  "lastUpdated": "2026-01-18T00:00:00.000Z"
}
```

### Update Player (Security Check)
```bash
PUT /api/player/player123
Content-Type: application/json

{
  "playerId": "hacker",      ← Filtered out
  "score": 999,              ← Allowed
  "malicious": "data"        ← Filtered out
}

→ Response: 200 OK
{
  "playerId": "player123",   ← Unchanged (protected)
  "playerName": "John",
  "score": 999,              ← Updated
  "level": 1,
  "lastUpdated": "2026-01-18T00:00:01.000Z"
}
```

## Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|----------|
| Runtime | Node.js | 14+ | JavaScript runtime |
| Framework | Express | 4.18.2 | HTTP server |
| WebSocket | ws | 8.17.1 | Real-time communication |
| CORS | cors | 2.8.5 | Cross-origin security |
| Config | dotenv | 16.3.1 | Environment management |
| Dev Tools | nodemon | 3.0.1 | Auto-reload in dev |
| Container | Docker | - | Deployment |
| Language | JavaScript | ES6+ | Server-side code |
| Unity Client | C# | - | Game integration |

---

**Last Updated**: 2026-01-18
