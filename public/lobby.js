function createRoom() {
    const roomId = Math.random().toString(36).substring(2, 8);
    socket.emit('createRoom', roomId);
}

function joinRoom() {
    const roomId = document.getElementById('roomInput').value;
    socket.emit('joinRoom', roomId);
}

socket.on('roomCreated', (roomId) => {
    document.getElementById('roomId').textContent = `Room ID: ${roomId}`;
    // Store room ID for later use
    window.roomId = roomId;
});

socket.on('error', (message) => {
    alert(message);
}); 