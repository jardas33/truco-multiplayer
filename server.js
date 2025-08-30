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
                nickname: `Player 1`,
                team: null, // No team assigned yet
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
            nickname: `Player ${room.players.length + 1}`,
            team: null, // No team assigned yet
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
        console.log(`🤖 Adding bot to room: ${roomCode}`);
        
        const room = rooms.get(roomCode);
        
        if (!room) {
            console.log(`❌ Room ${roomCode} not found for bot addition`);
            socket.emit('error', 'Room not found');
            return;
        }

        if (room.players.length >= 4) {
            console.log(`❌ Room ${roomCode} is full, cannot add bot`);
            socket.emit('error', 'Room is full');
            return;
        }

        const botNumber = room.players.length + 1;
        const botId = `bot-${Math.random().toString(36).substring(7)}`;
        const botName = `Bot ${botNumber}`;
        
        room.players.push({
            id: botId,
            name: botName,
            nickname: botName,
            team: null, // Bots will be assigned teams automatically
            isBot: true
        });

        console.log(`✅ Bot ${botName} (${botId}) added to room ${roomCode}. Total players: ${room.players.length}`);

        // ✅ Emit updated player list to all players in the room
        io.to(roomCode).emit('playerJoined', {
            players: room.players,
            count: room.players.length
        });

        if (room.players.length === 4) {
            console.log(`🎯 Room ${roomCode} is now full with 4 players`);
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

        // ✅ Auto-assign teams to players who haven't chosen yet
        let team1Count = 0;
        let team2Count = 0;
        
        room.players.forEach(player => {
            if (player.team === null) {
                // Auto-assign team based on current distribution
                if (team1Count < 2) {
                    player.team = 'team1';
                    team1Count++;
                } else if (team2Count < 2) {
                    player.team = 'team2';
                    team2Count++;
                }
            } else {
                // Count existing team assignments
                if (player.team === 'team1') team1Count++;
                else if (player.team === 'team2') team2Count++;
            }
        });

        console.log(`✅ Team distribution: Team 1 (${team1Count}), Team 2 (${team2Count})`);

        console.log(`✅ Starting game with ${room.players.length} players in room ${roomCode}`);

        // ✅ Create shared deck and distribute cards to all players
        const deck = createDeck();
        const hands = dealCards(deck);
        
        // ✅ Store game state in room for synchronization
        room.game = {
            deck: deck,
            hands: hands,
            currentPlayer: 0,
            playedCards: [],
            scores: { team1: 0, team2: 0 }
        };

        // ✅ Emit gameStart event with hands to all players in the room
        io.to(roomCode).emit('gameStart', {
            players: room.players,
            hands: hands,
            currentPlayer: 0
        });
        
        console.log(`🎯 Game started successfully in room ${roomCode} with shared deck`);
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

        // ✅ Find the player who played the card
        const player = room.players.find(p => p.id === socket.id);
        if (!player) {
            console.log(`❌ Player ${socket.id} not found in room`);
            return;
        }

        // ✅ Get the card from the player's hand
        const cardIndex = data.cardIndex || 0;
        if (!room.game || !room.game.hands || !room.game.hands[room.players.indexOf(player)]) {
            console.log(`❌ No hands found for player ${player.name}`);
            return;
        }

        const playerHand = room.game.hands[room.players.indexOf(player)];
        if (cardIndex >= playerHand.length) {
            console.log(`❌ Invalid card index ${cardIndex} for player ${player.name}`);
            return;
        }

        const playedCard = playerHand[cardIndex];
        
        // ✅ Remove card from hand
        playerHand.splice(cardIndex, 1);
        
        // ✅ Add to played cards
        if (!room.game.playedCards) room.game.playedCards = [];
        room.game.playedCards.push({
            player: player,
            card: playedCard,
            playerIndex: room.players.indexOf(player)
        });

        console.log(`✅ ${player.name} played ${playedCard.name} in room ${socket.roomCode}`);

        // ✅ Emit card played event to all players in the room with synchronized data
        io.to(socket.roomCode).emit('cardPlayed', {
            playerId: socket.id,
            playerName: player.name,
            cardIndex: cardIndex,
            card: playedCard,
            playerIndex: room.players.indexOf(player),
            allHands: room.game.hands, // Send updated hands to all players
            playedCards: room.game.playedCards // Send all played cards
        });

        // ✅ Check if round is complete
        if (room.game.playedCards.length === 4) {
            console.log(`🏁 Round complete in room ${socket.roomCode}`);
            // Reset for next round
            room.game.playedCards = [];
            // Move to next player
            room.game.currentPlayer = (room.game.currentPlayer + 1) % 4;
            
            // Emit round complete event
            io.to(socket.roomCode).emit('roundComplete', {
                currentPlayer: room.game.currentPlayer,
                allHands: room.game.hands
            });
        } else {
            // Move to next player
            room.game.currentPlayer = (room.game.currentPlayer + 1) % 4;
            
            // Emit turn change event
            io.to(socket.roomCode).emit('turnChanged', {
                currentPlayer: room.game.currentPlayer,
                allHands: room.game.hands
            });
        }

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

    // ✅ Handle player nickname changes
    socket.on('changeNickname', (data) => {
        console.log(`✏️ Nickname change requested in room: ${socket.roomCode}`);
        
        if (!socket.roomCode) {
            console.log(`❌ User ${socket.id} not in a room`);
            return;
        }
        
        const room = rooms.get(socket.roomCode);
        if (!room) {
            console.log(`❌ Room ${socket.roomCode} not found for nickname change`);
            return;
        }

        const player = room.players.find(p => p.id === socket.id);
        if (!player) {
            console.log(`❌ Player ${socket.id} not found in room`);
            return;
        }

        // Validate nickname length (max 12 characters)
        const newNickname = data.nickname.trim();
        if (newNickname.length === 0 || newNickname.length > 12) {
            socket.emit('error', 'Nickname must be between 1 and 12 characters');
            return;
        }

        // Check if nickname is already taken
        const nicknameTaken = room.players.some(p => p.nickname === newNickname && p.id !== socket.id);
        if (nicknameTaken) {
            socket.emit('error', 'Nickname already taken');
            return;
        }

        // Update player nickname
        player.nickname = newNickname;
        console.log(`✅ ${player.name} changed nickname to: ${newNickname}`);

        // Emit updated player list to all players in the room
        io.to(socket.roomCode).emit('playerJoined', {
            players: room.players,
            count: room.players.length
        });

        console.log(`✅ Nickname change event emitted for user ${socket.id} in room ${socket.roomCode}`);
    });

    // ✅ Handle player team selection
    socket.on('selectTeam', (data) => {
        console.log(`🏆 Team selection requested in room: ${socket.roomCode}`);
        
        if (!socket.roomCode) {
            console.log(`❌ User ${socket.id} not in a room`);
            return;
        }
        
        const room = rooms.get(socket.roomCode);
        if (!room) {
            console.log(`❌ Room ${socket.roomCode} not found for team selection`);
            return;
        }

        const player = room.players.find(p => p.id === socket.id);
        if (!player) {
            console.log(`❌ Player ${socket.id} not found in room`);
            return;
        }

        const requestedTeam = data.team; // 'team1' or 'team2'
        
        // Check if team is full (max 2 players per team)
        const teamCount = room.players.filter(p => p.team === requestedTeam).length;
        if (teamCount >= 2) {
            socket.emit('error', 'Team is full (max 2 players per team)');
            return;
        }

        // Update player team
        player.team = requestedTeam;
        console.log(`✅ ${player.nickname} joined ${requestedTeam === 'team1' ? 'Team Alfa' : 'Team Beta'}`);

        // Emit updated player list to all players in the room
        io.to(socket.roomCode).emit('playerJoined', {
            players: room.players,
            count: room.players.length
        });

        console.log(`✅ Team selection event emitted for user ${socket.id} in room ${socket.roomCode}`);
    });
});

// Helper functions
function createDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['ace', '2', '3', '4', '5', '6', '7', 'jack', 'queen', 'king'];
    const deck = [];
    
    for (const suit of suits) {
        for (const value of values) {
            // ✅ Create cards with the exact format the client expects
            const cardName = `${value.charAt(0).toUpperCase() + value.slice(1)} of ${suit}`;
            deck.push({ 
                suit: suit, 
                value: value,
                name: cardName,  // ✅ Use proper capitalized format: "Ace of diamonds"
                isClickable: false  // ✅ Add isClickable property
            });
        }
    }
    
    // Shuffle the deck
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    console.log(`🎴 Server created deck with ${deck.length} cards`);
    console.log(`🎯 Sample cards:`, deck.slice(0, 3).map(c => c.name));
    
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