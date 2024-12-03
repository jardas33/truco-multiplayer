// Initialize socket at global scope
window.socket = io();

function initializeLobby() {
    console.log('Initializing lobby...');
    
    // Initialize socket event listeners
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
        if (typeof startGame === 'function') {
            startGame(players);
        }
    });

    socket.on('playerDisconnected', (data) => {
        console.log('Player disconnected:', data);
        updatePlayerList(data.players);
    });

    // Add button event listeners
    document.getElementById('createRoomBtn').addEventListener('click', createRoom);
    document.getElementById('joinRoomBtn').addEventListener('click', joinRoom);
    document.getElementById('addBotBtn').addEventListener('click', addBot);
    document.getElementById('startGameBtn').addEventListener('click', startGameWithCurrentPlayers);
}

function createRoom() {
    const roomCode = document.getElementById('roomInput').value || Math.random().toString(36).substring(7);
    console.log('Creating room with code:', roomCode);
    socket.emit('createRoom', roomCode);
}

function joinRoom() {
    const roomCode = document.getElementById('roomInput').value;
    if (roomCode) {
        console.log('Joining room:', roomCode);
        socket.emit('joinRoom', roomCode);
    } else {
        alert('Please enter a room code');
    }
}

function addBot() {
    if (window.roomId) {
        console.log('Adding bot to room:', window.roomId);
        socket.emit('addBot', window.roomId);
    }
}

function startGameWithCurrentPlayers() {
    if (window.roomId) {
        console.log('Starting game in room:', window.roomId);
        socket.emit('startGame', window.roomId);
    }
}

function updateLobbyUI(inRoom) {
    const addBotBtn = document.getElementById('addBotBtn');
    const startGameBtn = document.getElementById('startGameBtn');
    
    if (inRoom) {
        addBotBtn.style.display = 'inline-block';
        startGameBtn.style.display = 'inline-block';
    } else {
        addBotBtn.style.display = 'none';
        startGameBtn.style.display = 'none';
    }
}

function updatePlayerList(players) {
    const playerListDiv = document.getElementById('playerList');
    playerListDiv.innerHTML = '<h3>Players in Room:</h3>';
    players.forEach((player, index) => {
        const playerDiv = document.createElement('div');
        playerDiv.textContent = `Player ${index + 1}: ${player.isBot ? 'Bot' : 'Human'} (${player.team})`;
        playerListDiv.appendChild(playerDiv);
    });
}

function enableStartButton() {
    const startGameBtn = document.getElementById('startGameBtn');
    startGameBtn.disabled = false;
}

// Initialize when the page loads
window.addEventListener('load', initializeLobby); 