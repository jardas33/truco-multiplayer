function setup() {
    console.log('Setting up p5.js canvas and UI elements...');
    
    // Set frame rate to prevent excessive rendering
    frameRate(30); // Limit to 30 FPS instead of 60
    
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('Menu');
    canvas.style('display', 'block');
    canvas.style('position', 'absolute');
    canvas.style('top', '0');
    canvas.style('left', '0');
    canvas.style('z-index', '1'); // Canvas behind HTML elements but visible
    
    // Ensure canvas is properly sized and visible
    canvas.style('width', windowWidth + 'px');
    canvas.style('height', windowHeight + 'px');
    
    console.log('Canvas created and positioned');
    
    // Store canvas reference globally for easy access
    window.gameCanvas = canvas;
    
    menuDiv = select("#Menu");
    gameDiv = select("#Game");
    instructionsDiv = select("#Instructions");
    valuesDiv = select("#Values");
    console.log('Div containers initialized');

    // Ensure proper initial state
    menuDiv.class('active');
    menuDiv.style('display', 'block'); // Force menu to be visible
    gameDiv.removeClass('active');
    gameDiv.style('display', 'none');
    instructionsDiv.removeClass('active');
    instructionsDiv.style('display', 'none');
    valuesDiv.removeClass('active');
    valuesDiv.style('display', 'none');
    console.log('Menu div made visible, others hidden');

    // Ensure the room controls (HTML buttons) are visible above the canvas
    const roomControls = document.getElementById('roomControls');
    if (roomControls) {
        roomControls.style.display = 'block';
        roomControls.style.zIndex = '20'; // Above canvas
        roomControls.style.position = 'relative';
        console.log('Room controls made visible with z-index 20');
    } else {
        console.error('roomControls div not found!');
    }

    // Create p5.js buttons with proper z-index and identical styling
    instructionsButton = createButton("Instructions");
    instructionsButton.position(20, 20);
    instructionsButton.mousePressed(showInstructions);
    instructionsButton.parent('Menu');
    instructionsButton.style('z-index', '100'); // Higher z-index
    instructionsButton.style('position', 'absolute'); // Force absolute positioning
    instructionsButton.style('padding', '10px 20px'); // Ensure consistent padding
    instructionsButton.style('margin', '5px'); // Ensure consistent margin
    instructionsButton.style('border', '2px solid #fff'); // Ensure consistent border
    instructionsButton.style('background-color', 'rgba(0, 0, 0, 0.7)'); // Ensure consistent background
    instructionsButton.style('color', 'white'); // Ensure consistent text color
    instructionsButton.style('font-weight', 'bold'); // Ensure consistent font weight
    instructionsButton.style('border-radius', '5px'); // Ensure consistent border radius
    instructionsButton.show();

    cardValuesButton = createButton("Card Values");
    cardValuesButton.position(20, 70); // Position right under Instructions button with proper spacing
    cardValuesButton.mousePressed(showCardValues);
    cardValuesButton.parent('Menu');
    cardValuesButton.style('z-index', '100'); // Higher z-index
    cardValuesButton.style('position', 'absolute'); // Force absolute positioning
    cardValuesButton.style('padding', '10px 20px'); // Ensure consistent padding
    cardValuesButton.style('margin', '5px'); // Ensure consistent margin
    cardValuesButton.style('border', '2px solid #fff'); // Ensure consistent border
    cardValuesButton.style('background-color', 'rgba(0, 0, 0, 0.7)'); // Ensure consistent background
    cardValuesButton.style('color', 'white'); // Ensure consistent text color
    cardValuesButton.style('font-weight', 'bold'); // Ensure consistent font weight
    cardValuesButton.style('border-radius', '5px'); // Ensure consistent border radius
    cardValuesButton.style('text-align', 'center'); // Ensure consistent text alignment
    cardValuesButton.show();
    console.log('Buttons created with proper z-index and made visible');
    
    // Create game UI buttons
    backToMainMenuButton = createButton("Back to Main Menu");
    backToMainMenuButton.position(20, 20);
    backToMainMenuButton.mousePressed(backToMainMenu);
    backToMainMenuButton.parent(gameDiv);
    backToMainMenuButton.hide();

    trucoButton = createButton("Truco");
    trucoButton.position(width - 150, height - 80); // Position in bottom-right corner
    trucoButton.mousePressed(truco);
    trucoButton.parent(gameDiv);
    trucoButton.style('z-index', '200'); // Ensure it's above everything
    trucoButton.style('position', 'absolute'); // Force absolute positioning
    trucoButton.hide();

    // Create truco response buttons
    buttonAcceptTruco = createButton("Accept Truco");
    buttonRejectTruco = createButton("Reject Truco");
    buttonRaiseTruco = createButton("Raise Truco");

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

    // Setup player positions with proper 4-corner layout and scoring panel consideration
    const scoringPanelHeight = 150; // Height of the scoring panel at top
    const topMargin = scoringPanelHeight + 50; // Extra margin below scoring panel
    const bottomMargin = 150; // Increased margin from bottom edge for better centering
    
    playerPositions = [
        {
            x: width / 6,           // Bot 1 (left)
            y: topMargin + 100,     // Below scoring panel, left side
            label: "Bot 1 - Team 2",
            labelOffset: -50,
        },
        { 
            x: width / 2,           // Bot 2 (top) - moved lower for better centering
            y: topMargin + 120,     // Below scoring panel, more centered
            label: "Bot 2 - Team 1", 
            labelOffset: -50 
        },
        {
            x: (5 * width) / 6,     // Bot 3 (right) - moved higher to prevent going off screen
            y: topMargin + 80,      // Below scoring panel, higher position
            label: "Bot 3 - Team 2",
            labelOffset: -50,
        },
        {
            x: width / 2,           // Player 1 (bottom) - moved higher for better centering
            y: height - bottomMargin, // Bottom center, better centered on playing field
            label: "Player 1 - Team 1",
            labelOffset: 50,
        },
    ];
    console.log('Player positions initialized');

    // Create close buttons for popups
    instructionsCloseButton = createButton("Close");
    instructionsCloseButton.mousePressed(closeInstructions);
    instructionsCloseButton.parent(instructionsDiv);
    instructionsCloseButton.style("position", "absolute");
    instructionsCloseButton.style("bottom", "10px");
    instructionsCloseButton.style("left", "50%");
    instructionsCloseButton.style("transform", "translateX(-50%)");
    instructionsCloseButton.style("z-index", "30"); // Above everything
    instructionsCloseButton.style("display", "block"); // Ensure it's visible
    instructionsCloseButton.show(); // Make sure p5.js shows it

    cardValuesCloseButton = createButton("Close");
    cardValuesCloseButton.mousePressed(closeCardValues);
    cardValuesCloseButton.parent(valuesDiv);
    cardValuesCloseButton.style("position", "absolute");
    cardValuesCloseButton.style("bottom", "10px");
    cardValuesCloseButton.style("left", "50%");
    cardValuesCloseButton.style("transform", "translateX(-50%)");
    cardValuesCloseButton.style("z-index", "30"); // Above everything
    cardValuesCloseButton.style("display", "block"); // Ensure it's visible
    cardValuesCloseButton.show(); // Make sure p5.js shows it

    console.log('Setup complete - canvas and UI elements initialized');
}
  