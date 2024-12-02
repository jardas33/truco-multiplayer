// Game constants and state
const CARD_VALUES = {
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
let currentPlayerIndex = 0;
let trucoState = null;
let gameValue = 1;
let potentialGameValue = 0;
let initialTrucoCallerIndex = null;
let lastActionWasRaise = false;
let scores = {
    team1: 0,
    team2: 0
};
let games = {
    team1: 0,
    team2: 0
};
let sets = {
    team1: 0,
    team2: 0
};
let roundResults = [];

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

function initGame(data) {
    gameCanvas = createCanvas(800, 600);
    gameCanvas.parent('gameContainer');
    background('#27ae60');
    
    // Initialize game state with received data
    playerHand = data.hand || [];
    currentPlayerIndex = data.playerIndex;
    currentPlayer = data.currentPlayer;
    players = data.players;
    gameStarted = true;
    
    // Reset game state
    trucoState = null;
    gameValue = 1;
    potentialGameValue = 0;
    initialTrucoCallerIndex = null;
    lastActionWasRaise = false;
    playedCards = [];
    roundResults = [];
    
    // Reset scores
    scores = { team1: 0, team2: 0 };
    games = { team1: 0, team2: 0 };
    sets = { team1: 0, team2: 0 };
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
    text(`Game Value: ${gameValue}`, 10, 10);
    text(`Team 1: ${games.team1}`, 10, 40);
    text(`Team 2: ${games.team2}`, 10, 70);
    
    if (trucoState) {
        text('TRUCO!', width/2 - 50, 10);
    }
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
            if (currentPlayer === socket.id && !trucoState) {
                noFill();
                stroke('#27ae60');
                rect(x, startY, cardWidth, cardHeight);
            }
        }
    });
}

function drawPlayedCards() {
    const cardWidth = 80;
    const cardHeight = 120;
    const centerX = width/2 - cardWidth/2;
    const centerY = height/2 - cardHeight/2;
    
    playedCards.forEach((playedCard, index) => {
        const x = centerX + (index - playedCards.length/2) * 30;
        const y = centerY;
        if (cardImages[playedCard.card]) {
            image(cardImages[playedCard.card], x, y, cardWidth, cardHeight);
        }
    });
}

function drawOtherPlayersCards() {
    const cardWidth = 80;
    const cardHeight = 120;
    
    players.forEach((player, index) => {
        if (player.id !== socket.id) {
            let x, y;
            switch(index) {
                case (currentPlayerIndex + 1) % 4:
                    x = width - cardWidth - 20;
                    y = height/2 - cardHeight/2;
                    break;
                case (currentPlayerIndex + 2) % 4:
                    x = width/2 - cardWidth/2;
                    y = 20;
                    break;
                case (currentPlayerIndex + 3) % 4:
                    x = 20;
                    y = height/2 - cardHeight/2;
                    break;
            }
            image(cardImages['back'], x, y, cardWidth, cardHeight);
            
            // Highlight current player
            if (currentPlayer === player.id) {
                noFill();
                stroke('#27ae60');
                rect(x, y, cardWidth, cardHeight);
            }
        }
    });
}

function mouseClicked() {
    if (!gameStarted || currentPlayer !== socket.id || trucoState) return;
    
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
    // Update scores and game state
    scores = data.scores;
    games = data.games;
    sets = data.sets;
    playedCards = [];
    roundResults.push(data.winner);
});

socket.on('gameEnd', (data) => {
    alert(`Game Over! ${data.winner} wins!`);
    gameStarted = false;
}); 