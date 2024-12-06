function draw() {
    // Clear the canvas at the start of each frame
    clear();
    
    // Draw background for all states
    push();
    imageMode(CORNER);
    image(backgroundImage, 0, 0, width, height);
    pop();
    
    if (gameState === gameStateEnum.Menu) {
        menuDiv.show();
        gameDiv.hide();
        instructionsDiv.hide();
        valuesDiv.hide();
        if (instructionsCloseButton) {
            instructionsCloseButton.remove();
        }
        // Remove any existing instructions box
        const existingBox = document.querySelector('.instructions-box');
        if (existingBox) {
            existingBox.remove();
        }
    }
    else if (gameState === gameStateEnum.Playing) {
        menuDiv.hide();
        gameDiv.show();
        instructionsDiv.hide();
        valuesDiv.hide();
        backToMainMenuButton.show();
        
        if (window.game) {
            drawGameState();
        }
    }
    // ... rest of the states ...
}

function drawGameState() {
    // Draw game table
    push();
    fill(0, 100, 0, 200); // Dark green table with some transparency
    noStroke();
    rect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);
    pop();

    // Draw players and their cards
    if (window.game.players) {
        window.game.players.forEach((player, index) => {
            const position = playerPositions[index];
            if (position && player) {
                // Draw player label
                fill(255);
                noStroke();
                textAlign(CENTER);
                text(position.label, position.x, position.y + position.labelOffset);
                
                // Draw player's cards
                if (player.cards) {
                    drawPlayerCards(player, position.x, position.y);
                }
            }
        });
    }
}

function drawPlayerCards(player, x, y) {
    const cardWidth = 80;
    const cardHeight = 120;
    const cardSpacing = 30;
    
    if (player.cards && player.cards.length > 0) {
        player.cards.forEach((card, index) => {
            if (card) {
                const offsetX = (index - player.cards.length / 2) * cardSpacing;
                push();
                imageMode(CENTER);
                // Show face-up cards only for player 1
                const cardImg = (player.id === 1) ? cardImages[card.name] : backCardImage;
                if (cardImg) {
                    image(cardImg, x + offsetX, y, cardWidth, cardHeight);
                } else {
                    // Fallback rectangle if image isn't loaded
                    fill(255);
                    rectMode(CENTER);
                    rect(x + offsetX, y, cardWidth, cardHeight);
                }
                pop();
            }
        });
    }
}