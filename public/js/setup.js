function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('Game');

    // Initialize game state if not already set
    if (typeof gameState === 'undefined') {
        gameState = gameStateEnum.Menu;
    }

    // Create menu elements
    menuDiv = select("#Menu");
    gameDiv = select("#Game");
    instructionsDiv = select("#Instructions");
    valuesDiv = select("#Values");

    // Create menu buttons
    startButton = createButton("Start Truco Game");
    startButton.style("position", "fixed");
    startButton.style("top", "50%");
    startButton.style("left", "50%");
    startButton.style("transform", "translate(-50%, -50%)");
    startButton.style("width", "200px");
    startButton.style("height", "60px");
    startButton.style("font-weight", "bold");
    startButton.mousePressed(startTrucoGame);
    startButton.parent(menuDiv);

    // Create instruction buttons
    instructionsButton = createButton("Instructions");
    instructionsButton.position(20, 20);
    instructionsButton.mousePressed(showInstructions);
    instructionsButton.parent(menuDiv);
    
    instructionsButton = createButton("Instructions");
    instructionsButton.position(20, 80);
    instructionsButton.mousePressed(showInstructions);
    instructionsButton.parent(gameDiv);

    // Create card values buttons
    cardValuesButton = createButton("Card Values");
    cardValuesButton.position(20, 60);
    cardValuesButton.mousePressed(showCardValues);
    cardValuesButton.parent(menuDiv);
    
    cardValuesButton = createButton("Card Values");
    cardValuesButton.position(20, 120);
    cardValuesButton.mousePressed(showCardValues);
    cardValuesButton.parent(gameDiv);

    // Create back to menu button
    backToMainMenuButton = createButton("Back to Main Menu");
    backToMainMenuButton.position(20, 20);
    backToMainMenuButton.mousePressed(backToMainMenu);
    backToMainMenuButton.parent(gameDiv);

    // Create game buttons
    trucoButton = createButton("Truco");
    trucoButton.position(50, 180);
    trucoButton.mousePressed(truco);
    trucoButton.parent(gameDiv);
    trucoButton.hide();

    // Create truco response buttons
    buttonAcceptTruco = createButton("Accept Truco");
    buttonRejectTruco = createButton("Reject Truco");
    buttonRaiseTruco = createButton("Raise Truco");

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

    // Create popup
    popup = createDiv("");
    popup.hide();
    popup.position(windowWidth / 2 - 150, windowHeight / 2 - 100);
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

    closeButton = createButton("Close");
    closeButton.mousePressed(closePopup);
    closeButton.parent(popup);
    closeButton.style("position", "absolute");
    closeButton.style("bottom", "10px");
    closeButton.style("left", "50%");
    closeButton.style("transform", "translateX(-50%)");

    messageParagrph = createP("");
    messageParagrph.style("margin", "0");
    messageParagrph.style("position", "absolute");
    messageParagrph.style("top", "50%");
    messageParagrph.style("left", "50%");
    messageParagrph.style("transform", "translate(-50%, -50%)");
    messageParagrph.parent(popup);

    // Setup player positions
    playerPositions = [
        {
            x: width / 6,
            y: height / 2,
            label: "Player 1 - Team 1",
            labelOffset: -50,
        },
        { 
            x: width / 2, 
            y: 100, 
            label: "Player 2 - Team 2", 
            labelOffset: -50 
        },
        {
            x: (5 * width) / 6,
            y: height / 2,
            label: "Player 3 - Team 1",
            labelOffset: -50,
        },
        {
            x: width / 2,
            y: height - cardHeight - 100,
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
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    
    // Update player positions
    if (playerPositions) {
        playerPositions[0].x = width / 6;
        playerPositions[0].y = height / 2;
        playerPositions[1].x = width / 2;
        playerPositions[1].y = 100;
        playerPositions[2].x = (5 * width) / 6;
        playerPositions[2].y = height / 2;
        playerPositions[3].x = width / 2;
        playerPositions[3].y = height - cardHeight - 100;
    }
}
  