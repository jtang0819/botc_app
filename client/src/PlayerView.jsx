import React, { useState, useEffect } from 'react';
import rolesData from './roles.json';

export default function PlayerView({ socket, goBack }) {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [character, setCharacter] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    socket.on('join_success', () => setIsJoined(true));
    socket.on('receive_character', (data) => setCharacter(data.character));
    socket.on('error', (msg) => setError(msg));

    return () => {
      socket.off('join_success');
      socket.off('receive_character');
      socket.off('error');
    };
  }, [socket]);

  const joinRoom = (e) => {
    e.preventDefault();
    if (roomCode && playerName) {
      socket.emit('join_room', { roomCode: roomCode.toUpperCase(), playerName });
    }
  };

  // Instantly find the ability in the local JSON when a character is assigned
  const ability = character ? rolesData.find(r => r.id === character.id)?.ability : null;

  // State 3: Game Started, Token Received
  if (character) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900 text-white">
        <h2 className="text-2xl mb-8 text-gray-400">Your Token</h2>
        <div className="w-64 h-64 border-8 border-red-900 rounded-full flex flex-col items-center justify-center bg-gray-800 shadow-[0_0_30px_rgba(220,38,38,0.3)]">
          <h1 className="text-3xl font-bold text-white text-center px-4">{character.name}</h1>
          {character.team && character.team !== 'Unknown' && (
            <p className="text-lg mt-2 text-red-400 uppercase tracking-wider">{character.team}</p>
          )}
        </div>

        {ability ? (
          <div className="mt-8 max-w-sm text-center bg-gray-800 p-4 border border-gray-700 rounded-lg shadow-lg">
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              <span className="font-bold text-white block mb-1">Ability</span>
              {ability}
            </p>
          </div>
        ) : (
          <a 
            href={`https://wiki.bloodontheclocktower.com/${character.name.replace(/\s+/g, '_')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 text-blue-400 underline hover:text-blue-300 text-sm"
          >
            View {character.name} Ability on the Wiki ↗
          </a>
        )}

        <p className="mt-12 text-sm text-gray-500 font-mono">Do not show this to anyone.</p>
      </div>
    );
  }

  // State 2: Waiting for Storyteller
  if (isJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center text-white">
        <div className="animate-pulse w-16 h-16 bg-red-900 rounded-full mb-6"></div>
        <h2 className="text-2xl font-bold mb-2">You are in the room!</h2>
        <p className="text-gray-400">Waiting for the Storyteller to start the game...</p>
      </div>
    );
  }

  // State 1: Join Screen
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-white">
      <button onClick={goBack} className="mb-4 text-gray-400 absolute top-4 left-4">← Back</button>
      <h2 className="text-3xl font-bold mb-8">Join Game</h2>
      
      {error && <p className="text-red-500 mb-4">{error}</p>}
      
      <form onSubmit={joinRoom} className="flex flex-col gap-4 w-full max-w-xs">
        <input 
          type="text" 
          placeholder="Room Code (e.g. ABCD)" 
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded p-3 text-center text-xl uppercase placeholder:normal-case"
          maxLength={4}
          required
        />
        <input 
          type="text" 
          placeholder="Your Name" 
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded p-3 text-center text-xl"
          required
        />
        <button 
          type="submit"
          className="bg-red-800 hover:bg-red-700 py-3 rounded-lg text-xl mt-4 font-bold transition-colors"
        >
          Join
        </button>
      </form>
    </div>
  );
}