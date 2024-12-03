const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));
app.use('/libraries', express.static('libraries'));
app.use('/Images', express.static('Images'));

// Serve the game files
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Game state
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('createRoom', (roomId) => {
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                players: [{
                    id: socket.id,
                    isBot: false,
                    team: 'team1',
                    ready: false
                }],
                gameState: null,
                botCount: 0
            });
            socket.join(roomId);
            socket.emit('roomCreated', roomId);
        }
    });

    socket.on('joinRoom', (roomId) => {
        const room = rooms.get(roomId);
        if (room && room.players.length < 4) {
            const team = room.players.length % 2 === 0 ? 'team1' : 'team2';
            room.players.push({
                id: socket.id,
                isBot: false,
                team: team,
                ready: false
            });
            socket.join(roomId);
            socket.emit('roomJoined', roomId);
            io.to(roomId).emit('playerJoined', {
                players: room.players,
                count: room.players.length
            });

            // If room has 4 players, start the game
            if (room.players.length === 4) {
                io.to(roomId).emit('gameReady', room.players);
            }
        }
    });

    socket.on('addBot', (roomId) => {
        const room = rooms.get(roomId);
        if (room && room.players.length < 4) {
            const team = room.players.length % 2 === 0 ? 'team1' : 'team2';
            room.botCount++;
            room.players.push({
                id: `bot-${room.botCount}`,
                isBot: true,
                team: team,
                ready: true
            });
            io.to(roomId).emit('playerJoined', {
                players: room.players,
                count: room.players.length
            });

            // If room has 4 players (including bots), start the game
            if (room.players.length === 4) {
                io.to(roomId).emit('gameReady', room.players);
            }
        }
    });

    socket.on('startGame', (roomId) => {
        const room = rooms.get(roomId);
        if (room) {
            // Fill remaining slots with bots if needed
            while (room.players.length < 4) {
                const team = room.players.length % 2 === 0 ? 'team1' : 'team2';
                room.botCount++;
                room.players.push({
                    id: `bot-${room.botCount}`,
                    isBot: true,
                    team: team,
                    ready: true
                });
            }
            io.to(roomId).emit('gameStart', room.players);
        }
    });

    socket.on('gameUpdate', (data) => {
        const { roomId, gameState } = data;
        if (rooms.has(roomId)) {
            rooms.get(roomId).gameState = gameState;
            socket.to(roomId).emit('gameStateUpdate', gameState);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        rooms.forEach((room, roomId) => {
            const index = room.players.findIndex(p => p.id === socket.id);
            if (index !== -1) {
                room.players.splice(index, 1);
                if (room.players.length === 0) {
                    rooms.delete(roomId);
                } else {
                    io.to(roomId).emit('playerDisconnected', {
                        playerId: socket.id,
                        players: room.players
                    });
                }
            }
        });
    });
});

http.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 