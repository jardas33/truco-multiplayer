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