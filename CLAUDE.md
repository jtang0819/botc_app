# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Blood on the Clocktower** is a web-based implementation of the social deduction board game. One player acts as the Storyteller (host), while others play as townsfolk or demons, trying to deduce who is good and who is evil. Real-time game state is synchronized across players via Socket.io.

## Architecture

The project follows a **monorepo structure** with two main applications:

### Frontend (React + Vite)
- **Location:** `client/`
- **Technology:** React 19, Vite build tool
- **Key feature:** Compiles to `client/dist/` for production
- **Components:**
  - `App.jsx` - Main entry point; handles home screen and routing
  - `StorytellerView.jsx` - Storyteller/host interface
  - `PlayerView.jsx` - Player game interface
  - `roles.json` - Static role definitions
- **Styling:** Tailwind CSS via `index.css`
- **Server communication:** Socket.io client for real-time updates

### Backend (Express.js + Socket.io)
- **Location:** `server/`
- **Technology:** Express.js, Socket.io for WebSocket communication
- **Entry point:** `server.js`
- **Key module:** `gameLogic.js` - Handles team composition and character assignments
- **Behavior:**
  - Manages game rooms via 4-letter room codes
  - Handles Storyteller and player Socket.io events
  - Serves the built React client from `/public` directory
  - Falls back to `index.html` for SPA routing

### Docker Setup
- **Multi-stage build:** Client is built first, then served alongside the server
- **Node version:** `node:20-alpine`
- **Single container:** Both server and client run in one container
- **Port:** 3001 (both client and server)
- **Docker version requirement:** 29+

## Common Commands

### Development

**Start server (development mode):**
```bash
cd server && npm run dev
```
Server runs on `http://localhost:3001` with auto-reload via nodemon.

**Start client (development mode):**
```bash
cd client && npm run dev
```
Client runs on `http://localhost:5173` with Vite HMR.

**Run both simultaneously:**
Open two terminal windows and run the above commands in each.

### Testing & Linting

**Run server tests:**
```bash
cd server && npm test
```
Tests are in `server/tests/*.test.js`. Jest is configured with 15-second timeout.

**Lint client code:**
```bash
cd client && npm run lint
```
ESLint config in `client/eslint.config.js` includes React hooks and refresh plugins.

### Building

**Build client for production:**
```bash
cd client && npm run build
```
Output goes to `client/dist/`.

**Build Docker image and run:**
```bash
docker compose up --build
```
Uses `docker-compose.yml` to orchestrate the container.

### Dependencies

**Install/update dependencies:**
```bash
# Server
cd server && npm install

# Client
cd client && npm install
```

Use `npm ci` in CI/CD pipelines for deterministic installs (locks to `package-lock.json`).

## Key Code Patterns

### Socket.io Events

The server emits and listens to game events. Key event flows:

1. **Storyteller creates a game:**
   - Client emits `create_room` with script data
   - Server responds with `room_created` containing a room code

2. **Players join:**
   - Client emits `join_room` with room code and player name
   - Server notifies storyteller with `players_updated`

3. **Game starts:**
   - Storyteller emits `start_game`
   - Server calls `buildAssignments()` from `gameLogic.js`
   - Server sends `receive_character` to each player with their assigned role

### Game Logic

- **TEAM_COMPOSITION:** Predefined team breakdowns for player counts 5–15
- **buildAssignments():** Randomly shuffles characters and assigns them to players based on team composition
- **shuffle():** Utility for Fisher-Yates shuffling

## File Structure Reference

```
botc_app/
├── server/                 # Express backend
│   ├── server.js          # Main server, Socket.io handlers
│   ├── gameLogic.js       # Team composition, assignments
│   ├── tests/             # Jest test files
│   ├── package.json
│   └── node_modules/
├── client/                # React frontend
│   ├── src/
│   │   ├── App.jsx        # Home screen, routing
│   │   ├── StorytellerView.jsx
│   │   ├── PlayerView.jsx
│   │   ├── roles.json     # Role definitions
│   │   ├── main.jsx       # React entry point
│   │   └── index.css      # Tailwind styles
│   ├── dist/              # Build output
│   ├── index.html
│   ├── vite.config.js
│   ├── eslint.config.js
│   ├── package.json
│   └── node_modules/
├── Dockerfile             # Multi-stage Docker build
├── docker-compose.yml     # Container orchestration
├── README.md
└── CLAUDE.md
```

## Development Notes

- The Docker image combines the built client and server; for local development, run them separately
- Socket.io CORS is currently set to `"*"` — restrict `origin` to your frontend domain in production
- Game state is stored in-memory; it resets on server restart
- Test files use Jest with `forceExit` flag; tests that create servers must clean up properly
