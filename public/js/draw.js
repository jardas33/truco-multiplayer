function drawGame(p) {
    if (!p) return;  // Exit if p5 instance is not available

    // Draw the game state
    if (gameState === gameStateEnum.Menu) {
        p.background(backgroundImage);
    } else if (gameState === gameStateEnum.Instructions) {
        drawInstructions(p);
    } else if (gameState === gameStateEnum.CardValues) {
        drawCardValues(p);
    } else if (gameState === gameStateEnum.Playing) {
        drawPlaying(p);
    }
}

function drawInstructions(p) {
    // Draw instructions background
    p.background(0, 100, 0);
    
    // Draw instructions image if available
    if (instructionsImage) {
        const imgWidth = Math.min(p.width * 0.8, 800);
        const imgHeight = imgWidth * (instructionsImage.height / instructionsImage.width);
        p.image(instructionsImage, p.width/2 - imgWidth/2, 150, imgWidth, imgHeight);
    }
}

function drawCardValues(p) {
    // Draw card values background
    p.background(0, 100, 0);
    p.fill(255);
    p.textSize(32);
    p.textAlign(p.CENTER, p.CENTER);
    p.text("Card Values", p.width/2, 50);
    
    // Draw card values
    p.textSize(16);
    p.textAlign(p.LEFT, p.TOP);
    let x = 50;
    let y = 100;
    let lineHeight = 25;
    
    // Sort cards by value
    const sortedCards = Object.entries(cardValues)
        .sort((a, b) => a[1] - b[1]);
    
    for (const [card, value] of sortedCards) {
        p.text(`${card}: ${value}`, x, y);
        y += lineHeight;
        
        // Create new column if reaching bottom of screen
        if (y > p.height - 50) {
            y = 100;
            x += p.width/3;
        }
    }
}

function drawPlaying(p) {
    if (!game) return;

    // Draw background
    p.background(0, 100, 0);

    // Draw player labels and cards
    for (let i = 0; i < players.length; i++) {
        let pos = playerPositions[i];
        
        // Draw player label
        p.fill(255);
        p.textAlign(p.CENTER);
        p.text(pos.label, pos.x, pos.y + pos.labelOffset);

        // Draw player's cards
        let player = players[i];
        if (player.hand) {
            for (let j = 0; j < player.hand.length; j++) {
                let card = player.hand[j];
                let cardX = pos.x + (j - 1) * cardSpacing;
                let cardY = pos.y;
                
                if (card.image) {
                    p.image(card.image, cardX, cardY, cardWidth, cardHeight);
                } else if (i !== selfPlayer - 1) {
                    // Draw card back for other players
                    p.image(backCardImage, cardX, cardY, cardWidth, cardHeight);
                }
            }
        }
    }

    // Draw played cards
    if (playedCards) {
        for (let played of playedCards) {
            if (played.card && played.card.image) {
                p.image(
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