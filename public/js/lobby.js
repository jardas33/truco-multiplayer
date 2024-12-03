// Use existing socket if available, otherwise create new one
if (typeof socket === 'undefined') {
    let socket;
}

let roomId = null;
let playerId = null;

function initializeLobby() {
    if (!socket) {
        socket = io();
    }
    
    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('roomCreated', (id) => {
        roomId = id;
        document.getElementById('roomInput').value = id;
        console.log('Room created:', id);
    });

    socket.on('roomJoined', (id) => {
        roomId = id;
        console.log('Joined room:', id);
    });

    socket.on('gameStart', (players) => {
        console.log('Game starting with players:', players);
        startGame(); // Call the game's start function
    });

    socket.on('playerDisconnected', (id) => {
        console.log('Player disconnected:', id);
        // Handle player disconnection
    });
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

// Initialize when the page loads
window.addEventListener('load', initializeLobby); 