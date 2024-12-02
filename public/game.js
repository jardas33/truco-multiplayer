'use strict';

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Game state
let gameCanvas;
let cardImages = {};
let playerHand = [];
let playedCards = [];
let currentPlayer;
let gameStarted = false;
let currentPlayerIndex = 0;
let players = [];
let scores = { team1: 0, team2: 0 };
let games = { team1: 0, team2: 0 };
let sets = { team1: 0, team2: 0 };

// Load card images
function preloadCardImages() {
    const suits = ['clubs', 'hearts', 'spades', 'diamonds'];
    const values = ['A', '2', '3'];
    
    // Load card back
    cardImages['back'] = loadImage('/Images/cardBack.jpg');
    
    // Load each card
    suits.forEach(suit => {
        values.forEach(value => {
            const cardName = `${value}_${suit}`;
            cardImages[cardName] = loadImage(`/Images/${cardName}.png`);
        });
    });
}

function setup() {
    gameCanvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    gameCanvas.parent('gameContainer');
    background('#27ae60');
    textAlign(CENTER, CENTER);
    textSize(20);
    fill(255);
    text('Waiting for game to start...', width/2, height/2);
}

function draw() {
    if (!gameStarted) return;
    
    background('#27ae60');
    
    // Draw game state
    drawGameState();
    
    // Draw played cards in the center
    drawPlayedCards();
    
    // Draw player's hand
    drawPlayerHand();
    
    // Draw other players' cards (face down)
    drawOtherPlayersCards();
}

function drawGameState() {
    fill(255);
    textSize(20);
    textAlign(LEFT, TOP);
    
    // Draw scores
    text(`Team 1: ${games.team1}`, 10, 10);
    text(`Team 2: ${games.team2}`, 10, 40);
    
    // Draw current player indicator
    if (currentPlayer === socket.id) {
        text('Your turn!', width/2 - 50, 10);
    }
}

function drawPlayedCards() {
    const centerX = width/2;
    const centerY = height/2;
    const radius = 100;
    const cardWidth = 60;
    const cardHeight = 90;
    
    playedCards.forEach((play, index) => {
        const angle = (index * 2 * PI / players.length) - PI/2;
        const x = centerX + radius * cos(angle) - cardWidth/2;
        const y = centerY + radius * sin(angle) - cardHeight/2;
        
        if (cardImages[play.card]) {
            image(cardImages[play.card], x, y, cardWidth, cardHeight);
        }
    });
}

function drawPlayerHand() {
    const cardWidth = 80;
    const cardHeight = 120;
    const startX = width/2 - (playerHand.length * cardWidth)/2;
    const startY = height - cardHeight - 20;
    
    playerHand.forEach((card, index) => {
        const x = startX + index * cardWidth;
        if (cardImages[card]) {
            image(cardImages[card], x, startY, cardWidth, cardHeight);
            
            // Highlight playable cards
            if (currentPlayer === socket.id) {
                noFill();
                stroke('#2ecc71');
                strokeWeight(2);
                rect(x, startY, cardWidth, cardHeight);
                strokeWeight(1);
            }
        }
    });
}

function drawOtherPlayersCards() {
    const cardWidth = 60;
    const cardHeight = 90;
    
    // Draw left player's cards
    if (players.length > 1) {
        for (let i = 0; i < 3; i++) {
            image(cardImages['back'], 20, 200 + i * 30, cardWidth, cardHeight);
        }
    }
    
    // Draw top player's cards
    if (players.length > 2) {
        for (let i = 0; i < 3; i++) {
            image(cardImages['back'], width/2 - 90 + i * 30, 20, cardWidth, cardHeight);
        }
    }
    
    // Draw right player's cards
    if (players.length > 3) {
        for (let i = 0; i < 3; i++) {
            image(cardImages['back'], width - 80, 200 + i * 30, cardWidth, cardHeight);
        }
    }
}

function mouseClicked() {
    if (!gameStarted || currentPlayer !== socket.id) return;
    
    // Check if clicked on a card in player's hand
    const cardWidth = 80;
    const cardHeight = 120;
    const startX = width/2 - (playerHand.length * cardWidth)/2;
    const startY = height - cardHeight - 20;
    
    playerHand.forEach((card, index) => {
        const x = startX + index * cardWidth;
        if (mouseX > x && mouseX < x + cardWidth &&
            mouseY > startY && mouseY < startY + cardHeight) {
            socket.emit('playCard', {
                roomId: currentRoom,
                cardIndex: index
            });
        }
    });
}

// Socket event handlers
socket.on('gameStart', (data) => {
    console.log('Game starting:', data);
    playerHand = data.hand;
    currentPlayerIndex = data.playerIndex;
    currentPlayer = data.currentPlayer;
    players = data.players;
    gameStarted = true;
    
    // Show game container
    document.getElementById('gameContainer').style.display = 'block';
    // Hide lobby controls
    document.querySelector('.container').style.display = 'none';
});

socket.on('cardPlayed', (data) => {
    if (data.playerId === socket.id) {
        // Remove card from hand
        playerHand.splice(data.cardIndex, 1);
    }
    playedCards.push({
        card: data.card,
        playerId: data.playerId
    });
    currentPlayer = data.nextPlayer;
});

socket.on('roundEnd', (data) => {
    // Update scores
    scores = data.scores;
    games = data.games;
    sets = data.sets;
    playedCards = [];
    
    // Display round winner
    fill(255);
    textSize(30);
    textAlign(CENTER, CENTER);
    text(`${data.winner} wins the round!`, width/2, height/2);
});

socket.on('newGame', (data) => {
    playerHand = data.hand;
    games = data.games;
    sets = data.sets;
    playedCards = [];
}); 