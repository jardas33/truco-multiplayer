let currentGame = null;
let currentPlayer = null;

function initializeGame(gameState) {
    console.log('Initializing game with state:', gameState);
    
    if (!gameState) {
        console.error('Game state is undefined');
        return;
    }

    if (!gameState.players || !Array.isArray(gameState.players)) {
        console.error('Invalid players array in game state');
        return;
    }

    // Store the game state
    currentGame = gameState;
    window.game = gameState;  // Ensure global game state is set
    
    // Find current player in the players array
    currentPlayer = gameState.players.find(p => p.id === socket.id);
    if (!currentPlayer) {
        console.error('Current player not found in game state');
        return;
    }
    
    // Hide menu and show game
    if (window.ui && window.ui.divs) {
        if (window.ui.divs.menu) {
            window.ui.divs.menu.style.display = 'none';
        }
        if (window.ui.divs.game) {
            window.ui.divs.game.style.display = 'block';
        }
        if (window.ui.divs.roomControls) {
            window.ui.divs.roomControls.style.display = 'none';
        }
    } else {
        console.error('UI elements not properly initialized');
    }
    
    // Set game phase
    window.gameState.currentPhase = gameStateEnum.Playing;
    
    console.log('Game initialized successfully');
    console.log('Current game state:', window.gameState);
    console.log('Current player:', currentPlayer);
}

function drawGame() {
    if (!currentGame || !currentPlayer) return;

    // Clear the canvas
    clear();
    
    // Draw background
    push();
    imageMode(CORNER);
    image(backgroundImage, 0, 0, width, height);
    pop();

    // Draw all players and their cards
    currentGame.players.forEach((player, index) => {
        const position = window.gameElements.playerPositions[index];
        if (!position) return;

        // Draw player name and status
        push();
        fill(255);
        textAlign(CENTER);
        textSize(16);
        text(player.name + (player.isBot ? ' (Bot)' : ''), position.x, position.y - 140);
        pop();

        // Draw cards
        if (player.hand) {
            const isCurrentPlayer = player.id === currentPlayer.id;
            drawPlayerHand(player.hand, position, isCurrentPlayer);
        }
    });

    // Draw played cards in the center
    if (currentGame.playedCards && currentGame.playedCards.length > 0) {
        drawPlayedCards(currentGame.playedCards);
    }

    // Draw scores
    drawScores();
}

function drawPlayerHand(hand, position, isCurrentPlayer) {
    const cardSpacing = 30;
    const startX = position.x - ((hand.length - 1) * cardSpacing) / 2;

    hand.forEach((card, index) => {
        const x = startX + index * cardSpacing;
        const y = position.y;

        push();
        imageMode(CENTER);
        
        // Show card face up if it's the current player or if showAllCards is true
        if (isCurrentPlayer || window.gameState.showAllCards) {
            const cardImage = window.gameAssets.cardImages[card];
            if (cardImage) {
                image(cardImage, x, y, CONFIG.CARD_DIMENSIONS.WIDTH, CONFIG.CARD_DIMENSIONS.HEIGHT);
            }
        } else {
            // Show card back for other players
            image(window.gameAssets.backCardImage, x, y, CONFIG.CARD_DIMENSIONS.WIDTH, CONFIG.CARD_DIMENSIONS.HEIGHT);
        }
        pop();
    });
}

function drawPlayedCards(playedCards) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 100;

    playedCards.forEach((card, index) => {
        const angle = (index * TWO_PI) / playedCards.length - HALF_PI;
        const x = centerX + cos(angle) * radius;
        const y = centerY + sin(angle) * radius;

        push();
        imageMode(CENTER);
        const cardImage = window.gameAssets.cardImages[card];
        if (cardImage) {
            image(cardImage, x, y, CONFIG.CARD_DIMENSIONS.WIDTH, CONFIG.CARD_DIMENSIONS.HEIGHT);
        }
        pop();
    });
}

function drawScores() {
    if (!currentGame || !currentGame.scores) return;

    push();
    fill(255);
    textAlign(LEFT);
    textSize(16);
    text(`Team 1: ${currentGame.scores.team1.points} points (${currentGame.scores.team1.rounds} rounds)`, 20, 30);
    text(`Team 2: ${currentGame.scores.team2.points} points (${currentGame.scores.team2.rounds} rounds)`, 20, 60);
    pop();
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeGame,
        drawGame
    };
}
  