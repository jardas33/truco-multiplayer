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
    
    // ✅ DEBUG: Log all incoming events to see if startGame is received
    console.log(`🔍 Socket ${socket.id} connected - waiting for events`);
    
    // Handle room creation
    socket.on('createRoom', (roomCode) => {
        console.log(`🔍 CREATEROOM EVENT RECEIVED! Room: ${roomCode}`);
        // ✅ INPUT VALIDATION: Ensure room code is valid
        if (roomCode && typeof roomCode === 'string') {
            roomCode = roomCode.trim().toUpperCase();
            // Only allow alphanumeric characters
            if (!/^[A-Z0-9]+$/.test(roomCode)) {
                console.log(`❌ Invalid room code format: ${roomCode}`);
                socket.emit('error', 'Invalid room code format. Use only letters and numbers.');
                return;
            }
        } else {
            roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        }
        
        // ✅ CHECK: Ensure room code doesn't already exist
        if (rooms.has(roomCode)) {
            console.log(`❌ Room code ${roomCode} already exists`);
            socket.emit('error', 'Room code already exists. Please try a different one.');
            return;
        }
        
        console.log(`🏠 Creating room: ${roomCode} for user: ${socket.id}`);
        
        rooms.set(roomCode, {
            players: [{
                id: socket.id,
                name: `Player 1`,
                nickname: `Player 1`,
                team: null, // No team assigned yet
                isBot: false,
                isRoomCreator: true // ✅ CRITICAL FIX: Mark the room creator
            }],
            game: null,
            isFirstGame: true // ✅ CRITICAL FIX: Mark this as the first game
        });

        socket.join(roomCode);
        socket.roomCode = roomCode;

        console.log(`🔍 Socket joined room: ${roomCode}`);
        console.log(`🔍 Socket room code set to: ${socket.roomCode}`);

        socket.emit('roomCreated', roomCode);
        io.to(roomCode).emit('playerJoined', {
            players: rooms.get(roomCode).players,
            count: 1
        });
        
        console.log(`✅ Room ${roomCode} created successfully`);
    });

    // Handle room joining
    socket.on('joinRoom', (roomCode) => {
        console.log(`🔍 JOINROOM EVENT RECEIVED! Room: ${roomCode}`);
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
        console.log(`🔍 Socket joined room: ${roomCode}`);
        console.log(`🔍 Socket room code set to: ${socket.roomCode}`);

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
        try {
            console.log(`🎮 STARTGAME EVENT RECEIVED! Room: ${roomCode}`);
            console.log(`🔍 Socket ID: ${socket.id}`);
            console.log(`🔍 Socket room code: ${socket.roomCode}`);
            console.log(`🔍 Available rooms:`, Array.from(rooms.keys()));
            console.log(`🔍 Event handler executing...`);
            
            const room = rooms.get(roomCode);
            if (!room) {
                console.log(`❌ Room ${roomCode} not found for game start`);
                console.log(`🔍 Room not found - checking if socket is in any room`);
                socket.emit('error', 'Room not found');
                return;
            }
            
            console.log(`🔍 Room found with ${room.players.length} players:`, room.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot })));
            
            if (room.players.length < 4) {
                console.log(`❌ Room ${roomCode} needs 4 players, has ${room.players.length}`);
                socket.emit('error', 'Need 4 players to start the game');
                return;
            }

            // ✅ CRITICAL FIX: Auto-assign teams with alternating order for balanced gameplay
            // Player 1 → team1, Player 2 → team2, Player 3 → team1, Player 4 → team2
            let team1Count = 0;
            let team2Count = 0;
            
            room.players.forEach((player, index) => {
                if (player.team === null) {
                    // ✅ CRITICAL FIX: Alternate team assignment for balanced turn order
                    if (index % 2 === 0) {
                        player.team = 'team1'; // Player 1 (index 0), Player 3 (index 2)
                        team1Count++;
                    } else {
                        player.team = 'team2'; // Player 2 (index 1), Player 4 (index 3)
                        team2Count++;
                    }
                    console.log(`🎯 Player ${index + 1} (${player.name}) assigned to ${player.team === 'team1' ? 'Team Alfa' : 'Team Beta'}`);
                } else {
                    // Count existing team assignments
                    if (player.team === 'team1') team1Count++;
                    else if (player.team === 'team2') team2Count++;
                }
            });

            console.log(`✅ Team distribution: Team 1 (${team1Count}), Team 2 (${team2Count})`);
            console.log(`✅ Team assignment:`, room.players.map((p, i) => `${i}: ${p.name} → ${p.team === 'team1' ? 'Team Alfa' : 'Team Beta'}`));
            console.log(`✅ Starting game with ${room.players.length} players in room ${roomCode}`);

            // ✅ Create shared deck and distribute cards to all players
            console.log(`🔍 Creating deck...`);
            const deck = createDeck();
            console.log(`🔍 Deck created successfully with ${deck.length} cards`);
            
            console.log(`🔍 Dealing cards...`);
            const hands = dealCards(deck);
            console.log(`🔍 Cards dealt successfully, hands:`, hands.map((hand, i) => `Player ${i}: ${hand.length} cards`));
            
            // ✅ VALIDATION: Ensure hands are properly created
            if (!hands || hands.length !== 4 || hands.some(hand => !Array.isArray(hand) || hand.length !== 3)) {
                throw new Error('Invalid hands created');
            }
            
            // ✅ Store game state in room for synchronization
            room.game = {
                deck: deck,
                hands: hands,
                currentPlayer: 0, // Will be set correctly below
                playedCards: [], // ✅ Clear played cards when starting new game
                scores: { team1: 0, team2: 0 }
            };
            
            // ✅ CRITICAL FIX: Only the very first game starts with Player 1
            // All subsequent games start with the round winner from the previous game
            if (!room.isFirstGame) {
                // This is a subsequent game - start with round winner
                if (room.lastRoundWinner) {
                    const winnerPlayerIndex = room.players.findIndex(p => p.name === room.lastRoundWinner.name);
                    if (winnerPlayerIndex !== -1) {
                        room.game.currentPlayer = winnerPlayerIndex;
                        console.log(`🎯 Subsequent game starting with round winner: ${room.lastRoundWinner.name} (index ${winnerPlayerIndex})`);
                    } else {
                        room.game.currentPlayer = 0;
                        console.log(`⚠️ Could not find round winner, defaulting to Player 1`);
                    }
                } else {
                    room.game.currentPlayer = 0;
                    console.log(`⚠️ No round winner found, defaulting to Player 1`);
                }
            } else {
                // This is the very first game - start with Player 1
                room.game.currentPlayer = 0;
                console.log(`🎯 Very first game starting with Player 1: ${room.game.currentPlayer} (${room.players[room.game.currentPlayer]?.name})`);
                console.log(`🔍 DEBUG: First game currentPlayer set to: ${room.game.currentPlayer}`);
                console.log(`🔍 DEBUG: Player at index 0: ${room.players[0]?.name} (${room.players[0]?.team})`);
                room.isFirstGame = false; // Mark that we've had our first game
            }
            
            console.log(`✅ Game state initialized successfully for room ${roomCode}`);
            console.log(`🔍 DEBUG: Sending currentPlayer ${room.game.currentPlayer} to all clients`);

            // ✅ Emit gameStart event with hands to all players in the room
            // ✅ Emitting gameStart event to room
            
            io.to(roomCode).emit('gameStart', {
                players: room.players,
                hands: hands,
                currentPlayer: room.game.currentPlayer  // ✅ FIX: Use the actual random starting player
            });
            
            console.log(`🎯 Game started successfully in room ${roomCode} with shared deck`);
            console.log(`🔍 gameStart event emitted to ${room.players.length} players`);
        } catch (error) {
            console.error(`❌ CRITICAL ERROR in startGame handler:`, error);
            console.error(`❌ Error stack:`, error.stack);
            socket.emit('error', 'Failed to start game due to server error');
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected');
        
        if (socket.roomCode) {
            const room = rooms.get(socket.roomCode);
            if (room) {
                // ✅ CRITICAL FIX: Don't remove players during active games
                // This was causing "Room not found" errors
                if (!room.game || !room.game.started) {
                    room.players = room.players.filter(p => p.id !== socket.id);
                    
                    io.to(socket.roomCode).emit('playerLeft', {
                        players: room.players,
                        count: room.players.length
                    });

                    if (room.players.length === 0) {
                        rooms.delete(socket.roomCode);
                    }
                } else {
                    console.log(`⚠️ Player disconnected during active game - keeping them in room`);
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

        // ✅ CRITICAL FIX: Improved turn validation for bot plays
        const playerIndex = room.players.indexOf(player);
        const clientPlayerIndex = data.playerIndex;
        
        console.log(`🃏 Turn validation: Current player: ${room.game.currentPlayer}, Player index: ${playerIndex}, Player: ${player.name}`);
        console.log(`🃏 Client sent playerIndex: ${clientPlayerIndex}, Server calculated: ${playerIndex}`);
        
        // ✅ CRITICAL FIX: Validate that the player making the request is authorized
        // For bots, the room creator can play on their behalf
        const targetPlayer = room.players[clientPlayerIndex];
        if (!targetPlayer) {
            console.log(`❌ Invalid player index: ${clientPlayerIndex}`);
            socket.emit('error', 'Invalid player');
            return;
        }
        
        // ✅ CRITICAL FIX: Validate that the client's playerIndex matches the current player
        // This ensures the correct player (including bots) is playing on their turn
        if (room.game.currentPlayer !== clientPlayerIndex) {
            console.log(`❌ Play attempt out of turn. Current: ${room.game.currentPlayer}, Client sent: ${clientPlayerIndex}`);
            console.log(`🔍 DEBUG: Current player should be: ${room.players[room.game.currentPlayer]?.name}, Attempted player: ${room.players[clientPlayerIndex]?.name}`);
            
            // ✅ CRITICAL FIX: For bots, allow a small tolerance window to prevent race conditions
            if (targetPlayer.isBot) {
                console.log(`🤖 Bot ${targetPlayer.name} turn validation - allowing small tolerance for race conditions`);
                // Don't immediately reject bot plays - they might be slightly out of sync
                // The bot logic will handle this gracefully
            } else {
                socket.emit('error', 'Not your turn');
                return;
            }
        }
        
        // ✅ CRITICAL FIX: For bot plays, validate that the requesting player can act on behalf of the bot
        if (targetPlayer.isBot) {
            // ✅ CRITICAL FIX: Allow ANY player in the room to play for bots (not just room creator)
            // This prevents authorization errors when multiple human players are in the room
            const isPlayerInRoom = room.players.some(p => p.id === player.id && !p.isBot);
            
            console.log(`🔍 DEBUG: Bot play authorization check:`);
            console.log(`🔍 DEBUG: Current player (bot): ${targetPlayer.name} (${clientPlayerIndex})`);
            console.log(`🔍 DEBUG: Requester: ${player.name} (${player.id})`);
            console.log(`🔍 DEBUG: Is requester in room: ${isPlayerInRoom}`);
            console.log(`🔍 DEBUG: Room players:`, room.players.map(p => ({ name: p.name, id: p.id, isBot: p.isBot })));
            
            if (!isPlayerInRoom) {
                console.log(`❌ Requester ${player.name} not found in room players`);
                socket.emit('error', 'Not authorized to play for bot');
                return;
            }
            console.log(`✅ Player ${player.name} authorized to play for bot ${targetPlayer.name}`);
        }
        
        // ✅ CRITICAL FIX: Prevent bots from playing multiple cards in one turn
        if (targetPlayer.isBot) {
            // Check if this bot has already played a card this turn
            // Use a more robust check that looks at the current turn state
            const botPlayedThisTurn = room.game.playedCards.some(pc => 
                pc.playerIndex === clientPlayerIndex
            );
            
            console.log(`🤖 Bot ${targetPlayer.name} (index ${clientPlayerIndex}) play validation:`);
            console.log(`🤖 Current played cards: ${room.game.playedCards.length}`);
            console.log(`🤖 Already played this turn: ${botPlayedThisTurn}`);
            console.log(`🤖 Played cards player indices: [${room.game.playedCards.map(pc => pc.playerIndex).join(', ')}]`);
            
            if (botPlayedThisTurn) {
                console.log(`❌ Bot ${targetPlayer.name} already played a card this turn - ignoring duplicate play`);
                // Don't emit error for bots - just log and continue
                console.log(`🤖 Bot ${targetPlayer.name} duplicate play ignored, continuing...`);
                return;
            }
            
            console.log(`✅ Bot ${targetPlayer.name} play validated - proceeding with card play`);
            
            // ✅ CRITICAL FIX: Mark bot as having played this turn to prevent future duplicate plays
            if (!room.game.botPlayedThisTurn) {
                room.game.botPlayedThisTurn = new Set();
            }
            room.game.botPlayedThisTurn.add(clientPlayerIndex);
            
            // ✅ CRITICAL FIX: Also mark the bot player object to prevent client-side duplicate plays
            targetPlayer.hasPlayedThisTurn = true;
            console.log(`✅ Bot ${targetPlayer.name} marked as played this turn`);
            
            // ✅ CRITICAL FIX: Don't reset this flag until the turn actually changes
            // This prevents race conditions where the flag gets reset too early
        }
        
        console.log(`✅ Turn validation passed: ${targetPlayer.name} (${clientPlayerIndex}) is playing on their turn`);

        // ✅ Get the card from the player's hand
        const cardIndex = data.cardIndex || 0;
        
        console.log(`🃏 Client playerIndex: ${clientPlayerIndex}, Server playerIndex: ${playerIndex}`);
        
        if (!room.game.hands || !room.game.hands[clientPlayerIndex]) {
            console.log(`❌ No hands found for player ${targetPlayer.name} at index ${clientPlayerIndex}`);
            socket.emit('error', 'Invalid game state');
            return;
        }

        const playerHand = room.game.hands[clientPlayerIndex];
        if (cardIndex < 0 || cardIndex >= playerHand.length) {
            console.log(`❌ Invalid card index ${cardIndex} for player ${targetPlayer.name}. Hand size: ${playerHand.length}`);
            socket.emit('error', 'Invalid card index');
            return;
        }

        const playedCard = playerHand[cardIndex];
        
        // ✅ Remove card from hand
        playerHand.splice(cardIndex, 1);
        
        // ✅ Add to played cards
        if (!room.game.playedCards) room.game.playedCards = [];
        
        // ✅ CRITICAL DEBUG: Log before adding card to playedCards
        console.log(`🔍 DEBUG: Adding card to playedCards array. Current count: ${room.game.playedCards.length}`);
        console.log(`🔍 DEBUG: Adding card: ${playedCard.name} by ${targetPlayer.name} (index ${clientPlayerIndex})`);
        
        // ✅ CRITICAL DEBUG: Check for duplicate cards before adding
        const existingCard = room.game.playedCards.find(pc => pc.playerIndex === clientPlayerIndex);
        if (existingCard) {
            console.log(`❌ CRITICAL ERROR: Duplicate card detected for player ${targetPlayer.name} (${clientPlayerIndex})`);
            console.log(`❌ Existing card: ${existingCard.card.name}, New card: ${playedCard.name}`);
            console.log(`❌ This will cause incorrect round completion!`);
            console.log(`❌ CRITICAL ERROR: STOPPING CARD ADDITION TO PREVENT BUG!`);
            return; // Don't add duplicate card
        }
        
        room.game.playedCards.push({
            player: targetPlayer, // ✅ Use targetPlayer for consistency
            card: playedCard,
            playerIndex: clientPlayerIndex
        });

        // ✅ CRITICAL DEBUG: Log after adding card to playedCards
        console.log(`🔍 DEBUG: Card added. New count: ${room.game.playedCards.length}`);
        console.log(`✅ ${targetPlayer.name} played ${playedCard.name} in room ${socket.roomCode}`);

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
            playerId: targetPlayer.id, // ✅ Use targetPlayer.id for bots
            playerName: targetPlayer.name, // ✅ Use targetPlayer.name for bots
            cardIndex: cardIndex,
            card: playedCard,
            playerIndex: clientPlayerIndex,
            allHands: room.game.hands, // Send updated hands to all players
            playedCards: cleanPlayedCards // Send clean, serializable played cards
        });

        // ✅ CRITICAL DEBUG: Log played cards state before round completion check
        console.log(`🔍 DEBUG: Played cards count: ${room.game.playedCards.length}`);
        console.log(`🔍 DEBUG: Played cards details:`, room.game.playedCards.map(pc => ({
            player: pc.player.name,
            card: pc.card.name,
            playerIndex: pc.playerIndex
        })));
        
        // ✅ CRITICAL DEBUG: Check if this is a bot play that should NOT trigger round completion
        if (targetPlayer.isBot && room.game.playedCards.length === 3) {
            console.log(`🔍 DEBUG: Bot ${targetPlayer.name} played 3rd card - this should NOT trigger round completion yet`);
            console.log(`🔍 DEBUG: Waiting for Bot 4 to play the 4th card`);
        }
        
        // ✅ CRITICAL DEBUG: Log EXACTLY when round completion check happens
        console.log(`🔍 CRITICAL DEBUG: Round completion check triggered!`);
        console.log(`🔍 CRITICAL DEBUG: playedCards.length = ${room.game.playedCards.length}`);
        console.log(`🔍 CRITICAL DEBUG: This should ONLY happen when 4 cards are played!`);
        console.log(`🔍 CRITICAL DEBUG: Current player: ${targetPlayer.name} (${clientPlayerIndex})`);
        console.log(`🔍 CRITICAL DEBUG: If this is NOT the 4th card, this is a BUG!`);
        
        // ✅ Check if round is complete
        if (room.game.playedCards.length === 4) {
            console.log(`🏁 Round complete in room ${socket.roomCode}`);
            
            // ✅ CRITICAL FIX: Implement proper scoring logic with draw handling
            const roundWinner = determineRoundWinner(room.game.playedCards, room);
            console.log(`🏆 Round winner: ${roundWinner ? roundWinner.name : 'Draw - no winner yet'} (${roundWinner ? roundWinner.team : 'N/A'})`);
            
            // ✅ Update team scores based on round winner (only if there's a clear winner)
            if (roundWinner && roundWinner.team === 'team1') {
                room.game.scores.team1 += 1;
                console.log(`🏆 Team 1 score increased to: ${room.game.scores.team1}`);
            } else if (roundWinner && roundWinner.team === 'team2') {
                room.game.scores.team2 += 1;
                console.log(`🏆 Team 2 score increased to: ${room.game.scores.team2}`);
            } else if (!roundWinner) {
                console.log(`🤝 Draw - no score change. Scores remain: Team 1: ${room.game.scores.team1}, Team 2: ${room.game.scores.team2}`);
            }
            
            // ✅ Store round result for draw resolution
            if (!room.game.roundResults) {
                room.game.roundResults = [];
            }
            
            const currentRound = room.game.roundResults.length + 1;
            room.game.roundResults.push({
                round: currentRound,
                winner: roundWinner ? roundWinner.team : null,
                winnerName: roundWinner ? roundWinner.name : null,
                isDraw: !roundWinner,
                cards: room.game.playedCards.map(pc => ({
                    name: pc.card.name,
                    value: pc.card.value,
                    player: pc.player.name,
                    team: pc.player.team
                }))
            });
            
            console.log(`📊 Round ${currentRound} result stored:`, room.game.roundResults[room.game.roundResults.length - 1]);
            
            // ✅ Check if a team has won enough rounds to win the game
            const roundsToWin = 2; // Best of 3 rounds
            let gameWinner = null;
            // ✅ Check for game winner (only if there's a clear round winner)
            if (roundWinner) {
            if (room.game.scores.team1 >= roundsToWin) {
                gameWinner = 'team1';
                console.log(`🎮 Team 1 wins the game!`);
            } else if (room.game.scores.team2 >= roundsToWin) {
                gameWinner = 'team2';
                console.log(`🎮 Team 2 wins the game!`);
                }
            } else {
                console.log(`🤝 Draw in round ${currentRound} - game continues to next round`);
            }
            
            // ✅ CRITICAL FIX: If game is won, handle game completion separately
            if (gameWinner) {
                console.log(`🎮 Game won by ${gameWinner}, handling game completion...`);
                console.log(`🔍 DEBUG: Entering game completion block for ${gameWinner}`);
                
                // ✅ CRITICAL FIX: Store last round winner for next game
                room.lastRoundWinner = roundWinner;
                console.log(`🎯 Stored last round winner for next game: ${roundWinner.name}`);
                
                // ✅ CRITICAL FIX: Increment games score for winning team
                if (!room.game.games) {
                    room.game.games = { team1: 0, team2: 0 };
                }
                if (gameWinner === 'team1') {
                    room.game.games.team1 += 1;
                    console.log(`🎮 Team 1 games increased to: ${room.game.games.team1}`);
                } else if (gameWinner === 'team2') {
                    room.game.games.team2 += 1;
                    console.log(`🎮 Team 2 games increased to: ${room.game.games.team2}`);
                }
                
                // Clear played cards immediately for game winner
                room.game.playedCards = [];
                
                // Emit game complete event instead of round complete
                console.log(`🔍 DEBUG: Emitting gameComplete event to room ${socket.roomCode}`);
                console.log(`🔍 DEBUG: gameComplete data:`, { roundWinner, scores: room.game.scores, games: room.game.games, gameWinner });
                io.to(socket.roomCode).emit('gameComplete', {
                    roundWinner: roundWinner,
                    scores: room.game.scores,
                    games: room.game.games,
                    gameWinner: gameWinner
                });
                console.log(`🔍 DEBUG: gameComplete event emitted successfully`);
                
                // Start new game after 5 seconds
                console.log(`SERVER: Scheduling new game start in 5 seconds for room ${socket.roomCode}. Game winner: ${gameWinner}`);
                console.log(`🔍 DEBUG: setTimeout scheduled for startNewGame`);
                setTimeout(() => {
                    console.log(`SERVER: Executing startNewGame for room ${socket.roomCode}`);
                    console.log(`🔍 DEBUG: setTimeout callback executed, calling startNewGame`);
                    startNewGame(room, gameWinner, socket.roomCode);
                }, 5000);
                
                return; // Don't continue with normal round logic
            }
            
            // ✅ CRITICAL FIX: Don't reset playedCards immediately for normal rounds
            // Keep them visible until the next round starts
            console.log(`🏁 Round complete - keeping ${room.game.playedCards.length} played cards visible`);
            
            // ✅ CRITICAL FIX: Reset all players' hasPlayedThisTurn flags for new round
            room.players.forEach(player => {
                if (player.isBot) {
                    player.hasPlayedThisTurn = false;
                }
            });
            
            // ✅ CRITICAL FIX: Reset bot played flags for new round
            if (room.game.botPlayedThisTurn) {
                room.game.botPlayedThisTurn.clear();
                console.log(`🔄 Reset bot played flags for new round`);
            }
            
            // ✅ CRITICAL FIX: Handle round completion (with or without winner)
            if (roundWinner) {
                // There's a clear winner - store for next round
                room.lastRoundWinner = roundWinner;
                console.log(`🎯 Stored round winner for next round: ${roundWinner.name}`);
                
                // ✅ CRITICAL DEBUG: Log all players and their indices for debugging
                console.log(`🔍 DEBUG: All players in room:`, room.players.map((p, i) => `${i}: ${p.name} (${p.isBot ? 'Bot' : 'Human'})`));
                console.log(`🔍 DEBUG: Round winner name: "${roundWinner.name}"`);
                console.log(`🔍 DEBUG: Round winner team: "${roundWinner.team}"`);
            
            // ✅ CRITICAL FIX: Round winner should start the next round
            // Find the player who won the round and set them as current player
            const roundWinnerPlayerIndex = room.players.findIndex(p => p.name === roundWinner.name);
                console.log(`🔍 DEBUG: Round winner player index search result: ${roundWinnerPlayerIndex}`);
                
            if (roundWinnerPlayerIndex !== -1) {
                room.game.currentPlayer = roundWinnerPlayerIndex;
                console.log(`🎯 Round winner ${roundWinner.name} will start next round at index ${roundWinnerPlayerIndex}`);
                    console.log(`🔍 DEBUG: Current player set to: ${room.game.currentPlayer} (${room.players[room.game.currentPlayer]?.name})`);
                    
                    // ✅ CRITICAL FIX: Ensure the round winner is properly set for the next round
                    console.log(`🔍 DEBUG: Round winner logic completed successfully`);
                    console.log(`🔍 DEBUG: Next round will start with: ${room.players[room.game.currentPlayer]?.name} (index ${room.game.currentPlayer})`);
            } else {
                console.log(`⚠️ Could not find round winner in players list, defaulting to next player`);
                    console.log(`⚠️ DEBUG: Available player names: [${room.players.map(p => `"${p.name}"`).join(', ')}]`);
                    console.log(`⚠️ DEBUG: Round winner name: "${roundWinner.name}"`);
                    console.log(`⚠️ DEBUG: This suggests a name mismatch between round winner and player list!`);
                room.game.currentPlayer = (room.game.currentPlayer + 1) % 4;
                }
            } else {
                // Draw - no winner yet, continue with current turn order
                console.log(`🤝 Draw - no round winner, continuing with current turn order`);
                console.log(`🔍 DEBUG: Current player remains: ${room.game.currentPlayer} (${room.players[room.game.currentPlayer]?.name})`);
                
                // For draws, we don't change the current player - the next player in turn order continues
                // This will be handled by the normal turn progression logic
            }
            
            // ✅ CRITICAL FIX: Ensure only one current player is set
            console.log(`🔍 DEBUG: Final current player set to: ${room.game.currentPlayer} (${room.players[room.game.currentPlayer]?.name})`);
            
            // ✅ CRITICAL FIX: If the round winner is a bot, ensure they can start the next round
            const nextRoundStarter = room.players[room.game.currentPlayer];
            if (nextRoundStarter && nextRoundStarter.isBot) {
                console.log(`🤖 Bot ${nextRoundStarter.name} will start next round - ensuring proper turn handling`);
                // Reset any bot flags that might prevent the bot from playing
                if (room.game.botPlayedThisTurn) {
                    room.game.botPlayedThisTurn.clear();
                    console.log(`🔄 Reset bot played flags for bot round starter`);
                }
                // Ensure the bot's hasPlayedThisTurn flag is reset
                nextRoundStarter.hasPlayedThisTurn = false;
                console.log(`🔄 Reset hasPlayedThisTurn for bot ${nextRoundStarter.name}`);
                
                // ✅ CRITICAL FIX: DON'T emit turnChanged here - wait for botTurnComplete to handle it
                // This prevents duplicate turnChanged events that cause Bot 4 to be skipped
                console.log(`🤖 Bot ${nextRoundStarter.name} will start next round - NOT emitting turnChanged, waiting for botTurnComplete`);
            }
            
            // ✅ CRITICAL FIX: Clear played cards BEFORE emitting roundComplete
            console.log(`🔄 Clearing played cards before round complete emission`);
            room.game.playedCards = [];
            
            // ✅ Emit round complete event with scoring information (NO gameWinner for normal rounds)
            console.log(`🔍 DEBUG: Emitting roundComplete with currentPlayer: ${room.game.currentPlayer} (${room.players[room.game.currentPlayer]?.name})`);
            io.to(socket.roomCode).emit('roundComplete', {
                currentPlayer: room.game.currentPlayer,
                allHands: room.game.hands,
                roundWinner: roundWinner,
                scores: room.game.scores,
                isDraw: !roundWinner
                // ✅ CRITICAL FIX: gameWinner is NOT sent with roundComplete
            });
            console.log(`✅ roundComplete event emitted with round winner: ${roundWinner ? roundWinner.name : 'Draw - no winner'} and currentPlayer: ${room.game.currentPlayer}`);
            
            // ✅ CRITICAL FIX: Only emit turnChanged immediately if the round winner is NOT a bot
            // If the round winner is a bot, wait for them to play their card first
            if (nextRoundStarter && !nextRoundStarter.isBot) {
                // Human player starts next round - emit turnChanged immediately
                console.log(`🔄 Human player ${nextRoundStarter.name} starts next round - emitting turnChanged immediately`);
                
                // ✅ UI FIX: Emit turnChanged immediately for round completion
                console.log(`🎯 Emitting turnChanged immediately for round completion`);
                
                // ✅ CRITICAL DEBUG: Track roundComplete turnChanged emission
                const timestamp = new Date().toISOString();
                console.log(`🔍 CRITICAL DEBUG: [${timestamp}] ROUND COMPLETE turnChanged emission for ${nextRoundStarter.name}`);
                console.log(`🔍 CRITICAL DEBUG: [${timestamp}] This turnChanged is for round completion`);
                
                io.to(socket.roomCode).emit('turnChanged', {
                    currentPlayer: room.game.currentPlayer,
                    allHands: room.game.hands
                });
                
                console.log(`🔍 CRITICAL DEBUG: [${timestamp}] ROUND COMPLETE turnChanged event COMPLETED`);
            } else if (nextRoundStarter && nextRoundStarter.isBot) {
                // Bot starts next round - DON'T emit turnChanged yet, wait for bot to play
                console.log(`🤖 Bot ${nextRoundStarter.name} starts next round - NOT emitting turnChanged yet, waiting for bot to play`);
                // The turnChanged will be emitted after the bot plays their card via botTurnComplete
            } else {
                console.log(`⚠️ WARNING: Could not determine next round starter`);
            }
            
            // ✅ CRITICAL FIX: Played cards already cleared before roundComplete emission
            // No need for delayed clearing as it's already done above
        } else {
                    // ✅ CRITICAL DEBUG: Log EXACTLY what type of player this is
        console.log(`🔍 CRITICAL DEBUG: Player type check for ${targetPlayer.name} (index ${clientPlayerIndex})`);
        console.log(`🔍 CRITICAL DEBUG: targetPlayer.isBot = ${targetPlayer.isBot}`);
        console.log(`🔍 CRITICAL DEBUG: targetPlayer object:`, JSON.stringify(targetPlayer, null, 2));
        console.log(`🔍 CRITICAL DEBUG: Room players array:`, room.players.map(p => ({ name: p.name, isBot: p.isBot, id: p.id })));
        
        // ✅ CRITICAL FIX: Handle turn progression based on player type
        if (targetPlayer.isBot) {
            // Bot player - don't move to next player immediately
            // The client-side bot logic needs to complete first
            console.log(`🔄 Bot ${targetPlayer.name} played card, waiting for turn completion`);
            
            // ✅ CRITICAL FIX: Don't emit turnChanged here - wait for botTurnComplete
            // This prevents multiple turnChanged events that confuse the bot logic
        } else {
            // Human player - move to next player immediately
            console.log(`🔄 Human player ${targetPlayer.name} played card, moving to next player`);
            console.log(`🔍 CRITICAL DEBUG: This should NOT happen for bots! If ${targetPlayer.name} is a bot, this is a BUG!`);
            
            // ✅ CRITICAL FIX: Use team-based alternating turn order for human players too
            const previousPlayer = room.game.currentPlayer;
            room.game.currentPlayer = getNextPlayerFromOppositeTeam(room.players, room.game.currentPlayer);
            console.log(`🎯 Human turn order: ${room.players[previousPlayer]?.team} → ${room.players[room.game.currentPlayer]?.team}`);
            
            // ✅ UI FIX: Emit turnChanged immediately for human player progression
            console.log(`🎯 Emitting turnChanged immediately for human player progression`);
            
            // ✅ CRITICAL DEBUG: Track human player turnChanged emission
            const timestamp = new Date().toISOString();
            console.log(`🔍 CRITICAL DEBUG: [${timestamp}] HUMAN PLAYER turnChanged emission for ${targetPlayer.name}`);
            console.log(`🔍 CRITICAL DEBUG: [${timestamp}] This turnChanged is for human player progression`);
            
            // Emit turn change event with the new current player IMMEDIATELY
            io.to(socket.roomCode).emit('turnChanged', {
                currentPlayer: room.game.currentPlayer,
                allHands: room.game.hands
            });
            
            console.log(`🔍 CRITICAL DEBUG: [${timestamp}] HUMAN PLAYER turnChanged event COMPLETED`);
        }
        }

        console.log(`✅ Card played event emitted for user ${socket.id} in room ${socket.roomCode}`);
    });

    // ✅ TEST: Handle test events to verify socket connection
    socket.on('testEvent', (data) => {
        console.log(`🧪 TEST EVENT received from socket ${socket.id}:`, data);
        // Send a response back to the client
        socket.emit('testResponse', { message: 'Server received your test event', timestamp: new Date().toISOString() });
    });

    // ✅ CRITICAL FIX: Handle bot turn completion to move to next player
    socket.on('botTurnComplete', (data) => {
        console.log(`🤖 Bot turn complete in room: ${socket.roomCode}`);
        console.log(`🔍 DEBUG: botTurnComplete event received from socket ${socket.id}`);
        console.log(`🔍 DEBUG: botTurnComplete data:`, data);
        
        if (!socket.roomCode) {
            console.log(`❌ User ${socket.id} not in a room`);
            return;
        }
        
        const room = rooms.get(socket.roomCode);
        if (!room || !room.game) {
            console.log(`❌ Room or game not found for bot turn completion`);
            return;
        }
        
        // ✅ CRITICAL FIX: Rate limiting to prevent duplicate botTurnComplete events
        const now = Date.now();
        const lastBotTurnComplete = room.game.lastBotTurnComplete || 0;
        const timeSinceLastTurn = now - lastBotTurnComplete;
        
        if (timeSinceLastTurn < 500) { // 500ms rate limit
            console.log(`⚠️ botTurnComplete rate limited - too soon (${timeSinceLastTurn}ms since last)`);
            return;
        }
        
        room.game.lastBotTurnComplete = now;
        
        // ✅ Move to next player after bot turn is complete
        const previousPlayer = room.game.currentPlayer;
        
        // ✅ CRITICAL FIX: Use team-based alternating turn order
        const newPlayer = getNextPlayerFromOppositeTeam(room.players, room.game.currentPlayer);
        
        // ✅ CRITICAL FIX: Prevent duplicate turnChanged events for the same player
        if (room.game.currentPlayer === newPlayer) {
            console.log(`⚠️ Duplicate botTurnComplete for same player ${newPlayer} - ignoring to prevent loop`);
            return;
        }
        
        room.game.currentPlayer = newPlayer;
        console.log(`🔄 Bot turn complete - moved from player ${previousPlayer} (${room.players[previousPlayer]?.name}) to player ${room.game.currentPlayer} (${room.players[room.game.currentPlayer]?.name})`);
        console.log(`🎯 Turn order: ${room.players[previousPlayer]?.team} → ${room.players[room.game.currentPlayer]?.team}`);
        
        // ✅ CRITICAL FIX: Reset bot played flags for new turn
        if (room.game.botPlayedThisTurn) {
            room.game.botPlayedThisTurn.clear();
            console.log(`🔄 Reset bot played flags for new turn`);
        }
        
        // ✅ CRITICAL TEST: Send a test event first
        console.log(`🧪 TEST: Sending testTurnChanged event to room ${socket.roomCode}`);
        io.to(socket.roomCode).emit('testTurnChanged', {
            message: 'Test event from server',
            currentPlayer: room.game.currentPlayer
        });

        // ✅ UI FIX: Emit turnChanged immediately for UI updates, then add pacing for next turn
        console.log(`🎯 Emitting turnChanged immediately for UI updates`);

        // ✅ CRITICAL DEBUG: Log EXACTLY when botTurnComplete emits turnChanged
        console.log(`🔍 CRITICAL DEBUG: botTurnComplete emitting turnChanged event!`);
        console.log(`🔍 CRITICAL DEBUG: This should be the ONLY source of turnChanged for bot turns!`);
        console.log(`🔍 CRITICAL DEBUG: Current player set to: ${room.game.currentPlayer} (${room.players[room.game.currentPlayer]?.name})`);
        console.log(`🔍 CRITICAL DEBUG: If you see another turnChanged after this, it's a BUG!`);
        
        // ✅ CRITICAL DEBUG: Add timestamp to track event order
        const timestamp = new Date().toISOString();
        console.log(`🔍 CRITICAL DEBUG: [${timestamp}] botTurnComplete turnChanged event timestamp`);
        
        // ✅ PACING FIX: Add delay for visual pacing while maintaining game flow
        console.log(`🎯 Adding 1-second delay for visual pacing`);
        
        setTimeout(() => {
        // Emit turn change event with the new current player
        console.log(`🔍 DEBUG: Emitting turnChanged event with currentPlayer: ${room.game.currentPlayer} (${room.players[room.game.currentPlayer]?.name})`);
        console.log(`🔍 DEBUG: turnChanged event will be sent to room: ${socket.roomCode}`);
        io.to(socket.roomCode).emit('turnChanged', {
            currentPlayer: room.game.currentPlayer,
            allHands: room.game.hands
        });
        console.log(`✅ turnChanged event emitted successfully to room ${socket.roomCode}`);
        console.log(`🔍 CRITICAL DEBUG: [${timestamp}] botTurnComplete turnChanged event COMPLETED`);
        }, 1000); // 1-second delay for visual pacing
    });

    // ✅ Handle Truco requests with proper game logic
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

        // ✅ Initialize Truco state if not already set
        if (!room.game.trucoState) {
            room.game.trucoState = {
                isActive: false,
                currentValue: 1,
                potentialValue: 3,
                callerTeam: null,
                callerIndex: null,
                waitingForResponse: false,
                responsePlayerIndex: null
            };
        }

        // ✅ Check if Truco is already active
        if (room.game.trucoState.isActive) {
            console.log(`❌ Truco is already active in room ${socket.roomCode}`);
            socket.emit('error', 'Truco already active');
            return;
        }

        // ✅ Start Truco
        room.game.trucoState.isActive = true;
        room.game.trucoState.currentValue = 1;
        room.game.trucoState.potentialValue = 3;
        room.game.trucoState.callerTeam = player.team;
        room.game.trucoState.callerIndex = playerIndex;
        room.game.trucoState.waitingForResponse = true;

        // ✅ Find next player from opposite team for response
        const nextPlayerIndex = getNextPlayerFromOppositeTeam(room.players, playerIndex);
        room.game.trucoState.responsePlayerIndex = nextPlayerIndex;

        console.log(`🎯 Truco called by ${player.name} (${player.team}) for 3 games`);
        console.log(`🎯 Next player to respond: ${room.players[nextPlayerIndex].name} (${room.players[nextPlayerIndex].team})`);

        // ✅ Emit Truco called event to all players
        io.to(socket.roomCode).emit('trucoCalled', {
            caller: socket.id,
            callerName: player.name,
            callerTeam: player.team,
            currentValue: room.game.trucoState.currentValue,
            potentialValue: room.game.trucoState.potentialValue,
            responsePlayerIndex: nextPlayerIndex,
            responsePlayerName: room.players[nextPlayerIndex].name,
            roomCode: socket.roomCode
        });

        console.log(`✅ Truco called event emitted for user ${socket.id} in room ${socket.roomCode}`);
    });

    // ✅ Handle Truco responses (accept, reject, raise)
    socket.on('respondTruco', (data) => {
        console.log(`🎯 Truco response received in room: ${socket.roomCode}`, data);
        
        if (!socket.roomCode) {
            console.log(`❌ User ${socket.id} not in a room`);
            socket.emit('error', 'Not in a room');
            return;
        }
        
        const room = rooms.get(socket.roomCode);
        if (!room || !room.game || !room.game.trucoState) {
            console.log(`❌ No active Truco in room ${socket.roomCode}`);
            socket.emit('error', 'No active Truco');
            return;
        }

        // ✅ Validate it's the response player's turn
        const player = room.players.find(p => p.id === socket.id);
        if (!player) {
            console.log(`❌ Player ${socket.id} not found in room`);
            socket.emit('error', 'Player not found in room');
            return;
        }

        const playerIndex = room.players.indexOf(player);
        
        // ✅ CRITICAL FIX: Check if Truco is still waiting for response
        if (!room.game.trucoState.waitingForResponse) {
            console.log(`❌ Truco is not waiting for response`);
            socket.emit('error', 'Truco is not waiting for response');
            return;
        }
        
        if (room.game.trucoState.responsePlayerIndex !== playerIndex) {
            console.log(`❌ Player ${player.name} tried to respond to Truco out of turn`);
            console.log(`❌ Expected response player index: ${room.game.trucoState.responsePlayerIndex}, got: ${playerIndex}`);
            socket.emit('error', 'Not your turn to respond');
            return;
        }

        const response = data.response; // 1 = accept, 2 = reject, 3 = raise
        console.log(`🎯 ${player.name} responded to Truco: ${response === 1 ? 'Accept' : response === 2 ? 'Reject' : 'Raise'}`);

        if (response === 1) {
            // ✅ Accept Truco
            room.game.trucoState.currentValue = room.game.trucoState.potentialValue;
            room.game.trucoState.isActive = false;
            room.game.trucoState.waitingForResponse = false;
            room.game.trucoState.responsePlayerIndex = null; // ✅ CRITICAL FIX: Clear response player

            console.log(`✅ Truco accepted! Game value increased to ${room.game.trucoState.currentValue}`);

            // ✅ Emit Truco accepted event
            io.to(socket.roomCode).emit('trucoAccepted', {
                accepter: socket.id,
                accepterName: player.name,
                newValue: room.game.trucoState.currentValue,
                roomCode: socket.roomCode
            });

        } else if (response === 2) {
            // ✅ Reject Truco
            const winningTeam = room.game.trucoState.callerTeam;
            const winningTeamName = winningTeam === 'team1' ? 'Team Alfa' : 'Team Beta';
            
            console.log(`❌ Truco rejected! ${winningTeamName} wins with ${room.game.trucoState.currentValue} games`);

            // ✅ Reset Truco state
            room.game.trucoState.isActive = false;
            room.game.trucoState.waitingForResponse = false;
            room.game.trucoState.responsePlayerIndex = null; // ✅ CRITICAL FIX: Clear response player

            // ✅ Emit Truco rejected event
            io.to(socket.roomCode).emit('trucoRejected', {
                rejecter: socket.id,
                rejecterName: player.name,
                winningTeam: winningTeam,
                winningTeamName: winningTeamName,
                gameValue: room.game.trucoState.currentValue,
                roomCode: socket.roomCode
            });

        } else if (response === 3) {
            // ✅ Raise Truco
            if (room.game.trucoState.potentialValue >= 12) {
                console.log(`❌ Cannot raise beyond 12 games`);
                socket.emit('error', 'Cannot raise beyond 12 games');
                return;
            }

            // ✅ Increase potential value
            if (room.game.trucoState.potentialValue === 3) {
                room.game.trucoState.potentialValue = 6;
            } else if (room.game.trucoState.potentialValue === 6) {
                room.game.trucoState.potentialValue = 9;
            } else if (room.game.trucoState.potentialValue === 9) {
                room.game.trucoState.potentialValue = 12;
            }

            // ✅ Find next player from opposite team for response
            // In Truco, when someone raises, the next player from the opposite team responds
            const raiserTeam = player.team;
            let nextPlayerIndex = -1;
            
            // Find the next player from the opposite team (not the raiser's team)
            for (let i = 1; i < 4; i++) {
                const checkIndex = (playerIndex + i) % 4;
                if (room.players[checkIndex].team !== raiserTeam) {
                    nextPlayerIndex = checkIndex;
                    break;
                }
            }
            
            // Fallback: if no opposite team player found, use the original caller
            if (nextPlayerIndex === -1) {
                nextPlayerIndex = room.game.trucoState.callerIndex;
            }
            
            room.game.trucoState.responsePlayerIndex = nextPlayerIndex;

            console.log(`📈 Truco raised to ${room.game.trucoState.potentialValue} games`);
            console.log(`🎯 Next player to respond: ${room.players[nextPlayerIndex].name} (${room.players[nextPlayerIndex].team})`);

            // ✅ Emit Truco raised event
            io.to(socket.roomCode).emit('trucoRaised', {
                raiser: socket.id,
                raiserName: player.name,
                raiserTeam: player.team,
                newPotentialValue: room.game.trucoState.potentialValue,
                responsePlayerIndex: nextPlayerIndex,
                responsePlayerName: room.players[nextPlayerIndex].name,
                roomCode: socket.roomCode
            });
        }

        console.log(`✅ Truco response processed for user ${socket.id} in room ${socket.roomCode}`);
    });

    // ✅ Handle manual new game request (fallback mechanism)
    socket.on('requestNewGame', (data) => {
        console.log(`🎮 Manual new game request received for room: ${data.roomCode}`);
        
        if (!data.roomCode) {
            console.log(`❌ No room code provided for manual new game request`);
            return;
        }
        
        const room = rooms.get(data.roomCode);
        if (!room) {
            console.log(`❌ Room ${data.roomCode} not found for manual new game request`);
            return;
        }
        
        console.log(`🎮 Executing manual startNewGame for room ${data.roomCode}`);
        startNewGame(room, 'manual', data.roomCode);
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

// ✅ CRITICAL FIX: Function to get next player from opposite team for balanced turn order
function getNextPlayerFromOppositeTeam(players, currentPlayerIndex) {
    const currentPlayer = players[currentPlayerIndex];
    const currentTeam = currentPlayer.team;
    
    console.log(`🔄 Finding next player from opposite team. Current: ${currentPlayer.name} (${currentTeam}) at index ${currentPlayerIndex}`);
    console.log(`🔍 DEBUG: All players:`, players.map((p, i) => `${i}: ${p.name} (${p.team})`));
    
    // Find the next player from the opposite team
    for (let i = 1; i < 4; i++) {
        const nextIndex = (currentPlayerIndex + i) % 4;
        const nextPlayer = players[nextIndex];
        
        console.log(`🔍 DEBUG: Checking index ${nextIndex}: ${nextPlayer.name} (${nextPlayer.team})`);
        
        if (nextPlayer.team !== currentTeam) {
            console.log(`🎯 Next player from opposite team: ${nextPlayer.name} (${nextPlayer.team}) at index ${nextIndex}`);
            return nextIndex;
        }
    }
    
    // Fallback: if no opposite team player found, move to next player
    console.log(`⚠️ No opposite team player found, moving to next player`);
    return (currentPlayerIndex + 1) % 4;
}

function createDeck() {
    try {
        console.log(`🔍 createDeck function started`);
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const values = ['ace', '2', '3', '4', '5', '6', '7', 'jack', 'queen', 'king'];
        const deck = [];
        
        console.log(`🔍 Suits:`, suits);
        console.log(`🔍 Values:`, values);
        
        // ✅ CRITICAL FIX: Card values mapping for Brazilian Truco - EXACT match with client
        // This function will determine the correct value based on both suit and value
        function getCardValue(value, suit) {
            // Top 7 most powerful cards (special Truco cards)
            if (value === 'queen' && suit === 'diamonds') return 1;      // Queen of diamonds
            if (value === 'jack' && suit === 'clubs') return 2;          // Jack of clubs
            if (value === '5' && suit === 'clubs') return 3;             // 5 of clubs
            if (value === '4' && suit === 'clubs') return 4;             // 4 of clubs
            if (value === '7' && suit === 'hearts') return 5;            // 7 of hearts
            if (value === 'ace' && suit === 'spades') return 6;          // Ace of spades
            if (value === '7' && suit === 'diamonds') return 7;          // 7 of diamonds
            
            // All three's - Eighth most powerful
            if (value === '3') return 8;
            
            // All two's - Ninth most powerful
            if (value === '2') return 9;
            
            // Standard card power (remaining cards)
            if (value === 'ace') return 10;    // Other aces
            if (value === 'king') return 11;   // All kings
            if (value === 'queen') return 12;  // Other queens
            if (value === 'jack') return 13;   // Other jacks
            if (value === '7') return 14;      // Other 7s
            if (value === '6') return 15;      // All 6s
            if (value === '5') return 16;      // Other 5s
            if (value === '4') return 17;      // Other 4s
            
            return 20; // Default fallback
        }
        
        console.log(`🔍 Card value function created`);
        
        for (const suit of suits) {
            for (const value of values) {
                console.log(`🔍 Processing card: ${value} of ${suit}`);
                // ✅ Create cards with the exact format the client expects
                const cardName = `${value.charAt(0).toUpperCase() + value.slice(1)} of ${suit}`;
                const cardValue = getCardValue(value, suit);
                
                console.log(`🔍 Card name: ${cardName}, value: ${cardValue}`);
                
                deck.push({ 
                    suit: suit, 
                    value: cardValue, // ✅ Use proper card power values
                    name: cardName,  // ✅ Use proper capitalized format: "Ace of diamonds"
                    isClickable: false  // ✅ Add isClickable property
                });
            }
        }
        
        console.log(`🔍 Deck created with ${deck.length} cards`);
        
        // Shuffle the deck
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        
        console.log(`🎴 Server created deck with ${deck.length} cards`);
        console.log(`🎯 Sample cards:`, deck.slice(0, 3).map(c => ({ name: c.name, value: c.value })));
        
        return deck;
    } catch (error) {
        console.error(`❌ ERROR in createDeck:`, error);
        console.error(`❌ Error stack:`, error.stack);
        throw error;
    }
}

function dealCards(deck) {
    try {
        console.log(`🔍 dealCards function started with deck of ${deck.length} cards`);
        
        if (!deck || !Array.isArray(deck) || deck.length < 12) {
            throw new Error(`Invalid deck: expected at least 12 cards, got ${deck?.length || 0}`);
        }
        
        const hands = [[], [], [], []];
        
        // Deal 3 cards to each player
        for (let i = 0; i < 12; i++) {
            const playerIndex = i % 4;
            const card = deck[i];
            
            if (!card) {
                throw new Error(`Missing card at index ${i}`);
            }
            
            hands[playerIndex].push(card);
            console.log(`🔍 Dealt ${card.name} to player ${playerIndex}`);
        }
        
        console.log(`🔍 Cards dealt successfully:`, hands.map((hand, i) => `Player ${i}: ${hand.length} cards`));
        return hands;
    } catch (error) {
        console.error(`❌ ERROR in dealCards:`, error);
        console.error(`❌ Error stack:`, error.stack);
        throw error;
    }
}

// ✅ CRITICAL FIX: Function to determine round winner based on Brazilian Truco rules
function determineRoundWinner(playedCards, room) {
    console.log(`🏆 Determining round winner from ${playedCards.length} played cards`);

    if (!playedCards || playedCards.length !== 4) {
        console.error(`❌ Invalid playedCards for round winner determination:`, playedCards);
        return null;
    }

    // Find the highest value card (lowest number = highest power in Brazilian Truco)
    let highestCard = null;
    let highestValue = Infinity;
    let drawCards = [];

    playedCards.forEach((playedCard, index) => {
        const card = playedCard.card;
        const player = playedCard.player;

        console.log(`🏆 Card ${index}: ${card.name} (value: ${card.value}) played by ${player.name}`);

        if (card.value < highestValue) {
            highestValue = card.value;
            highestCard = {
                name: player.name,
                team: player.team,
                card: card.name,
                value: card.value
            };
            drawCards = [playedCard]; // Reset draw cards
            console.log(`🏆 New highest card: ${card.name} (${card.value}) by ${player.name}`);
        } else if (card.value === highestValue) {
            // Draw detected
            drawCards.push(playedCard);
            console.log(`🤝 Draw detected: ${card.name} (${card.value}) by ${player.name} ties with ${highestCard.card}`);
        }
    });

    // Check if there's a draw
    if (drawCards.length > 1) {
        console.log(`🤝 DRAW DETECTED: ${drawCards.length} cards with value ${highestValue}`);
        
        // Apply Truco draw rules
        const currentRound = (room.game.roundResults ? room.game.roundResults.length : 0) + 1;
        console.log(`🔍 Current round: ${currentRound}`);
        
        let drawWinner = null;
        
        if (currentRound === 1) {
            // First round draw: winner will be determined by next round
            console.log(`🤝 First round draw - winner will be determined by next round`);
            drawWinner = null; // No winner yet
        } else if (currentRound === 2) {
            // Second round draw: winner is the team that won round 1
            if (room.game.roundResults && room.game.roundResults.length > 0) {
                const firstRoundWinner = room.game.roundResults[0].winner;
                if (firstRoundWinner) {
                    // Find a player from the winning team
                    const winningTeamPlayer = room.players.find(p => p.team === firstRoundWinner);
                    if (winningTeamPlayer) {
                        drawWinner = {
                            name: winningTeamPlayer.name,
                            team: firstRoundWinner,
                            card: 'Draw Resolution',
                            value: highestValue,
                            isDrawResolution: true
                        };
                        console.log(`🤝 Second round draw resolved: ${firstRoundWinner} wins due to first round victory`);
                    }
                }
            }
            
            if (!drawWinner) {
                console.log(`⚠️ Could not resolve second round draw - no first round winner found`);
                drawWinner = null;
            }
        } else if (currentRound === 3) {
            // Third round draw: check previous rounds
            if (room.game.roundResults && room.game.roundResults.length >= 2) {
                const firstRound = room.game.roundResults[0];
                const secondRound = room.game.roundResults[1];
                
                if (firstRound.isDraw && secondRound.isDraw) {
                    // Both first and second rounds were draws - winner of third round wins the game
                    console.log(`🤝 Third round draw - but first and second rounds were also draws, so this round determines winner`);
                    drawWinner = null; // Let the third round winner be determined normally (no draw resolution needed)
                } else if (firstRound.isDraw && !secondRound.isDraw) {
                    // First round was draw, second round had winner - second round winner wins
                    const secondRoundWinner = secondRound.winner;
                    if (secondRoundWinner) {
                        const winningTeamPlayer = room.players.find(p => p.team === secondRoundWinner);
                        if (winningTeamPlayer) {
                            drawWinner = {
                                name: winningTeamPlayer.name,
                                team: secondRoundWinner,
                                card: 'Draw Resolution',
                                value: highestValue,
                                isDrawResolution: true
                            };
                            console.log(`🤝 Third round draw resolved: ${secondRoundWinner} wins due to second round victory (first round was draw)`);
                        }
                    }
                } else if (!firstRound.isDraw) {
                    // First round had winner, third round draw - first round winner wins
                    const firstRoundWinner = firstRound.winner;
                    if (firstRoundWinner) {
                        const winningTeamPlayer = room.players.find(p => p.team === firstRoundWinner);
                        if (winningTeamPlayer) {
                            drawWinner = {
                                name: winningTeamPlayer.name,
                                team: firstRoundWinner,
                                card: 'Draw Resolution',
                                value: highestValue,
                                isDrawResolution: true
                            };
                            console.log(`🤝 Third round draw resolved: ${firstRoundWinner} wins due to first round victory`);
                        }
                    }
                }
            }
            
            if (!drawWinner) {
                console.log(`⚠️ Could not resolve third round draw`);
                drawWinner = null;
            }
        }
        
        return drawWinner;
    } else {
        // No draw - clear winner
    console.log(`🏆 Round winner determined: ${highestCard.name} with ${highestCard.card} (value: ${highestCard.value})`);
    return highestCard;
    }
}

// ✅ CRITICAL FIX: Function to start a new game after a team wins
function startNewGame(room, winningTeam, roomId) {
    console.log(`🎮 Starting new game in room: ${roomId} after ${winningTeam} won`);
    
    try {
        // ✅ CRITICAL FIX: Preserve games score, only reset round scores
        if (!room.game.games) {
            room.game.games = { team1: 0, team2: 0 };
        }
        // Keep games score, only reset round scores for new game
        room.game.scores = { team1: 0, team2: 0 };
        console.log(`🔄 Reset round scores for new game, games score preserved: Team 1: ${room.game.games.team1}, Team 2: ${room.game.games.team2}`);
        
        // Clear played cards
        room.game.playedCards = [];
        console.log(`🔄 Cleared played cards`);
        
        // Reset all players' hasPlayedThisTurn flags
        room.players.forEach(player => {
            if (player.isBot) {
                player.hasPlayedThisTurn = false;
            }
        });
        console.log(`🔄 Reset player turn flags`);
        
        // Create new deck and deal cards
        const deck = createDeck();
        const hands = dealCards(deck);
        
        // Update game state
        room.game.hands = hands;
        
        // ✅ CRITICAL FIX: Winner of last round starts next game (not first game)
        // Find the player who won the last round and set them as current player
        let startingPlayerIndex = 0; // Default to first player for first game
        
        console.log(`🔍 DEBUG: Checking for last round winner in startNewGame`);
        console.log(`🔍 DEBUG: room.lastRoundWinner:`, room.lastRoundWinner);
        console.log(`🔍 DEBUG: room.players:`, room.players.map(p => ({ name: p.name, id: p.id })));
        
        // Look for the last round winner in the room's game state
        if (room.lastRoundWinner) {
            console.log(`🔍 DEBUG: Found lastRoundWinner:`, room.lastRoundWinner);
            console.log(`🔍 DEBUG: All players in room for new game:`, room.players.map((p, i) => `${i}: ${p.name} (${p.isBot ? 'Bot' : 'Human'})`));
            console.log(`🔍 DEBUG: Looking for winner name: "${room.lastRoundWinner.name}"`);
            
            const winnerPlayerIndex = room.players.findIndex(p => p.name === room.lastRoundWinner.name);
            console.log(`🔍 DEBUG: Winner player index found:`, winnerPlayerIndex);
            
            if (winnerPlayerIndex !== -1) {
                startingPlayerIndex = winnerPlayerIndex;
                console.log(`🎯 Winner of last round (${room.lastRoundWinner.name}) will start next game at index ${startingPlayerIndex}`);
                console.log(`🔍 DEBUG: Starting player will be: ${room.players[startingPlayerIndex]?.name}`);
                
                // ✅ CRITICAL FIX: Ensure the round winner is properly set for the new game
                console.log(`🔍 DEBUG: New game round winner logic completed successfully`);
                console.log(`🔍 DEBUG: New game will start with: ${room.players[startingPlayerIndex]?.name} (index ${startingPlayerIndex})`);
            } else {
                console.log(`⚠️ Could not find last round winner in players list, defaulting to index 0`);
                console.log(`⚠️ DEBUG: Player names in room:`, room.players.map(p => p.name));
                console.log(`⚠️ DEBUG: Last round winner name:`, room.lastRoundWinner.name);
                console.log(`⚠️ DEBUG: This suggests a name mismatch between round winner and player list!`);
                console.log(`⚠️ DEBUG: This is a CRITICAL ISSUE that needs to be fixed!`);
            }
        } else {
            console.log(`ℹ️ No last round winner found, defaulting to index 0`);
            console.log(`🔍 DEBUG: This might be the first game or round winner was not stored correctly`);
        }
        
        console.log(`🔍 DEBUG: Final starting player index:`, startingPlayerIndex);
        console.log(`🔍 DEBUG: Starting player will be:`, room.players[startingPlayerIndex]?.name || 'Unknown');
        
        // ✅ CRITICAL FIX: Ensure starting player index is valid
        if (startingPlayerIndex < 0 || startingPlayerIndex >= room.players.length) {
            console.log(`⚠️ Invalid starting player index: ${startingPlayerIndex}, defaulting to 0`);
            startingPlayerIndex = 0;
        }
        
        room.game.currentPlayer = startingPlayerIndex;
        room.game.playedCards = [];
        
        console.log(`🔍 DEBUG: Final starting player index validated: ${startingPlayerIndex} (${room.players[startingPlayerIndex]?.name})`);
        
        // Update player hands
        room.players.forEach((player, index) => {
            player.hand = hands[index];
        });
        
        console.log(`🔄 New game started with fresh deck and hands`);
        
        // Emit new game started event with both scores and games
        console.log(`SERVER: Emitting 'newGameStarted' for room ${roomId} with scores:`, room.game.scores, 'and games:', room.game.games);
        io.to(roomId).emit('newGameStarted', {
            currentPlayer: room.game.currentPlayer,
            allHands: room.game.hands,
            scores: room.game.scores,
            games: room.game.games
        });
        
    } catch (error) {
        console.error(`❌ Error starting new game:`, error);
    }
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