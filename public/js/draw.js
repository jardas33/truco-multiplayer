function draw() {
    clear();
    background(0, 100, 0);  // Green background as fallback
    
    if (backgroundImage) {
        push();
        imageMode(CORNER);
        image(backgroundImage, 0, 0, width, height);
        pop();
    }

    switch(gameState) {
        case gameStateEnum.Menu:
            menuDiv.show();
            gameDiv.hide();
            instructionsDiv.hide();
            valuesDiv.hide();
            break;
            
        case gameStateEnum.Playing:
            menuDiv.hide();
            gameDiv.show();
            instructionsDiv.hide();
            valuesDiv.hide();
            
            // Draw game table
            push();
            fill(0, 80, 0);
            noStroke();
            rect(100, 100, width - 200, height - 200);
            pop();
            
            // Debug text
            fill(255);
            textSize(32);
            textAlign(CENTER, CENTER);
            text('Game State: ' + gameState, width/2, 50);
            
            if (window.game && window.game.players) {
                window.game.players.forEach((player, index) => {
                    const pos = playerPositions[index];
                    if (pos) {
                        // Draw player label
                        fill(255);
                        textSize(16);
                        textAlign(CENTER);
                        text(pos.label, pos.x, pos.y + pos.labelOffset);
                        
                        // Draw placeholder card
                        fill(255);
                        rectMode(CENTER);
                        rect(pos.x, pos.y, 80, 120);
                    }
                });
            }
            break;
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