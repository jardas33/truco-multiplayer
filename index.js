const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Serve static files
app.use(express.static(path.join(__dirname)));

// Basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Game state
const rooms = new Map();
const MAX_PLAYERS = 4;

function createBot(roomId) {
    return {
        id: `bot-${Math.random().toString(36).substr(2, 6)}`,
        isBot: true,
        team: null
    };
}

function assignTeam(players) {
    const team1Count = players.filter(p => p.team === 'team1').length;
    const team2Count = players.filter(p => p.team === 'team2').length;
    return team1Count <= team2Count ? 'team1' : 'team2';
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('createRoom', (roomId) => {
        console.log('Creating room:', roomId);
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                players: [{
                    id: socket.id,
                    isBot: false,
                    team: 'team1'
                }],
                gameState: 'waiting'
            });
            socket.join(roomId);
            socket.emit('roomCreated', roomId);
            io.to(roomId).emit('playerJoined', {
                playerCount: 1,
                players: rooms.get(roomId).players
            });
        } else {
            socket.emit('error', 'Room already exists');
        }
    });

    socket.on('joinRoom', (roomId) => {
        console.log('Join room request:', roomId);
        const room = rooms.get(roomId);
        
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }
        
        if (room.players.length >= MAX_PLAYERS) {
            socket.emit('error', 'Room is full');
            return;
        }

        socket.join(roomId);
        const newPlayer = {
            id: socket.id,
            isBot: false,
            team: assignTeam(room.players)
        };
        room.players.push(newPlayer);

        io.to(roomId).emit('playerJoined', {
            playerCount: room.players.length,
            players: room.players
        });
    });

    socket.on('addBot', (roomId) => {
        const room = rooms.get(roomId);
        if (!room) return;

        if (room.players.length >= MAX_PLAYERS) {
            socket.emit('error', 'Room is full');
            return;
        }

        const bot = createBot(roomId);
        bot.team = assignTeam(room.players);
        room.players.push(bot);

        io.to(roomId).emit('botAdded', {
            playerCount: room.players.length,
            players: room.players
        });
    });

    socket.on('startGame', (roomId) => {
        const room = rooms.get(roomId);
        if (!room) return;

        // Fill remaining slots with bots if needed
        while (room.players.length < MAX_PLAYERS) {
            const bot = createBot(roomId);
            bot.team = assignTeam(room.players);
            room.players.push(bot);
        }

        room.gameState = 'playing';
        io.to(roomId).emit('gameStart', {
            players: room.players
        });
    });

    socket.on('leaveRoom', (roomId) => {
        const room = rooms.get(roomId);
        if (!room) return;

        socket.leave(roomId);
        room.players = room.players.filter(p => p.id !== socket.id);
        
        if (room.players.length === 0) {
            rooms.delete(roomId);
        } else {
            io.to(roomId).emit('playerLeft', {
                playerCount: room.players.length,
                players: room.players
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        rooms.forEach((room, roomId) => {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                if (room.players.length === 0) {
                    rooms.delete(roomId);
                } else {
                    io.to(roomId).emit('playerLeft', {
                        playerCount: room.players.length,
                        players: room.players
                    });
                }
            }
        });
    });
});

// Handle 404s
app.use((req, res) => {
    res.status(404).send('Not found');
});

// Handle errors
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Something went wrong!');
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 