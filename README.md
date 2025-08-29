# Truco Game Online

A multiplayer online version of the classic Truco card game.

## Features

- Real-time multiplayer gameplay
- Room-based matchmaking
- Support for up to 4 players
- Classic Truco rules and gameplay

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the server:
```bash
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## Playing Online

1. Create a room or join an existing one using the room code
2. Wait for other players to join (need 4 players total)
3. Game starts automatically when all players have joined

## Deployment

This game is configured for deployment on Railway.app:

### Option 1: Railway.app (Recommended - Easiest)
1. Fork this repository
2. Go to [railway.app](https://railway.app) and sign up/login
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `truco-multiplayer` repository
5. Railway will automatically detect it's a Node.js app and deploy
6. Your game will be live in minutes!

### Option 2: Docker Deployment
1. Build the Docker image: `docker build -t truco-game .`
2. Run the container: `docker run -p 3000:3000 truco-game`
3. Deploy to any Docker-compatible platform

### Option 3: Traditional VPS
1. Clone this repository to your DigitalOcean Droplet
2. Install Node.js and npm
3. Run `npm install` and `npm start`
4. Use nginx as a reverse proxy (recommended)

## Environment Variables

For Railway.app deployment, these environment variables are automatically handled:
- `PORT`: Automatically set by Railway
- `NODE_ENV`: Automatically set to production

For local development, you can set:
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development)

## Technologies Used

- Node.js
- Express.js
- Socket.IO
- p5.js
