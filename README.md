# Unity WebGL Backend Service

A Node.js/Express backend service designed to support Unity WebGL applications with RESTful APIs and WebSocket support for real-time communication.

## Features

- **RESTful API Endpoints**: Manage player data and game states
- **WebSocket Support**: Real-time bidirectional communication
- **CORS Enabled**: Configured for Unity WebGL cross-origin requests
- **Docker Support**: Easy deployment with Docker and Docker Compose
- **Leaderboard System**: Built-in leaderboard functionality
- **Health Monitoring**: Health check endpoint for monitoring

## Prerequisites

- Node.js 14.0.0 or higher
- npm or yarn
- Docker (optional, for containerized deployment)

## Installation

### Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd backend_for_project
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
cp .env.example .env
```

4. Edit `.env` file with your configuration:
```env
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,https://yourgame.com
WS_PORT=8080
```

5. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on:
- HTTP Server: `http://localhost:3000`
- WebSocket Server: `ws://localhost:8080`

### Docker Deployment

1. Build and run with Docker Compose:
```bash
docker-compose up -d
```

2. View logs:
```bash
docker-compose logs -f
```

3. Stop the service:
```bash
docker-compose down
```

## API Endpoints

### Health Check
- **GET** `/health`
  - Returns server health status and uptime
  - Response: `{ status: 'ok', timestamp: '...', uptime: 123.45 }`

### Player Management

- **GET** `/api/player/:playerId`
  - Get player data by ID
  - Response: Player object or 404 if not found

- **POST** `/api/player`
  - Create or update player
  - Body: `{ playerId, playerName, score, level }`
  - Response: Created player object

- **PUT** `/api/player/:playerId`
  - Update existing player
  - Body: Fields to update
  - Response: Updated player object

- **DELETE** `/api/player/:playerId`
  - Delete player
  - Response: 204 No Content

### Game State Management

- **GET** `/api/gamestate/:stateId`
  - Get game state by ID
  - Response: Game state object or 404 if not found

- **POST** `/api/gamestate`
  - Save game state
  - Body: `{ stateId, data }`
  - Response: Saved game state object

### Leaderboard

- **GET** `/api/leaderboard?limit=10`
  - Get top players sorted by score
  - Query params: `limit` (default: 10)
  - Response: Array of player objects

## WebSocket Communication

Connect to `ws://localhost:8080` for real-time communication.

### Message Format
Send JSON messages:
```javascript
{
  "type": "event_type",
  "data": { /* your data */ }
}
```

The server will:
1. Echo the message back to the sender
2. Broadcast the message to all other connected clients

### Example Unity C# WebSocket Client
```csharp
using System;
using UnityEngine;
using WebSocketSharp;

public class WebSocketClient : MonoBehaviour
{
    private WebSocket ws;
    
    void Start()
    {
        ws = new WebSocket("ws://localhost:8080");
        
        ws.OnMessage += (sender, e) =>
        {
            Debug.Log("Received: " + e.Data);
        };
        
        ws.Connect();
    }
    
    public void SendMessage(string message)
    {
        ws.Send(message);
    }
    
    void OnDestroy()
    {
        ws.Close();
    }
}
```

## Unity Integration Example

### HTTP Requests (Using UnityWebRequest)
```csharp
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

public class BackendClient : MonoBehaviour
{
    private string baseUrl = "http://localhost:3000/api";
    
    public IEnumerator SavePlayerData(string playerId, string playerName, int score)
    {
        var playerData = new PlayerData
        {
            playerId = playerId,
            playerName = playerName,
            score = score
        };
        
        string jsonData = JsonUtility.ToJson(playerData);
        
        using (UnityWebRequest request = UnityWebRequest.Post(baseUrl + "/player", jsonData, "application/json"))
        {
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                Debug.Log("Player saved: " + request.downloadHandler.text);
            }
            else
            {
                Debug.LogError("Error: " + request.error);
            }
        }
    }
}

[System.Serializable]
public class PlayerData
{
    public string playerId;
    public string playerName;
    public int score;
}
```

## Deployment

### Cloud Deployment Options

#### Heroku
```bash
# Login to Heroku
heroku login

# Create app
heroku create your-unity-backend

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set ALLOWED_ORIGINS=https://yourgame.com

# Deploy
git push heroku main
```

#### AWS/Azure/GCP
Use the provided Dockerfile to deploy to any cloud container service:
- AWS Elastic Container Service (ECS)
- Azure Container Instances
- Google Cloud Run

#### VPS (DigitalOcean, Linode, etc.)
```bash
# SSH into your server
ssh user@your-server-ip

# Clone repository
git clone <repository-url>
cd backend_for_project

# Install dependencies
npm install

# Use PM2 for process management
npm install -g pm2
pm2 start server.js --name unity-backend
pm2 save
pm2 startup
```

## Security Considerations

⚠️ **Important**: This implementation uses in-memory storage for demonstration purposes.

For production:
1. Replace in-memory storage with a proper database (MongoDB, PostgreSQL, etc.)
2. Implement authentication and authorization
3. Add rate limiting
4. Use HTTPS/WSS in production
5. Validate and sanitize all inputs
6. Set specific ALLOWED_ORIGINS instead of '*'
7. Add logging and monitoring
8. Implement data persistence

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | HTTP server port | 3000 |
| WS_PORT | WebSocket server port | 8080 |
| NODE_ENV | Environment (development/production) | development |
| ALLOWED_ORIGINS | Comma-separated list of allowed origins | * |

## Troubleshooting

### CORS Issues
Make sure your Unity WebGL build URL is included in the `ALLOWED_ORIGINS` environment variable.

### WebSocket Connection Failed
- Check if the WebSocket port is open
- Verify the WebSocket URL in your Unity client
- Use `ws://` for local development, `wss://` for production with SSL

### Port Already in Use
Change the PORT or WS_PORT in your `.env` file to use different ports.

## License

MIT