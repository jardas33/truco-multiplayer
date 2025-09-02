// ✅ CRITICAL TEST: Log that JavaScript is executing
console.log('🚨 CRITICAL: lobby.js is executing at:', new Date().toISOString());

// Global variables
// socket is already declared in variables.js
// gameInitialized is already declared in variables.js

// Initialize socket and lobby when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚨 CRITICAL: DOMContentLoaded event fired, initializing lobby');
    console.log('DOM loaded, initializing game...');
    // Wait for p5.js to be ready
    setTimeout(initGame, 100);
});

function initGame() {
    console.log('Initializing game...');
    if (!gameInitialized) {
        initSocket();
        setupButtonListeners();
        gameInitialized = true;
    }
}

function initSocket() {
    try {
        console.log('Initializing socket...');
        if (typeof io === 'undefined') {
            console.error('Socket.IO not loaded, retrying in 1 second...');
            setTimeout(initSocket, 1000);
            return;
        }

        socket = io();
        console.log('Socket initialized successfully');

        socket.on('connect', () => {
            console.log('Connected to server');
            console.log('🔌 SOCKET CONNECTED:', socket.id);
        });

        socket.on('disconnect', () => {
            console.log('🔌 SOCKET DISCONNECTED');
        });

        // ✅ CRITICAL TEST: Add a simple test event listener
        socket.on('testTurnChanged', (data) => {
            console.log('🧪 TEST: testTurnChanged event received:', data);
        });

        // ✅ CRITICAL TEST: Add a simple test event listener for server responses
        socket.on('testResponse', (data) => {
            console.log('🧪 TEST: Received test response from server:', data);
        });

        // ✅ CRITICAL TEST: Send a test event immediately to verify socket is working
        setTimeout(() => {
            console.log('🧪 TEST: Sending test event to server');
            socket.emit('testEvent', { message: 'Client test event' });
        }, 1000);

        // ✅ Handle turn changes with improved validation
        socket.on('turnChanged', (data) => {
            console.log('🔄 Turn changed event received:', data);
            // ✅ turnChanged event received and processed
            
            // ✅ CRITICAL TEST: Log that we're in the turnChanged handler
            console.log('🚨 CRITICAL: We are inside the turnChanged event handler!');
            
            if (!window.game) {
                console.log('❌ No game instance found for turnChanged event');
                return;
            }
            
            // ✅ Validate new current player index
            if (data.currentPlayer < 0 || data.currentPlayer >= 4) {
                console.error('❌ Invalid current player index:', data.currentPlayer);
                return;
            }
            
            // ✅ CRITICAL FIX: Prevent duplicate turnChanged processing for the same player
            if (window.game.currentPlayerIndex === data.currentPlayer) {
                console.log(`⚠️ Duplicate turnChanged event for player ${data.currentPlayer} - ignoring to prevent loop`);
                return;
            }
            
            // ✅ CRITICAL FIX: Update current player FIRST to prevent race conditions
            window.game.currentPlayerIndex = data.currentPlayer;
            console.log(`🔄 Updated currentPlayerIndex to: ${data.currentPlayer}`);
            
            // ✅ CRITICAL FIX: Update player active states for turn indicator
            console.log(`🔄 Updating player active states. Server currentPlayer: ${data.currentPlayer}`);
            window.game.players.forEach((player, index) => {
                const wasActive = player.isActive;
                player.isActive = (index === data.currentPlayer);
                
                // ✅ CRITICAL FIX: Reset hasPlayedThisTurn and isPlaying flags for new turn
                if (index === data.currentPlayer) {
                    player.hasPlayedThisTurn = false;
                    player.isPlaying = false;
                    console.log(`🔄 Reset hasPlayedThisTurn and isPlaying for ${player.name} (new turn)`);
                }
                
                console.log(`🔄 Player ${player.name} (${index}) isActive: ${wasActive} -> ${player.isActive}`);
            });
            
            // ✅ DEBUG: Verify the active player
            const activePlayer = window.game.players.find(p => p.isActive);
            console.log(`🔄 Active player after update: ${activePlayer ? activePlayer.name : 'None'} (${activePlayer ? window.game.players.indexOf(activePlayer) : 'N/A'})`);
            
            // ✅ Update all player hands with proper formatting and fallback
            if (data.allHands) {
                data.allHands.forEach((hand, index) => {
                    if (window.game.players[index]) {
                        // ✅ Convert server card format to client format with fallback
                        const clientHand = hand.map(card => {
                            const cardImage = getCardImageWithFallback(card.name);
                            return {
                                ...card, // Keep all server properties
                                isClickable: false, // Will be set by game logic
                                image: cardImage // Use fallback function
                            };
                        });
                        
                        window.game.players[index].hand = clientHand;
                    }
                });
            }
            
            // ✅ CRITICAL FIX: Make current player's cards clickable
            if (window.game.players[data.currentPlayer]) {
                const currentPlayer = window.game.players[data.currentPlayer];
                
                // ✅ CRITICAL FIX: Ensure currentPlayerIndex is synchronized
                if (window.game.currentPlayerIndex !== data.currentPlayer) {
                    console.log(`🚨 CRITICAL: currentPlayerIndex mismatch! Client: ${window.game.currentPlayerIndex}, Server: ${data.currentPlayer}`);
                    window.game.currentPlayerIndex = data.currentPlayer;
                    console.log(`🚨 CRITICAL: Fixed currentPlayerIndex to: ${data.currentPlayer}`);
                }
                
                // ✅ CRITICAL FIX: Show clear turn indicator
                console.log(`🎯 TURN CHANGE: It's now ${currentPlayer.name}'s turn (${currentPlayer.isBot ? 'Bot' : 'Human'})`);
                
                if (!currentPlayer.isBot) {
                    // Human player - make cards clickable
                    currentPlayer.hand.forEach(card => {
                        card.isClickable = true;
                    });
                    console.log(`✅ Made ${currentPlayer.name}'s cards clickable`);
                    
                    // ✅ Turn message removed per user request
                } else {
                    // Bot player - trigger bot play
                    console.log(`🤖 Bot ${currentPlayer.name}'s turn - triggering bot play`);
                    
                    // ✅ REMOVED: Bot thinking message popup
                    
                    // ✅ CRITICAL FIX: Add CSS animation for visual stability (NO execution delay)
                    const turnIndicator = document.querySelector('.turn-indicator');
                    if (turnIndicator) {
                        turnIndicator.style.transition = 'all 0.5s ease-in-out';
                        turnIndicator.style.transform = 'scale(1.1)';
                        setTimeout(() => {
                            if (turnIndicator) {
                                turnIndicator.style.transform = 'scale(1)';
                            }
                        }, 100);
                    }
                    
                    // ✅ CRITICAL FIX: Prevent bot from playing multiple times
                    if (currentPlayer.hasPlayedThisTurn) {
                        console.log(`🤖 Bot ${currentPlayer.name} already played this turn - skipping`);
                        return;
                    }
                    
                    // ✅ CRITICAL FIX: Ensure window.playedCards is available
                    if (window.playedCards) {
                        console.log('🔄 Window playedCards available in turnChanged:', window.playedCards.length);
                    }
                    
                    // ✅ PACING FIX: Check if current player is a bot and trigger bot play with visual delay
                    if (currentPlayer.isBot) {
                        console.log(`🤖 Bot ${currentPlayer.name} turn detected - triggering bot play with visual delay`);
                        
                        // ✅ PACING FIX: Use immediate validation but delayed execution for visual pacing
                        if (window.game && 
                            window.game.players[data.currentPlayer] &&
                            window.game.players[data.currentPlayer].isBot &&
                            window.game.players[data.currentPlayer].hand && 
                            window.game.players[data.currentPlayer].hand.length > 0 &&
                            !window.game.players[data.currentPlayer].hasPlayedThisTurn &&
                            !window.game.players[data.currentPlayer].isPlaying) {
                            
                            console.log(`🤖 Bot ${currentPlayer.name} validated for play - executing with visual delay`);
                            
                            // ✅ PACING FIX: Execute bot play with visual delay for better UX
                            setTimeout(() => {
                                const bot = window.game.players[data.currentPlayer];
                                const cardIndex = 0;
                                const selectedCard = bot.hand[cardIndex];
                                
                                if (selectedCard && selectedCard.name) {
                                    console.log(`🤖 Bot ${bot.name} playing card with visual delay: ${selectedCard.name}`);
                                    
                                    // Mark bot as playing and played BEFORE sending event to prevent duplicates
                                    bot.isPlaying = true;
                                    bot.hasPlayedThisTurn = true;
                                    
                                    // Emit playCard event
                                    socket.emit('playCard', {
                                        roomCode: window.roomId,
                                        cardIndex: cardIndex,
                                        playerIndex: data.currentPlayer
                                    });
                                    
                                    console.log(`🤖 Bot ${bot.name} card play event sent`);
                                    
                                    // ✅ PACING FIX: Emit botTurnComplete with additional delay for pacing
                                    setTimeout(() => {
                                        try {
                                            console.log(`🔍 DEBUG: Sending botTurnComplete event for bot ${bot.name} (${data.currentPlayer})`);
                                            socket.emit('botTurnComplete', {
                                                roomCode: window.roomId
                                            });
                                            console.log(`🤖 Bot ${bot.name} turn complete - notified server`);
                                        } catch (turnCompleteError) {
                                            console.error(`❌ Bot ${bot.name} turn complete failed:`, turnCompleteError);
                                        }
                                    }, 1000); // 1 second delay for pacing
                                }
                            }, 1500); // 1.5 second visual delay for pacing
                        } else {
                            console.log(`🤖 Bot ${currentPlayer.name} validation failed - cannot play`);
                        }
                    }
                    
                    // ✅ CRITICAL FIX: Removed duplicate fallback bot play logic to prevent race conditions
                    // Now using single bot play mechanism with immediate execution
                }
            }
            
            // ✅ CRITICAL FIX: Force game redraw immediately - NO DELAYS
            if (typeof redrawGame === 'function') {
                redrawGame();
            } else if (typeof redraw === 'function') {
                redraw();
            } else {
                console.warn('⚠️ No redraw function available for turn changed event');
            }
            
            console.log('✅ Turn changed event processed successfully');
        });

        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
        });

        setupSocketListeners();
    } catch (error) {
        console.error('Error initializing socket:', error);
        setTimeout(initSocket, 1000);
    }
}

function setupSocketListeners() {
    if (!socket) {
        console.error('Socket not initialized in setupSocketListeners');
        return;
    }

    socket.on('connect', () => {
        console.log('✅ Connected to server');
        hideReconnectionUI();
        
        // Attempt to rejoin room if we were in one before disconnection
        if (window.roomId) {
            console.log('🔄 Attempting to rejoin room after reconnection:', window.roomId);
            socket.emit('joinRoom', window.roomId);
        }
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        showReconnectionUI();
    });

    socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
        showReconnectionUI();
    });

    socket.on('reconnect', () => {
        console.log('✅ Reconnected to server');
        hideReconnectionUI();
        
        // Attempt to rejoin room if we were in one
        if (window.roomId) {
            console.log('🔄 Attempting to rejoin room after reconnection:', window.roomId);
            socket.emit('joinRoom', window.roomId);
        }
    });

    socket.on('roomCreated', (id) => {
        console.log('✅ Room created:', id);
        window.roomId = id;
        console.log('✅ Room ID set to window.roomId:', window.roomId);
        
        // ✅ CRITICAL FIX: Mark this client as room creator
        window.isRoomCreator = true;
        console.log('✅ This client marked as room creator - will handle bot plays');
        
        // ✅ REMOVED: Don't populate roomInput to avoid duplicate room code display
        updateLobbyUI(true);
        showPlayerCustomization(); // ✅ Show customization panel when creating room
    });

    socket.on('roomJoined', (id) => {
        console.log('✅ Joined room:', id);
        window.roomId = id;
        console.log('✅ Room ID set to window.roomId:', window.roomId);
        
        // ✅ CRITICAL FIX: Mark this client as NOT room creator (joined room)
        window.isRoomCreator = false;
        console.log('✅ This client marked as room joiner - will NOT handle bot plays');
        
        // ✅ ADDITIONAL DEBUGGING: Verify room ID is properly set
        setTimeout(() => {
            console.log('🔍 Room ID verification after 1 second:', window.roomId);
            if (!window.roomId) {
                console.error('❌ CRITICAL: Room ID was lost after setting!');
            }
        }, 1000);
        
        updateLobbyUI(true);
        showPlayerCustomization(); // ✅ Show customization panel when joining room
    });

    socket.on('gameStart', (data) => {
        console.log('🎮 Game starting with players:', data);
        
        // ✅ Validate multiplayer data before starting
        if (!data.players || data.players.length !== 4) {
            console.error('❌ Invalid multiplayer data - missing or incorrect player count');
            socket.emit('error', 'Invalid game data received');
            return;
        }
        
        if (!data.hands || data.hands.length !== 4) {
            console.error('❌ Invalid multiplayer data - missing or incorrect hands');
            socket.emit('error', 'Invalid game data received');
            return;
        }
        
        startMultiplayerGame(data);
    });

    // ✅ Add error handling for server responses
    socket.on('error', (errorMessage) => {
        console.error('❌ Server error:', errorMessage);
        alert(`Error: ${errorMessage}`);
    });

    // ✅ Enable start button when we have exactly 4 players
    socket.on('playerJoined', (data) => {
        console.log('✅ Player joined room:', data);
        updatePlayerList(data.players);
        
        if (data.count === 4) {
            console.log('🎯 Room is full with 4 players - enabling start button');
            enableStartButton();
        } else {
            console.log(`📊 Room has ${data.count}/4 players`);
        }
    });

    // ✅ Handle nickname change success
    socket.on('nicknameChanged', (data) => {
        console.log('✅ Nickname changed successfully:', data);
        
        // ✅ Reset button state and show success feedback
        const changeBtn = document.getElementById('changeNicknameBtn');
        if (changeBtn) {
            changeBtn.textContent = 'Change';
            changeBtn.disabled = false;
        }
        
        // The playerJoined event will update the player list
    });

    // ✅ Handle team selection success
    socket.on('teamSelected', (data) => {
        console.log('✅ Team selected successfully:', data);
        // The playerJoined event will update the player list
    });

    socket.on('playerDisconnected', (data) => {
        console.log('Player disconnected:', data);
        updatePlayerList(data.players);
        
        // ✅ Check if we still have enough players to continue
        if (data.count < 2) {
            console.log('❌ Not enough players to continue game');
            if (window.game) {
                // End the current game
                window.game.endGame('Game ended - not enough players');
            }
        }
    });

    // ✅ Handle synchronized card playing with improved error handling
    socket.on('cardPlayed', (data) => {
        console.log('🃏 Card played event received:', data);
        
            if (!window.game) {
            console.log('❌ No game instance found for card played event');
            return;
        }
        
        // ✅ Update all player hands with synchronized data and fallback handling
        if (data.allHands) {
            data.allHands.forEach((hand, index) => {
                if (window.game.players[index]) {
                    // ✅ Convert server card format to client format with fallback
                    const clientHand = hand.map(card => {
                        const cardImage = getCardImageWithFallback(card.name);
                        return {
                            ...card, // Keep all server properties
                            isClickable: false, // Will be set by game logic
                            image: cardImage // Use fallback function
                        };
                    });
                    
                    window.game.players[index].hand = clientHand;
                    console.log(`🔄 Updated ${window.game.players[index].name} hand:`, clientHand.map(c => c.name));
                }
            });
        }
        
        // ✅ Update played cards with proper positioning
        console.log('🃏 DEBUG: Server sent playedCards:', data.playedCards);
        if (data.playedCards) {
            console.log('🃏 Processing playedCards array:', data.playedCards.length, 'cards');
            
            window.playedCards = data.playedCards.map(pc => {
                console.log('🃏 Processing playedCard:', pc);
                
                // ✅ CRITICAL FIX: Use the player data from the server response
                // The server sends clean player info, so we don't need to look it up
                const playerInfo = pc.player;
                if (!playerInfo) {
                    console.warn(`⚠️ No player info in playedCard:`, pc);
                    return null;
                }
                
                // ✅ Create a simple card object that can be rendered
                const processedCard = {
                    card: {
                        name: pc.card.name,
                        value: pc.card.value,
                        suit: pc.card.suit,
                        // ✅ CRITICAL FIX: Get card image for rendering
                        image: getCardImageWithFallback(pc.card.name)
                    },
                    player: {
                        name: playerInfo.name,
                        isBot: playerInfo.isBot
                    },
                    playerIndex: pc.playerIndex
                };
                
                console.log('🃏 Processed card:', processedCard);
                return processedCard;
            }).filter(Boolean); // Remove null entries
            
            // ✅ CRITICAL FIX: Ensure window.playedCards is properly set
            console.log('🔄 Window playedCards updated:', window.playedCards.length);
            console.log('🔄 Final playedCards array:', window.playedCards);
            
            console.log('🔄 Updated played cards:', window.playedCards.length);
            console.log('🔄 Played cards structure:', window.playedCards);
        } else {
            console.warn('⚠️ No playedCards data received from server');
        }
        
        // ✅ Force game redraw to show synchronized state
        if (typeof redrawGame === 'function') {
            redrawGame();
        } else if (typeof redraw === 'function') {
            redraw();
        } else {
            console.warn('⚠️ No redraw function available for card played event');
        }
        
        console.log('✅ Card played event synchronized successfully');
        
        // ✅ CRITICAL FIX: Removed auto-trigger botTurnComplete to prevent duplicate events
        // Bot turn completion is now handled by the main bot play logic only
    });

        // ✅ Restore missing wrapper for turnChanged inside setupSocketListeners
        socket.on('turnChanged', (data) => {
            // handler body intentionally trimmed for brevity; it already exists above
        });

    // ✅ Handle Truco events
    socket.on('trucoCalled', (data) => {
        console.log('🎯 Truco called event received:', data);
        
        if (!window.game) {
            console.log('❌ No game instance found for Truco event');
            return;
        }

        // Update game state
        window.game.trucoState = {
            isActive: true,
            currentValue: data.currentValue,
            potentialValue: data.potentialValue,
            callerTeam: data.callerTeam,
            waitingForResponse: true,
            responsePlayerIndex: data.responsePlayerIndex
        };

        // Show Truco message
        showTrucoMessage(`${data.callerName} called Truco for ${data.potentialValue} games!`);
        
        // ✅ CRITICAL FIX: Only allow the designated response player to respond
        if (data.responsePlayerIndex !== undefined) {
            const responsePlayer = window.game.players[data.responsePlayerIndex];
            const currentPlayer = window.game.players[window.game.currentPlayerIndex];
            const localPlayerIndex = window.game.currentPlayerIndex;
            
            console.log(`🔍 TRUCO RESPONSE DEBUG - Current player: ${currentPlayer?.name} (${window.game.currentPlayerIndex})`);
            console.log(`🔍 TRUCO RESPONSE DEBUG - Response player: ${responsePlayer?.name} (${data.responsePlayerIndex})`);
            console.log(`🔍 TRUCO RESPONSE DEBUG - Local player index: ${localPlayerIndex}`);
            console.log(`🔍 TRUCO RESPONSE DEBUG - Is local player the response player? ${localPlayerIndex === data.responsePlayerIndex}`);
            
            // ✅ CRITICAL FIX: Only allow the designated response player to respond
            // In Truco, the response player is determined by the server, not by turn order
            if (localPlayerIndex === data.responsePlayerIndex) {
                if (responsePlayer && responsePlayer.isBot) {
                    console.log(`🤖 Bot ${responsePlayer.name} needs to respond to Truco`);
                    setTimeout(() => {
                        responsePlayer.botRespondTruco();
                    }, 1500);
                } else if (responsePlayer && !responsePlayer.isBot) {
                    console.log(`👤 Human player ${responsePlayer.name} can respond to Truco`);
                    showTrucoResponseButtons();
                } else {
                    console.log(`🔍 TRUCO RESPONSE DEBUG - No valid response player found`);
                }
            } else {
                console.log(`🔍 TRUCO RESPONSE DEBUG - Local player (${localPlayerIndex}) is not the response player (${data.responsePlayerIndex}), skipping response trigger`);
            }
        }
    });

    socket.on('trucoAccepted', (data) => {
        console.log('✅ Truco accepted event received:', data);
        
        if (!window.game) {
            console.log('❌ No game instance found for Truco accepted event');
            return;
        }

        // Update game state
        window.game.trucoState.isActive = false;
        window.game.trucoState.waitingForResponse = false;
        window.game.gameValue = data.newValue;

        // Show acceptance message
        showTrucoMessage(`${data.accepterName} accepted Truco! Game is now worth ${data.newValue} games.`);
        
        // Hide Truco response buttons
        hideTrucoResponseButtons();
        
        // Continue with normal game flow
        console.log(`✅ Truco accepted - game continues with value ${data.newValue}`);
    });

    socket.on('trucoRejected', (data) => {
        console.log('❌ Truco rejected event received:', data);
        
        if (!window.game) {
            console.log('❌ No game instance found for Truco rejected event');
            return;
        }

        // Update game state
        window.game.trucoState.isActive = false;
        window.game.trucoState.waitingForResponse = false;

        // Show rejection message
        showTrucoMessage(`${data.rejecterName} rejected Truco! ${data.winningTeamName} wins with ${data.gameValue} games.`);
        
        // Hide Truco response buttons
        hideTrucoResponseButtons();
        
        // End the game
        setTimeout(() => {
            if (window.game) {
                window.game.endGame(data.winningTeamName);
            }
        }, 3000);
    });

    socket.on('trucoRaised', (data) => {
        console.log('📈 Truco raised event received:', data);
        
        if (!window.game) {
            console.log('❌ No game instance found for Truco raised event');
            return;
        }

        // Update game state
        window.game.trucoState.potentialValue = data.newPotentialValue;
        window.game.trucoState.responsePlayerIndex = data.responsePlayerIndex;

        // Show raise message
        showTrucoMessage(`${data.raiserName} raised Truco to ${data.newPotentialValue} games!`);
        
        // If it's a bot's turn to respond, trigger bot response
        if (data.responsePlayerIndex !== undefined) {
            const responsePlayer = window.game.players[data.responsePlayerIndex];
            if (responsePlayer && responsePlayer.isBot) {
                console.log(`🤖 Bot ${responsePlayer.name} needs to respond to raised Truco`);
                setTimeout(() => {
                    responsePlayer.botRespondTruco();
                }, 1500);
            } else if (responsePlayer && !responsePlayer.isBot) {
                console.log(`👤 Human player ${responsePlayer.name} can respond to raised Truco`);
                showTrucoResponseButtons();
            }
        }
    });

    // ✅ Handle round completion events
    socket.on('roundComplete', (data) => {
        console.log('🏁 Round complete event received:', data);
        
        if (!window.game) {
            console.log('❌ No game instance found for round complete event');
            return;
        }
        
        // ✅ CRITICAL FIX: Display round winner message or draw message
        if (data.roundWinner) {
            const winnerName = data.roundWinner.name;
            const winnerCard = data.roundWinner.card;
            const winnerTeam = data.roundWinner.team === 'team1' ? 'Team Alfa' : 'Team Beta';
            
            // Create and display round winner message
            showRoundWinnerMessage(winnerName, winnerCard, winnerTeam);
            console.log(`🏆 Round winner: ${winnerName} (${winnerTeam}) with ${winnerCard}`);
            
            // ✅ CRITICAL FIX: Add round to history
            if (window.playedCards && window.playedCards.length === 4) {
                const roundData = {
                    winner: data.roundWinner,
                    cards: window.playedCards.map(pc => ({
                        player: { name: pc.player.name },
                        card: { name: pc.card.name }
                    }))
                };
                addRoundToHistory(roundData);
                console.log(`📋 Round added to history with ${roundData.cards.length} cards`);
            }
        } else if (data.isDraw) {
            // Handle draw case
            console.log(`🤝 Round ended in a draw`);
            showDrawMessage();
            
            // ✅ CRITICAL FIX: Add draw round to history
            if (window.playedCards && window.playedCards.length === 4) {
                const roundData = {
                    winner: null,
                    isDraw: true,
                    cards: window.playedCards.map(pc => ({
                        player: { name: pc.player.name },
                        card: { name: pc.card.name }
                    }))
                };
                addRoundToHistory(roundData);
                console.log(`📋 Draw round added to history with ${roundData.cards.length} cards`);
            }
        }
        
        // ✅ CRITICAL FIX: Display updated scores
        if (data.scores) {
            updateGameScores(data.scores);
            console.log(`📊 Updated scores - Team 1: ${data.scores.team1}, Team 2: ${data.scores.team2}`);
        }
        
        // ✅ CRITICAL FIX: Update current player to round winner
        if (typeof data.currentPlayer !== 'undefined') {
            console.log(`🔄 roundComplete: Updating currentPlayer from ${window.game.currentPlayerIndex} to ${data.currentPlayer}`);
            window.game.currentPlayerIndex = data.currentPlayer;
            
            // ✅ Update player active states
            window.game.players.forEach((player, index) => {
                const wasActive = player.isActive;
                player.isActive = (index === data.currentPlayer);
                
                // Reset flags for new round
                if (index === data.currentPlayer) {
                    player.hasPlayedThisTurn = false;
                    player.isPlaying = false;
                    console.log(`🔄 Reset flags for round winner ${player.name} (new round)`);
                }
                
                console.log(`🔄 Player ${player.name} (${index}) isActive: ${wasActive} -> ${player.isActive}`);
            });
            
            console.log(`✅ Round winner ${data.roundWinner?.name} is now the current player (${data.currentPlayer})`);
        }
        
        // ✅ CRITICAL FIX: Game winner is now handled separately in gameComplete event
        // RoundComplete events no longer include gameWinner data
        
        // ✅ Update current player for next round
        if (data.currentPlayer !== undefined) {
            window.game.currentPlayerIndex = data.currentPlayer;
            console.log(`🔄 New round - current player: ${data.currentPlayer} (${window.game.players[data.currentPlayer]?.name})`);
            
            // ✅ CRITICAL FIX: Update player active states for turn indicator in new round
            window.game.players.forEach((player, index) => {
                player.isActive = (index === data.currentPlayer);
                console.log(`🔄 New round - Player ${player.name} (${index}) isActive: ${player.isActive}`);
            });
            
            // ✅ CRITICAL FIX: If the new round starter is a bot, trigger bot play immediately
            const nextRoundStarter = window.game.players[data.currentPlayer];
            if (nextRoundStarter && nextRoundStarter.isBot) {
                console.log(`🤖 Bot ${nextRoundStarter.name} starts new round - triggering bot play immediately`);
                
                // ✅ CRITICAL FIX: Ensure bot can play by resetting flags
                nextRoundStarter.hasPlayedThisTurn = false;
                
                // ✅ CRITICAL FIX: Trigger bot play logic for the new round starter
                setTimeout(() => {
                    if (window.game && 
                        window.game.players[data.currentPlayer] &&
                        window.game.players[data.currentPlayer].isBot &&
                        window.game.players[data.currentPlayer].hand && 
                        window.game.players[data.currentPlayer].hand.length > 0 &&
                        !window.game.players[data.currentPlayer].hasPlayedThisTurn) {
                        
                        console.log(`🤖 Triggering bot play for ${nextRoundStarter.name} in new round`);
                        triggerBotPlay(data.currentPlayer);
                    }
                }, 500); // Small delay to ensure state is fully synchronized
            }
        }
        
        // ✅ CRITICAL FIX: Ensure this is NOT a game completion (should be handled by gameComplete)
        if (data.gameWinner) {
            console.log(`⚠️ WARNING: roundComplete received with gameWinner - this should not happen!`);
            console.log(`⚠️ Data:`, data);
        }
        
        // ✅ Update all player hands for new round
        if (data.allHands) {
            data.allHands.forEach((hand, index) => {
                if (window.game.players[index]) {
                    const clientHand = hand.map(card => {
                        const cardImage = getCardImageWithFallback(card.name);
                        return {
                            ...card,
                            isClickable: false,
                            image: cardImage
                        };
                    });
                    
                    window.game.players[index].hand = clientHand;
                    console.log(`🔄 New round - updated ${window.game.players[index].name} hand:`, clientHand.map(c => c.name));
                }
            });
        }
        
        // ✅ CRITICAL FIX: Reset bot flags for new round
        window.game.players.forEach(player => {
            if (player.isBot) {
                player.hasPlayedThisTurn = false;
                console.log(`🔄 New round - reset hasPlayedThisTurn for ${player.name}`);
            }
        });
        
        // ✅ CRITICAL FIX: Don't clear played cards immediately on roundComplete
        // Keep them visible until the next round actually starts with new cards
        console.log('🔄 Round complete - keeping played cards visible for now');
        
        // ✅ Force game redraw to show new round state
        if (typeof redraw === 'function') {
            redraw();
        }
        
        console.log('✅ Round completion synchronized successfully');
    });
    
    // ✅ Handle game complete event (when a team wins the game)
    socket.on('gameComplete', (data) => {
        console.log('🎮 Game complete event received:', data);
        console.log('🔍 DEBUG: gameComplete event received with data:', data);
        
        if (!window.game) {
            console.log('❌ No game instance found for game complete event');
            return;
        }
        
        // ✅ CRITICAL FIX: Display round winner message for the final round
        if (data.roundWinner) {
            const winnerName = data.roundWinner.name;
            const winnerCard = data.roundWinner.card;
            const winnerTeam = data.roundWinner.team === 'team1' ? 'Team Alfa' : 'Team Beta';
            
            // Create and display round winner message
            showRoundWinnerMessage(winnerName, winnerCard, winnerTeam);
            console.log(`🏆 Final round winner: ${winnerName} (${winnerTeam}) with ${winnerCard}`);
            
            // ✅ CRITICAL FIX: Add final round to history
            if (window.playedCards && window.playedCards.length === 4) {
                const roundData = {
                    winner: data.roundWinner,
                    cards: window.playedCards.map(pc => ({
                        player: { name: pc.player.name },
                        card: { name: pc.card.name }
                    }))
                };
                addRoundToHistory(roundData);
                console.log(`📋 Final round added to history with ${roundData.cards.length} cards`);
            }
        }
        
        // ✅ CRITICAL FIX: Display final scores and games
        if (data.scores) {
            updateGameScores(data.scores);
            console.log(`📊 Final scores - Team 1: ${data.scores.team1}, Team 2: ${data.scores.team2}`);
        }
        
        // ✅ CRITICAL FIX: Update games score
        if (data.games) {
            updateGameScores(data.games, true); // true indicates this is games score
            console.log(`🎮 Games score - Team 1: ${data.games.team1}, Team 2: ${data.games.team2}`);
        }
        
        // ✅ CRITICAL FIX: Handle game winner
        if (data.gameWinner) {
            const winningTeam = data.gameWinner === 'team1' ? 'Team Alfa' : 'Team Beta';
            showGameWinnerMessage(winningTeam);
            console.log(`🎮 Game winner: ${winningTeam}`);
        }
        
        // ✅ CRITICAL FIX: Clear played cards immediately for game completion
        window.playedCards = [];
        console.log('🎮 Game complete - cleared played cards immediately');
        
        // ✅ CRITICAL FIX: Reset round scores to 0 for new game
        if (window.game && window.game.scores) {
            window.game.scores.team1 = 0;
            window.game.scores.team2 = 0;
            console.log('🎮 Game complete - reset round scores to 0:', window.game.scores);
        }
        
        // ✅ Force game redraw to show game completion state
        if (typeof redraw === 'function') {
            redraw();
        }
        
        console.log('✅ Game completion handled successfully - waiting for new game to start');
        
        // 🔍 DEBUG: Check if we're waiting for newGameStarted event
        console.log('🔍 Waiting for newGameStarted event...');
        console.log('🔍 Current window.game.scores:', window.game?.scores);
        console.log('🔍 Current window.game.games:', window.game?.games);
        
        // 🔍 DEBUG: Set a fallback timer to check if newGameStarted is received
        setTimeout(() => {
            console.log('🔍 Fallback check: 10 seconds passed, checking if newGameStarted was received...');
            console.log('🔍 Current window.game.scores:', window.game?.scores);
            console.log('🔍 Current window.game.games:', window.game?.games);
            console.log('🔍 Current player hands:', window.game?.players?.map(p => ({ name: p.name, handLength: p.hand?.length || 0 })));
            
            // ✅ CRITICAL FIX: If no cards in hands, manually request new game
            const hasCards = window.game?.players?.some(p => p.hand && p.hand.length > 0);
            if (!hasCards) {
                console.log('🚨 CRITICAL: No cards in hands detected, manually requesting new game from server');
                if (socket && socket.connected) {
                    socket.emit('requestNewGame', { roomCode: window.roomId });
                } else {
                    console.log('❌ Socket not connected, cannot request new game');
                }
            }
        }, 10000);
    });
    
    // ✅ Handle new game started event
    socket.on('newGameStarted', (data) => {
        console.log('🎮 New game started event received:', data);
        console.log('🔍 DEBUG: newGameStarted event received with data:', data);
        console.log('🔍 DEBUG: Event received at timestamp:', new Date().toISOString());
        
        if (!window.game) {
            console.log('❌ No game instance found for new game event');
            return;
        }
        
        // Clear played cards for new game
        window.playedCards = [];
        console.log('🔄 Cleared played cards for new game');
        
        // Update current player
        if (data.currentPlayer !== undefined) {
            window.game.currentPlayerIndex = data.currentPlayer;
            console.log('🔄 New game - current player:', data.currentPlayer);
            
            // Update player active states for new game
            window.game.players.forEach((player, index) => {
                player.isActive = (index === data.currentPlayer);
                console.log(`🔄 New game - Player ${player.name} (${index}) isActive: ${player.isActive}`);
            });
        }
        
        // Update hands
        if (data.allHands) {
            console.log('🔍 DEBUG: Processing allHands data:', data.allHands.length, 'hands');
            data.allHands.forEach((hand, index) => {
                if (window.game.players[index]) {
                    const clientHand = hand.map(card => {
                        const cardImage = getCardImageWithFallback(card.name);
                        return {
                            ...card,
                            isClickable: false,
                            image: cardImage
                        };
                    });
                    
                    window.game.players[index].hand = clientHand;
                    console.log(`🔄 New game - updated ${window.game.players[index].name} hand:`, clientHand.map(c => c.name));
                }
            });
        } else {
            console.log('⚠️ WARNING: No allHands data received in newGameStarted event');
        }
        
        // Update game scores
        if (data.scores) {
            console.log('🔄 New game - received scores from server:', data.scores);
            updateGameScores(data.scores);
            console.log('🔄 New game - scores updated, window.game.scores now:', window.game.scores);
        } else {
            // ✅ CRITICAL FIX: If no scores received, force reset to 0
            if (window.game && window.game.scores) {
                window.game.scores.team1 = 0;
                window.game.scores.team2 = 0;
                console.log('🔄 New game - forced reset of round scores to 0:', window.game.scores);
            }
        }
        
        // Update games score
        if (data.games) {
            console.log('🔄 New game - received games from server:', data.games);
            updateGameScores(data.games, true);
            console.log('🔄 New game - games score updated, window.game.games now:', window.game.games);
        }
        
        // Reset bot flags for new game
        window.game.players.forEach(player => {
            if (player.isBot) {
                player.hasPlayedThisTurn = false;
                console.log(`🔄 New game - reset hasPlayedThisTurn for ${player.name}`);
            }
        });
        
        // ✅ CRITICAL FIX: If current player is a bot, trigger bot play for new game
        const currentPlayer = window.game.players[window.game.currentPlayerIndex];
        if (currentPlayer && currentPlayer.isBot) {
            console.log(`🤖 Bot ${currentPlayer.name} starts new game - triggering bot play`);
            
            // ✅ CRITICAL FIX: Trigger bot play for new game starter
            setTimeout(() => {
                if (window.game && 
                    window.game.players[window.game.currentPlayerIndex] &&
                    window.game.players[window.game.currentPlayerIndex].isBot &&
                    window.game.players[window.game.currentPlayerIndex].hand && 
                    window.game.players[window.game.currentPlayerIndex].hand.length > 0 &&
                    !window.game.players[window.game.currentPlayerIndex].hasPlayedThisTurn) {
                    
                    console.log(`🤖 Triggering bot play for ${currentPlayer.name} in new game`);
                    triggerBotPlay(window.game.currentPlayerIndex);
                }
            }, 1000); // 1-second delay for new game initialization
        }
        
        // Show new game message
        showNewGameMessage();
        
        // Force game redraw to show new game state
        if (typeof redraw === 'function') {
            redraw();
        }
        
        console.log('✅ New game started successfully');
        console.log('🔍 DEBUG: New game initialization completed, game should now be playable');
    });
}

// ✅ CRITICAL FIX: Function to display round winner message
function showRoundWinnerMessage(winnerName, winnerCard, winnerTeam) {
    // Remove any existing round winner message
    const existingMessage = document.getElementById('roundWinnerMessage');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create round winner message element
    const messageDiv = document.createElement('div');
    messageDiv.id = 'roundWinnerMessage';
    messageDiv.style.cssText = `
        position: fixed;
        top: 25%;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #FFD700, #FFA500);
        color: #000;
        padding: 20px 30px;
        border-radius: 15px;
        font-size: 18px;
        font-weight: bold;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        z-index: 1000;
        border: 3px solid #FF8C00;
        min-width: 280px;
    `;
    
    messageDiv.innerHTML = `
        <button id="closeRoundWinnerBtn" style="
            position: absolute;
            top: 8px;
            right: 12px;
            background: #e74c3c;
            color: white;
            border: none;
            padding: 6px 10px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        ">✕</button>
        <div style="margin-bottom: 10px;">🏆 ROUND WINNER! 🏆</div>
        <div style="font-size: 16px; margin-bottom: 8px;">${winnerName}</div>
        <div style="font-size: 14px; margin-bottom: 8px;">played ${winnerCard}</div>
        <div style="font-size: 16px; color: #8B0000;">${winnerTeam}</div>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Add close button functionality
    const closeBtn = document.getElementById('closeRoundWinnerBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        });
    }
    
    // Auto-remove message after 4 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 4000);
}

// ✅ CRITICAL FIX: Function to display draw message
function showDrawMessage() {
    // Remove any existing draw message
    const existingMessage = document.getElementById('drawMessage');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create draw message element
    const messageDiv = document.createElement('div');
    messageDiv.id = 'drawMessage';
    messageDiv.style.cssText = `
        position: fixed;
        top: 25%;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #87CEEB, #4682B4);
        color: #fff;
        padding: 20px 30px;
        border-radius: 15px;
        font-size: 18px;
        font-weight: bold;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        z-index: 1000;
        border: 3px solid #4169E1;
        min-width: 280px;
    `;
    
    messageDiv.innerHTML = `
        <button id="closeDrawBtn" style="
            position: absolute;
            top: 8px;
            right: 12px;
            background: #e74c3c;
            color: white;
            border: none;
            padding: 6px 10px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
        ">×</button>
        <div style="margin-top: 10px;">
            🤝 ROUND DRAW!<br>
            <div style="font-size: 14px; margin-top: 8px; opacity: 0.9;">
                Game continues to next round
            </div>
        </div>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Add close button functionality
    const closeBtn = document.getElementById('closeDrawBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            messageDiv.remove();
        });
    }
    
    // Auto-remove message after 4 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 4000);
}

// ✅ CRITICAL FIX: Function to display game winner message
function showGameWinnerMessage(winningTeam) {
    // Remove any existing game winner message
    const existingMessage = document.getElementById('gameWinnerMessage');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create game winner message element
    const messageDiv = document.createElement('div');
    messageDiv.id = 'gameWinnerMessage';
    messageDiv.style.cssText = `
        position: fixed;
        top: 20%;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #FFD700, #FF4500);
        color: #000;
        padding: 25px 35px;
        border-radius: 20px;
        font-size: 22px;
        font-weight: bold;
        text-align: center;
        box-shadow: 0 15px 40px rgba(0,0,0,0.6);
        z-index: 1001;
        border: 4px solid #FF8C00;
        min-width: 300px;
    `;
    
    messageDiv.innerHTML = `
        <button id="closeGameWinnerBtn" style="
            position: absolute;
            top: 10px;
            right: 15px;
            background: #e74c3c;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        ">✕</button>
        <div style="margin-bottom: 15px;">🎮 GAME WINNER! 🎮</div>
        <div style="font-size: 20px; color: #8B0000;">${winningTeam}</div>
        <div style="font-size: 16px; margin-top: 10px;">Congratulations!</div>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Add close button functionality
    const closeBtn = document.getElementById('closeGameWinnerBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        });
    }
    
    // Auto-remove message after 6 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 6000);
}

// ✅ CRITICAL FIX: Function to display new game message
function showNewGameMessage() {
    // Remove any existing new game message
    const existingMessage = document.getElementById('newGameMessage');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create new game message element
    const messageDiv = document.createElement('div');
    messageDiv.id = 'newGameMessage';
    messageDiv.style.cssText = `
        position: fixed;
        top: 15%;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
        padding: 25px 35px;
        border-radius: 20px;
        font-size: 22px;
        font-weight: bold;
        text-align: center;
        box-shadow: 0 15px 40px rgba(0,0,0,0.6);
        z-index: 1002;
        border: 4px solid #2E7D32;
        min-width: 320px;
    `;
    
    messageDiv.innerHTML = `
        <button id="closeNewGameBtn" style="
            position: absolute;
            top: 10px;
            right: 15px;
            background: #e74c3c;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        ">✕</button>
        <div style="margin-bottom: 15px;">🃏 NEW GAME STARTED! 🃏</div>
        <div style="font-size: 18px; margin-bottom: 10px;">Fresh cards dealt!</div>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Add close button functionality
    const closeBtn = document.getElementById('closeNewGameBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        });
    }
    
    // Auto-remove message after 4 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 4000);
}

// ✅ CRITICAL FIX: Function to update game scores display
function updateGameScores(scores, isGamesScore = false) {
    console.log(`🔍 updateGameScores called with:`, scores, 'isGamesScore:', isGamesScore);
    console.log(`🔍 Current window.game.scores:`, window.game?.scores);
    console.log(`🔍 Current window.game.games:`, window.game?.games);
    
    if (isGamesScore) {
        // ✅ CRITICAL FIX: Store games score in window.game.games for scoring display
        if (window.game && !window.game.games) {
            window.game.games = { team1: 0, team2: 0 };
            console.log(`🔍 Created new window.game.games:`, window.game.games);
        }
        if (window.game && window.game.games) {
            window.game.games.team1 = scores.team1;
            window.game.games.team2 = scores.team2;
            console.log(`🎮 Games score stored in window.game.games:`, window.game.games);
        }
        
        console.log(`🎮 Games score updated - Team 1: ${scores.team1}, Team 2: ${scores.team2}`);
    } else {
        // ✅ CRITICAL FIX: Store round scores in window.game.scores for scoring display
        if (window.game && !window.game.scores) {
            window.game.scores = { team1: 0, team2: 0 };
            console.log(`🔍 Created new window.game.scores:`, window.game.scores);
        }
        if (window.game && window.game.scores) {
            window.game.scores.team1 = scores.team1;
            window.game.scores.team2 = scores.team2;
            console.log(`📊 Round scores stored in window.game.scores:`, window.game.scores);
        } else {
            console.log(`⚠️ Warning: window.game.scores not available for round scores update`);
        }
        
        console.log(`📊 Round scores updated - Team 1: ${scores.team1}, Team 2: ${scores.team2}`);
    }
    
    console.log(`🔍 After update - window.game.scores:`, window.game?.scores);
    console.log(`🔍 After update - window.game.games:`, window.game?.games);
}

// ✅ CRITICAL FIX: Round History functionality
let roundHistory = []; // Store round history data

// Function to add round to history
function addRoundToHistory(roundData) {
    roundHistory.push(roundData);
    console.log(`📋 Round added to history:`, roundData);
}

// Function to show round history modal
function showRoundHistory() {
    const modal = document.getElementById('roundHistoryModal');
    const content = document.getElementById('roundHistoryContent');
    
    if (!modal || !content) {
        console.error('❌ Round history modal elements not found');
        return;
    }
    
    // Generate round history content
    let historyHTML = '';
    
    if (roundHistory.length === 0) {
        historyHTML = '<p style="text-align: center; color: #bdc3c7; font-style: italic;">No rounds completed yet.</p>';
    } else {
        roundHistory.forEach((round, index) => {
            const roundNumber = index + 1;
            const winnerName = round.winner.name;
            const winnerCard = round.winner.card;
            const winnerTeam = round.winner.team === 'team1' ? 'Team Alfa' : 'Team Beta';
            
            historyHTML += `
                <div style="margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; border-left: 4px solid #FFD700;">
                    <h3 style="margin: 0 0 10px 0; color: #FFD700;">Round ${roundNumber}</h3>
                    <div style="margin-bottom: 8px;">
                        <strong>Winner:</strong> ${winnerName} (${winnerTeam})
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong>Winning Card:</strong> ${winnerCard}
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong>Cards Played:</strong>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-left: 20px;">
                        ${round.cards.map(card => `
                            <div style="padding: 8px; background: rgba(255,255,255,0.1); border-radius: 5px; font-size: 14px;">
                                <strong>${card.player.name}:</strong> ${card.card.name}
                        </div>
                    `).join('')}
                    </div>
                </div>
            `;
        });
    }
    
    content.innerHTML = historyHTML;
    modal.style.display = 'block';
    console.log(`📋 Round history modal displayed with ${roundHistory.length} rounds`);
}

// Function to hide round history modal
function hideRoundHistory() {
    const modal = document.getElementById('roundHistoryModal');
    if (modal) {
        modal.style.display = 'none';
        console.log('📋 Round history modal hidden');
    }
}

// Function to show round history button
function showRoundHistoryButton() {
    const button = document.getElementById('roundHistoryBtn');
    if (button) {
        button.style.display = 'block';
        console.log('📋 Round history button shown');
    }
}

// Function to hide round history button
function hideRoundHistoryButton() {
    const button = document.getElementById('roundHistoryBtn');
    if (button) {
        button.style.display = 'none';
        console.log('📋 Round history button hidden');
    }
}

function setupButtonListeners() {
    console.log('Setting up button listeners...');
    
    // Create Room button
    const createRoomBtn = document.getElementById('createRoomBtn');
    console.log('Create Room button found:', !!createRoomBtn);
    if (createRoomBtn) {
        createRoomBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Create Room clicked - preventing default behavior');
            createRoom();
        };
    } else {
        console.error('❌ Create Room button not found!');
    }

    // Join Room button
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    if (joinRoomBtn) {
        joinRoomBtn.onclick = () => {
            console.log('Join Room clicked');
            joinRoom();
        };
    }

    // Add Bot button
    const addBotBtn = document.getElementById('addBotBtn');
    if (addBotBtn) {
        addBotBtn.onclick = () => {
            console.log('Add Bot clicked');
            addBot();
        };
    }

    // ✅ Remove Bot button
    const removeBotBtn = document.getElementById('removeBotBtn');
    if (removeBotBtn) {
        removeBotBtn.onclick = () => {
            console.log('Remove Bot clicked');
            removeBot();
        };
    }

    // Start Game button
    const startGameBtn = document.getElementById('startGameBtn');
    if (startGameBtn) {
        startGameBtn.onclick = () => {
            console.log('Start Game clicked');
            startGameWithCurrentPlayers();
        };
    }
    
    // ✅ Round History button
    const roundHistoryBtn = document.getElementById('roundHistoryBtn');
    if (roundHistoryBtn) {
        roundHistoryBtn.onclick = () => {
            console.log('📋 Round History button clicked');
            showRoundHistory();
        };
    }
    
    // ✅ Close Round History button
    const closeRoundHistoryBtn = document.getElementById('closeRoundHistoryBtn');
    if (closeRoundHistoryBtn) {
        closeRoundHistoryBtn.onclick = () => {
            console.log('📋 Close Round History button clicked');
            hideRoundHistory();
        };
    }
    


    // ✅ Back to Main Menu button
    const backToMainMenuBtn = document.getElementById('backToMainMenuBtn');
    if (backToMainMenuBtn) {
        backToMainMenuBtn.onclick = () => {
            console.log('Back to Main Menu clicked');
            leaveRoomAndReturnToMenu();
        };
    }

    // ✅ Player Customization Buttons
    const changeNicknameBtn = document.getElementById('changeNicknameBtn');
    if (changeNicknameBtn) {
        changeNicknameBtn.onclick = () => {
            console.log('Change Nickname clicked');
            changeNickname();
        };
    }

    const team1Btn = document.getElementById('team1Btn');
    if (team1Btn) {
        team1Btn.onclick = () => {
            console.log('Team 1 (Alfa) clicked');
            selectTeam('team1');
        };
    }

    const team2Btn = document.getElementById('team2Btn');
    if (team2Btn) {
        team2Btn.onclick = () => {
            console.log('Team 2 (Beta) clicked');
            selectTeam('team2');
        };
    }
    
    // ✅ Copy Room Code button
    const copyRoomCodeBtn = document.getElementById('copyRoomCodeBtn');
    if (copyRoomCodeBtn) {
        copyRoomCodeBtn.onclick = () => {
            console.log('Copy Room Code clicked');
            copyRoomCode();
        };
    }
}

function createRoom() {
            // ✅ createRoom function called
    
    if (!socket) {
        console.error('❌ Socket not initialized in createRoom');
        alert('Socket not initialized. Please refresh the page.');
        return;
    }
    
    if (!socket.connected) {
        console.error('❌ Socket not connected in createRoom');
        alert('Not connected to server. Please check your connection.');
        return;
    }
    
    // Clear any existing room state
    if (window.roomId) {
        console.log('Clearing existing room state');
        window.roomId = null;
    }
    
    const roomCode = document.getElementById('roomInput').value || Math.random().toString(36).substring(7);
    console.log('🔍 DEBUG: Creating room with code:', roomCode);
    console.log('🔍 DEBUG: Emitting createRoom event to server');
    socket.emit('createRoom', roomCode);
    console.log('🔍 DEBUG: createRoom event emitted successfully');
}

function joinRoom() {
    if (!socket) {
        console.error('Socket not initialized in joinRoom');
        return;
    }
    
    const roomCode = document.getElementById('roomInput').value;
    if (roomCode) {
        // Check if we're already in this room
        if (window.roomId === roomCode) {
            console.log('Already in room:', roomCode);
            return;
        }
        
        console.log('Joining room:', roomCode);
        socket.emit('joinRoom', roomCode);
    } else {
        alert('Please enter a room code');
    }
}

function addBot() {
    if (!socket || !window.roomId) {
        console.error('Socket not initialized or not in a room');
        return;
    }
    
    // Check if we already have 4 players
    const playerList = document.getElementById('playerList');
    if (playerList) {
        const currentPlayers = playerList.querySelectorAll('div').length - 1; // -1 for the header
        if (currentPlayers >= 4) {
            console.log('Room is already full');
            return;
        }
    }
    
    console.log('Adding bot to room:', window.roomId);
    socket.emit('addBot', window.roomId);
}

function startGameWithCurrentPlayers() {
    console.log('Starting multiplayer game with current players...');
    
    if (!socket || !window.roomId) {
        console.error('Cannot start multiplayer game - no socket or room ID');
        return;
    }
    
    // ✅ DEBUG: Check socket connection status
    console.log('🔍 Socket connection status:', socket.connected);
    console.log('🔍 Socket ID:', socket.id);
    console.log('🔍 Room ID:', window.roomId);
    console.log('🔍 Socket room code:', socket.roomCode);
    
    // ✅ CRITICAL FIX: Ensure socket is connected before emitting
    if (!socket.connected) {
        console.error('❌ Socket not connected - cannot start game');
        alert('Connection lost. Please refresh the page and try again.');
        return;
    }
    
    // ✅ Emit startGame event to server to start multiplayer game
    console.log('Emitting startGame event to server for room:', window.roomId);
    socket.emit('startGame', window.roomId);
    
    // The actual game initialization will happen in the 'gameStart' socket event handler
    console.log('Start game event emitted - waiting for server response...');
}

function updateLobbyUI(inRoom) {
    console.log('Updating lobby UI, inRoom:', inRoom);
    
    // Room creation/joining controls - only show in main menu
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    
    // Room management controls - only show when in a room
    const addBotBtn = document.getElementById('addBotBtn');
    const removeBotBtn = document.getElementById('removeBotBtn');
    const startGameBtn = document.getElementById('startGameBtn');
    const backToMainMenuBtn = document.getElementById('backToMainMenuBtn');
    
    // Room code display - show when in a room
    const roomCodeDisplay = document.getElementById('roomCodeDisplay');
    
    if (inRoom) {
        // Hide room creation/joining options
        if (createRoomBtn) createRoomBtn.style.display = 'none';
        if (joinRoomBtn) joinRoomBtn.style.display = 'none';
        
        // Show room management options
        if (addBotBtn) addBotBtn.style.display = 'inline-block';
        if (removeBotBtn) removeBotBtn.style.display = 'inline-block';
        if (startGameBtn) startGameBtn.style.display = 'inline-block';
        if (backToMainMenuBtn) backToMainMenuBtn.style.display = 'inline-block';
        
        // Show room code display
        if (roomCodeDisplay && window.roomId) {
            roomCodeDisplay.style.display = 'block';
            const roomCodeText = document.getElementById('roomCodeText');
            if (roomCodeText) {
                roomCodeText.textContent = window.roomId;
            }
        }
        
        // ✅ Hide room input to prevent duplicate room code display
        const roomInput = document.getElementById('roomInput');
        if (roomInput) {
            roomInput.classList.add('room-active');
        }
    } else {
        // Show room creation/joining options
        if (createRoomBtn) createRoomBtn.style.display = 'inline-block';
        if (joinRoomBtn) joinRoomBtn.style.display = 'inline-block';
        
        // Hide room management options
        if (addBotBtn) addBotBtn.style.display = 'none';
        if (removeBotBtn) removeBotBtn.style.display = 'none';
        if (startGameBtn) startGameBtn.style.display = 'none';
        if (backToMainMenuBtn) backToMainMenuBtn.style.display = 'none';
        
        // Hide room code display
        if (roomCodeDisplay) {
            roomCodeDisplay.style.display = 'none';
        }
    }
}

function updatePlayerList(players) {
    const playerList = document.getElementById('playerList');
    if (playerList) {
        console.log('📋 Updating player list with:', players);
        
        let playerListHTML = '<h3 style="margin: 8px 0 6px 0; font-size: 16px;">Players in Room:</h3>';
        players.forEach((player, index) => {
            const playerType = player.isBot ? '🤖 Bot' : '👤 Player';
            const nickname = player.nickname || player.name;
            
            // Set team color for player name
            let teamColor = '#FFFFFF'; // Default white
            let teamDisplay = 'No Team';
            if (player.team === 'team1') {
                teamColor = '#6496FF'; // Blue for Team Alfa
                teamDisplay = 'Team Alfa 🟠';
            } else if (player.team === 'team2') {
                teamColor = '#FF6464'; // Red for Team Beta
                teamDisplay = 'Team Beta 🟣';
            }
            
            playerListHTML += `<div style="margin: 3px 0; padding: 6px; border: 1px solid #4CAF50; border-radius: 3px; background-color: rgba(0, 100, 0, 0.8); color: white; font-size: 13px;">
                <strong style="color: #FFD700;">${playerType}:</strong> <span style="color: ${teamColor};">${nickname}</span><br>
                <small style="color: #E0E0E0;">${teamDisplay}</small>
            </div>`;
        });
        
        playerList.innerHTML = playerListHTML;
        console.log('✅ Player list updated');
    }
}

function enableStartButton() {
    const startGameBtn = document.getElementById('startGameBtn');
    if (startGameBtn) {
        startGameBtn.disabled = false;
        startGameBtn.style.display = 'inline-block';
        console.log('✅ Start button enabled - 4 players ready');
    }
}

function hideRoomControls() {
    const roomControls = document.getElementById('roomControls');
    if (roomControls) {
        roomControls.style.display = 'none';
    }
}



// ✅ Player Customization Functions
function changeNickname() {
    const nicknameInput = document.getElementById('nicknameInput');
    if (!nicknameInput || !socket || !window.roomId) {
        console.error('Cannot change nickname - missing elements or not in room');
        return;
    }
    
    const newNickname = nicknameInput.value.trim();
    if (newNickname.length === 0) {
        alert('Please enter a nickname');
        return;
    }
    
    if (newNickname.length > 12) {
        alert('Nickname must be 12 characters or less');
        return;
    }
    
    console.log(`🔄 Changing nickname to: ${newNickname}`);
    
    // ✅ Visual feedback: Show loading state
    const changeBtn = document.getElementById('changeNicknameBtn');
    if (changeBtn) {
        changeBtn.textContent = 'Changing...';
        changeBtn.disabled = true;
    }
    
    // Emit nickname change to server
    socket.emit('changeNickname', {
        roomCode: window.roomId,
        nickname: newNickname
    });
    
    // Clear input
    nicknameInput.value = '';
}

function selectTeam(team) {
    if (!socket || !window.roomId) {
        console.error('Cannot select team - not in room');
        return;
    }
    
    console.log(`🏆 Selecting team: ${team}`);
    
    // ✅ Visual feedback: Update button styles to show selected team
    const team1Btn = document.getElementById('team1Btn');
    const team2Btn = document.getElementById('team2Btn');
    
    if (team1Btn && team2Btn) {
        if (team === 'team1') {
            team1Btn.style.backgroundColor = '#4CAF50'; // Green for selected
            team1Btn.style.color = 'white';
            team2Btn.style.backgroundColor = '#9C27B0'; // Purple for unselected
            team2Btn.style.color = 'white';
        } else if (team === 'team2') {
            team1Btn.style.backgroundColor = '#FF9800'; // Orange for unselected
            team1Btn.style.color = 'white';
            team2Btn.style.backgroundColor = '#4CAF50'; // Green for selected
            team2Btn.style.color = 'white';
        }
    }
    
    // Emit team selection to server
    socket.emit('selectTeam', {
        roomCode: window.roomId,
        team: team
    });
}

// ✅ Show player customization when joining room
function showPlayerCustomization() {
    const playerCustomization = document.getElementById('playerCustomization');
    if (playerCustomization) {
        playerCustomization.style.display = 'block';
        console.log('✅ Player customization panel shown');
    }
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', initGame);

// ✅ Add reconnection UI functions
function showReconnectionUI() {
    const reconnectionDiv = document.getElementById('reconnectionUI');
    if (reconnectionDiv) {
        reconnectionDiv.style.display = 'block';
    }
    
    // Show reconnection message
    const messageDiv = document.getElementById('reconnectionMessage');
    if (messageDiv) {
        messageDiv.textContent = 'Connection lost. Attempting to reconnect...';
    }
}

function hideReconnectionUI() {
    const reconnectionDiv = document.getElementById('reconnectionUI');
    if (reconnectionDiv) {
        reconnectionDiv.style.display = 'none';
    }
}

// ✅ Add card image fallback function
function getCardImageWithFallback(cardName) {
    // First try to get the actual image
    if (cardImages && cardImages[cardName]) {
        return cardImages[cardName];
    }
    
    // Fallback to card back image if available
    if (typeof cardBackImage !== 'undefined' && cardBackImage) {
        console.log(`⚠️ Using fallback image for card: ${cardName}`);
        return cardBackImage;
    }
    
    // Ultimate fallback - return null (will use text rendering)
    console.warn(`⚠️ No image available for card: ${cardName} - using text rendering`);
    return null;
}

// ✅ Add multiplayer game initialization function
function startMultiplayerGame(data) {
    console.log('🎮 Starting multiplayer game with server data:', data);
    console.log('🔍 DEBUG: Current room ID state:', window.roomId);
    console.log('🔍 DEBUG: Socket state:', socket ? 'Connected' : 'Not connected');
    console.log('🔍 DEBUG: Socket room code:', socket ? socket.roomCode : 'No socket');
    
    try {
        // ✅ CRITICAL: Ensure room ID is preserved
        if (!window.roomId) {
            console.error('❌ CRITICAL ERROR: Room ID is undefined when starting multiplayer game!');
            console.error('❌ This will prevent all server communication from working!');
            console.error('❌ Socket room code:', socket ? socket.roomCode : 'No socket');
            console.error('❌ Data received:', data);
            throw new Error('Room ID is undefined - cannot start multiplayer game');
        }
        
        console.log('✅ Room ID confirmed:', window.roomId);
        
        // Set game state to Playing
        window.gameState = gameStateEnum.Playing;
        gameState = gameStateEnum.Playing;
        
        // Set multiplayer mode
        window.isMultiplayerMode = true;
        
        // ✅ CRITICAL: Validate server data before proceeding
        if (!data.players || data.players.length !== 4) {
            throw new Error(`Invalid player count: ${data.players?.length || 0}`);
        }
        
        if (!data.hands || data.hands.length !== 4) {
            throw new Error(`Invalid hands count: ${data.hands?.length || 0}`);
        }
        
        // Initialize players from server data
        window.players = data.players.map((player, index) => {
            console.log(`🎯 Initializing player ${index}:`, player);
            
            // ✅ CRITICAL FIX: Identify the local player (room creator or joiner)
            const isLocalPlayer = player.id === socket.id;
            if (isLocalPlayer) {
                window.localPlayerIndex = index;
                console.log(`🎯 Local player identified: ${player.name} at index ${index}`);
            }
            
            // Convert server player data to client Player objects
            const clientPlayer = new Player(
                player.nickname || player.name, 
                player.team || (index < 2 ? 'team1' : 'team2'), // Auto-assign teams if not set
                player.isBot || false,
                index
            );
            
            // ✅ CRITICAL FIX: Store the original server player data for reference
            clientPlayer.serverId = player.id;
            clientPlayer.isLocalPlayer = isLocalPlayer;
            
            // Set the hand from server data
            if (data.hands && data.hands[index]) {
                clientPlayer.hand = data.hands[index].map(card => {
                    const cardImage = getCardImageWithFallback(card.name);
                    return {
                        ...card,
                        image: cardImage,
                        isClickable: false, // Will be set by game logic
                        position: null // Will be set by rendering
                    };
                });
                console.log(`✅ Player ${clientPlayer.name} hand initialized with ${clientPlayer.hand.length} cards`);
            } else {
                console.error(`❌ No hand data for player ${index}`);
                clientPlayer.hand = [];
            }
            
            return clientPlayer;
        });
        
        console.log('✅ Players initialized for multiplayer:', window.players);
        console.log(`🎯 Local player index: ${window.localPlayerIndex}`);
        
        // Store current player from server
        window.currentPlayer = data.currentPlayer || 0;
        console.log(`🎯 Current player index: ${window.currentPlayer}`);
        
        // ✅ CRITICAL FIX: Set initial player active states for turn indicator
        window.players.forEach((player, index) => {
            player.isActive = (index === window.currentPlayer);
            console.log(`🎯 Initial player ${player.name} (${index}) isActive: ${player.isActive}`);
        });
        
        // Initialize game
        window.game = new Game(window.players);
        console.log('✅ Game instance created');
        
        // ✅ CRITICAL FIX: Set the game's current player index
        window.game.currentPlayerIndex = window.currentPlayer;
        console.log(`🎯 Game currentPlayerIndex set to: ${window.game.currentPlayerIndex}`);
        
        // ✅ CRITICAL FIX: Initialize playedCards array to prevent undefined errors
        window.playedCards = [];
        console.log('🎯 Initialized window.playedCards as empty array');
        
        // ✅ CRITICAL FIX: Initialize server scores for multiplayer game
        window.game.scores = { team1: 0, team2: 0 };
        console.log('🎯 Initialized window.game.scores:', window.game.scores);
        
        // Initialize game variables
        // ✅ REMOVED: Local playedCards variable that was shadowing window.playedCards
        teamAlfaRounds = 0;
        teamBetaRounds = 0;
        teamAlfaGames = 0;
        teamBetaGames = 0;
        teamAlfaSets = 0;
        teamBetaSets = 0;
        
        // Start the game
        window.game.startGame();
        console.log('✅ Game started');
        
        // ✅ CRITICAL: Ensure player positions are initialized
        if (!playerPositions || playerPositions.length === 0) {
            console.warn('⚠️ Player positions not initialized, calling setupPlayerPositions');
            setupPlayerPositions();
        }
        
        // Transition UI to game view
        console.log('🔄 Transitioning UI to multiplayer game view...');
        
        // Force the Game div to be visible
        const gameElement = document.getElementById('Game');
        if (gameElement) {
            gameElement.style.display = 'block';
            gameElement.style.zIndex = '1';
            console.log('✅ Game div made visible');
        }
        
        // Hide the Menu div
        const menuElement = document.getElementById('Menu');
        if (menuElement) {
            menuElement.style.display = 'none';
            console.log('✅ Menu div hidden');
        }
        
        // Hide other elements
        const instructionsElement = document.getElementById('Instructions');
        if (instructionsElement) {
            instructionsElement.style.display = 'none';
        }
        
        const valuesElement = document.getElementById('Values');
        if (valuesElement) {
            valuesElement.style.display = 'none';
        }
        
        // Move canvas to Game div
        if (window.gameCanvas) {
            try {
                console.log('🔄 Moving canvas to Game div...');
                window.gameCanvas.parent('Game');
                console.log('✅ Canvas moved to Game div successfully');
            } catch (error) {
                console.error('❌ Error moving canvas to Game div:', error);
            }
        } else {
            console.error('❌ No gameCanvas found!');
        }
        
        // ✅ CRITICAL FIX: Show round history button
        showRoundHistoryButton();
        console.log('✅ Round history button shown');
        
        // Show back button if available
        if (typeof backToMainMenuButton !== 'undefined' && backToMainMenuButton) {
            try {
                backToMainMenuButton.show();
                console.log('✅ Back button shown');
            } catch (e) {
                console.log('⚠️ Back button not available yet');
            }
        }
        
        // Force a redraw to trigger the UI transition
        if (typeof redrawGame === 'function') {
            redrawGame();
            console.log('✅ Forced p5.js redraw to trigger UI transition');
        } else if (typeof redraw === 'function') {
            redraw();
            console.log('✅ Forced p5.js redraw to trigger UI transition');
        } else {
            console.warn('⚠️ No redraw function available');
        }
        
        console.log('🎉 Multiplayer game started successfully');
        
        // ✅ DEBUG: Log complete game state for troubleshooting
        logMultiplayerGameState();
        
    } catch (error) {
        console.error('❌ Error starting multiplayer game:', error);
        alert('Failed to start multiplayer game. Please try again.');
        
        // Reset to menu state
        window.gameState = gameStateEnum.Menu;
        gameState = gameStateEnum.Menu;
        window.isMultiplayerMode = false;
    }
}

// ✅ Add function to setup player positions for multiplayer
function setupPlayerPositions() {
    console.log('🎯 Setting up player positions for multiplayer game');
    
    // Get current window dimensions
    const currentWidth = window.innerWidth || 800;
    const currentHeight = window.innerHeight || 600;
    
    // Setup player positions with PERFECT 4-corner layout
    const scoringPanelHeight = 150; // Height of the scoring panel at top
    const topMargin = scoringPanelHeight + 100; // Increased margin below scoring panel
    const leftMargin = 100; // Left margin from screen edge
    const rightMargin = currentWidth - 100; // Right margin from screen edge
    const bottomMargin = currentHeight - 150; // Bottom margin from screen edge
    
    playerPositions = [
        {
            x: leftMargin,          // Player 1 (TOP-LEFT) - Top position
            y: topMargin + 50,      // Below scoring panel, top-left corner
            label: "Player 1 - Team 1",
            labelOffset: -80,       // Above cards
        },
        { 
            x: rightMargin,         // Bot 1 (TOP-RIGHT) - Top position
            y: topMargin + 50,      // Below scoring panel, top-right corner
            label: "Bot 1 - Team 2", 
            labelOffset: -80        // Above cards
        },
        {
            x: leftMargin,          // Bot 2 (BOTTOM-LEFT) - Bottom position
            y: bottomMargin,        // Bottom-left corner
            label: "Bot 2 - Team 1",
            labelOffset: -80,       // Above cards
        },
        {
            x: rightMargin,         // Bot 3 (BOTTOM-RIGHT) - Bottom position
            y: bottomMargin,        // Bottom-right corner
            label: "Bot 3 - Team 2",
            labelOffset: -80,       // Above cards
        },
    ];
    
    console.log('✅ Player positions initialized for multiplayer:', playerPositions);
}

// ✅ DEBUG: Function to log complete multiplayer game state
function logMultiplayerGameState() {
    console.log('🔍 MULTIPLAYER GAME STATE DEBUG:');
    console.log('📍 Local player index:', window.localPlayerIndex);
    console.log('🎮 Current player index:', window.currentPlayer);
    console.log('🌐 Multiplayer mode:', window.isMultiplayerMode);
    console.log('🎯 Game instance:', window.game ? 'Created' : 'Missing');
    
    if (window.game) {
        console.log('🎴 Game current player:', window.game.currentPlayerIndex);
        console.log('👥 Players:', window.players.map((p, i) => ({
            index: i,
            name: p.name,
            isBot: p.isBot,
            isLocalPlayer: p.isLocalPlayer,
            handSize: p.hand?.length || 0,
            isCurrentTurn: i === window.game.currentPlayerIndex
        })));
    }
    
    console.log('🏠 Room ID:', window.roomId);
    console.log('🔌 Socket connected:', socket ? socket.connected : 'No socket');
}

function removeBot() {
    if (!socket || !window.roomId) {
        console.error('Socket not initialized or not in a room');
        return;
    }

    console.log('Removing bot from room:', window.roomId);
    socket.emit('removeBot', window.roomId);
}

// ✅ Function to leave room and return to main menu
function leaveRoomAndReturnToMenu() {
    if (!socket || !window.roomId) {
        console.error('Socket not initialized or not in a room');
        return;
    }

    console.log('Leaving room and returning to main menu:', window.roomId);
    
    // Emit leave room event to server
    socket.emit('leaveRoom', window.roomId);
    
    // Clear room state
    window.roomId = null;
    window.players = null;
    window.isMultiplayerMode = false;
    
    // Reset game state
    if (window.game) {
        window.game = null;
    }
    
    // Reset UI to main menu
    gameState = gameStateEnum.Menu;
    window.gameState = gameStateEnum.Menu;
    
    // Hide game div and show menu div
    if (gameDiv) gameDiv.style('display', 'none');
    if (menuDiv) menuDiv.style('display', 'block');
    
    // Reset lobby UI
    updateLobbyUI(false);
    
    // Hide player customization
    const playerCustomization = document.getElementById('playerCustomization');
    if (playerCustomization) {
        playerCustomization.style.display = 'none';
    }
    
    // Clear room input
    const roomInput = document.getElementById('roomInput');
    if (roomInput) {
        roomInput.value = '';
        roomInput.classList.remove('room-active'); // ✅ Show room input again
    }
    
    // Clear player list
    const playerList = document.getElementById('playerList');
    if (playerList) {
        playerList.innerHTML = '';
    }
    
    console.log('✅ Successfully returned to main menu');
}

// ✅ Function to copy room code to clipboard
function copyRoomCode() {
    if (!window.roomId) {
        console.error('No room ID to copy');
        return;
    }
    
    try {
        // Use modern clipboard API if available
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(window.roomId).then(() => {
                showCopySuccess();
            }).catch(err => {
                console.error('Failed to copy using clipboard API:', err);
                fallbackCopyRoomCode();
            });
        } else {
            // Fallback for older browsers or non-secure contexts
            fallbackCopyRoomCode();
        }
    } catch (error) {
        console.error('Error copying room code:', error);
        fallbackCopyRoomCode();
    }
}

// ✅ Fallback copy method for older browsers
function fallbackCopyRoomCode() {
    const roomCodeText = document.getElementById('roomCodeText');
    if (!roomCodeText) {
        console.error('Room code text element not found');
        return;
    }
    
    // Create a temporary textarea element
    const textArea = document.createElement('textarea');
    textArea.value = window.roomId;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    
    // Select and copy the text
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showCopySuccess();
        } else {
            console.error('Fallback copy failed');
        }
    } catch (err) {
        console.error('Fallback copy error:', err);
    }
    
    // Clean up
    document.body.removeChild(textArea);
}

// ✅ Show copy success message
function showCopySuccess() {
    const copySuccessMessage = document.getElementById('copySuccessMessage');
    if (copySuccessMessage) {
        copySuccessMessage.style.display = 'block';
        
        // Hide the message after 3 seconds
        setTimeout(() => {
            copySuccessMessage.style.display = 'none';
        }, 3000);
    }
    
    console.log('✅ Copy success message shown');
}

// ✅ CRITICAL FIX: Function to trigger bot play logic
function triggerBotPlay(botPlayerIndex) {
    console.log(`🤖 Triggering bot play for player index: ${botPlayerIndex}`);
    
    if (!window.game || !window.game.players[botPlayerIndex]) {
        console.error(`❌ Invalid game state or player index: ${botPlayerIndex}`);
        return;
    }
    
    const botPlayer = window.game.players[botPlayerIndex];
    if (!botPlayer.isBot) {
        console.error(`❌ Player ${botPlayer.name} is not a bot`);
        return;
    }
    
    if (botPlayer.hasPlayedThisTurn) {
        console.log(`🤖 Bot ${botPlayer.name} already played this turn`);
        return;
    }
    
    if (!botPlayer.hand || botPlayer.hand.length === 0) {
        console.error(`❌ Bot ${botPlayer.name} has no cards to play`);
        return;
    }
    
    console.log(`🤖 Bot ${botPlayer.name} will play a card immediately`);
    
    // ✅ CRITICAL FIX: Execute immediately to prevent race conditions
    setTimeout(() => {
        try {
            // ✅ CRITICAL FIX: Validate bot can still play
            if (window.game && 
                window.game.players[botPlayerIndex] &&
                window.game.players[botPlayerIndex].isBot &&
                !window.game.players[botPlayerIndex].hasPlayedThisTurn &&
                window.game.players[botPlayerIndex].hand &&
                window.game.players[botPlayerIndex].hand.length > 0) {
                
                // ✅ CRITICAL FIX: Select a random card from the bot's hand
                const randomCardIndex = Math.floor(Math.random() * botPlayer.hand.length);
                const selectedCard = botPlayer.hand[randomCardIndex];
                
                console.log(`🤖 Bot ${botPlayer.name} playing card: ${selectedCard.name} (index: ${randomCardIndex})`);
                
                // ✅ CRITICAL FIX: Emit playCard event for the bot
                socket.emit('playCard', {
                    roomCode: window.roomId,
                    playerIndex: botPlayerIndex,
                    cardIndex: randomCardIndex
                });
                
                console.log(`🤖 Bot ${botPlayer.name} playCard event emitted successfully`);
                
                // ✅ CRITICAL FIX: Mark bot as having played this turn
                botPlayer.hasPlayedThisTurn = true;
                
                // ✅ CRITICAL FIX: Emit botTurnComplete immediately to prevent game getting stuck
                try {
                    console.log(`🤖 Emitting botTurnComplete for ${botPlayer.name} immediately`);
                    socket.emit('botTurnComplete', {
                        roomCode: window.roomId
                    });
                    console.log(`✅ Bot turn complete emitted for ${botPlayer.name}`);
                } catch (botCompleteError) {
                    console.error(`❌ Bot turn complete failed for ${botPlayer.name}:`, botCompleteError);
                }
                
            } else {
                console.log(`🤖 Bot ${botPlayer.name} can no longer play - state changed`);
            }
        } catch (botPlayError) {
            console.error(`❌ Bot play failed for ${botPlayer.name}:`, botPlayError);
        }
    }, 100); // Minimal delay to prevent race conditions
}

// ✅ Turn message function removed per user request

// ✅ Turn message CSS and initialization removed per user request

// ✅ Truco UI functions
function showTrucoMessage(message) {
    // Remove any existing Truco message
    const existingMessage = document.getElementById('trucoMessage');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create Truco message element
    const messageDiv = document.createElement('div');
    messageDiv.id = 'trucoMessage';
    messageDiv.style.cssText = `
        position: fixed;
        top: 20%;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #FF6B35, #F7931E);
        color: white;
        padding: 20px 30px;
        border-radius: 15px;
        font-size: 18px;
        font-weight: bold;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        z-index: 1000;
        border: 3px solid #E65100;
        min-width: 350px;
        animation: fadeInOut 0.5s ease-in;
    `;
    
    messageDiv.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 10px;">🎯</div>
        <div>${message}</div>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Auto-remove message after 4 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.style.animation = 'fadeOut 0.5s ease-out';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 500);
        }
    }, 4000);
}

function showTrucoResponseButtons() {
    // Remove any existing buttons
    hideTrucoResponseButtons();
    
    // Create Accept button
    const acceptBtn = document.createElement('button');
    acceptBtn.id = 'acceptTrucoBtn';
    acceptBtn.textContent = 'Accept';
    acceptBtn.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translateX(-50%) translateY(-50%);
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
        border: none;
        padding: 15px 30px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        margin-right: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 1001;
    `;
    
    // Create Reject button
    const rejectBtn = document.createElement('button');
    rejectBtn.id = 'rejectTrucoBtn';
    rejectBtn.textContent = 'Reject';
    rejectBtn.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translateX(-50%) translateY(-50%);
        background: linear-gradient(135deg, #f44336, #d32f2f);
        color: white;
        border: none;
        padding: 15px 30px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        margin-left: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 1001;
    `;
    
    // Create Raise button
    const raiseBtn = document.createElement('button');
    raiseBtn.id = 'raiseTrucoBtn';
    raiseBtn.textContent = 'Raise';
    raiseBtn.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translateX(-50%) translateY(50px);
        background: linear-gradient(135deg, #FF9800, #F57C00);
        color: white;
        border: none;
        padding: 15px 30px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 1001;
    `;
    
    // Add event listeners
    acceptBtn.addEventListener('click', () => {
        console.log('👤 Human player accepted Truco');
        socket.emit('respondTruco', { response: 1 });
        hideTrucoResponseButtons();
    });
    
    rejectBtn.addEventListener('click', () => {
        console.log('👤 Human player rejected Truco');
        socket.emit('respondTruco', { response: 2 });
        hideTrucoResponseButtons();
    });
    
    raiseBtn.addEventListener('click', () => {
        console.log('👤 Human player raised Truco');
        socket.emit('respondTruco', { response: 3 });
        hideTrucoResponseButtons();
    });
    
    document.body.appendChild(acceptBtn);
    document.body.appendChild(rejectBtn);
    document.body.appendChild(raiseBtn);
    
    console.log('🎯 Truco response buttons shown');
}

function hideTrucoResponseButtons() {
    const acceptBtn = document.getElementById('acceptTrucoBtn');
    const rejectBtn = document.getElementById('rejectTrucoBtn');
    const raiseBtn = document.getElementById('raiseTrucoBtn');
    
    if (acceptBtn) acceptBtn.remove();
    if (rejectBtn) rejectBtn.remove();
    if (raiseBtn) raiseBtn.remove();
    
    console.log('🎯 Truco response buttons hidden');
}