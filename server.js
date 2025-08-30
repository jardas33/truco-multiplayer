const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Store active rooms
const rooms = new Map();

// Middleware
app.use(express.static('public'));

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        rooms: rooms.size,
        environment: process.env.NODE_ENV || 'development'
    });
});

// Basic route
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`👤 User connected: ${socket.id}`);
    
    // Handle room creation
    socket.on('createRoom', (roomCode) => {
        if (!roomCode) {
            roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        }
        
        console.log(`🏠 Creating room: ${roomCode} for user: ${socket.id}`);
        
        rooms.set(roomCode, {
            players: [{
                id: socket.id,
                name: `Player 1`,
                isBot: false
            }],
            game: null
        });

        socket.join(roomCode);
        socket.roomCode = roomCode;

        socket.emit('roomCreated', roomCode);
        io.to(roomCode).emit('playerJoined', {
            players: rooms.get(roomCode).players,
            count: 1
        });
        
        console.log(`✅ Room ${roomCode} created successfully`);
    });

    // Handle room joining
    socket.on('joinRoom', (roomCode) => {
        const room = rooms.get(roomCode);
        
        console.log(`🚪 User ${socket.id} attempting to join room: ${roomCode}`);
        
        if (!room) {
            console.log(`❌ Room ${roomCode} not found`);
            socket.emit('error', 'Room not found');
            return;
        }

        if (room.players.length >= 4) {
            console.log(`❌ Room ${roomCode} is full`);
            socket.emit('error', 'Room is full');
            return;
        }

        room.players.push({
            id: socket.id,
            name: `Player ${room.players.length + 1}`,
            isBot: false
        });
        
        socket.join(roomCode);
        socket.roomCode = roomCode;

        console.log(`✅ User ${socket.id} joined room ${roomCode}. Total players: ${room.players.length}`);

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

        room.players.push({
            id: `bot-${Math.random().toString(36).substring(7)}`,
            name: `Bot ${room.players.length + 1}`,
            isBot: true
        });

        io.to(roomCode).emit('playerJoined', {
            players: room.players,
            count: room.players.length
        });

        if (room.players.length === 4) {
            io.to(roomCode).emit('roomFull');
        }
    });

    // Handle game start
    socket.on('startGame', (roomCode) => {
        console.log(`🎮 Starting game in room: ${roomCode}`);
        
        const room = rooms.get(roomCode);
        if (!room) {
            console.log(`❌ Room ${roomCode} not found for game start`);
            return;
        }
        
        if (room.players.length < 4) {
            console.log(`❌ Room ${roomCode} needs 4 players, has ${room.players.length}`);
            socket.emit('error', 'Need 4 players to start the game');
            return;
        }

        console.log(`✅ Starting game with ${room.players.length} players in room ${roomCode}`);

        // ✅ Emit gameStart event to all players in the room
        io.to(roomCode).emit('gameStart', room.players);
        
        console.log(`🎯 Game started successfully in room ${roomCode}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected');
        
        if (socket.roomCode) {
            const room = rooms.get(socket.roomCode);
            if (room) {
                room.players = room.players.filter(p => p.id !== socket.id);
                
                io.to(socket.roomCode).emit('playerLeft', {
                    players: room.players,
                    count: room.players.length
                });

                if (room.players.length === 0) {
                    rooms.delete(socket.roomCode);
                }
            }
        }
    });

    // Handle game events
    socket.on('playCard', (data) => {
        console.log(`🃏 Card played in room: ${socket.roomCode}`);
        
        if (!socket.roomCode) {
            console.log(`❌ User ${socket.id} not in a room`);
            return;
        }
        
        const room = rooms.get(socket.roomCode);
        if (!room) {
            console.log(`❌ Room ${socket.roomCode} not found for card play`);
            return;
        }

        // ✅ Emit card played event to all players in the room
        io.to(socket.roomCode).emit('cardPlayed', {
            playerId: socket.id,
            cardIndex: data.cardIndex || 0,
            card: data.card
        });

        console.log(`✅ Card played event emitted for user ${socket.id} in room ${socket.roomCode}`);
    });

    // ✅ Handle Truco requests
    socket.on('requestTruco', (data) => {
        console.log(`🎯 Truco requested in room: ${socket.roomCode}`);
        
        if (!socket.roomCode) {
            console.log(`❌ User ${socket.id} not in a room`);
            return;
        }
        
        const room = rooms.get(socket.roomCode);
        if (!room) {
            console.log(`❌ Room ${socket.roomCode} not found for Truco request`);
            return;
        }

        // Emit Truco called event to all players in the room
        io.to(socket.roomCode).emit('trucoCalled', {
            caller: socket.id,
            roomCode: socket.roomCode
        });

        console.log(`✅ Truco called event emitted for user ${socket.id} in room ${socket.roomCode}`);
    });

    // ✅ Handle Truco responses
    socket.on('respondTruco', (data) => {
        console.log(`🎯 Truco response in room: ${socket.roomCode}`);
        
        if (!socket.roomCode) {
            console.log(`❌ User ${socket.id} not in a room`);
            return;
        }
        
        const room = rooms.get(socket.roomCode);
        if (!room) {
            console.log(`❌ Room ${socket.roomCode} not found for Truco response`);
            return;
        }

        // Emit Truco response event to all players in the room
        io.to(socket.roomCode).emit('trucoResponded', {
            responder: socket.id,
            response: data.response,
            roomCode: socket.roomCode
        });

        console.log(`✅ Truco response event emitted for user ${socket.id} in room ${socket.roomCode}`);
    });
});

// Helper functions
function createDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['ace', '2', '3', '4', '5', '6', '7', 'jack', 'queen', 'king'];
    const deck = [];
    
    for (const suit of suits) {
        for (const value of values) {
            deck.push({ suit, value });
        }
    }
    
    // Shuffle the deck
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck;
}

function dealCards(deck) {
    const hands = [[], [], [], []];
    
    // Deal 3 cards to each player
    for (let i = 0; i < 12; i++) {
        const playerIndex = i % 4;
        hands[playerIndex].push(deck[i]);
    }
    
    return hands;
}

// Server startup
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Add error handling for server startup
http.on('error', (error) => {
    console.error('❌ Server error:', error);
    if (error.code === 'EADDRINUSE') {
        console.error('❌ Port is already in use');
    } else if (error.code === 'EACCES') {
        console.error('❌ Permission denied to bind to port');
    }
    process.exit(1);
});

// Add process error handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

try {
    http.listen(PORT, HOST, () => {
        console.log(`🚀 Truco game server running on port ${PORT}`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📱 Ready for multiplayer action!`);
        console.log(`🏠 Server bound to: ${HOST}:${PORT}`);
        console.log(`✅ Server startup complete`);
    });
} catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
} 