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
        console.log('Room created:', id);
        window.roomId = id;
        document.getElementById('roomInput').value = id;
        updateLobbyUI(true);
        showPlayerCustomization(); // ✅ Show customization panel when creating room
    });

    socket.on('roomJoined', (id) => {
        console.log('Joined room:', id);
        window.roomId = id;
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
        if (data.playedCards) {
            window.playedCards = data.playedCards.map(pc => {
                const player = window.game.players[pc.playerIndex];
                if (!player) {
                    console.warn(`⚠️ Player not found for index ${pc.playerIndex}`);
                    return null;
                }
                
                // ✅ Calculate proper card position based on player position
                const playerPos = playerPositions[pc.playerIndex];
                if (playerPos) {
                    const cardPosX = lerp(playerPos.x, width/2, 0.5);
                    const cardPosY = lerp(playerPos.y, height/2, 0.5);
                    
                    return {
                        card: pc.card,
                        player: player,
                        position: { x: cardPosX, y: cardPosY }
                    };
                } else {
                    // Fallback to center
                    return {
                        card: pc.card,
                        player: player,
                        position: { x: width/2, y: height/2 }
                    };
                }
            }).filter(Boolean); // Remove null entries
            
            console.log('🔄 Updated played cards:', window.playedCards.length);
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
                setTimeout(() => {
                    if (currentPlayer.botPlay) {
                        currentPlayer.botPlay();
                    }
                }, 1000);
            }
        }
        
        // ✅ Force game redraw
        if (typeof redraw === 'function') {
            redraw();
        }
        
        console.log('✅ Turn changed to player:', data.currentPlayer);
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
    const addBotBtn = document.getElementById('addBotBtn');
    const startGameBtn = document.getElementById('startGameBtn');
    
    if (inRoom) {
        if (addBotBtn) addBotBtn.style.display = 'inline-block';
        if (startGameBtn) startGameBtn.style.display = 'inline-block';
    } else {
        if (addBotBtn) addBotBtn.style.display = 'none';
        if (startGameBtn) startGameBtn.style.display = 'none';
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
    
    try {
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
            
            // Convert server player data to client Player objects
            const clientPlayer = new Player(
                player.nickname || player.name, 
                player.team || (index < 2 ? 'team1' : 'team2'), // Auto-assign teams if not set
                player.isBot || false,
                index
            );
            
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
        
        // Store current player from server
        window.currentPlayer = data.currentPlayer || 0;
        console.log(`🎯 Current player index: ${window.currentPlayer}`);
        
        // Initialize game
        window.game = new Game(window.players);
        console.log('✅ Game instance created');
        
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