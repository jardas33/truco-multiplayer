const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static('public'));

// Game configuration
const GAME_CONFIG = {
    MAX_TOTAL_PLAYERS: 4,
    MAX_BOTS: 3,
    MIN_PLAYERS: 2
};

// Store active rooms
const rooms = new Map();

// Debug logging for room management
function logRoomState(roomCode, action) {
    const room = rooms.get(roomCode);
    console.log(`[${action}] Room ${roomCode}:`, room ? {
        playerCount: room.players.length,
        botCount: room.botCount,
        players: room.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot }))
    } : 'not found');
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

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
            socket.roomCode = roomCode; // Store room code in socket object

            // Join the room
            socket.join(roomCode);

            // Send the room data back to the client
            socket.emit('roomCreated', {
                roomCode: roomCode,
                players: room.players,
                botCount: room.botCount
            });

            logRoomState(roomCode, 'Room Created');
        } catch (error) {
            console.error('Error creating room:', error);
            socket.emit('gameError', 'Failed to create room');
        }
    });

    // Handle room joining
    socket.on('joinRoom', (roomCode) => {
        try {
            const room = rooms.get(roomCode);
            logRoomState(roomCode, 'Join Attempt');
            
            if (!room) {
                socket.emit('gameError', 'Room not found');
                return;
            }

            // Count real players (non-bots)
            const realPlayerCount = room.players.filter(p => !p.isBot).length;

            if (room.players.length >= GAME_CONFIG.MAX_TOTAL_PLAYERS) {
                socket.emit('gameError', 'Room is full');
                return;
            }

            // Add player to the room
            const newPlayer = {
                id: socket.id,
                name: `Player ${realPlayerCount + 1}`,
                isBot: false,
                isHost: false
            };
            room.players.push(newPlayer);
            socket.roomCode = roomCode; // Store room code in socket object
            
            // Join the room
            socket.join(roomCode);

            // Notify all players in the room
            io.to(roomCode).emit('playerJoined', {
                players: room.players,
                botCount: room.botCount
            });

            logRoomState(roomCode, 'Player Joined');
        } catch (error) {
            console.error('Error joining room:', error);
            socket.emit('gameError', 'Failed to join room');
        }
    });

    // Handle adding bots
    socket.on('addBot', (roomCode) => {
        try {
            console.log('Add bot request for room:', roomCode);
            const room = rooms.get(roomCode);
            
            if (!room) {
                console.error('Room not found:', roomCode);
                socket.emit('gameError', 'Room not found');
                return;
            }

            // Verify the requester is in the room and is the host
            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.isHost) {
                socket.emit('gameError', 'Only the host can add bots');
                return;
            }

            // Check total players (including bots)
            if (room.botCount >= GAME_CONFIG.MAX_BOTS) {
                socket.emit('gameError', 'Maximum number of bots reached (3)');
                return;
            }

            // Add bot to the room
            const botPlayer = {
                id: `bot-${Math.random().toString(36).substring(7)}`,
                name: `Bot ${room.players.length}`,
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

            logRoomState(roomCode, 'Bot Added');
        } catch (error) {
            console.error('Error adding bot:', error);
            socket.emit('gameError', 'Failed to add bot');
        }
    });

    // Handle starting the game
    socket.on('startGame', (roomCode) => {
        try {
            const room = rooms.get(roomCode);
            logRoomState(roomCode, 'Start Game Attempt');
            
            if (!room) {
                socket.emit('gameError', 'Room not found');
                return;
            }

            // Verify the requester is in the room and is the host
            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.isHost) {
                socket.emit('gameError', 'Only the host can start the game');
                return;
            }

            if (room.players.length < GAME_CONFIG.MIN_PLAYERS) {
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

            logRoomState(roomCode, 'Game Started');
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
                logRoomState(roomCode, 'Before Disconnect');
                
                // Remove the player
                const playerIndex = room.players.findIndex(p => p.id === socket.id);
                if (playerIndex !== -1) {
                    const player = room.players[playerIndex];
                    room.players.splice(playerIndex, 1);
                    
                    if (player.isHost && room.players.length > 0) {
                        // Assign new host
                        const nextPlayer = room.players.find(p => !p.isBot);
                        if (nextPlayer) {
                            nextPlayer.isHost = true;
                        }
                    }
                }

                if (room.players.length === 0 || !room.players.some(p => !p.isBot)) {
                    // Delete room if no real players left
                    rooms.delete(roomCode);
                    console.log('Room deleted:', roomCode);
                } else {
                    // Notify remaining players
                    io.to(roomCode).emit('playerLeft', {
                        players: room.players,
                        botCount: room.botCount
                    });
                    logRoomState(roomCode, 'After Disconnect');
                }
            }
            console.log('User disconnected:', socket.id);
        } catch (error) {
            console.error('Error handling disconnect:', error);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 