// Initialize socket and lobby when the document is ready
let socket;

function initSocket() {
    try {
        console.log('Initializing socket...');
        if (typeof io !== 'undefined') {
            socket = io();
            console.log('Socket initialized successfully');
            setupSocketListeners();
            setupButtonListeners();
        } else {
            console.error('Socket.IO not loaded');
            setTimeout(initSocket, 1000); // Try again in 1 second
        }
    } catch (error) {
        console.error('Error initializing socket:', error);
    }
}

function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('roomCreated', (id) => {
        window.roomId = id;
        document.getElementById('roomInput').value = id;
        console.log('Room created:', id);
        updateLobbyUI(true);
    });

    socket.on('roomJoined', (id) => {
        window.roomId = id;
        console.log('Joined room:', id);
        updateLobbyUI(true);
    });

    socket.on('playerJoined', (data) => {
        console.log('Player joined:', data);
        updatePlayerList(data.players);
        if (data.count === 4) {
            enableStartButton();
        }
    });

    socket.on('gameReady', (players) => {
        console.log('Game ready with players:', players);
        enableStartButton();
    });

    socket.on('gameStart', (players) => {
        console.log('Game starting with players:', players);
        hideRoomControls();
        if (typeof startGame === 'function') {
            startGame(players);
        }
    });

    socket.on('playerDisconnected', (data) => {
        console.log('Player disconnected:', data);
        updatePlayerList(data.players);
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
        alert('An error occurred: ' + error);
    });
}

function setupButtonListeners() {
    // Setup button click handlers
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const addBotBtn = document.getElementById('addBotBtn');
    const startGameBtn = document.getElementById('startGameBtn');

    if (createRoomBtn) {
        createRoomBtn.onclick = createRoom;
        console.log('Create room button listener added');
    }
    if (joinRoomBtn) {
        joinRoomBtn.onclick = joinRoom;
        console.log('Join room button listener added');
    }
    if (addBotBtn) {
        addBotBtn.onclick = addBot;
        console.log('Add bot button listener added');
    }
    if (startGameBtn) {
        startGameBtn.onclick = startGameWithCurrentPlayers;
        console.log('Start game button listener added');
    }
}

function createRoom() {
    console.log('Creating room...');
    if (!socket) {
        console.error('Socket not initialized');
        return;
    }
    const roomCode = document.getElementById('roomInput').value || Math.random().toString(36).substring(7);
    console.log('Creating room with code:', roomCode);
    socket.emit('createRoom', roomCode);
}

function joinRoom() {
    console.log('Joining room...');
    if (!socket) {
        console.error('Socket not initialized');
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
    console.log('Adding bot...');
    if (!socket || !window.roomId) {
        console.error('Socket not initialized or not in a room');
        return;
    }
    console.log('Adding bot to room:', window.roomId);
    socket.emit('addBot', window.roomId);
}

function startGameWithCurrentPlayers() {
    console.log('Starting game...');
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
    console.log('Updating player list:', players);
    const playerListDiv = document.getElementById('playerList');
    if (!playerListDiv) return;

    playerListDiv.innerHTML = '<h3>Players in Room:</h3>';
    players.forEach((player, index) => {
        const playerDiv = document.createElement('div');
        playerDiv.textContent = `Player ${index + 1}: ${player.isBot ? 'Bot' : 'Human'} (${player.team})`;
        playerListDiv.appendChild(playerDiv);
    });
}

function enableStartButton() {
    console.log('Enabling start button');
    const startGameBtn = document.getElementById('startGameBtn');
    if (startGameBtn) {
        startGameBtn.disabled = false;
    }
}

function hideRoomControls() {
    console.log('Hiding room controls');
    const roomControls = document.getElementById('roomControls');
    if (roomControls) {
        roomControls.style.display = 'none';
    }
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', initSocket); 