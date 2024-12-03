// Initialize socket at global scope
window.socket = io();

function initializeLobby() {
    console.log('Initializing lobby...');
    
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
        startGame(players);
    });

    socket.on('playerDisconnected', (data) => {
        console.log('Player disconnected:', data);
        updatePlayerList(data.players);
    });

    // Create Add Bot button
    const addBotButton = document.createElement('button');
    addBotButton.textContent = 'Add Bot';
    addBotButton.onclick = addBot;
    addBotButton.style.display = 'none';
    addBotButton.id = 'addBotButton';
    document.getElementById('roomControls').appendChild(addBotButton);

    // Create Start Game button
    const startGameButton = document.createElement('button');
    startGameButton.textContent = 'Start Game';
    startGameButton.onclick = startGameWithCurrentPlayers;
    startGameButton.style.display = 'none';
    startGameButton.id = 'startGameButton';
    document.getElementById('roomControls').appendChild(startGameButton);

    // Create player list div
    const playerListDiv = document.createElement('div');
    playerListDiv.id = 'playerList';
    playerListDiv.style.marginTop = '20px';
    document.getElementById('roomControls').appendChild(playerListDiv);
}

function createRoom() {
    const roomCode = document.getElementById('roomInput').value || Math.random().toString(36).substring(7);
    socket.emit('createRoom', roomCode);
}

function joinRoom() {
    const roomCode = document.getElementById('roomInput').value;
    if (roomCode) {
        socket.emit('joinRoom', roomCode);
    } else {
        alert('Please enter a room code');
    }
}

function addBot() {
    if (window.roomId) {
        socket.emit('addBot', window.roomId);
    }
}

function startGameWithCurrentPlayers() {
    if (window.roomId) {
        socket.emit('startGame', window.roomId);
    }
}

function updateLobbyUI(inRoom) {
    const addBotButton = document.getElementById('addBotButton');
    const startGameButton = document.getElementById('startGameButton');
    
    if (inRoom) {
        addBotButton.style.display = 'inline-block';
        startGameButton.style.display = 'inline-block';
    } else {
        addBotButton.style.display = 'none';
        startGameButton.style.display = 'none';
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
    const startGameButton = document.getElementById('startGameButton');
    startGameButton.disabled = false;
}

// Initialize when the page loads
window.addEventListener('load', initializeLobby); 