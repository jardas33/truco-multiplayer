const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store active rooms
const rooms = new Map();

// Helper function for Go Fish card values
function getCardValue(rank) {
    const values = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
        'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
    };
    return values[rank] || 0;
}

// Helper function to advance turn in Go Fish
function advanceTurn(roomCode, room) {
    try {
        console.log(`🔄 Advancing turn in Go Fish game`);
        console.log(`🔄 Current player before advance: ${room.game.currentPlayer}`);
        console.log(`🔄 Total players: ${room.players.length}`);
        
        // Move to next player
        room.game.currentPlayer = (room.game.currentPlayer + 1) % room.players.length;
        console.log(`🔄 New current player: ${room.game.currentPlayer}`);
        
        // Clear cards obtained this turn for the new player
        room.game.cardsObtainedThisTurn = [];
        
        console.log(`🔄 EMITTING turnChanged event to room: ${roomCode}`);
        console.log(`🔄 turnChanged event data:`, {
            currentPlayer: room.game.currentPlayer,
            players: room.players.map((p, index) => ({
                ...p,
                hand: room.game.hands[index] || [],
                pairs: p.pairs || 0
            }))
        });
        
        // Handle players with empty hands
        while (room.game.hands[room.game.currentPlayer].length === 0 && !checkGoFishGameOver(room)) {
            const currentPlayer = room.players[room.game.currentPlayer];
            console.log(`🔄 ${currentPlayer.name} has no cards - going fishing`);
            
                // Draw a card from pond
                if (room.game.pond.length > 0) {
                    const drawnCard = room.game.pond.pop();
                    room.game.hands[room.game.currentPlayer] = [...(room.game.hands[room.game.currentPlayer] || []), drawnCard];
                    
                    // Check for pairs in the player's hand after fishing
                    const newHand = room.game.hands[room.game.currentPlayer];
                    const pairsFound = checkForPairs(newHand);
                    if (pairsFound > 0) {
                        // Only automatically remove pairs for bots, not human players
                        if (currentPlayer.isBot) {
                            // Remove pairs from hand for bots
                            room.game.hands[room.game.currentPlayer] = removePairs(newHand);
                            // Update pair count
                            currentPlayer.pairs = (currentPlayer.pairs || 0) + pairsFound;
                            console.log(`🎯 Bot ${currentPlayer.name} found ${pairsFound} pair(s) after fishing`);
                        } else {
                            // For human players, just count the pairs but don't remove them from hand
                            // They need to manually drag the pairs
                            console.log(`🎯 Human player ${currentPlayer.name} has ${pairsFound} pair(s) available after fishing - must drag manually`);
                        }
                    }
                
                io.to(roomCode).emit('goFish', {
                    player: currentPlayer.name,
                    playerIndex: room.game.currentPlayer,
                    drawnCard: drawnCard,
                    players: room.players.map((p, index) => ({
                        ...p,
                        hand: room.game.hands[index] || [],
                        pairs: p.pairs || 0
                    })),
                    pond: room.game.pond,
                    currentPlayer: room.game.currentPlayer,
                    pairsFound: pairsFound
                });
                
                // If pairs were found, player gets another turn
                if (pairsFound > 0) {
                    console.log(`🎯 ${currentPlayer.name} found pairs after fishing - gets another turn`);
                    return; // Don't advance turn further
                }
            } else {
                // Pond is empty - end turn
                io.to(roomCode).emit('goFish', {
                    player: currentPlayer.name,
                    playerIndex: room.game.currentPlayer,
                    drawnCard: null,
                    players: room.players.map((p, index) => ({
                        ...p,
                        hand: room.game.hands[index] || [],
                        pairs: p.pairs || 0
                    })),
                    pond: room.game.pond,
                    currentPlayer: room.game.currentPlayer
                });
            }
            
            // Check if game is over
            if (checkGoFishGameOver(room)) {
                return;
            }
            
            // Move to next player
            room.game.currentPlayer = (room.game.currentPlayer + 1) % room.players.length;
        }
        
        // Emit turn changed event
        console.log(`🔄 Emitting turnChanged event - currentPlayer: ${room.game.currentPlayer}`);
        console.log(`🔄 Room code: ${roomCode}`);
        console.log(`🔄 Sockets in room:`, Array.from(io.sockets.adapter.rooms.get(roomCode) || []));
        io.to(roomCode).emit('turnChanged', {
            currentPlayer: room.game.currentPlayer,
            players: room.players.map((p, index) => ({
                ...p,
                hand: room.game.hands[index] || [],
                pairs: p.pairs || 0
            }))
        });
        
        console.log(`🔄 turnChanged event emitted successfully`);
        
        // Handle bot turns
        const currentPlayer = room.players[room.game.currentPlayer];
        console.log(`🔍 DEBUG: Checking bot turn - currentPlayer: ${room.game.currentPlayer}, player: ${currentPlayer?.name}, isBot: ${currentPlayer?.isBot}`);
        if (currentPlayer && currentPlayer.isBot) {
            console.log(`🤖 Go Fish bot ${currentPlayer.name} turn - will play in 3 seconds`);
            setTimeout(() => {
                handleGoFishBotTurn(roomCode, room);
            }, 4000);
        }
        
    } catch (error) {
        console.error(`❌ Error in advanceTurn:`, error);
    }
}

// Handle Go Fish bot turns
function handleGoFishBotTurn(roomCode, room) {
    try {
        const currentPlayer = room.players[room.game.currentPlayer];
        if (!currentPlayer || !currentPlayer.isBot) {
            return;
        }
        
        const botHand = room.game.hands[room.game.currentPlayer] || [];
        if (botHand.length === 0) {
            // Bot has no cards - go fish
            if (room.game.pond.length > 0) {
                const drawnCard = room.game.pond.pop();
                room.game.hands[room.game.currentPlayer] = [...botHand, drawnCard];
                
                // Check for pairs in the player's hand after fishing
                const newHand = room.game.hands[room.game.currentPlayer];
                const pairsFound = checkForPairs(newHand);
                if (pairsFound > 0) {
                    // Remove pairs from hand
                    room.game.hands[room.game.currentPlayer] = removePairs(newHand);
                    // Update pair count
                    currentPlayer.pairs = (currentPlayer.pairs || 0) + pairsFound;
                    console.log(`🎯 ${currentPlayer.name} found ${pairsFound} pair(s) after fishing`);
                }
                
                io.to(roomCode).emit('goFish', {
                    player: currentPlayer.name,
                    playerIndex: room.game.currentPlayer,
                    drawnCard: drawnCard,
                    players: room.players.map((p, index) => ({
                        ...p,
                        hand: room.game.hands[index] || [],
                        pairs: p.pairs || 0
                    })),
                    pond: room.game.pond,
                    currentPlayer: room.game.currentPlayer
                });
                
                // If pairs were found, bot gets another turn
                if (pairsFound > 0) {
                    setTimeout(() => {
                        handleGoFishBotTurn(roomCode, room);
                    }, 4000);
                } else {
                    // No pairs found, end turn
                    room.game.currentPlayer = (room.game.currentPlayer + 1) % room.players.length;
                    io.to(roomCode).emit('turnChanged', {
                        currentPlayer: room.game.currentPlayer,
                        players: room.players.map((p, index) => ({
                            ...p,
                            hand: room.game.hands[index] || [],
                            pairs: p.pairs || 0
                        }))
                    });
                }
            } else {
                // Pond is empty - check for game over
                if (checkGoFishGameOver(room)) {
                    return; // Game over handled
                }
                
                // End turn
                room.game.currentPlayer = (room.game.currentPlayer + 1) % room.players.length;
                io.to(roomCode).emit('turnChanged', {
                    currentPlayer: room.game.currentPlayer,
                    players: room.players.map((p, index) => ({
                        ...p,
                        hand: room.game.hands[index] || [],
                        pairs: p.pairs || 0
                    }))
                });
            }
            return;
        }
        
        // Bot has cards - ask for a rank they have
        const availableRanks = [...new Set(botHand.map(card => card.rank))];
        const targetRank = availableRanks[Math.floor(Math.random() * availableRanks.length)];
        
        // Choose a target player (not themselves)
        const otherPlayers = room.players.filter((p, index) => index !== room.game.currentPlayer && (room.game.hands[index] || []).length > 0);
        if (otherPlayers.length === 0) {
            // No other players with cards - go fish
            if (room.game.pond.length > 0) {
                const drawnCard = room.game.pond.pop();
                room.game.hands[room.game.currentPlayer] = [...botHand, drawnCard];
                
                // Check for pairs in the player's hand after fishing
                const newHand = room.game.hands[room.game.currentPlayer];
                const pairsFound = checkForPairs(newHand);
                if (pairsFound > 0) {
                    // Remove pairs from hand
                    room.game.hands[room.game.currentPlayer] = removePairs(newHand);
                    // Update pair count
                    currentPlayer.pairs = (currentPlayer.pairs || 0) + pairsFound;
                    console.log(`🎯 ${currentPlayer.name} found ${pairsFound} pair(s) after fishing`);
                }
                
                io.to(roomCode).emit('goFish', {
                    player: currentPlayer.name,
                    playerIndex: room.game.currentPlayer,
                    drawnCard: drawnCard,
                    players: room.players.map((p, index) => ({
                        ...p,
                        hand: room.game.hands[index] || [],
                        pairs: p.pairs || 0
                    })),
                    pond: room.game.pond,
                    currentPlayer: room.game.currentPlayer
                });
                
                // If pairs were found, bot gets another turn
                if (pairsFound > 0) {
                    setTimeout(() => {
                        handleGoFishBotTurn(roomCode, room);
                    }, 4000);
                } else {
                    // No pairs found, end turn
                    room.game.currentPlayer = (room.game.currentPlayer + 1) % room.players.length;
                    io.to(roomCode).emit('turnChanged', {
                        currentPlayer: room.game.currentPlayer,
                        players: room.players.map((p, index) => ({
                            ...p,
                            hand: room.game.hands[index] || [],
                            pairs: p.pairs || 0
                        }))
                    });
                }
            } else {
                // Pond is empty - check for game over
                if (checkGoFishGameOver(room)) {
                    return; // Game over handled
                }
                
                // End turn
                room.game.currentPlayer = (room.game.currentPlayer + 1) % room.players.length;
                io.to(roomCode).emit('turnChanged', {
                    currentPlayer: room.game.currentPlayer,
                    players: room.players.map((p, index) => ({
                        ...p,
                        hand: room.game.hands[index] || [],
                        pairs: p.pairs || 0
                    }))
                });
            }
            return;
        }
        
        const targetPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        const targetIndex = room.players.indexOf(targetPlayer);
        
        // Find cards of the requested rank in target player's hand
        const targetPlayerHand = room.game.hands[targetIndex] || [];
        const requestedCards = targetPlayerHand.filter(card => card.rank === targetRank);
        
        if (requestedCards.length > 0) {
            // Target player has the cards - transfer them
            room.game.hands[targetIndex] = targetPlayerHand.filter(card => card.rank !== targetRank);
            room.game.hands[room.game.currentPlayer] = [...botHand, ...requestedCards];
            
            // Check for pairs in the asking player's hand (only for bots)
            if (currentPlayer.isBot) {
                const newHand = room.game.hands[room.game.currentPlayer];
                const pairsFound = checkForPairs(newHand);
                if (pairsFound > 0) {
                    // Remove pairs from hand
                    room.game.hands[room.game.currentPlayer] = removePairs(newHand);
                    // Update pair count
                    currentPlayer.pairs = (currentPlayer.pairs || 0) + pairsFound;
                    console.log(`🎯 ${currentPlayer.name} found ${pairsFound} pair(s) after getting cards`);
                }
            }
            
            // Broadcast successful ask with delay
            io.to(roomCode).emit('cardsGiven', {
                askingPlayer: currentPlayer.name,
                targetPlayer: targetPlayer.name,
                rank: targetRank,
                cardsGiven: requestedCards.length,
                players: room.players.map((p, index) => ({
                    ...p,
                    hand: room.game.hands[index] || [],
                    pairs: p.pairs || 0
                })),
                currentPlayer: room.game.currentPlayer
            });
            
            // Add delay before next action
            setTimeout(() => {
                // If pairs were found (and it's a bot), bot gets another turn
                if (currentPlayer.isBot) {
                    const newHand = room.game.hands[room.game.currentPlayer];
                    const pairsFound = checkForPairs(newHand);
                    if (pairsFound > 0) {
                        setTimeout(() => {
                            handleGoFishBotTurn(roomCode, room);
                        }, 4000); // 4 seconds delay for next turn
                    } else {
                        // No pairs found, end turn
                        room.game.currentPlayer = (room.game.currentPlayer + 1) % room.players.length;
                        io.to(roomCode).emit('turnChanged', {
                            currentPlayer: room.game.currentPlayer,
                            players: room.players.map((p, index) => ({
                                ...p,
                                hand: room.game.hands[index] || [],
                                pairs: p.pairs || 0
                            }))
                        });
                    }
                } else {
                    // Human player - end turn (they need to manually make pairs)
                    room.game.currentPlayer = (room.game.currentPlayer + 1) % room.players.length;
                    io.to(roomCode).emit('turnChanged', {
                        currentPlayer: room.game.currentPlayer,
                        players: room.players.map((p, index) => ({
                            ...p,
                            hand: room.game.hands[index] || [],
                            pairs: p.pairs || 0
                        }))
                    });
                }
            }, 2000); // 2 seconds delay before processing result
        } else {
            // Target player doesn't have the cards - Go Fish
            if (room.game.pond.length > 0) {
                const drawnCard = room.game.pond.pop();
                room.game.hands[room.game.currentPlayer] = [...botHand, drawnCard];
                
                // Check for pairs in the player's hand after fishing (only for bots)
                if (currentPlayer.isBot) {
                    const newHand = room.game.hands[room.game.currentPlayer];
                    const pairsFound = checkForPairs(newHand);
                    if (pairsFound > 0) {
                        // Remove pairs from hand
                        room.game.hands[room.game.currentPlayer] = removePairs(newHand);
                        // Update pair count
                        currentPlayer.pairs = (currentPlayer.pairs || 0) + pairsFound;
                        console.log(`🎯 ${currentPlayer.name} found ${pairsFound} pair(s) after fishing`);
                    }
                }
                
                // CRITICAL FIX: Check if the drawn card matches the rank the bot asked for
                const cardMatchesAskedRank = drawnCard.rank === targetRank;
                console.log(`🐟 Bot ${currentPlayer.name} - Drawn card rank: ${drawnCard.rank}, Asked rank: ${targetRank}, Matches: ${cardMatchesAskedRank}`);
                
                // Add delay before go fish event
                setTimeout(() => {
                    io.to(roomCode).emit('goFish', {
                        askingPlayer: currentPlayer.name,
                        targetPlayer: targetPlayer.name,
                        rank: targetRank,
                        playerIndex: room.game.currentPlayer,
                        targetPlayerIndex: targetIndex,
                        drawnCard: drawnCard,
                        players: room.players.map((p, index) => ({
                            ...p,
                            hand: room.game.hands[index] || [],
                            pairs: p.pairs || 0
                        })),
                        pond: room.game.pond,
                        currentPlayer: room.game.currentPlayer,
                        cardMatchesAskedRank: cardMatchesAskedRank
                    });
                    
                    // Add another delay before processing result
                    setTimeout(() => {
                        // CRITICAL FIX: Bot only gets another turn if the card matches the rank they asked for
                        // Even if pairs were found, if the card doesn't match, turn ends
                        if (currentPlayer.isBot) {
                            if (cardMatchesAskedRank) {
                                console.log(`🎯 Bot ${currentPlayer.name} fished the card they asked for (${targetRank}) - gets another turn`);
                                setTimeout(() => {
                                    handleGoFishBotTurn(roomCode, room);
                                }, 4000); // 4 seconds delay for next turn
                            } else {
                                // Card doesn't match - turn ends even if pairs were found
                                console.log(`🎯 Bot ${currentPlayer.name} fished a different card (${drawnCard.rank} instead of ${targetRank}) - turn ends`);
                                room.game.currentPlayer = (room.game.currentPlayer + 1) % room.players.length;
                                io.to(roomCode).emit('turnChanged', {
                                    currentPlayer: room.game.currentPlayer,
                                    players: room.players.map((p, index) => ({
                                        ...p,
                                        hand: room.game.hands[index] || [],
                                        pairs: p.pairs || 0
                                    }))
                                });
                            }
                        } else {
                            // Human player - end turn (they need to manually make pairs)
                            room.game.currentPlayer = (room.game.currentPlayer + 1) % room.players.length;
                            io.to(roomCode).emit('turnChanged', {
                                currentPlayer: room.game.currentPlayer,
                                players: room.players.map((p, index) => ({
                                    ...p,
                                    hand: room.game.hands[index] || [],
                                    pairs: p.pairs || 0
                                }))
                            });
                        }
                    }, 4000); // 3 seconds delay before processing result
                }, 2500); // 2.5 seconds delay before go fish event
            } else {
                // Pond is empty - check for game over
                if (checkGoFishGameOver(room)) {
                    return; // Game over handled
                }
                
                // End turn
                room.game.currentPlayer = (room.game.currentPlayer + 1) % room.players.length;
                io.to(roomCode).emit('turnChanged', {
                    currentPlayer: room.game.currentPlayer,
                    players: room.players.map((p, index) => ({
                        ...p,
                        hand: room.game.hands[index] || [],
                        pairs: p.pairs || 0
                    }))
                });
            }
        }
        
    } catch (error) {
        console.error(`❌ Error in handleGoFishBotTurn:`, error);
    }
}

// Check for pairs in a hand and return count
function checkForPairs(hand) {
    const rankCounts = {};
    
    // Count cards by rank
    hand.forEach(card => {
        rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    });
    
    // Count pairs
    let pairs = 0;
    Object.values(rankCounts).forEach(count => {
        pairs += Math.floor(count / 2);
    });
    
    return pairs;
}

// Remove pairs from a hand and return the new hand
function removePairs(hand) {
    const rankCounts = {};
    
    // Count cards by rank
    hand.forEach(card => {
        rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    });
    
    // Remove pairs
    const newHand = [];
    Object.keys(rankCounts).forEach(rank => {
        const count = rankCounts[rank];
        const pairs = Math.floor(count / 2);
        const remaining = count - (pairs * 2);
        
        // Add remaining cards (after removing pairs)
        const cardsOfRank = hand.filter(card => card.rank === rank);
        for (let i = 0; i < remaining; i++) {
            newHand.push(cardsOfRank[i]);
        }
    });
    
    return newHand;
}

// Check if Go Fish game is over
function checkGoFishGameOver(room) {
    try {
        // Game is over when all players have empty hands AND pond is empty
        const allPlayersEmpty = room.players.every((player, index) => {
            const hand = room.game.hands[index] || [];
            return hand.length === 0;
        });
        const pondEmpty = room.game.pond.length === 0;
        
        console.log(`🔍 Go Fish game over check: allPlayersEmpty=${allPlayersEmpty}, pondEmpty=${pondEmpty}`);
        
        if (allPlayersEmpty && pondEmpty) {
            console.log('🏆 Go Fish game is over!');
            
            // Calculate final scores (pairs)
            const finalScores = room.players.map((player, index) => {
                return {
                    name: player.name,
                    pairs: player.pairs || 0
                };
            });
            
            // Find winner (most pairs)
            const winner = finalScores.reduce((max, player) => 
                player.pairs > max.pairs ? player : max
            );
            
            // Find the room code for this room
            let roomCode = null;
            for (let [code, r] of rooms.entries()) {
                if (r === room) {
                    roomCode = code;
                    break;
                }
            }
            
            if (roomCode) {
                // Broadcast game over
                io.to(roomCode).emit('gameOver', {
                    winner: winner,
                    finalScores: finalScores
                });
            }
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`❌ Error in checkGoFishGameOver:`, error);
        return false;
    }
}

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

// Test endpoint for debugging
app.get('/test', (req, res) => {
    res.status(200).json({
        message: 'Server is working',
        timestamp: new Date().toISOString(),
        rooms: Array.from(rooms.keys()),
        socketConnections: io.engine.clientsCount
    });
});

// Basic route - redirect to main menu
app.get('/', (req, res) => {
    console.log('🏠 ROOT ROUTE: Serving main-menu.html');
    res.sendFile(__dirname + '/public/main-menu.html');
});

// Game routes
app.get('/truco', (req, res) => {
    console.log('🎯 TRUCO ROUTE: Serving index.html');
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/poker', (req, res) => {
    res.sendFile(__dirname + '/public/poker.html');
});

app.get('/blackjack', (req, res) => {
    res.sendFile(__dirname + '/public/blackjack.html');
});

app.get('/hearts', (req, res) => {
    res.sendFile(__dirname + '/public/hearts.html');
});

app.get('/go-fish', (req, res) => {
    res.sendFile(__dirname + '/public/go-fish.html');
});

app.get('/war', (req, res) => {
    res.sendFile(__dirname + '/public/war.html');
});

app.get('/crazy-eights', (req, res) => {
    res.sendFile(__dirname + '/public/crazy-eights.html');
});

app.get('/battleship-menu', (req, res) => {
    console.log('🚢 BATTLESHIP MENU ROUTE: Serving battleship-menu.html');
    res.sendFile(__dirname + '/public/battleship-menu.html');
});

app.get('/battleship', (req, res) => {
    console.log('🚢 BATTLESHIP ROUTE: Serving battleship.html');
    res.sendFile(__dirname + '/public/battleship.html');
});

// Static file serving (after custom routes to avoid conflicts)
app.use(express.static('public'));

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`👤 User connected: ${socket.id}`);
    
    // Add error handling for socket
    socket.on('error', (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error);
    });
    
    socket.on('disconnect', (reason) => {
        console.log(`👤 User disconnected: ${socket.id}, reason: ${reason}`);
        
        // For battleship rooms, mark player as disconnected but don't remove them immediately
        // This allows for reconnection when navigating from menu to game
        if (socket.roomCode) {
            const room = rooms.get(socket.roomCode);
            if (room && room.gameType === 'battleship') {
                console.log(`🚢 Battleship player ${socket.id} disconnected from room ${socket.roomCode}`);
                // Don't remove the player immediately - let the reconnection logic handle it
                // The player will be replaced when they reconnect
            }
        }
    });
    
    // ✅ DEBUG: Log all incoming events to see if startGame is received
    console.log(`🔍 Socket ${socket.id} connected - waiting for events`);
    
    // Test event to verify socket communication
    socket.on('test', (data) => {
        console.log(`🧪 Test event received from ${socket.id}:`, data);
        socket.emit('testResponse', { message: 'Server received test event', timestamp: new Date().toISOString() });
    });
    
    // Handle room creation
    socket.on('createRoom', (data) => {
        let roomCode = data.roomCode || data;
        const gameType = data.gameType || 'truco';
        
        console.log(`🔍 CREATEROOM EVENT RECEIVED! Room: ${roomCode}, Game: ${gameType}`);
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
            gameType: gameType,
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
        roomCode = roomCode;

        console.log(`🔍 Socket joined room: ${roomCode}`);
        console.log(`🔍 Socket room code set to: ${roomCode}`);

        socket.emit('roomCreated', {
            roomId: roomCode,
            playerId: socket.id,
            isHost: true
        });
        io.to(roomCode).emit('playerJoined', {
            players: rooms.get(roomCode).players,
            count: 1
        });
        
        // Emit players updated event
        io.to(roomCode).emit('playersUpdated', rooms.get(roomCode).players);
        
        console.log(`✅ Room ${roomCode} created successfully`);
    });

    // Handle room joining
    socket.on('joinRoom', (data) => {
        try {
            console.log(`🔍 JOINROOM EVENT RECEIVED! Data:`, data);
            console.log(`🔍 JOINROOM EVENT RECEIVED! Socket ID: ${socket.id}`);
            console.log(`🔍 JOINROOM EVENT RECEIVED! Timestamp: ${new Date().toISOString()}`);
            
            const roomCode = data.roomCode || data;
            console.log(`🔍 JOINROOM EVENT RECEIVED! Room: ${roomCode}`);
            const room = rooms.get(roomCode);
            
            console.log(`🚪 User ${socket.id} attempting to join room: ${roomCode}`);
            console.log(`🔍 DEBUG: Available rooms:`, Array.from(rooms.keys()));
            console.log(`🔍 DEBUG: Room exists:`, !!room);
            console.log(`🔍 DEBUG: Data type:`, typeof data);
            console.log(`🔍 DEBUG: Data.gameType:`, data.gameType);
            
            if (!room) {
            console.log(`❌ Room ${roomCode} not found`);
            console.log(`🔍 DEBUG: Available rooms:`, Array.from(rooms.keys()));
            console.log(`🔍 DEBUG: Socket roomCode:`, roomCode);
            
            // Don't create rooms when joining - only when creating
            socket.emit('error', 'Room not found');
            return;
        }

        const maxPlayersJoin = room.gameType === 'truco' ? 4 : (room.gameType === 'battleship' ? 2 : 6); // Truco needs 4, Battleship needs 2, other games can have up to 6
        
        // For battleship rooms, handle reconnection by replacing disconnected players
        if (room.gameType === 'battleship' && room.players.length >= maxPlayersJoin) {
            console.log(`🚢 Battleship room ${roomCode} appears full (${room.players.length}/${maxPlayersJoin}), checking for reconnection`);
            
            // Check if this is a reconnection by looking for disconnected players
            const disconnectedPlayers = room.players.filter(p => {
                const socketExists = io.sockets.sockets.has(p.id);
                return !socketExists;
            });
            
            if (disconnectedPlayers.length > 0) {
                console.log(`🚢 Found ${disconnectedPlayers.length} disconnected players, allowing reconnection`);
                // Remove the first disconnected player and add the new one
                const disconnectedIndex = room.players.findIndex(p => p.id === disconnectedPlayers[0].id);
                if (disconnectedIndex !== -1) {
                    const disconnectedPlayer = room.players[disconnectedIndex];
                    // CRITICAL FIX: Preserve player properties (isRoomCreator, name/nickname, team) when reconnecting
                    room.players[disconnectedIndex] = {
                        id: socket.id,
                        name: disconnectedPlayer.name || `Player ${disconnectedIndex + 1}`, // Preserve existing name/nickname
                        nickname: disconnectedPlayer.nickname || disconnectedPlayer.name || `Player ${disconnectedIndex + 1}`,
                        team: disconnectedPlayer.team || null,
                        isBot: disconnectedPlayer.isBot || false,
                        isRoomCreator: disconnectedPlayer.isRoomCreator || false, // CRITICAL: Preserve isRoomCreator flag
                        ready: false // Reset ready state for reconnected player
                    };
                    console.log(`🚢 Replaced disconnected player ${disconnectedPlayers[0].id} with new player ${socket.id}, preserved name: "${room.players[disconnectedIndex].name}", isRoomCreator: ${room.players[disconnectedIndex].isRoomCreator}`);
                }
            } else {
                console.log(`❌ Room ${roomCode} is full and no disconnected players found`);
                socket.emit('error', 'Room is full');
                return;
            }
        } else if (room.players.length >= maxPlayersJoin) {
            console.log(`❌ Room ${roomCode} is full (${room.players.length}/${maxPlayersJoin})`);
            socket.emit('error', 'Room is full');
            return;
        } else {
            // Normal case: add new player
            const newPlayer = {
                id: socket.id,
                name: `Player ${room.players.length + 1}`,
                nickname: `Player ${room.players.length + 1}`,
                team: null, // No team assigned yet
                isBot: false
            };
            room.players.push(newPlayer);
            
            console.log(`🔍 DEBUG: Added player to room:`, JSON.stringify(newPlayer, null, 2));
            console.log(`🔍 DEBUG: Room now has ${room.players.length} players:`, room.players.map(p => ({ id: p.id, name: p.name, index: room.players.indexOf(p) })));
        }
        
        socket.join(roomCode);

        console.log(`✅ User ${socket.id} joined room ${roomCode}. Total players: ${room.players.length}`);
        console.log(`🔍 Socket joined room: ${roomCode}`);
        console.log(`🔍 Socket room code set to: ${roomCode}`);

        // ✅ CRITICAL FIX: Emit roomJoined event to the joining player
        console.log(`🚢 Emitting roomJoined event to socket ${socket.id}`);
        const roomJoinedData = {
            roomId: roomCode,
            playerId: socket.id,
            playerIndex: room.players.length - 1, // Index of the player who just joined
            isHost: false
        };
        console.log(`🚢 roomJoined data:`, JSON.stringify(roomJoinedData, null, 2));
        socket.emit('roomJoined', roomJoinedData);
        console.log(`🚢 roomJoined event emitted successfully`);

        // ✅ Emit playerJoined event to all players in the room
        io.to(roomCode).emit('playerJoined', {
            players: room.players,
            count: room.players.length
        });
        
        // Emit players updated event
        io.to(roomCode).emit('playersUpdated', room.players);
        
        // For battleship: wait for manual game start
        if (room.gameType === 'battleship' && room.players.length === 2) {
            console.log(`🚢 Battleship room ${roomCode} has 2 players - waiting for manual start`);
        }
        
        } catch (error) {
            console.error(`❌ Error in joinRoom handler:`, error);
            console.error(`❌ Error stack:`, error.stack);
            socket.emit('error', `Server error: ${error.message}`);
        }
    });

    // ✅ Handle battleship game events
    socket.on('battleshipPlayerReady', (data) => {
        console.log(`🚢 Player ready for battleship game: ${data.playerId} in room ${data.roomId}`);
        console.log(`🚢 Socket ID: ${socket.id}`);
        console.log(`🚢 Data received:`, data);
        
        const room = rooms.get(data.roomId);
        console.log(`🚢 Room found:`, !!room);
        console.log(`🚢 Room game type:`, room?.gameType);
        console.log(`🚢 Room players:`, room?.players?.length);
        
        if (room && room.gameType === 'battleship') {
            // Mark player as ready - use socket.id instead of data.playerId
            const player = room.players.find(p => p.id === socket.id);
            console.log(`🚢 Player found:`, !!player);
            if (player) {
                player.ready = true;
                console.log(`🚢 Player ${socket.id} marked as ready`);
                
                // Clean up disconnected players and get only connected players
                // CRITICAL FIX: DO NOT filter/reorder players array - this breaks player ordering and isRoomCreator flags
                // Instead, just check if players are connected when needed
                // The players array order is important - index 0 should always be the room creator if they're still in the room
                const connectedPlayers = room.players.filter(p => {
                    const socketExists = io.sockets.sockets.has(p.id);
                    if (!socketExists) {
                        console.log(`🚢 Player ${p.id} (${p.name || 'unnamed'}) is disconnected but keeping in array for now`);
                    }
                    return socketExists;
                });
                
                // CRITICAL FIX: Only update if we're actually removing players, and preserve array order
                // If the room creator is disconnected, we still want to keep them at index 0
                if (connectedPlayers.length !== room.players.length) {
                    // Only update if we actually removed someone
                    // Preserve the original array structure - don't reorder
                    room.players = room.players.filter(p => io.sockets.sockets.has(p.id));
                    console.log(`🚢 Removed disconnected players, remaining: ${room.players.length}`);
                }
                
                console.log(`🚢 Connected players:`, room.players.map(p => ({ id: p.id, ready: p.ready })));
                console.log(`🚢 Room has ${room.players.length} connected players`);
                
                // Check if we have exactly 2 connected players and both are ready
                if (room.players.length === 2) {
                    const allReady = room.players.every(p => p.ready);
                    console.log(`🚢 All players ready:`, allReady);
                    
                    if (allReady) {
                        console.log(`🚢 Both players ready! Starting battleship game in room ${data.roomId}`);
                        
                        // Find the room creator (Player 1) to assign first turn
                        const roomCreator = room.players.find(p => p.isRoomCreator);
                        const firstPlayerId = roomCreator ? roomCreator.id : room.players[0].id;
                        
                        // CRITICAL FIX: Initialize currentPlayer based on which player goes first
                        // Map playerId to index: player at index 0 goes first if their ID matches firstPlayerId
                        const firstPlayerIndex = room.players.findIndex(p => p.id === firstPlayerId);
                        room.currentPlayer = firstPlayerIndex >= 0 ? firstPlayerIndex : 0;
                        
                        console.log(`🚢 Assigning first turn to: ${firstPlayerId} (${roomCreator ? 'Room Creator' : 'First Player'})`);
                        console.log(`🚢 Initialized room.currentPlayer to: ${room.currentPlayer}`);
                        
                        // CRITICAL FIX: Log player names before sending to ensure nicknames are included
                        // Also ensure room creator is always at index 0 for consistency
                        const roomCreatorIndex = room.players.findIndex(p => p.isRoomCreator);
                        if (roomCreatorIndex > 0 && roomCreatorIndex !== -1) {
                            // If room creator is not at index 0, move them there to ensure consistent ordering
                            const roomCreator = room.players[roomCreatorIndex];
                            room.players.splice(roomCreatorIndex, 1); // Remove from current position
                            room.players.unshift(roomCreator); // Add to beginning
                            console.log(`🚢 Reordered players array - moved room creator to index 0`);
                        }
                        
                        console.log(`🚢 Sending battleshipGameStart with players:`, room.players.map((p, i) => ({ 
                            index: i,
                            id: p.id, 
                            name: p.name, 
                            nickname: p.nickname,
                            isBot: p.isBot,
                            isRoomCreator: p.isRoomCreator || false
                        })));
                        
                        // CRITICAL FIX: Ensure firstPlayerId matches the room creator at index 0 after reordering
                        const updatedRoomCreator = room.players.find(p => p.isRoomCreator);
                        const finalFirstPlayerId = updatedRoomCreator ? updatedRoomCreator.id : room.players[0].id;
                        
                        io.to(data.roomId).emit('battleshipGameStart', {
                            roomId: data.roomId,
                            players: room.players,
                            firstPlayerId: finalFirstPlayerId
                        });
                        
                        // Reset ready state immediately after game starts for the next game
                        room.players.forEach(player => {
                            player.ready = false;
                            console.log(`🚢 Reset ready state for player ${player.id} after game start`);
                        });
                    } else {
                        console.log(`🚢 Not all players ready yet, notifying others`);
                        // Notify other players that this player is ready
                        socket.to(data.roomId).emit('battleshipPlayerReady', {
                            playerId: socket.id,
                            roomId: data.roomId
                        });
                    }
                } else {
                    console.log(`🚢 Room has ${room.players.length} players, need exactly 2 for battleship`);
                    // Notify other players that this player is ready
                    socket.to(data.roomId).emit('battleshipPlayerReady', {
                        playerId: socket.id,
                        roomId: data.roomId
                    });
                }
            } else {
                console.log(`❌ Player not found in room`);
            }
        } else {
            console.log(`❌ Room not found or not battleship type`);
        }
    });
    
    socket.on('battleshipGameStart', (data) => {
        console.log(`🚢 Battleship game start requested for room: ${data.roomId}`);
        console.log(`🚢 Requesting socket ID: ${socket.id}`);
        const room = rooms.get(data.roomId);
        console.log(`🚢 Room found:`, !!room);
        console.log(`🚢 Room game type:`, room?.gameType);
        console.log(`🚢 Room players:`, room?.players?.length);
        
        if (room && room.gameType === 'battleship') {
            console.log(`🚢 Broadcasting battleshipGameStart to room ${data.roomId}`);
            io.to(data.roomId).emit('battleshipGameStart', {
                roomId: data.roomId,
                players: room.players
            });
            console.log(`🚢 Broadcast complete`);
        } else {
            console.log(`❌ Room not found or not battleship type`);
        }
    });
    
    socket.on('battleshipTurnChange', (data) => {
        console.log(`🚢 Turn change in room ${data.roomId}: ${data.currentPlayer}`);
        const room = rooms.get(data.roomId);
        
        if (room && room.gameType === 'battleship') {
            io.to(data.roomId).emit('battleshipTurnChange', {
                roomId: data.roomId,
                currentPlayer: data.currentPlayer
            });
        }
    });
    
    socket.on('battleshipShipPlaced', (data) => {
        console.log(`🚢 Ship placed in room ${data.roomId}:`, data);
        // Broadcast ship placement to other players
        socket.to(data.roomId).emit('battleshipShipPlaced', data);
    });
    
    socket.on('battleshipAttack', (data) => {
        console.log(`🚢 Attack in room ${data.roomId}:`, data);
        
        const room = rooms.get(data.roomId);
        if (!room) {
            console.log(`❌ Room ${data.roomId} not found for attack`);
            return;
        }
        
        // ✅ CRITICAL FIX: Validate it's the attacker's turn
        const attackingPlayer = room.players.find(p => p.id === socket.id);
        if (!attackingPlayer) {
            console.log(`❌ Attacking player not found in room`);
            socket.emit('battleshipAttackError', { message: 'Player not found in room' });
            return;
        }
        
        const attackingPlayerIndex = room.players.findIndex(p => p.id === socket.id);
        
        // Validate turn: only allow attack if it's this player's turn
        if (room.currentPlayer !== attackingPlayerIndex) {
            console.log(`❌ Attack rejected - not attacker's turn. Current: ${room.currentPlayer}, Attacker: ${attackingPlayerIndex}`);
            socket.emit('battleshipAttackError', { message: 'Not your turn!' });
            return;
        }
        
        // Add the attacking player ID to the data
        data.attackingPlayerId = socket.id;
        
        // ✅ CRITICAL FIX: Process attack logic on server side
        // Find the defending player (not the attacker)
        const defendingPlayer = room.players.find(p => p.id !== socket.id);
        if (!defendingPlayer) {
            console.log(`❌ No defending player found for attack`);
            return;
        }
        
        // Get the defending player's ship data from their game state
        // For now, we'll use a simple approach - the defending player will process the hit/miss
        // and send back the result
        
        // Broadcast attack to other players (defending player)
        socket.to(data.roomId).emit('battleshipAttack', data);
        
        // The defending player will process the attack and send back the result
        // We'll handle the result in a separate event
    });
    
    socket.on('battleshipAttackResult', (data) => {
        console.log(`🚢 Attack result in room ${data.roomId}:`, data);
        
        const room = rooms.get(data.roomId);
        if (!room) {
            console.log(`❌ Room ${data.roomId} not found for attack result`);
            return;
        }
        
        // Broadcast the attack result to the attacking player
        socket.to(data.roomId).emit('battleshipAttackResult', data);
        
        // CRITICAL FIX: In Battleship, you keep your turn when you hit (hit or sink)
        // Only change turns when you miss
        if (data.hit === false) {
            // Miss - change turn to opponent
            // Find which player index made the attack
            const attackingPlayerIndex = room.players.findIndex(p => p.id === data.attackingPlayerId);
            if (attackingPlayerIndex >= 0) {
                room.currentPlayer = attackingPlayerIndex;
            }
            const currentPlayerIndex = room.currentPlayer >= 0 ? room.currentPlayer : 0;
            const nextPlayerIndex = 1 - currentPlayerIndex;
            room.currentPlayer = nextPlayerIndex;
            
            console.log(`🚢 Miss detected - Turn change in room ${data.roomId}: ${nextPlayerIndex}`);
            console.log(`🚢 Attacking player index: ${attackingPlayerIndex}, next player: ${nextPlayerIndex}`);
            io.to(data.roomId).emit('battleshipTurnChange', {
                roomId: data.roomId,
                currentPlayer: nextPlayerIndex
            });
        } else {
            // Hit or sunk - keep current turn (don't change)
            // Ensure currentPlayer is set to the attacker
            const attackingPlayerIndex = room.players.findIndex(p => p.id === data.attackingPlayerId);
            if (attackingPlayerIndex >= 0) {
                room.currentPlayer = attackingPlayerIndex;
            }
            
            console.log(`🚢 Hit detected - keeping turn for current player in room ${data.roomId}, index: ${room.currentPlayer}`);
            // CRITICAL FIX: Don't emit turn change on hit - the attacker already knows they hit
            // Emitting turn change causes both players to see "Your turn" message incorrectly
            // The attacker's client already handles showing hit messages in handleAttackResult
        }
    });
    
    socket.on('battleshipGameOver', (data) => {
        console.log(`🚢 Game over in room ${data.roomId}:`, data);
        // Broadcast game over to all players
        io.to(data.roomId).emit('battleshipGameOver', data);
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
        roomCode = null;

        console.log(`✅ User ${socket.id} left room ${roomCode}. Total players: ${room.players.length}`);

        // Emit player left event to remaining players
        io.to(roomCode).emit('playerLeft', {
            players: room.players,
            count: room.players.length
        });

        // If room is empty, delete it
        if (room.players.length === 0) {
            console.log(`🔍 DEBUG: Room ${roomCode} is empty, checking if game is active before deletion`);
            console.log(`🔍 DEBUG: Room game state:`, room.game ? 'active' : 'none');
            console.log(`🔍 DEBUG: Room game started:`, room.game?.started ? 'yes' : 'no');
            
            // ✅ CRITICAL FIX: Don't delete room if game is active
            if (room.game && room.game.started) {
                console.log(`⚠️ WARNING: Attempting to delete room ${roomCode} during active game - PREVENTING DELETION`);
                return;
            }
            
            rooms.delete(roomCode);
            console.log(`🗑️ Room ${roomCode} deleted (empty and no active game)`);
        }
    });

    // Handle adding bots
    socket.on('addBot', (data) => {
        const roomCode = data.roomId || data; // Handle both old and new formats
        console.log(`🤖 Adding bot to room: ${roomCode}`);
        
        const room = rooms.get(roomCode);
        
        if (!room) {
            console.log(`❌ Room ${roomCode} not found for bot addition`);
            socket.emit('error', 'Room not found');
            return;
        }

        const maxPlayersAddBot = room.gameType === 'truco' ? 4 : 6; // Truco needs 4, other games can have up to 6
        if (room.players.length >= maxPlayersAddBot) {
            console.log(`❌ Room ${roomCode} is full (${room.players.length}/${maxPlayersAddBot}), cannot add bot`);
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
        
        // Emit players updated event
        io.to(roomCode).emit('playersUpdated', room.players);

        const maxPlayersFull = room.gameType === 'truco' ? 4 : 6; // Truco needs 4, other games can have up to 6
        if (room.players.length === maxPlayersFull) {
            console.log(`🎯 Room ${roomCode} is now full with ${room.players.length} players`);
            io.to(roomCode).emit('roomFull');
        }
    });

    // ✅ Handle bot removal
    socket.on('removeBot', (data) => {
        const roomCode = data.roomId || data; // Handle both old and new formats
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
        
        // Emit players updated event
        io.to(roomCode).emit('playersUpdated', room.players);

        // If room is no longer full, emit roomNotFull event
        const maxPlayersNotFull = room.gameType === 'truco' ? 4 : 6; // Truco needs 4, other games can have up to 6
        if (room.players.length < maxPlayersNotFull) {
            io.to(roomCode).emit('roomNotFull');
        }
    });

    // Handle game start
    socket.on('startGame', (roomCode) => {
        try {
            console.log(`🎮 STARTGAME EVENT RECEIVED! Room: ${roomCode}`);
            console.log(`🔍 Socket ID: ${socket.id}`);
            console.log(`🔍 Socket room code: ${roomCode}`);
            console.log(`🔍 Available rooms:`, Array.from(rooms.keys()));
            console.log(`🔍 Event handler executing...`);
            
            // Handle both string and object formats
            let actualRoomCode = roomCode;
            if (typeof roomCode === 'object' && roomCode.roomId) {
                actualRoomCode = roomCode.roomId;
                console.log(`🔍 Extracted room code from object: ${actualRoomCode}`);
            }
            
            const room = rooms.get(actualRoomCode);
            if (!room) {
                console.log(`❌ Room ${actualRoomCode} not found for game start`);
                console.log(`🔍 Room not found - checking if socket is in any room`);
                console.log(`🔍 All available rooms:`, Array.from(rooms.entries()));
                socket.emit('error', 'Room not found');
                return;
            }
            
            console.log(`🔍 Room found with ${room.players.length} players:`, room.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot })));
            
            const minPlayers = room.gameType === 'truco' ? 4 : 2; // Truco needs 4, other games need at least 2
            if (room.players.length < minPlayers) {
                console.log(`❌ Room ${roomCode} needs ${minPlayers} players, has ${room.players.length}`);
                socket.emit('error', `Need ${minPlayers} players to start the game`);
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

            // ✅ Create game state based on game type
            if (room.gameType === 'go-fish') {
                // For Go Fish, create a proper game state with dealt cards
                console.log(`🐟 Creating Go Fish game for ${room.players.length} players`);
                
                // Create a standard deck for Go Fish
                const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
                const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
                const deck = [];
                
                for (let suit of suits) {
                    for (let rank of ranks) {
                        deck.push({
                            name: `${rank} of ${suit}`,
                            suit: suit,
                            rank: rank,
                            value: getCardValue(rank)
                        });
                    }
                }
                
                // Shuffle deck
                for (let i = deck.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [deck[i], deck[j]] = [deck[j], deck[i]];
                }
                
                // Deal cards to players (5 cards each, or 7 if 2 players)
                const cardsPerPlayer = room.players.length === 2 ? 7 : 5;
                const hands = Array(room.players.length).fill().map(() => []);
                
                for (let i = 0; i < cardsPerPlayer; i++) {
                    for (let j = 0; j < room.players.length; j++) {
                        if (deck.length > 0) {
                            hands[j].push(deck.pop());
                        }
                    }
                }
                
                // Remaining cards go to pond
                const pond = [...deck];
                
                room.game = {
                    started: true,
                    currentPlayer: 0, // Will be set correctly below
                    gameType: 'go-fish',
                    hands: hands,
                    pond: pond,
                    deck: [],
                    cardsObtainedThisTurn: [] // Track cards obtained in current turn for pair logic
                };
                
                console.log(`🐟 Go Fish game created with hands:`, hands.map((hand, i) => `Player ${i}: ${hand.length} cards`));
                console.log(`🐟 Pond has ${pond.length} cards`);
            } else if (room.gameType === 'blackjack') {
                // For Blackjack, initialize game state for betting phase
                console.log(`🃏 Creating Blackjack game for ${room.players.length} players`);
                
                // Create a standard deck for Blackjack
                const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
                const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
                const deck = [];
                
                for (let suit of suits) {
                    for (let rank of ranks) {
                        let value;
                        if (rank === 'ace') {
                            value = 1; // Ace can be 1 or 11
                        } else if (['jack', 'queen', 'king'].includes(rank)) {
                            value = 10;
                        } else {
                            value = parseInt(rank);
                        }
                        
                        deck.push({
                            name: `${rank} of ${suit}`,
                            suit: suit,
                            rank: rank,
                            value: value
                        });
                    }
                }
                
                // Shuffle deck
                for (let i = deck.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [deck[i], deck[j]] = [deck[j], deck[i]];
                }
                
                // Initialize player states
                const players = room.players.map((player, index) => ({
                    ...player,
                    hand: [],
                    value: 0,
                    bet: 0,
                    chips: player.startingChips || 1000,
                    isBusted: false,
                    hasBlackjack: false,
                    isStanding: false,
                    canDouble: false,
                    canSplit: false,
                    splitHand: null,
                    insurance: 0,
                    winnings: 0
                }));
                
                room.game = {
                    started: true,
                    gameType: 'blackjack',
                    deck: deck,
                    dealer: {
                        hand: [],
                        value: 0,
                        isBusted: false,
                        hasBlackjack: false,
                        holeCardVisible: false
                    },
                    players: players,
                    currentPlayer: 0,
                    gamePhase: 'betting', // betting, dealing, playing, dealer, finished
                    roundNumber: 1,
                    minBet: 5,
                    maxBet: 1000
                };
                
                console.log(`🃏 Blackjack game initialized with ${players.length} players in betting phase`);
            } else {
                // For Truco and other games, create shared deck and distribute cards
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
                    scores: { team1: 0, team2: 0 },
                    started: true
                };
            }
            
            // ✅ Set current player based on game type
            if (room.gameType === 'go-fish') {
                // For Go Fish, always start with Player 1
                room.game.currentPlayer = 0;
                console.log(`🐟 Go Fish game starting with Player 1: ${room.players[0]?.name}`);
                console.log(`🔍 DEBUG: Player 1 isBot: ${room.players[0]?.isBot}`);
                console.log(`🔍 DEBUG: All players:`, room.players.map((p, i) => `${i}: ${p.name} (isBot: ${p.isBot})`));
            } else {
                // For Truco and other games, use the existing logic
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
            }
            
            console.log(`✅ Game state initialized successfully for room ${roomCode}`);
            console.log(`🔍 DEBUG: Sending currentPlayer ${room.game.currentPlayer} to all clients`);

            // ✅ Emit gameStart event with hands to all players in the room
            // ✅ Emitting gameStart event to room
            
            if (room.gameType === 'go-fish') {
                // For Go Fish, try a different approach: send to each socket in the room with their specific data
                console.log(`🐟 Sending gameStarted to ${room.players.length} players in Go Fish room using alternative method`);
                
                // Get all sockets in the room
                const socketsInRoom = io.sockets.adapter.rooms.get(roomCode);
                console.log(`🔍 DEBUG: Sockets in room ${roomCode}:`, socketsInRoom ? Array.from(socketsInRoom) : 'none');
                
                // Send to each player individually using their socket ID from the player list
                room.players.forEach((player, playerIndex) => {
                    if (!player.isBot) { // Only send to real players, not bots
                        console.log(`🐟 Sending to player ${playerIndex}: ${player.name} (socket ID: ${player.id})`);
                        console.log(`🔍 DEBUG: Looking up socket for player ${playerIndex} with ID: ${player.id}`);
                        
                        const gameStartedData = {
                            players: room.players.map((p, index) => ({
                                ...p,
                                hand: room.game.hands[index] || [], // Send actual hand data to all players for Ask functionality
                                pairs: p.pairs || 0
                            })),
                            pond: room.game.pond,
                            localPlayerIndex: playerIndex, // Each player gets their correct index
                            currentPlayer: room.game.currentPlayer
                        };
                        
                        console.log(`🐟 Sending gameStarted data to player ${playerIndex} (socket ${player.id}):`, JSON.stringify({ localPlayerIndex: gameStartedData.localPlayerIndex, currentPlayer: gameStartedData.currentPlayer }, null, 2));
                        console.log(`🔍 DEBUG: Player ${playerIndex} will receive currentPlayer: ${gameStartedData.currentPlayer} (${room.players[gameStartedData.currentPlayer]?.name})`);
                        
                        // Use targeted emission to the specific socket ID
                        io.to(player.id).emit('gameStarted', gameStartedData);
                        console.log(`🔍 DEBUG: gameStarted event emitted to socket ${player.id}`);
                    }
                });
                
                // No broadcast for Go Fish - each player gets individual data
                console.log(`🐟 Go Fish: Individual gameStarted events sent to all players`);
            } else if (room.gameType === 'blackjack') {
                // For Blackjack, send gameStarted to each player individually
                console.log(`🃏 Sending gameStarted to ${room.players.length} players in Blackjack room`);
                
                room.players.forEach((player, playerIndex) => {
                    if (!player.isBot) {
                        const gameStartedData = {
                            players: room.game.players.map(p => ({
                                ...p,
                                hand: [], // Hands empty during betting phase
                                isLocal: p.id === player.id
                            })),
                            dealer: room.game.dealer,
                            localPlayerIndex: playerIndex,
                            currentPlayer: room.game.currentPlayer,
                            gamePhase: room.game.gamePhase,
                            roundNumber: room.game.roundNumber,
                            minBet: room.game.minBet,
                            maxBet: room.game.maxBet
                        };
                        
                        io.to(player.id).emit('gameStarted', gameStartedData);
                        console.log(`🃏 Blackjack gameStarted sent to player ${playerIndex}: ${player.name}`);
                    }
                });
            } else {
                // For other games (Truco, etc.), emit gameStart event
                io.to(roomCode).emit('gameStart', {
                    roomCode: roomCode,  // ✅ CRITICAL: Include room code in gameStart event
                    players: room.players,
                    hands: room.game.hands,
                    currentPlayer: room.game.currentPlayer  // ✅ FIX: Use the actual random starting player
                });
            }
            
            console.log(`🎯 Game started successfully in room ${roomCode} with shared deck`);
            console.log(`🔍 gameStart event emitted to ${room.players.length} players`);
        } catch (error) {
            console.error(`❌ CRITICAL ERROR in startGame handler:`, error);
            console.error(`❌ Error stack:`, error.stack);
            socket.emit('error', 'Failed to start game due to server error');
        }
    });

    // Test event handler
    socket.on('test', (data) => {
        console.log('🔍 Test event received from client:', data);
        socket.emit('test', { message: 'Server socket test response', timestamp: Date.now() });
    });

    // 🐟 GO FISH SPECIFIC EVENT HANDLERS
    socket.on('askForCards', (data) => {
        try {
            console.log(`🐟 Ask for cards event received:`, data);
            const roomCode = data.roomId;
            const room = rooms.get(roomCode);
            
            if (!room) {
                console.log(`❌ Room ${roomCode} not found for askForCards`);
                socket.emit('error', 'Room not found');
                return;
            }
            
            if (!room.game) {
                console.log(`❌ No active game in room ${roomCode}`);
                socket.emit('error', 'No active game');
                return;
            }
            
            // Process the ask for cards logic on server side
            const askingPlayer = room.players[data.playerIndex];
            const targetPlayer = room.players[data.targetPlayerIndex];
            
            if (!askingPlayer || !targetPlayer) {
                socket.emit('error', 'Invalid player indices');
                return;
            }
            
            // Check if asking player has the rank in their hand
            const askingPlayerHand = room.game.hands[data.playerIndex] || [];
            if (!askingPlayerHand.some(card => card.rank === data.rank)) {
                socket.emit('error', 'You can only ask for ranks you have in your hand');
                return;
            }
            
            // Find cards of the requested rank in target player's hand
            const targetPlayerHand = room.game.hands[data.targetPlayerIndex] || [];
            const requestedCards = targetPlayerHand.filter(card => card.rank === data.rank);
            
            if (requestedCards.length > 0) {
                // Target player has the cards - transfer them
                room.game.hands[data.targetPlayerIndex] = targetPlayerHand.filter(card => card.rank !== data.rank);
                room.game.hands[data.playerIndex] = [...askingPlayerHand, ...requestedCards];
                
                // Track cards obtained this turn for pair logic
                room.game.cardsObtainedThisTurn = [...(room.game.cardsObtainedThisTurn || []), ...requestedCards];
                
                // Check for pairs in asking player's hand after receiving cards
                const newHand = room.game.hands[data.playerIndex];
                const pairsFound = checkForPairs(newHand);
                if (pairsFound > 0) {
                    // Only automatically remove pairs for bots, not human players
                    if (askingPlayer.isBot) {
                        // Remove pairs from hand for bots
                        room.game.hands[data.playerIndex] = removePairs(newHand);
                        // Update pair count
                        askingPlayer.pairs = (askingPlayer.pairs || 0) + pairsFound;
                        console.log(`🎯 Bot ${askingPlayer.name} found ${pairsFound} pair(s) after receiving cards`);
                    } else {
                        // For human players, just count the pairs but don't remove them from hand
                        // They need to manually drag the pairs
                        console.log(`🎯 Human player ${askingPlayer.name} has ${pairsFound} pair(s) available - must drag manually`);
                    }
                }
                
                // Broadcast successful ask
                io.to(roomCode).emit('cardsGiven', {
                    askingPlayer: askingPlayer.name,
                    targetPlayer: targetPlayer.name,
                    rank: data.rank,
                    cardsGiven: requestedCards.length,
                    players: room.players.map((p, index) => ({
                        ...p,
                        hand: room.game.hands[index] || [],
                        pairs: p.pairs || 0
                    })),
                    currentPlayer: room.game.currentPlayer,
                    pairsFound: pairsFound
                });
                
                // Add delay before processing result for human players
                setTimeout(() => {
                    // Check if game is over after this action
                    if (checkGoFishGameOver(room)) {
                        return; // Game over handled by checkGoFishGameOver
                    }
                    
                    // Ask again if player got cards (Go Fish rule)
                    console.log(`🎯 ${askingPlayer.name} got cards - gets another turn`);
                    // Note: Turn doesn't advance - player gets another turn
                }, 4000); // 3 seconds delay before processing result
                
            } else {
                // Target player doesn't have the cards - Go Fish
                console.log(`🐟 ${askingPlayer.name} asked ${targetPlayer.name} for ${data.rank}s - Go Fish!`);
                
                // Add delay before go fish event for human players
                setTimeout(() => {
                    // Draw a card from pond
                    if (room.game.pond.length > 0) {
                        const drawnCard = room.game.pond.pop();
                        room.game.hands[data.playerIndex] = [...askingPlayerHand, drawnCard];
                        
                        // CRITICAL FIX: Check if the drawn card matches the rank they asked for
                        const cardMatchesAskedRank = drawnCard.rank === data.rank;
                        console.log(`🐟 Drawn card rank: ${drawnCard.rank}, Asked rank: ${data.rank}, Matches: ${cardMatchesAskedRank}`);
                        
                        // Check for pairs in the player's hand after fishing
                        const newHand = room.game.hands[data.playerIndex];
                        const pairsFound = checkForPairs(newHand);
                        if (pairsFound > 0) {
                            // Only automatically remove pairs for bots, not human players
                            if (askingPlayer.isBot) {
                                // Remove pairs from hand for bots
                                room.game.hands[data.playerIndex] = removePairs(newHand);
                                // Update pair count
                                askingPlayer.pairs = (askingPlayer.pairs || 0) + pairsFound;
                                console.log(`🎯 Bot ${askingPlayer.name} found ${pairsFound} pair(s) after fishing`);
                            } else {
                                // For human players, just count the pairs but don't remove them from hand
                                // They need to manually drag the pairs
                                console.log(`🎯 Human player ${askingPlayer.name} has ${pairsFound} pair(s) available after fishing - must drag manually`);
                            }
                        }
                        
                        // Debug logging
                        console.log('🐟 DEBUG goFish emission:');
                        console.log('🐟   askingPlayer.name:', askingPlayer.name);
                        console.log('🐟   room.game.currentPlayer:', room.game.currentPlayer);
                        console.log('🐟   room.players[room.game.currentPlayer]:', room.players[room.game.currentPlayer]?.name);
                        console.log('🐟   data.playerIndex:', data.playerIndex);
                        console.log('🐟   cardMatchesAskedRank:', cardMatchesAskedRank);
                        
                        console.log('🐟 EMITTING goFish event to room:', roomCode);
                        console.log('🐟 goFish event data:', {
                            askingPlayer: askingPlayer.name,
                            targetPlayer: targetPlayer.name,
                            rank: data.rank,
                            playerIndex: data.playerIndex,
                            targetPlayerIndex: data.targetPlayerIndex,
                            drawnCard: drawnCard,
                            currentPlayer: room.game.currentPlayer,
                            pairsFound: pairsFound,
                            cardMatchesAskedRank: cardMatchesAskedRank
                        });
                        
                        io.to(roomCode).emit('goFish', {
                            askingPlayer: askingPlayer.name,
                            targetPlayer: targetPlayer.name,
                            rank: data.rank,
                            playerIndex: data.playerIndex,
                            targetPlayerIndex: data.targetPlayerIndex,
                            drawnCard: drawnCard,
                            players: room.players.map((p, index) => ({
                                ...p,
                                hand: room.game.hands[index] || [],
                                pairs: p.pairs || 0
                            })),
                            pond: room.game.pond,
                            currentPlayer: room.game.currentPlayer,
                            pairsFound: pairsFound,
                            cardMatchesAskedRank: cardMatchesAskedRank
                        });
                        
                        console.log('🐟 goFish event emitted successfully');
                        
                        // Add another delay before processing result
                        setTimeout(() => {
                            console.log(`🐟 Processing Go Fish result for ${askingPlayer.name}`);
                            // CRITICAL FIX: Player only gets another turn if the card they fished matches the rank they asked for
                            // Even if pairs were found, if the card doesn't match, turn ends
                            if (cardMatchesAskedRank) {
                                console.log(`🎯 ${askingPlayer.name} fished the card they asked for (${data.rank}) - gets another turn`);
                                return; // Don't advance turn - player gets another turn
                            } else {
                                console.log(`🎯 ${askingPlayer.name} fished a different card (${drawnCard.rank} instead of ${data.rank}) - turn ends`);
                                // Turn ends even if pairs were found, because the card doesn't match
                            }
                            
                            // Check if game is over after this action
                            if (checkGoFishGameOver(room)) {
                                console.log(`🏆 Game over after Go Fish`);
                                return; // Game over handled by checkGoFishGameOver
                            }
                            
                            // Advance to next player
                            console.log(`🔄 Advancing turn after Go Fish for ${askingPlayer.name}`);
                            advanceTurn(roomCode, room);
                        }, 4000); // 3 seconds delay before processing result
                        
                    } else {
                        // Pond is empty - end turn
                        io.to(roomCode).emit('goFish', {
                            askingPlayer: askingPlayer.name,
                            targetPlayer: targetPlayer.name,
                            rank: data.rank,
                            playerIndex: data.playerIndex,
                            targetPlayerIndex: data.targetPlayerIndex,
                            drawnCard: null,
                            players: room.players.map((p, index) => ({
                                ...p,
                                hand: room.game.hands[index] || [],
                                pairs: p.pairs || 0
                            })),
                            pond: room.game.pond,
                            currentPlayer: room.game.currentPlayer
                        });
                        
                        // Add delay before advancing turn
                        setTimeout(() => {
                            // Check if game is over after this action
                            if (checkGoFishGameOver(room)) {
                                return; // Game over handled by checkGoFishGameOver
                            }
                            
                            // Advance to next player
                            advanceTurn(roomCode, room);
                        }, 4000); // 3 seconds delay before advancing turn
                    }
                }, 2500); // 2.5 seconds delay before go fish event
            }
            
        } catch (error) {
            console.error(`❌ Error in askForCards handler:`, error);
            socket.emit('error', 'Failed to process ask for cards');
        }
    });

    socket.on('goFish', (data) => {
        try {
            console.log(`🐟 Go fish event received:`, data);
            const roomCode = data.roomId;
            const room = rooms.get(roomCode);
            
            if (!room) {
                console.log(`❌ Room ${roomCode} not found for goFish`);
                socket.emit('error', 'Room not found');
                return;
            }
            
            if (!room.game) {
                console.log(`❌ No active game in room ${roomCode}`);
                socket.emit('error', 'No active game');
                return;
            }
            
            // Process go fish logic on server side
            const player = room.players[data.playerIndex];
            if (!player) {
                socket.emit('error', 'Invalid player index');
                return;
            }
            
            // Draw a card from pond
            if (room.game.pond.length > 0) {
                const drawnCard = room.game.pond.pop();
                room.game.hands[data.playerIndex] = [...(room.game.hands[data.playerIndex] || []), drawnCard];
                
                // Track card obtained this turn for pair logic
                room.game.cardsObtainedThisTurn = [...(room.game.cardsObtainedThisTurn || []), drawnCard];
                
                // Check for pairs in the player's hand after fishing
                const newHand = room.game.hands[data.playerIndex];
                const pairsFound = checkForPairs(newHand);
                if (pairsFound > 0) {
                    // Only automatically remove pairs for bots, not human players
                    if (player.isBot) {
                        // Remove pairs from hand for bots
                        room.game.hands[data.playerIndex] = removePairs(newHand);
                        // Update pair count
                        player.pairs = (player.pairs || 0) + pairsFound;
                        console.log(`🎯 Bot ${player.name} found ${pairsFound} pair(s) after fishing`);
                    } else {
                        // For human players, just count the pairs but don't remove them from hand
                        // They need to manually drag the pairs
                        console.log(`🎯 Human player ${player.name} has ${pairsFound} pair(s) available after fishing - must drag manually`);
                    }
                }
                
                // Broadcast go fish with drawn card
                io.to(roomCode).emit('goFish', {
                    player: player.name,
                    playerIndex: data.playerIndex,
                    drawnCard: drawnCard,
                    players: room.players.map((p, index) => ({
                        ...p,
                        hand: room.game.hands[index] || [],
                        pairs: p.pairs || 0
                    })),
                    pond: room.game.pond,
                    currentPlayer: room.game.currentPlayer,
                    pairsFound: pairsFound
                });
                
                // Add delay before processing result for human players
                setTimeout(() => {
                    // Check if game is over after this action
                    if (checkGoFishGameOver(room)) {
                        return; // Game over handled by checkGoFishGameOver
                    }
                    
                    // Only give another turn if pairs were found AND player is a bot (pairs auto-removed)
                    // For human players, they need to manually make pairs to get another turn
                    if (pairsFound > 0 && player.isBot) {
                        console.log(`🎯 Bot ${player.name} found pairs after fishing - gets another turn`);
                        return; // Don't advance turn
                    }
                    
                    // Advance to next player
                    advanceTurn(roomCode, room);
                }, 4000); // 3 seconds delay before processing result
            } else {
                // Pond is empty - end turn
                io.to(roomCode).emit('goFish', {
                    player: player.name,
                    playerIndex: data.playerIndex,
                    drawnCard: null,
                    players: room.players.map((p, index) => ({
                        ...p,
                        hand: room.game.hands[index] || [],
                        pairs: p.pairs || 0
                    })),
                    pond: room.game.pond,
                    currentPlayer: room.game.currentPlayer
                });
                
                // Add delay before advancing turn
                setTimeout(() => {
                    // Check if game is over after this action
                    if (checkGoFishGameOver(room)) {
                        return; // Game over handled by checkGoFishGameOver
                    }
                    
                    // Advance to next player
                    advanceTurn(roomCode, room);
                }, 4000); // 3 seconds delay before advancing turn
            }
            
        } catch (error) {
            console.error(`❌ Error in goFish handler:`, error);
            socket.emit('error', 'Failed to process go fish');
        }
    });

    socket.on('cardsGiven', (data) => {
        try {
            console.log(`🐟 Cards given event received:`, data);
            const roomCode = data.roomId;
            const room = rooms.get(roomCode);
            
            if (!room) {
                console.log(`❌ Room ${roomCode} not found for cardsGiven`);
                socket.emit('error', 'Room not found');
                return;
            }
            
            // Broadcast the cards given to all players in the room
            io.to(roomCode).emit('cardsGiven', {
                askingPlayer: data.askingPlayer,
                targetPlayer: data.targetPlayer,
                rank: data.rank,
                cardsGiven: data.cardsGiven,
                players: data.players,
                currentPlayer: data.currentPlayer
            });
            
        } catch (error) {
            console.error(`❌ Error in cardsGiven handler:`, error);
            socket.emit('error', 'Failed to process cards given');
        }
    });

    socket.on('turnChanged', (data) => {
        try {
            console.log(`🐟 Turn changed event received:`, data);
            const roomCode = data.roomId;
            const room = rooms.get(roomCode);
            
            if (!room) {
                console.log(`❌ Room ${roomCode} not found for turnChanged`);
                socket.emit('error', 'Room not found');
                return;
            }
            
            // Update server-side current player
            if (data.currentPlayer !== undefined) {
                room.game.currentPlayer = data.currentPlayer;
            }
            
            // Broadcast the turn change to all players in the room
            io.to(roomCode).emit('turnChanged', {
                currentPlayer: room.game.currentPlayer,
                players: room.players.map((p, index) => ({
                    ...p,
                    hand: room.game.hands[index] || [],
                    pairs: 0 // Will be calculated on client side
                }))
            });
            
            // Handle bot turns for Go Fish
            if (room.gameType === 'go-fish') {
                const currentPlayer = room.players[room.game.currentPlayer];
                if (currentPlayer && currentPlayer.isBot) {
                    console.log(`🤖 Go Fish bot ${currentPlayer.name} turn - will play in 3 seconds`);
                    setTimeout(() => {
                        handleGoFishBotTurn(roomCode, room);
                    }, 4000);
                }
            }
            
        } catch (error) {
            console.error(`❌ Error in turnChanged handler:`, error);
            socket.emit('error', 'Failed to process turn change');
        }
    });

    socket.on('gameOver', (data) => {
        try {
            console.log(`🐟 Game over event received:`, data);
            const roomCode = data.roomId;
            const room = rooms.get(roomCode);
            
            if (!room) {
                console.log(`❌ Room ${roomCode} not found for gameOver`);
                socket.emit('error', 'Room not found');
                return;
            }
            
            // Broadcast the game over to all players in the room
            io.to(roomCode).emit('gameOver', {
                winner: data.winner,
                finalScores: data.finalScores
            });
            
        } catch (error) {
            console.error(`❌ Error in gameOver handler:`, error);
            socket.emit('error', 'Failed to process game over');
        }
    });

    // Handle manual pair making by human players
    socket.on('makePair', (data) => {
        try {
            console.log(`🐟 Make pair event received:`, data);
            const roomCode = data.roomId;
            const room = rooms.get(roomCode);
            
            if (!room) {
                console.log(`❌ Room ${roomCode} not found for makePair`);
                socket.emit('error', 'Room not found');
                return;
            }
            
            if (!room.game) {
                console.log(`❌ No active game in room ${roomCode}`);
                socket.emit('error', 'No active game');
                return;
            }
            
            const player = room.players[data.playerIndex];
            if (!player || player.isBot) {
                socket.emit('error', 'Invalid player or bot cannot make pairs manually');
                return;
            }
            
            // Check if the pair contains a card obtained this turn
            const hand = room.game.hands[data.playerIndex] || [];
            const cardsToRemove = hand.filter(card => card.rank === data.rank);
            const cardsObtainedThisTurn = room.game.cardsObtainedThisTurn || [];
            
            // Check if any of the cards in the pair were obtained this turn
            const pairContainsCardFromThisTurn = cardsToRemove.some(card => 
                cardsObtainedThisTurn.some(obtainedCard => 
                    obtainedCard.rank === card.rank && obtainedCard.suit === card.suit
                )
            );
            
            // Update the player's pairs count
            player.pairs = (player.pairs || 0) + 1;
            
            if (cardsToRemove.length >= 2) {
                // Remove the first two cards of the matching rank
                const firstCardIndex = hand.findIndex(card => card.rank === data.rank);
                const secondCardIndex = hand.findIndex((card, index) => card.rank === data.rank && index > firstCardIndex);
                
                if (firstCardIndex !== -1 && secondCardIndex !== -1) {
                    // Remove the second card first (higher index) to avoid index shifting
                    hand.splice(secondCardIndex, 1);
                    hand.splice(firstCardIndex, 1);
                    console.log(`🎯 Removed pair of ${data.rank}s from server-side hand`);
                }
            }
            
            // Broadcast the pair made event
            io.to(roomCode).emit('pairMade', {
                player: player.name,
                playerIndex: data.playerIndex,
                rank: data.rank,
                players: room.players.map((p, index) => ({
                    ...p,
                    hand: room.game.hands[index] || [],
                    pairs: p.pairs || 0
                })),
                currentPlayer: room.game.currentPlayer
            });
            
            // Give another turn if:
            // 1. Pair contains a card obtained this turn, OR
            // 2. Pair is made from initial cards (cardsObtainedThisTurn is empty - start of turn)
            if (pairContainsCardFromThisTurn || cardsObtainedThisTurn.length === 0) {
                console.log(`🎯 ${player.name} made a pair - gets another turn`);
                // Don't advance turn - player gets to continue
            } else {
                console.log(`🎯 ${player.name} made a pair with old cards - advancing turn`);
                // Advance turn after a delay
                setTimeout(() => {
                    advanceTurn(roomCode, room);
                }, 2000);
            }
            
        } catch (error) {
            console.error(`❌ Error in makePair handler:`, error);
            socket.emit('error', 'Failed to process pair making');
        }
    });

    // Handle nickname change
    socket.on('changeNickname', (data) => {
        try {
            console.log(`🐟 Nickname change event received:`, data);
            // CRITICAL FIX: Support both roomCode and roomId for compatibility
            const roomCode = data.roomCode || data.roomId;
            const room = rooms.get(roomCode);
            
            if (!room) {
                console.log(`❌ Room ${roomCode} not found for changeNickname`);
                socket.emit('nicknameError', 'Room not found');
                return;
            }
            
            // CRITICAL FIX: Find player by socket.id (current socket) instead of data.playerId
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                const oldName = player.name;
                player.name = data.nickname;
                console.log(`🐟 Player ${socket.id} changed nickname from "${oldName}" to "${data.nickname}"`);
                
                // Broadcast the nickname change to all players in the room
                io.to(roomCode).emit('playersUpdated', room.players);
                
                // Emit success confirmation to the requesting player
                socket.emit('nicknameChanged', {
                    nickname: data.nickname,
                    playerId: socket.id
                });
            } else {
                console.log(`❌ Player ${socket.id} not found in room ${roomCode}`);
                socket.emit('nicknameError', 'Player not found in room');
            }
            
        } catch (error) {
            console.error(`❌ Error in changeNickname handler:`, error);
            socket.emit('nicknameError', 'Failed to process nickname change');
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
                        console.log(`🔍 DEBUG: Room ${socket.roomCode} is empty after disconnect, checking if game is active before deletion`);
                        console.log(`🔍 DEBUG: Room game state:`, room.game ? 'active' : 'none');
                        console.log(`🔍 DEBUG: Room game started:`, room.game?.started ? 'yes' : 'no');
                        
                        // ✅ CRITICAL FIX: Don't delete room if game is active
                        if (room.game && room.game.started) {
                            console.log(`⚠️ WARNING: Attempting to delete room ${socket.roomCode} during active game after disconnect - PREVENTING DELETION`);
                        } else {
                        rooms.delete(socket.roomCode);
                            console.log(`🗑️ Room ${socket.roomCode} deleted (empty and no active game after disconnect)`);
                        }
                    }
                } else {
                    console.log(`⚠️ Player disconnected during active game - keeping them in room`);
                }
            }
        }
    });

    // Handle game events
    socket.on('playCard', (data) => {
        console.log(`🃏 Card played with data:`, data);
        
        // ✅ CRITICAL FIX: Use room code from data or fallback to socket.roomCode
        const roomCode = data.roomCode || socket.roomCode;
        console.log(`🔍 DEBUG: Using room code: ${roomCode} (from data: ${data.roomCode}, from socket: ${socket.roomCode})`);
        console.log(`🔍 DEBUG: Socket ID: ${socket.id}`);
        console.log(`🔍 DEBUG: Available rooms:`, Array.from(rooms.keys()));
        
        if (!roomCode) {
            console.log(`❌ User ${socket.id} not in a room`);
            socket.emit('error', 'Not in a room');
            return;
        }
        
        const room = rooms.get(roomCode);
        if (!room) {
            console.log(`❌ Room ${roomCode} not found for card play`);
            console.log(`🔍 DEBUG: Available rooms:`, Array.from(rooms.keys()));
            console.log(`🔍 DEBUG: Room code used:`, roomCode);
            console.log(`🔍 DEBUG: Socket ID:`, socket.id);
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

        // ✅ CRITICAL FIX: Check if game is completed - silently ignore card plays if game is over
        if (room.game.gameCompleted) {
            console.log(`🏁 Game is completed - silently ignoring card play from ${player.name} (${socket.id}) (no error sent)`);
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
            
            // ✅ CRITICAL FIX: NO TOLERANCE - Strict turn validation for ALL players including bots
            console.log(`🚫 STRICT VALIDATION: Rejecting play attempt from ${room.players[clientPlayerIndex]?.name} - it's ${room.players[room.game.currentPlayer]?.name}'s turn`);
            socket.emit('error', 'Not your turn');
            return;
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
        console.log(`✅ ${targetPlayer.name} played ${playedCard.name} in room ${roomCode}`);
        
        // ✅ CRITICAL FIX: Reset roundJustCompleted flag only when the round winner starts playing
        if (room.game.roundJustCompleted && room.game.currentPlayer === clientPlayerIndex) {
            console.log(`🔄 Round winner ${targetPlayer.name} started playing - resetting roundJustCompleted flag`);
            room.game.roundJustCompleted = false;
            console.log(`🔍 DEBUG: roundJustCompleted flag reset - botTurnComplete events can now change turns`);
        }
        
        // ✅ CRITICAL FIX: Reset roundJustCompleted flag when any player plays a card in the new round
        // This ensures the flag is reset after the first card is played in the new round
        if (room.game.roundJustCompleted) {
            console.log(`🔄 First card played in new round - resetting roundJustCompleted flag`);
            room.game.roundJustCompleted = false;
            console.log(`🔍 DEBUG: roundJustCompleted flag reset after first card play in new round`);
        }
        
        // ✅ CRITICAL FIX: Reset roundWinnerStarting flag when the round winner starts playing
        if (room.game.roundWinnerStarting && room.game.currentPlayer === clientPlayerIndex) {
            console.log(`🔄 Round winner ${targetPlayer.name} started playing - resetting roundWinnerStarting flag`);
            room.game.roundWinnerStarting = false;
            console.log(`🔍 DEBUG: roundWinnerStarting flag reset - botTurnComplete events can now change turns`);
        }

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
        io.to(roomCode).emit('cardPlayed', {
            playerId: targetPlayer.id, // ✅ Use targetPlayer.id for bots
            playerName: targetPlayer.name, // ✅ Use targetPlayer.name for bots
            cardIndex: cardIndex,
            card: playedCard,
            playerIndex: clientPlayerIndex,
            allHands: room.game.hands, // Send updated hands to all players
            playedCards: cleanPlayedCards // Send clean, serializable played cards
        });

        // ✅ Log played cards state
        console.log(`🔍 DEBUG: Played cards count: ${room.game.playedCards.length}`);
        console.log(`🔍 DEBUG: Played cards details:`, room.game.playedCards.map(pc => ({
            player: pc.player.name,
            card: pc.card.name,
            playerIndex: pc.playerIndex
        })));
        
        // ✅ Check if round is complete (only when 4 cards are played)
        if (room.game.playedCards.length === 4) {
            console.log(`🏁 Round completion check triggered - 4 cards played!`);
            console.log(`🏁 Round complete in room ${roomCode}`);
            
            // ✅ UI FIX: Add delay to show cards on table before round completion
            console.log(`⏱️ Adding 3-second delay to show played cards before round completion`);
            setTimeout(() => {
                console.log(`🏁 Round completion delay finished - proceeding with round completion`);
                
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
            
            // ✅ CRITICAL FIX: Check for game winner with proper draw resolution logic
            if (roundWinner) {
                // Clear round winner - check if team has enough wins
                if (room.game.scores.team1 >= roundsToWin) {
                    gameWinner = 'team1';
                    console.log(`🎮 Team 1 wins the game!`);
                } else if (room.game.scores.team2 >= roundsToWin) {
                    gameWinner = 'team2';
                    console.log(`🎮 Team 2 wins the game!`);
                }
            }
            
            // ✅ CRITICAL FIX: Check draw resolution logic regardless of current round winner
            if (!gameWinner && currentRound === 2 && room.game.roundResults.length >= 2) {
                // Handle special case - Round 1 was draw, Round 2 has winner
                const firstRound = room.game.roundResults[0];
                const secondRound = room.game.roundResults[1];
                
                if (firstRound.isDraw && secondRound.winner) {
                    // Round 1 was draw, Round 2 has winner → Game ends immediately
                    gameWinner = secondRound.winner;
                    console.log(`🎮 Game ends due to draw resolution: Round 1 was draw, Round 2 winner (${secondRound.winner}) wins the game!`);
                } else if (!firstRound.isDraw && secondRound.isDraw) {
                    // Round 1 had winner, Round 2 is draw → Round 1 winner wins the game
                    gameWinner = firstRound.winner;
                    console.log(`🎮 Game ends due to draw resolution: Round 1 winner (${firstRound.winner}) wins due to Round 2 draw!`);
                }
            } else if (!gameWinner && currentRound === 3 && room.game.roundResults.length >= 3) {
                // ✅ CRITICAL FIX: Handle Round 3 draw resolution
                const firstRound = room.game.roundResults[0];
                const secondRound = room.game.roundResults[1];
                const thirdRound = room.game.roundResults[2];
                
                if (firstRound.isDraw && secondRound.isDraw && thirdRound.winner) {
                    // Both Round 1 and 2 were draws, Round 3 has winner → Round 3 winner wins
                    gameWinner = thirdRound.winner;
                    console.log(`🎮 Game ends due to draw resolution: Round 3 winner (${thirdRound.winner}) wins after Rounds 1&2 draws!`);
                } else if (firstRound.isDraw && !secondRound.isDraw && thirdRound.isDraw) {
                    // Round 1 draw, Round 2 had winner, Round 3 draw → Round 2 winner wins
                    gameWinner = secondRound.winner;
                    console.log(`🎮 Game ends due to draw resolution: Round 2 winner (${secondRound.winner}) wins after Round 3 draw!`);
                } else if (!firstRound.isDraw && !secondRound.isDraw && thirdRound.isDraw) {
                    // Round 1 had winner, Round 2 had winner, Round 3 draw → Round 1 winner wins
                    gameWinner = firstRound.winner;
                    console.log(`🎮 Game ends due to draw resolution: Round 1 winner (${firstRound.winner}) wins after Round 3 draw!`);
                } else if (!firstRound.isDraw && secondRound.isDraw && thirdRound.isDraw) {
                    // Round 1 had winner, Rounds 2&3 draws → Round 1 winner wins
                    gameWinner = firstRound.winner;
                    console.log(`🎮 Game ends due to draw resolution: Round 1 winner (${firstRound.winner}) wins after Rounds 2&3 draws!`);
                }
            }
            
            if (!gameWinner) {
                console.log(`🤝 Round ${currentRound} - game continues to next round`);
            }
            
            // ✅ CRITICAL FIX: If game is won, handle game completion separately
            if (gameWinner) {
                console.log(`🎮 Game won by ${gameWinner}, handling game completion...`);
                console.log(`🔍 DEBUG: Entering game completion block for ${gameWinner}`);
                
                // ✅ CRITICAL FIX: Store last round winner for next game
                room.lastRoundWinner = roundWinner;
                console.log(`🎯 Stored last round winner for next game: ${roundWinner.name}`);
                
                // ✅ CRITICAL FIX: Initialize games and sets tracking if not present
                if (!room.game.games) {
                    room.game.games = { team1: 0, team2: 0 };
                }
                if (!room.game.sets) {
                    room.game.sets = { team1: 0, team2: 0 };
                }
                
                // ✅ Use Truco game value if available, otherwise default to 1
                const gameValue = room.game.trucoState && room.game.trucoState.currentValue ? room.game.trucoState.currentValue : 1;
                console.log(`🔍 GAME VALUE DEBUG - trucoState exists: ${!!room.game.trucoState}, currentValue: ${room.game.trucoState?.currentValue}, calculated gameValue: ${gameValue}`);
                if (room.game.trucoState) {
                    console.log(`🔍 TRUCO STATE AT GAME COMPLETION:`, {
                        isActive: room.game.trucoState.isActive,
                        currentValue: room.game.trucoState.currentValue,
                        potentialValue: room.game.trucoState.potentialValue,
                        callerTeam: room.game.trucoState.callerTeam,
                        callerIndex: room.game.trucoState.callerIndex,
                        waitingForResponse: room.game.trucoState.waitingForResponse,
                        responsePlayerIndex: room.game.trucoState.responsePlayerIndex,
                        rejectionValue: room.game.trucoState.rejectionValue
                    });
                }
                
                if (gameWinner === 'team1') {
                    const oldGames = room.game.games.team1;
                    room.game.games.team1 += gameValue;
                    console.log(`🎮 Team 1 games increased by ${gameValue} from ${oldGames} to: ${room.game.games.team1}`);
                } else if (gameWinner === 'team2') {
                    const oldGames = room.game.games.team2;
                    room.game.games.team2 += gameValue;
                    console.log(`🎮 Team 2 games increased by ${gameValue} from ${oldGames} to: ${room.game.games.team2}`);
                }
                
                // ✅ CRITICAL FIX: Check for set wins (12 games = 1 set)
                let setWinner = null;
                console.log(`🔍 SET WIN CHECK DEBUG - Team1 games: ${room.game.games.team1}, Team2 games: ${room.game.games.team2}`);
                if (room.game.games.team1 >= 12) {
                    room.game.sets.team1++;
                    room.game.games.team1 = 0;
                    room.game.games.team2 = 0;
                    setWinner = 'team1';
                    console.log(`🏆 Team Alfa won the set! Total sets: ${room.game.sets.team1}. Games reset to 0.`);
                } else if (room.game.games.team2 >= 12) {
                    room.game.sets.team2++;
                    room.game.games.team1 = 0;
                    room.game.games.team2 = 0;
                    setWinner = 'team2';
                    console.log(`🏆 Team Beta won the set! Total sets: ${room.game.sets.team2}. Games reset to 0.`);
                } else {
                    console.log(`🔍 SET WIN CHECK DEBUG - No set win condition met (need 12 games)`);
                }
                
                // Clear played cards immediately for game winner
                room.game.playedCards = [];
                
                // ✅ CRITICAL FIX: Set game completed flag to prevent further botTurnComplete processing
                room.game.gameCompleted = true;
                console.log(`🏁 Game completed - set gameCompleted flag to prevent further bot actions`);
                
                // ✅ UI FIX: Add delay to show cards on table before game completion
                console.log(`⏱️ Adding 3-second delay to show played cards before game completion`);
                setTimeout(() => {
                    console.log(`🏁 Game completion delay finished - proceeding with game completion`);
                    
                    // Emit game complete event instead of round complete
                    console.log(`🔍 DEBUG: Emitting gameComplete event to room ${roomCode}`);
                    console.log(`🔍 DEBUG: gameComplete data:`, { roundWinner, scores: room.game.scores, games: room.game.games, sets: room.game.sets, gameWinner, setWinner });
                    io.to(roomCode).emit('gameComplete', {
                        roundWinner: roundWinner,
                        scores: room.game.scores,
                        games: room.game.games,
                        sets: room.game.sets,
                        gameWinner: gameWinner,
                        setWinner: setWinner
                    });
                    console.log(`🔍 DEBUG: gameComplete event emitted successfully`);
                
                // Start new game after 5 seconds
                console.log(`SERVER: Scheduling new game start in 5 seconds for room ${roomCode}. Game winner: ${gameWinner}`);
                console.log(`🔍 DEBUG: setTimeout scheduled for startNewGame`);
                setTimeout(() => {
                    console.log(`SERVER: Executing startNewGame for room ${roomCode}`);
                    console.log(`🔍 DEBUG: setTimeout callback executed, calling startNewGame`);
                    startNewGame(room, gameWinner, roomCode);
                }, 5000);
                
                }, 3000); // 3-second delay to show played cards before game completion
                
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
            console.log(`🔍 CRITICAL DEBUG: Round completion - roundWinner object:`, roundWinner);
            console.log(`🔍 CRITICAL DEBUG: Round completion - roundWinner.name: "${roundWinner.name}"`);
            console.log(`🔍 CRITICAL DEBUG: Round completion - roundWinner.team: "${roundWinner.team}"`);
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
                
                // ✅ CRITICAL FIX: Set a flag to prevent old botTurnComplete events from interfering
                room.game.roundWinnerStarting = true;
                console.log(`🔒 Set roundWinnerStarting flag to protect round winner from old botTurnComplete events`);
            }
            
            // ✅ CRITICAL FIX: Clear played cards BEFORE emitting roundComplete
            console.log(`🔄 Clearing played cards before round complete emission`);
            room.game.playedCards = [];
            
            // ✅ CRITICAL FIX: Set flag to prevent botTurnComplete from changing current player
            room.game.roundJustCompleted = true;
            console.log(`🔄 Set roundJustCompleted flag to prevent botTurnComplete from overriding round winner`);
            
            // ✅ CRITICAL FIX: Increment round counter to identify current round
            room.game.currentRound = (room.game.currentRound || 0) + 1;
            console.log(`🔄 Round counter incremented to: ${room.game.currentRound}`);
            
            // ✅ CRITICAL FIX: Reset rate limiting timestamp for new round
            room.game.lastBotTurnComplete = null;
            console.log(`🔄 Reset rate limiting timestamp for new round`);
            
            // ✅ Emit round complete event with scoring information (NO gameWinner for normal rounds)
            console.log(`🔍 DEBUG: Emitting roundComplete with currentPlayer: ${room.game.currentPlayer} (${room.players[room.game.currentPlayer]?.name})`);
            io.to(roomCode).emit('roundComplete', {
                currentPlayer: room.game.currentPlayer,
                allHands: room.game.hands,
                roundWinner: roundWinner,
                scores: room.game.scores,
                isDraw: !roundWinner
                // ✅ CRITICAL FIX: gameWinner is NOT sent with roundComplete
            });
            console.log(`✅ roundComplete event emitted with round winner: ${roundWinner ? roundWinner.name : 'Draw - no winner'} and currentPlayer: ${room.game.currentPlayer}`);
            
            // ✅ CRITICAL FIX: ALWAYS emit turnChanged after roundComplete to trigger bot play
            // This ensures bots get the turnChanged event they need to start playing
            console.log(`🔄 Round winner ${nextRoundStarter?.name} starts next round - emitting turnChanged to trigger bot play`);
            
            // ✅ UI FIX: Emit turnChanged immediately for round completion
            console.log(`🎯 Emitting turnChanged immediately for round completion`);
            console.log(`🔍 DEBUG: About to emit turnChanged for round completion with currentPlayer: ${room.game.currentPlayer} (${room.players[room.game.currentPlayer]?.name})`);
            console.log(`🔍 DEBUG: turnChanged event stack trace:`, new Error().stack);
            
            // ✅ CRITICAL DEBUG: Track roundComplete turnChanged emission
            const timestamp = new Date().toISOString();
            console.log(`🔍 CRITICAL DEBUG: [${timestamp}] ROUND COMPLETE turnChanged emission for ${nextRoundStarter?.name}`);
            console.log(`🔍 CRITICAL DEBUG: [${timestamp}] This turnChanged is for round completion`);
            
            console.log(`🔍 DEBUG: Emitting turnChanged event for round completion with currentPlayer: ${room.game.currentPlayer} (${room.players[room.game.currentPlayer]?.name})`);
            console.log(`🔍 DEBUG: Round completion turnChanged event stack trace:`, new Error().stack);
            console.log(`🔍 DEBUG: Round winner name: ${roundWinner?.name}`);
            console.log(`🔍 DEBUG: Round winner team: ${roundWinner?.team}`);
            console.log(`🔍 DEBUG: Next round starter name: ${nextRoundStarter?.name}`);
            console.log(`🔍 DEBUG: Next round starter isBot: ${nextRoundStarter?.isBot}`);
            io.to(roomCode).emit('turnChanged', {
                currentPlayer: room.game.currentPlayer,
                allHands: room.game.hands
            });
            
            console.log(`🔍 CRITICAL DEBUG: [${timestamp}] ROUND COMPLETE turnChanged event COMPLETED`);
            
            // ✅ CRITICAL FIX: Played cards already cleared before roundComplete emission
            // No need for delayed clearing as it's already done above
            }, 3000); // 3-second delay to show played cards before round completion
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
            console.log(`🔍 DEBUG: About to emit turnChanged for human player progression with currentPlayer: ${room.game.currentPlayer} (${room.players[room.game.currentPlayer]?.name})`);
            console.log(`🔍 DEBUG: turnChanged event stack trace:`, new Error().stack);
            
            // ✅ CRITICAL DEBUG: Track human player turnChanged emission
            const timestamp = new Date().toISOString();
            console.log(`🔍 CRITICAL DEBUG: [${timestamp}] HUMAN PLAYER turnChanged emission for ${targetPlayer.name}`);
            console.log(`🔍 CRITICAL DEBUG: [${timestamp}] This turnChanged is for human player progression`);
            console.log(`🔍 CRITICAL DEBUG: [${timestamp}] Human player turnChanged - currentPlayer: ${room.game.currentPlayer}`);
            console.log(`🔍 CRITICAL DEBUG: [${timestamp}] Human player turnChanged - player name: ${room.players[room.game.currentPlayer]?.name}`);
            console.log(`🔍 CRITICAL DEBUG: [${timestamp}] Human player turnChanged - player team: ${room.players[room.game.currentPlayer]?.team}`);
            
            // Emit turn change event with the new current player IMMEDIATELY
            console.log(`🔍 DEBUG: Emitting turnChanged event for human player progression with currentPlayer: ${room.game.currentPlayer} (${room.players[room.game.currentPlayer]?.name})`);
            console.log(`🔍 DEBUG: Human turnChanged event stack trace:`, new Error().stack);
            io.to(roomCode).emit('turnChanged', {
                currentPlayer: room.game.currentPlayer,
                allHands: room.game.hands
            });
            
            console.log(`🔍 CRITICAL DEBUG: [${timestamp}] HUMAN PLAYER turnChanged event COMPLETED`);
        }
        }

        console.log(`✅ Card played event emitted for user ${socket.id} in room ${roomCode}`);
    });

    // ✅ TEST: Handle test events to verify socket connection
    socket.on('testEvent', (data) => {
        console.log(`🧪 TEST EVENT received from socket ${socket.id}:`, data);
        // Send a response back to the client
        socket.emit('testResponse', { message: 'Server received your test event', timestamp: new Date().toISOString() });
    });

    // ✅ CRITICAL FIX: Handle bot turn completion to move to next player
    socket.on('botTurnComplete', (data) => {
        console.log(`🤖 Bot turn complete with data:`, data);
        
        // ✅ CRITICAL FIX: Use room code from data or fallback to socket.roomCode
        const roomCode = data.roomCode || socket.roomCode;
        console.log(`🔍 DEBUG: Using room code: ${roomCode} (from data: ${data.roomCode}, from socket: ${socket.roomCode})`);
        console.log(`🔍 DEBUG: botTurnComplete event received from socket ${socket.id}`);
        
        if (!roomCode) {
            console.log(`❌ User ${socket.id} not in a room`);
            return;
        }
        
        const room = rooms.get(roomCode);
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
        
        // ✅ CRITICAL FIX: Check if game is completed - silently ignore botTurnComplete if game is over
        if (room.game.gameCompleted) {
            console.log(`🏁 Game is completed - silently ignoring botTurnComplete from ${socket.id} (no error sent)`);
            return;
        }
        
        // ✅ CRITICAL FIX: Check if we're in a new round (after round completion)
        // If so, don't change the current player - the round winner should start
        if (room.game.roundJustCompleted) {
            console.log(`🔄 Round just completed - NOT changing current player, round winner should start`);
            console.log(`🔍 DEBUG: Current player remains: ${room.game.currentPlayer} (${room.players[room.game.currentPlayer]?.name})`);
            console.log(`🔍 DEBUG: botTurnComplete from socket: ${socket.id} - IGNORING to preserve round winner`);
            
            // ✅ CRITICAL FIX: Always ignore botTurnComplete when roundJustCompleted is true
            // The round winner should start the next round, not the next player in sequence
            console.log(`🔍 DEBUG: Ignoring botTurnComplete from previous round - round winner should start`);
            return; // Always return early - don't change current player
        }
        
        // ✅ CRITICAL FIX: Additional check - if the current player is a bot and it's their turn to start a new round
        // This prevents old botTurnComplete events from interfering with round winner logic
        const currentPlayer = room.players[room.game.currentPlayer];
        if (currentPlayer && currentPlayer.isBot && !currentPlayer.hasPlayedThisTurn) {
            console.log(`🤖 Bot ${currentPlayer.name} is starting a new round - ignoring botTurnComplete from previous round`);
            console.log(`🔍 DEBUG: This prevents old botTurnComplete events from changing the round starter`);
            return;
        }
        
        // ✅ CRITICAL FIX: Check if round winner is starting - protect them from old botTurnComplete events
        if (room.game.roundWinnerStarting) {
            console.log(`🔒 Round winner is starting - ignoring botTurnComplete to protect round winner`);
            console.log(`🔍 DEBUG: roundWinnerStarting flag is true - preventing turn change`);
            return;
        }
        
        // ✅ CRITICAL FIX: Check if this botTurnComplete is from a previous round
        // by checking if the current player is different from the bot that's completing their turn
        const botPlayerIndex = data.playerIndex;
        if (botPlayerIndex !== undefined && botPlayerIndex !== room.game.currentPlayer) {
            console.log(`⚠️ botTurnComplete from wrong player - bot ${botPlayerIndex} completing turn but current player is ${room.game.currentPlayer}`);
            console.log(`🔍 DEBUG: This is likely from a previous round - ignoring`);
            return;
        }
        
        // ✅ CRITICAL FIX: Check if this botTurnComplete is from a previous round using round number
        const eventRoundNumber = data.roundNumber;
        const currentRoundNumber = room.game.currentRound || 0;
        if (eventRoundNumber !== undefined && eventRoundNumber < currentRoundNumber) {
            console.log(`⚠️ botTurnComplete from previous round - event round ${eventRoundNumber} but current round is ${currentRoundNumber}`);
            console.log(`🔍 DEBUG: Ignoring old botTurnComplete event from previous round`);
            return;
        }
        
        // ✅ CRITICAL FIX: Additional check - if the current player is a bot starting a new round
        // and this botTurnComplete is from a different bot, ignore it
        if (currentPlayer && currentPlayer.isBot && !currentPlayer.hasPlayedThisTurn) {
            const completingBotIndex = data.playerIndex;
            if (completingBotIndex !== undefined && completingBotIndex !== room.game.currentPlayer) {
                console.log(`🤖 Bot ${currentPlayer.name} is starting new round - ignoring botTurnComplete from Bot ${completingBotIndex}`);
                console.log(`🔍 DEBUG: This prevents old botTurnComplete events from changing the round starter`);
                return;
            }
        }
        
        // ✅ CRITICAL FIX: If current player is a bot that hasn't played yet, don't change turns
        // This prevents old botTurnComplete events from interfering with round winner
        if (currentPlayer && currentPlayer.isBot && !currentPlayer.hasPlayedThisTurn) {
            console.log(`🤖 Bot ${currentPlayer.name} hasn't played yet in new round - ignoring botTurnComplete`);
            console.log(`🔍 DEBUG: This ensures round winner gets to start the round`);
            return;
        }
        
        // ✅ CRITICAL FIX: Additional check - if the current player is a bot and this botTurnComplete
        // is from a different bot, it's likely from a previous round - ignore it
        const completingBotIndex = data.playerIndex;
        if (completingBotIndex !== undefined && completingBotIndex !== room.game.currentPlayer) {
            console.log(`⚠️ botTurnComplete from different bot (${completingBotIndex}) than current player (${room.game.currentPlayer})`);
            console.log(`🔍 DEBUG: This is likely from a previous round - ignoring to protect round winner`);
            return;
        }
        
        // ✅ CRITICAL FIX: If the current player is a bot that should be starting a new round,
        // and this botTurnComplete is from a different bot, ignore it completely
        if (currentPlayer && currentPlayer.isBot && !currentPlayer.hasPlayedThisTurn && 
            completingBotIndex !== undefined && completingBotIndex !== room.game.currentPlayer) {
            console.log(`🤖 Bot ${currentPlayer.name} should start new round - ignoring botTurnComplete from Bot ${completingBotIndex}`);
            console.log(`🔍 DEBUG: This prevents old botTurnComplete events from changing the round starter`);
            return;
        }
        
        // ✅ Move to next player after bot turn is complete
        const previousPlayer = room.game.currentPlayer;
        console.log(`🔍 DEBUG: botTurnComplete processing - previousPlayer: ${previousPlayer} (${room.players[previousPlayer]?.name})`);
        
        // ✅ CRITICAL FIX: Use team-based alternating turn order
        const newPlayer = getNextPlayerFromOppositeTeam(room.players, room.game.currentPlayer);
        console.log(`🔍 DEBUG: getNextPlayerFromOppositeTeam returned: ${newPlayer} (${room.players[newPlayer]?.name})`);
        
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
        
        // ✅ CRITICAL TEST: Send a test event first (REMOVED - was interfering with game flow)
        // console.log(`🧪 TEST: Sending testTurnChanged event to room ${roomCode}`);
        // io.to(roomCode).emit('testTurnChanged', {
        //     message: 'Test event from server',
        //     currentPlayer: room.game.currentPlayer
        // });

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
        console.log(`🎯 Adding 1.5-second delay for visual pacing to match client timing`);
        
        setTimeout(() => {
        // Emit turn change event with the new current player
        console.log(`🔍 DEBUG: Emitting turnChanged event with currentPlayer: ${room.game.currentPlayer} (${room.players[room.game.currentPlayer]?.name})`);
        console.log(`🔍 DEBUG: turnChanged event will be sent to room: ${roomCode}`);
        console.log(`🔍 DEBUG: turnChanged event stack trace:`, new Error().stack);
        console.log(`🔍 CRITICAL DEBUG: [${timestamp}] botTurnComplete turnChanged event - currentPlayer: ${room.game.currentPlayer}`);
        console.log(`🔍 CRITICAL DEBUG: [${timestamp}] botTurnComplete turnChanged event - player name: ${room.players[room.game.currentPlayer]?.name}`);
        console.log(`🔍 CRITICAL DEBUG: [${timestamp}] botTurnComplete turnChanged event - player team: ${room.players[room.game.currentPlayer]?.team}`);
        io.to(roomCode).emit('turnChanged', {
            currentPlayer: room.game.currentPlayer,
            allHands: room.game.hands
        });
        console.log(`✅ turnChanged event emitted successfully to room ${roomCode}`);
        console.log(`🔍 CRITICAL DEBUG: [${timestamp}] botTurnComplete turnChanged event COMPLETED`);
        }, 1500); // 1.5-second delay for visual pacing to match client timing
    });

    // ✅ Handle Truco requests with proper game logic
    socket.on('requestTruco', (data) => {
        console.log(`🎯 Truco requested with data:`, data);
        
        // ✅ CRITICAL FIX: Use room code from data or fallback to socket.roomCode
        const roomCode = data.roomCode || socket.roomCode;
        console.log(`🔍 DEBUG: Using room code: ${roomCode} (from data: ${data.roomCode}, from socket: ${socket.roomCode})`);
        console.log(`🔍 DEBUG: Socket ID: ${socket.id}`);
        console.log(`🔍 DEBUG: Available rooms:`, Array.from(rooms.keys()));
        
        if (!roomCode) {
            console.log(`❌ User ${socket.id} not in a room and no room code provided`);
            socket.emit('error', 'Not in a room');
            return;
        }
        
        const room = rooms.get(roomCode);
        if (!room) {
            console.log(`❌ Room ${roomCode} not found for Truco request`);
            console.log(`🔍 DEBUG: Available rooms:`, Array.from(rooms.keys()));
            socket.emit('error', 'Room not found');
            return;
        }

        // ✅ CRITICAL FIX: Check if game is completed - silently ignore Truco calls if game is over
        if (room.game.gameCompleted) {
            console.log(`🏁 Game is completed - silently ignoring Truco request from ${socket.id} (no error sent)`);
            return;
        }

        if (!room.game) {
            console.log(`❌ No active game in room ${roomCode}`);
            socket.emit('error', 'No active game');
            return;
        }

        // ✅ Validate it's the player's turn (handle both human and bot requests)
        let playerIndex = -1;
        let requestingPlayer = null;
        
        // ✅ PRIORITY: Check if this is a bot request first (botPlayerIndex provided)
        if (data.botPlayerIndex !== undefined) {
            // Bot request (sent from human player's socket)
            const botPlayer = room.players[data.botPlayerIndex];
            if (botPlayer && botPlayer.isBot) {
                playerIndex = data.botPlayerIndex;
                requestingPlayer = botPlayer;
                console.log(`🤖 Bot ${botPlayer.name} requesting Truco via human socket (index: ${data.botPlayerIndex})`);
            } else {
                console.log(`❌ Invalid Truco request - botPlayerIndex ${data.botPlayerIndex} is not a bot`);
                socket.emit('error', 'Invalid bot request');
                return;
            }
        } else {
            // Human player request
        const player = room.players.find(p => p.id === socket.id);
            if (player) {
                playerIndex = room.players.indexOf(player);
                requestingPlayer = player;
                console.log(`🎯 Human player ${player.name} requesting Truco`);
            } else {
                console.log(`❌ Invalid Truco request - no player found for socket`);
                socket.emit('error', 'Invalid request');
            return;
            }
        }

        // ✅ CRITICAL DEBUG: Log Truco request validation details
        console.log(`🔍 TRUCO REQUEST DEBUG - Current player: ${room.game.currentPlayer}`);
        console.log(`🔍 TRUCO REQUEST DEBUG - Player index: ${playerIndex}`);
        console.log(`🔍 TRUCO REQUEST DEBUG - Requesting player: ${requestingPlayer?.name}`);
        console.log(`🔍 TRUCO REQUEST DEBUG - Is current player? ${room.game.currentPlayer === playerIndex}`);
        console.log(`🔍 TRUCO REQUEST DEBUG - Room players: [${room.players.map(p => `${p.name}(${p.isBot ? 'bot' : 'human'})`).join(', ')}]`);
        console.log(`🔍 TRUCO REQUEST DEBUG - Current player name: ${room.players[room.game.currentPlayer]?.name}`);
        console.log(`🔍 TRUCO REQUEST DEBUG - Round just completed: ${room.game.roundJustCompleted}`);
        console.log(`🔍 TRUCO REQUEST DEBUG - Round winner starting: ${room.game.roundWinnerStarting}`);
        
        if (room.game.currentPlayer !== playerIndex) {
            console.log(`❌ Player ${requestingPlayer?.name} tried to call Truco out of turn`);
            console.log(`❌ Expected current player: ${room.game.currentPlayer}, got: ${playerIndex}`);
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
        
        // ✅ Initialize round counter if not already set
        if (!room.game.currentRound) {
            room.game.currentRound = 0;
        }

        // ✅ Check if Truco is already active and this is not a raise
        if (room.game.trucoState.isActive && room.game.trucoState.waitingForResponse) {
            // This is a raise - allow it to proceed
            console.log(`📈 Truco raise attempt by ${requestingPlayer.name}`);
        } else if (room.game.trucoState.isActive && !room.game.trucoState.waitingForResponse) {
            console.log(`❌ Truco is already active in room ${roomCode}`);
            socket.emit('error', 'Truco already active');
            return;
        }
        
        // ✅ CRITICAL FIX: Proper Truco calling rules
        // 1. If no Truco has been called yet (callerIndex is null), anyone can call
        // 2. If Truco was called but not accepted yet (isActive = true), no one can call again
        // 3. If Truco was accepted (isActive = false, currentValue > 1), only opposite team can raise
        
        if (room.game.trucoState.callerIndex !== null) {
            // Truco has been called before
            if (room.game.trucoState.isActive) {
                // Truco is currently active (waiting for response), no one can call again
                console.log(`❌ Truco is currently active - no one can call Truco again`);
                socket.emit('error', 'Truco is currently active - wait for response');
                return;
            } else if (room.game.trucoState.currentValue > 1) {
                // Truco was accepted, only opposite team can raise
                console.log(`🔍 TRUCO RAISE VALIDATION DEBUG:`);
                console.log(`🔍 - requestingPlayer.team: ${requestingPlayer.team}`);
                console.log(`🔍 - callerTeam: ${room.game.trucoState.callerTeam}`);
                console.log(`🔍 - currentValue: ${room.game.trucoState.currentValue}`);
                console.log(`🔍 - potentialValue: ${room.game.trucoState.potentialValue}`);
                console.log(`🔍 - callerIndex: ${room.game.trucoState.callerIndex}`);
                console.log(`🔍 - callerName: ${room.players[room.game.trucoState.callerIndex]?.name}`);
                
                if (room.game.trucoState.callerTeam === requestingPlayer.team) {
                    console.log(`❌ Team ${requestingPlayer.team} cannot raise - only opposite team can raise`);
                    socket.emit('error', 'Your team cannot raise - only the opposite team can raise');
                    return;
                }
            } else {
                // Truco was rejected, anyone can call again
                console.log(`✅ Previous Truco was rejected - ${requestingPlayer.name} can call Truco again`);
            }
        }

        // Check if this is a raise (Truco was already called and waiting for response)
        const isRaise = room.game.trucoState.isActive && room.game.trucoState.callerTeam !== null;
        
        // ✅ Start Truco or Raise
        room.game.trucoState.isActive = true;
        
        if (isRaise) {
            // ✅ CRITICAL FIX: Check if we can raise further (max 12 games)
            if (room.game.trucoState.potentialValue >= 12) {
                console.log(`❌ Cannot raise Truco above 12 games - current value: ${room.game.trucoState.potentialValue}`);
                socket.emit('error', 'Cannot raise Truco above 12 games');
                return;
            }
            
            // This is a raise - increase potential value and update caller
            if (room.game.trucoState.potentialValue === 3) {
                room.game.trucoState.potentialValue = 6;
            } else if (room.game.trucoState.potentialValue === 6) {
                room.game.trucoState.potentialValue = 9;
            } else if (room.game.trucoState.potentialValue === 9) {
                room.game.trucoState.potentialValue = 12;
            }
            // ✅ CRITICAL FIX: Update caller team and index when raising
            console.log(`🔍 TRUCO RAISE DEBUG - Before update:`);
            console.log(`🔍 - Old callerTeam: ${room.game.trucoState.callerTeam}`);
            console.log(`🔍 - Old callerIndex: ${room.game.trucoState.callerIndex}`);
            console.log(`🔍 - New callerTeam: ${requestingPlayer.team}`);
            console.log(`🔍 - New callerIndex: ${playerIndex}`);
            
            room.game.trucoState.callerTeam = requestingPlayer.team;
            room.game.trucoState.callerIndex = playerIndex;
            
            console.log(`🔍 TRUCO RAISE DEBUG - After update:`);
            console.log(`🔍 - callerTeam: ${room.game.trucoState.callerTeam}`);
            console.log(`🔍 - callerIndex: ${room.game.trucoState.callerIndex}`);
            console.log(`📈 Truco raised to ${room.game.trucoState.potentialValue} games by ${requestingPlayer.name} (team: ${requestingPlayer.team})`);
        } else {
            // This is an initial Truco call
            room.game.trucoState.currentValue = 1;
            room.game.trucoState.potentialValue = 3;
            room.game.trucoState.callerTeam = requestingPlayer.team;
            room.game.trucoState.callerIndex = playerIndex;
            room.game.trucoState.rejectionValue = 1; // ✅ CRITICAL FIX: Set rejection value for initial Truco call
            console.log(`🎯 Initial Truco called by ${requestingPlayer.name}`);
        }
        
        room.game.trucoState.waitingForResponse = true;

        // ✅ CRITICAL FIX: Find next player in turn order for response (not just opposite team)
        console.log(`🔍 TRUCO CALL DEBUG - Caller: ${requestingPlayer.name} (${playerIndex}) from team ${requestingPlayer.team}`);
        console.log(`🔍 TRUCO CALL DEBUG - All Players:`, room.players.map((p, i) => `${i}: ${p.name} (${p.team})`));
        
        // Find the next player in turn order (clockwise) to respond to Truco
        let nextPlayerIndex = -1;
        for (let i = 1; i < 4; i++) {
            const checkIndex = (playerIndex + i) % 4;
            nextPlayerIndex = checkIndex;
            break;
        }
        
        room.game.trucoState.responsePlayerIndex = nextPlayerIndex;

        console.log(`🎯 Truco called by ${requestingPlayer.name} (${requestingPlayer.team}) for 3 games`);
        console.log(`🎯 Next player to respond: ${room.players[nextPlayerIndex].name} (${room.players[nextPlayerIndex].team})`);
        console.log(`🔍 TRUCO CALL DEBUG - Final responsePlayerIndex: ${nextPlayerIndex}`);

        // ✅ Emit Truco called/raised event to all players
        const eventName = isRaise ? 'trucoRaised' : 'trucoCalled';
        const eventData = {
            caller: socket.id,
            callerName: requestingPlayer.name,
            callerTeam: requestingPlayer.team,
            currentValue: room.game.trucoState.currentValue,
            potentialValue: room.game.trucoState.potentialValue,
            responsePlayerIndex: nextPlayerIndex,
            responsePlayerName: room.players[nextPlayerIndex].name,
            roomCode: roomCode
        };
        
        if (isRaise) {
            eventData.newPotentialValue = room.game.trucoState.potentialValue;
            // ✅ CRITICAL FIX: For trucoRaised events, also include raiserName for client compatibility
            eventData.raiserName = requestingPlayer.name;
            eventData.raiserTeam = requestingPlayer.team;
        }
        
        io.to(roomCode).emit(eventName, eventData);

        console.log(`✅ Truco called event emitted for user ${socket.id} in room ${roomCode}`);

        // ✅ Bot responses are handled client-side via the trucoCalled event
        // This ensures consistency with other bot actions and prevents double responses
    });

    // ✅ Helper function to process Truco responses (used by both client and server-side bot responses)
    function processTrucoResponse(socket, data, room, roomCode) {
        try {
            console.log(`🎯 Processing Truco response in room: ${roomCode}`, data);
            
            if (!room || !room.game || !room.game.trucoState) {
                console.log(`❌ No active Truco in room ${roomCode}`);
            return;
        }
        
        // ✅ Validate it's the response player's turn (handle both human and bot responses)
        let playerIndex = -1;
        let respondingPlayer = null;
        
        // ✅ PRIORITY: Check if this is a bot response first (botPlayerIndex provided)
        if (data.botPlayerIndex !== undefined) {
            // Bot response (sent from human player's socket)
            const botPlayer = room.players[data.botPlayerIndex];
            if (botPlayer && botPlayer.isBot) {
                playerIndex = data.botPlayerIndex;
                respondingPlayer = botPlayer;
                console.log(`🤖 Bot ${botPlayer.name} responding to Truco via human socket (index: ${data.botPlayerIndex})`);
            } else {
                console.log(`❌ Invalid Truco response - botPlayerIndex ${data.botPlayerIndex} is not a bot`);
            return;
            }
        } else {
            // Human player response
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                playerIndex = room.players.indexOf(player);
                respondingPlayer = player;
                console.log(`🎯 Human player ${player.name} responding to Truco`);
            } else {
                console.log(`❌ Invalid Truco response - no player found for socket`);
                return;
            }
        }
        
        // ✅ COMPREHENSIVE DEBUGGING
        console.log(`🔍 TRUCO DEBUG - Player: ${respondingPlayer.name} (${playerIndex})`);
        console.log(`🔍 TRUCO DEBUG - Truco State:`, {
            waitingForResponse: room.game.trucoState.waitingForResponse,
            responsePlayerIndex: room.game.trucoState.responsePlayerIndex,
            currentValue: room.game.trucoState.currentValue,
            potentialValue: room.game.trucoState.potentialValue,
            callerIndex: room.game.trucoState.callerIndex,
            callerTeam: room.game.trucoState.callerTeam
        });
        console.log(`🔍 TRUCO DEBUG - All Players:`, room.players.map((p, i) => `${i}: ${p.name} (${p.team})`));
        
        // ✅ CRITICAL FIX: Check if Truco is still waiting for response
        if (!room.game.trucoState.waitingForResponse) {
            console.log(`❌ Truco is not waiting for response`);
            return;
        }
        
        if (room.game.trucoState.responsePlayerIndex !== playerIndex) {
            console.log(`❌ Player ${respondingPlayer.name} tried to respond to Truco out of turn`);
            console.log(`❌ Expected response player index: ${room.game.trucoState.responsePlayerIndex}, got: ${playerIndex}`);
            console.log(`❌ Expected response player: ${room.players[room.game.trucoState.responsePlayerIndex]?.name}`);
            return;
        }

        const response = data.response; // 1 = accept, 2 = reject, 3 = raise
        console.log(`🎯 ${respondingPlayer.name} responded to Truco: ${response === 1 ? 'Accept' : response === 2 ? 'Reject' : 'Raise'}`);

        if (response === 1) {
            // ✅ Accept Truco
            room.game.trucoState.currentValue = room.game.trucoState.potentialValue;
            room.game.trucoState.rejectionValue = room.game.trucoState.potentialValue; // ✅ CRITICAL FIX: Update rejection value when Truco is accepted
            room.game.trucoState.isActive = false;
            room.game.trucoState.waitingForResponse = false;
            room.game.trucoState.responsePlayerIndex = null; // ✅ CRITICAL FIX: Clear response player
            
            // ✅ CRITICAL FIX: Keep callerTeam as the original caller's team
            // The original caller's team cannot raise, the accepter's team can raise
            console.log(`🔍 TRUCO ACCEPTANCE DEBUG - Keeping callerTeam as original caller: ${room.game.trucoState.callerTeam}`);
            // Don't update callerTeam - keep it as the original caller's team

            console.log(`✅ Truco accepted! Game now worth ${room.game.trucoState.currentValue} games`);
            console.log(`🔍 TRUCO ACCEPTANCE DEBUG - currentValue: ${room.game.trucoState.currentValue}, potentialValue: ${room.game.trucoState.potentialValue}, rejectionValue: ${room.game.trucoState.rejectionValue}`);
            console.log(`🔍 TRUCO ACCEPTANCE DEBUG - callerTeam updated to: ${room.game.trucoState.callerTeam}, callerIndex: ${room.game.trucoState.callerIndex}`);

            // ✅ CRITICAL FIX: After Truco acceptance, the CALLER should continue playing
            // The person who called Truco should continue, not the person who accepted
            room.game.currentPlayer = room.game.trucoState.callerIndex;
            console.log(`🎯 After Truco acceptance, caller ${room.players[room.game.trucoState.callerIndex]?.name} will continue playing (index ${room.game.trucoState.callerIndex})`);

            // ✅ CRITICAL FIX: Emit turnChanged event after Truco acceptance to sync client state
            console.log(`🔄 Emitting turnChanged after Truco acceptance - currentPlayer: ${room.game.currentPlayer}`);
            io.to(roomCode).emit('turnChanged', {
                currentPlayer: room.game.currentPlayer,
                allHands: room.players.map(p => p.hand)
            });

            // ✅ Emit Truco accepted event
            io.to(roomCode).emit('trucoAccepted', {
                accepter: socket.id,
                accepterName: respondingPlayer.name,
                accepterTeam: respondingPlayer.team,
                newGameValue: room.game.trucoState.currentValue,
                roomCode: roomCode
            });

        } else if (response === 2) {
            // ✅ Reject Truco
            // ✅ CRITICAL FIX: The team that raised (current callerTeam) should win when rejected
            const winningTeam = room.game.trucoState.callerTeam;
            const winningTeamName = winningTeam === 'team1' ? 'Team Alfa' : 'Team Beta';
            
            // ✅ CRITICAL DEBUG: Log Truco rejection details
            console.log(`🔍 DEBUG: Truco rejection - callerTeam: ${room.game.trucoState.callerTeam}`);
            console.log(`🔍 DEBUG: Truco rejection - callerIndex: ${room.game.trucoState.callerIndex}`);
            console.log(`🔍 DEBUG: Truco rejection - caller: ${room.players[room.game.trucoState.callerIndex]?.name}`);
            console.log(`🔍 DEBUG: Truco rejection - winningTeam: ${winningTeam}`);
            console.log(`🔍 DEBUG: Truco rejection - winningTeamName: ${winningTeamName}`);
            
            // ✅ CRITICAL FIX: Use rejectionValue if available, otherwise fall back to currentValue
            const gameValue = room.game.trucoState.rejectionValue !== undefined ? 
                room.game.trucoState.rejectionValue : 
                room.game.trucoState.currentValue;
            console.log(`🔍 TRUCO REJECTION DEBUG - currentValue: ${room.game.trucoState.currentValue}, potentialValue: ${room.game.trucoState.potentialValue}, rejectionValue: ${room.game.trucoState.rejectionValue}`);
            console.log(`🔍 TRUCO REJECTION DEBUG - Awarding ${gameValue} games (using ${room.game.trucoState.rejectionValue !== undefined ? 'rejectionValue' : 'currentValue'})`);
            
            room.game.trucoState.isActive = false;
            room.game.trucoState.waitingForResponse = false;
            room.game.trucoState.responsePlayerIndex = null; // ✅ CRITICAL FIX: Clear response player

            console.log(`❌ Truco rejected! ${winningTeamName} wins with ${gameValue} games`);

            // ✅ CRITICAL FIX: End game immediately when Truco is rejected
            // Update game scores
            if (!room.game.games) {
                room.game.games = { team1: 0, team2: 0 };
            }
            
            // ✅ CRITICAL FIX: When Truco is rejected, award the CURRENT VALUE
            // If Truco was called and rejected immediately: currentValue = 1
            // If Truco was accepted: currentValue = 3
            // If Truco was raised after acceptance: currentValue = 6, 9, or 12
            // gameValue already declared above
            
            if (winningTeam === 'team1') {
                room.game.games.team1 += gameValue;
                console.log(`🎮 Team 1 games increased by ${gameValue} to: ${room.game.games.team1}`);
            } else if (winningTeam === 'team2') {
                room.game.games.team2 += gameValue;
                console.log(`🎮 Team 2 games increased by ${gameValue} to: ${room.game.games.team2}`);
            }

            // ✅ Emit Truco rejected event
            io.to(roomCode).emit('trucoRejected', {
                rejecter: socket.id,
                rejecterName: respondingPlayer.name,
                rejecterTeam: respondingPlayer.team,
                winningTeam: winningTeam,
                winningTeamName: winningTeamName,
                gameValue: gameValue,
                roomCode: roomCode
            });

            // ✅ Emit game complete event for Truco rejection
            io.to(roomCode).emit('gameComplete', {
                roundWinner: null, // No round winner in Truco rejection
                scores: room.game.scores,
                games: room.game.games,
                gameWinner: winningTeam,
                trucoRejected: true // Flag to indicate this was a Truco rejection
            });

            // ✅ Start new game after 3 seconds
            setTimeout(() => {
                console.log(`🔍 DEBUG: About to call startNewGame with winningTeam: ${winningTeam}`);
                console.log(`🔍 DEBUG: Room state before startNewGame:`, {
                    roomCode: roomCode,
                    gameStarted: room.game?.started,
                    games: room.game?.games,
                    players: room.players.map(p => ({ name: p.name, team: p.team }))
                });
                
                // ✅ CRITICAL DEBUG: Check if winningTeam is correct
                console.log(`🔍 DEBUG: winningTeam value: "${winningTeam}"`);
                console.log(`🔍 DEBUG: winningTeam type: ${typeof winningTeam}`);
                console.log(`🔍 DEBUG: winningTeam === 'team1': ${winningTeam === 'team1'}`);
                console.log(`🔍 DEBUG: winningTeam === 'team2': ${winningTeam === 'team2'}`);
                
                startNewGame(room, winningTeam, roomCode);
                console.log(`🔍 DEBUG: startNewGame call completed`);
            }, 4000);

        } else if (response === 3) {
            // ✅ Raise Truco - Handle raise in processTrucoResponse
            console.log(`📈 ${respondingPlayer.name} raised Truco to ${room.game.trucoState.potentialValue + 3} games`);
            
            // ✅ CRITICAL FIX: Only update potential value on raise, NOT current value
            // currentValue should only be updated when someone accepts the Truco
            const oldPotentialValue = room.game.trucoState.potentialValue;
            room.game.trucoState.potentialValue += 3;
            console.log(`🔍 TRUCO RAISE DEBUG - potentialValue: ${oldPotentialValue} → ${room.game.trucoState.potentialValue}, currentValue unchanged: ${room.game.trucoState.currentValue}`);
            
            // ✅ CRITICAL FIX: Store the value that was active when the next responder was asked to respond
            // This is the value they should get if they reject
            room.game.trucoState.rejectionValue = oldPotentialValue;
            console.log(`🔍 TRUCO RAISE DEBUG - Set rejectionValue to: ${room.game.trucoState.rejectionValue} (the value active when next responder was asked)`);
            
            // ✅ CRITICAL FIX: Find next player to respond (back-and-forth between caller and opposite team)
            let nextPlayerIndex = -1;
            
            // If the current responder is from the opposite team, go back to the caller
            if (respondingPlayer.team !== room.game.trucoState.callerTeam) {
                nextPlayerIndex = room.game.trucoState.callerIndex;
                console.log(`📈 Raise by opposite team - going back to caller: ${room.players[nextPlayerIndex].name}`);
            } else {
                // If the current responder is the caller, go to the next opposite team player
                for (let i = 1; i < 4; i++) {
                    const checkIndex = (room.game.trucoState.callerIndex + i) % 4;
                    const checkPlayer = room.players[checkIndex];
                    if (checkPlayer.team !== room.game.trucoState.callerTeam) {
                        nextPlayerIndex = checkIndex;
                        break;
                    }
                }
                console.log(`📈 Raise by caller - going to opposite team: ${room.players[nextPlayerIndex].name}`);
            }
            
            const nextPlayer = room.players[nextPlayerIndex];
            
            // Update response player
            room.game.trucoState.responsePlayerIndex = nextPlayerIndex;
            room.game.trucoState.waitingForResponse = true;
            
            console.log(`📈 Truco raised to ${room.game.trucoState.potentialValue} games. Next to respond: ${nextPlayer.name}`);
            
            // Emit trucoRaised event
            io.to(roomCode).emit('trucoRaised', {
                raiser: socket.id,
                raiserName: respondingPlayer.name,
                raiserTeam: respondingPlayer.team,
                newPotentialValue: room.game.trucoState.potentialValue,
                responsePlayerIndex: nextPlayerIndex,
                roomCode: roomCode
            });
        }

        console.log(`✅ Truco response processed for user ${socket.id} in room ${roomCode}`);
        } catch (error) {
            console.error(`❌ Error processing Truco response:`, error);
            console.error(`❌ Error stack:`, error.stack);
            // Don't crash the server, just log the error
        }
    }

    // ✅ Handle bot Truco responses (accept, reject, raise) - temporary test
    socket.on('botRespondTruco', (data) => {
        console.log(`🤖 Bot Truco response received`, data);
        console.log(`🔍 DEBUG: botRespondTruco event handler called`);
        console.log(`🔍 DEBUG: Event data:`, JSON.stringify(data, null, 2));
        console.log(`🔍 DEBUG: Socket ID:`, socket.id);
        console.log(`🔍 DEBUG: Socket roomCode:`, roomCode);
        console.log(`🔍 DEBUG: Socket connected:`, socket.connected);
        console.log(`🔍 DEBUG: Socket rooms:`, Array.from(socket.rooms));
        
        // ✅ CRITICAL FIX: Use roomCode from event data or fallback to roomCode
        const roomCode = data.roomCode || socket.roomCode;
        console.log(`🔍 DEBUG: Using roomCode: ${roomCode} (from data: ${data.roomCode}, from socket: ${roomCode})`);
        console.log(`🔍 DEBUG: Available rooms:`, Array.from(rooms.keys()));
        console.log(`🔍 DEBUG: Room exists:`, rooms.has(roomCode));
        
        if (!roomCode) {
            console.log(`❌ User ${socket.id} not in a room - no roomCode found`);
            socket.emit('error', 'Not in a room');
            return;
        }
        
        const room = rooms.get(roomCode);
        if (!room) {
            console.log(`❌ Room ${roomCode} not found for Bot Truco response`);
            socket.emit('error', 'Room not found');
            return;
        }

        // ✅ Use shared function to process Truco response
        processTrucoResponse(socket, data, room, roomCode);
    });

    // ✅ Handle Truco responses (accept, reject, raise)
    socket.on('respondTruco', (data) => {
        console.log(`🎯 Truco response received`, data);
        console.log(`🔍 DEBUG: respondTruco event handler called`);
        console.log(`🔍 DEBUG: Event data:`, JSON.stringify(data, null, 2));
        console.log(`🔍 DEBUG: Socket ID:`, socket.id);
        console.log(`🔍 DEBUG: Socket roomCode:`, socket.roomCode);
        console.log(`🔍 DEBUG: Socket connected:`, socket.connected);
        console.log(`🔍 DEBUG: Socket rooms:`, Array.from(socket.rooms));
        
        // ✅ CRITICAL FIX: Use roomCode from event data or fallback to socket.roomCode
        const roomCode = data.roomCode || socket.roomCode;
        console.log(`🔍 DEBUG: Using roomCode: ${roomCode} (from data: ${data.roomCode}, from socket: ${socket.roomCode})`);
        console.log(`🔍 DEBUG: Available rooms:`, Array.from(rooms.keys()));
        console.log(`🔍 DEBUG: Room exists:`, rooms.has(roomCode));
        
        if (!roomCode) {
            console.log(`❌ User ${socket.id} not in a room - no roomCode found`);
            socket.emit('error', 'Not in a room');
            return;
        }

        const room = rooms.get(roomCode);
        if (!room) {
            console.log(`❌ Room ${roomCode} not found for Truco response`);
            socket.emit('error', 'Room not found');
            return;
        }

        // ✅ CRITICAL FIX: Check if game is completed - silently ignore Truco responses if game is over
        if (room.game.gameCompleted) {
            console.log(`🏁 Game is completed - silently ignoring Truco response from ${socket.id} (no error sent)`);
            return;
        }

        // ✅ Use shared function to process Truco response
        processTrucoResponse(socket, data, room, roomCode);
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
    // ✅ DUPLICATE respondTruco HANDLER REMOVED - Was overriding the main Truco logic


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
        
        // ✅ CRITICAL FIX: Don't resolve draws in determineRoundWinner
        // Let the main game logic handle draw resolution
        console.log(`🤝 Draw detected - returning null to let main game logic handle resolution`);
        return null;
    } else {
        // No draw - clear winner
    console.log(`🏆 Round winner determined: ${highestCard.name} with ${highestCard.card} (value: ${highestCard.value})`);
    return highestCard;
    }

    // Handle game-specific events for new games
    // 🃏 BLACKJACK SPECIFIC EVENT HANDLERS
    
    // Helper function to calculate blackjack hand value
    function calculateBlackjackValue(hand) {
        let value = 0;
        let aces = 0;
        
        hand.forEach(card => {
            if (card.rank === 'ace') {
                aces++;
                value += 11;
            } else if (['jack', 'queen', 'king'].includes(card.rank)) {
                value += 10;
            } else {
                value += card.value;
            }
        });
        
        // Adjust for aces
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }
        
        return value;
    }
    
    // Helper function to check for blackjack
    function checkBlackjack(hand) {
        return hand.length === 2 && calculateBlackjackValue(hand) === 21;
    }
    
    // Helper function to deal a card from deck
    function dealBlackjackCard(room) {
        if (room.game.deck.length === 0) {
            // Reshuffle - create new deck
            const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
            const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
            room.game.deck = [];
            
            for (let suit of suits) {
                for (let rank of ranks) {
                    let value;
                    if (rank === 'ace') {
                        value = 1;
                    } else if (['jack', 'queen', 'king'].includes(rank)) {
                        value = 10;
                    } else {
                        value = parseInt(rank);
                    }
                    
                    room.game.deck.push({
                        name: `${rank} of ${suit}`,
                        suit: suit,
                        rank: rank,
                        value: value
                    });
                }
            }
            
            // Shuffle
            for (let i = room.game.deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [room.game.deck[i], room.game.deck[j]] = [room.game.deck[j], room.game.deck[i]];
            }
        }
        
        return room.game.deck.pop();
    }
    
    // Place bet handler
    socket.on('placeBet', (data) => {
        try {
            const roomCode = data.roomId;
            const room = rooms.get(roomCode);
            
            if (!room || room.gameType !== 'blackjack') {
                socket.emit('error', 'Room not found or not a blackjack game');
                return;
            }
            
            if (room.game.gamePhase !== 'betting') {
                socket.emit('error', 'Not in betting phase');
                return;
            }
            
            const playerIndex = data.playerIndex;
            const player = room.game.players[playerIndex];
            
            if (!player || player.id !== socket.id) {
                socket.emit('error', 'Invalid player');
                return;
            }
            
            const amount = parseInt(data.amount);
            
            if (amount < room.game.minBet || amount > room.game.maxBet) {
                socket.emit('error', `Bet must be between $${room.game.minBet} and $${room.game.maxBet}`);
                return;
            }
            
            if (amount > player.chips) {
                socket.emit('error', 'Insufficient chips');
                return;
            }
            
            player.bet = amount;
            player.chips -= amount;
            
            console.log(`🃏 Player ${player.name} placed bet of $${amount}`);
            
            io.to(roomCode).emit('betPlaced', {
                playerIndex: playerIndex,
                amount: amount,
                player: player
            });
            
            // Auto-bet for bots
            room.game.players.forEach((botPlayer, botIndex) => {
                if (botPlayer.isBot && botPlayer.bet === 0 && botPlayer.chips >= room.game.minBet) {
                    const botBet = Math.min(room.game.minBet * 2, botPlayer.chips, room.game.maxBet);
                    if (botBet >= room.game.minBet) {
                        botPlayer.bet = botBet;
                        botPlayer.chips -= botBet;
                        console.log(`🃏 Bot ${botPlayer.name} auto-bet $${botBet}`);
                        
                        // Emit betPlaced event for bot
                        io.to(roomCode).emit('betPlaced', {
                            playerIndex: botIndex,
                            amount: botBet,
                            player: botPlayer
                        });
                    }
                }
            });
            
            // Check if all players have bet (both humans and bots must have bet > 0)
            const allPlayersBetted = room.game.players.every(p => {
                // Skip players with insufficient chips
                if (p.chips < room.game.minBet && p.bet === 0) {
                    return false; // Player can't bet, so they're considered "done" but won't participate
                }
                return p.bet > 0 || (p.isBot && p.chips < room.game.minBet); // Bot without chips is considered "done"
            });
            if (allPlayersBetted && room.game.gamePhase === 'betting') {
                // Deal initial cards
                setTimeout(() => {
                    // Deal 2 cards to each player who bet
                    for (let i = 0; i < 2; i++) {
                        room.game.players.forEach(player => {
                            if (player.bet > 0) {
                                const card = dealBlackjackCard(room);
                                player.hand.push(card);
                                player.value = calculateBlackjackValue(player.hand);
                            }
                        });
                    }
                    
                    // Deal dealer cards (one face down, one face up)
                    const dealerCard1 = dealBlackjackCard(room);
                    const dealerCard2 = dealBlackjackCard(room);
                    room.game.dealer.hand.push(dealerCard1);
                    room.game.dealer.hand.push(dealerCard2);
                    // Calculate visible card value (second card) - ace counts as 11 if visible
                    const visibleCard = dealerCard2;
                    room.game.dealer.value = visibleCard.rank === 'ace' ? 11 : 
                                             ['jack', 'queen', 'king'].includes(visibleCard.rank) ? 10 : 
                                             visibleCard.value;
                    room.game.dealer.holeCardVisible = false;
                    
                    // Check for blackjacks
                    room.game.players.forEach(player => {
                        if (player.bet > 0 && checkBlackjack(player.hand)) {
                            player.hasBlackjack = true;
                        }
                    });
                    
                    if (checkBlackjack(room.game.dealer.hand)) {
                        room.game.dealer.hasBlackjack = true;
                        room.game.dealer.holeCardVisible = true;
                        room.game.dealer.value = 21;
                    }
                    
                    // Set canDouble and canSplit for players
                    room.game.players.forEach(player => {
                        if (player.bet > 0 && player.hand.length === 2 && !player.hasBlackjack) {
                            player.canDouble = player.chips >= player.bet;
                            player.canSplit = player.hand[0].rank === player.hand[1].rank && player.chips >= player.bet;
                        }
                    });
                    
                    room.game.gamePhase = 'playing';
                    room.game.currentPlayer = 0;
                    
                    // Skip players who have blackjack or no bet
                    while (room.game.currentPlayer < room.game.players.length && 
                           (room.game.players[room.game.currentPlayer].hasBlackjack || 
                            room.game.players[room.game.currentPlayer].bet === 0)) {
                        room.game.currentPlayer++;
                    }
                    
                    if (room.game.currentPlayer >= room.game.players.length) {
                        // All players have blackjack, go to dealer turn
                        room.game.gamePhase = 'dealer';
                        room.game.dealer.holeCardVisible = true;
                        room.game.dealer.value = calculateBlackjackValue(room.game.dealer.hand);
                    }
                    
                    io.to(roomCode).emit('cardsDealt', {
                        players: room.game.players,
                        dealer: room.game.dealer,
                        gamePhase: room.game.gamePhase,
                        currentPlayer: room.game.currentPlayer
                    });
                    
                    console.log(`🃏 Cards dealt. Phase: ${room.game.gamePhase}, Current player: ${room.game.currentPlayer}`);
                    
                    // Handle bot turn if current player is a bot
                    if (room.game.gamePhase === 'playing' && room.game.currentPlayer < room.game.players.length) {
                        const currentPlayer = room.game.players[room.game.currentPlayer];
                        if (currentPlayer && currentPlayer.isBot) {
                            setTimeout(() => {
                                handleBlackjackBotTurn(roomCode, room);
                            }, 1500);
                        }
                    }
                }, 500);
            }
        } catch (error) {
            console.error(`❌ Error in placeBet:`, error);
            socket.emit('error', 'Failed to place bet');
        }
    });
    
    // Player action handler (Hit, Stand, Double, Split)
    socket.on('playerAction', (data) => {
        try {
            const roomCode = data.roomId;
            const room = rooms.get(roomCode);
            
            if (!room) {
                socket.emit('error', 'Room not found');
                return;
            }
            
            // Handle blackjack-specific actions
            if (room.gameType === 'blackjack') {
                if (room.game.gamePhase !== 'playing') {
                    socket.emit('error', 'Not in playing phase');
                    return;
                }
                
                const playerIndex = data.playerIndex;
                const player = room.game.players[playerIndex];
                const action = data.action;
                
                if (!player || player.id !== socket.id) {
                    socket.emit('error', 'Invalid player');
                    return;
                }
                
                if (playerIndex !== room.game.currentPlayer) {
                    socket.emit('error', 'Not your turn');
                    return;
                }
                
                if (player.isBusted || player.isStanding || player.hasBlackjack) {
                    socket.emit('error', 'Cannot perform action');
                    return;
                }
                
                console.log(`🃏 Player ${player.name} performs action: ${action}`);
                
                switch (action) {
                    case 'hit':
                        const hitCard = dealBlackjackCard(room);
                        player.hand.push(hitCard);
                        player.value = calculateBlackjackValue(player.hand);
                        player.canDouble = false;
                        player.canSplit = false;
                        
                        if (player.value > 21) {
                            player.isBusted = true;
                            console.log(`🃏 Player ${player.name} busted with ${player.value}`);
                        }
                        
                        io.to(roomCode).emit('playerAction', {
                            playerIndex: playerIndex,
                            action: action,
                            player: player,
                            gamePhase: room.game.gamePhase,
                            currentPlayer: room.game.currentPlayer
                        });
                        
                        // Auto-advance if busted
                        if (player.isBusted) {
                            setTimeout(() => {
                                advanceBlackjackTurn(roomCode, room);
                            }, 1000);
                        }
                        break;
                        
                    case 'stand':
                        player.isStanding = true;
                        io.to(roomCode).emit('playerAction', {
                            playerIndex: playerIndex,
                            action: action,
                            player: player,
                            gamePhase: room.game.gamePhase,
                            currentPlayer: room.game.currentPlayer
                        });
                        
                        setTimeout(() => {
                            advanceBlackjackTurn(roomCode, room);
                        }, 500);
                        break;
                        
                    case 'double':
                        // Can only double on first 2 cards
                        if (player.hand.length !== 2) {
                            socket.emit('error', 'Can only double down on first two cards');
                            return;
                        }
                        
                        if (!player.canDouble || player.chips < player.bet) {
                            socket.emit('error', 'Cannot double down');
                            return;
                        }
                        
                        player.chips -= player.bet;
                        player.bet *= 2;
                        const doubleCard = dealBlackjackCard(room);
                        player.hand.push(doubleCard);
                        player.value = calculateBlackjackValue(player.hand);
                        player.isStanding = true;
                        player.canDouble = false;
                        player.canSplit = false;
                        
                        if (player.value > 21) {
                            player.isBusted = true;
                        }
                        
                        io.to(roomCode).emit('playerAction', {
                            playerIndex: playerIndex,
                            action: action,
                            player: player,
                            gamePhase: room.game.gamePhase,
                            currentPlayer: room.game.currentPlayer
                        });
                        
                        setTimeout(() => {
                            advanceBlackjackTurn(roomCode, room);
                        }, 500);
                        break;
                        
                    case 'split':
                        // Simplified split - just mark as done for now
                        if (!player.canSplit || player.chips < player.bet) {
                            socket.emit('error', 'Cannot split');
                            return;
                        }
                        
                        // For now, treat split as stand
                        player.isStanding = true;
                        player.canSplit = false;
                        
                        io.to(roomCode).emit('playerAction', {
                            playerIndex: playerIndex,
                            action: action,
                            player: player,
                            gamePhase: room.game.gamePhase,
                            currentPlayer: room.game.currentPlayer
                        });
                        
                        setTimeout(() => {
                            advanceBlackjackTurn(roomCode, room);
                        }, 500);
                        break;
                }
                
                return; // Exit early for blackjack
            }
            
            // Generic handler for other games
            console.log(`🎮 Player action in room: ${data.roomId}`);
            if (room) {
                io.to(data.roomId).emit('playerAction', data);
            }
        } catch (error) {
            console.error(`❌ Error in playerAction:`, error);
            socket.emit('error', 'Failed to process action');
        }
    });
    
    // Helper function to advance turn in blackjack
    function advanceBlackjackTurn(roomCode, room) {
        const startIndex = room.game.currentPlayer;
        let found = false;
        let attempts = 0;
        
        // Find next player who can act (max one full cycle)
        while (attempts < room.game.players.length) {
            room.game.currentPlayer = (room.game.currentPlayer + 1) % room.game.players.length;
            attempts++;
            const player = room.game.players[room.game.currentPlayer];
            
            if (!player.isBusted && !player.isStanding && !player.hasBlackjack && player.bet > 0) {
                found = true;
                break;
            }
            
            // If we've cycled back to start, break
            if (room.game.currentPlayer === startIndex) {
                break;
            }
        }
        
        // Check if all players are done
        const allPlayersDone = room.game.players.every(p => 
            p.isBusted || p.isStanding || p.hasBlackjack || p.bet === 0 || (p.chips < room.game.minBet && p.bet === 0)
        );
        
        // If no valid player found or all players are done, dealer's turn
        if (!found || allPlayersDone) {
            // Dealer's turn
            room.game.gamePhase = 'dealer';
            room.game.dealer.holeCardVisible = true;
            room.game.dealer.value = calculateBlackjackValue(room.game.dealer.hand);
            
            // Emit dealer turn started
            io.to(roomCode).emit('dealerTurn', {
                dealer: room.game.dealer,
                gamePhase: room.game.gamePhase
            });
            
            // Dealer hits until 17 or bust (with small delay between hits for visual effect)
            const dealerPlayCards = async () => {
                while (room.game.dealer.value < 17) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second between cards
                    const dealerCard = dealBlackjackCard(room);
                    room.game.dealer.hand.push(dealerCard);
                    room.game.dealer.value = calculateBlackjackValue(room.game.dealer.hand);
                    
                    // Update clients after each card
                    io.to(roomCode).emit('dealerTurn', {
                        dealer: room.game.dealer,
                        gamePhase: room.game.gamePhase
                    });
                }
                
                if (room.game.dealer.value > 21) {
                    room.game.dealer.isBusted = true;
                }
                
                // Final dealer update
                io.to(roomCode).emit('dealerTurn', {
                    dealer: room.game.dealer,
                    gamePhase: room.game.gamePhase
                });
                
                // Small delay before determining winners
                setTimeout(() => {
                    determineBlackjackWinners(roomCode, room);
                }, 1000);
            };
            
            dealerPlayCards();
        } else {
            io.to(roomCode).emit('turnChanged', {
                currentPlayer: room.game.currentPlayer,
                gamePhase: room.game.gamePhase
            });
            
            // Handle bot turn
            const currentPlayer = room.game.players[room.game.currentPlayer];
            if (currentPlayer && currentPlayer.isBot && room.game.gamePhase === 'playing') {
                setTimeout(() => {
                    handleBlackjackBotTurn(roomCode, room);
                }, 1500);
            }
        }
    }
    
    // Helper function to handle bot turns in blackjack
    function handleBlackjackBotTurn(roomCode, room) {
        const botPlayer = room.game.players[room.game.currentPlayer];
        
        if (!botPlayer || !botPlayer.isBot || botPlayer.isBusted || botPlayer.isStanding || botPlayer.hasBlackjack) {
            return;
        }
        
        console.log(`🤖 Blackjack bot ${botPlayer.name} making decision. Hand value: ${botPlayer.value}`);
        
        let action = 'stand';
        
        // Bot strategy: hit on 16 or less, stand on 17+
        // Can only double on first 2 cards
        if (botPlayer.hand.length === 2 && botPlayer.canDouble && botPlayer.chips >= botPlayer.bet) {
            // Sometimes double on 10 or 11 (good double opportunities)
            if ((botPlayer.value === 10 || botPlayer.value === 11) && Math.random() < 0.5) {
                action = 'double';
            } else if (botPlayer.value < 17) {
                action = 'hit';
            } else {
                action = 'stand';
            }
        } else if (botPlayer.value < 17) {
            action = 'hit';
        } else if (botPlayer.value >= 17) {
            action = 'stand';
        }
        
        // Simulate bot action by directly calling the logic
        switch (action) {
            case 'hit':
                const hitCard = dealBlackjackCard(room);
                botPlayer.hand.push(hitCard);
                botPlayer.value = calculateBlackjackValue(botPlayer.hand);
                botPlayer.canDouble = false;
                botPlayer.canSplit = false;
                
                if (botPlayer.value > 21) {
                    botPlayer.isBusted = true;
                    console.log(`🤖 Bot ${botPlayer.name} busted with ${botPlayer.value}`);
                }
                
                io.to(roomCode).emit('playerAction', {
                    playerIndex: room.game.currentPlayer,
                    action: action,
                    player: botPlayer,
                    gamePhase: room.game.gamePhase,
                    currentPlayer: room.game.currentPlayer
                });
                
                if (botPlayer.isBusted) {
                    setTimeout(() => {
                        advanceBlackjackTurn(roomCode, room);
                    }, 1000);
                }
                break;
                
            case 'stand':
                botPlayer.isStanding = true;
                io.to(roomCode).emit('playerAction', {
                    playerIndex: room.game.currentPlayer,
                    action: action,
                    player: botPlayer,
                    gamePhase: room.game.gamePhase,
                    currentPlayer: room.game.currentPlayer
                });
                
                setTimeout(() => {
                    advanceBlackjackTurn(roomCode, room);
                }, 500);
                break;
                
            case 'double':
                // Can only double on first 2 cards
                if (botPlayer.hand.length !== 2) {
                    // Fall back to stand if can't double (shouldn't happen, but safety check)
                    botPlayer.isStanding = true;
                    action = 'stand';
                } else if (botPlayer.canDouble && botPlayer.chips >= botPlayer.bet) {
                    botPlayer.chips -= botPlayer.bet;
                    botPlayer.bet *= 2;
                    const doubleCard = dealBlackjackCard(room);
                    botPlayer.hand.push(doubleCard);
                    botPlayer.value = calculateBlackjackValue(botPlayer.hand);
                    botPlayer.isStanding = true;
                    botPlayer.canDouble = false;
                    
                    if (botPlayer.value > 21) {
                        botPlayer.isBusted = true;
                    }
                } else {
                    // Can't double (insufficient chips), fall back to stand
                    botPlayer.isStanding = true;
                    action = 'stand';
                }
                
                io.to(roomCode).emit('playerAction', {
                    playerIndex: room.game.currentPlayer,
                    action: action,
                    player: botPlayer,
                    gamePhase: room.game.gamePhase,
                    currentPlayer: room.game.currentPlayer
                });
                
                setTimeout(() => {
                    advanceBlackjackTurn(roomCode, room);
                }, 500);
                break;
        }
    }
    
    // Helper function to determine blackjack winners
    function determineBlackjackWinners(roomCode, room) {
        room.game.gamePhase = 'finished';
        
        room.game.players.forEach(player => {
            if (player.bet === 0) return;
            
            let winnings = 0;
            
            if (player.isBusted) {
                winnings = 0;
            } else if (room.game.dealer.isBusted) {
                if (player.hasBlackjack) {
                    winnings = player.bet * 2.5; // 3:2 payout
                } else {
                    winnings = player.bet * 2; // 1:1 payout
                }
            } else if (player.hasBlackjack && !room.game.dealer.hasBlackjack) {
                winnings = player.bet * 2.5; // 3:2 payout
            } else if (room.game.dealer.hasBlackjack && !player.hasBlackjack) {
                winnings = 0;
            } else if (player.value > room.game.dealer.value) {
                if (player.hasBlackjack) {
                    winnings = player.bet * 2.5;
                } else {
                    winnings = player.bet * 2;
                }
            } else if (player.value === room.game.dealer.value) {
                winnings = player.bet; // Push - return bet
            } else {
                winnings = 0;
            }
            
            player.chips += winnings;
            player.winnings = winnings;
        });
        
        io.to(roomCode).emit('roundFinished', {
            players: room.game.players,
            dealer: room.game.dealer,
            gamePhase: room.game.gamePhase
        });
        
        // Start next round after delay
        setTimeout(() => {
            startNewBlackjackRound(roomCode, room);
        }, 5000);
    }
    
    // Helper function to start new blackjack round
    function startNewBlackjackRound(roomCode, room) {
        room.game.roundNumber++;
        room.game.gamePhase = 'betting';
        
        // Reset players
        room.game.players.forEach(player => {
            player.hand = [];
            player.value = 0;
            player.bet = 0;
            player.isBusted = false;
            player.hasBlackjack = false;
            player.isStanding = false;
            player.canDouble = false;
            player.canSplit = false;
            player.winnings = 0;
        });
        
        // Reset dealer
        room.game.dealer = {
            hand: [],
            value: 0,
            isBusted: false,
            hasBlackjack: false,
            holeCardVisible: false
        };
        
        // Reshuffle deck if less than 20 cards
        if (room.game.deck.length < 20) {
            const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
            const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
            room.game.deck = [];
            
            for (let suit of suits) {
                for (let rank of ranks) {
                    let value;
                    if (rank === 'ace') {
                        value = 1;
                    } else if (['jack', 'queen', 'king'].includes(rank)) {
                        value = 10;
                    } else {
                        value = parseInt(rank);
                    }
                    
                    room.game.deck.push({
                        name: `${rank} of ${suit}`,
                        suit: suit,
                        rank: rank,
                        value: value
                    });
                }
            }
            
            // Shuffle
            for (let i = room.game.deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [room.game.deck[i], room.game.deck[j]] = [room.game.deck[j], room.game.deck[i]];
            }
        }
        
        io.to(roomCode).emit('roundStarted', {
            roundNumber: room.game.roundNumber,
            gamePhase: room.game.gamePhase,
            players: room.game.players
        });
        
        // Auto-bet for bots when new round starts
        setTimeout(() => {
            room.game.players.forEach((botPlayer, botIndex) => {
                if (botPlayer.isBot && botPlayer.bet === 0 && botPlayer.chips >= room.game.minBet) {
                    const botBet = Math.min(room.game.minBet * 2, botPlayer.chips, room.game.maxBet);
                    if (botBet >= room.game.minBet) {
                        botPlayer.bet = botBet;
                        botPlayer.chips -= botBet;
                        console.log(`🃏 Bot ${botPlayer.name} auto-bet $${botBet} for new round`);
                        
                        io.to(roomCode).emit('betPlaced', {
                            playerIndex: botIndex,
                            amount: botBet,
                            player: botPlayer
                        });
                    }
                }
            });
            
            // Check if all players (including humans) have bet now
            const allPlayersBetted = room.game.players.every(p => {
                if (p.chips < room.game.minBet && p.bet === 0) {
                    return false;
                }
                return p.bet > 0 || (p.isBot && p.chips < room.game.minBet);
            });
            
            // If all players have bet, trigger card dealing (similar to placeBet handler)
            if (allPlayersBetted && room.game.gamePhase === 'betting') {
                setTimeout(() => {
                    // Deal 2 cards to each player who bet
                    for (let i = 0; i < 2; i++) {
                        room.game.players.forEach(player => {
                            if (player.bet > 0) {
                                const card = dealBlackjackCard(room);
                                player.hand.push(card);
                                player.value = calculateBlackjackValue(player.hand);
                            }
                        });
                    }
                    
                    // Deal dealer cards (one face down, one face up)
                    const dealerCard1 = dealBlackjackCard(room);
                    const dealerCard2 = dealBlackjackCard(room);
                    room.game.dealer.hand.push(dealerCard1);
                    room.game.dealer.hand.push(dealerCard2);
                    // Calculate visible card value
                    const visibleCard = dealerCard2;
                    room.game.dealer.value = visibleCard.rank === 'ace' ? 11 : 
                                             ['jack', 'queen', 'king'].includes(visibleCard.rank) ? 10 : 
                                             visibleCard.value;
                    room.game.dealer.holeCardVisible = false;
                    
                    // Check for blackjacks
                    room.game.players.forEach(player => {
                        if (player.bet > 0 && checkBlackjack(player.hand)) {
                            player.hasBlackjack = true;
                        }
                    });
                    
                    if (checkBlackjack(room.game.dealer.hand)) {
                        room.game.dealer.hasBlackjack = true;
                        room.game.dealer.holeCardVisible = true;
                        room.game.dealer.value = 21;
                    }
                    
                    // Set canDouble and canSplit for players
                    room.game.players.forEach(player => {
                        if (player.bet > 0 && player.hand.length === 2 && !player.hasBlackjack) {
                            player.canDouble = player.chips >= player.bet;
                            player.canSplit = player.hand[0].rank === player.hand[1].rank && player.chips >= player.bet;
                        }
                    });
                    
                    room.game.gamePhase = 'playing';
                    room.game.currentPlayer = 0;
                    
                    // Skip players who have blackjack or no bet
                    while (room.game.currentPlayer < room.game.players.length && 
                           (room.game.players[room.game.currentPlayer].hasBlackjack || 
                            room.game.players[room.game.currentPlayer].bet === 0)) {
                        room.game.currentPlayer++;
                    }
                    
                    if (room.game.currentPlayer >= room.game.players.length) {
                        // All players have blackjack, go to dealer turn
                        room.game.gamePhase = 'dealer';
                        room.game.dealer.holeCardVisible = true;
                        room.game.dealer.value = calculateBlackjackValue(room.game.dealer.hand);
                    }
                    
                    io.to(roomCode).emit('cardsDealt', {
                        players: room.game.players,
                        dealer: room.game.dealer,
                        gamePhase: room.game.gamePhase,
                        currentPlayer: room.game.currentPlayer
                    });
                    
                    console.log(`🃏 Cards dealt (from round start). Phase: ${room.game.gamePhase}, Current player: ${room.game.currentPlayer}`);
                    
                    // Handle bot turn if current player is a bot
                    if (room.game.gamePhase === 'playing' && room.game.currentPlayer < room.game.players.length) {
                        const currentPlayer = room.game.players[room.game.currentPlayer];
                        if (currentPlayer && currentPlayer.isBot) {
                            setTimeout(() => {
                                handleBlackjackBotTurn(roomCode, room);
                            }, 1500);
                        }
                    }
                }, 500);
            }
        }, 500);
    }

    socket.on('bettingRoundStarted', (data) => {
        console.log(`🎮 Betting round started in room: ${data.roomId}`);
        const room = rooms.get(data.roomId);
        if (room) {
            io.to(data.roomId).emit('bettingRoundStarted', data);
        }
    });

    socket.on('communityCards', (data) => {
        console.log(`🎮 Community cards in room: ${data.roomId}`);
        const room = rooms.get(data.roomId);
        if (room) {
            io.to(data.roomId).emit('communityCards', data);
        }
    });

    socket.on('showdown', (data) => {
        console.log(`🎮 Showdown in room: ${data.roomId}`);
        const room = rooms.get(data.roomId);
        if (room) {
            io.to(data.roomId).emit('showdown', data);
        }
    });

    socket.on('gameState', (data) => {
        console.log(`🎮 Game state update in room: ${data.roomId}`);
        const room = rooms.get(data.roomId);
        if (room) {
            io.to(data.roomId).emit('gameState', data);
        }
    });


    // Handle game completion for all games
    socket.on('gameCompleted', (data) => {
        console.log(`🎮 Game completed in room: ${data.roomId}`);
        const room = rooms.get(data.roomId);
        if (room) {
            io.to(data.roomId).emit('gameCompleted', data);
        }
    });
}

// ✅ CRITICAL FIX: Function to start a new game after a team wins
function startNewGame(room, winningTeam, roomId) {
    console.log(`🎮 Starting new game in room: ${roomId} after ${winningTeam} won`);
    console.log(`🔍 DEBUG: startNewGame function called with parameters:`, {
        roomId: roomId,
        winningTeam: winningTeam,
        roomExists: !!room,
        roomPlayers: room?.players?.map(p => ({ name: p.name, team: p.team }))
    });
    
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
        
        // ✅ CRITICAL FIX: Reset game completed flag for new game
        room.game.gameCompleted = false;
        console.log(`🔄 Reset gameCompleted flag for new game`);
        
        // ✅ CRITICAL FIX: Reset Truco state for new game
        room.game.trucoState = {
            isActive: false,
            currentValue: 1,
            potentialValue: 3,
            callerTeam: null,
            callerIndex: null,
            waitingForResponse: false,
            responsePlayerIndex: null
        };
        console.log(`🔄 Truco state reset for new game - all players can call Truco again`);
        console.log(`🔍 TRUCO STATE RESET DEBUG - New trucoState:`, room.game.trucoState);
        
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
        
        // ✅ CRITICAL FIX: Winner of last round or winning team starts next game
        let startingPlayerIndex = 0; // Default to first player for first game
        
        console.log(`🔍 DEBUG: Checking for starting player in startNewGame`);
        console.log(`🔍 DEBUG: winningTeam:`, winningTeam);
        console.log(`🔍 DEBUG: room.lastRoundWinner:`, room.lastRoundWinner);
        console.log(`🔍 DEBUG: room.players:`, room.players.map(p => ({ name: p.name, id: p.id, team: p.team })));
        
        // ✅ CRITICAL FIX: Prioritize lastRoundWinner for normal game completions
        // Only use winningTeam logic if it's a Truco rejection and no lastRoundWinner is available
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
        }
        
        // ✅ CRITICAL FIX: If no lastRoundWinner but winningTeam is provided (from Truco rejection), find first player from that team
        else if (winningTeam && (winningTeam === 'team1' || winningTeam === 'team2')) {
            console.log(`🔍 DEBUG: Using winningTeam to determine starting player: ${winningTeam}`);
            console.log(`🔍 DEBUG: All players and their teams:`, room.players.map((p, i) => `${i}: ${p.name} → ${p.team}`));
            
            // ✅ CRITICAL DEBUG: Check each player individually
            room.players.forEach((player, index) => {
                console.log(`🔍 DEBUG: Player ${index}: ${player.name}, team: ${player.team}, matches winningTeam ${winningTeam}? ${player.team === winningTeam}`);
            });
            
            const winningTeamPlayerIndex = room.players.findIndex(p => p.team === winningTeam);
            console.log(`🔍 DEBUG: findIndex result for team ${winningTeam}: ${winningTeamPlayerIndex}`);
            
            if (winningTeamPlayerIndex !== -1) {
                startingPlayerIndex = winningTeamPlayerIndex;
                console.log(`🔍 DEBUG: Starting player set to first player from winning team: ${room.players[startingPlayerIndex].name} (index ${startingPlayerIndex})`);
                console.log(`🔍 DEBUG: This player's team: ${room.players[startingPlayerIndex].team}`);
            } else {
                console.log(`🔍 DEBUG: No player found from winning team, using default starting player`);
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
        console.log(`🔍 DEBUG: Starting player details:`, {
            name: room.players[startingPlayerIndex].name,
            team: room.players[startingPlayerIndex].team,
            index: startingPlayerIndex,
            isBot: room.players[startingPlayerIndex].isBot
        });
        
        // ✅ CRITICAL DEBUG: Log the exact currentPlayer value that will be sent
        console.log(`🔍 CRITICAL DEBUG: startNewGame - room.game.currentPlayer set to: ${room.game.currentPlayer}`);
        console.log(`🔍 CRITICAL DEBUG: startNewGame - This should be the starting player for the new game`);
        console.log(`🔍 CRITICAL DEBUG: startNewGame - If this is wrong, the newGameStarted event will be wrong`);
        
        // Update player hands
        room.players.forEach((player, index) => {
            player.hand = hands[index];
        });
        
        console.log(`🔄 New game started with fresh deck and hands`);
        
        // Emit new game started event with scores, games, and sets
        console.log(`SERVER: Emitting 'newGameStarted' for room ${roomId} with scores:`, room.game.scores, 'games:', room.game.games, 'and sets:', room.game.sets);
        console.log(`🔍 CRITICAL DEBUG: newGameStarted event - currentPlayer: ${room.game.currentPlayer} (${room.players[room.game.currentPlayer]?.name})`);
        console.log(`🔍 CRITICAL DEBUG: newGameStarted event - This should be the starting player for the new game`);
        io.to(roomId).emit('newGameStarted', {
            currentPlayer: room.game.currentPlayer,
            allHands: room.game.hands,
            scores: room.game.scores,
            games: room.game.games,
            sets: room.game.sets
        });
        console.log(`🔍 CRITICAL DEBUG: newGameStarted event emitted successfully`);
        
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