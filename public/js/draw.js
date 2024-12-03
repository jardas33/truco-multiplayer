function draw() {
    clear();  // Clear the canvas at the start of each frame
    // Draw the game state
    if (gameState === gameStateEnum.Menu) {
        background(backgroundImage);
    } else if (gameState === gameStateEnum.Instructions) {
        drawInstructions();
    } else if (gameState === gameStateEnum.CardValues) {
        drawCardValues();
    } else if (gameState === gameStateEnum.Playing) {
        drawPlaying();
    }
}

function drawInstructions() {
    // Clear and draw background image
    clear();
    background(backgroundImage);
    
    // Draw instructions image if available
    if (instructionsImage) {
        push();  // Save the current drawing state
        const imgWidth = Math.min(width * 0.8, 800);
        const imgHeight = imgWidth * (instructionsImage.height / instructionsImage.width);
        image(instructionsImage, width/2 - imgWidth/2, 150, imgWidth, imgHeight);
        pop();  // Restore the drawing state
    }
}

function drawCardValues() {
    // Clear and draw background image
    clear();
    background(backgroundImage);
    
    push();  // Save the current drawing state
    
    // Draw title
    fill(255);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("Card Values", width/2, 50);
    
    // Draw golden box
    const boxWidth = 800;
    const boxHeight = 400;
    const boxX = width/2 - boxWidth/2;
    const boxY = height/2 - boxHeight/2;
    
    // Draw box background with opacity
    fill(0, 0, 0, 200);  // Black with 80% opacity
    stroke(218, 165, 32);
    strokeWeight(3);
    rect(boxX, boxY, boxWidth, boxHeight);
    
    // Draw title inside box
    fill(218, 165, 32);
    textSize(24);
    textAlign(CENTER);
    text("Card power from most powerful (1) to least powerful (17)", width/2, boxY + 40);
    
    // Draw two columns of card values
    textSize(18);
    textAlign(LEFT);
    const startY = boxY + 80;
    const lineHeight = 30;
    const leftColX = boxX + 50;
    const rightColX = boxX + boxWidth/2 + 50;
    
    // Draw each entry with number and text together
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
    
    pop();  // Restore the drawing state
}

function drawPlaying() {
    if (!game) return;

    // Draw background
    background(0, 100, 0);
    if (backgroundImage) {
        image(backgroundImage, 0, 0, width, height);
    }

    // Draw player labels and cards
    for (let i = 0; i < players.length; i++) {
        let pos = playerPositions[i];
        
        // Draw player label
        fill(255);
        textAlign(CENTER);
        text(pos.label, pos.x, pos.y + pos.labelOffset);

        // Draw player's cards
        let player = players[i];
        if (player.hand) {
            for (let j = 0; j < player.hand.length; j++) {
                let card = player.hand[j];
                let cardX = pos.x + (j - 1) * cardSpacing;
                let cardY = pos.y;
                
                if (card.image) {
                    image(card.image, cardX, cardY, cardWidth, cardHeight);
                } else if (i !== selfPlayer - 1) {
                    // Draw card back for other players
                    if (backCardImage) {
                        image(backCardImage, cardX, cardY, cardWidth, cardHeight);
                    }
                }
            }
        }
    }

    // Draw played cards
    if (playedCards) {
        for (let played of playedCards) {
            if (played.card && played.card.image) {
                image(
                    played.card.image,
                    played.position.x,
                    played.position.y,
                    cardWidth,
                    cardHeight
                );
            }
        }
    }
}