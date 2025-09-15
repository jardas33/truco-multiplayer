// ✅ CRITICAL TEST: Log that JavaScript is executing
console.log('🚨 CRITICAL: lobby.js is executing at:', new Date().toISOString());

// Global variables
// socket is already declared in variables.js
// gameInitialized is already declared in variables.js

// Helper function to get room code from window.roomId
function getRoomCode() {
    return typeof window.roomId === 'object' ? window.roomId.roomId : window.roomId;
}

// Initialize socket and lobby when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚨 CRITICAL: DOMContentLoaded event fired, initializing lobby');
    console.log('DOM loaded, initializing game...');
    
    // Initialize game framework for Truco
    if (typeof GameFramework !== 'undefined') {
        GameFramework.initialize('truco');
    }
    
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
            console.log(`🔍 DEBUG: turnChanged event received. New current player index: ${data.currentPlayer}`);
            console.log(`🔍 DEBUG: turnChanged event stack trace:`, new Error().stack);
            console.log(`🔍 DEBUG: turnChanged event timestamp: ${new Date().toISOString()}`);
            console.log(`🔍 DEBUG: Previous currentPlayerIndex: ${window.game?.currentPlayerIndex}`);
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
            
            // ✅ CRITICAL FIX: Check if this turnChanged is from a previous round
            // If we just completed a round and the round winner is starting, ignore old turnChanged events
            if (window.game.roundJustCompleted && window.game.roundWinnerStarting) {
                console.log('🚫 Ignoring turnChanged event from previous round - round winner is starting new round');
                console.log('🔍 DEBUG: roundJustCompleted:', window.game.roundJustCompleted, 'roundWinnerStarting:', window.game.roundWinnerStarting);
                return;
            }
            
            // ✅ CRITICAL FIX: Update current player FIRST to prevent race conditions
            console.log(`🔍 DEBUG: About to update currentPlayerIndex from ${window.game.currentPlayerIndex} to ${data.currentPlayer}`);
            window.game.currentPlayerIndex = data.currentPlayer;
            console.log(`🔄 Updated currentPlayerIndex to: ${data.currentPlayer}`);
            console.log(`🔍 DEBUG: currentPlayerIndex update completed at: ${new Date().toISOString()}`);
            
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
                    if (window.game.players[index] && hand && Array.isArray(hand)) {
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
                        
                        // ✅ CRITICAL FIX: Check if bot was already triggered by roundComplete to prevent duplicates
                        if (currentPlayer.botTriggeredByRoundComplete) {
                            console.log(`🤖 Bot ${currentPlayer.name} already triggered by roundComplete - skipping turnChanged trigger`);
                            return; // Skip this trigger to prevent duplicate bot plays
                        }
                        
                        // ✅ PACING FIX: Use immediate validation but delayed execution for visual pacing
                        if (window.game && 
                            !window.gameCompleted &&
                            window.game.players[data.currentPlayer] &&
                            window.game.players[data.currentPlayer].isBot &&
                            window.game.players[data.currentPlayer].hand && 
                            window.game.players[data.currentPlayer].hand.length > 0 &&
                                    !window.game.players[data.currentPlayer].hasPlayedThisTurn &&
                            !window.game.players[data.currentPlayer].isPlaying &&
                            // ✅ CRITICAL FIX: Don't play card if bot needs to respond to Truco
                            !(window.game.trucoState && window.game.trucoState.waitingForResponse && 
                              window.game.trucoState.responsePlayerIndex === data.currentPlayer)) {
                                    
                            console.log(`🤖 Bot ${currentPlayer.name} validated for play - executing with visual delay`);
                            
                            // ✅ PACING FIX: Execute bot play with visual delay for better UX
                            const turnChangedTimeoutId = setTimeout(() => {
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
                                            roomCode: getRoomCode(),
                                            cardIndex: cardIndex,
                                            playerIndex: data.currentPlayer
                                        });
                                        
                                    console.log(`🤖 Bot ${bot.name} card play event sent`);
                                        
                                    // ✅ PACING FIX: Emit botTurnComplete with additional delay for pacing
                                        setTimeout(() => {
                                            try {
                                                console.log(`🔍 DEBUG: Sending botTurnComplete event for bot ${bot.name} (${data.currentPlayer})`);
                                                socket.emit('botTurnComplete', {
                                                    roomCode: getRoomCode(),
                                                    playerIndex: data.currentPlayer,
                                                    roundNumber: window.game?.currentRound || 0
                                                });
                                            console.log(`🤖 Bot ${bot.name} turn complete - notified server`);
                                            } catch (turnCompleteError) {
                                                console.error(`❌ Bot ${bot.name} turn complete failed:`, turnCompleteError);
                                            }
                                    }, 1000); // 1 second delay for pacing
                                    }
                            }, 1500); // 1.5 second visual delay for pacing
                            
                            // ✅ CRITICAL FIX: Track timeout ID for cancellation
                            if (!window.pendingBotTimeouts) {
                                window.pendingBotTimeouts = [];
                            }
                            window.pendingBotTimeouts.push(turnChangedTimeoutId);
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
            
            // ✅ CRITICAL FIX: Update Truco button after turn change
            if (typeof showTrucoButton === 'function') {
                showTrucoButton();
            }
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

    // Handle players updated event
    socket.on('playersUpdated', (players) => {
        console.log('✅ Players updated:', players);
        updatePlayerList(players);
        
        if (players.length === 4) {
            console.log('🎯 Room is full with 4 players - enabling start button');
            enableStartButton();
        } else {
            console.log(`📊 Room has ${players.length}/4 players`);
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
        
        // ✅ Disable start button if we don't have 4 players
        if (data.count < 4) {
            console.log('🎯 Room has', data.count, 'players - disabling start button');
            const startGameBtn = document.getElementById('startGameBtn');
            if (startGameBtn) {
                startGameBtn.disabled = true;
            }
        }
        
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
        console.log('🔍 TRUCO EVENT DEBUG - Local player index:', window.localPlayerIndex);
        console.log('🔍 TRUCO EVENT DEBUG - Response player index:', data.responsePlayerIndex);
        console.log('🔍 TRUCO EVENT DEBUG - Is this client the response player?', window.localPlayerIndex === data.responsePlayerIndex);
        
        if (!window.game) {
            console.log('❌ No game instance found for Truco event');
            return;
        }

        // ✅ TRUCO HISTORY: Track Truco call event
        currentRoundTrucoEvents.push({
            type: 'called',
            caller: data.callerName,
            callerTeam: data.callerTeam,
            potentialValue: data.potentialValue,
            timestamp: new Date().toISOString()
        });
        console.log('📋 Truco call tracked for round history');

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
            const localPlayerIndex = window.localPlayerIndex;
            
            console.log(`🔍 TRUCO RESPONSE DEBUG - Current player: ${currentPlayer?.name} (${window.game.currentPlayerIndex})`);
            console.log(`🔍 TRUCO RESPONSE DEBUG - Response player: ${responsePlayer?.name} (${data.responsePlayerIndex})`);
            console.log(`🔍 TRUCO RESPONSE DEBUG - Local player index: ${localPlayerIndex}`);
            console.log(`🔍 TRUCO RESPONSE DEBUG - Is local player the response player? ${localPlayerIndex === data.responsePlayerIndex}`);
            
            // ✅ CRITICAL FIX: Handle bot responses and human responses separately
            if (responsePlayer && responsePlayer.isBot) {
                // Bot response - always allow human player's client to trigger bot responses
                console.log(`🤖 Bot ${responsePlayer.name} needs to respond to Truco`);
                const botResponseTimeoutId = setTimeout(() => {
                    responsePlayer.botRespondTruco();
                }, 1500);
                
                // ✅ CRITICAL FIX: Track timeout ID for cancellation
                if (!window.pendingBotTimeouts) {
                    window.pendingBotTimeouts = [];
                }
                window.pendingBotTimeouts.push(botResponseTimeoutId);
            } else if (responsePlayer && !responsePlayer.isBot) {
                // Human response - only show response buttons to the specific player who needs to respond
                if (localPlayerIndex === data.responsePlayerIndex) {
                    console.log(`👤 Human player ${responsePlayer.name} (local player) can respond to Truco`);
                    showTrucoResponseButtons();
                } else {
                    console.log(`👤 Human player ${responsePlayer.name} needs to respond, but this is not the local player`);
                }
            } else {
                console.log(`🔍 TRUCO RESPONSE DEBUG - No valid response player found`);
            }
        }
    });

    socket.on('trucoAccepted', (data) => {
        console.log('✅ Truco accepted event received:', data);
        
        if (!window.game) {
            console.log('❌ No game instance found for Truco accepted event');
            return;
        }

        // ✅ TRUCO HISTORY: Track Truco acceptance event
        currentRoundTrucoEvents.push({
            type: 'accepted',
            accepter: data.accepterName,
            accepterTeam: data.accepterTeam,
            newGameValue: data.newGameValue,
            timestamp: new Date().toISOString()
        });
        console.log('📋 Truco acceptance tracked for round history');

        // Update game state to match server
        window.game.trucoState.isActive = false;
        window.game.trucoState.waitingForResponse = false;
        window.game.trucoState.responsePlayerIndex = null; // ✅ CRITICAL FIX: Clear response player
        window.game.trucoState.currentValue = data.newGameValue; // ✅ CRITICAL FIX: Update currentValue when Truco is accepted
        window.game.gameValue = data.newGameValue;
        
        // ✅ CRITICAL FIX: Keep callerTeam as the original caller's team
        // The original caller's team cannot raise, the accepter's team can raise
        console.log(`🔍 TRUCO ACCEPTANCE DEBUG - Keeping callerTeam as original caller: ${window.game.trucoState.callerTeam}`);
        // Don't update callerTeam - keep it as the original caller's team

        // Show acceptance message
        showTrucoMessage(`${data.accepterName} accepted Truco! Game is now worth ${data.newGameValue} games.`);
        
        // Hide Truco response buttons
        hideTrucoResponseButtons();
        
        // Continue with normal game flow
        console.log(`✅ Truco accepted - game continues with value ${data.newGameValue}`);
        
        // ✅ CRITICAL FIX: Update Truco button after acceptance
        console.log('🔍 DEBUG: About to call showTrucoButton after Truco acceptance');
        console.log('🔍 DEBUG: showTrucoButton function exists:', typeof showTrucoButton === 'function');
        if (typeof showTrucoButton === 'function') {
            console.log('🔍 DEBUG: Calling showTrucoButton()');
            showTrucoButton();
            console.log('🔍 DEBUG: showTrucoButton() called successfully');
        } else {
            console.error('❌ showTrucoButton function not found!');
        }
    });

    socket.on('trucoRejected', (data) => {
        console.log('❌ Truco rejected event received:', data);
        console.log('🔍 DEBUG: trucoRejected event handler called');
        console.log('🔍 DEBUG: Event data:', JSON.stringify(data, null, 2));
        
        if (!window.game) {
            console.log('❌ No game instance found for Truco rejected event');
            return;
        }

        // ✅ TRUCO HISTORY: Track Truco rejection event
        currentRoundTrucoEvents.push({
            type: 'rejected',
            rejecter: data.rejecterName,
            rejecterTeam: data.rejecterTeam,
            winningTeam: data.winningTeam,
            gameValue: data.gameValue,
            timestamp: new Date().toISOString()
        });
        console.log('📋 Truco rejection tracked for round history');

        // Update game state
        window.game.trucoState.isActive = false;
        window.game.trucoState.waitingForResponse = false;

        // Show rejection message
        showTrucoMessage(`${data.rejecterName} rejected Truco! ${data.winningTeamName} wins with ${data.gameValue} games.`);
        
        // Hide Truco response buttons
        hideTrucoResponseButtons();
        
        // ✅ CRITICAL FIX: Don't call endGame() here - server handles game completion
        // The server will emit gameComplete event and start a new game automatically
        console.log('✅ Truco rejection handled - waiting for server to complete game and start new one');
        
        // ✅ CRITICAL FIX: Update Truco button after rejection
        if (typeof showTrucoButton === 'function') {
            showTrucoButton();
        }
    });

    socket.on('trucoRaised', (data) => {
        console.log('📈 Truco raised event received:', data);
        
        if (!window.game) {
            console.log('❌ No game instance found for Truco raised event');
            return;
        }

        // ✅ TRUCO HISTORY: Track Truco raise event
        currentRoundTrucoEvents.push({
            type: 'raised',
            raiser: data.raiserName,
            raiserTeam: data.raiserTeam,
            newPotentialValue: data.newPotentialValue,
            timestamp: new Date().toISOString()
        });
        console.log('📋 Truco raise tracked for round history');

        // Update game state
        window.game.trucoState.potentialValue = data.newPotentialValue;
        window.game.trucoState.responsePlayerIndex = data.responsePlayerIndex;
        // ✅ CRITICAL FIX: Update callerTeam to the team that just raised
        if (data.raiserTeam) {
            window.game.trucoState.callerTeam = data.raiserTeam;
        }

        // Show raise message
        showTrucoMessage(`${data.raiserName} raised Truco to ${data.newPotentialValue} games!`);
        
        // ✅ CRITICAL FIX: Update Truco button after raise
        if (typeof showTrucoButton === 'function') {
            showTrucoButton();
        }
        
        // If it's a bot's turn to respond, trigger bot response
        if (data.responsePlayerIndex !== undefined) {
            const responsePlayer = window.game.players[data.responsePlayerIndex];
            const localPlayerIndex = window.localPlayerIndex;
            
            if (responsePlayer && responsePlayer.isBot) {
                console.log(`🤖 Bot ${responsePlayer.name} needs to respond to raised Truco`);
                const botRaiseResponseTimeoutId = setTimeout(() => {
                    responsePlayer.botRespondTruco();
                }, 1500);
                
                // ✅ CRITICAL FIX: Track timeout ID for cancellation
                if (!window.pendingBotTimeouts) {
                    window.pendingBotTimeouts = [];
                }
                window.pendingBotTimeouts.push(botRaiseResponseTimeoutId);
            } else if (responsePlayer && !responsePlayer.isBot) {
                // Human response - only show response buttons to the specific player who needs to respond
                if (localPlayerIndex === data.responsePlayerIndex) {
                    console.log(`👤 Human player ${responsePlayer.name} (local player) can respond to raised Truco`);
                    showTrucoResponseButtons();
                } else {
                    console.log(`👤 Human player ${responsePlayer.name} needs to respond, but this is not the local player`);
                }
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
            
            // ✅ CRITICAL FIX: Update round counter for client
            window.game.currentRound = (window.game.currentRound || 0) + 1;
            console.log(`🔄 Round counter updated to: ${window.game.currentRound}`);
            
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
            
        // ✅ CRITICAL FIX: Cancel any pending bot actions from the previous round
        if (window.pendingBotTimeouts) {
            window.pendingBotTimeouts.forEach(timeoutId => {
                clearTimeout(timeoutId);
                console.log('🚫 Cancelled pending bot timeout from previous round:', timeoutId);
            });
            window.pendingBotTimeouts = [];
            console.log('🚫 All pending bot plays cancelled due to round completion');
        }
        
        // ✅ CRITICAL FIX: Clear ALL timeouts to prevent any lingering bot actions
        // This is a nuclear option to ensure no bot actions from previous round interfere
        for (let i = 1; i < 10000; i++) {
            clearTimeout(i);
        }
        console.log('🚫 NUCLEAR OPTION: Cleared all timeouts to prevent lingering bot actions');
        
        // ✅ CRITICAL FIX: Set flags to ignore old turnChanged events from previous round
        window.game.roundJustCompleted = true;
        window.game.roundWinnerStarting = true;
        console.log('🔒 Set flags to ignore old turnChanged events from previous round');
        
        // ✅ CRITICAL FIX: Only trigger bot play immediately for actual round winners, not draw rounds
        if (!data.isDraw) {
            const nextRoundStarter = window.game.players[data.currentPlayer];
            if (nextRoundStarter && nextRoundStarter.isBot) {
                console.log(`🤖 Bot ${nextRoundStarter.name} starts new round - triggering bot play immediately`);
                
                // ✅ CRITICAL FIX: Ensure bot can play by resetting flags
                nextRoundStarter.hasPlayedThisTurn = false;
                
                // ✅ CRITICAL FIX: Set flag to prevent duplicate bot triggers
                nextRoundStarter.botTriggeredByRoundComplete = true;
                    
                    // ✅ CRITICAL FIX: Trigger bot play logic for the new round starter
                    const roundCompleteTimeoutId = setTimeout(() => {
                        if (window.game && 
                            !window.gameCompleted &&
                            window.game.players[data.currentPlayer] &&
                            window.game.players[data.currentPlayer].isBot &&
                            window.game.players[data.currentPlayer].hand && 
                            window.game.players[data.currentPlayer].hand.length > 0 &&
                            !window.game.players[data.currentPlayer].hasPlayedThisTurn) {
                            
                            console.log(`🤖 Triggering bot play for ${nextRoundStarter.name} in new round`);
                            triggerBotPlay(data.currentPlayer);
                        }
                    }, 500); // Small delay to ensure state is fully synchronized
                    
                    // ✅ CRITICAL FIX: Track timeout ID for cancellation
                    if (!window.pendingBotTimeouts) {
                        window.pendingBotTimeouts = [];
                    }
                    window.pendingBotTimeouts.push(roundCompleteTimeoutId);
                }
        } else {
            console.log(`🤝 Draw round - not triggering bot play immediately, waiting for turnChanged event`);
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
        console.log('🔍 DEBUG: gameComplete event handler called');
        console.log('🔍 DEBUG: Event data:', JSON.stringify(data, null, 2));
        
        // ✅ CRITICAL FIX: Set game completion flag to prevent further card playing
        window.gameCompleted = true;
        console.log('🔒 Game completed - card playing disabled until new game starts');
        
        // ✅ CRITICAL FIX: Cancel any pending bot plays from the previous game
        if (window.pendingBotTimeouts) {
            window.pendingBotTimeouts.forEach(timeoutId => {
                clearTimeout(timeoutId);
                console.log('🚫 Cancelled pending bot timeout:', timeoutId);
            });
            window.pendingBotTimeouts = [];
            console.log('🚫 All pending bot plays cancelled due to game completion');
        }
        
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
        
        // ✅ CRITICAL FIX: Update sets score
        if (data.sets) {
            if (!window.game.sets) {
                window.game.sets = { team1: 0, team2: 0 };
            }
            window.game.sets = data.sets;
            console.log(`🏆 Sets score - Team 1: ${data.sets.team1}, Team 2: ${data.sets.team2}`);
        }
        
        // ✅ CRITICAL FIX: Handle set win notification
        if (data.setWinner) {
            const winningTeam = data.setWinner === 'team1' ? 'Team Alfa' : 'Team Beta';
            console.log(`🏆 Set won by: ${winningTeam}`);
            // Store set winner for combined popup
            window.lastSetWinner = winningTeam;
        }
        
        // ✅ CRITICAL FIX: Handle game winner - will be shown in combined popup
        if (data.gameWinner) {
            const winningTeam = data.gameWinner === 'team1' ? 'Team Alfa' : 'Team Beta';
            console.log(`🎮 Game winner: ${winningTeam}`);
            // Store winning team for combined popup
            window.lastGameWinner = winningTeam;
        }
        
        // ✅ CRITICAL FIX: Clear played cards immediately for game completion
        window.playedCards = [];
        
        // ✅ CRITICAL FIX: Reset round scores to 0 for new game
        if (window.game && window.game.scores) {
            window.game.scores.team1 = 0;
            window.game.scores.team2 = 0;
        }
        
        // ✅ Force game redraw to show game completion state
        if (typeof redraw === 'function') {
            redraw();
        }
        
        console.log('✅ Game completion handled successfully - waiting for new game to start');
        
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
                    socket.emit('requestNewGame', { roomCode: getRoomCode() });
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
        
        // ✅ CRITICAL FIX: Start new game in history tracking
        startNewGameInHistory();
        
        // ✅ CRITICAL FIX: Reset game completion flag to allow card playing in new game
        window.gameCompleted = false;
        console.log('🔓 New game started - card playing enabled');
        
        // ✅ CRITICAL FIX: Reset Truco state for new game
        if (window.game && window.game.trucoState) {
            window.game.trucoState = {
                isActive: false,
                currentValue: 1,
                potentialValue: 3,
                callerTeam: null,
                callerIndex: null,
                waitingForResponse: false,
                responsePlayerIndex: null
            };
            console.log('🔄 Client-side Truco state reset for new game - all players can call Truco again');
            
            // ✅ CRITICAL FIX: Update Truco button after new game starts
            if (typeof showTrucoButton === 'function') {
                showTrucoButton();
            }
        }
        
        if (!window.game) {
            console.log('❌ No game instance found for new game event');
            return;
        }
        
        // Clear played cards for new game
        window.playedCards = [];
        console.log('🔄 Cleared played cards for new game');
        
        // Update current player
        if (data.currentPlayer !== undefined) {
            console.log('🔍 DEBUG: newGameStarted - received currentPlayer:', data.currentPlayer);
            console.log('🔍 DEBUG: newGameStarted - currentPlayer type:', typeof data.currentPlayer);
            console.log('🔍 DEBUG: newGameStarted - currentPlayer name:', window.game.players[data.currentPlayer]?.name);
            console.log('🔍 DEBUG: newGameStarted - currentPlayer team:', window.game.players[data.currentPlayer]?.team);
            console.log('🔍 DEBUG: newGameStarted - currentPlayer isBot:', window.game.players[data.currentPlayer]?.isBot);
            
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
        
        // Update sets score
        if (data.sets) {
            console.log('🔄 New game - received sets from server:', data.sets);
            if (!window.game.sets) {
                window.game.sets = { team1: 0, team2: 0 };
            }
            window.game.sets = data.sets;
            console.log('🔄 New game - sets score updated, window.game.sets now:', window.game.sets);
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
            const newGameTimeoutId = setTimeout(() => {
                if (window.game && 
                    !window.gameCompleted &&
                    window.game.players[window.game.currentPlayerIndex] &&
                    window.game.players[window.game.currentPlayerIndex].isBot &&
                    window.game.players[window.game.currentPlayerIndex].hand && 
                    window.game.players[window.game.currentPlayerIndex].hand.length > 0 &&
                    !window.game.players[window.game.currentPlayerIndex].hasPlayedThisTurn) {
                    
                    console.log(`🤖 Triggering bot play for ${currentPlayer.name} in new game`);
                    triggerBotPlay(window.game.currentPlayerIndex);
                }
            }, 1000); // 1-second delay for new game initialization
            
            // ✅ CRITICAL FIX: Track timeout ID for cancellation
            if (!window.pendingBotTimeouts) {
                window.pendingBotTimeouts = [];
            }
            window.pendingBotTimeouts.push(newGameTimeoutId);
        }
        
        // Show combined game winner + new game message
        showCombinedGameMessage();
        
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
    addToPopupQueue('roundWinner', { winnerName, winnerCard, winnerTeam });
    }
    
function showRoundWinnerMessagePopup(data) {
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
        <div style="font-size: 16px; margin-bottom: 8px;">${data.winnerName}</div>
        <div style="font-size: 14px; margin-bottom: 8px;">played ${data.winnerCard}</div>
        <div style="font-size: 16px; color: #8B0000;">${data.winnerTeam}</div>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Add close button functionality
    const closeBtn = document.getElementById('closeRoundWinnerBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            clearCurrentPopup();
        });
    }
}

// ✅ CRITICAL FIX: Function to display draw message
function showDrawMessage() {
    addToPopupQueue('draw', null);
}

function showDrawMessagePopup() {
    
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
            clearCurrentPopup();
        });
    }
}

// ✅ CRITICAL FIX: Function to display combined game winner + new game message
function showCombinedGameMessage() {
    const winningTeam = window.lastGameWinner || null;
    addToPopupQueue('combinedGame', winningTeam, 6000); // Longer duration for combined message
}

// ✅ DEPRECATED: Function to display game winner message (now combined)
function showGameWinnerMessage(winningTeam) {
    addToPopupQueue('gameWinner', winningTeam, 5000); // Longer duration for game winner
    }

function showCombinedGameMessagePopup(winningTeam) {
    // Create combined game winner + new game message element
    const messageDiv = document.createElement('div');
    messageDiv.id = 'combinedGameMessage';
    messageDiv.style.cssText = `
        position: fixed;
        top: 15%;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #FFD700, #4CAF50);
        color: #000;
        padding: 30px 40px;
        border-radius: 20px;
        font-size: 22px;
        font-weight: bold;
        text-align: center;
        box-shadow: 0 15px 40px rgba(0,0,0,0.6);
        z-index: 1001;
        border: 4px solid #FF8C00;
        min-width: 350px;
    `;
    
    let content = '';
    if (winningTeam) {
        content = `
            <div style="margin-bottom: 20px;">🎮 GAME WINNER! 🎮</div>
            <div style="font-size: 20px; color: #8B0000; margin-bottom: 15px;">${winningTeam}</div>
            <div style="font-size: 16px; margin-bottom: 20px;">Congratulations!</div>
            <div style="border-top: 2px solid #000; padding-top: 15px; margin-top: 15px;">
                <div style="font-size: 18px;">🃏 NEW GAME STARTED! 🃏</div>
            </div>
        `;
    } else {
        content = `
            <div style="margin-bottom: 15px;">🃏 NEW GAME STARTED! 🃏</div>
        `;
    }
    
    messageDiv.innerHTML = `
        <button id="closeCombinedGameBtn" style="
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
        ${content}
    `;
    
    document.body.appendChild(messageDiv);
    
    // Add close button functionality
    const closeBtn = document.getElementById('closeCombinedGameBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            clearCurrentPopup();
        });
    }
}

function showGameWinnerMessagePopup(winningTeam) {
    
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
            clearCurrentPopup();
        });
    }
}

// ✅ DEPRECATED: Function to display new game message (now combined with game winner)
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
let currentGameNumber = 1; // Track current game number
let currentRoundTrucoEvents = []; // Track Truco events for current round

// Function to add round to history
function addRoundToHistory(roundData) {
    // Add game number and Truco events to round data
    const roundWithGame = {
        ...roundData,
        gameNumber: currentGameNumber,
        trucoEvents: [...currentRoundTrucoEvents] // Copy current round's Truco events
    };
    roundHistory.push(roundWithGame);
    console.log(`📋 Round added to history for Game ${currentGameNumber}:`, roundWithGame);
    
    // Reset Truco events for next round
    currentRoundTrucoEvents = [];
    console.log('📋 Truco events reset for next round');
}

// Function to start new game in history
function startNewGameInHistory() {
    currentGameNumber++;
    console.log(`📋 New game started in history: Game ${currentGameNumber}`);
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
        // Group rounds by game
        const roundsByGame = {};
        roundHistory.forEach((round, index) => {
            const gameNum = round.gameNumber || 1;
            if (!roundsByGame[gameNum]) {
                roundsByGame[gameNum] = [];
            }
            roundsByGame[gameNum].push({ ...round, originalIndex: index });
        });
        
        // Display rounds grouped by game
        Object.keys(roundsByGame).sort((a, b) => parseInt(a) - parseInt(b)).forEach(gameNum => {
            const gameRounds = roundsByGame[gameNum];
            
            // Game header
            historyHTML += `
                <div style="margin-bottom: 25px; padding: 20px; background: linear-gradient(135deg, #3498db, #2980b9); border-radius: 12px; border: 2px solid #2980b9;">
                    <h2 style="margin: 0 0 15px 0; color: #fff; text-align: center; font-size: 24px;">
                        🎮 GAME ${gameNum} 🎮
                    </h2>
            `;
            
                        // Rounds for this game
            gameRounds.forEach((round, roundIndex) => {
                const roundNumber = roundIndex + 1;
                
                // Handle draw rounds
                if (round.isDraw) {
                    historyHTML += `
                        <div style="margin-bottom: 15px; padding: 15px; background: rgba(255,255,255,0.15); border-radius: 8px; border-left: 4px solid #FFA500;">
                            <h3 style="margin: 0 0 10px 0; color: #FFA500; font-size: 18px;">Round ${roundNumber}</h3>
                            <div style="margin-bottom: 8px; color: #fff;">
                                <strong>Result:</strong> 🤝 DRAW
                            </div>
                            <div style="margin-bottom: 8px; color: #fff;">
                                <strong>Cards Played:</strong>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-left: 20px;">
                                ${round.cards.map(card => `
                                    <div style="padding: 8px; background: rgba(255,255,255,0.2); border-radius: 5px; font-size: 14px; color: #fff;">
                                        <strong>${card.player.name}:</strong> ${card.card.name}
                                    </div>
                                `).join('')}
                            </div>
                            
                            ${round.trucoEvents && round.trucoEvents.length > 0 ? `
                                <div style="margin-top: 12px; padding: 10px; background: rgba(255, 193, 7, 0.2); border-radius: 6px; border-left: 3px solid #FFC107;">
                                    <div style="margin-bottom: 6px; color: #FFC107; font-weight: bold;">
                                        🎯 TRUCO EVENTS:
                                    </div>
                                    ${round.trucoEvents.map(event => {
                                        switch(event.type) {
                                            case 'called':
                                                return `<div style="color: #fff; font-size: 13px; margin-bottom: 4px;">
                                                    <strong>📢 Called:</strong> ${event.caller} (${event.callerTeam === 'team1' ? 'Team Alfa' : 'Team Beta'}) - Game worth ${event.potentialValue} games
                                                </div>`;
                                            case 'accepted':
                                                return `<div style="color: #4CAF50; font-size: 13px; margin-bottom: 4px;">
                                                    <strong>✅ Accepted:</strong> ${event.accepter} (${event.accepterTeam === 'team1' ? 'Team Alfa' : 'Team Beta'}) - Game now worth ${event.newGameValue} games
                                                </div>`;
                                            case 'rejected':
                                                return `<div style="color: #f44336; font-size: 13px; margin-bottom: 4px;">
                                                    <strong>❌ Rejected:</strong> ${event.rejecter} (${event.rejecterTeam === 'team1' ? 'Team Alfa' : 'Team Beta'}) - ${event.winningTeam === 'team1' ? 'Team Alfa' : 'Team Beta'} wins ${event.gameValue} games
                                                </div>`;
                                            case 'raised':
                                                return `<div style="color: #FF9800; font-size: 13px; margin-bottom: 4px;">
                                                    <strong>📈 Raised:</strong> ${event.raiser} (${event.raiserTeam === 'team1' ? 'Team Alfa' : 'Team Beta'}) - Game now worth ${event.newPotentialValue} games
                                                </div>`;
                                            default:
                                                return '';
                                        }
                                    }).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `;
                } else {
                    // Handle regular rounds with winners
            const winnerName = round.winner.name;
            const winnerCard = round.winner.card;
            const winnerTeam = round.winner.team === 'team1' ? 'Team Alfa' : 'Team Beta';
            
            historyHTML += `
                        <div style="margin-bottom: 15px; padding: 15px; background: rgba(255,255,255,0.15); border-radius: 8px; border-left: 4px solid #FFD700;">
                            <h3 style="margin: 0 0 10px 0; color: #FFD700; font-size: 18px;">Round ${roundNumber}</h3>
                            <div style="margin-bottom: 8px; color: #fff;">
                        <strong>Winner:</strong> ${winnerName} (${winnerTeam})
                    </div>
                            <div style="margin-bottom: 8px; color: #fff;">
                        <strong>Winning Card:</strong> ${winnerCard}
                    </div>
                            <div style="margin-bottom: 8px; color: #fff;">
                        <strong>Cards Played:</strong>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-left: 20px;">
                        ${round.cards.map(card => `
                                    <div style="padding: 8px; background: rgba(255,255,255,0.2); border-radius: 5px; font-size: 14px; color: #fff;">
                                <strong>${card.player.name}:</strong> ${card.card.name}
                        </div>
                    `).join('')}
                    </div>
                    
                    ${round.trucoEvents && round.trucoEvents.length > 0 ? `
                        <div style="margin-top: 12px; padding: 10px; background: rgba(255, 193, 7, 0.2); border-radius: 6px; border-left: 3px solid #FFC107;">
                            <div style="margin-bottom: 6px; color: #FFC107; font-weight: bold;">
                                🎯 TRUCO EVENTS:
                            </div>
                            ${round.trucoEvents.map(event => {
                                switch(event.type) {
                                    case 'called':
                                        return `<div style="color: #fff; font-size: 13px; margin-bottom: 4px;">
                                            <strong>📢 Called:</strong> ${event.caller} (${event.callerTeam === 'team1' ? 'Team Alfa' : 'Team Beta'}) - Game worth ${event.potentialValue} games
                                        </div>`;
                                    case 'accepted':
                                        return `<div style="color: #4CAF50; font-size: 13px; margin-bottom: 4px;">
                                            <strong>✅ Accepted:</strong> ${event.accepter} (${event.accepterTeam === 'team1' ? 'Team Alfa' : 'Team Beta'}) - Game now worth ${event.newGameValue} games
                                        </div>`;
                                    case 'rejected':
                                        return `<div style="color: #f44336; font-size: 13px; margin-bottom: 4px;">
                                            <strong>❌ Rejected:</strong> ${event.rejecter} (${event.rejecterTeam === 'team1' ? 'Team Alfa' : 'Team Beta'}) - ${event.winningTeam === 'team1' ? 'Team Alfa' : 'Team Beta'} wins ${event.gameValue} games
                                        </div>`;
                                    case 'raised':
                                        return `<div style="color: #FF9800; font-size: 13px; margin-bottom: 4px;">
                                            <strong>📈 Raised:</strong> ${event.raiser} (${event.raiserTeam === 'team1' ? 'Team Alfa' : 'Team Beta'}) - Game now worth ${event.newPotentialValue} games
                                        </div>`;
                                    default:
                                        return '';
                                }
                            }).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
                }
            });
            
            // Close game section
            historyHTML += `</div>`;
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

// ✅ Back to Main Menu from Game function
function backToMainMenuFromGame() {
    console.log('🏠 Returning to main menu from game');
    
    // ✅ IMPROVED: Return to actual main menu, not lobby
    if (confirm('Are you sure you want to leave the game? You will return to the main menu.')) {
        console.log('🔄 Starting main menu transition...');
        
        // ✅ Use existing leaveRoomAndReturnToMenu function for proper room cleanup
        leaveRoomAndReturnToMenu();
        
        // ✅ ADDITIONAL GAME-SPECIFIC CLEANUP
        window.gameCompleted = false;
        window.playedCards = [];
        // Don't clear gameCanvas reference - we need it for future games
        // window.gameCanvas = null;
        
        // ✅ HIDE ALL GAME ELEMENTS
        const gameDiv = document.getElementById('Game');
        const instructionsDiv = document.getElementById('Instructions');
        const valuesDiv = document.getElementById('Values');
        
        if (gameDiv) {
            gameDiv.style.display = 'none';
            console.log('✅ Game div hidden');
        }
        
        if (instructionsDiv) {
            instructionsDiv.style.display = 'none';
            console.log('✅ Instructions div hidden');
        }
        
        if (valuesDiv) {
            valuesDiv.style.display = 'none';
            console.log('✅ Values div hidden');
        }
        
        // ✅ CANVAS MANAGEMENT - Hide canvas completely for main menu
        const canvas = document.querySelector('canvas');
        const menuDiv = document.getElementById('Menu');
        
        if (canvas) {
            // Hide canvas completely - main menu uses HTML elements, not canvas
            canvas.style.display = 'none';
            console.log('✅ Canvas hidden for main menu');
        }
        
        // ✅ SHOW MAIN MENU
        if (menuDiv) {
            menuDiv.style.display = 'block';
            console.log('✅ Menu div shown');
        }
        
        // ✅ HIDE GAME BUTTONS
        hideGameButtons();
        
        // ✅ RESET GAME STATE
        if (typeof gameState !== 'undefined') {
            gameState = gameStateEnum.Menu;
            console.log('✅ Game state reset to Menu');
        }
        
        // ✅ FORCE UI REFRESH
        if (typeof loop === 'function') {
            loop();
            console.log('✅ P5.js loop called');
        }
        
        // ✅ ADDITIONAL UI REFRESH
        setTimeout(() => {
            if (typeof redraw === 'function') {
                redraw();
                console.log('✅ P5.js redraw called');
            }
        }, 100);
        
        console.log('✅ Successfully returned to main menu');
    } else {
        console.log('❌ User cancelled return to main menu');
    }
}

// ✅ Show Card Values from Game function
function showCardValuesFromGame() {
    console.log('🃏 Showing card values from game');
    
    // Store current game state
    if (typeof gameState !== 'undefined') {
        previousGameState = gameState;
        gameState = gameStateEnum.CardValues;
    }
    
    // Hide game elements
    const gameDiv = document.getElementById('Game');
    if (gameDiv) {
        gameDiv.style.display = 'none';
    }
    
    // Show values elements
    const valuesDiv = document.getElementById('Values');
    if (valuesDiv) {
        valuesDiv.style.display = 'block';
    }
    
    // ✅ CRITICAL: Force canvas to redraw for card values
    if (typeof loop === 'function') {
        loop();
    }
    
    console.log('✅ Card values displayed');
}

// ✅ Hide Game Buttons function
function hideGameButtons() {
    const gameBackToMenuBtn = document.getElementById('gameBackToMenuBtn');
    const gameCardValuesBtn = document.getElementById('gameCardValuesBtn');
    const roundHistoryBtn = document.getElementById('roundHistoryBtn');
    
    if (gameBackToMenuBtn) {
        gameBackToMenuBtn.style.display = 'none';
    }
    if (gameCardValuesBtn) {
        gameCardValuesBtn.style.display = 'none';
    }
    if (roundHistoryBtn) {
        roundHistoryBtn.style.display = 'none';
    }
    
    // Game buttons hidden
}

// ✅ Show Game Buttons function
function showGameButtons() {
    const gameBackToMenuBtn = document.getElementById('gameBackToMenuBtn');
    const gameCardValuesBtn = document.getElementById('gameCardValuesBtn');
    const roundHistoryBtn = document.getElementById('roundHistoryBtn');
    
    if (gameBackToMenuBtn) {
        gameBackToMenuBtn.style.display = 'block';
    }
    if (gameCardValuesBtn) {
        gameCardValuesBtn.style.display = 'block';
    }
    if (roundHistoryBtn) {
        roundHistoryBtn.style.display = 'block';
    }
    
    // Game buttons shown
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
    
    // ✅ Back to Main Menu button (in game)
    const gameBackToMenuBtn = document.getElementById('gameBackToMenuBtn');
    if (gameBackToMenuBtn) {
        gameBackToMenuBtn.onclick = () => {
            console.log('🏠 Back to Main Menu button clicked');
            backToMainMenuFromGame();
        };
    }
    
    // ✅ Card Values button (in game)
    const gameCardValuesBtn = document.getElementById('gameCardValuesBtn');
    if (gameCardValuesBtn) {
        gameCardValuesBtn.onclick = () => {
            console.log('🃏 Card Values button clicked');
            showCardValuesFromGame();
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
    console.log('Change Nickname button found:', !!changeNicknameBtn);
    if (changeNicknameBtn) {
        changeNicknameBtn.onclick = () => {
            console.log('Change Nickname clicked');
            changeNickname();
        };
        console.log('✅ Change Nickname button listener set up');
    } else {
        console.error('❌ Change Nickname button not found!');
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
    
    // Extract room code from window.roomId (could be object or string)
    const roomCode = typeof window.roomId === 'object' ? window.roomId.roomId : window.roomId;
    console.log('🔍 Socket room code:', roomCode);
    
    // ✅ CRITICAL FIX: Ensure socket is connected before emitting
    if (!socket.connected) {
        console.error('❌ Socket not connected - cannot start game');
        alert('Connection lost. Please refresh the page and try again.');
        return;
    }
    
    // ✅ Emit startGame event to server to start multiplayer game
    console.log('Emitting startGame event to server for room:', roomCode);
    socket.emit('startGame', roomCode);
    
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
        
        // Show room management options (only for room creator)
        if (addBotBtn) {
            addBotBtn.style.display = window.isRoomCreator ? 'inline-block' : 'none';
        }
        if (removeBotBtn) {
            removeBotBtn.style.display = window.isRoomCreator ? 'inline-block' : 'none';
        }
        // Only show Start Game button for room creator
        if (startGameBtn) {
            startGameBtn.style.display = window.isRoomCreator ? 'inline-block' : 'none';
        }
        if (backToMainMenuBtn) backToMainMenuBtn.style.display = 'inline-block';
        
        // Show room code display
        if (roomCodeDisplay && window.roomId) {
            roomCodeDisplay.style.display = 'block';
            const roomCodeText = document.getElementById('roomCodeText');
            if (roomCodeText) {
                // Extract roomId from object if it's an object, otherwise use as string
                const roomCode = typeof window.roomId === 'object' ? window.roomId.roomId : window.roomId;
                roomCodeText.textContent = roomCode;
                console.log('🎯 Room code displayed:', roomCode);
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
    if (startGameBtn && window.isRoomCreator) {
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
    console.log('🔄 changeNickname function called');
    
    const nicknameInput = document.getElementById('nicknameInput');
    console.log('Nickname input found:', !!nicknameInput);
    console.log('Socket available:', !!socket);
    console.log('Room ID available:', !!window.roomId);
    
    if (!nicknameInput || !socket || !window.roomId) {
        console.error('Cannot change nickname - missing elements or not in room');
        alert('Cannot change nickname - please make sure you are in a room');
        return;
    }
    
    const newNickname = nicknameInput.value.trim();
    console.log('New nickname:', newNickname);
    
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
    const roomCode = typeof window.roomId === 'object' ? window.roomId.roomId : window.roomId;
    socket.emit('changeNickname', {
        roomCode: roomCode,
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
    const roomCode = typeof window.roomId === 'object' ? window.roomId.roomId : window.roomId;
    socket.emit('selectTeam', {
        roomCode: roomCode,
        team: team
    });
}

// ✅ Show player customization when joining room
function showPlayerCustomization() {
    const playerCustomization = document.getElementById('playerCustomization');
    if (playerCustomization) {
        playerCustomization.style.display = 'block';
        console.log('✅ Player customization panel shown');
        
        // ✅ CRITICAL FIX: Re-setup button listeners when panel is shown
        // This ensures buttons work even if they weren't available during initial setup
        setupCustomizationButtons();
    }
}

// ✅ New function to set up customization buttons specifically
function setupCustomizationButtons() {
    console.log('Setting up customization buttons...');
    
    // ✅ Player Customization Buttons
    const changeNicknameBtn = document.getElementById('changeNicknameBtn');
    console.log('Change Nickname button found:', !!changeNicknameBtn);
    if (changeNicknameBtn) {
        // Remove any existing listeners
        changeNicknameBtn.onclick = null;
        changeNicknameBtn.onclick = () => {
            console.log('Change Nickname clicked');
            changeNickname();
        };
        console.log('✅ Change Nickname button listener set up');
    } else {
        console.error('❌ Change Nickname button not found!');
    }

    const team1Btn = document.getElementById('team1Btn');
    if (team1Btn) {
        team1Btn.onclick = null;
        team1Btn.onclick = () => {
            console.log('Team 1 (Alfa) clicked');
            selectTeam('team1');
        };
        console.log('✅ Team 1 button listener set up');
    }

    const team2Btn = document.getElementById('team2Btn');
    if (team2Btn) {
        team2Btn.onclick = null;
        team2Btn.onclick = () => {
            console.log('Team 2 (Beta) clicked');
            selectTeam('team2');
        };
        console.log('✅ Team 2 button listener set up');
    }
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', initGame);

// ✅ Additional fallback: Set up customization buttons after a short delay
// This ensures buttons work even if they're added dynamically
setTimeout(() => {
    console.log('Setting up customization buttons as fallback...');
    setupCustomizationButtons();
}, 1000);

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
    
    // ✅ CRITICAL FIX: Use room code from server data if available, fallback to window.roomId
    let roomCode = data.roomCode;
    if (!roomCode) {
        // Fallback to window.roomId if server didn't send room code
        roomCode = typeof window.roomId === 'object' ? window.roomId.roomId : window.roomId;
        console.log('⚠️ Using fallback room code from window.roomId:', roomCode);
    } else {
        console.log('✅ Using room code from server data:', roomCode);
        // Update window.roomId with the server's room code to ensure consistency
        window.roomId = roomCode;
    }
    
    console.log('🔍 DEBUG: Final room code:', roomCode);
    
    try {
        // ✅ CRITICAL: Ensure room ID is available
        if (!roomCode) {
            console.error('❌ CRITICAL ERROR: No room code available when starting multiplayer game!');
            console.error('❌ This will prevent all server communication from working!');
            console.error('❌ Data received:', data);
            throw new Error('No room code available - cannot start multiplayer game');
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
        
        // Move canvas to Game div and show it
        if (window.gameCanvas) {
            try {
                console.log('🔄 Moving canvas to Game div...');
                window.gameCanvas.parent('Game');
                // Show canvas for game
                const canvas = document.querySelector('canvas');
                if (canvas) {
                    canvas.style.display = 'block';
                }
                console.log('✅ Canvas moved to Game div and shown successfully');
            } catch (error) {
                console.error('❌ Error moving canvas to Game div:', error);
            }
        } else {
            // ✅ CRITICAL FIX: Restore gameCanvas reference if it was cleared
            console.log('🔄 gameCanvas reference was cleared, restoring from DOM...');
            const canvas = document.querySelector('canvas');
            if (canvas) {
                window.gameCanvas = canvas;
                console.log('✅ gameCanvas reference restored from DOM');
                try {
                    console.log('🔄 Moving restored canvas to Game div...');
                    window.gameCanvas.parent('Game');
                    canvas.style.display = 'block';
                    console.log('✅ Restored canvas moved to Game div and shown successfully');
                } catch (error) {
                    console.error('❌ Error moving restored canvas to Game div:', error);
                }
            } else {
                console.error('❌ No canvas found in DOM either!');
            }
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
        
        // ✅ CRITICAL FIX: Update Truco button visibility after game starts
        if (typeof showTrucoButton === 'function') {
            showTrucoButton();
        }
        
        // ✅ DEBUG: Log complete game state for troubleshooting
        logMultiplayerGameState();
        
    } catch (error) {
        console.error('❌ Error starting multiplayer game:', error);
        alert('Failed to start multiplayer game. Please try again.');
        
        // Reset to menu state
        window.gameState = gameStateEnum.Menu;
        gameState = gameStateEnum.Menu;
        // Stop the draw loop when returning to menu
        noLoop();
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
    // Stop the draw loop when returning to menu
    noLoop();
    
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
    
    // Use the helper function to get the room code properly
    const roomCode = getRoomCode();
    if (!roomCode) {
        console.error('No room code to copy');
        return;
    }
    
    try {
        // Use modern clipboard API if available
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(roomCode).then(() => {
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
    
    // ✅ CRITICAL FIX: Initialize pending timeouts array if it doesn't exist
    if (!window.pendingBotTimeouts) {
        window.pendingBotTimeouts = [];
    }
    
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
    
    // ✅ CRITICAL FIX: Don't play card if bot needs to respond to Truco
    if (window.game.trucoState && window.game.trucoState.waitingForResponse && 
        window.game.trucoState.responsePlayerIndex === botPlayerIndex) {
        console.log(`🤖 Bot ${botPlayer.name} needs to respond to Truco, not play a card`);
        return;
    }
    
    // ✅ NEW FEATURE: Bot can occasionally call Truco instead of playing a card
    const shouldCallTruco = Math.random() < 0.25; // 25% chance to call Truco (increased for better visibility)
    
    console.log(`🤖 Bot ${botPlayer.name} Truco decision: shouldCall=${shouldCallTruco}, trucoActive=${window.game.trucoState}`);
    
    // ✅ CRITICAL FIX: Check if bot's team can call Truco/raise
    let canCallTruco = true;
    if (window.game.trucoState && window.game.trucoState.callerTeam !== null) {
        if (window.game.trucoState.isActive) {
            // Truco is currently active - no one can call
            canCallTruco = false;
        } else if (window.game.trucoState.currentValue > 1) {
            // Truco was accepted - only opposite team can raise
            if (botPlayer.team === window.game.trucoState.callerTeam) {
                canCallTruco = false; // Same team cannot raise
            } else if (window.game.trucoState.potentialValue >= 12) {
                canCallTruco = false; // Cannot raise above 12 games
            }
        } else {
            // Truco was rejected (currentValue = 1), anyone can call again
            canCallTruco = true;
        }
    }
    
    console.log(`🤖 Bot ${botPlayer.name} can call Truco: ${canCallTruco}, team: ${botPlayer.team}, callerTeam: ${window.game.trucoState?.callerTeam}, potentialValue: ${window.game.trucoState?.potentialValue}`);
    
    if (shouldCallTruco && canCallTruco) {
        console.log(`🤖 Bot ${botPlayer.name} decided to call Truco instead of playing a card!`);
        
        // ✅ CRITICAL FIX: Execute immediately to prevent race conditions
        const trucoTimeoutId = setTimeout(() => {
            try {
                            // ✅ CRITICAL FIX: Validate bot can still call Truco
            if (window.game && 
                !window.gameCompleted &&
                window.game.players[botPlayerIndex] &&
                window.game.players[botPlayerIndex].isBot &&
                !window.game.players[botPlayerIndex].hasPlayedThisTurn &&
                window.game.players[botPlayerIndex].hand &&
                window.game.players[botPlayerIndex].hand.length > 0) {
                    
                    console.log(`🤖 Bot ${botPlayer.name} calling Truco!`);
                    
                    // ✅ CRITICAL FIX: Emit requestTruco event for the bot with bot player index
                    socket.emit('requestTruco', {
                        roomCode: getRoomCode(),
                        botPlayerIndex: botPlayerIndex  // Include bot's player index for server validation
                    });
                    
                    console.log(`🤖 Bot ${botPlayer.name} Truco request emitted successfully`);
                    
                    // ✅ CRITICAL FIX: Reset the roundComplete trigger flag
                    botPlayer.botTriggeredByRoundComplete = false;
                    
                    // ✅ CRITICAL FIX: Reset round transition flags when round winner calls Truco
                    // BUT with a delay to ensure all old turnChanged events are processed first
                    if (window.game.roundJustCompleted && window.game.roundWinnerStarting) {
                        setTimeout(() => {
                            window.game.roundJustCompleted = false;
                            window.game.roundWinnerStarting = false;
                            console.log('🔓 Reset round transition flags - round winner called Truco (delayed)');
                        }, 3000); // 3 second delay to ensure all old events are processed
                    }
                    
                    // ✅ CRITICAL FIX: Don't mark as played yet - wait for Truco response
                    // If Truco fails, we need to fall back to playing a card
                    
                    // ✅ CRITICAL FIX: Set up fallback timeout in case Truco call fails
                    const trucoFallbackTimeout = setTimeout(() => {
                        console.log(`🤖 Bot ${botPlayer.name} Truco call timeout - falling back to playing a card`);
                        if (!botPlayer.hasPlayedThisTurn && botPlayer.hand && botPlayer.hand.length > 0) {
                            // Play a random card as fallback
                            const cardIndex = Math.floor(Math.random() * botPlayer.hand.length);
                            console.log(`🤖 Bot ${botPlayer.name} playing fallback card at index ${cardIndex}`);
                            
                            // Emit card play event
                            socket.emit('playCard', {
                                roomCode: getRoomCode(),
                                playerIndex: botPlayerIndex,
                                cardIndex: cardIndex
                            });
                            
                            // Mark as played and complete turn
                            botPlayer.hasPlayedThisTurn = true;
                            socket.emit('botTurnComplete', {
                                roomCode: getRoomCode(),
                                playerIndex: botPlayerIndex,
                                roundNumber: window.game?.currentRound || 0
                            });
                        }
                    }, 2000); // 2 second timeout for Truco response
                    
                    // Store timeout for cleanup
                    window.pendingBotTimeouts.push(trucoFallbackTimeout);
                    
                    // ✅ CRITICAL FIX: Set up success handler for Truco call
                    // When Truco is successfully called, complete the bot's turn
                    const trucoSuccessHandler = (data) => {
                        if (data.callerName === botPlayer.name) {
                            console.log(`🤖 Bot ${botPlayer.name} Truco call successful - completing turn`);
                            botPlayer.hasPlayedThisTurn = true;
                            socket.emit('botTurnComplete', {
                                roomCode: getRoomCode(),
                                playerIndex: botPlayerIndex,
                                roundNumber: window.game?.currentRound || 0
                            });
                            // Remove the fallback timeout since Truco was successful
                            clearTimeout(trucoFallbackTimeout);
                            // Remove both listeners since Truco was successful
                            socket.off('trucoCalled', trucoSuccessHandler);
                            socket.off('trucoRaised', trucoRaiseSuccessHandler);
                        }
                    };
                    
                    // ✅ CRITICAL FIX: Set up success handler for Truco raise
                    // When Truco is successfully raised, complete the bot's turn
                    const trucoRaiseSuccessHandler = (data) => {
                        if (data.callerName === botPlayer.name) {
                            console.log(`🤖 Bot ${botPlayer.name} Truco raise successful - completing turn`);
                            botPlayer.hasPlayedThisTurn = true;
                            socket.emit('botTurnComplete', {
                                roomCode: getRoomCode(),
                                playerIndex: botPlayerIndex,
                                roundNumber: window.game?.currentRound || 0
                            });
                            // Remove the fallback timeout since Truco raise was successful
                            clearTimeout(trucoFallbackTimeout);
                            // Remove both listeners since Truco raise was successful
                            socket.off('trucoCalled', trucoSuccessHandler);
                            socket.off('trucoRaised', trucoRaiseSuccessHandler);
                        }
                    };
                    
                    // Listen for successful Truco call and raise
                    socket.on('trucoCalled', trucoSuccessHandler);
                    socket.on('trucoRaised', trucoRaiseSuccessHandler);
                    
                    // ✅ CRITICAL FIX: Set up error handler for failed Truco call
                    const trucoErrorHandler = (errorMessage) => {
                        if (errorMessage.includes('cannot raise') || errorMessage.includes('cannot call')) {
                            console.log(`🤖 Bot ${botPlayer.name} Truco call failed: ${errorMessage} - falling back to playing a card`);
                            // Clear the fallback timeout since we're handling it now
                            clearTimeout(trucoFallbackTimeout);
                            // Remove both success handlers since Truco failed
                            socket.off('trucoCalled', trucoSuccessHandler);
                            socket.off('trucoRaised', trucoRaiseSuccessHandler);
                            
                            // Play a random card as fallback
                            if (!botPlayer.hasPlayedThisTurn && botPlayer.hand && botPlayer.hand.length > 0) {
                                const cardIndex = Math.floor(Math.random() * botPlayer.hand.length);
                                console.log(`🤖 Bot ${botPlayer.name} playing fallback card at index ${cardIndex}`);
                                
                                // Emit card play event
                                socket.emit('playCard', {
                                    roomCode: getRoomCode(),
                                    playerIndex: botPlayerIndex,
                                    cardIndex: cardIndex
                                });
                                
                                // Mark as played and complete turn
                                botPlayer.hasPlayedThisTurn = true;
                                socket.emit('botTurnComplete', {
                                    roomCode: window.roomId,
                                    playerIndex: botPlayerIndex,
                                    roundNumber: window.game?.currentRound || 0
                                });
                            }
                        }
                    };
                    
                    // Listen for Truco errors
                    socket.on('error', trucoErrorHandler);
                    
                } else {
                    console.log(`🤖 Bot ${botPlayer.name} can no longer call Truco - state changed`);
                }
            } catch (botTrucoError) {
                console.error(`❌ Bot Truco call failed for ${botPlayer.name}:`, botTrucoError);
            }
        }, 500); // Increased delay to ensure server has processed card play and updated turn state
        
        // ✅ CRITICAL FIX: Track timeout ID for cancellation
        window.pendingBotTimeouts.push(trucoTimeoutId);
    } else {
        console.log(`🤖 Bot ${botPlayer.name} will play a card immediately`);
        
        // ✅ CRITICAL FIX: Execute immediately to prevent race conditions
        const cardTimeoutId = setTimeout(() => {
        try {
            // ✅ CRITICAL FIX: Validate bot can still play
            if (window.game && 
                !window.gameCompleted &&
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
                    roomCode: getRoomCode(),
                    playerIndex: botPlayerIndex,
                    cardIndex: randomCardIndex
                });
                
                        console.log(`🤖 Bot ${botPlayer.name} playCard event emitted successfully`);
                        
                        // ✅ CRITICAL FIX: Mark bot as having played this turn
                        botPlayer.hasPlayedThisTurn = true;
                        
                        // ✅ CRITICAL FIX: Reset the roundComplete trigger flag
                        botPlayer.botTriggeredByRoundComplete = false;
                        
                        // ✅ CRITICAL FIX: Reset round transition flags when round winner plays
                        // BUT with a delay to ensure all old turnChanged events are processed first
                        if (window.game.roundJustCompleted && window.game.roundWinnerStarting) {
                            setTimeout(() => {
                                window.game.roundJustCompleted = false;
                                window.game.roundWinnerStarting = false;
                                console.log('🔓 Reset round transition flags - round winner has started playing (delayed)');
                            }, 3000); // 3 second delay to ensure all old events are processed
                        }
                
                    // ✅ CRITICAL FIX: Emit botTurnComplete immediately to prevent game getting stuck
                    try {
                        console.log(`🤖 Emitting botTurnComplete for ${botPlayer.name} immediately`);
                        socket.emit('botTurnComplete', {
                            roomCode: window.roomId,
                            playerIndex: botPlayerIndex,
                            roundNumber: window.game?.currentRound || 0
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
        
        // ✅ CRITICAL FIX: Track timeout ID for cancellation
        window.pendingBotTimeouts.push(cardTimeoutId);
    }
}

// ✅ Turn message function removed per user request

// ✅ Turn message CSS and initialization removed per user request

// ✅ POPUP QUEUE SYSTEM - Only show one popup at a time
let popupQueue = [];
let currentPopup = null;
let popupTimeout = null;

function addToPopupQueue(type, data, duration = 2000) {
    popupQueue.push({ type, data, duration });
    console.log(`📋 Added ${type} popup to queue. Queue length: ${popupQueue.length}`);
    processPopupQueue();
}

function processPopupQueue() {
    // If there's already a popup showing or no popups in queue, return
    if (currentPopup || popupQueue.length === 0) {
        return;
    }
    
    const nextPopup = popupQueue.shift();
    console.log(`📋 Processing ${nextPopup.type} popup from queue. Remaining: ${popupQueue.length}`);
    
    showPopup(nextPopup.type, nextPopup.data, nextPopup.duration);
}

function showPopup(type, data, duration) {
    // Clear any existing popup
    clearCurrentPopup();
    
    currentPopup = { type, data, duration };
    
    switch (type) {
        case 'truco':
            showTrucoMessagePopup(data);
            break;
        case 'roundWinner':
            showRoundWinnerMessagePopup(data);
            break;
        case 'draw':
            showDrawMessagePopup();
            break;
        case 'gameWinner':
            showGameWinnerMessagePopup(data);
            break;
        case 'combinedGame':
            showCombinedGameMessagePopup(data);
            break;
    }
    
    // Auto-remove after duration
    popupTimeout = setTimeout(() => {
        clearCurrentPopup();
    }, duration);
}

function clearCurrentPopup() {
    if (currentPopup) {
        // Remove any existing popup elements
        const existingMessages = document.querySelectorAll('[id$="Message"]');
        existingMessages.forEach(msg => {
            if (msg.parentNode) {
                msg.remove();
            }
        });
        
        currentPopup = null;
        
        if (popupTimeout) {
            clearTimeout(popupTimeout);
            popupTimeout = null;
        }
        
        // Process next popup in queue
        setTimeout(() => {
            processPopupQueue();
        }, 100); // Small delay to ensure smooth transition
    }
}

// ✅ Truco UI functions
function showTrucoMessage(message) {
    addToPopupQueue('truco', message);
}

function showTrucoMessagePopup(message) {
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
}

function showTrucoResponseButtons() {
    console.log('🎯 showTrucoResponseButtons() called - showing response popup');
    // Remove any existing buttons
    hideTrucoResponseButtons();
    
    // Create popup container
    const popupContainer = document.createElement('div');
    popupContainer.id = 'trucoResponsePopup';
    popupContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translateX(-50%) translateY(-50%);
        background: rgba(0, 0, 0, 0.9);
        border: 3px solid #FFD700;
        border-radius: 15px;
        padding: 30px;
        text-align: center;
        z-index: 1001;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        min-width: 300px;
    `;
    
    // Create title
    const title = document.createElement('div');
    title.textContent = '🎯 Respond to Truco';
    title.style.cssText = `
        color: #FFD700;
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 20px;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    `;
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 15px;
        justify-content: center;
        flex-wrap: wrap;
    `;
    
    // Create Accept button
    const acceptBtn = document.createElement('button');
    acceptBtn.id = 'acceptTrucoBtn';
    acceptBtn.textContent = '✅ Accept';
    acceptBtn.style.cssText = `
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
        border: none;
        padding: 15px 25px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
        min-width: 100px;
    `;
    
    // Create Reject button
    const rejectBtn = document.createElement('button');
    rejectBtn.id = 'rejectTrucoBtn';
    rejectBtn.textContent = '❌ Reject';
    rejectBtn.style.cssText = `
        background: linear-gradient(135deg, #f44336, #d32f2f);
        color: white;
        border: none;
        padding: 15px 25px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
        min-width: 100px;
    `;
    
                            // Create Raise button (only show if potential value < 12)
                        const raiseBtn = document.createElement('button');
                        raiseBtn.id = 'raiseTrucoBtn';
                        raiseBtn.textContent = '📈 Raise';
                        raiseBtn.style.cssText = `
                            background: linear-gradient(135deg, #FF9800, #F57C00);
                            color: white;
                            border: none;
                            padding: 15px 25px;
                            border-radius: 10px;
                            font-size: 16px;
                            font-weight: bold;
                            cursor: pointer;
                            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                            transition: all 0.3s ease;
                            min-width: 100px;
                        `;
                        
                        // Only show raise button if potential value is less than 12
                        const potentialValue = window.game.trucoState?.potentialValue || 3;
                        if (potentialValue >= 12) {
                            raiseBtn.style.display = 'none';
                        }
    
    // Add hover effects
    [acceptBtn, rejectBtn, raiseBtn].forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.05)';
            btn.style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
        });
    });
    
    // Add event listeners
    acceptBtn.addEventListener('click', () => {
        console.log('👤 Human player accepted Truco');
        socket.emit('respondTruco', { 
            roomCode: getRoomCode(),
            response: 1 
        });
        hideTrucoResponseButtons();
    });
    
    rejectBtn.addEventListener('click', () => {
        console.log('👤 Human player rejected Truco');
        socket.emit('respondTruco', { 
            roomCode: getRoomCode(),
            response: 2 
        });
        hideTrucoResponseButtons();
    });
    
    raiseBtn.addEventListener('click', () => {
        console.log('👤 Human player raised Truco');
        socket.emit('respondTruco', { 
            roomCode: getRoomCode(),
            response: 3 
        });
        hideTrucoResponseButtons();
    });
    
    // Assemble popup
    buttonContainer.appendChild(acceptBtn);
    buttonContainer.appendChild(rejectBtn);
    buttonContainer.appendChild(raiseBtn);
    popupContainer.appendChild(title);
    popupContainer.appendChild(buttonContainer);
    document.body.appendChild(popupContainer);
    
    console.log('🎯 Truco response buttons shown successfully');
}

function hideTrucoResponseButtons() {
    // Remove the entire popup container
    const popupContainer = document.getElementById('trucoResponsePopup');
    if (popupContainer) {
        popupContainer.remove();
    }
    
    // Also remove individual buttons if they exist (fallback)
    const acceptBtn = document.getElementById('acceptTrucoBtn');
    const rejectBtn = document.getElementById('rejectTrucoBtn');
    const raiseBtn = document.getElementById('raiseTrucoBtn');
    
    if (acceptBtn) acceptBtn.remove();
    if (rejectBtn) rejectBtn.remove();
    if (raiseBtn) raiseBtn.remove();
    
    console.log('🎯 Truco response buttons hidden');
}