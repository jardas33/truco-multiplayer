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

        if (connectionAttempts >= MAX_RECONNECTION_ATTEMPTS) {
            throw new Error('Max reconnection attempts reached');
        }

        connectionAttempts++;
        
        // Clear any existing socket
        if (socket) {
            socket.disconnect();
            socket = null;
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
    if (!socket) return;

    socket.on('roomCreated', (roomData) => {
        console.log('Room created:', roomData);
        window.gameState.roomCode = roomData.roomCode;
        window.gameState.isHost = true;
        window.gameState.players = roomData.players;
        updateRoomUI(roomData);
        showHostControls();
    });

    socket.on('roomJoined', (roomData) => {
        console.log('Room joined:', roomData);
        window.gameState.roomCode = roomData.roomCode;
        window.gameState.players = roomData.players;
        updateRoomUI(roomData);
    });

    socket.on('playerJoined', (data) => {
        console.log('Player joined:', data);
        window.gameState.players = data.players;
        updatePlayerList(data.players);
        updateGameControls();
    });

    socket.on('botAdded', (data) => {
        console.log('Bot added:', data);
        window.gameState.players = data.players;
        window.gameState.botCount = data.botCount;
        updatePlayerList(data.players);
        updateGameControls();
    });

    socket.on('gameStarted', (gameData) => {
        console.log('Game started:', gameData);
        window.gameState.currentPhase = 'playing';
        startGame(gameData);
    });

    socket.on('gameError', (error) => {
        console.error('Game error:', error);
        showError(error);
    });
}

function updateGameControls() {
    const playerCount = window.gameState.players.length;
    const botCount = window.gameState.botCount;
    
    // Update Add Bot button visibility
    if (window.ui.buttons.addBot) {
        if (window.gameState.isHost && playerCount < CONFIG.GAME.MAX_PLAYERS && botCount < CONFIG.GAME.MAX_BOTS) {
            window.ui.buttons.addBot.style.display = 'block';
        } else {
            window.ui.buttons.addBot.style.display = 'none';
        }
    }
    
    // Update Start Game button
    if (window.ui.buttons.start) {
        const canStart = window.gameState.isHost && playerCount >= CONFIG.GAME.MIN_PLAYERS;
        window.ui.buttons.start.style.display = canStart ? 'block' : 'none';
        window.ui.buttons.start.disabled = !canStart;
    }
}

function showHostControls() {
    if (window.ui.buttons.addBot) {
        window.ui.buttons.addBot.style.display = 'block';
    }
    if (window.ui.buttons.start) {
        window.ui.buttons.start.style.display = 'block';
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
                ${player.isBot ? '<span class="bot-tag">Bot</span>' : ''}
                ${player.isHost ? '<span class="host-tag">Host</span>' : ''}
            </div>
        `).join('')}
    `;
}

function setupButtonListeners() {
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
            if (window.gameState.players.length < CONFIG.GAME.MIN_PLAYERS) {
                showError('Not enough players to start the game');
                return;
            }
            socket.emit('startGame', window.gameState.roomCode);
        };
    }
}

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