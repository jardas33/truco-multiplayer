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

        // ✅ CRITICAL FIX: Emit roomJoined event to the joining player
        socket.emit('roomJoined', roomCode);

        // ✅ Emit playerJoined event to all players in the room
        io.to(roomCode).emit('playerJoined', {
            players: room.players,
            count: room.players.length
        });
    });

    // ✅ Handle room leaving
    socket.on('leaveRoom', (roomCode) => {
        console.log(`🚪 User ${socket.id} leaving room: ${roomCode}`);
        
        const room = rooms.get(roomCode);
        if (!room) {
            console.log(`❌ Room ${roomCode} not found for user leaving`);
            return;
        }

        // Remove user from room
        room.players = room.players.filter(p => p.id !== socket.id);
        socket.leave(roomCode);
        socket.roomCode = null;

        console.log(`✅ User ${socket.id} left room ${roomCode}. Total players: ${room.players.length}`);

        // Emit player left event to remaining players
        io.to(roomCode).emit('playerLeft', {
            players: room.players,
            count: room.players.length
        });

        // If room is empty, delete it
        if (room.players.length === 0) {
            rooms.delete(roomCode);
            console.log(`🗑️ Room ${roomCode} deleted (empty)`);
        }
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

    // ✅ Handle bot removal
    socket.on('removeBot', (roomCode) => {
        console.log(`🤖 Removing bot from room: ${roomCode}`);
        
        const room = rooms.get(roomCode);
        if (!room) {
            console.log(`❌ Room ${roomCode} not found for bot removal`);
            return;
        }

        // Find the last bot in the room
        const botIndex = room.players.findIndex(player => player.isBot);
        if (botIndex === -1) {
            console.log(`❌ No bots found in room ${roomCode} to remove`);
            socket.emit('error', 'No bots to remove');
            return;
        }

        // Remove the bot
        const removedBot = room.players.splice(botIndex, 1)[0];
        console.log(`✅ Bot ${removedBot.name} removed from room ${roomCode}. Total players: ${room.players.length}`);

        // ✅ Emit updated player list to all players in the room
        io.to(roomCode).emit('playerJoined', {
            players: room.players,
            count: room.players.length
        });

        // If room is no longer full, emit roomNotFull event
        if (room.players.length < 4) {
            io.to(roomCode).emit('roomNotFull');
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
        console.log(`🃏 Play data:`, data);
        
        if (!socket.roomCode) {
            console.log(`❌ User ${socket.id} not in a room`);
            socket.emit('error', 'Not in a room');
            return;
        }
        
        const room = rooms.get(socket.roomCode);
        if (!room) {
            console.log(`❌ Room ${socket.roomCode} not found for card play`);
            socket.emit('error', 'Room not found');
            return;
        }

        if (!room.game) {
            console.log(`❌ No active game in room ${socket.roomCode}`);
            socket.emit('error', 'No active game');
            return;
        }

        // ✅ Find the player who played the card
        const player = room.players.find(p => p.id === socket.id);
        if (!player) {
            console.log(`❌ Player ${socket.id} not found in room`);
            socket.emit('error', 'Player not found in room');
            return;
        }

        // ✅ CRITICAL FIX: Handle bot card playing on server side
        const currentPlayerIndex = room.game.currentPlayer;
        const currentPlayer = room.players[currentPlayerIndex];
        
        console.log(`🃏 Turn validation: Current player: ${currentPlayerIndex} (${currentPlayer?.name}), Client sent playerIndex: ${data.playerIndex}`);
        
        // Check if it's actually the current player's turn
        if (room.game.currentPlayer !== data.playerIndex) {
            console.log(`❌ Player ${player.name} tried to play out of turn. Current: ${room.game.currentPlayer}, Client sent: ${data.playerIndex}`);
            socket.emit('error', 'Not your turn');
            return;
        }
        
        // If it's a bot's turn, handle the bot play on the server
        if (currentPlayer && currentPlayer.isBot) {
            console.log(`🤖 Bot ${currentPlayer.name}'s turn - handling bot play on server`);
            
            // Bot plays a random card
            if (room.game.hands && room.game.hands[currentPlayerIndex] && room.game.hands[currentPlayerIndex].length > 0) {
                const botHand = room.game.hands[currentPlayerIndex];
                const randomCardIndex = Math.floor(Math.random() * botHand.length);
                const selectedCard = botHand[randomCardIndex];
                
                console.log(`🤖 Bot ${currentPlayer.name} playing card: ${selectedCard.name} at index ${randomCardIndex}`);
                
                // Remove card from bot's hand
                botHand.splice(randomCardIndex, 1);
                
                // Add to played cards
                if (!room.game.playedCards) room.game.playedCards = [];
                room.game.playedCards.push({
                    player: currentPlayer,
                    card: selectedCard,
                    playerIndex: currentPlayerIndex
                });
                
                console.log(`✅ Bot ${currentPlayer.name} played ${selectedCard.name} in room ${socket.roomCode}`);
                
                // Move to next player
                room.game.currentPlayer = (room.game.currentPlayer + 1) % 4;
                
                // Emit bot card played event
                const cleanPlayedCards = room.game.playedCards.map(pc => ({
                    player: {
                        name: pc.player.name,
                        isBot: pc.player.isBot || false
                    },
                    card: {
                        name: pc.card.name,
                        value: pc.card.value,
                        suit: pc.card.suit || null
                    },
                    playerIndex: pc.playerIndex
                }));
                
                io.to(socket.roomCode).emit('cardPlayed', {
                    playerId: currentPlayer.id,
                    playerName: currentPlayer.name,
                    cardIndex: randomCardIndex,
                    card: selectedCard,
                    playerIndex: currentPlayerIndex,
                    allHands: room.game.hands,
                    playedCards: cleanPlayedCards
                });
                
                // Check if round is complete or emit turn change
                if (room.game.playedCards.length === 4) {
                    console.log(`🏁 Round complete in room ${socket.roomCode}`);
                    room.game.playedCards = [];
                    io.to(socket.roomCode).emit('roundComplete', {
                        currentPlayer: room.game.currentPlayer,
                        allHands: room.game.hands
                    });
                } else {
                    io.to(socket.roomCode).emit('turnChanged', {
                        currentPlayer: room.game.currentPlayer,
                        allHands: room.game.hands
                    });
                    
                    // ✅ Auto-trigger bot play if next player is a bot
                    const nextPlayer = room.players[room.game.currentPlayer];
                    if (nextPlayer && nextPlayer.isBot) {
                        console.log(`🤖 Auto-triggering bot ${nextPlayer.name} play in 1.5 seconds`);
                        setTimeout(() => {
                            // Check if it's still this bot's turn and game is active
                            if (room.game && room.game.currentPlayer === room.players.indexOf(nextPlayer)) {
                                console.log(`🤖 Auto-playing bot ${nextPlayer.name} card`);
                                
                                // Simulate bot play
                                const botHand = room.game.hands[room.game.currentPlayer];
                                if (botHand && botHand.length > 0) {
                                    const randomCardIndex = Math.floor(Math.random() * botHand.length);
                                    const selectedCard = botHand[randomCardIndex];
                                    
                                    console.log(`🤖 Auto-bot ${nextPlayer.name} playing: ${selectedCard.name}`);
                                    
                                    // Remove card from bot's hand
                                    botHand.splice(randomCardIndex, 1);
                                    
                                    // Add to played cards
                                    room.game.playedCards.push({
                                        player: nextPlayer,
                                        card: selectedCard,
                                        playerIndex: room.game.currentPlayer
                                    });
                                    
                                    // Move to next player
                                    room.game.currentPlayer = (room.game.currentPlayer + 1) % 4;
                                    
                                    // Emit bot card played event
                                    const cleanPlayedCards = room.game.playedCards.map(pc => ({
                                        player: {
                                            name: pc.player.name,
                                            isBot: pc.player.isBot || false
                                        },
                                        card: {
                                            name: pc.card.name,
                                            value: pc.card.value,
                                            suit: pc.card.suit || null
                                        },
                                        playerIndex: pc.playerIndex
                                    }));
                                    
                                    io.to(socket.roomCode).emit('cardPlayed', {
                                        playerId: nextPlayer.id,
                                        playerName: nextPlayer.name,
                                        cardIndex: randomCardIndex,
                                        card: selectedCard,
                                        playerIndex: room.players.indexOf(nextPlayer),
                                        allHands: room.game.hands,
                                        playedCards: cleanPlayedCards
                                    });
                                    
                                    // Check if round is complete or emit turn change
                                    if (room.game.playedCards.length === 4) {
                                        console.log(`🏁 Round complete in room ${socket.roomCode}`);
                                        room.game.playedCards = [];
                                        io.to(socket.roomCode).emit('roundComplete', {
                                            currentPlayer: room.game.currentPlayer,
                                            allHands: room.game.hands
                                        });
                                    } else {
                                        io.to(socket.roomCode).emit('turnChanged', {
                                            currentPlayer: room.game.currentPlayer,
                                            allHands: room.game.hands
                                        });
                                    }
                                }
                            }
                        }, 1500);
                    }
                }
                
                return; // Exit early - bot play handled
            }
        }

        // ✅ Get the card from the player's hand
        const cardIndex = data.cardIndex || 0;
        
        // ✅ CRITICAL FIX: Use client's playerIndex for accessing hands
        // This ensures consistency between client and server player indexing
        const clientPlayerIndex = data.playerIndex;
        console.log(`🃏 Client playerIndex: ${clientPlayerIndex}, Server playerIndex: ${playerIndex}`);
        
        if (!room.game.hands || !room.game.hands[clientPlayerIndex]) {
            console.log(`❌ No hands found for player ${player.name} at index ${clientPlayerIndex}`);
            socket.emit('error', 'Invalid game state');
            return;
        }

        const playerHand = room.game.hands[clientPlayerIndex];
        if (cardIndex < 0 || cardIndex >= playerHand.length) {
            console.log(`❌ Invalid card index ${cardIndex} for player ${player.name}. Hand size: ${playerHand.length}`);
            socket.emit('error', 'Invalid card index');
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
            playerIndex: clientPlayerIndex // ✅ Use client's playerIndex for consistency
        });

        console.log(`✅ ${player.name} played ${playedCard.name} in room ${socket.roomCode}`);

        // ✅ CRITICAL FIX: Create clean, serializable played cards array
        const cleanPlayedCards = room.game.playedCards.map(playedCard => ({
            player: {
                name: playedCard.player.name,
                isBot: playedCard.player.isBot || false
            },
            card: {
                name: playedCard.card.name,
                value: playedCard.card.value,
                suit: playedCard.card.suit || null
            },
            playerIndex: playedCard.playerIndex
        }));

        // ✅ Emit card played event to all players in the room with synchronized data
        io.to(socket.roomCode).emit('cardPlayed', {
            playerId: socket.id,
            playerName: player.name,
            cardIndex: cardIndex,
            card: playedCard,
            playerIndex: clientPlayerIndex, // ✅ Use client's playerIndex for consistency
            allHands: room.game.hands, // Send updated hands to all players
            playedCards: cleanPlayedCards // Send clean, serializable played cards
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

    // ✅ Handle Truco requests with improved validation
    socket.on('requestTruco', (data) => {
        console.log(`🎯 Truco requested in room: ${socket.roomCode}`);
        
        if (!socket.roomCode) {
            console.log(`❌ User ${socket.id} not in a room`);
            socket.emit('error', 'Not in a room');
            return;
        }
        
        const room = rooms.get(socket.roomCode);
        if (!room) {
            console.log(`❌ Room ${socket.roomCode} not found for Truco request`);
            socket.emit('error', 'Room not found');
            return;
        }

        if (!room.game) {
            console.log(`❌ No active game in room ${socket.roomCode}`);
            socket.emit('error', 'No active game');
            return;
        }

        // ✅ Validate it's the player's turn
        const player = room.players.find(p => p.id === socket.id);
        if (!player) {
            console.log(`❌ Player ${socket.id} not found in room`);
            socket.emit('error', 'Player not found in room');
            return;
        }

        const playerIndex = room.players.indexOf(player);
        if (room.game.currentPlayer !== playerIndex) {
            console.log(`❌ Player ${player.name} tried to call Truco out of turn`);
            socket.emit('error', 'Not your turn');
            return;
        }

        // Emit Truco called event to all players in the room
        io.to(socket.roomCode).emit('trucoCalled', {
            caller: socket.id,
            callerName: player.name,
            roomCode: socket.roomCode
        });

        console.log(`✅ Truco called event emitted for user ${socket.id} in room ${socket.roomCode}`);
    });

    // ✅ Handle Truco responses with improved validation
    socket.on('respondTruco', (data) => {
        console.log(`🎯 Truco response in room: ${socket.roomCode}`);
        
        if (!socket.roomCode) {
            console.log(`❌ User ${socket.id} not in a room`);
            socket.emit('error', 'Not in a room');
            return;
        }
        
        const room = rooms.get(socket.roomCode);
        if (!room) {
            console.log(`❌ Room ${socket.roomCode} not found for Truco response`);
            socket.emit('error', 'Room not found');
            return;
        }

        if (!room.game) {
            console.log(`❌ No active game in room ${socket.roomCode}`);
            socket.emit('error', 'No active game');
            return;
        }

        // ✅ Validate response data
        if (!data.response || ![1, 2, 3].includes(data.response)) {
            console.log(`❌ Invalid Truco response: ${data.response}`);
            socket.emit('error', 'Invalid response');
            return;
        }

        const player = room.players.find(p => p.id === socket.id);
        if (!player) {
            console.log(`❌ Player ${socket.id} not found in room`);
            socket.emit('error', 'Player not found in room');
            return;
        }

        // Emit Truco response event to all players in the room
        io.to(socket.roomCode).emit('trucoResponded', {
            responder: socket.id,
            responderName: player.name,
            response: data.response,
            roomCode: socket.roomCode
        });

        console.log(`✅ Truco response event emitted for user ${socket.id} in room ${socket.roomCode}`);
    });

    // ✅ Handle player nickname changes
    socket.on('changeNickname', (data) => {
        const roomCode = data.roomCode || socket.roomCode;
        console.log(`✏️ Nickname change requested in room: ${roomCode}`);
        
        if (!roomCode) {
            console.log(`❌ User ${socket.id} not in a room`);
            socket.emit('error', 'Not in a room');
            return;
        }
        
        const room = rooms.get(roomCode);
        if (!room) {
            console.log(`❌ Room ${roomCode} not found for nickname change`);
            socket.emit('error', 'Room not found');
            return;
        }

        const player = room.players.find(p => p.id === socket.id);
        if (!player) {
            console.log(`❌ Player ${socket.id} not found in room`);
            socket.emit('error', 'Player not found in room');
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
        io.to(roomCode).emit('playerJoined', {
            players: room.players,
            count: room.players.length
        });

        console.log(`✅ Nickname change event emitted for user ${socket.id} in room ${roomCode}`);
    });

    // ✅ Handle player team selection
    socket.on('selectTeam', (data) => {
        const roomCode = data.roomCode || socket.roomCode;
        console.log(`🏆 Team selection requested in room: ${roomCode}`);
        
        if (!roomCode) {
            console.log(`❌ User ${socket.id} not in a room`);
            socket.emit('error', 'Not in a room');
            return;
        }
        
        const room = rooms.get(roomCode);
        if (!room) {
            console.log(`❌ Room ${roomCode} not found for team selection`);
            socket.emit('error', 'Room not found');
            return;
        }

        const player = room.players.find(p => p.id === socket.id);
        if (!player) {
            console.log(`❌ Player ${socket.id} not found in room`);
            socket.emit('error', 'Player not found in room');
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
        io.to(roomCode).emit('playerJoined', {
            players: room.players,
            count: room.players.length
        });

        console.log(`✅ Team selection event emitted for user ${socket.id} in room ${roomCode}`);
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