import React, { useState, useEffect } from 'react';
import rolesData from './roles.json';

export default function StorytellerView({ socket, goBack }) {
  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [script, setScript] = useState(null);
  const [assignments, setAssignments] = useState({});

  useEffect(() => {
    socket.on('room_created', (data) => setRoomCode(data.roomCode));
    socket.on('players_updated', (updatedPlayers) => setPlayers(updatedPlayers));

    return () => {
      socket.off('room_created');
      socket.off('players_updated');
    };
  }, [socket]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const rawJson = JSON.parse(event.target.result);
          let parsedScript = { scriptName: "Custom Script", characters: [] };
          
          // Helper to turn IDs like "washerwoman" or "noble_hunter" into "Washerwoman"
          const formatName = (id) => id.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase()).trim();

          // Look up character data in roles.json to get proper name and team
          const enrichCharacter = (id) => {
            const role = rolesData.find(r => r.id === id);
            if (role) {
              return { id, name: role.name, team: role.team };
            }
            return { id, name: formatName(id), team: 'Unknown' };
          };

          if (Array.isArray(rawJson)) {
            rawJson.forEach(item => {
              if (item.id === '_meta') {
                parsedScript.scriptName = item.name || "Custom Script";
              } else if (typeof item === 'string') {
                parsedScript.characters.push(enrichCharacter(item));
              } else if (item.id) {
                const enriched = enrichCharacter(item.id);
                parsedScript.characters.push({ 
                  id: item.id, 
                  name: item.name || enriched.name, 
                  team: item.team || enriched.team 
                });
              }
            });
          } else if (rawJson.characters) {
            parsedScript.characters = rawJson.characters.map(c => {
              const enriched = enrichCharacter(c.id);
              return { id: c.id, name: c.name || enriched.name, team: c.team || enriched.team };
            });
            parsedScript.scriptName = rawJson.scriptName || "Custom Script";
          } else {
            throw new Error("Unrecognized format");
          }

          setScript(parsedScript);
        } catch (err) {
          alert('Invalid Script JSON');
        }
      };
      reader.readAsText(file);
    }
  };

  const startGame = () => {
    if (script) {
      socket.emit('create_room', script);
    }
  };

  const assignRole = (playerId, characterId) => {
    const character = script.characters.find(c => c.id === characterId);
    setAssignments(prev => ({ ...prev, [playerId]: character }));
  };

  const sendTokens = () => {
    if (Object.keys(assignments).length !== players.length) {
      alert("Not all players have been assigned a character!");
      return;
    }
    socket.emit('distribute_tokens', { roomCode, assignments });
    alert("Tokens sent to players!");
  };

  if (!roomCode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-white">
        <button onClick={goBack} className="mb-4 text-gray-400">← Back</button>
        <h2 className="text-2xl mb-4">Upload Script to Start</h2>
        <input type="file" accept=".json" onChange={handleFileUpload} className="mb-4" />
        
        {script ? (
          <div className="flex flex-col items-center mt-4 w-full max-w-xs">
            <p className="text-green-400 mb-4 font-bold text-lg text-center">Loaded: {script.scriptName}</p>
            <button 
              onClick={startGame}
              className="bg-red-800 hover:bg-red-700 w-full py-3 rounded-lg text-xl font-bold transition-colors shadow-lg"
            >
              Start Game
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500 max-w-md text-center mt-2">
            Upload an official Blood on the Clocktower script JSON.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-4 w-full max-w-md mx-auto text-white">
      <div className="bg-gray-800 p-4 rounded-lg text-center w-full mb-6 border border-gray-700">
        <h2 className="text-lg text-gray-400">Room Code</h2>
        <p className="text-5xl font-mono tracking-widest text-red-500 font-bold">{roomCode}</p>
      </div>

      <h3 className="text-xl w-full text-left mb-2">Players ({players.length})</h3>
      <div className="w-full flex flex-col gap-3 mb-8">
        {players.map(p => (
          <div key={p.id} className="bg-gray-800 p-3 rounded flex justify-between items-center">
            <span>{p.name}</span>
            <select 
              className="bg-gray-700 p-2 rounded text-sm outline-none"
              onChange={(e) => assignRole(p.id, e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Select Role...</option>
              {script?.characters.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.team !== 'Unknown' ? `(${c.team})` : ''}
                </option>
              ))}
            </select>
          </div>
        ))}
        {players.length === 0 && <p className="text-gray-500 text-center py-4">Waiting for players...</p>}
      </div>

      <button 
        onClick={sendTokens}
        disabled={players.length === 0}
        className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white w-full py-3 rounded-lg text-lg font-bold"
      >
        Send Tokens
      </button>
    </div>
  );
}