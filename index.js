const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Serve static files
app.use(express.static(path.join(__dirname)));

// Basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Game state
const rooms = new Map();
const MAX_PLAYERS = 4;

// Card deck configuration
const SUITS = ['clubs', 'hearts', 'spades', 'diamonds'];
const VALUES = ['A', '2', '3'];

function createDeck() {
    const deck = [];
    SUITS.forEach(suit => {
        VALUES.forEach(value => {
            deck.push(`${value}_${suit}`);
        });
    });
    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function dealCards(deck, numPlayers) {
    const hands = Array(numPlayers).fill().map(() => []);
    for (let i = 0; i < 3; i++) { // Deal 3 cards to each player
        for (let j = 0; j < numPlayers; j++) {
            hands[j].push(deck.pop());
        }
    }
    return hands;
}

function createBot(roomId) {
    return {
        id: `bot-${Math.random().toString(36).substr(2, 6)}`,
        isBot: true,
        team: null,
        hand: []
    };
}

function assignTeam(players) {
    const team1Count = players.filter(p => p.team === 'team1').length;
    const team2Count = players.filter(p => p.team === 'team2').length;
    return team1Count <= team2Count ? 'team1' : 'team2';
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('createRoom', (roomId) => {
        console.log('Creating room:', roomId);
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                players: [{
                    id: socket.id,
                    isBot: false,
                    team: 'team1',
                    hand: []
                }],
                gameState: 'waiting',
                deck: [],
                currentTurn: 0,
                playedCards: []
            });
            socket.join(roomId);
            socket.emit('roomCreated', roomId);
            io.to(roomId).emit('playerJoined', {
                playerCount: 1,
                players: rooms.get(roomId).players
            });
        } else {
            socket.emit('error', 'Room already exists');
        }
    });

    socket.on('joinRoom', (roomId) => {
        console.log('Join room request:', roomId);
        const room = rooms.get(roomId);
        
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }
        
        if (room.players.length >= MAX_PLAYERS) {
            socket.emit('error', 'Room is full');
            return;
        }

        socket.join(roomId);
        const newPlayer = {
            id: socket.id,
            isBot: false,
            team: assignTeam(room.players),
            hand: []
        };
        room.players.push(newPlayer);

        io.to(roomId).emit('playerJoined', {
            playerCount: room.players.length,
            players: room.players
        });
    });

    socket.on('addBot', (roomId) => {
        const room = rooms.get(roomId);
        if (!room) return;

        if (room.players.length >= MAX_PLAYERS) {
            socket.emit('error', 'Room is full');
            return;
        }

        const bot = createBot(roomId);
        bot.team = assignTeam(room.players);
        room.players.push(bot);

        io.to(roomId).emit('botAdded', {
            playerCount: room.players.length,
            players: room.players
        });
    });

    socket.on('startGame', (roomId) => {
        const room = rooms.get(roomId);
        if (!room) return;

        // Fill remaining slots with bots if needed
        while (room.players.length < MAX_PLAYERS) {
            const bot = createBot(roomId);
            bot.team = assignTeam(room.players);
            room.players.push(bot);
        }

        // Initialize game state
        room.deck = shuffleDeck(createDeck());
        const hands = dealCards(room.deck, room.players.length);
        room.players.forEach((player, index) => {
            player.hand = hands[index];
        });
        room.gameState = 'playing';
        room.currentTurn = 0;
        room.playedCards = [];

        // Send game start info to each player
        room.players.forEach((player, index) => {
            if (!player.isBot) {
                io.to(player.id).emit('gameStart', {
                    hand: player.hand,
                    playerIndex: index,
                    currentPlayer: room.players[room.currentTurn].id,
                    players: room.players.map(p => ({
                        id: p.id,
                        team: p.team,
                        isBot: p.isBot
                    }))
                });
            }
        });
    });

    socket.on('playCard', ({ roomId, cardIndex }) => {
        const room = rooms.get(roomId);
        if (!room || room.gameState !== 'playing') return;

        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex === -1 || playerIndex !== room.currentTurn) return;

        const player = room.players[playerIndex];
        const card = player.hand[cardIndex];
        if (!card) return;

        // Play the card
        player.hand.splice(cardIndex, 1);
        room.playedCards.push({ card, playerId: player.id });

        // Notify all players
        io.to(roomId).emit('cardPlayed', {
            card,
            playerId: player.id,
            nextPlayer: room.players[(room.currentTurn + 1) % room.players.length].id
        });

        // Move to next player
        room.currentTurn = (room.currentTurn + 1) % room.players.length;

        // If it's a bot's turn, make them play automatically
        if (room.players[room.currentTurn].isBot) {
            setTimeout(() => {
                const bot = room.players[room.currentTurn];
                const cardIndex = Math.floor(Math.random() * bot.hand.length);
                const card = bot.hand[cardIndex];
                bot.hand.splice(cardIndex, 1);
                room.playedCards.push({ card, playerId: bot.id });

                io.to(roomId).emit('cardPlayed', {
                    card,
                    playerId: bot.id,
                    nextPlayer: room.players[(room.currentTurn + 1) % room.players.length].id
                });

                room.currentTurn = (room.currentTurn + 1) % room.players.length;
            }, 1000);
        }
    });

    socket.on('leaveRoom', (roomId) => {
        const room = rooms.get(roomId);
        if (!room) return;

        socket.leave(roomId);
        room.players = room.players.filter(p => p.id !== socket.id);
        
        if (room.players.length === 0) {
            rooms.delete(roomId);
        } else {
            io.to(roomId).emit('playerLeft', {
                playerCount: room.players.length,
                players: room.players
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        rooms.forEach((room, roomId) => {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                if (room.players.length === 0) {
                    rooms.delete(roomId);
                } else {
                    io.to(roomId).emit('playerLeft', {
                        playerCount: room.players.length,
                        players: room.players
                    });
                }
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 