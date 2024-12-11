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

    socket.on('connect_error', (error) => {
        handleConnectionError(error);
    });

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

    socket.on('error', (error) => {
        console.error('Socket error:', error);
        handleConnectionError(error);
    });

    // Game-specific event handlers
    setupGameEventHandlers();
}

function setupGameEventHandlers() {
    if (!socket) return;

    socket.on('roomCreated', (roomCode) => {
        console.log('Room created:', roomCode);
        updateRoomUI(roomCode);
    });

    socket.on('playerJoined', (data) => {
        console.log('Player joined:', data);
        updatePlayerList(data.players);
        
        // Enable start button if enough players
        const startButton = document.getElementById('startGameBtn');
        if (startButton) {
            startButton.disabled = data.players.length < 2;
        }
    });

    socket.on('gameStarted', (gameData) => {
        console.log('Game started:', gameData);
        startGame(gameData);
    });

    socket.on('gameError', (error) => {
        console.error('Game error:', error);
        showError(error);
    });
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
}

function hideError() {
    const errorDiv = document.getElementById('connection-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

function updateRoomUI(roomCode) {
    const roomCodeDisplay = document.getElementById('roomCodeDisplay');
    if (!roomCodeDisplay) {
        const display = document.createElement('div');
        display.id = 'roomCodeDisplay';
        display.style.cssText = `
            margin: 10px 0;
            padding: 10px;
            background: rgba(255,255,255,0.1);
            border-radius: 5px;
        `;
        display.textContent = `Room Code: ${roomCode}`;
        document.getElementById('roomControls').appendChild(display);
    } else {
        roomCodeDisplay.textContent = `Room Code: ${roomCode}`;
    }
}

function updatePlayerList(players) {
    const playerList = document.getElementById('playerList');
    if (!playerList) return;
    
    playerList.innerHTML = '<h3>Players:</h3>';
    players.forEach((player, index) => {
        const playerDiv = document.createElement('div');
        playerDiv.textContent = `${player.name} ${player.isBot ? '(Bot)' : ''}`;
        playerList.appendChild(playerDiv);
    });
}

function setupButtonListeners() {
    // Create Room button
    const createRoomBtn = document.getElementById('createRoomBtn');
    if (createRoomBtn) {
        createRoomBtn.onclick = () => {
            if (!socket || !connectionState.isConnected) {
                showError('Not connected to server. Please wait...');
                return;
            }
            socket.emit('createRoom');
        };
    }

    // Join Room button
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const roomInput = document.getElementById('roomInput');
    if (joinRoomBtn && roomInput) {
        joinRoomBtn.onclick = () => {
            if (!socket || !connectionState.isConnected) {
                showError('Not connected to server. Please wait...');
                return;
            }
            const roomCode = roomInput.value.trim().toUpperCase();
            if (roomCode) {
                socket.emit('joinRoom', roomCode);
            } else {
                showError('Please enter a room code');
            }
        };
    }

    // Add Bot button
    const addBotBtn = document.getElementById('addBotBtn');
    if (addBotBtn) {
        addBotBtn.onclick = () => {
            if (!socket || !connectionState.isConnected) {
                showError('Not connected to server. Please wait...');
                return;
            }
            socket.emit('addBot');
        };
    }
} 