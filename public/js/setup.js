// Create p5 instance in the game canvas div
const p5Instance = new p5(function(p) {
    p.setup = function() {
        let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent('Game');
        
        // Store p5 instance globally for other files to use
        window.p = p;

        // Initialize game state if not already set
        if (typeof gameState === 'undefined') {
            gameState = gameStateEnum.Menu;
        }

        // Create menu elements
        menuDiv = p.select("#Menu");
        gameDiv = p.select("#Game");
        instructionsDiv = p.select("#Instructions");
        valuesDiv = p.select("#Values");

        // Create menu buttons
        startButton = p.createButton("Start Truco Game");
        startButton.style("position", "fixed");
        startButton.style("top", "50%");
        startButton.style("left", "50%");
        startButton.style("transform", "translate(-50%, -50%)");
        startButton.style("width", "200px");
        startButton.style("height", "60px");
        startButton.style("font-weight", "bold");
        startButton.mousePressed(startTrucoGame);
        startButton.parent(menuDiv);

        // Create other UI elements
        createUIElements(p);
    };

    p.draw = function() {
        drawGame(p);
    };
}, 'Game');

function drawMenu(p) {
    // Menu state drawing code
}

function drawInstructions(p) {
    // Draw instructions background
    p.background(0, 100, 0);
    
    // Draw instructions image if available
    if (instructionsImage) {
        const imgWidth = Math.min(p.width * 0.8, 800);
        const imgHeight = imgWidth * (instructionsImage.height / instructionsImage.width);
        p.image(instructionsImage, p.width/2 - imgWidth/2, 150, imgWidth, imgHeight);
    }
}

function drawCardValues(p) {
    // Draw card values background
    p.background(0, 100, 0);
    p.fill(255);
    p.textSize(32);
    p.textAlign(p.CENTER, p.CENTER);
    p.text("Card Values", p.width/2, 50);
    
    // Draw card values
    p.textSize(16);
    p.textAlign(p.LEFT, p.TOP);
    let x = 50;
    let y = 100;
    let lineHeight = 25;
    
    // Sort cards by value
    const sortedCards = Object.entries(cardValues)
        .sort((a, b) => a[1] - b[1]);
    
    for (const [card, value] of sortedCards) {
        p.text(`${card}: ${value}`, x, y);
        y += lineHeight;
        
        // Create new column if reaching bottom of screen
        if (y > p.height - 50) {
            y = 100;
            x += p.width/3;
        }
    }
}
  