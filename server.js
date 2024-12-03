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
    socket.on('createRoom', (roomCode) => {
        // Generate a random 6-character room code if not provided
        if (!roomCode) {
            roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        }
        
        // Create the room
        rooms.set(roomCode, {
            players: [{
                id: socket.id,
                name: `Player 1`,
                isBot: false
            }],
            game: null
        });

        // Join the room
        socket.join(roomCode);
        socket.roomCode = roomCode;

        // Send the room code and player info back to the client
        socket.emit('roomCreated', roomCode);
        io.to(roomCode).emit('playerJoined', {
            players: rooms.get(roomCode).players,
            count: 1
        });
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

        // Add player to the room
        room.players.push({
            id: socket.id,
            name: `Player ${room.players.length + 1}`,
            isBot: false
        });
        
        // Join the room
        socket.join(roomCode);
        socket.roomCode = roomCode;

        // Notify all players in the room
        io.to(roomCode).emit('playerJoined', {
            players: room.players,
            count: room.players.length
        });
    });

    // Handle adding bots
    socket.on('addBot', (roomCode) => {
        const room = rooms.get(roomCode);
        
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }

        if (room.players.length >= 4) {
            socket.emit('error', 'Room is full');
            return;
        }

        // Add bot to the room
        room.players.push({
            id: `bot-${Math.random().toString(36).substring(7)}`,
            name: `Bot ${room.players.length + 1}`,
            isBot: true
        });

        // Notify all players in the room
        io.to(roomCode).emit('playerJoined', {
            players: room.players,
            count: room.players.length
        });

        // If we have 4 players (including bots), enable start game
        if (room.players.length === 4) {
            io.to(roomCode).emit('roomFull');
        }
    });

    // Handle game start
    socket.on('startGame', (roomCode) => {
        const room = rooms.get(roomCode);
        if (!room || room.players.length < 4) return;

        // Initialize game state
        room.game = {
            deck: createDeck(),
            currentPlayer: 0,
            scores: { team1: 0, team2: 0 }
        };

        // Deal cards to players
        const hands = dealCards(room.game.deck);
        room.players.forEach((player, index) => {
            if (!player.isBot) {
                io.to(player.id).emit('gameStarted', {
                    hand: hands[index],
                    position: index,
                    players: room.players
                });
            }
        });

        // Notify all players that game has started
        io.to(roomCode).emit('gameStart', room.players);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected');
        
        if (socket.roomCode) {
            const room = rooms.get(socket.roomCode);
            if (room) {
                // Remove player from room
                room.players = room.players.filter(p => p.id !== socket.id);
                
                // Notify remaining players
                io.to(socket.roomCode).emit('playerLeft', {
                    players: room.players,
                    count: room.players.length
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

            // If next player is a bot, make them play after a delay
            const currentPlayerIndex = room.players.findIndex(p => p.id === socket.id);
            const nextPlayerIndex = (currentPlayerIndex + 1) % 4;
            if (room.players[nextPlayerIndex].isBot) {
                setTimeout(() => {
                    // Bot plays a random card from their hand
                    const botHand = room.game.hands[nextPlayerIndex];
                    if (botHand && botHand.length > 0) {
                        const randomCard = botHand[Math.floor(Math.random() * botHand.length)];
                        io.to(data.roomCode).emit('cardPlayed', {
                            playerId: room.players[nextPlayerIndex].id,
                            card: randomCard
                        });
                    }
                }, 1000); // Bot plays after 1 second
            }
        }
    });
});

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