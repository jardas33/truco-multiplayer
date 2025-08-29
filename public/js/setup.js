function setup() {
    console.log('🎨 Setting up p5.js canvas and UI elements...');
    
    // CRITICAL TEST: Check if p5.js is working
    console.log('🎨 p5.js test - width:', width, 'height:', height);
    console.log('🎨 p5.js test - frameCount:', frameCount);
    
    // Set frame rate to prevent excessive rendering
    frameRate(30); // Limit to 30 FPS instead of 60
    
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('Menu');
    canvas.style('display', 'block');
    canvas.style('position', 'absolute');
    canvas.style('top', '0');
    canvas.style('left', '0');
    canvas.style('z-index', '1'); // Canvas behind HTML elements but visible
    // Remove pointer-events: none so cards can be clicked
    // canvas.style('pointer-events', 'none'); // Allow clicks to pass through to HTML elements
    
    // CRITICAL: Ensure canvas is properly sized and visible
    canvas.style('width', windowWidth + 'px');
    canvas.style('height', windowHeight + 'px');
    canvas.style('background-color', 'rgba(255, 0, 0, 0.1)'); // Slight red tint for debugging
    
    console.log('Canvas created and positioned');
    console.log('Canvas dimensions:', { width: windowWidth, height: windowHeight });
    console.log('Canvas element:', canvas);
    console.log('Canvas parent:', canvas.parent());

    // Store canvas reference globally for easy access
    window.gameCanvas = canvas;
    
    // Debug: Check if canvas is actually in the DOM
    setTimeout(() => {
        const canvasInDOM = document.querySelector('canvas');
        console.log('Canvas in DOM:', canvasInDOM);
        if (canvasInDOM) {
            console.log('Canvas computed styles:', window.getComputedStyle(canvasInDOM));
            console.log('Canvas parent div:', canvasInDOM?.parentElement);
            console.log('Canvas dimensions in DOM:', canvasInDOM.offsetWidth, 'x', canvasInDOM.offsetHeight);
        } else {
            console.error('❌ NO CANVAS FOUND IN DOM!');
        }
    }, 100);

    menuDiv = select("#Menu");
    gameDiv = select("#Game");
    instructionsDiv = select("#Instructions");
    valuesDiv = select("#Values");
    console.log('Div containers initialized:', { menuDiv, gameDiv, instructionsDiv, valuesDiv });

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
        console.error('❌ roomControls div not found!');
    }

    // Create p5.js buttons with proper z-index
    instructionsButton = createButton("Instructions");
    instructionsButton.position(20, 20);
    instructionsButton.mousePressed(showInstructions);
    instructionsButton.parent('Menu');
    instructionsButton.style('z-index', '10');
    instructionsButton.style('position', 'relative');
    instructionsButton.show();

    cardValuesButton = createButton("Card Values");
    cardValuesButton.position(20, 60);
    cardValuesButton.mousePressed(showCardValues);
    cardValuesButton.parent('Menu');
    cardValuesButton.style('z-index', '10');
    cardValuesButton.style('position', 'relative');
    cardValuesButton.show();
    console.log('Buttons created with proper z-index and made visible');

    // Create game UI buttons
    backToMainMenuButton = createButton("Back to Main Menu");
    backToMainMenuButton.position(20, 20);
    backToMainMenuButton.mousePressed(backToMainMenu);
    backToMainMenuButton.parent(gameDiv);
    backToMainMenuButton.hide();

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
    console.log('Player positions initialized:', playerPositions);

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
    cardValuesButton.style("left", "50%");
    cardValuesButton.style("transform", "translateX(-50%)");
    cardValuesButton.style("z-index", "30"); // Above everything
    cardValuesButton.style("display", "block"); // Ensure it's visible
    cardValuesButton.show(); // Make sure p5.js shows it

    console.log('Setup complete - canvas and UI elements initialized');
    
    // CRITICAL TEST: Force a redraw to see if anything works
    setTimeout(() => {
        console.log('🎨 Forcing redraw after setup...');
        redraw();
    }, 500);
}
  