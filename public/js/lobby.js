// Global variables
let socket = null;
let gameInitialized = false;

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
    
    // Start Single Player Game button
    const startSinglePlayerBtn = document.getElementById('startSinglePlayerBtn');
    if (startSinglePlayerBtn) {
        startSinglePlayerBtn.onclick = () => {
            console.log('Start Single Player Game clicked');
            startSinglePlayerGame();
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
    console.log('Starting game with current players...');
    
    // Initialize game state
    gameState = gameStateEnum.Playing;
    
    // Create players array with one human player and three bots
    let players = [
        new Player("Player 1", "Team 1", false),
        new Player("Bot 1", "Team 2", true),
        new Player("Bot 2", "Team 1", true),
        new Player("Bot 3", "Team 2", true)
    ];
    
    console.log("Players created:", players);
    
    // Initialize game with players
    window.game = new Game(players);
    
    // Initialize game variables
    playedCards = [];
    team1Rounds = 0;
    team2Rounds = 0;
    team1Games = 0;
    team2Games = 0;
    team1Sets = 0;
    team2Sets = 0;
    
    // Start the game
    window.game.startGame();
    
    // Update UI using p5.js functions
    if (typeof select === 'function') {
        menuDiv.style('display', 'none');
        gameDiv.style('display', 'block');
        instructionsDiv.style('display', 'none');
        valuesDiv.style('display', 'none');
        if (backToMainMenuButton) backToMainMenuButton.show();
    } else {
        // Fallback to DOM manipulation
        document.getElementById('Menu').style.display = 'none';
        document.getElementById('Game').style.display = 'block';
        document.getElementById('Instructions').style.display = 'none';
        document.getElementById('Values').style.display = 'none';
    }
    
    console.log('Game started successfully');
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

function startSinglePlayerGame() {
    console.log('Starting single player game...');
    
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
    team1Rounds = 0;
    team2Rounds = 0;
    team1Games = 0;
    team2Games = 0;
    team1Sets = 0;
    team2Sets = 0;
    
    // Start the game
    window.game.startGame();
    
    // Update UI using p5.js functions if available
    if (typeof select === 'function') {
        menuDiv.style('display', 'none');
        gameDiv.style('display', 'block');
        instructionsDiv.style('display', 'none');
        valuesDiv.style('display', 'none');
        if (backToMainMenuButton) backToMainMenuButton.show();
    } else {
        // Fallback to DOM manipulation
        document.getElementById('Menu').style.display = 'none';
        document.getElementById('Game').style.display = 'block';
        document.getElementById('Instructions').style.display = 'none';
        document.getElementById('Values').style.display = 'none';
    }
    
    console.log('Single player game started successfully');
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', initGame); 