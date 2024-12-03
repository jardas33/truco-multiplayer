// Create p5 instance in the game canvas div
window.p5Instance = new p5(function(p) {
    p.setup = function() {
        let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent('gameCanvas');
        
        // Store p5 instance globally for other files to use
        window.p = p;

        // Create menu buttons
        const backToMenuBtn = p.createButton("Back to Main Menu");
        backToMenuBtn.class('menu-btn');
        backToMenuBtn.mousePressed(() => {
            console.log("Back to menu clicked");
            gameState = gameStateEnum.Menu;
            if (window.game) {
                delete window.game;
            }
        });

        const cardValuesBtn = p.createButton("Card Values");
        cardValuesBtn.class('menu-btn');
        cardValuesBtn.mousePressed(() => {
            console.log("Card values clicked");
            previousGameState = gameState;
            gameState = gameStateEnum.CardValues;
        });

        const instructionsBtn = p.createButton("Instructions");
        instructionsBtn.class('menu-btn');
        instructionsBtn.mousePressed(() => {
            console.log("Instructions clicked");
            previousGameState = gameState;
            gameState = gameStateEnum.Instructions;
        });

        // Create start game button
        startButton = p.createButton("Start Truco Game");
        startButton.class('start-btn');
        startButton.mousePressed(() => {
            console.log("Start game clicked");
            startTrucoGame();
            startButton.hide();
        });

        // Position buttons
        const buttonContainer = p.createDiv('');
        buttonContainer.class('button-container');
        buttonContainer.child(backToMenuBtn);
        buttonContainer.child(cardValuesBtn);
        buttonContainer.child(instructionsBtn);
        buttonContainer.child(startButton);
        buttonContainer.parent('gameCanvas');
    };

    p.draw = function() {
        p.background(51);
        if (typeof drawGame === 'function') {
            drawGame(p);
        }
    };

    p.windowResized = function() {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
    };
});
  