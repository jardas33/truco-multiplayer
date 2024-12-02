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

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('createRoom', (roomId) => {
        console.log('Creating room:', roomId);
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                players: [],
                gameState: 'waiting'
            });
            socket.join(roomId);
            socket.emit('roomCreated', roomId);
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
        room.players.push({
            id: socket.id,
            team: room.players.length % 2 === 0 ? 'team1' : 'team2'
        });

        io.to(roomId).emit('playerJoined', {
            playerCount: room.players.length,
            players: room.players
        });

        if (room.players.length === MAX_PLAYERS) {
            room.gameState = 'playing';
            io.to(roomId).emit('gameStart');
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        rooms.forEach((room, roomId) => {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                io.to(roomId).emit('playerJoined', {
                    playerCount: room.players.length,
                    players: room.players
                });
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