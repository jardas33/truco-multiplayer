function createUIElements(p) {
    // Create instruction buttons
    instructionsButton = p.createButton("Instructions");
    instructionsButton.position(20, 20);
    instructionsButton.mousePressed(showInstructions);
    instructionsButton.parent(menuDiv);
    
    instructionsButton = p.createButton("Instructions");
    instructionsButton.position(20, 80);
    instructionsButton.mousePressed(showInstructions);
    instructionsButton.parent(gameDiv);

    // Create card values buttons
    cardValuesButton = p.createButton("Card Values");
    cardValuesButton.position(20, 60);
    cardValuesButton.mousePressed(showCardValues);
    cardValuesButton.parent(menuDiv);
    
    cardValuesButton = p.createButton("Card Values");
    cardValuesButton.position(20, 120);
    cardValuesButton.mousePressed(showCardValues);
    cardValuesButton.parent(gameDiv);

    // Create back to menu button
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

    // Create truco response buttons
    buttonAcceptTruco = p.createButton("Accept Truco");
    buttonRejectTruco = p.createButton("Reject Truco");
    buttonRaiseTruco = p.createButton("Raise Truco");

    buttonAcceptTruco.position(10, 180);
    buttonAcceptTruco.mousePressed(() => {
      if (window.game) {
        window.game.respondTruco(window.game.getCurrentPlayer(), 1);
      }
    });
    buttonRejectTruco.position(10, 210);
    buttonRejectTruco.mousePressed(() => {
      if (window.game) {
        window.game.respondTruco(window.game.getCurrentPlayer(), 2);
      }
    });
    buttonRaiseTruco.position(10, 240);
    buttonRaiseTruco.mousePressed(() => {
      if (window.game) {
        window.game.respondTruco(window.game.getCurrentPlayer(), 3);
      }
    });

    buttonAcceptTruco.parent(gameDiv);
    buttonRejectTruco.parent(gameDiv);
    buttonRaiseTruco.parent(gameDiv);

    buttonAcceptTruco.hide();
    buttonRejectTruco.hide();
    buttonRaiseTruco.hide();

    // Create popup
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

    // Setup window resize handler
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
} 