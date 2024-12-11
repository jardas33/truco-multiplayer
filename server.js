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
        try {
            // Generate a random 6-character room code
            const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            // Create the room
            const room = {
                code: roomCode,
                players: [{
                    id: socket.id,
                    name: `Player 1`,
                    isBot: false,
                    isHost: true
                }],
                botCount: 0,
                game: null
            };
            
            rooms.set(roomCode, room);

            // Join the room
            socket.join(roomCode);
            socket.roomCode = roomCode;

            // Send the room data back to the client
            socket.emit('roomCreated', {
                roomCode: roomCode,
                players: room.players,
                botCount: room.botCount
            });

            console.log(`Room created: ${roomCode}`);
        } catch (error) {
            console.error('Error creating room:', error);
            socket.emit('gameError', 'Failed to create room');
        }
    });

    // Handle room joining
    socket.on('joinRoom', (roomCode) => {
        try {
            const room = rooms.get(roomCode);
            
            if (!room) {
                socket.emit('gameError', 'Room not found');
                return;
            }

            if (room.players.length >= 4) {
                socket.emit('gameError', 'Room is full');
                return;
            }

            // Add player to the room
            const newPlayer = {
                id: socket.id,
                name: `Player ${room.players.length + 1}`,
                isBot: false,
                isHost: false
            };
            room.players.push(newPlayer);
            
            // Join the room
            socket.join(roomCode);
            socket.roomCode = roomCode;

            // Notify the joining player
            socket.emit('roomJoined', {
                roomCode: roomCode,
                players: room.players,
                botCount: room.botCount
            });

            // Notify all players in the room
            io.to(roomCode).emit('playerJoined', {
                players: room.players,
                botCount: room.botCount
            });

            console.log(`Player joined room: ${roomCode}`);
        } catch (error) {
            console.error('Error joining room:', error);
            socket.emit('gameError', 'Failed to join room');
        }
    });

    // Handle adding bots
    socket.on('addBot', (roomCode) => {
        try {
            const room = rooms.get(roomCode);
            
            if (!room) {
                socket.emit('gameError', 'Room not found');
                return;
            }

            if (room.players.length >= 4) {
                socket.emit('gameError', 'Room is full');
                return;
            }

            if (room.botCount >= 3) {
                socket.emit('gameError', 'Maximum number of bots reached');
                return;
            }

            // Add bot to the room
            const botPlayer = {
                id: `bot-${Math.random().toString(36).substring(7)}`,
                name: `Bot ${room.players.length + 1}`,
                isBot: true,
                isHost: false
            };
            room.players.push(botPlayer);
            room.botCount++;

            // Notify all players in the room
            io.to(roomCode).emit('botAdded', {
                players: room.players,
                botCount: room.botCount
            });

            console.log(`Bot added to room: ${roomCode}`);
        } catch (error) {
            console.error('Error adding bot:', error);
            socket.emit('gameError', 'Failed to add bot');
        }
    });

    // Handle starting the game
    socket.on('startGame', (roomCode) => {
        try {
            const room = rooms.get(roomCode);
            
            if (!room) {
                socket.emit('gameError', 'Room not found');
                return;
            }

            if (room.players.length < 2) {
                socket.emit('gameError', 'Not enough players');
                return;
            }

            // Initialize game state
            room.game = {
                players: room.players,
                currentRound: 0,
                scores: {
                    team1: { rounds: 0, games: 0, sets: 0 },
                    team2: { rounds: 0, games: 0, sets: 0 }
                }
            };

            // Notify all players that the game is starting
            io.to(roomCode).emit('gameStarted', {
                players: room.players,
                gameState: room.game
            });

            console.log(`Game started in room: ${roomCode}`);
        } catch (error) {
            console.error('Error starting game:', error);
            socket.emit('gameError', 'Failed to start game');
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        try {
            const roomCode = socket.roomCode;
            if (roomCode && rooms.has(roomCode)) {
                const room = rooms.get(roomCode);
                
                // Remove the player
                const playerIndex = room.players.findIndex(p => p.id === socket.id);
                if (playerIndex !== -1) {
                    const player = room.players[playerIndex];
                    room.players.splice(playerIndex, 1);
                    
                    if (player.isHost && room.players.length > 0) {
                        // Assign new host
                        room.players[0].isHost = true;
                    }
                }

                if (room.players.length === 0) {
                    // Delete empty room
                    rooms.delete(roomCode);
                } else {
                    // Notify remaining players
                    io.to(roomCode).emit('playerLeft', {
                        players: room.players,
                        botCount: room.botCount
                    });
                }
            }
            console.log('A user disconnected');
        } catch (error) {
            console.error('Error handling disconnect:', error);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 