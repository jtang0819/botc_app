# Blood on the Clocktower - Web App

A web-based implementation of the social deduction board game *Blood on the Clocktower*. One player acts as the Storyteller (host), while others play as townsfolk or demons, trying to figure out who is good and who is evil.

## Prerequisites

- **Node.js** (v16 or higher)
- **npm** (v7 or higher, comes with Node.js)

## Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd botc_app
   ```

2. **Install server dependencies**:
   ```bash
   cd server
   npm install
   cd ..
   ```

3. **Install client dependencies**:
   ```bash
   cd client
   npm install
   cd ..
   ```

## Starting the App

You'll need to run the server and client in separate terminal windows.

### Terminal 1: Start the Server

```bash
cd server
npm run dev
```

The server will start on `http://localhost:3001`

**For production**, use:
```bash
npm start
```

### Terminal 2: Start the Client (Development)

```bash
cd client
npm run dev
```

The client will open in your browser at `http://localhost:5173`

## How to Use

### Home Screen
When you first load the app, you'll see two options:

- **Join Game** - Click this to join as a Player
- **Host (Storyteller)** - Click this to be the Storyteller (game host)

### As a Storyteller (Host)

1. Click **Host (Storyteller)** on the home screen
2. Set up your game with the players
3. Select the roles for your game from available options (Knight, Chef, Noble, Steward, etc.)
4. Manage the game flow by guiding players through:
   - Night phases (when roles activate)
   - Day phases (when players vote)
   - Announcements and role-specific reminders

### As a Player

1. Click **Join Game** on the home screen
2. Wait to be assigned a role by the Storyteller
3. Keep your role secret from other players
4. Participate in day votes and night phase actions based on your role
5. Work with your team to win the game:
   - **Townsfolk** (good): Find and eliminate the demon to win
   - **Demon** (evil): Eliminate townsfolk to reduce their numbers

## Game Roles

The app includes various roles with unique abilities:

- **Knight** - Knows 2 players that are not the demon
- **Chef** - Knows how many pairs of evil players there are
- **Noble** - Knows 3 safe players
- **Steward** - Knows 1 good player
- **Demon** - The main evil role (only one per game)

And many more! Each role has its own special ability revealed during night phases.

## Building for Production

To create a production build of the client:

```bash
cd client
npm run build
```

This will create an optimized build in `client/dist/`

## Troubleshooting

### Can't connect to the server?
- Make sure the server is running on port 3001
- Check that `http://localhost:3001` is accessible
- Look for error messages in the server terminal

### Port already in use?
- Server default: `3001`
- Client default: `5173`
- You can modify the ports in `server/server.js` and `client/vite.config.js` if needed

### Dependencies issues?
- Delete `node_modules` and `package-lock.json`, then reinstall:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

## Project Structure

```
botc_app/
├── server/          # Express.js backend with Socket.io
│   ├── server.js    # Main server file
│   └── package.json
├── client/          # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── StorytellerView.jsx
│   │   ├── PlayerView.jsx
│   │   └── roles.json
│   └── package.json
└── README.md        # This file
```

## Development Notes

- The client communicates with the server via **Socket.io** for real-time game updates
- The app uses **Tailwind CSS** for styling
- The game state is managed through Socket.io events between client and server

## License

Refer to the project's license file for details.
