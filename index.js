'use strict';

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Serve static files
app.use(express.static('public'));
app.use('/Images', express.static(path.join(__dirname, 'Images')));

// Game state
const rooms = new Map();

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
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < numPlayers; j++) {
            hands[j].push(deck.pop());
        }
    }
    return hands;
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('createRoom', (roomId) => {
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                players: [],
                gameState: null,
                started: false
            });
            socket.join(roomId);
            socket.emit('roomCreated', roomId);
            console.log(`Room created: ${roomId}`);
        } else {
            socket.emit('error', 'Room already exists');
        }
    });

    socket.on('joinRoom', (roomId) => {
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('error', 'Room does not exist');
            return;
        }
        
        if (room.players.length >= 4) {
            socket.emit('error', 'Room is full');
            return;
        }

        if (room.started) {
            socket.emit('error', 'Game already started');
            return;
        }

        socket.join(roomId);
        room.players.push({
            id: socket.id,
            team: room.players.length % 2 === 0 ? 'team1' : 'team2',
            isBot: false
        });

        io.to(roomId).emit('playerJoined', {
            players: room.players,
            playerCount: room.players.length
        });
        console.log(`Player ${socket.id} joined room ${roomId}`);
    });

    socket.on('startGame', (roomId) => {
        const room = rooms.get(roomId);
        if (!room) return;

        if (room.players.length < 2) {
            socket.emit('error', 'Not enough players');
            return;
        }

        // Initialize game state
        let deck = createDeck();
        deck = shuffleDeck(deck);
        const hands = dealCards(deck, room.players.length);

        room.gameState = {
            deck: deck,
            currentPlayerIndex: 0,
            playedCards: [],
            scores: { team1: 0, team2: 0 },
            games: { team1: 0, team2: 0 },
            sets: { team1: 0, team2: 0 },
            roundResults: [],
            gameValue: 1
        };
        room.started = true;

        // Send initial game state to each player
        room.players.forEach((player, index) => {
            io.to(player.id).emit('gameStart', {
                hand: hands[index],
                playerIndex: index,
                currentPlayer: room.players[0].id,
                players: room.players
            });
        });

        console.log(`Game started in room ${roomId}`);
    });

    socket.on('playCard', (data) => {
        const { roomId, cardIndex } = data;
        const room = rooms.get(roomId);
        if (!room || !room.gameState) return;

        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex === -1) return;

        // Validate it's the player's turn
        if (room.gameState.currentPlayerIndex !== playerIndex) {
            socket.emit('error', 'Not your turn');
            return;
        }

        // Get the played card
        const player = room.players[playerIndex];
        const hand = hands[playerIndex];
        const playedCard = hand.splice(cardIndex, 1)[0];

        // Add to played cards
        room.gameState.playedCards.push({
            card: playedCard,
            playerId: socket.id
        });

        // Move to next player
        room.gameState.currentPlayerIndex = (room.gameState.currentPlayerIndex + 1) % room.players.length;

        // Broadcast the play
        io.to(roomId).emit('cardPlayed', {
            playerId: socket.id,
            cardIndex: cardIndex,
            card: playedCard,
            nextPlayer: room.players[room.gameState.currentPlayerIndex].id
        });

        // Check if round is complete
        if (room.gameState.playedCards.length === room.players.length) {
            handleRoundEnd(roomId);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        rooms.forEach((room, roomId) => {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                io.to(roomId).emit('playerLeft', {
                    players: room.players,
                    playerCount: room.players.length
                });
                
                // End game if not enough players
                if (room.started && room.players.length < 2) {
                    room.started = false;
                    room.gameState = null;
                    io.to(roomId).emit('gameEnd', { reason: 'Not enough players' });
                }
            }
        });
    });
});

function handleRoundEnd(roomId) {
    const room = rooms.get(roomId);
    if (!room || !room.gameState) return;

    // Determine round winner (simplified for now)
    const winningPlay = room.gameState.playedCards.reduce((prev, current) => {
        // Simple comparison - you'll want to implement proper card value comparison
        return prev.card > current.card ? prev : current;
    });

    const winningPlayer = room.players.find(p => p.id === winningPlay.playerId);
    const winningTeam = winningPlayer.team;

    // Update scores
    room.gameState.scores[winningTeam]++;

    // Broadcast round end
    io.to(roomId).emit('roundEnd', {
        scores: room.gameState.scores,
        games: room.gameState.games,
        sets: room.gameState.sets,
        winner: winningTeam
    });

    // Reset for next round
    room.gameState.playedCards = [];
    
    // Check if game is complete (team won 2 rounds)
    if (room.gameState.scores.team1 === 2 || room.gameState.scores.team2 === 2) {
        const winningTeam = room.gameState.scores.team1 === 2 ? 'team1' : 'team2';
        room.gameState.games[winningTeam] += room.gameState.gameValue;
        
        // Check if set is complete (team won 12 games)
        if (room.gameState.games[winningTeam] >= 12) {
            room.gameState.sets[winningTeam]++;
            room.gameState.games = { team1: 0, team2: 0 };
            io.to(roomId).emit('setEnd', {
                winner: winningTeam,
                sets: room.gameState.sets
            });
        }

        // Start new game
        let deck = createDeck();
        deck = shuffleDeck(deck);
        const hands = dealCards(deck, room.players.length);
        
        room.gameState.deck = deck;
        room.gameState.scores = { team1: 0, team2: 0 };
        room.gameState.gameValue = 1;
        
        // Deal new hands
        room.players.forEach((player, index) => {
            io.to(player.id).emit('newGame', {
                hand: hands[index],
                games: room.gameState.games,
                sets: room.gameState.sets
            });
        });
    }
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
