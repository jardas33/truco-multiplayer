const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const path = require('path');

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve static files from the images directory
app.use('/images', express.static(path.join(__dirname, '../images')));

// Serve static files from the libraries directory
app.use('/libraries', express.static(path.join(__dirname, '../libraries')));

// Basic route for testing
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Game state
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('createRoom', (roomId) => {
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                players: [],
                gameState: null
            });
        }
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinRoom', (roomId) => {
        const room = rooms.get(roomId);
        if (room && room.players.length < 4) {
            socket.join(roomId);
            room.players.push(socket.id);
            socket.emit('joinedRoom', roomId);
            io.to(roomId).emit('playerJoined', { playerId: socket.id, playerCount: room.players.length });
        } else {
            socket.emit('roomError', 'Room is full or does not exist');
        }
    });

    socket.on('gameAction', (data) => {
        const { roomId, action, payload } = data;
        io.to(roomId).emit('gameUpdate', { action, payload });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        rooms.forEach((room, roomId) => {
            const playerIndex = room.players.indexOf(socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                io.to(roomId).emit('playerLeft', { playerId: socket.id, playerCount: room.players.length });
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 