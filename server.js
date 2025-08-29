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

        room.players.push({
            id: socket.id,
            name: `Player ${room.players.length + 1}`,
            isBot: false
        });
        
        socket.join(roomCode);
        socket.roomCode = roomCode;

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
        const room = rooms.get(roomCode);
        if (!room || room.players.length < 4) return;

        room.game = {
            deck: createDeck(),
            currentPlayer: 0,
            scores: { team1: 0, team2: 0 }
        };

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

        io.to(roomCode).emit('gameStart', room.players);
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
        const room = rooms.get(data.roomCode);
        if (room && room.game) {
            io.to(data.roomCode).emit('cardPlayed', {
                playerId: socket.id,
                card: data.card
            });

            const currentPlayerIndex = room.players.findIndex(p => p.id === socket.id);
            const nextPlayerIndex = (currentPlayerIndex + 1) % 4;
            if (room.players[nextPlayerIndex].isBot) {
                setTimeout(() => {
                    const hands = dealCards(room.game.deck);
                    const botHand = hands[nextPlayerIndex];
                    if (botHand && botHand.length > 0) {
                        const randomCard = botHand[Math.floor(Math.random() * botHand.length)];
                        io.to(data.roomCode).emit('cardPlayed', {
                            playerId: room.players[nextPlayerIndex].id,
                            card: randomCard
                        });
                    }
                }, 1000);
            }
        }
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