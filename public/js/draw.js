function draw() {
    // Clear the canvas at the start of each frame
    clear();
    
    // Draw background for all states
    push();
    imageMode(CORNER);
    image(backgroundImage, 0, 0, width, height);
    pop();
    
    if (gameState === gameStateEnum.Playing) {
        console.log("In Playing state");
        menuDiv.hide();
        gameDiv.show();
        instructionsDiv.hide();
        valuesDiv.hide();
        backToMainMenuButton.show();
        
        if (window.game) {
            console.log("Drawing game state");
            console.log("Current game:", window.game);
            console.log("Players:", window.game.players);
            try {
                drawGameState();
            } catch (error) {
                console.error("Error in drawGameState:", error);
            }
        } else {
            console.error("Game not initialized in draw");
        }
    }
    // ... rest of the states ...
}

function drawGameState() {
    // Draw game table
    push();
    fill(0, 100, 0, 200);
    noStroke();
    rect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);
    pop();

    // Draw players and their cards
    if (window.game.players) {
        window.game.players.forEach((player, index) => {
            console.log(`Drawing player ${index}:`, player);
            const position = playerPositions[index];
            console.log(`Position for player ${index}:`, position);

            // Draw player label
            fill(255);
            noStroke();
            textAlign(CENTER);
            text(position.label, position.x, position.y + position.labelOffset);
            
            // Draw player's cards
            if (player.cards) {
                console.log(`Drawing cards for player ${index}:`, player.cards);
                drawPlayerCards(player, position.x, position.y);
            }
        });
    }
}

function drawPlayerCards(player, x, y) {
    console.log("Drawing cards for player:", player);
    console.log("At position:", x, y);
    console.log("Available card images:", Object.keys(cardImages));

    const cardWidth = 80;
    const cardHeight = 120;
    const cardSpacing = 30;
    
    player.cards.forEach((card, index) => {
        console.log(`Drawing card ${index}:`, card);
        const offsetX = (index - player.cards.length / 2) * cardSpacing;
        
        push();
        imageMode(CENTER);
        
        // Show face-up cards only for player 1
        const cardName = card.name.toLowerCase();
        console.log("Looking for card image:", cardName);
        const cardImg = (player.id === 1) ? cardImages[cardName] : backCardImage;
        console.log("Card image found:", !!cardImg);
        
        if (cardImg) {
            image(cardImg, x + offsetX, y, cardWidth, cardHeight);
        } else {
            // Fallback rectangle if image isn't loaded
            fill(255);
            rectMode(CENTER);
            rect(x + offsetX, y, cardWidth, cardHeight);
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