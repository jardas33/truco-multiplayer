function createUIElements(p) {
    // REMOVED DUPLICATE BUTTON CREATION - buttons are created in setup.js
    
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

    // Setup player positions - REMOVED DUPLICATE (handled in setup.js)
    // playerPositions = [
    //     {
    //         x: p.width / 6,
    //         y: p.height / 2,
    //         label: "Player 1 - Team 1",
    //         labelOffset: -50,
    //     },
    //     { 
    //         x: p.width / 2, 
    //         y: 100, 
    //         label: "Player 2 - Team 2", 
    //         labelOffset: -50 
    //     },
    //     {
    //         x: (5 * p.width) / 6,
    //         y: p.height / 2,
    //         label: "Player 3 - Team 1",
    //         labelOffset: -50,
    //     },
    //     {
    //         x: p.width / 2,
    //         y: p.height - cardHeight - 100,
    //         label: "Player 4 - Team 2",
    //         labelOffset: cardHeight + 20,
    //     },
    // ];

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
        
        // Update player positions using the new edge-safe positioning logic
        if (playerPositions && playerPositions.length >= 4) {
            playerPositions[0] = {
                x: Math.max(150, p.windowWidth / 6), // Ensure minimum distance from left edge
                y: p.windowHeight - 150, // Bottom-left, above the bottom edge
                label: "Player 1 - Team 1",
                labelOffset: -50,
            };
            playerPositions[1] = { 
                x: p.windowWidth / 2, 
                y: Math.max(150, p.windowHeight / 6), // Ensure minimum distance from top edge
                label: "Bot 1 - Team 2", 
                labelOffset: -50 
            };
            playerPositions[2] = {
                x: Math.min(p.windowWidth - 150, (5 * p.windowWidth) / 6), // Ensure minimum distance from right edge
                y: p.windowHeight / 2,
                label: "Bot 2 - Team 1",
                labelOffset: -50,
            };
            playerPositions[3] = {
                x: p.windowWidth / 2,
                y: Math.min(p.windowHeight - 150, (5 * p.windowHeight) / 6), // Ensure minimum distance from bottom edge
                label: "Bot 3 - Team 2",
                labelOffset: 50,
            };
            
            console.log('🔄 Player positions updated for new window size:', playerPositions);
        }
        
        // Update Truco button position if it exists
        if (trucoButton && typeof trucoButton.position === 'function') {
            try {
                trucoButton.position(p.windowWidth - 150, p.windowHeight - 80);
                console.log('🔄 Truco button repositioned for new window size');
            } catch (error) {
                console.warn('⚠️ Could not reposition Truco button:', error);
            }
        }
    };
} 