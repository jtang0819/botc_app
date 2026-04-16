import React, { useState } from 'react';
import { io } from 'socket.io-client';
import StorytellerView from './StorytellerView';
import PlayerView from './PlayerView';

// Connect to the backend Node server
const socket = io('http://localhost:3001');

export default function App() {
  const [view, setView] = useState('home'); // 'home', 'storyteller', 'player'
  
  if (view === 'storyteller') {
    return <StorytellerView socket={socket} goBack={() => setView('home')} />;
  }

  if (view === 'player') {
    return <PlayerView socket={socket} goBack={() => setView('home')} />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-8 text-red-600 tracking-widest text-center">
        BLOOD ON THE CLOCKTOWER
      </h1>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button 
          onClick={() => setView('player')}
          className="bg-gray-800 border-2 border-gray-600 hover:bg-gray-700 py-3 rounded-lg text-xl"
        >
          Join Game
        </button>
        <button 
          onClick={() => setView('storyteller')}
          className="bg-red-900 border-2 border-red-700 hover:bg-red-800 py-3 rounded-lg text-xl"
        >
          Host (Storyteller)
        </button>
      </div>
    </div>
  );
}
