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
                isBot: false
            }],
            game: null
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
                currentPlayer: 0,
                playedCards: [], // ✅ Clear played cards when starting new game
                scores: { team1: 0, team2: 0 }
            };
            
            console.log(`✅ Game state initialized successfully for room ${roomCode}`);
            console.log(`🔍 DEBUG: Initial game starting with Player 1 (index 0):`, room.players[0]?.name || 'Unknown');

            // ✅ Emit gameStart event with hands to all players in the room
            console.log(`🔍 Emitting gameStart event to room: ${roomCode}`);
            console.log(`🔍 Room players:`, room.players.map(p => ({ id: p.id, name: p.name })));
            
            io.to(roomCode).emit('gameStart', {
                players: room.players,
                hands: hands,
                currentPlayer: 0
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
        
        // ✅ CRITICAL FIX: Validate that the client's playerIndex matches the current player
        // This ensures the correct player (including bots) is playing on their turn
        if (room.game.currentPlayer !== clientPlayerIndex) {
            console.log(`❌ Player ${player.name} tried to play out of turn. Current: ${room.game.currentPlayer}, Client sent: ${clientPlayerIndex}`);
            socket.emit('error', 'Not your turn');
            return;
        }
        
        // ✅ CRITICAL FIX: Validate that the player making the request is the correct player
        // For bots, the client (human player) is acting on behalf of the bot
        const currentPlayer = room.players[clientPlayerIndex];
        if (!currentPlayer) {
            console.log(`❌ Invalid player index: ${clientPlayerIndex}`);
            socket.emit('error', 'Invalid player');
            return;
        }
        
        // ✅ CRITICAL FIX: Prevent bots from playing multiple cards in one turn
        if (currentPlayer.isBot) {
            // Check if this bot has already played a card this turn
            // Use a more robust check that looks at the current turn state
            const botPlayedThisTurn = room.game.playedCards.some(pc => 
                pc.playerIndex === clientPlayerIndex
            );
            
            if (botPlayedThisTurn) {
                console.log(`❌ Bot ${currentPlayer.name} already played a card this turn - ignoring duplicate play`);
                socket.emit('error', 'Bot already played this turn');
                return;
            }
            
            // ✅ CRITICAL FIX: Mark bot as having played this turn to prevent future duplicate plays
            if (!room.game.botPlayedThisTurn) {
                room.game.botPlayedThisTurn = new Set();
            }
            room.game.botPlayedThisTurn.add(clientPlayerIndex);
        }
        
        console.log(`✅ Turn validation passed: ${currentPlayer.name} (${clientPlayerIndex}) is playing on their turn`);

        // ✅ Get the card from the player's hand
        const cardIndex = data.cardIndex || 0;
        
        console.log(`🃏 Client playerIndex: ${clientPlayerIndex}, Server playerIndex: ${playerIndex}`);
        
        if (!room.game.hands || !room.game.hands[clientPlayerIndex]) {
            console.log(`❌ No hands found for player ${currentPlayer.name} at index ${clientPlayerIndex}`);
            socket.emit('error', 'Invalid game state');
            return;
        }

        const playerHand = room.game.hands[clientPlayerIndex];
        if (cardIndex < 0 || cardIndex >= playerHand.length) {
            console.log(`❌ Invalid card index ${cardIndex} for player ${currentPlayer.name}. Hand size: ${playerHand.length}`);
            socket.emit('error', 'Invalid card index');
            return;
        }

        const playedCard = playerHand[cardIndex];
        
        // ✅ Remove card from hand
        playerHand.splice(cardIndex, 1);
        
        // ✅ Add to played cards
        if (!room.game.playedCards) room.game.playedCards = [];
        room.game.playedCards.push({
            player: currentPlayer, // ✅ Use currentPlayer for consistency
            card: playedCard,
            playerIndex: clientPlayerIndex
        });

        console.log(`✅ ${currentPlayer.name} played ${playedCard.name} in room ${socket.roomCode}`);

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
            playerId: currentPlayer.id, // ✅ Use currentPlayer.id for bots
            playerName: currentPlayer.name, // ✅ Use currentPlayer.name for bots
            cardIndex: cardIndex,
            card: playedCard,
            playerIndex: clientPlayerIndex,
            allHands: room.game.hands, // Send updated hands to all players
            playedCards: cleanPlayedCards // Send clean, serializable played cards
        });

        // ✅ Check if round is complete
        if (room.game.playedCards.length === 4) {
            console.log(`🏁 Round complete in room ${socket.roomCode}`);
            
            // ✅ CRITICAL FIX: Implement proper scoring logic
            const roundWinner = determineRoundWinner(room.game.playedCards);
            console.log(`🏆 Round winner: ${roundWinner.name} (${roundWinner.team})`);
            
            // ✅ Update team scores based on round winner
            if (roundWinner.team === 'team1') {
                room.game.scores.team1 += 1;
                console.log(`🏆 Team 1 score increased to: ${room.game.scores.team1}`);
            } else if (roundWinner.team === 'team2') {
                room.game.scores.team2 += 1;
                console.log(`🏆 Team 2 score increased to: ${room.game.scores.team2}`);
            }
            
            // ✅ Check if a team has won enough rounds to win the game
            const roundsToWin = 2; // Best of 3 rounds
            let gameWinner = null;
            console.log(`🔍 DEBUG: Checking for game winner. Current scores: Team1=${room.game.scores.team1}, Team2=${room.game.scores.team2}, Rounds to win=${roundsToWin}`);
            if (room.game.scores.team1 >= roundsToWin) {
                gameWinner = 'team1';
                console.log(`🎮 Team 1 wins the game!`);
            } else if (room.game.scores.team2 >= roundsToWin) {
                gameWinner = 'team2';
                console.log(`🎮 Team 2 wins the game!`);
            }
            console.log(`🔍 DEBUG: Game winner determined: ${gameWinner}`);
            
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
            
            // ✅ CRITICAL FIX: Round winner should start the next round
            // Find the player who won the round and set them as current player
            const roundWinnerPlayerIndex = room.players.findIndex(p => p.name === roundWinner.name);
            if (roundWinnerPlayerIndex !== -1) {
                room.game.currentPlayer = roundWinnerPlayerIndex;
                console.log(`🎯 Round winner ${roundWinner.name} will start next round at index ${roundWinnerPlayerIndex}`);
            } else {
                console.log(`⚠️ Could not find round winner in players list, defaulting to next player`);
                room.game.currentPlayer = (room.game.currentPlayer + 1) % 4;
            }
            
            // ✅ Emit round complete event with scoring information (NO gameWinner for normal rounds)
            io.to(socket.roomCode).emit('roundComplete', {
                currentPlayer: room.game.currentPlayer,
                allHands: room.game.hands,
                roundWinner: roundWinner,
                scores: room.game.scores
                // ✅ CRITICAL FIX: gameWinner is NOT sent with roundComplete
            });
            
            // ✅ CRITICAL FIX: Clear played cards after a delay to allow them to be visible
            setTimeout(() => {
                if (room.game && room.game.playedCards) {
                    console.log(`🏁 Clearing played cards after round completion delay`);
                    room.game.playedCards = [];
                }
            }, 3000); // 3 second delay to show the round results
        } else {
            // ✅ CRITICAL FIX: Handle turn progression based on player type
            if (currentPlayer.isBot) {
                // Bot player - don't move to next player immediately
                // The client-side bot logic needs to complete first
                console.log(`🔄 Bot ${currentPlayer.name} played card, waiting for turn completion`);
                
                // ✅ CRITICAL FIX: Don't emit turnChanged here - wait for botTurnComplete
                // This prevents multiple turnChanged events that confuse the bot logic
            } else {
                // Human player - move to next player immediately
                console.log(`🔄 Human player ${currentPlayer.name} played card, moving to next player`);
                room.game.currentPlayer = (room.game.currentPlayer + 1) % 4;
                
                // Emit turn change event with the new current player
                io.to(socket.roomCode).emit('turnChanged', {
                    currentPlayer: room.game.currentPlayer,
                    allHands: room.game.hands
                });
            }
        }

        console.log(`✅ Card played event emitted for user ${socket.id} in room ${socket.roomCode}`);
    });

    // ✅ CRITICAL FIX: Handle bot turn completion to move to next player
    socket.on('botTurnComplete', (data) => {
        console.log(`🤖 Bot turn complete in room: ${socket.roomCode}`);
        
        if (!socket.roomCode) {
            console.log(`❌ User ${socket.id} not in a room`);
            return;
        }
        
        const room = rooms.get(socket.roomCode);
        if (!room || !room.game) {
            console.log(`❌ Room or game not found for bot turn completion`);
            return;
        }
        
        // ✅ Move to next player after bot turn is complete
        room.game.currentPlayer = (room.game.currentPlayer + 1) % 4;
        console.log(`🔄 Moved to next player: ${room.game.currentPlayer}`);
        
        // ✅ CRITICAL FIX: Reset bot played flags for new turn
        if (room.game.botPlayedThisTurn) {
            room.game.botPlayedThisTurn.clear();
            console.log(`🔄 Reset bot played flags for new turn`);
        }
        
        // Emit turn change event with the new current player
        io.to(socket.roomCode).emit('turnChanged', {
            currentPlayer: room.game.currentPlayer,
            allHands: room.game.hands
        });
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
function determineRoundWinner(playedCards) {
    console.log(`🏆 Determining round winner from ${playedCards.length} played cards`);

    if (!playedCards || playedCards.length !== 4) {
        console.error(`❌ Invalid playedCards for round winner determination:`, playedCards);
        return null;
    }

    // Find the highest value card (lowest number = highest power in Brazilian Truco)
    let highestCard = null;
    let highestValue = Infinity;

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
            console.log(`🏆 New highest card: ${card.name} (${card.value}) by ${player.name}`);
        }
    });

    console.log(`🏆 Round winner determined: ${highestCard.name} with ${highestCard.card} (value: ${highestCard.value})`);
    return highestCard;
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
        
        // ✅ CRITICAL FIX: Winner of last round starts next game
        // Find the player who won the last round and set them as current player
        let startingPlayerIndex = 0; // Default to first player
        
        console.log(`🔍 DEBUG: Checking for last round winner in startNewGame`);
        console.log(`🔍 DEBUG: room.lastRoundWinner:`, room.lastRoundWinner);
        console.log(`🔍 DEBUG: room.players:`, room.players.map(p => ({ name: p.name, id: p.id })));
        
        // Look for the last round winner in the room's game state
        if (room.lastRoundWinner) {
            console.log(`🔍 DEBUG: Found lastRoundWinner:`, room.lastRoundWinner);
            const winnerPlayerIndex = room.players.findIndex(p => p.name === room.lastRoundWinner.name);
            console.log(`🔍 DEBUG: Winner player index found:`, winnerPlayerIndex);
            
            if (winnerPlayerIndex !== -1) {
                startingPlayerIndex = winnerPlayerIndex;
                console.log(`🎯 Winner of last round (${room.lastRoundWinner.name}) will start next game at index ${startingPlayerIndex}`);
            } else {
                console.log(`⚠️ Could not find last round winner in players list, defaulting to index 0`);
                console.log(`⚠️ DEBUG: Player names in room:`, room.players.map(p => p.name));
                console.log(`⚠️ DEBUG: Last round winner name:`, room.lastRoundWinner.name);
            }
        } else {
            console.log(`ℹ️ No last round winner found, defaulting to index 0`);
        }
        
        console.log(`🔍 DEBUG: Final starting player index:`, startingPlayerIndex);
        console.log(`🔍 DEBUG: Starting player will be:`, room.players[startingPlayerIndex]?.name || 'Unknown');
        
        room.game.currentPlayer = startingPlayerIndex;
        room.game.playedCards = [];
        
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