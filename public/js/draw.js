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
        
        // Draw the black box with golden border
        const boxWidth = 800;
        const boxHeight = 600; // Increased height to fit all text
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
        text("Instructions of the game", width/2, boxY + 50);
        
        // Draw instructions text
        fill(255);
        textSize(18);
        textAlign(LEFT);
        textLeading(28);  // Increased line spacing for better readability
        
        const textX = boxX + 30;
        let textY = boxY + 100;
        const instructions = [
            "Welcome to Truco! Here's how to play:",
            "",
            "Basic Rules:",
            "• Each player receives 3 cards at the start of each hand",
            "• Players take turns playing one card at a time",
            "• The highest value card wins each round",
            "• Win 2 out of 3 rounds to win the hand",
            "• First team to 12 points wins the game",
            "",
            "Truco Calls:",
            "• During your turn, you can call 'Truco' to raise the stakes",
            "• When Truco is called, the opponent can:",
            "  - Accept: Game continues with higher stakes (3 points)",
            "  - Reject: Current hand ends, caller wins 1 point",
            "  - Raise: Increase stakes further (6, 9, or 12 points)",
            "",
            "Special Rules:",
            "• Game of Eleven: When a team reaches 11 points, they can see their",
            "  partner's cards before deciding to play (worth 3 points) or fold",
            "• Card values are unique in Truco - check the Card Values menu",
            "  to see the full ranking",
            "",
            "Team Play:",
            "• Play in teams of 2 (sitting across from each other)",
            "• Communicate with your partner through card plays",
            "• Work together to win rounds and score points"
        ];
        
        for (let line of instructions) {
            text(line, textX, textY, boxWidth - 60);
            textY += line === "" ? 20 : textLeading() * 1.2;
        }
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