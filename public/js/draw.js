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
    }
    else if (gameState === gameStateEnum.Instructions) {
        menuDiv.hide();
        gameDiv.hide();
        instructionsDiv.show();
        valuesDiv.hide();
        
        push();
        // Draw the black box with golden border
        const boxWidth = 800;
        const boxHeight = 500;
        const boxX = width/2 - boxWidth/2;
        const boxY = height/2 - boxHeight/2;
        
        // Draw box background with opacity
        fill(0, 0, 0, 200);  // Black with 80% opacity
        stroke(218, 165, 32); // Golden color
        strokeWeight(3);
        rect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw title
        fill(218, 165, 32); // Golden color
        noStroke();
        textSize(32);
        textAlign(CENTER);
        text("Instructions of the game", width/2, boxY + 50);
        pop();
    }
    else if (gameState === gameStateEnum.CardValues) {
        menuDiv.hide();
        gameDiv.hide();
        instructionsDiv.hide();
        valuesDiv.show();
        
        // Draw golden box
        const boxWidth = 800;
        const boxHeight = 400;
        const boxX = width/2 - boxWidth/2;
        const boxY = height/2 - boxHeight/2;
        
        // Draw box background with opacity
        fill(0, 0, 0, 200);  // Black with 80% opacity
        stroke(218, 165, 32); // Golden color
        strokeWeight(3);
        rect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw title
        fill(218, 165, 32); // Golden color
        textSize(32);
        textAlign(CENTER);
        text("Card Values", width/2, boxY + 50);
        
        // Draw subtitle
        textSize(24);
        text("Card power from most powerful (1) to least powerful (17)", width/2, boxY + 90);
        
        // Draw two columns of card values
        textSize(18);
        textAlign(LEFT);
        const startY = boxY + 130;
        const lineHeight = 30;
        const leftColX = boxX + 50;
        const rightColX = boxX + boxWidth/2 + 50;
        
        const leftColumnEntries = [
            "Queen of diamonds",
            "Jack of clubs",
            "5 of clubs",
            "4 of clubs",
            "7 of hearts",
            "Ace of spades",
            "7 of diamonds",
            "All 3's",
            "All 2's"
        ];
        
        const rightColumnEntries = [
            "Remaining Aces",
            "All Kings",
            "Remaining Queens",
            "Remaining Jacks",
            "Remaining 7's",
            "All 6's",
            "Remaining 5's",
            "Remaining 4's"
        ];
        
        // Draw left column
        for(let i = 0; i < leftColumnEntries.length; i++) {
            fill(218, 165, 32);  // Gold color for numbers
            text((i + 1) + ".", leftColX, startY + lineHeight * i);
            fill(255);  // White color for text
            text(leftColumnEntries[i], leftColX + 25, startY + lineHeight * i);
        }
        
        // Draw right column
        for(let i = 0; i < rightColumnEntries.length; i++) {
            fill(218, 165, 32);  // Gold color for numbers
            text((i + 10) + ".", rightColX, startY + lineHeight * i);
            fill(255);  // White color for text
            text(rightColumnEntries[i], rightColX + 35, startY + lineHeight * i);
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