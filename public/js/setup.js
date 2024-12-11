// Track initialization state
let initState = {
    canvasInitialized: false,
    uiInitialized: false,
    errors: []
};

function setup() {
    console.log('Starting setup...');
    
    try {
        initializeCanvas();
        initializeUI();
        initializeGameState();
        
        if (initState.errors.length > 0) {
            showSetupError('Game initialization failed', initState.errors);
            return;
        }
        
        console.log('Setup completed successfully');
    } catch (error) {
        console.error('Setup failed:', error);
        showSetupError('Unexpected error during setup', [error.message]);
    }
}

function initializeCanvas() {
    try {
        let canvas = createCanvas(windowWidth, windowHeight);
        if (!canvas) {
            throw new Error('Failed to create canvas');
        }
        canvas.parent('Menu');
        
        // Initialize canvas properties
        textAlign(CENTER, CENTER);
        textSize(24);
        fill(255);
        stroke(0);
        strokeWeight(2);
        
        initState.canvasInitialized = true;
    } catch (error) {
        initState.errors.push('Canvas initialization failed: ' + error.message);
    }
}

function initializeUI() {
    try {
        // Get all required div containers
        const requiredDivs = {
            menuDiv: select("#Menu"),
            gameDiv: select("#Game"),
            instructionsDiv: select("#Instructions"),
            valuesDiv: select("#Values")
        };
        
        // Verify all divs exist
        for (let [name, div] of Object.entries(requiredDivs)) {
            if (!div) {
                throw new Error(`Required div "${name}" not found`);
            }
            window[name] = div; // Assign to global scope
        }
        
        // Set initial visibility
        menuDiv.class('active');
        gameDiv.removeClass('active');
        instructionsDiv.removeClass('active');
        valuesDiv.removeClass('active');
        
        createGameButtons();
        createInstructionsUI();
        
        initState.uiInitialized = true;
    } catch (error) {
        initState.errors.push('UI initialization failed: ' + error.message);
    }
}

function createGameButtons() {
    // Create and verify each button
    const buttons = [
        {
            name: 'instructionsButton',
            label: 'Instructions',
            position: { x: 20, y: 20 },
            action: showInstructions,
            parent: 'Menu'
        },
        {
            name: 'cardValuesButton',
            label: 'Card Values',
            position: { x: 20, y: 60 },
            action: showCardValues,
            parent: 'Menu'
        },
        {
            name: 'backToMainMenuButton',
            label: 'Back to Menu',
            position: { x: 20, y: 20 },
            action: () => {
                gameState = gameStateEnum.Menu;
                backToMainMenuButton.hide();
                if (trucoButton) trucoButton.hide();
                menuDiv.show();
            },
            parent: 'Game',
            initiallyHidden: true
        },
        {
            name: 'trucoButton',
            label: 'Truco!',
            position: { x: 20, y: 60 },
            action: () => {
                if (window.game) {
                    window.game.requestTruco(window.game.getCurrentPlayer());
                }
            },
            parent: 'Game',
            initiallyHidden: true
        }
    ];
    
    for (let btn of buttons) {
        try {
            const button = createButton(btn.label);
            if (!button) {
                throw new Error(`Failed to create ${btn.name}`);
            }
            
            button.position(btn.position.x, btn.position.y);
            button.mousePressed(btn.action);
            button.parent(btn.parent);
            
            if (btn.initiallyHidden) {
                button.hide();
            }
            
            window[btn.name] = button;
        } catch (error) {
            initState.errors.push(`Button creation failed (${btn.name}): ${error.message}`);
        }
    }
}

function createInstructionsUI() {
    try {
        const instructionsTextDiv = createDiv('');
        if (!instructionsTextDiv) {
            throw new Error('Failed to create instructions text div');
        }
        
        instructionsTextDiv.parent(instructionsDiv);
        instructionsTextDiv.style('color', 'white');
        instructionsTextDiv.style('position', 'absolute');
        instructionsTextDiv.style('top', '50%');
        instructionsTextDiv.style('left', '50%');
        instructionsTextDiv.style('transform', 'translate(-50%, -50%)');
        instructionsTextDiv.style('width', '80%');
        instructionsTextDiv.style('text-align', 'left');
        instructionsTextDiv.style('font-size', '16px');
        instructionsTextDiv.style('line-height', '1.5');
        
        instructionsTextDiv.html(`
            <div style="margin-bottom: 20px;">
                Truco is a fun game designed to be played by an even number of players, played in teams of 2v2 or 3v3. Each Truco match is composed of multiple sets, where each set equals twelve games, and each game consists of three rounds.<br><br>
                <!-- ... rest of the instructions ... -->
            </div>
        `);
    } catch (error) {
        initState.errors.push('Instructions UI creation failed: ' + error.message);
    }
}

function initializeGameState() {
    try {
        if (!gameStateEnum) {
            throw new Error('gameStateEnum not defined');
        }
        
        gameState = gameStateEnum.Menu;
        
        // Initialize player positions
        playerPositions = [
            {
                x: width / 6,
                y: height / 2,
                label: "Player 1 - Team 1",
                labelOffset: -50
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
                labelOffset: -50
            },
            {
                x: width / 2,
                y: height - 100,
                label: "Player 4 - Team 2",
                labelOffset: 50
            }
        ];
        
    } catch (error) {
        initState.errors.push('Game state initialization failed: ' + error.message);
    }
}

function showSetupError(title, errors) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(255, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        z-index: 1000;
        max-width: 80%;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    errorDiv.innerHTML = `
        <h3>${title}</h3>
        <div style="text-align: left; margin-top: 10px;">
            <strong>Error Details:</strong><br>
            ${errors.join('<br>')}
        </div>
        <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px;">
            Retry
        </button>
    `;
    
    document.body.appendChild(errorDiv);
}

// Handle window resizing
function windowResized() {
    try {
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
            playerPositions[3].y = height - 100;
        }
    } catch (error) {
        console.error('Window resize handling failed:', error);
        showSetupError('Error handling window resize', [error.message]);
    }
}
  