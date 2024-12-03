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
    res.sendFile(__dirname + '/index.html');
});

// Game state
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('createRoom', (roomId) => {
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                players: [socket.id],
                gameState: null
            });
            socket.join(roomId);
            socket.emit('roomCreated', roomId);
        }
    });

    socket.on('joinRoom', (roomId) => {
        const room = rooms.get(roomId);
        if (room && room.players.length < 4) {
            room.players.push(socket.id);
            socket.join(roomId);
            socket.emit('roomJoined', roomId);
            if (room.players.length === 4) {
                io.to(roomId).emit('gameStart', room.players);
            }
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
            const index = room.players.indexOf(socket.id);
            if (index !== -1) {
                room.players.splice(index, 1);
                if (room.players.length === 0) {
                    rooms.delete(roomId);
                } else {
                    io.to(roomId).emit('playerDisconnected', socket.id);
                }
            }
        });
    });
});

http.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 