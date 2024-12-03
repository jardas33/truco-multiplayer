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
    fill(255);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("Card Values", width/2, 50);
    
    // Draw card values
    textSize(16);
    textAlign(LEFT, TOP);
    let x = 50;
    let y = 100;
    let lineHeight = 25;
    
    // Sort cards by value
    const sortedCards = Object.entries(cardValues)
        .sort((a, b) => a[1] - b[1]);
    
    for (const [card, value] of sortedCards) {
        text(`${card}: ${value}`, x, y);
        y += lineHeight;
        
        // Create new column if reaching bottom of screen
        if (y > height - 50) {
            y = 100;
            x += width/3;
        }
    }
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