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
            // Create menu buttons
            const buttonContainer = p.createDiv('');
            buttonContainer.id('menuButtons');
            buttonContainer.style('position', 'fixed');
            buttonContainer.style('top', '20px');
            buttonContainer.style('left', '50%');
            buttonContainer.style('transform', 'translateX(-50%)');
            buttonContainer.style('display', 'flex');
            buttonContainer.style('gap', '20px');
            buttonContainer.style('z-index', '1000');
            buttonContainer.parent('gameContainer');

            const backToMenuBtn = p.createButton("Back to Main Menu");
            backToMenuBtn.class('menu-btn');
            backToMenuBtn.parent(buttonContainer);
            backToMenuBtn.mousePressed(() => {
                console.log("Back to menu clicked");
                gameState = gameStateEnum.Menu;
                if (window.game) {
                    delete window.game;
                }
            });

            const cardValuesBtn = p.createButton("Card Values");
            cardValuesBtn.class('menu-btn');
            cardValuesBtn.parent(buttonContainer);
            cardValuesBtn.mousePressed(() => {
                console.log("Card values clicked");
                previousGameState = gameState;
                gameState = gameStateEnum.CardValues;
            });

            const instructionsBtn = p.createButton("Instructions");
            instructionsBtn.class('menu-btn');
            instructionsBtn.parent(buttonContainer);
            instructionsBtn.mousePressed(() => {
                console.log("Instructions clicked");
                previousGameState = gameState;
                gameState = gameStateEnum.Instructions;
            });

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
    
    // Add instruction text
    p.textSize(16);
    p.text("Game instructions will be displayed here", p.width/2, p.height/2);
}

function drawCardValues(p) {
    // Draw card values background
    p.background(0, 100, 0);
    p.fill(255);
    p.textSize(32);
    p.textAlign(p.CENTER, p.CENTER);
    p.text("Card Values", p.width/2, 100);
    
    // Add card values text
    p.textSize(16);
    p.text("Card values will be displayed here", p.width/2, p.height/2);
}
  