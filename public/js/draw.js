function draw() {
    if (gameState === gameStateEnum.Menu) {
        background(backgroundImage);
        
        menuDiv.show();
        gameDiv.hide();
        instructionsDiv.hide();
        valuesDiv.hide();
        
        buttonAcceptTruco.hide();
        buttonRejectTruco.hide();
        buttonRaiseTruco.hide();
    }
    else if (gameState === gameStateEnum.Instructions) {
        background(backgroundImage);
        
        // Draw instructions box
        fill(0, 0, 0, 200);
        rect(width/2 - 400, height/2 - 300, 800, 600);
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(32);
        text("Instructions", width/2, height/2 - 250);
        textSize(20);
        text("1. Each player receives 3 cards", width/2, height/2 - 180);
        text("2. Players take turns playing one card at a time", width/2, height/2 - 140);
        text("3. The highest card wins each round", width/2, height/2 - 100);
        text("4. Win 2 rounds to win the hand", width/2, height/2 - 60);
        text("5. First team to 12 points wins the game", width/2, height/2 - 20);
        text("6. You can call Truco to raise the stakes", width/2, height/2 + 20);
        text("7. Opponent can accept, reject, or raise", width/2, height/2 + 60);
        
        menuDiv.hide();
        gameDiv.hide();
        instructionsDiv.show();
        valuesDiv.hide();
    }
    else if (gameState === gameStateEnum.CardValues) {
        background(backgroundImage);
        
        // Draw card values box
        fill(0, 0, 0, 200);
        rect(width/2 - 400, height/2 - 300, 800, 600);
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(32);
        text("Card Values (Strongest to Weakest)", width/2, height/2 - 250);
        textSize(18);
        let valueText = [
            "1. Four of Clubs (Zap)",
            "2. Seven of Hearts (Copas)",
            "3. Ace of Spades (Espadilha)",
            "4. Seven of Diamonds (Pica Fumo)",
            "5. All Three's",
            "6. All Two's",
            "7. All Aces (except Spades)",
            "8. All Kings",
            "9. All Jacks",
            "10. All Queens",
            "11. All Seven's (except Hearts/Diamonds)",
            "12. All Six's",
            "13. All Five's",
            "14. All Four's (except Clubs)"
        ];
        for (let i = 0; i < valueText.length; i++) {
            text(valueText[i], width/2, height/2 - 180 + (i * 30));
        }
        
        menuDiv.hide();
        gameDiv.hide();
        instructionsDiv.hide();
        valuesDiv.show();
    }
    else if (gameState === gameStateEnum.Playing) {
        background(backgroundImage);
        
        menuDiv.hide();
        gameDiv.show();
        instructionsDiv.hide();
        valuesDiv.hide();
        backToMainMenuButton.show();
        
        if (window.game) {
            // Draw game state
            drawGameState();
        }
    }
}