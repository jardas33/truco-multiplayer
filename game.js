// Card values and positions
const cardValues = {
    'A_clubs': 1, '2_clubs': 2, '3_clubs': 3,
    'A_hearts': 1, '2_hearts': 2, '3_hearts': 3,
    'A_spades': 1, '2_spades': 2, '3_spades': 3,
    'A_diamonds': 1, '2_diamonds': 2, '3_diamonds': 3
};

let gameCanvas;
let cardImages = {};
let playerHand = [];
let playedCards = [];
let currentPlayer;
let gameStarted = false;

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

function setupGame() {
    gameCanvas = createCanvas(800, 600);
    gameCanvas.parent('gameContainer');
    background('#27ae60');
    
    // Initialize game state
    currentPlayer = socket.id;
    gameStarted = true;
}

function drawGame() {
    if (!gameStarted) return;
    
    background('#27ae60');
    
    // Draw played cards in the center
    drawPlayedCards();
    
    // Draw player's hand
    drawPlayerHand();
    
    // Draw other players' cards (face down)
    drawOtherPlayersCards();
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
        }
    });
}

function drawPlayedCards() {
    const cardWidth = 80;
    const cardHeight = 120;
    const centerX = width/2 - cardWidth/2;
    const centerY = height/2 - cardHeight/2;
    
    playedCards.forEach((card, index) => {
        const x = centerX + index * 20;
        const y = centerY;
        if (cardImages[card]) {
            image(cardImages[card], x, y, cardWidth, cardHeight);
        }
    });
}

function drawOtherPlayersCards() {
    const cardWidth = 80;
    const cardHeight = 120;
    
    // Left player
    image(cardImages['back'], 20, height/2 - cardHeight/2, cardWidth, cardHeight);
    
    // Top player
    image(cardImages['back'], width/2 - cardWidth/2, 20, cardWidth, cardHeight);
    
    // Right player
    image(cardImages['back'], width - cardWidth - 20, height/2 - cardHeight/2, cardWidth, cardHeight);
}

function mouseClicked() {
    if (!gameStarted) return;
    
    // Check if clicked on a card in player's hand
    const cardWidth = 80;
    const cardHeight = 120;
    const startX = width/2 - (playerHand.length * cardWidth)/2;
    const startY = height - cardHeight - 20;
    
    playerHand.forEach((card, index) => {
        const x = startX + index * cardWidth;
        if (mouseX > x && mouseX < x + cardWidth &&
            mouseY > startY && mouseY < startY + cardHeight) {
            playCard(index);
        }
    });
}

function playCard(cardIndex) {
    if (cardIndex >= 0 && cardIndex < playerHand.length) {
        const card = playerHand[cardIndex];
        socket.emit('playCard', { card, roomId: currentRoom });
        playerHand.splice(cardIndex, 1);
        playedCards.push(card);
    }
}

// Socket event handlers for game
socket.on('gameStart', (data) => {
    setupGame();
    playerHand = data.hand || [];
    currentPlayer = data.currentPlayer;
});

socket.on('cardPlayed', (data) => {
    playedCards.push(data.card);
});

socket.on('updateHand', (data) => {
    playerHand = data.hand;
}); 