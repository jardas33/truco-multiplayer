const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static('public'));

// Store active rooms
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle room creation
    socket.on('createRoom', () => {
        // Generate a random 6-character room code
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Create the room
        rooms.set(roomCode, {
            players: [socket.id],
            game: null
        });

        // Join the room
        socket.join(roomCode);
        socket.roomCode = roomCode;

        // Send the room code back to the client
        socket.emit('roomCreated', roomCode);
    });

    // Handle room joining
    socket.on('joinRoom', (roomCode) => {
        const room = rooms.get(roomCode);
        
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }

        if (room.players.length >= 4) {
            socket.emit('error', 'Room is full');
            return;
        }

        // Join the room
        room.players.push(socket.id);
        socket.join(roomCode);
        socket.roomCode = roomCode;

        // Notify all players in the room
        io.to(roomCode).emit('playerJoined', {
            playerId: socket.id,
            playerCount: room.players.length
        });

        // Start the game if we have 4 players
        if (room.players.length === 4) {
            startGame(roomCode);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected');
        
        if (socket.roomCode) {
            const room = rooms.get(socket.roomCode);
            if (room) {
                // Remove player from room
                room.players = room.players.filter(id => id !== socket.id);
                
                // Notify remaining players
                io.to(socket.roomCode).emit('playerLeft', {
                    playerId: socket.id,
                    playerCount: room.players.length
                });

                // Delete room if empty
                if (room.players.length === 0) {
                    rooms.delete(socket.roomCode);
                }
            }
        }
    });

    // Handle game events
    socket.on('playCard', (data) => {
        const room = rooms.get(data.roomCode);
        if (room && room.game) {
            // Handle card play logic
            io.to(data.roomCode).emit('cardPlayed', {
                playerId: socket.id,
                card: data.card
            });
        }
    });
});

function startGame(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    // Initialize game state
    room.game = {
        deck: createDeck(),
        currentPlayer: 0,
        scores: { team1: 0, team2: 0 }
    };

    // Deal cards to players
    const hands = dealCards(room.game.deck);
    room.players.forEach((playerId, index) => {
        io.to(playerId).emit('gameStarted', {
            hand: hands[index],
            position: index
        });
    });
}

function createDeck() {
    // Create and return a shuffled deck
    // Implementation similar to your local version
}

function dealCards(deck) {
    // Deal cards to players
    // Implementation similar to your local version
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 