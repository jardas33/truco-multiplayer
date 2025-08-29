const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Store active rooms - MOVED TO TOP to fix reference error
const rooms = new Map();

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

io.on('connection', (socket) => {
    console.log(`👤 User connected: ${socket.id}`);
    
    // Handle connection errors
    socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
    });

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
                    const hands = dealCards(room.game.deck);
                    const botHand = hands[nextPlayerIndex];
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

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

http.listen(PORT, HOST, () => {
    console.log(`🚀 Truco game server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📱 Ready for multiplayer action!`);
}); 