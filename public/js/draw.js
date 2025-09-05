function draw() {
    // Clear the canvas at the start of each frame
    clear();
    
    // Check canvas state
    if (!window.gameCanvas) {
        return;
    }
    
    // Check if canvas is hidden (for main menu) - if so, don't draw anything
    const canvas = document.querySelector('canvas');
    if (canvas && canvas.style.display === 'none') {
        return; // Don't draw anything if canvas is hidden
    }
    
    // Use p5.js built-in loop control instead of manual frame limiting
    if (gameState === gameStateEnum.Menu) {
        // For menu, stop the draw loop to prevent blinking
        if (isLooping()) {
            noLoop();
        }
        return; // Don't draw anything in menu state
    } else if (gameState === gameStateEnum.Playing) {
        // For game playing, ensure loop is running
        if (!isLooping()) {
            loop();
        }
    }
    
    // Fix canvas parenting based on game state
    if (window.gameCanvas) {
        try {
            const currentParent = window.gameCanvas.parent();
            
            // Fix canvas parenting based on game state
            if (gameState === gameStateEnum.Playing || window.gameState === gameStateEnum.Playing) {
                // Game is running - canvas should be in Game div
                if (!currentParent || !currentParent.elt || currentParent.elt.id !== 'Game') {
                    window.gameCanvas.parent('Game');
                    // Force the Game div to be visible
                    if (gameDiv) gameDiv.style('display', 'block');
                }
            } else if (gameState === gameStateEnum.Menu || window.gameState === gameStateEnum.Menu) {
                // In menu - canvas should be in Menu div
                if (!currentParent || !currentParent.elt || currentParent.elt.id !== 'Menu') {
                    window.gameCanvas.parent('Menu');
                    // Force the Menu div to be visible
                    if (menuDiv) menuDiv.style('display', 'block');
                }
            }
        } catch (error) {
            // Emergency fix: try to put canvas back in Menu div
            try {
                window.gameCanvas.parent('Menu');
            } catch (e) {
                console.error('Emergency canvas fix failed:', e);
            }
        }
    }
    
    // Draw background for all states
    push();
    imageMode(CORNER);
    if (backgroundImage) {
        image(backgroundImage, 0, 0, width, height);
    } else {
        // Fallback background if image not loaded
        background(0, 100, 0); // Dark green
    }
    pop();
    
    if (gameState === gameStateEnum.Instructions) {
        // ✅ CRITICAL: Ensure proper div visibility
        if (menuDiv) menuDiv.hide();
        if (gameDiv) gameDiv.hide();
        if (valuesDiv) valuesDiv.hide();
        if (instructionsDiv) instructionsDiv.show();
        
        // ✅ CRITICAL: Move canvas to Instructions div
        let canvas = document.querySelector('canvas');
        if (canvas && instructionsDiv) {
            instructionsDiv.elt.appendChild(canvas);
        }
        
        // Draw golden box (same design as card values)
        const boxWidth = 1000;
        const boxHeight = 600;
        const boxX = width/2 - boxWidth/2;
        const boxY = height/2 - boxHeight/2;
        
        // Draw box background with opacity
        fill(0, 0, 0, 200);
        stroke(218, 165, 32); // Golden color only for box border
        strokeWeight(3);
        rect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw title
        noStroke(); // Remove stroke for all text
        fill(218, 165, 32);
        textSize(36);
        textAlign(CENTER);
        text("Instructions of the game", width/2, boxY + 60);
        
        // Draw instruction text
        textSize(16);
        textAlign(LEFT);
        fill(255); // White text
        const startY = boxY + 120; // Increased spacing from title (was 100, now 120)
        const lineHeight = 22;
        const textX = boxX + 50;
        const maxWidth = boxWidth - 100;
        
        const instructions = [
            "Truco is a fun game designed to be played by an even number of players, played in teams of 2v2 or 3v3. Each Truco match is composed of multiple sets, where each set equals twelve games, and each game consists of three rounds.",
            "",
            "In each round, every player plays one card. The team that wins two out of three rounds wins the game. The team that wins twelve games first wins the set.",
            "",
            "The order of turns is clockwise, with the first player in each round being the one who played the highest card in the previous round, or in case of a tie, the one who played first in the previous round.",
            "",
            "The game features the 'truco' mechanic. During their turn, a player can choose to call 'truco', which increases the value of the current game if accepted. The next player can then choose to accept, reject, or raise the value further. If truco is rejected, the game ends immediately, and the team that wins the game at its current value. If accepted, the game goes on but it is now worth 3 games instead of 1. The next player can also raise to 6, then the decision goes back to the player that initially called truco and he has the same options: accept, reject and raise. A game can only be risen to 12 games. It is not possible to raise after that.",
            "",
            "Once a team has won eleven games within a set, the 'Game of Eleven' rule comes into effect. The team can view their cards and their partner's cards before deciding whether to play the next game. If they decide to play, the game's value is increased to three. If they reject, the opposing team wins one game instantly.",
            "",
            "Truco is played with a 40 card deck, with a specific order of card values that you can see in the card values instructions."
        ];
        
        let currentY = startY;
        instructions.forEach(instructionText => {
            if (instructionText === "") {
                currentY += lineHeight / 2; // Add space between paragraphs
            } else {
                // Split long text into multiple lines if needed
                const words = instructionText.split(' ');
                let currentLine = '';
                let lineY = currentY;
                
                for (let i = 0; i < words.length; i++) {
                    const testLine = currentLine + words[i] + ' ';
                    const testWidth = textWidth(testLine);
                    
                    if (testWidth > maxWidth && currentLine !== '') {
                        text(currentLine, textX, lineY);
                        currentLine = words[i] + ' ';
                        lineY += lineHeight;
                    } else {
                        currentLine = testLine;
                    }
                }
                if (currentLine !== '') {
                    text(currentLine, textX, lineY);
                }
                currentY = lineY + lineHeight;
            }
        });
        
        // Create and position close button (outside the box, centered at bottom)
        if (instructionsCloseButton) {
            instructionsCloseButton.remove();
        }
        instructionsCloseButton = createButton('Close');
        instructionsCloseButton.class('close-button');
        instructionsCloseButton.mousePressed(() => {
            gameState = gameStateEnum.Menu;
            const menuDiv = document.getElementById('Menu');
            if (menuDiv) {
                menuDiv.style.display = 'block';
            }
            const instructionsDiv = document.getElementById('Instructions');
            if (instructionsDiv) {
                instructionsDiv.style.display = 'none';
            }
            
            // ✅ CRITICAL: Move canvas back to Menu div
            let canvas = document.querySelector('canvas');
            if (canvas && menuDiv) {
                menuDiv.appendChild(canvas);
            }
            instructionsCloseButton.hide();
            loop();
        });
        
        instructionsCloseButton.position(width/2 - 50, boxY + boxHeight + 30);
        instructionsCloseButton.style('background-color', '#dc3545');
        instructionsCloseButton.style('color', 'white');
        instructionsCloseButton.style('border', '2px solid #fff');
        instructionsCloseButton.style('border-radius', '5px');
        instructionsCloseButton.style('padding', '10px 20px');
        instructionsCloseButton.style('font-size', '16px');
        instructionsCloseButton.style('font-weight', 'bold');
        instructionsCloseButton.style('cursor', 'pointer');
        instructionsCloseButton.style('z-index', '1001');
        instructionsCloseButton.show();
    }
    else if (gameState === gameStateEnum.CardValues) {
        // ✅ CRITICAL: Ensure proper div visibility
        if (menuDiv) menuDiv.hide();
        if (gameDiv) gameDiv.hide();
        if (instructionsDiv) instructionsDiv.hide();
        if (valuesDiv) valuesDiv.show();
        
        // ✅ CRITICAL: Move canvas to Values div
        let canvas = document.querySelector('canvas');
        if (canvas && valuesDiv) {
            valuesDiv.elt.appendChild(canvas);
        }
        
        // Draw golden box
        const boxWidth = 1000;
        const boxHeight = 600;
        const boxX = width/2 - boxWidth/2;
        const boxY = height/2 - boxHeight/2;
        
        // Draw box background with opacity
        fill(0, 0, 0, 200);
        stroke(218, 165, 32); // Golden color only for box border
        strokeWeight(3);
        rect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw title
        noStroke(); // Remove stroke for all text
        fill(218, 165, 32);
        textSize(36);
        textAlign(CENTER);
        text("Card Values", width/2, boxY + 60);
        
        // Draw subtitle
        textSize(28);
        text("Card power from most powerful (1) to least powerful (17)", width/2, boxY + 110);
        
        // Draw two columns of card values
        textSize(22);
        textAlign(LEFT);
        const startY = boxY + 160;
        const lineHeight = 35;
        const leftColX = boxX + 80;
        const rightColX = boxX + boxWidth/2 + 80;
        
        const leftColumnEntries = [
            "Queen of diamonds (1)",
            "Jack of clubs (2)",
            "5 of clubs (3)",
            "4 of clubs (4)",
            "7 of hearts (5)",
            "Ace of spades (6)",
            "7 of diamonds (7)",
            "All 3's (8)",
            "All 2's (9)"
        ];
        
        const rightColumnEntries = [
            "Aces (10)",
            "Kings (11)",
            "Queens (12)",
            "Jacks (13)",
            "7's (14)",
            "6's (15)",
            "5's (16)",
            "4's (17)"
        ];
        
        // Draw left column
        for(let i = 0; i < leftColumnEntries.length; i++) {
            fill(218, 165, 32);
            text((i + 1) + ".", leftColX, startY + lineHeight * i);
            fill(255);
            text(leftColumnEntries[i], leftColX + 35, startY + lineHeight * i);
        }
        
        // Draw right column
        for(let i = 0; i < rightColumnEntries.length; i++) {
            fill(218, 165, 32);
            text((i + 1) + 9 + ".", rightColX, startY + lineHeight * i);
            fill(255);
            text(rightColumnEntries[i], rightColX + 45, startY + lineHeight * i);
        }
        
        // Create and position close button
        if (!instructionsCloseButton) {
            instructionsCloseButton = createButton('Close');
            instructionsCloseButton.class('close-button');
            instructionsCloseButton.mousePressed(() => {
                // ✅ Return to previous state (game or menu)
                if (previousGameState === gameStateEnum.Playing) {
                    // Return to game
                    gameState = gameStateEnum.Playing;
                    const gameDiv = document.getElementById('Game');
                    if (gameDiv) {
                        gameDiv.style.display = 'block';
                    }
                    const valuesDiv = document.getElementById('Values');
                    if (valuesDiv) {
                        valuesDiv.style.display = 'none';
                    }
                    
                    // ✅ CRITICAL: Move canvas back to Game div
                    let canvas = document.querySelector('canvas');
                    if (canvas && gameDiv) {
                        gameDiv.appendChild(canvas);
                    }
                } else {
                    // Return to menu
                    gameState = gameStateEnum.Menu;
                    const menuDiv = document.getElementById('Menu');
                    if (menuDiv) {
                        menuDiv.style.display = 'block';
                    }
                    const valuesDiv = document.getElementById('Values');
                    if (valuesDiv) {
                        valuesDiv.style.display = 'none';
                    }
                    
                    // ✅ CRITICAL: Move canvas back to Menu div
                    let canvas = document.querySelector('canvas');
                    if (canvas && menuDiv) {
                        menuDiv.appendChild(canvas);
                    }
                }
                instructionsCloseButton.hide();
                loop();
            });
        }
        
        instructionsCloseButton.position(width/2 - 50, boxY + boxHeight - 50);
        instructionsCloseButton.show();
    }
    else if (gameState === gameStateEnum.Playing) {
        // Reduced logging to prevent console spam
        if (frameCount % 300 === 0) { // Log only every 300 frames (about once every 5 seconds)
            console.log('🎮 Game state is Playing - drawing game state');
        }
        
        // CRITICAL: Ensure Game div is visible and canvas is properly positioned
        if (gameDiv) {
            gameDiv.style('display', 'block');
            gameDiv.style('z-index', '1');
        }
        
        // Hide other divs
        if (menuDiv) menuDiv.style('display', 'none');
        if (instructionsDiv) instructionsDiv.style('display', 'none');
        if (valuesDiv) valuesDiv.style('display', 'none');
        
        // ✅ Hide game buttons when not in game
        if (typeof hideGameButtons === 'function') {
            hideGameButtons();
        }
        
        // Show game UI buttons
        if (backToMainMenuButton) backToMainMenuButton.hide(); // Hide old p5.js button
        
        // ✅ Show new game buttons
        if (typeof showGameButtons === 'function') {
            showGameButtons();
        }
        
        // Only draw game state if game is properly initialized
        if (window.game && window.game.players && window.game.players.length > 0) {
            // Reduced logging to prevent console spam
            if (frameCount % 600 === 0) { // Log only every 600 frames (about every 10 seconds)
                console.log('✅ Game is properly initialized, drawing game state');
            }
            // Check if we're in Truco game (which has drawGameState function)
            if (typeof drawGameState === 'function') {
                drawGameState();
            } else {
                // For other games (like Poker), draw a basic game state
                drawBasicGameState();
            }
        } else {
            // Reduced debug logging
            if (frameCount % 600 === 0) { // Log only every 600 frames
                console.log('🔍 Debug - Not drawing game state:');
                console.log('  - window.game exists:', !!window.game);
                console.log('  - window.game.players exists:', !!(window.game && window.game.players));
                console.log('  - players length:', window.game ? window.game.players.length : 'N/A');
            }
            
            // Draw a basic debug state even if game is not fully initialized
            drawBasicGameState();
        }
    }
}

// Basic game state drawing for non-Truco games
function drawBasicGameState() {
    console.log('🎨 drawBasicGameState called');
    console.log('  - window.game exists:', !!window.game);
    console.log('  - window.game.players exists:', !!(window.game && window.game.players));
    console.log('  - players length:', window.game ? window.game.players.length : 'N/A');
    
    // Clear the canvas with a dark green background (poker table color)
    background(0, 100, 0);
    
    // Draw a simple game state message
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(24);
    text("Game in Progress", width/2, height/2 - 50);
    
    // Draw player count
    textSize(16);
    if (window.game && window.game.players) {
        text(`Players: ${window.game.players.length}`, width/2, height/2);
        
        // Draw pot if it exists
        if (window.game.pot !== undefined) {
            text(`Pot: $${window.game.pot}`, width/2, height/2 + 30);
        }
        
        // Draw current player info if available
        if (window.game.currentPlayerIndex !== undefined) {
            const currentPlayer = window.game.players[window.game.currentPlayerIndex];
            if (currentPlayer) {
                text(`Current Player: ${currentPlayer.name}`, width/2, height/2 + 60);
            }
        }
        
        // Draw game phase if available
        if (window.game.gamePhase) {
            text(`Phase: ${window.game.gamePhase}`, width/2, height/2 + 90);
        }
    } else {
        // Game not fully initialized yet
        text("Initializing Game...", width/2, height/2);
        text("Please wait...", width/2, height/2 + 30);
    }
}

// Add mouse click detection for card gameplay
function mousePressed() {
    // Allow button clicks in non-playing states (Menu, Instructions, Card Values, etc.)
    if (gameState !== gameStateEnum.Playing) {
        return; // Let p5.js buttons handle their own clicks
    }
    
    if (!window.game) {
        console.log('❌ No game instance available');
        return;
    }
    
    // ✅ CRITICAL FIX: Prevent card playing after game completion
    if (window.gameCompleted) {
        console.log('🔒 Card playing disabled - game has been completed');
        return;
    }
    
    // ✅ Get the current player whose turn it is
    const currentPlayer = window.game.getCurrentPlayer();
    if (!currentPlayer || !currentPlayer.hand) {
        console.log('❌ No current player or hand found');
        return;
    }
    
    // ✅ STRICT VALIDATION: Only allow human players to click cards
    if (currentPlayer.isBot) {
        console.log(`❌ Bot ${currentPlayer.name} cannot click cards`);
        return;
    }
    
    // ✅ DOUBLE-CHECK: Verify this is actually the current player's turn
    if (currentPlayer.playerIndex !== window.game.currentPlayerIndex) {
        console.log(`❌ ${currentPlayer.name} tried to click but it's not their turn. Current: ${window.game.currentPlayerIndex}, Player: ${currentPlayer.playerIndex}`);
        return;
    }
    
    console.log(`🎯 ${currentPlayer.name} (Player ${currentPlayer.playerIndex}) is clicking cards on their turn`);
    
    // Check if any card in the current player's hand was clicked
    for (let i = 0; i < currentPlayer.hand.length; i++) {
        const card = currentPlayer.hand[i];
        if (card && card.isClickable) {
            // ✅ FIXED: Use the stored card position from rendering for perfect click detection
            if (card.position) {
                const cardX = card.position.x;
                const cardY = card.position.y;
                
                console.log(`🎯 Checking card ${i}: ${card.name} at (${cardX}, ${cardY}) - Mouse at (${mouseX}, ${mouseY})`);
                
                if (mouseX >= cardX && mouseX <= cardX + cardWidth &&
                    mouseY >= cardY && mouseY <= cardY + cardHeight) {
                    console.log(`🎯 Card clicked: ${card.name} at index ${i} by ${currentPlayer.name}`);
                    
                    // ✅ Play the card through the game logic
                    const playedCard = window.game.playCard(currentPlayer, i);
                    if (playedCard) {
                        console.log(`✅ Card played successfully: ${playedCard.name} by ${currentPlayer.name}`);
                    } else {
                        console.log(`❌ Card play failed for ${currentPlayer.name}`);
                    }
                    break;
                }
            } else {
                console.warn(`⚠️ Card ${i} has no position stored:`, card);
            }
        } else {
            console.log(`⚠️ Card ${i} not clickable:`, card);
        }
    }
}

// REMOVED: Duplicate playCard function - using Game class method directly