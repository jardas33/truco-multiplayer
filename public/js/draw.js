function draw() {
    // Clear the canvas at the start of each frame
    clear();
    
    // Draw background
    push();
    imageMode(CORNER);
    image(backgroundImage, 0, 0, width, height);
    pop();
    
    // Draw based on game state
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
        
        // Draw game table
        push();
        fill(0, 100, 0);
        noStroke();
        rect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);
        pop();
        
        // Draw test text to verify rendering
        fill(255);
        textSize(32);
        textAlign(CENTER, CENTER);
        text("Game State: Playing", width/2, 50);
        
        if (window.game && window.game.players) {
            // Draw player positions
            window.game.players.forEach((player, index) => {
                const pos = playerPositions[index];
                fill(255);
                textSize(16);
                text(`Player ${index + 1}`, pos.x, pos.y + pos.labelOffset);
                
                // Draw a white rectangle to represent cards
                fill(255);
                rectMode(CENTER);
                rect(pos.x, pos.y, 80, 120);
            });
        }
    }
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