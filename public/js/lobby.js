// Global variables
// socket is already declared in variables.js
// gameInitialized is already declared in variables.js

// Initialize socket and lobby when the document is ready
document.addEventListener('DOMContentLoaded', function() {
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
        document.getElementById('roomInput').value = id;
        updateLobbyUI(true);
        showPlayerCustomization(); // ✅ Show customization panel when creating room
    });

    socket.on('roomJoined', (id) => {
        console.log('✅ Joined room:', id);
        window.roomId = id;
        console.log('✅ Room ID set to window.roomId:', window.roomId);
        
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
            window.playedCards = data.playedCards.map(pc => {
                // ✅ CRITICAL FIX: Use the player data from the server response
                // The server sends clean player info, so we don't need to look it up
                const playerInfo = pc.player;
                if (!playerInfo) {
                    console.warn(`⚠️ No player info in playedCard:`, pc);
                    return null;
                }
                
                // ✅ Create a simple card object that can be rendered
                return {
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
            }).filter(Boolean); // Remove null entries
            
            // ✅ CRITICAL FIX: Ensure window.playedCards is properly set
            console.log('🔄 Window playedCards updated:', window.playedCards.length);
            
            console.log('🔄 Updated played cards:', window.playedCards.length);
            console.log('🔄 Played cards structure:', window.playedCards);
        }
        
        // ✅ Force game redraw to show synchronized state
        if (typeof redraw === 'function') {
            redraw();
        }
        
        console.log('✅ Card played event synchronized successfully');
    });

    // ✅ Handle turn changes with improved validation
    socket.on('turnChanged', (data) => {
        console.log('🔄 Turn changed event received:', data);
        
        if (!window.game) return;
        
        // ✅ Validate new current player index
        if (data.currentPlayer < 0 || data.currentPlayer >= 4) {
            console.error('❌ Invalid current player index:', data.currentPlayer);
            return;
        }
        
        // ✅ Update current player
        window.game.currentPlayerIndex = data.currentPlayer;
        
        // ✅ CRITICAL FIX: Update player active states for turn indicator
        console.log(`🔄 Updating player active states. Server currentPlayer: ${data.currentPlayer}`);
        window.game.players.forEach((player, index) => {
            const wasActive = player.isActive;
            player.isActive = (index === data.currentPlayer);
            
            // ✅ CRITICAL FIX: Reset hasPlayedThisTurn flag for new turn
            if (index === data.currentPlayer) {
                player.hasPlayedThisTurn = false;
                console.log(`🔄 Reset hasPlayedThisTurn for ${player.name} (new turn)`);
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
        
        // ✅ Make current player's cards clickable
        if (window.game.players[data.currentPlayer]) {
            const currentPlayer = window.game.players[data.currentPlayer];
            if (!currentPlayer.isBot) {
                // Human player - make cards clickable
                currentPlayer.hand.forEach(card => {
                    card.isClickable = true;
                });
                console.log(`✅ Made ${currentPlayer.name}'s cards clickable`);
                            } else {
                    // Bot player - trigger bot play
                    console.log(`🤖 Bot ${currentPlayer.name}'s turn - triggering bot play`);
                    
                    // ✅ CRITICAL FIX: Prevent bot from playing multiple times
                    if (currentPlayer.hasPlayedThisTurn) {
                        console.log(`🤖 Bot ${currentPlayer.name} already played this turn - skipping`);
                        return;
                    }
                    
                    // ✅ CRITICAL FIX: Ensure window.playedCards is available
                    if (window.playedCards) {
                        console.log('🔄 Window playedCards available in turnChanged:', window.playedCards.length);
                    }
                    
                    // ✅ CRITICAL FIX: Add delay and validation to prevent bot spam
                    setTimeout(() => {
                        // Double-check that it's still this bot's turn and they have cards
                        if (window.game && 
                            window.game.currentPlayerIndex === data.currentPlayer && 
                            window.game.players[data.currentPlayer] &&
                            window.game.players[data.currentPlayer].isBot &&
                            window.game.players[data.currentPlayer].hand && 
                            window.game.players[data.currentPlayer].hand.length > 0 &&
                            !window.game.players[data.currentPlayer].hasPlayedThisTurn) {
                            
                            const bot = window.game.players[data.currentPlayer];
                            console.log(`🤖 Bot ${bot.name} confirmed turn - playing card`);
                            
                            // ✅ CRITICAL FIX: Mark bot as having played this turn
                            bot.hasPlayedThisTurn = true;
                            
                            // Bot plays a random card
                            const randomCardIndex = Math.floor(Math.random() * bot.hand.length);
                            const selectedCard = bot.hand[randomCardIndex];
                            console.log(`🤖 Bot ${bot.name} playing card: ${selectedCard.name} at index ${randomCardIndex}`);
                            
                            // ✅ CRITICAL FIX: Create clean card object to prevent serialization issues
                            const cleanCard = {
                                name: selectedCard.name,
                                value: selectedCard.value,
                                suit: selectedCard.suit || null,
                                // DO NOT include: image, position, or any DOM/p5.js references
                            };
                            
                            // Emit bot card play to server
                            socket.emit('playCard', {
                                roomCode: window.roomId,
                                cardIndex: randomCardIndex,
                                card: cleanCard,
                                playerIndex: data.currentPlayer
                            });
                            
                            // ✅ CRITICAL FIX: Emit bot turn complete after playing card
                            // This tells the server to move to the next player
                            setTimeout(() => {
                                socket.emit('botTurnComplete', {
                                    roomCode: window.roomId
                                });
                                console.log(`🤖 Bot ${bot.name} turn complete - notified server`);
                            }, 500); // Small delay to ensure card play is processed first
                        } else {
                            console.log(`🤖 Bot turn validation failed - skipping bot play`);
                        }
                    }, 1500); // Increased delay to prevent rapid bot actions
                }
        }
        
        // ✅ Force game redraw
        if (typeof redraw === 'function') {
            redraw();
        }
        
        console.log('✅ Turn changed to player:', data.currentPlayer);
    });
    
    // ✅ Handle round completion events
    socket.on('roundComplete', (data) => {
        console.log('🏁 Round complete event received:', data);
        
        if (!window.game) {
            console.log('❌ No game instance found for round complete event');
            return;
        }
        
        // ✅ Update current player for next round
        if (data.currentPlayer !== undefined) {
            window.game.currentPlayerIndex = data.currentPlayer;
            console.log(`🔄 New round - current player: ${data.currentPlayer} (${window.game.players[data.currentPlayer]?.name})`);
            
            // ✅ CRITICAL FIX: Update player active states for turn indicator in new round
            window.game.players.forEach((player, index) => {
                player.isActive = (index === data.currentPlayer);
                console.log(`🔄 New round - Player ${player.name} (${index}) isActive: ${player.isActive}`);
            });
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
        
        // ✅ Clear played cards for new round
        window.playedCards = [];
        // ✅ CRITICAL FIX: Also clear local playedCards variable
        if (typeof playedCards !== 'undefined') {
            playedCards = [];
            console.log('🔄 New round - cleared local playedCards variable');
        }
        console.log('🔄 New round - cleared played cards');
        
        // ✅ Force game redraw to show new round state
        if (typeof redraw === 'function') {
            redraw();
        }
        
        console.log('✅ Round completion synchronized successfully');
    });
}

function setupButtonListeners() {
    console.log('Setting up button listeners...');
    
    // Create Room button
    const createRoomBtn = document.getElementById('createRoomBtn');
    if (createRoomBtn) {
        createRoomBtn.onclick = () => {
            console.log('Create Room clicked');
            createRoom();
        };
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
    
    // Start Single Player Game button
    const startSinglePlayerBtn = document.getElementById('startSinglePlayerBtn');
    if (startSinglePlayerBtn) {
        startSinglePlayerBtn.onclick = () => {
            console.log('Start Single Player Game clicked');
            startSinglePlayerGame();
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
    if (!socket) {
        console.error('Socket not initialized in createRoom');
        return;
    }
    
    // Clear any existing room state
    if (window.roomId) {
        console.log('Clearing existing room state');
        window.roomId = null;
    }
    
    const roomCode = document.getElementById('roomInput').value || Math.random().toString(36).substring(7);
    console.log('Creating room with code:', roomCode);
    socket.emit('createRoom', roomCode);
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
    const startSinglePlayerBtn = document.getElementById('startSinglePlayerBtn');
    
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
        if (startSinglePlayerBtn) startSinglePlayerBtn.style.display = 'none';
        
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
    } else {
        // Show room creation/joining options
        if (createRoomBtn) createRoomBtn.style.display = 'inline-block';
        if (joinRoomBtn) joinRoomBtn.style.display = 'inline-block';
        if (startSinglePlayerBtn) startSinglePlayerBtn.style.display = 'inline-block';
        
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
        
        let playerListHTML = '<h3>Players in Room:</h3>';
        players.forEach((player, index) => {
            const playerType = player.isBot ? '🤖 Bot' : '👤 Player';
            const nickname = player.nickname || player.name;
            
            // Show team assignment if available, otherwise show "No Team"
            let teamDisplay = 'No Team';
            if (player.team === 'team1') {
                teamDisplay = 'Team Alfa 🟠';
            } else if (player.team === 'team2') {
                teamDisplay = 'Team Beta 🟣';
            }
            
            playerListHTML += `<div style="margin: 5px 0; padding: 8px; border: 1px solid #4CAF50; border-radius: 4px; background-color: rgba(0, 100, 0, 0.8); color: white;">
                <strong style="color: #FFD700;">${playerType}:</strong> ${nickname}<br>
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

function startSinglePlayerGame() {
    console.log('Starting single player game...');
    
    // CRITICAL: Set game state to Playing FIRST and ensure it's global
    window.gameState = gameStateEnum.Playing;
    gameState = gameStateEnum.Playing;
    console.log('Game state set to:', gameState);
    console.log('Global game state set to:', window.gameState);
    
    // Create players array with one human player and three bots
    let players = [
        new Player("Player 1", "team1", false),
        new Player("Bot 1", "team2", true),
        new Player("Bot 2", "team1", true),
        new Player("Bot 3", "team2", true)
    ];
    
    console.log("Players created:", players);
    
    // Initialize game with players
    window.game = new Game(players);
    
    // Initialize game variables
    playedCards = [];
    teamAlfaRounds = 0;
    teamBetaRounds = 0;
    teamAlfaGames = 0;
    teamBetaGames = 0;
    teamAlfaSets = 0;
    teamBetaSets = 0;
    
    // Start the game
    window.game.startGame();
    
    // CRITICAL: Ensure proper UI transition and canvas parenting
    console.log('Transitioning UI to game view...');
    
    // Force the Game div to be visible
    const gameElement = document.getElementById('Game');
    if (gameElement) {
        gameElement.style.display = 'block';
        gameElement.style.zIndex = '1';
        console.log('Game div made visible');
    }
    
    // Hide the Menu div
    const menuElement = document.getElementById('Menu');
    if (menuElement) {
        menuElement.style.display = 'none';
        console.log('Menu div hidden');
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
    
    // CRITICAL: Move canvas to Game div manually
    if (window.gameCanvas) {
        try {
            console.log('Moving canvas to Game div...');
            window.gameCanvas.parent('Game');
            console.log('Canvas moved to Game div successfully');
        } catch (error) {
            console.error('Error moving canvas to Game div:', error);
        }
    } else {
        console.error('No gameCanvas found!');
    }
    
    // Try to show back button if available
    if (typeof backToMainMenuButton !== 'undefined' && backToMainMenuButton) {
        try {
            backToMainMenuButton.show();
            console.log('Back button shown');
        } catch (e) {
            console.log('Back button not available yet');
        }
    }
    
    // Force a redraw to trigger the UI transition
    if (typeof redraw === 'function') {
        redraw();
        console.log('Forced p5.js redraw to trigger UI transition');
    }
    
    console.log('Single player game started successfully');
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
        
        // Initialize game variables
        playedCards = [];
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
        if (typeof redraw === 'function') {
            redraw();
            console.log('✅ Forced p5.js redraw to trigger UI transition');
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
    
    console.log('✅ Room code copied to clipboard:', window.roomId);
}