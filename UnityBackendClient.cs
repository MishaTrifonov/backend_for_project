using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;

/// <summary>
/// Example Unity client for communicating with the backend server
/// Place this script in your Unity project's Assets folder
/// </summary>
public class UnityBackendClient : MonoBehaviour
{
    [Header("Server Configuration")]
    [SerializeField] private string serverUrl = "http://localhost:3000";
    
    [Header("Player Info")]
    [SerializeField] private string playerId;
    [SerializeField] private string playerName;
    
    private void Start()
    {
        // Generate unique player ID if not set
        if (string.IsNullOrEmpty(playerId))
        {
            playerId = System.Guid.NewGuid().ToString();
        }
        
        // Test health check on start
        StartCoroutine(CheckServerHealth());
    }
    
    /// <summary>
    /// Check if server is running
    /// </summary>
    public IEnumerator CheckServerHealth()
    {
        using (UnityWebRequest request = UnityWebRequest.Get(serverUrl + "/health"))
        {
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                Debug.Log("Server is healthy: " + request.downloadHandler.text);
            }
            else
            {
                Debug.LogError("Health check failed: " + request.error);
            }
        }
    }
    
    /// <summary>
    /// Save player data to server
    /// </summary>
    public IEnumerator SavePlayer(int score, int level)
    {
        var playerData = new PlayerData
        {
            playerId = playerId,
            playerName = playerName,
            score = score,
            level = level
        };
        
        string jsonData = JsonUtility.ToJson(playerData);
        
        using (UnityWebRequest request = new UnityWebRequest(serverUrl + "/api/player", "POST"))
        {
            byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                Debug.Log("Player saved: " + request.downloadHandler.text);
            }
            else
            {
                Debug.LogError("Save player failed: " + request.error);
            }
        }
    }
    
    /// <summary>
    /// Load player data from server
    /// </summary>
    public IEnumerator LoadPlayer(string targetPlayerId, Action<PlayerData> onSuccess)
    {
        using (UnityWebRequest request = UnityWebRequest.Get(serverUrl + "/api/player/" + targetPlayerId))
        {
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                PlayerData player = JsonUtility.FromJson<PlayerData>(request.downloadHandler.text);
                onSuccess?.Invoke(player);
                Debug.Log("Player loaded: " + request.downloadHandler.text);
            }
            else
            {
                Debug.LogError("Load player failed: " + request.error);
            }
        }
    }
    
    /// <summary>
    /// Update player data on server
    /// </summary>
    public IEnumerator UpdatePlayer(string targetPlayerId, int newScore)
    {
        var updateData = new ScoreUpdate { score = newScore };
        string jsonData = JsonUtility.ToJson(updateData);
        
        using (UnityWebRequest request = UnityWebRequest.Put(
            serverUrl + "/api/player/" + targetPlayerId, 
            jsonData))
        {
            request.SetRequestHeader("Content-Type", "application/json");
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                Debug.Log("Player updated: " + request.downloadHandler.text);
            }
            else
            {
                Debug.LogError("Update player failed: " + request.error);
            }
        }
    }
    
    /// <summary>
    /// Get leaderboard from server
    /// </summary>
    public IEnumerator GetLeaderboard(int limit, Action<List<PlayerData>> onSuccess)
    {
        using (UnityWebRequest request = UnityWebRequest.Get(
            serverUrl + "/api/leaderboard?limit=" + limit))
        {
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                string json = "{\"players\":" + request.downloadHandler.text + "}";
                LeaderboardData leaderboard = JsonUtility.FromJson<LeaderboardData>(json);
                onSuccess?.Invoke(leaderboard.players);
                Debug.Log("Leaderboard loaded with " + leaderboard.players.Count + " players");
            }
            else
            {
                Debug.LogError("Get leaderboard failed: " + request.error);
            }
        }
    }
    
    /// <summary>
    /// Save game state to server
    /// </summary>
    public IEnumerator SaveGameState(string stateId, string gameData)
    {
        var stateData = new GameStateData
        {
            stateId = stateId,
            data = new GameData { jsonData = gameData }
        };
        
        string jsonData = JsonUtility.ToJson(stateData);
        
        using (UnityWebRequest request = new UnityWebRequest(serverUrl + "/api/gamestate", "POST"))
        {
            byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                Debug.Log("Game state saved: " + request.downloadHandler.text);
            }
            else
            {
                Debug.LogError("Save game state failed: " + request.error);
            }
        }
    }
    
    // Example usage methods
    public void ExampleSaveCurrentPlayer()
    {
        StartCoroutine(SavePlayer(score: 1000, level: 5));
    }
    
    public void ExampleLoadLeaderboard()
    {
        StartCoroutine(GetLeaderboard(10, (players) =>
        {
            foreach (var player in players)
            {
                Debug.Log($"Player: {player.playerName}, Score: {player.score}");
            }
        }));
    }
}

// Data structures matching the server API
[Serializable]
public class PlayerData
{
    public string playerId;
    public string playerName;
    public int score;
    public int level;
    public string lastUpdated;
}

[Serializable]
public class ScoreUpdate
{
    public int score;
}

[Serializable]
public class LeaderboardData
{
    public List<PlayerData> players;
}

[Serializable]
public class GameStateData
{
    public string stateId;
    public GameData data;
}

[Serializable]
public class GameData
{
    public string jsonData;
}
