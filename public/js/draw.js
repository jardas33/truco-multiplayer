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
    // Draw instructions background
    background(0, 100, 0);
    
    // Draw instructions image if available
    if (instructionsImage) {
        const imgWidth = Math.min(width * 0.8, 800);
        const imgHeight = imgWidth * (instructionsImage.height / instructionsImage.width);
        image(instructionsImage, width/2 - imgWidth/2, 150, imgWidth, imgHeight);
    }
}

function drawCardValues() {
    // Draw card values background
    background(0, 100, 0);
    
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
    
    // Draw box background
    fill(0);
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
    
    fill(255);
    // Left column (1-9)
    text("1. Queen of diamonds", leftColX, startY);
    text("2. Jack of clubs", leftColX, startY + lineHeight);
    text("3. 5 of clubs", leftColX, startY + lineHeight * 2);
    text("4. 4 of clubs", leftColX, startY + lineHeight * 3);
    text("5. 7 of hearts", leftColX, startY + lineHeight * 4);
    text("6. Ace of spades", leftColX, startY + lineHeight * 5);
    text("7. 7 of diamonds", leftColX, startY + lineHeight * 6);
    text("8. All 3's", leftColX, startY + lineHeight * 7);
    text("9. All 2's", leftColX, startY + lineHeight * 8);
    
    // Right column (10-17)
    text("10. Remaining Aces", rightColX, startY);
    text("11. All Kings", rightColX, startY + lineHeight);
    text("12. Remaining Queens", rightColX, startY + lineHeight * 2);
    text("13. Remaining Jacks", rightColX, startY + lineHeight * 3);
    text("14. Remaining 7's", rightColX, startY + lineHeight * 4);
    text("15. All 6's", rightColX, startY + lineHeight * 5);
    text("16. Remaining 5's", rightColX, startY + lineHeight * 6);
    text("17. Remaining 4's", rightColX, startY + lineHeight * 7);
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