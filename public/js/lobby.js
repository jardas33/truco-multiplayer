// Global variables with proper initialization
let socket = null;
let gameInitialized = false;
let connectionAttempts = 0;
const MAX_RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY = 1000;

// Connection state tracking
const connectionState = {
    isConnecting: false,
    isConnected: false,
    lastError: null,
    reconnectTimer: null
};

// Initialize socket and lobby when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing game...');
    
    // Initialize socket first
    initSocket();
    
    // Initialize game state if not already done
    if (!window.gameState) {
        window.gameState = {
            currentPhase: gameStateEnum.Menu,
            isInTrucoPhase: false,
            selfPlayer: 1,
            showAllCards: true,
            roomCode: null,
            isHost: false,
            players: [],
            botCount: 0
        };
        console.log('Game state initialized:', window.gameState);
    }
    
    // Initialize game
    initGame();
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
    if (connectionState.isConnecting) {
        console.log('Socket initialization already in progress');
        return;
    }
    
    try {
        console.log('Initializing socket...');
        connectionState.isConnecting = true;
        
        if (typeof io === 'undefined') {
            throw new Error('Socket.IO not loaded');
        }

        // Initialize socket with robust configuration
        socket = io({
            reconnection: true,
            reconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
            reconnectionDelay: RECONNECTION_DELAY,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            autoConnect: true,
            forceNew: true
        });

        // Store socket globally
        window.socket = socket;

        setupSocketEventHandlers();
        
    } catch (error) {
        handleConnectionError(error);
    }
}

function setupSocketEventHandlers() {
    if (!socket) {
        console.error('Cannot setup handlers - socket not initialized');
        return;
    }

    socket.on('connect', () => {
        console.log('Connected to server');
        connectionState.isConnected = true;
        connectionState.isConnecting = false;
        connectionAttempts = 0;
        connectionState.lastError = null;
        hideError();
        
        // Emit ready event
        socket.emit('clientReady');
    });

    socket.on('connect_error', handleConnectionError);
    socket.on('error', handleConnectionError);

    socket.on('disconnect', (reason) => {
        connectionState.isConnected = false;
        console.log('Disconnected:', reason);
        
        if (reason === 'io server disconnect') {
            showError('Disconnected from server. Please refresh the page.');
        } else {
            showError('Connection lost. Attempting to reconnect...');
            attemptReconnection();
        }
    });

    // Game-specific event handlers
    setupGameEventHandlers();
}

function setupGameEventHandlers() {
    if (!socket) {
        console.error('Socket not initialized');
        return;
    }

    socket.on('roomCreated', (roomData) => {
        console.log('Room created:', roomData);
        if (!window.gameState) {
            console.error('Game state not initialized');
            return;
        }
        
        window.gameState.roomCode = roomData.roomCode;
        window.gameState.isHost = true;
        window.gameState.players = roomData.players || [];
        window.gameState.botCount = 0;
        
        console.log('Updated game state after room creation:', window.gameState);
        updateRoomUI(roomData);
        updateGameControls();
    });

    socket.on('gameStarted', (gameData) => {
        console.log('Game started with data:', gameData);
        
        if (!gameData) {
            console.error('Game data is undefined');
            return;
        }

        // Initialize game with received data
        if (typeof initializeGame === 'function') {
            initializeGame(gameData);
        } else {
            console.error('initializeGame function not found');
        }
    });

    socket.on('updatePlayers', (data) => {
        console.log('Players updated:', data);
        if (!window.gameState) {
            console.error('Game state not initialized');
            return;
        }
        
        if (data && data.players) {
            window.gameState.players = data.players;
            window.gameState.botCount = data.players.filter(p => p.isBot).length;
            updatePlayerList(data.players);
            updateGameControls();
        }
    });

    socket.on('gameError', (error) => {
        console.error('Game error:', error);
        showError(error);
    });
}

function updateGameControls() {
    if (!window.ui.buttons.start) {
        console.error('Start button not found');
        return;
    }
    
    if (!window.gameState) {
        console.error('Game state not initialized');
        return;
    }

    const startButton = window.ui.buttons.start;
    const canStartGame = window.gameState.isHost && 
                        window.gameState.players && 
                        window.gameState.players.length === CONFIG.GAME.MAX_PLAYERS;

    startButton.disabled = !canStartGame;
    startButton.style.display = window.gameState.isHost ? 'block' : 'none';
    
    console.log('Updated start button state:', {
        disabled: !canStartGame,
        display: window.gameState.isHost ? 'block' : 'none',
        players: window.gameState.players?.length,
        isHost: window.gameState.isHost
    });
}

function showHostControls() {
    if (window.ui.buttons.addBot) {
        window.ui.buttons.addBot.style.display = 'block';
    }
    if (window.ui.buttons.start) {
        window.ui.buttons.start.style.display = 'block';
        window.ui.buttons.start.disabled = window.gameState.players.length < CONFIG.GAME.MIN_PLAYERS;
    }
}

function updateRoomUI(roomData) {
    // Update room code display
    const roomCodeDisplay = document.createElement('div');
    roomCodeDisplay.id = 'roomCodeDisplay';
    roomCodeDisplay.className = 'room-info';
    roomCodeDisplay.innerHTML = `
        <h3>Room Code: ${roomData.roomCode}</h3>
        <p>Share this code with other players to join</p>
    `;
    
    const existingDisplay = document.getElementById('roomCodeDisplay');
    if (existingDisplay) {
        existingDisplay.replaceWith(roomCodeDisplay);
    } else if (window.ui.divs.roomControls) {
        window.ui.divs.roomControls.insertBefore(roomCodeDisplay, window.ui.divs.playerList);
    }
    
    // Show/hide appropriate controls
    if (window.ui.inputs.roomCode) window.ui.inputs.roomCode.style.display = 'none';
    if (window.ui.buttons.createRoom) window.ui.buttons.createRoom.style.display = 'none';
    if (window.ui.buttons.joinRoom) window.ui.buttons.joinRoom.style.display = 'none';
    
    updatePlayerList(roomData.players);
}

function updatePlayerList(players) {
    if (!window.ui.divs.playerList) return;
    
    window.ui.divs.playerList.innerHTML = `
        <h3>Players in Room:</h3>
        ${players.map((player, index) => `
            <div class="player-item ${player.isBot ? 'bot' : ''}">
                <span>${player.name}</span>
                <div class="player-tags">
                    ${player.isBot ? '<span class="bot-tag">Bot</span>' : ''}
                    ${player.isHost ? '<span class="host-tag">Host</span>' : ''}
                </div>
            </div>
        `).join('')}
    `;
}

function setupButtonListeners() {
    // Instructions button
    const instructionsBtn = document.getElementById('instructionsBtn');
    const instructionsPanel = document.getElementById('Instructions');
    if (instructionsBtn && instructionsPanel) {
        instructionsBtn.onclick = () => {
            instructionsPanel.classList.add('active');
        };
    }

    // Card Values button
    const cardValuesBtn = document.getElementById('cardValuesBtn');
    const valuesPanel = document.getElementById('Values');
    if (cardValuesBtn && valuesPanel) {
        cardValuesBtn.onclick = () => {
            valuesPanel.classList.add('active');
        };
    }

    // Close buttons for panels
    document.querySelectorAll('.close-panel').forEach(button => {
        button.onclick = () => {
            const panel = button.closest('.panel');
            if (panel) {
                panel.classList.remove('active');
            }
        };
    });

    // Close panels when clicking outside
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('panel')) {
            event.target.classList.remove('active');
        }
    });

    // Create Room button
    if (window.ui.buttons.createRoom) {
        window.ui.buttons.createRoom.onclick = () => {
            if (!connectionState.isConnected) {
                showError('Not connected to server. Please wait...');
                return;
            }
            socket.emit('createRoom');
        };
    }

    // Join Room button
    if (window.ui.buttons.joinRoom && window.ui.inputs.roomCode) {
        window.ui.buttons.joinRoom.onclick = () => {
            if (!connectionState.isConnected) {
                showError('Not connected to server. Please wait...');
                return;
            }
            const roomCode = window.ui.inputs.roomCode.value.trim().toUpperCase();
            if (roomCode) {
                socket.emit('joinRoom', roomCode);
            } else {
                showError('Please enter a room code');
            }
        };
    }

    // Add Bot button
    if (window.ui.buttons.addBot) {
        window.ui.buttons.addBot.onclick = () => {
            if (!connectionState.isConnected) {
                showError('Not connected to server. Please wait...');
                return;
            }
            if (!window.gameState.roomCode) {
                showError('Room code not found');
                return;
            }
            if (window.gameState.botCount >= CONFIG.GAME.MAX_BOTS) {
                showError('Maximum number of bots reached');
                return;
            }
            socket.emit('addBot', window.gameState.roomCode);
        };
    }

    // Start Game button
    if (window.ui.buttons.start) {
        window.ui.buttons.start.onclick = () => {
            if (!connectionState.isConnected) {
                showError('Not connected to server. Please wait...');
                return;
            }
            if (!window.gameState.roomCode) {
                showError('Room code not found');
                return;
            }
            if (!window.gameState.players || window.gameState.players.length !== CONFIG.GAME.MAX_PLAYERS) {
                showError('Need exactly 4 players to start the game');
                return;
            }
            
            console.log('Emitting startGame event with room code:', window.gameState.roomCode);
            socket.emit('startGame', window.gameState.roomCode);
        };
        
        // Make button visible for host
        if (window.gameState.isHost) {
            window.ui.buttons.start.style.display = 'block';
        }
    }
}

// Add keyboard event listener to close panels with Escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        document.querySelectorAll('.panel.active').forEach(panel => {
            panel.classList.remove('active');
        });
    }
});

function handleConnectionError(error) {
    console.error('Connection error:', error);
    connectionState.lastError = error;
    connectionState.isConnecting = false;
    connectionState.isConnected = false;
    
    const errorMessage = error.message || 'Connection error occurred';
    showError(`${errorMessage}. Attempting to reconnect...`);
    
    attemptReconnection();
}

function attemptReconnection() {
    if (connectionAttempts >= MAX_RECONNECTION_ATTEMPTS) {
        showError('Unable to connect after multiple attempts. Please refresh the page.');
        return;
    }
    
    if (connectionState.reconnectTimer) {
        clearTimeout(connectionState.reconnectTimer);
    }
    
    connectionState.reconnectTimer = setTimeout(() => {
        console.log(`Attempting reconnection (${connectionAttempts + 1}/${MAX_RECONNECTION_ATTEMPTS})`);
        initSocket();
    }, RECONNECTION_DELAY);
}

function showError(message) {
    let errorDiv = document.getElementById('connection-error');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'connection-error';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 1000;
            max-width: 300px;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(errorDiv);
    }
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Auto-hide non-critical errors after 5 seconds
    if (!message.includes('refresh the page')) {
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

function hideError() {
    const errorDiv = document.getElementById('connection-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

function startGame(gameData) {
    // Hide lobby UI
    if (window.ui.divs.roomControls) {
        window.ui.divs.roomControls.style.display = 'none';
    }
    
    // Initialize game with received data
    window.game = new Game(gameData.players);
    window.game.startGame();
    
    // Show game UI
    if (window.ui.divs.menu) window.ui.divs.menu.classList.remove('active');
    if (window.ui.divs.game) window.ui.divs.game.classList.add('active');
} 