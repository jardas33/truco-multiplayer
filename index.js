'use strict';

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Game state
let gameState = {
    started: false,
    players: [],
    currentPlayerIndex: 0,
    deck: [],
    playedCards: [],
    scores: { team1: 0, team2: 0 },
    trucoState: null,
    gameValue: 1
};

// Card values and deck initialization
const CARD_VALUES = {
    'A_clubs': 1, '2_clubs': 2, '3_clubs': 3,
    'A_hearts': 1, '2_hearts': 2, '3_hearts': 3,
    'A_spades': 1, '2_spades': 2, '3_spades': 3,
    'A_diamonds': 1, '2_diamonds': 2, '3_diamonds': 3
};

function createDeck() {
    const deck = [];
    for (let card in CARD_VALUES) {
        deck.push({
            name: card,
            value: CARD_VALUES[card]
        });
    }
    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function dealCards() {
    gameState.deck = createDeck();
    shuffleDeck(gameState.deck);
    
    gameState.players.forEach(player => {
        player.hand = gameState.deck.splice(0, 3);
    });
}

// Socket.IO event handlers
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Add player to game
    if (gameState.players.length < 4) {
        const player = {
            id: socket.id,
            hand: [],
            team: gameState.players.length % 2 === 0 ? 1 : 2
        };
        gameState.players.push(player);
        
        // Send current game state to the new player
        socket.emit('gameState', {
            started: gameState.started,
            hand: player.hand,
            playedCards: gameState.playedCards,
            scores: gameState.scores,
            currentPlayer: gameState.players[gameState.currentPlayerIndex]?.id
        });
        
        io.emit('message', `Player ${gameState.players.length} joined. ${4 - gameState.players.length} more needed.`);
    } else {
        socket.emit('message', 'Game is full');
    }

    // Start game
    socket.on('startGame', () => {
        if (gameState.players.length === 4 && !gameState.started) {
            gameState.started = true;
            dealCards();
            
            // Send initial game state to all players
            gameState.players.forEach(player => {
                io.to(player.id).emit('gameState', {
                    started: true,
                    hand: player.hand,
                    playedCards: gameState.playedCards,
                    scores: gameState.scores,
                    currentPlayer: gameState.players[gameState.currentPlayerIndex].id
                });
            });
            
            io.emit('message', 'Game started!');
        }
    });

    // Play card
    socket.on('playCard', (card) => {
        if (!gameState.started) return;
        
        const player = gameState.players[gameState.currentPlayerIndex];
        if (player.id !== socket.id) return;
        
        // Find and remove card from player's hand
        const cardIndex = player.hand.findIndex(c => c.name === card.name);
        if (cardIndex === -1) return;
        
        const playedCard = player.hand.splice(cardIndex, 1)[0];
        gameState.playedCards.push({ ...playedCard, playerId: socket.id });
        
        // Move to next player
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % 4;
        
        // Check if round is complete
        if (gameState.playedCards.length === 4) {
            // Determine round winner (simplified for now)
            const winningCard = gameState.playedCards.reduce((prev, curr) => 
                prev.value > curr.value ? prev : curr
            );
            const winningPlayer = gameState.players.find(p => p.id === winningCard.playerId);
            gameState.scores[`team${winningPlayer.team}`]++;
            
            // Clear played cards for next round
            gameState.playedCards = [];
            
            // Check if game is over
            if (gameState.scores.team1 >= 12 || gameState.scores.team2 >= 12) {
                const winner = gameState.scores.team1 >= 12 ? 'Team 1' : 'Team 2';
                io.emit('message', `${winner} wins the game!`);
                gameState.started = false;
                return;
            }
        }
        
        // Update game state for all players
        gameState.players.forEach(p => {
            io.to(p.id).emit('gameState', {
                started: gameState.started,
                hand: p.hand,
                playedCards: gameState.playedCards,
                scores: gameState.scores,
                currentPlayer: gameState.players[gameState.currentPlayerIndex].id
            });
        });
    });

    // Call Truco
    socket.on('callTruco', () => {
        if (!gameState.started) return;
        
        const player = gameState.players.find(p => p.id === socket.id);
        if (!player) return;
        
        gameState.gameValue = Math.min(12, gameState.gameValue + 3);
        io.emit('message', `Player called Truco! Game value is now ${gameState.gameValue}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            gameState.players.splice(playerIndex, 1);
            gameState.started = false;
            io.emit('message', 'Player disconnected. Game stopped.');
        }
    });
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
