function setup() {
    // Create canvas for both single and multiplayer modes
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('Game');
    
    // Set text properties
    textAlign(CENTER, CENTER);
    textSize(24);
    fill(255);
    stroke(0);
    strokeWeight(2);
    
    // Initialize game state if not already set
    if (typeof gameState === 'undefined') {
        gameState = gameStateEnum.Menu;
    }
    
    // Get all the div containers
    menuDiv = select("#Menu");
    gameDiv = select("#Game");
    instructionsDiv = select("#Instructions");
    valuesDiv = select("#Values");
    
    // Initially show only menu
    menuDiv.class('active');
    gameDiv.removeClass('active');
    instructionsDiv.removeClass('active');
    valuesDiv.removeClass('active');
    
    // Create instruction buttons
    instructionsButton = createButton("Instructions");
    instructionsButton.position(20, 20);
    instructionsButton.mousePressed(showInstructions);
    instructionsButton.parent('Menu');
    
    // Create card values button
    cardValuesButton = createButton("Card Values");
    cardValuesButton.position(20, 60);
    cardValuesButton.mousePressed(showCardValues);
    cardValuesButton.parent('Menu');
    
    // Create close buttons
    instructionsCloseButton = createButton("Close");
    instructionsCloseButton.mousePressed(closeInstructions);
    instructionsCloseButton.parent(instructionsDiv);
    instructionsCloseButton.style("position", "absolute");
    instructionsCloseButton.style("bottom", "10px");
    instructionsCloseButton.style("left", "50%");
    instructionsCloseButton.style("transform", "translateX(-50%)");
    instructionsCloseButton.style("background-color", "darkgreen");
    instructionsCloseButton.style("color", "white");
    instructionsCloseButton.style("border", "2px solid gold");
    instructionsCloseButton.style("padding", "10px 20px");
    instructionsCloseButton.style("border-radius", "5px");
    instructionsCloseButton.style("cursor", "pointer");
    instructionsCloseButton.style("font-size", "16px");
    
    cardValuesCloseButton = createButton("Close");
    cardValuesCloseButton.mousePressed(closeCardValues);
    cardValuesCloseButton.parent(valuesDiv);
    cardValuesCloseButton.style("position", "absolute");
    cardValuesCloseButton.style("bottom", "10px");
    cardValuesCloseButton.style("left", "50%");
    cardValuesCloseButton.style("transform", "translateX(-50%)");
    cardValuesCloseButton.style("background-color", "darkgreen");
    cardValuesCloseButton.style("color", "white");
    cardValuesCloseButton.style("border", "2px solid gold");
    cardValuesCloseButton.style("padding", "10px 20px");
    cardValuesCloseButton.style("border-radius", "5px");
    cardValuesCloseButton.style("cursor", "pointer");
    cardValuesCloseButton.style("font-size", "16px");
    
    // Create back to menu button
    backToMainMenuButton = createButton("Back to Main Menu");
    backToMainMenuButton.position(20, 20);
    backToMainMenuButton.mousePressed(backToMainMenu);
    backToMainMenuButton.parent(gameDiv);
    backToMainMenuButton.hide();
    
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
            y: height - 100,
            label: "Player 4 - Team 2",
            labelOffset: 50,
        },
    ];
}
  