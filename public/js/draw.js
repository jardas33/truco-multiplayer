function draw() {
    // Clear the canvas at the start of each frame
    clear();
    
    // Draw background for all states
    push();
    imageMode(CORNER);
    image(backgroundImage, 0, 0, width, height);
    pop();
    
    if (window.gameState.currentPhase === gameStateEnum.Menu) {
        // Show menu and hide other sections
        if (window.ui.divs.menu) window.ui.divs.menu.style.display = 'block';
        if (window.ui.divs.game) window.ui.divs.game.style.display = 'none';
        if (window.ui.divs.instructions) window.ui.divs.instructions.style.display = 'none';
        if (window.ui.divs.values) window.ui.divs.values.style.display = 'none';
    }
    else if (window.gameState.currentPhase === gameStateEnum.Playing) {
        // Show game and hide other sections
        if (window.ui.divs.menu) window.ui.divs.menu.style.display = 'none';
        if (window.ui.divs.game) window.ui.divs.game.style.display = 'block';
        if (window.ui.divs.instructions) window.ui.divs.instructions.style.display = 'none';
        if (window.ui.divs.values) window.ui.divs.values.style.display = 'none';
        
        if (window.game) {
            drawGameState();
        }
    }
}

function drawGameState() {
    // Draw game elements here
    try {
        // Draw players
        for (let i = 0; i < window.game.players.length; i++) {
            const player = window.game.players[i];
            const pos = window.gameElements.playerPositions[i];
            
            // Draw player name
            fill(255);
            noStroke();
            textAlign(CENTER);
            text(player.name, pos.x, pos.y + pos.labelOffset);
            
            // Draw player's cards if they exist
            if (player.hand) {
                drawPlayerCards(player, pos);
            }
        }
        
        // Draw played cards
        if (window.gameElements.playedCards) {
            drawPlayedCards();
        }
        
    } catch (error) {
        console.error('Error in drawGameState:', error);
    }
}

function drawPlayerCards(player, position) {
    try {
        const cardSpacing = 20;
        const startX = position.x - ((player.hand.length - 1) * cardSpacing) / 2;
        
        player.hand.forEach((card, index) => {
            const x = startX + index * cardSpacing;
            const y = position.y;
            
            if (card.isClickable) {
                tint(255, 255);
            } else {
                tint(150, 150);
            }
            
            push();
            imageMode(CENTER);
            if (player.id === socket.id || window.gameState.showAllCards) {
                image(window.gameAssets.cardImages[card.name], x, y, CONFIG.CARD_DIMENSIONS.WIDTH, CONFIG.CARD_DIMENSIONS.HEIGHT);
            } else {
                image(window.gameAssets.backCardImage, x, y, CONFIG.CARD_DIMENSIONS.WIDTH, CONFIG.CARD_DIMENSIONS.HEIGHT);
            }
            pop();
        });
    } catch (error) {
        console.error('Error in drawPlayerCards:', error);
    }
}

function drawPlayedCards() {
    try {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = 100;
        
        window.gameElements.playedCards.forEach((card, index) => {
            const angle = (index * TWO_PI) / window.gameElements.playedCards.length - HALF_PI;
            const x = centerX + cos(angle) * radius;
            const y = centerY + sin(angle) * radius;
            
            push();
            imageMode(CENTER);
            image(window.gameAssets.cardImages[card.name], x, y, CONFIG.CARD_DIMENSIONS.WIDTH, CONFIG.CARD_DIMENSIONS.HEIGHT);
            pop();
        });
    } catch (error) {
        console.error('Error in drawPlayedCards:', error);
    }
}

// Handle window resizing
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    
    // Update player positions
    if (window.gameElements.playerPositions) {
        window.gameElements.playerPositions[0].x = width / 6;
        window.gameElements.playerPositions[0].y = height / 2;
        
        window.gameElements.playerPositions[1].x = width / 2;
        window.gameElements.playerPositions[1].y = 100;
        
        window.gameElements.playerPositions[2].x = (5 * width) / 6;
        window.gameElements.playerPositions[2].y = height / 2;
        
        window.gameElements.playerPositions[3].x = width / 2;
        window.gameElements.playerPositions[3].y = height - 100;
    }
}