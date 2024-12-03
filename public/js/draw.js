function draw() {
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
    // Draw background image
    background(backgroundImage);
    
    // Draw instructions image if available
    if (instructionsImage) {
        const imgWidth = Math.min(width * 0.8, 800);
        const imgHeight = imgWidth * (instructionsImage.height / instructionsImage.width);
        image(instructionsImage, width/2 - imgWidth/2, 150, imgWidth, imgHeight);
    }
}

function drawCardValues() {
    // Draw background image
    background(backgroundImage);
    
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
    
    // Numbers in gold color
    fill(218, 165, 32);
    // Left column numbers
    for(let i = 1; i <= 9; i++) {
        text(i + ".", leftColX, startY + lineHeight * (i-1));
    }
    // Right column numbers
    for(let i = 10; i <= 17; i++) {
        text(i + ".", rightColX, startY + lineHeight * (i-10));
    }
    
    // Card names in white
    fill(255);
    // Left column card names
    text("Queen of diamonds", leftColX + 25, startY);
    text("Jack of clubs", leftColX + 25, startY + lineHeight);
    text("5 of clubs", leftColX + 25, startY + lineHeight * 2);
    text("4 of clubs", leftColX + 25, startY + lineHeight * 3);
    text("7 of hearts", leftColX + 25, startY + lineHeight * 4);
    text("Ace of spades", leftColX + 25, startY + lineHeight * 5);
    text("7 of diamonds", leftColX + 25, startY + lineHeight * 6);
    text("All 3's", leftColX + 25, startY + lineHeight * 7);
    text("All 2's", leftColX + 25, startY + lineHeight * 8);
    
    // Right column card names
    text("Remaining Aces", rightColX + 35, startY);
    text("All Kings", rightColX + 35, startY + lineHeight);
    text("Remaining Queens", rightColX + 35, startY + lineHeight * 2);
    text("Remaining Jacks", rightColX + 35, startY + lineHeight * 3);
    text("Remaining 7's", rightColX + 35, startY + lineHeight * 4);
    text("All 6's", rightColX + 35, startY + lineHeight * 5);
    text("Remaining 5's", rightColX + 35, startY + lineHeight * 6);
    text("Remaining 4's", rightColX + 35, startY + lineHeight * 7);
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