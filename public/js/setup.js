// Create p5 instance in the game canvas div
window.p5Instance = new p5(function(p) {
    p.setup = function() {
        let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent('gameCanvas');
        
        // Store p5 instance globally for other files to use
        window.p = p;

        // Initialize game state if not already set
        if (typeof gameState === 'undefined') {
            gameState = gameStateEnum.Menu;
        }

        // Create menu buttons only if they don't exist
        if (!window.menuInitialized) {
            // Create menu buttons container
            const menuButtons = document.querySelector('.menu-buttons');
            if (!menuButtons) return;

            // Back to Menu button
            const backToMenuBtn = document.getElementById('backToMenuBtn');
            if (backToMenuBtn) {
                backToMenuBtn.onclick = backToMainMenu;
            }

            // Card Values button
            const cardValuesBtn = document.getElementById('cardValuesBtn');
            if (cardValuesBtn) {
                cardValuesBtn.onclick = showCardValues;
            }

            // Instructions button
            const instructionsBtn = document.getElementById('instructionsBtn');
            if (instructionsBtn) {
                instructionsBtn.onclick = showInstructions;
            }

            // Start Game button
            const startGameBtn = document.getElementById('startGameBtn');
            if (startGameBtn) {
                startGameBtn.onclick = () => {
                    console.log("Start game clicked");
                    startTrucoGame();
                };
            }

            window.menuInitialized = true;
        }
    };

    p.draw = function() {
        // Clear the background with a dark green color
        p.background(0, 100, 0);
        
        // Draw game state
        switch (gameState) {
            case gameStateEnum.Menu:
                drawMenu(p);
                break;
            case gameStateEnum.Playing:
                if (typeof drawGame === 'function') {
                    drawGame(p);
                }
                break;
            case gameStateEnum.Instructions:
                drawInstructions(p);
                break;
            case gameStateEnum.CardValues:
                drawCardValues(p);
                break;
        }
    };

    p.windowResized = function() {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
    };
});

function drawMenu(p) {
    // Menu state drawing code
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
  