function draw() {
    // Clear the canvas at the start of each frame
    clear();
    
    // CRITICAL FIX: Ensure canvas is in the correct parent div using proper p5.js method
    if (window.gameCanvas) {
        const currentParent = window.gameCanvas.parent();
        if (gameState === gameStateEnum.Playing && currentParent && currentParent.elt && currentParent.elt.id === 'Menu') {
            console.log('🎨 Moving canvas from Menu to Game div');
            window.gameCanvas.parent('Game');
        } else if (gameState === gameStateEnum.Menu && currentParent && currentParent.elt && currentParent.elt.id === 'Game') {
            console.log('🎨 Moving canvas from Game to Menu div');
            window.gameCanvas.parent('Menu');
        }
    }
    
    // ALWAYS DRAW A BASIC TEST - this should be visible no matter what
    fill(255, 0, 0); // Bright red
    noStroke();
    rect(50, 50, 100, 100); // Large red square
    
    fill(0, 255, 0); // Bright green
    ellipse(200, 100, 80, 80); // Large green circle
    
    fill(0, 0, 255); // Bright blue
    textSize(32);
    textAlign(LEFT, TOP);
    text('CANVAS TEST', 50, 200); // Large blue text
    
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
    
    // Debug: Draw a test rectangle to ensure canvas is working
    if (frameCount % 60 === 0) { // Every 60 frames (once per second)
        fill(255, 0, 0); // Red
        noStroke();
        rect(10, 10, 20, 20);
        console.log('🎨 Canvas test: Red square drawn at frame', frameCount);
    }
    
    // Debug: Always draw a test circle to see if canvas is working
    fill(0, 255, 0); // Green
    noStroke();
    ellipse(width - 50, 50, 30, 30);
    
    // Debug: Draw frame counter
    fill(255, 255, 255);
    textSize(16);
    textAlign(LEFT, TOP);
    text(`Frame: ${frameCount}`, 10, height - 30);
    
    if (gameState === gameStateEnum.Menu) {
        menuDiv.show();
        gameDiv.hide();
        instructionsDiv.hide();
        valuesDiv.hide();
        if (instructionsCloseButton) {
            instructionsCloseButton.remove();
        }
        // Remove any existing instructions box
        const existingBox = document.querySelector('.instructions-box');
        if (existingBox) {
            existingBox.remove();
        }
    }
    else if (gameState === gameStateEnum.Instructions) {
        menuDiv.hide();
        gameDiv.hide();
        valuesDiv.hide();
        
        // Remove any existing instructions box first
        const existingBox = document.querySelector('.instructions-box');
        if (existingBox) {
            existingBox.remove();
        }
        
        // Create new instructions box
        const instructionsBox = createElement('div');
        instructionsBox.class('instructions-box');
        
        const title = createElement('h1', 'Instructions of the game');
        title.class('instructions-title');
        title.parent(instructionsBox);
        
        const instructions = [
            "Truco is a fun game designed to be played by an even number of players, played in teams of 2v2 or 3v3. Each Truco match is composed of multiple sets, where each set equals twelve games, and each game consists of three rounds.<br><br>",
            "In each round, every player plays one card. The team that wins two out of three rounds wins the game. The team that wins twelve games first wins the set.<br><br>",
            "The order of turns is clockwise, with the first player in each round being the one who played the highest card in the previous round, or in case of a tie, the one who played first in the previous round.<br><br>",
            "The game features the 'truco' mechanic. During their turn, a player can choose to call 'truco', which increases the value of the current game if accepted. The next player can then choose to accept, reject, or raise the value further. If truco is rejected, the game ends immediately, and the team that called 'truco' wins the game at its current value. If accepted, the game goes on but it is now worth 3 games instead of 1. The next player can also raise to 6, then the decision goes back to the player that initially called truco and he has the same options: accept, reject and raise. A game can only be risen to 12 games. It is not possible to raise after that.<br><br>",
            "Once a team has won eleven games within a set, the 'Game of Eleven' rule comes into effect. The team can view their cards and their partner's cards before deciding whether to play the next game. If they decide to play, the game's value is increased to three. If they reject, the opposing team wins one game instantly.<br><br>",
            "Truco is played with a 40 card deck, with a specific order of card values that you can see in the card values instructions."
        ];
        
        instructions.forEach(text => {
            const p = createElement('p', text);
            p.class('instructions-text');
            p.parent(instructionsBox);
        });
        
        // Create and position close button
        if (instructionsCloseButton) {
            instructionsCloseButton.remove();
        }
        instructionsCloseButton = createButton('Close');
        instructionsCloseButton.class('close-button');
        instructionsCloseButton.mousePressed(() => {
            gameState = gameStateEnum.Menu;
            instructionsBox.remove();
            instructionsCloseButton.remove();
            menuDiv.show();
            loop();
        });
        
        instructionsCloseButton.parent(instructionsBox);
        instructionsBox.parent(instructionsDiv);
        instructionsDiv.show();
    }
    else if (gameState === gameStateEnum.CardValues) {
        menuDiv.hide();
        gameDiv.hide();
        instructionsDiv.hide();
        valuesDiv.show();
        
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
            "Queen of diamonds",
            "Queen of clubs",
            "Queen of hearts",
            "Queen of spades",
            "King of clubs",
            "King of diamonds",
            "King of spades",
            "King of hearts",
            "Jack of clubs"
        ];
        
        const rightColumnEntries = [
            "Jack of diamonds",
            "Jack of spades",
            "Jack of hearts",
            "Ace of spades",
            "Ace of diamonds",
            "Ace of hearts",
            "Ace of clubs",
            "7 of hearts",
            "7 of diamonds"
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
            text((i + 10) + ".", rightColX, startY + lineHeight * i);
            fill(255);
            text(rightColumnEntries[i], rightColX + 45, startY + lineHeight * i);
        }
        
        // Create and position close button
        if (!instructionsCloseButton) {
            instructionsCloseButton = createButton('Close');
            instructionsCloseButton.class('close-button');
            instructionsCloseButton.mousePressed(() => {
                gameState = gameStateEnum.Menu;
                instructionsCloseButton.hide();
                menuDiv.show();
                loop();
            });
        }
        
        instructionsCloseButton.position(width/2 - 50, boxY + boxHeight - 50);
        instructionsCloseButton.show();
    }
    else if (gameState === gameStateEnum.Playing) {
        menuDiv.hide();
        gameDiv.show();
        instructionsDiv.hide();
        valuesDiv.hide();
        backToMainMenuButton.show();
        
        // Debug: Draw a test message to ensure we're in playing state
        fill(255, 255, 0); // Yellow
        textSize(24);
        textAlign(CENTER, CENTER);
        text('GAME IS RUNNING!', width/2, height/2);
        
        // Debug: Draw game state info
        fill(255, 255, 255);
        textSize(16);
        textAlign(CENTER, CENTER);
        text(`Game State: ${gameState}`, width/2, height/2 + 40);
        text(`Game Object: ${window.game ? 'EXISTS' : 'MISSING'}`, width/2, height/2 + 60);
        text(`Players: ${window.game?.players?.length || 0}`, width/2, height/2 + 80);
        
        // Only draw game state if game is properly initialized
        if (window.game && window.game.players && window.game.players.length > 0) {
            console.log('🎮 Calling drawGameState...');
            drawGameState();
        } else {
            console.error('❌ Cannot draw game state:', {
                game: !!window.game,
                players: window.game?.players,
                playerCount: window.game?.players?.length
            });
            
            // Debug: Draw what we have
            fill(255, 0, 0);
            textSize(20);
            textAlign(CENTER, CENTER);
            text('GAME NOT PROPERLY INITIALIZED!', width/2, height/2 + 120);
            text(`Game: ${window.game ? 'YES' : 'NO'}`, width/2, height/2 + 120);
            text(`Players: ${window.game?.players ? 'YES' : 'NO'}`, width/2, height/2 + 150);
            text(`Player Count: ${window.game?.players?.length || 'N/A'}`, width/2, height/2 + 170);
        }
    }
}