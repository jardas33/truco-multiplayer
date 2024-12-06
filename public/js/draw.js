function draw() {
    // Basic debug info
    console.log("Draw called, gameState:", gameState);
    
    clear();
    background(0, 100, 0);  // Fallback green background
    
    // Draw background image if available
    if (backgroundImage) {
        push();
        imageMode(CORNER);
        image(backgroundImage, 0, 0, width, height);
        pop();
    }

    // Debug text
    fill(255);
    textSize(24);
    textAlign(CENTER, CENTER);
    text(`Current State: ${gameState}`, width/2, 30);

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
        
        // Draw simple game table
        push();
        fill(0, 80, 0);
        noStroke();
        rect(100, 100, width - 200, height - 200);
        pop();
        
        // Draw debug info
        fill(255);
        text("Game Active", width/2, 60);
        
        if (window.game && window.game.players) {
            text(`Players: ${window.game.players.length}`, width/2, 90);
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