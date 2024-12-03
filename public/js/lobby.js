// Global variables
let socket = null;
let gameInitialized = false;

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

    socket.on('roomCreated', (id) => {
        console.log('Room created:', id);
        window.roomId = id;
        document.getElementById('roomInput').value = id;
        updateLobbyUI(true);
    });

    socket.on('roomJoined', (id) => {
        console.log('Joined room:', id);
        window.roomId = id;
        updateLobbyUI(true);
    });

    socket.on('playerJoined', (data) => {
        console.log('Player joined:', data);
        updatePlayerList(data.players);
        if (data.count === 4) {
            enableStartButton();
        }
    });

    socket.on('gameStart', (players) => {
        console.log('Game starting with players:', players);
        hideRoomControls();
        window.players = players;  // Store players for the game
        startTrucoGame();  // This will now wait for 'gameStarted' event
    });

    socket.on('error', (message) => {
        console.error('Server error:', message);
        alert(message);
    });

    socket.on('playerDisconnected', (data) => {
        console.log('Player disconnected:', data);
        updatePlayerList(data.players);
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
}

function createRoom() {
    if (!socket) {
        console.error('Socket not initialized in createRoom');
        return;
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
    console.log('Adding bot to room:', window.roomId);
    socket.emit('addBot', window.roomId);
}

function startGameWithCurrentPlayers() {
    if (!socket || !window.roomId) {
        console.error('Socket not initialized or not in a room');
        return;
    }
    console.log('Starting game in room:', window.roomId);
    socket.emit('startGame', window.roomId);
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
        playerList.innerHTML = '<h3>Players in Room:</h3>' + 
            players.map(p => `<div>${p.name || 'Player'} ${p.isBot ? '(Bot)' : ''}</div>`).join('');
    }
}

function enableStartButton() {
    const startGameBtn = document.getElementById('startGameBtn');
    if (startGameBtn) {
        startGameBtn.disabled = false;
    }
}

function hideRoomControls() {
    const roomControls = document.getElementById('roomControls');
    if (roomControls) {
        roomControls.style.display = 'none';
    }
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', initGame); 