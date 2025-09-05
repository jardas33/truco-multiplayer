function setup() {
    console.log('Setting up p5.js canvas and UI elements...');
    
    // CRITICAL: Ensure card images are loaded before proceeding
    if (typeof preload === 'function') {
        console.log('Calling preload function to load card images...');
        preload();
    } else {
        console.error('ERROR: Preload function not found! Card images may not load properly.');
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
    if (menuDiv) {
        menuDiv.class('active');
        menuDiv.style('display', 'block'); // Force menu to be visible
    }
    if (gameDiv) {
        gameDiv.removeClass('active');
        gameDiv.style('display', 'none');
    }
    if (instructionsDiv) {
        instructionsDiv.removeClass('active');
        instructionsDiv.style('display', 'none');
    }
    if (valuesDiv) {
        valuesDiv.removeClass('active');
        valuesDiv.style('display', 'none');
    }
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
    instructionsButton.mousePressed(() => {
        console.log('📖 Instructions button clicked');
        // Call the correct showInstructions function from functions.js
        if (typeof window.showInstructions === 'function') {
            window.showInstructions();
        } else if (typeof showInstructions === 'function') {
            showInstructions();
        } else {
            console.error('showInstructions function not found');
        }
    });
    instructionsButton.parent('Menu');
    instructionsButton.style('z-index', '100'); // Higher z-index
    instructionsButton.style('position', 'absolute'); // Force absolute positioning
    instructionsButton.style('padding', '10px 20px'); // Ensure consistent padding
    instructionsButton.style('margin', '5px'); // Ensure consistent margin
    instructionsButton.style('border', '2px solid #fff'); // Ensure consistent border
    instructionsButton.style('background-color', 'rgba(0, 0, 0, 0.7) !important'); // Ensure consistent background
    instructionsButton.style('color', 'white !important'); // Ensure consistent text color
    instructionsButton.style('font-weight', 'bold'); // Ensure consistent font weight
    instructionsButton.style('border-radius', '5px'); // Ensure consistent border radius
    instructionsButton.style('text-align', 'center'); // Ensure consistent text alignment
    instructionsButton.style('font-size', '14px !important'); // Ensure consistent font size
    instructionsButton.style('width', 'auto !important'); // Ensure auto width
    instructionsButton.style('height', 'auto !important'); // Ensure auto height
    instructionsButton.show();

    // Only show Card Values button for Truco game
    const currentGame = window.location.pathname;
    if (currentGame === '/truco' || currentGame === '/') {
        cardValuesButton = createButton("Card Values");
        cardValuesButton.position(20, 70); // Position right under Instructions button with proper spacing
        cardValuesButton.mousePressed(() => {
            console.log('🃏 Card Values button clicked');
            // Call the correct showCardValues function from functions.js
            if (typeof window.showCardValues === 'function') {
                window.showCardValues();
            } else if (typeof showCardValues === 'function') {
                showCardValues();
            } else {
                console.error('showCardValues function not found');
            }
        });
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
    }
    console.log('Buttons created with proper z-index and made visible');
    
    // Create game UI buttons
    backToMainMenuButton = createButton("Back to Main Menu");
    backToMainMenuButton.position(20, 20);
    backToMainMenuButton.mousePressed(backToMainMenu);
    backToMainMenuButton.parent(gameDiv);
    backToMainMenuButton.hide();

    // Only create Truco-specific elements for Truco game
    if (currentGame === '/truco' || currentGame === '/') {
        trucoButton = createButton("TRUCO");
        trucoButton.position(width/2 - 95, height/2 + 160); // Moved 5px more to the left
        trucoButton.mousePressed(truco);
        trucoButton.parent(gameDiv);
        trucoButton.style('z-index', '200'); // Ensure it's above everything
        trucoButton.style('position', 'absolute'); // Force absolute positioning
        trucoButton.style('font-size', '30px !important'); // 15% smaller font size (35 * 0.85)
        trucoButton.style('padding', '30px 60px !important'); // 15% smaller padding (35*0.85, 70*0.85)
        trucoButton.style('background', '#dc3545 !important'); // Force bright red background
        trucoButton.style('background-color', '#dc3545 !important'); // Force bright red background
        trucoButton.style('color', 'white !important'); // Force white text
        trucoButton.style('border', '3px solid #fff !important'); // 15% smaller border thickness (4 * 0.85)
        trucoButton.style('border-radius', '17px !important'); // 15% smaller rounded corners (20 * 0.85)
        trucoButton.style('font-weight', 'bold !important'); // Bold text
        trucoButton.style('box-shadow', '0 13px 26px rgba(0,0,0,0.7) !important'); // 15% smaller shadow (15*0.85, 30*0.85)
        trucoButton.style('cursor', 'pointer !important'); // Pointer cursor
        trucoButton.style('transition', 'all 0.3s ease !important'); // Smooth transitions
        trucoButton.style('transform', 'scale(0.51) !important'); // 15% smaller scale (0.6 * 0.85)
        trucoButton.hide();
    }

    // Create truco response buttons with proper styling and positioning (only for Truco game)
    if (currentGame === '/truco' || currentGame === '/') {
        buttonAcceptTruco = createButton("ACCEPT TRUCO");
        buttonRejectTruco = createButton("REJECT TRUCO");
        buttonRaiseTruco = createButton("RAISE TRUCO");

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

        // OLD TRUCO BUTTON HANDLERS REMOVED - Now handled by new UI system in lobby.js

        buttonAcceptTruco.parent(gameDiv);
        buttonRejectTruco.parent(gameDiv);
        buttonRaiseTruco.parent(gameDiv);

        buttonAcceptTruco.hide();
        buttonRejectTruco.hide();
        buttonRaiseTruco.hide();
    }

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
    if (instructionsDiv) {
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
    }

    if (valuesDiv) {
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
    }

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
    closeButton.mousePressed(() => {
        if (typeof closePopup === 'function') {
            closePopup();
        } else {
            console.log('ERROR: Close popup clicked (fallback)');
            popup.hide();
        }
    });
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

    // Initialize menu state properly
    if (typeof gameStateEnum !== 'undefined') {
        gameState = gameStateEnum.Menu;
        window.gameState = gameStateEnum.Menu;
    }
    
    // Stop the draw loop initially to prevent blinking
    noLoop();
    
    console.log('Setup complete - canvas and UI elements initialized');
}
  
