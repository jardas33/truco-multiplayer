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
            const menuButtons = p.createDiv('');
            menuButtons.class('menu-buttons');
            menuButtons.parent('menuContainer');

            // Back to Menu button
            const backToMenuBtn = p.createButton("Back to Main Menu");
            backToMenuBtn.class('menu-btn');
            backToMenuBtn.parent(menuButtons);
            backToMenuBtn.mousePressed(backToMainMenu);

            // Card Values button
            const cardValuesBtn = p.createButton("Card Values");
            cardValuesBtn.class('menu-btn');
            cardValuesBtn.parent(menuButtons);
            cardValuesBtn.mousePressed(showCardValues);

            // Instructions button
            const instructionsBtn = p.createButton("Instructions");
            instructionsBtn.class('menu-btn');
            instructionsBtn.parent(menuButtons);
            instructionsBtn.mousePressed(showInstructions);

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
    p.fill(255);
    p.textSize(32);
    p.textAlign(p.CENTER, p.CENTER);
    p.text("Instructions", p.width/2, 100);
    
    // Draw instructions image if available
    if (instructionsImage) {
        const imgWidth = Math.min(p.width * 0.8, 800);
        const imgHeight = imgWidth * (instructionsImage.height / instructionsImage.width);
        p.image(instructionsImage, p.width/2 - imgWidth/2, 150, imgWidth, imgHeight);
    } else {
        p.textSize(16);
        p.text("Instructions image not loaded", p.width/2, p.height/2);
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
    
    for (let card in cardValues) {
        p.text(`${card}: ${cardValues[card]}`, x, y);
        y += lineHeight;
        
        // Create new column if reaching bottom of screen
        if (y > p.height - 50) {
            y = 100;
            x += p.width/3;
        }
    }
}
  