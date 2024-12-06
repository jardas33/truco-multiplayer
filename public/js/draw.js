function draw() {
    clear();
    
    // Draw background
    push();
    imageMode(CORNER);
    image(backgroundImage, 0, 0, width, height);
    pop();
    
    if (gameState === gameStateEnum.Menu) {
        menuDiv.show();
        gameDiv.hide();
        instructionsDiv.hide();
        valuesDiv.hide();
    }
    else if (gameState === gameStateEnum.Playing) {
        menuDiv.hide();
        gameDiv.show();
        instructionsDiv.hide();
        valuesDiv.hide();
        backToMainMenuButton.show();
        
        // Draw game table
        push();
        fill(0, 100, 0);
        noStroke();
        rect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);
        pop();
        
        if (window.game && window.game.players) {
            // Draw players and their cards
            window.game.players.forEach((player, index) => {
                const pos = playerPositions[index];
                
                // Draw player label
                fill(255);
                textSize(16);
                textAlign(CENTER);
                text(pos.label, pos.x, pos.y + pos.labelOffset);
                
                // Draw player's cards
                if (player.cards) {
                    drawPlayerCards(player, pos.x, pos.y);
                }
            });
        }
    }
}

function drawPlayerCards(player, x, y) {
    const cardWidth = 80;
    const cardHeight = 120;
    const cardSpacing = 30;
    
    player.cards.forEach((card, index) => {
        const offsetX = (index - player.cards.length / 2) * cardSpacing;
        push();
        imageMode(CENTER);
        
        // Show face-up cards only for player 1
        fill(255);
        rectMode(CENTER);
        rect(x + offsetX, y, cardWidth, cardHeight);
        
        // Draw card name for debugging
        fill(0);
        textSize(10);
        text(card.name, x + offsetX, y);
        
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