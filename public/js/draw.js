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
        
        push(); // Save current drawing state
        
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
        
        // Draw instructions text
        fill(255); // White color
        textSize(16);
        textAlign(LEFT);
        textLeading(24);  // Line spacing
        
        const textX = boxX + 30;
        let textY = boxY + 100;
        const instructions = [
            "Truco is a fun game designed to be played by an even number of players, played in teams of 2v2 or 3v3. Each Truco match is composed of multiple sets, where each set equals twelve games, and each game consists of three rounds.",
            "",
            "In each round, every player plays one card. The team that wins two out of three rounds wins the game. The team that wins twelve games first wins the set.",
            "",
            "The order of turns is clockwise, with the first player in each round being the one who played the highest card in the previous round, or in case of a tie, the one who played first in the previous round.",
            "",
            "The game features the 'truco' mechanic. During their turn, a player can choose to call 'truco', which increases the value of the current game if accepted. The next player can then choose to accept, reject, or raise the value further. If truco is rejected, the game ends immediately, and the team that called 'truco' wins the game at its current value. If accepted, the game goes on but it is now worth 3 games instead of 1. The next player can also raise to 6, then the decision goes back to the player that initially called truco and he has the same options: accept, reject and raise. A game can only be risen to 12 games. It is not possible to raise after that.",
            "",
            "Once a team has won eleven games within a set, the 'Game of Eleven' rule comes into effect. The team can view their cards and their partner's cards before deciding whether to play the next game. If they decide to play, the game's value is increased to three. If they reject, the opposing team wins one game instantly.",
            "",
            "Truco is played with a 40 card deck, with a specific order of card values that you can see in the card values instructions."
        ];
        
        for (let line of instructions) {
            text(line, textX, textY, boxWidth - 60);
            textY += line === "" ? 20 : textLeading() * (line.length / 70 + 1);
        }
        
        pop(); // Restore drawing state
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