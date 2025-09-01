function setup() {
    console.log('Setting up p5.js canvas and UI elements...');
    
    // CRITICAL: Ensure card images are loaded before proceeding
    if (typeof preload === 'function') {
        console.log('🖼️ Calling preload function to load card images...');
        preload();
    } else {
        console.error('❌ Preload function not found! Card images may not load properly.');
    }
    
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

    trucoButton = createButton("TRUCO");
    trucoButton.position(width/2 - 100, height - 120); // Position in bottom center, adjusted for bigger size
    trucoButton.mousePressed(truco);
    trucoButton.parent(gameDiv);
    trucoButton.style('z-index', '200'); // Ensure it's above everything
    trucoButton.style('position', 'absolute'); // Force absolute positioning
    trucoButton.style('font-size', '24px'); // Much bigger text
    trucoButton.style('padding', '20px 40px'); // Much bigger button
    trucoButton.style('background-color', '#dc3545'); // Darker red background for better visibility
    trucoButton.style('color', 'white'); // White text
    trucoButton.style('border', '3px solid #fff'); // White border for contrast
    trucoButton.style('border-radius', '12px'); // More rounded corners
    trucoButton.style('font-weight', 'bold'); // Bold text
    trucoButton.style('box-shadow', '0 6px 12px rgba(0,0,0,0.4)'); // Add shadow for depth
    trucoButton.style('cursor', 'pointer'); // Pointer cursor
    trucoButton.style('transition', 'all 0.2s ease'); // Smooth transitions
    trucoButton.hide();

    // Create truco response buttons with proper styling and positioning
    buttonAcceptTruco = createButton("✅ ACCEPT TRUCO");
    buttonRejectTruco = createButton("❌ REJECT TRUCO");
    buttonRaiseTruco = createButton("📈 RAISE TRUCO");

    // Style Accept button (Green)
    buttonAcceptTruco.style('background-color', '#28a745');
    buttonAcceptTruco.style('color', 'white');
    buttonAcceptTruco.style('border', 'none');
    buttonAcceptTruco.style('border-radius', '8px');
    buttonAcceptTruco.style('font-weight', 'bold');
    buttonAcceptTruco.style('font-size', '16px');
    buttonAcceptTruco.style('padding', '15px 25px');
    buttonAcceptTruco.style('cursor', 'pointer');
    buttonAcceptTruco.style('z-index', '1000');
    buttonAcceptTruco.style('position', 'absolute');
    buttonAcceptTruco.style('box-shadow', '0 4px 8px rgba(0,0,0,0.3)');

    // Style Reject button (Red)
    buttonRejectTruco.style('background-color', '#dc3545');
    buttonRejectTruco.style('color', 'white');
    buttonRejectTruco.style('border', 'none');
    buttonRejectTruco.style('border-radius', '8px');
    buttonRejectTruco.style('font-weight', 'bold');
    buttonRejectTruco.style('font-size', '16px');
    buttonRejectTruco.style('padding', '15px 25px');
    buttonRejectTruco.style('cursor', 'pointer');
    buttonRejectTruco.style('z-index', '1000');
    buttonRejectTruco.style('position', 'absolute');
    buttonRejectTruco.style('box-shadow', '0 4px 8px rgba(0,0,0,0.3)');

    // Style Raise button (Blue)
    buttonRaiseTruco.style('background-color', '#007bff');
    buttonRaiseTruco.style('color', 'white');
    buttonRaiseTruco.style('border', 'none');
    buttonRaiseTruco.style('border-radius', '8px');
    buttonRaiseTruco.style('font-weight', 'bold');
    buttonRaiseTruco.style('font-size', '16px');
    buttonRaiseTruco.style('padding', '15px 25px');
    buttonRaiseTruco.style('cursor', 'pointer');
    buttonRaiseTruco.style('z-index', '1000');
    buttonRaiseTruco.style('position', 'absolute');
    buttonRaiseTruco.style('box-shadow', '0 4px 8px rgba(0,0,0,0.3)');

    // Set button event handlers
    buttonAcceptTruco.mousePressed(() => {
        if (window.game) {
            window.game.respondTruco(window.game.getCurrentPlayer(), 1);
        }
    });
    buttonRejectTruco.mousePressed(() => {
        if (window.game) {
            window.game.respondTruco(window.game.getCurrentPlayer(), 2);
        }
    });
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

    // Setup player positions with PERFECT 4-corner layout - FIXED positioning
    const scoringPanelHeight = 150; // Height of the scoring panel at top
    const topMargin = scoringPanelHeight + 100; // Increased margin below scoring panel for better spacing
    const leftMargin = 100; // Left margin from screen edge
    const rightMargin = width - 100; // Right margin from screen edge
    const bottomMargin = height - 150; // Bottom margin from screen edge
    
    playerPositions = [
        {
            x: leftMargin,          // Player 1 (TOP-LEFT) - Top position - ACTUAL PLAYER ORDER
            y: topMargin + 50,      // Below scoring panel, top-left corner - MOVED DOWN MORE
            label: "Player 1 - Team 1",
            labelOffset: -80,       // Above cards (top player) - REASONABLE distance
        },
        { 
            x: rightMargin,         // Bot 1 (TOP-RIGHT) - Top position - ACTUAL PLAYER ORDER
            y: topMargin + 50,      // Below scoring panel, top-right corner - MOVED DOWN MORE
            label: "Bot 1 - Team 2", 
            labelOffset: -80        // Above cards (top player) - CONSISTENT with top
        },
        {
            x: leftMargin,          // Bot 2 (BOTTOM-LEFT) - Bottom position - ACTUAL PLAYER ORDER
            y: bottomMargin,        // Bottom-left corner
            label: "Bot 2 - Team 1",
            labelOffset: -80,       // Above cards (bottom player) - CONSISTENT with top
        },
        {
            x: rightMargin,         // Bot 3 (BOTTOM-RIGHT) - Bottom position - ACTUAL PLAYER ORDER
            y: bottomMargin,        // Bottom-right corner
            label: "Bot 3 - Team 2",
            labelOffset: -80,       // Above cards (bottom player) - CONSISTENT with top
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

    // Create popup elements for Truco notifications
    popup = createDiv();
    popup.class('popup');
    popup.parent(gameDiv);
    popup.style('position', 'absolute');
    popup.style('top', '25%'); // Position above center (where cards are played)
    popup.style('left', '50%');
    popup.style('transform', 'translateX(-50%)'); // Only center horizontally
    popup.style('background-color', 'rgba(0, 0, 0, 0.85)'); // More transparent
    popup.style('color', 'white');
    popup.style('padding', '25px');
    popup.style('border-radius', '15px');
    popup.style('border', '3px solid #ff4444');
    popup.style('z-index', '1000');
    popup.style('text-align', 'center');
    popup.style('min-width', '400px');
    popup.style('max-width', '600px');
    popup.style('font-size', '18px');
    popup.style('font-weight', 'bold');
    popup.style('box-shadow', '0 8px 25px rgba(0, 0, 0, 0.7)');
    popup.style('cursor', 'default');
    popup.style('backdrop-filter', 'blur(5px)'); // Add subtle blur effect
    popup.hide();

    // Create popup message paragraph
    messageParagrph = createP('');
    messageParagrph.parent(popup);
    messageParagrph.style('margin', '0');
    messageParagrph.style('padding', '10px 0');
    messageParagrph.style('text-align', 'center');
    
    // Create instruction text
    let instructionText = createP('Click Close or wait for auto-close');
    instructionText.parent(popup);
    instructionText.style('margin', '0 0 15px 0');
    instructionText.style('padding', '0');
    instructionText.style('text-align', 'center');
    instructionText.style('color', '#cccccc');
    instructionText.style('font-size', '14px');
    instructionText.style('font-style', 'italic');

    // Create close button for popup
    closeButton = createButton("Close");
    closeButton.parent(popup);
    closeButton.mousePressed(closePopup);
    closeButton.style('margin-top', '15px');
    closeButton.style('padding', '10px 20px');
    closeButton.style('background-color', '#ff4444');
    closeButton.style('color', 'white');
    closeButton.style('border', 'none');
    closeButton.style('border-radius', '5px');
    closeButton.style('cursor', 'pointer');
    closeButton.style('font-weight', 'bold');
    
    // Create progress bar for popup auto-close
    popupProgressBar = createDiv();
    popupProgressBar.parent(popup);
    popupProgressBar.style('width', '100%');
    popupProgressBar.style('height', '4px');
    popupProgressBar.style('background-color', '#333');
    popupProgressBar.style('border-radius', '2px');
    popupProgressBar.style('margin-top', '15px');
    popupProgressBar.style('overflow', 'hidden');
    
    // Create progress bar fill
    popupProgressFill = createDiv();
    popupProgressFill.parent(popupProgressBar);
    popupProgressFill.style('width', '100%');
    popupProgressFill.style('height', '100%');
    popupProgressFill.style('background-color', '#ff4444');
    popupProgressFill.style('transition', 'width 0.1s linear');
    popupProgressFill.style('transform-origin', 'left');

    console.log('Setup complete - canvas and UI elements initialized');
}
  