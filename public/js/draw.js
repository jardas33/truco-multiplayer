function draw() {
    // Clear the canvas at the start of each frame
    clear();
    
    // Draw background for all states
    push();
    imageMode(CORNER);
    if (backgroundImage) {
        image(backgroundImage, 0, 0, windowWidth, windowHeight);
    } else {
        // Fallback green background if image fails to load
        background(0, 100, 0);
    }
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
    if (!window.game) {
        console.error('Game not initialized');
        return;
    }

    // Draw game table
    push();
    fill(0, 100, 0, 200); // Dark green table with some transparency
    noStroke();
    rect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);
    pop();

    // Draw players and their cards
    if (window.game.players) {
        window.game.players.forEach((player, index) => {
            if (!player) {
                console.error('Invalid player at index', index);
                return;
            }
            
            const position = playerPositions[index];
            if (!position) {
                console.error('No position for player', index);
                return;
            }

            // Draw player label
            fill(255);
            noStroke();
            textAlign(CENTER);
            text(position.label, position.x, position.y + position.labelOffset);
            
            // Draw player's cards
            if (player.cards) {
                drawPlayerCards(player, position.x, position.y);
            }
        });
    }
}

function drawPlayerCards(player, x, y) {
    if (!player || !player.cards) {
        console.error('Invalid player or cards');
        return;
    }

    const cardWidth = 80;
    const cardHeight = 120;
    const cardSpacing = 30;
    
    player.cards.forEach((card, index) => {
        if (!card) return;
        
        const offsetX = (index - player.cards.length / 2) * cardSpacing;
        push();
        imageMode(CENTER);
        
        // Show face-up cards only for player 1
        const cardImg = (player.id === 1) ? cardImages[card.name.toLowerCase()] : backCardImage;
        
        if (cardImg) {
            image(cardImg, x + offsetX, y, cardWidth, cardHeight);
        } else {
            // Fallback rectangle if image isn't loaded
            fill(255);
            rectMode(CENTER);
            rect(x + offsetX, y, cardWidth, cardHeight);
            // Draw card name for debugging
            fill(0);
            textSize(10);
            text(card.name, x + offsetX, y);
        }
        pop();
    });
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    // Redraw background
    clear();
    push();
    imageMode(CORNER);
    if (backgroundImage) {
        image(backgroundImage, 0, 0, windowWidth, windowHeight);
    } else {
        background(0, 100, 0);
    }
    pop();
}