function drawGame(p) {
    if (!p) return;  // Exit if p5 instance is not available

    // Clear the background
    p.background(51);

    // Draw the game state
    if (gameState === gameStateEnum.Menu) {
        drawMenu(p);
    } else if (gameState === gameStateEnum.Instructions) {
        drawInstructions(p);
    } else if (gameState === gameStateEnum.CardValues) {
        drawCardValues(p);
    } else if (gameState === gameStateEnum.Playing) {
        drawPlaying(p);
    }
}

function drawMenu(p) {
    // Menu drawing code
}

function drawInstructions(p) {
    // Instructions drawing code
}

function drawCardValues(p) {
    // Card values drawing code
}

function drawPlaying(p) {
    if (!game) return;

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