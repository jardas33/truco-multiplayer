// Create p5 instance in the game canvas div
window.p5Instance = new p5(function(p) {
    p.setup = function() {
        let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent('gameCanvas');
        
        // Store p5 instance globally for other files to use
        window.p = p;
        
        menuDiv = p.select("#Menu");
        gameDiv = p.select("#Game");
        instructionsDiv = p.select("#Instructions");
        valuesDiv = p.select("#Values");

        startButton = p.createButton("Start Truco Game");
        startButton.style("position", "fixed");
        startButton.style("top", "50%");
        startButton.style("left", "50%");
        startButton.style("transform", "translate(-50%, -50%)");
        startButton.style("width", "200px");
        startButton.style("height", "60px");
        startButton.style("font-weight", "bold");
        startButton.mousePressed(() => {
            startTrucoGame();
            startButton.hide();
        });
        startButton.parent('gameCanvas');

        instructionsButton = p.createButton("Instructions");
        instructionsButton.position(20, 20);
        instructionsButton.mousePressed(showInstructions);
        instructionsButton.parent(menuDiv);
        
        instructionsButton = p.createButton("Instructions");
        instructionsButton.position(20, 80);
        instructionsButton.mousePressed(showInstructions);
        instructionsButton.parent(gameDiv);

        cardValuesButton = p.createButton("Card Values");
        cardValuesButton.position(20, 60);
        cardValuesButton.mousePressed(showCardValues);
        cardValuesButton.parent(menuDiv);
        
        cardValuesButton = p.createButton("Card Values");
        cardValuesButton.position(20, 120);
        cardValuesButton.mousePressed(showCardValues);
        cardValuesButton.parent(gameDiv);

        // Create the back to main menu button
        backToMainMenuButton = p.createButton("Back to Main Menu");
        backToMainMenuButton.position(20, 20);
        backToMainMenuButton.mousePressed(backToMainMenu);
        backToMainMenuButton.parent(gameDiv);

        // Initialize game elements
        if (typeof initializeGameElements === 'function') {
            initializeGameElements(p);
        }
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
  