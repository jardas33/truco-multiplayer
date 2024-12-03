// Create p5 instance in the game canvas div
window.p5Instance = new p5(function(p) {
    p.setup = function() {
        let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent('Game');
        
        // Store p5 instance globally for other files to use
        window.p = p;

        // Initialize game state if not already set
        if (typeof gameState === 'undefined') {
            gameState = gameStateEnum.Menu;
        }

        // Create menu elements
        menuDiv = p.select("#Menu");
        gameDiv = p.select("#Game");
        instructionsDiv = p.select("#Instructions");
        valuesDiv = p.select("#Values");

        // Create menu buttons
        startButton = p.createButton("Start Truco Game");
        startButton.style("position", "fixed");
        startButton.style("top", "50%");
        startButton.style("left", "50%");
        startButton.style("transform", "translate(-50%, -50%)");
        startButton.style("width", "200px");
        startButton.style("height", "60px");
        startButton.style("font-weight", "bold");
        startButton.mousePressed(startTrucoGame);
        startButton.parent(menuDiv);

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

        backToMainMenuButton = p.createButton("Back to Main Menu");
        backToMainMenuButton.position(20, 20);
        backToMainMenuButton.mousePressed(backToMainMenu);
        backToMainMenuButton.parent(gameDiv);

        // Create game buttons
        trucoButton = p.createButton("Truco");
        trucoButton.position(50, 180);
        trucoButton.mousePressed(truco);
        trucoButton.parent(gameDiv);
        trucoButton.hide();

        buttonAcceptTruco = p.createButton("Accept Truco");
        buttonRejectTruco = p.createButton("Reject Truco");
        buttonRaiseTruco = p.createButton("Raise Truco");

        buttonAcceptTruco.position(10, 180);
        buttonAcceptTruco.mousePressed(() => game.respondTruco(game.getCurrentPlayer(), 1));
        buttonRejectTruco.position(10, 210);
        buttonRejectTruco.mousePressed(() => game.respondTruco(game.getCurrentPlayer(), 2));
        buttonRaiseTruco.position(10, 240);
        buttonRaiseTruco.mousePressed(() => game.respondTruco(game.getCurrentPlayer(), 3));

        buttonAcceptTruco.parent(gameDiv);
        buttonRejectTruco.parent(gameDiv);
        buttonRaiseTruco.parent(gameDiv);

        buttonAcceptTruco.hide();
        buttonRejectTruco.hide();
        buttonRaiseTruco.hide();

        // Create popups
        popup = p.createDiv("");
        popup.hide();
        popup.position(p.windowWidth / 2 - 150, p.windowHeight / 2 - 100);
        popup.style("width", "300px");
        popup.style("height", `200px`);
        popup.style("background-image", 'url("Images/popup_frame.png")');
        popup.style("padding", "20px");
        popup.style("text-align", "center");
        popup.style("color", "white");
        popup.style("font-weight", "bold");
        popup.style("background-repeat", "no-repeat");
        popup.style("background-position", "center");
        popup.style("background-size", "cover");

        closeButton = p.createButton("Close");
        closeButton.mousePressed(closePopup);
        closeButton.parent(popup);
        closeButton.style("position", "absolute");
        closeButton.style("bottom", "10px");
        closeButton.style("left", "50%");
        closeButton.style("transform", "translateX(-50%)");

        messageParagrph = p.createP("");
        messageParagrph.style("margin", "0");
        messageParagrph.style("position", "absolute");
        messageParagrph.style("top", "50%");
        messageParagrph.style("left", "50%");
        messageParagrph.style("transform", "translate(-50%, -50%)");
        messageParagrph.parent(popup);

        // Setup player positions
        playerPositions = [
            {
                x: p.width / 6,
                y: p.height / 2,
                label: "Player 1 - Team 1",
                labelOffset: -50,
            },
            { 
                x: p.width / 2, 
                y: 100, 
                label: "Player 2 - Team 2", 
                labelOffset: -50 
            },
            {
                x: (5 * p.width) / 6,
                y: p.height / 2,
                label: "Player 3 - Team 1",
                labelOffset: -50,
            },
            {
                x: p.width / 2,
                y: p.height - cardHeight - 100,
                label: "Player 4 - Team 2",
                labelOffset: cardHeight + 20,
            },
        ];

        // Initialize socket.io connection
        socket = io();
        
        // Hide game elements initially
        gameDiv.style('display', 'none');
        instructionsDiv.style('display', 'none');
        valuesDiv.style('display', 'none');

        // Show menu elements
        menuDiv.style('display', 'block');
        
        // Setup socket event handlers
        setupSocketHandlers();
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
        
        // Update player positions
        if (playerPositions) {
            playerPositions[0].x = p.width / 6;
            playerPositions[0].y = p.height / 2;
            playerPositions[1].x = p.width / 2;
            playerPositions[1].y = 100;
            playerPositions[2].x = (5 * p.width) / 6;
            playerPositions[2].y = p.height / 2;
            playerPositions[3].x = p.width / 2;
            playerPositions[3].y = p.height - cardHeight - 100;
        }
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
  