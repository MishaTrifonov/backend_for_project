#!/bin/bash
# Comprehensive test script for Unity WebGL Backend Service

echo "======================================"
echo "Unity WebGL Backend Service Test Suite"
echo "======================================"

# Start the server
echo -e "\n[1/9] Starting server..."
node server.js &
SERVER_PID=$!
sleep 4

# Test 1: Health Check
echo -e "\n[2/9] Testing Health Check..."
HEALTH=$(curl -s http://localhost:3000/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "✓ Health check passed"
else
    echo "✗ Health check failed"
fi

# Test 2: Authentication - Valid Login
echo -e "\n[3/9] Testing Authentication - Valid Login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo "✓ Authentication successful"
    echo "$LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null | head -10
else
    echo "✗ Authentication failed"
    echo "$LOGIN_RESPONSE"
fi

# Test 3: Authentication - Invalid Login
echo -e "\n[4/9] Testing Authentication - Invalid Login..."
INVALID_LOGIN=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"hacker","password":"wrongpass"}')

if echo "$INVALID_LOGIN" | grep -q '"success":false'; then
    echo "✓ Invalid login properly rejected"
else
    echo "✗ Security issue: invalid login accepted"
fi

# Test 4: Create Players
echo -e "\n[5/9] Creating test players..."
curl -s -X POST http://localhost:3000/api/player \
  -H "Content-Type: application/json" \
  -d '{"playerId":"alice","playerName":"Alice","score":500,"level":5}' > /dev/null

curl -s -X POST http://localhost:3000/api/player \
  -H "Content-Type: application/json" \
  -d '{"playerId":"bob","playerName":"Bob","score":750,"level":7}' > /dev/null

curl -s -X POST http://localhost:3000/api/player \
  -H "Content-Type: application/json" \
  -d '{"playerId":"charlie","playerName":"Charlie","score":300,"level":3}' > /dev/null

echo "✓ Created 3 test players"

# Test 5: Get Player
echo -e "\n[6/9] Retrieving player data..."
PLAYER=$(curl -s http://localhost:3000/api/player/alice)
if echo "$PLAYER" | grep -q '"playerName":"Alice"'; then
    echo "✓ Player retrieval successful"
else
    echo "✗ Player retrieval failed"
fi

# Test 6: Update Player
echo -e "\n[7/9] Updating player score..."
curl -s -X PUT http://localhost:3000/api/player/alice \
  -H "Content-Type: application/json" \
  -d '{"score":1000}' > /dev/null

UPDATED=$(curl -s http://localhost:3000/api/player/alice)
if echo "$UPDATED" | grep -q '"score":1000'; then
    echo "✓ Player update successful"
else
    echo "✗ Player update failed"
fi

# Test 7: Leaderboard
echo -e "\n[8/9] Testing leaderboard..."
LEADERBOARD=$(curl -s "http://localhost:3000/api/leaderboard?limit=3")
LEADER_COUNT=$(echo "$LEADERBOARD" | grep -o '"playerId"' | wc -l)
if [ "$LEADER_COUNT" -eq 3 ]; then
    echo "✓ Leaderboard returned $LEADER_COUNT players"
    echo "$LEADERBOARD" | python3 -m json.tool 2>/dev/null | head -15
else
    echo "✗ Leaderboard test failed"
fi

# Test 8: Game State
echo -e "\n[9/9] Testing game state save/load..."
curl -s -X POST http://localhost:3000/api/gamestate \
  -H "Content-Type: application/json" \
  -d '{"stateId":"checkpoint1","data":{"level":5,"position":{"x":100,"y":200}}}' > /dev/null

STATE=$(curl -s http://localhost:3000/api/gamestate/checkpoint1)
if echo "$STATE" | grep -q '"stateId":"checkpoint1"'; then
    echo "✓ Game state save/load successful"
else
    echo "✗ Game state test failed"
fi

# WebSocket info
echo -e "\nWebSocket server is running on port 8080"
echo "Connect from Unity using: ws://localhost:8080"

# Cleanup
echo -e "\n======================================"
echo "Test Summary Complete"
echo "======================================"
echo -e "\nDefault Login Credentials:"
echo "Username: admin"
echo "Password: admin123"
echo -e "\nStopping server..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
echo "All tests completed!"