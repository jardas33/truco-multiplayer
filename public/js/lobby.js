// Wait for socket.io to be loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize socket
    window.socket = io();
    
    // Initialize lobby after socket is ready
    socket.on('connect', () => {
        console.log('Socket connected successfully');
        initializeLobby();
    });
});

function initializeLobby() {
    console.log('Initializing lobby...');
    
    // Add button event listeners
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const addBotBtn = document.getElementById('addBotBtn');
    const startGameBtn = document.getElementById('startGameBtn');

    if (createRoomBtn) createRoomBtn.addEventListener('click', createRoom);
    if (joinRoomBtn) joinRoomBtn.addEventListener('click', joinRoom);
    if (addBotBtn) addBotBtn.addEventListener('click', addBot);
    if (startGameBtn) startGameBtn.addEventListener('click', startGameWithCurrentPlayers);

    // Socket event listeners
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

function createRoom() {
    console.log('Creating room...');
    const roomCode = document.getElementById('roomInput').value || Math.random().toString(36).substring(7);
    console.log('Creating room with code:', roomCode);
    socket.emit('createRoom', roomCode);
}

function joinRoom() {
    console.log('Joining room...');
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
    if (window.roomId) {
        console.log('Adding bot to room:', window.roomId);
        socket.emit('addBot', window.roomId);
    }
}

function startGameWithCurrentPlayers() {
    console.log('Starting game...');
    if (window.roomId) {
        console.log('Starting game in room:', window.roomId);
        socket.emit('startGame', window.roomId);
    }
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