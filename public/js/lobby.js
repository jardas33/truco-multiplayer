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
        
        // ✅ Initialize multiplayer game immediately
        console.log('Initializing multiplayer game...');
        gameState = gameStateEnum.Playing;
        
        // Create game instance with multiplayer players
        window.game = new Game(players);
        
        // Start the game
        if (window.game.startGame) {
            window.game.startGame();
        }
        
        // Transition to game view
        const menuElement = document.getElementById('Menu');
        const gameElement = document.getElementById('Game');
        
        if (menuElement) menuElement.style.display = 'none';
        if (gameElement) gameElement.style.display = 'block';
        
        console.log('Multiplayer game started successfully');
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
    console.log('Starting game with current players...');
    
    // Initialize game state FIRST
    gameState = gameStateEnum.Playing;
    console.log('Game state set to:', gameState);
    
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
    teamAlfaRounds = 0;
    teamBetaRounds = 0;
    teamAlfaGames = 0;
    teamBetaGames = 0;
    teamAlfaSets = 0;
    teamBetaSets = 0;
    
    // Start the game
    window.game.startGame();
    
    // Force UI transition - use direct DOM manipulation for reliability
    console.log('Transitioning UI to game view...');
    
    // Hide menu
    const menuElement = document.getElementById('Menu');
    if (menuElement) {
        menuElement.style.display = 'none';
        console.log('Menu hidden');
    }
    
    // Show game area
    const gameElement = document.getElementById('Game');
    if (gameElement) {
        gameElement.style.display = 'block';
        console.log('Game area shown');
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
    
    // Try to show back button if available
    if (typeof backToMainMenuButton !== 'undefined' && backToMainMenuButton) {
        try {
            backToMainMenuButton.show();
            console.log('Back button shown');
        } catch (e) {
            console.log('Back button not available yet');
        }
    }
    
    // Force a redraw if p5.js is available
    if (typeof redraw === 'function') {
        redraw();
        console.log('Forced p5.js redraw');
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

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', initGame); 