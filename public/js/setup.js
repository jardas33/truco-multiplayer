// Track initialization state
let initState = {
    canvasInitialized: false,
    uiInitialized: false,
    errors: []
};

function setup() {
    console.log('Starting setup...');
    
    try {
        // Ensure the DOM is fully loaded
        if (!document.getElementById('Menu')) {
            throw new Error('Required DOM elements not found. Please ensure the page is properly loaded.');
        }

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
        const menuElement = document.getElementById('Menu');
        if (!menuElement) {
            throw new Error('Menu element not found');
        }

        let canvas = createCanvas(windowWidth, windowHeight);
        if (!canvas) {
            throw new Error('Failed to create canvas');
        }
        
        // Use vanilla JS appendChild instead of p5's parent()
        menuElement.appendChild(canvas.elt);
        
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
        // Get all required div containers using vanilla JS
        const requiredDivs = {
            menuDiv: document.getElementById('Menu'),
            gameDiv: document.getElementById('Game'),
            instructionsDiv: document.getElementById('Instructions'),
            valuesDiv: document.getElementById('Values')
        };
        
        // Verify all divs exist
        for (let [name, div] of Object.entries(requiredDivs)) {
            if (!div) {
                throw new Error(`Required div "${name}" not found`);
            }
            // Store references both in window and local scope
            window[name] = div;
        }
        
        // Set initial visibility using classList instead of class/removeClass
        requiredDivs.menuDiv.classList.add('active');
        requiredDivs.gameDiv.classList.remove('active');
        requiredDivs.instructionsDiv.classList.remove('active');
        requiredDivs.valuesDiv.classList.remove('active');
        
        createGameButtons();
        createInstructionsUI();
        
        initState.uiInitialized = true;
    } catch (error) {
        initState.errors.push('UI initialization failed: ' + error.message);
    }
}

function createGameButtons() {
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
                if (window.backToMainMenuButton) window.backToMainMenuButton.style.display = 'none';
                if (window.trucoButton) window.trucoButton.style.display = 'none';
                if (window.menuDiv) window.menuDiv.classList.add('active');
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
            const parentElement = document.getElementById(btn.parent);
            if (!parentElement) {
                throw new Error(`Parent element ${btn.parent} not found`);
            }

            const button = document.createElement('button');
            button.textContent = btn.label;
            button.style.position = 'absolute';
            button.style.left = `${btn.position.x}px`;
            button.style.top = `${btn.position.y}px`;
            button.addEventListener('click', btn.action);
            
            if (btn.initiallyHidden) {
                button.style.display = 'none';
            }
            
            parentElement.appendChild(button);
            window[btn.name] = button;
        } catch (error) {
            initState.errors.push(`Button creation failed (${btn.name}): ${error.message}`);
        }
    }
}

function createInstructionsUI() {
    try {
        const instructionsDiv = document.getElementById('Instructions');
        if (!instructionsDiv) {
            throw new Error('Instructions div not found');
        }

        const instructionsTextDiv = document.createElement('div');
        instructionsTextDiv.style.cssText = `
            color: white;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            text-align: left;
            font-size: 16px;
            line-height: 1.5;
        `;
        
        instructionsTextDiv.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h2 style="color: white; text-align: center; margin-bottom: 20px;">How to Play Truco</h2>
                <p>Truco is a fun game designed to be played by an even number of players, played in teams of 2v2 or 3v3. Each Truco match is composed of multiple sets, where each set equals twelve games, and each game consists of three rounds.</p>
                <p>In each round, every player plays one card. The team that wins two out of three rounds wins the game. The team that wins twelve games first wins the set.</p>
                <p>The order of turns is clockwise, with the first player in each round being the one who played the highest card in the previous round, or in case of a tie, the one who played first in the previous round.</p>
                <p>The game features the 'truco' mechanic. During their turn, a player can choose to call 'truco', which increases the value of the current game if accepted. The next player can then choose to accept, reject, or raise the value further.</p>
                <button onclick="hideInstructions()" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);">Close</button>
            </div>
        `;
        
        instructionsDiv.appendChild(instructionsTextDiv);
    } catch (error) {
        initState.errors.push('Instructions UI creation failed: ' + error.message);
    }
}

function hideInstructions() {
    const instructionsDiv = document.getElementById('Instructions');
    if (instructionsDiv) {
        instructionsDiv.classList.remove('active');
    }
    const menuDiv = document.getElementById('Menu');
    if (menuDiv) {
        menuDiv.classList.add('active');
    }
}

function showInstructions() {
    const menuDiv = document.getElementById('Menu');
    const instructionsDiv = document.getElementById('Instructions');
    if (menuDiv && instructionsDiv) {
        menuDiv.classList.remove('active');
        instructionsDiv.classList.add('active');
    }
}

function showCardValues() {
    const menuDiv = document.getElementById('Menu');
    const valuesDiv = document.getElementById('Values');
    if (menuDiv && valuesDiv) {
        menuDiv.classList.remove('active');
        valuesDiv.classList.add('active');
    }
}

function initializeGameState() {
    try {
        if (typeof gameStateEnum === 'undefined') {
            window.gameStateEnum = {
                Playing: "playing",
                Menu: "menu",
                Instructions: "instructions",
                CardValues: "cardValues"
            };
        }
        
        window.gameState = gameStateEnum.Menu;
        
        // Initialize player positions
        window.playerPositions = [
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
    // Remove any existing error display
    const existingError = document.getElementById('setup-error');
    if (existingError) {
        existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.id = 'setup-error';
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
        if (window.playerPositions) {
            window.playerPositions[0].x = width / 6;
            window.playerPositions[0].y = height / 2;
            
            window.playerPositions[1].x = width / 2;
            window.playerPositions[1].y = 100;
            
            window.playerPositions[2].x = (5 * width) / 6;
            window.playerPositions[2].y = height / 2;
            
            window.playerPositions[3].x = width / 2;
            window.playerPositions[3].y = height - 100;
        }
    } catch (error) {
        console.error('Window resize handling failed:', error);
        showSetupError('Error handling window resize', [error.message]);
    }
}
  