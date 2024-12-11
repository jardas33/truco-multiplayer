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

    socket.on('createRoom', () => {
        try {
            const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            // Create room with host player
            const room = {
                code: roomCode,
                players: [{
                    id: socket.id,
                    name: 'Player 1',
                    isBot: false,
                    isHost: true
                }],
                botCount: 0
            };
            
            rooms.set(roomCode, room);
            socket.join(roomCode);
            socket.roomCode = roomCode;

            console.log('Room created:', room);
            socket.emit('roomCreated', {
                roomCode: roomCode,
                players: room.players
            });

            // Also emit updatePlayers to ensure UI updates
            io.to(roomCode).emit('updatePlayers', {
                players: room.players
            });
        } catch (error) {
            console.error('Error creating room:', error);
            socket.emit('gameError', 'Failed to create room');
        }
    });

    socket.on('addBot', (roomCode) => {
        try {
            const room = rooms.get(roomCode);
            
            if (!room) {
                socket.emit('gameError', 'Room not found');
                return;
            }

            // Verify host
            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.isHost) {
                socket.emit('gameError', 'Only the host can add bots');
                return;
            }

            // Check bot limit
            if (room.botCount >= GAME_CONFIG.MAX_BOTS) {
                socket.emit('gameError', 'Maximum number of bots reached (3)');
                return;
            }

            // Check total players
            if (room.players.length >= GAME_CONFIG.MAX_TOTAL_PLAYERS) {
                socket.emit('gameError', 'Room is full');
                return;
            }

            // Add bot
            room.botCount++;
            const botPlayer = {
                id: `bot-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                name: `Bot ${room.botCount}`,
                isBot: true,
                isHost: false
            };
            room.players.push(botPlayer);

            console.log('Bot added:', botPlayer);
            io.to(roomCode).emit('updatePlayers', {
                players: room.players
            });
        } catch (error) {
            console.error('Error adding bot:', error);
            socket.emit('gameError', 'Failed to add bot');
        }
    });

    socket.on('startGame', (roomCode) => {
        try {
            const room = rooms.get(roomCode);
            
            if (!room) {
                socket.emit('gameError', 'Room not found');
                return;
            }

            if (room.players.length !== GAME_CONFIG.MAX_TOTAL_PLAYERS) {
                socket.emit('gameError', 'Need exactly 4 players to start');
                return;
            }

            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.isHost) {
                socket.emit('gameError', 'Only the host can start the game');
                return;
            }

            io.to(roomCode).emit('gameStarted', {
                gameState: {
                    players: room.players,
                    currentRound: 0
                }
            });
        } catch (error) {
            console.error('Error starting game:', error);
            socket.emit('gameError', 'Failed to start game');
        }
    });

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
                        // Assign new host to first non-bot player
                        const newHost = room.players.find(p => !p.isBot);
                        if (newHost) {
                            newHost.isHost = true;
                        }
                    }
                }

                if (room.players.length === 0 || !room.players.some(p => !p.isBot)) {
                    rooms.delete(roomCode);
                } else {
                    io.to(roomCode).emit('updatePlayers', {
                        players: room.players
                    });
                }
            }
        } catch (error) {
            console.error('Error handling disconnect:', error);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 